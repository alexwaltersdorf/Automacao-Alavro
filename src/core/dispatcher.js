import config from '../config.js';
import logger from '../logger.js';
import { getDb, nowIso, todayUtc } from '../db/index.js';
import { getClient } from '../whatsapp/client.js';
import { ERROR_ACTIONS } from '../whatsapp/errors.js';
import {
  buildTextMessage,
  buildTemplateMessage,
  buildTemplateComponents,
  interpolate,
} from '../whatsapp/messages.js';
import { RateLimiter } from './rateLimiter.js';
import { CAMPAIGN_STATUS, setStatus, getCampaignStats } from './campaigns.js';
import { getContactById, isWithin24hWindow, markInvalidWhatsApp } from './contacts.js';

const log = logger.child({ module: 'dispatcher' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Motor de disparo em massa.
 *
 * Ciclo de trabalho:
 *   1. procura campanhas com status 'queued' ou 'running' (e agendamento vencido)
 *   2. puxa um lote de mensagens 'pending' cujo next_attempt_at já passou
 *   3. envia respeitando o token bucket e o teto de concorrência
 *   4. trata o erro conforme a classificação da Meta (retry / throttle / fail / pause)
 *   5. atualiza o status da campanha quando a fila esvazia
 */
export class Dispatcher {
  constructor(options = {}) {
    this.db = options.db ?? getDb();
    this.client = options.client ?? getClient();
    this.limiter =
      options.limiter ?? new RateLimiter(options.ratePerSecond ?? config.sending.ratePerSecond);
    this.concurrency = options.concurrency ?? config.sending.concurrency;
    this.maxRetries = options.maxRetries ?? config.sending.maxRetries;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? config.sending.retryBaseDelayMs;
    this.dailyLimit = options.dailyLimit ?? config.sending.dailyUniqueRecipientLimit;
    this.pollIntervalMs = options.pollIntervalMs ?? 1500;

    this.running = false;
    this.stopping = false;
    this.loopPromise = null;
    this.stats = { sent: 0, failed: 0, skipped: 0, throttles: 0, startedAt: null };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.stopping = false;
    this.stats.startedAt = nowIso();
    log.info('motor de disparo iniciado', {
      ratePerSecond: this.limiter.nominalRate,
      concurrency: this.concurrency,
      dryRun: config.sending.dryRun,
    });
    this.loopPromise = this.loop();
  }

  async stop() {
    if (!this.running) return;
    this.stopping = true;
    await this.loopPromise?.catch(() => {});
    this.running = false;
    log.info('motor de disparo parado', this.stats);
  }

  async loop() {
    while (!this.stopping) {
      try {
        const worked = await this.tick();
        if (!worked) await sleep(this.pollIntervalMs);
      } catch (error) {
        log.error('erro inesperado no ciclo do dispatcher', { error: error.message });
        await sleep(this.pollIntervalMs);
      }
    }
  }

  /** Executa um ciclo. Retorna true se enviou algo. */
  async tick() {
    this.activateScheduledCampaigns();

    const campaigns = this.db
      .prepare(
        `SELECT * FROM campaigns
          WHERE status IN ('queued', 'running')
            AND (scheduled_at IS NULL OR scheduled_at <= ?)
          ORDER BY id`,
      )
      .all(nowIso());

    let didWork = false;
    for (const campaign of campaigns) {
      if (this.stopping) break;
      const processed = await this.processCampaign(campaign);
      if (processed > 0) didWork = true;
    }
    return didWork;
  }

  /** Campanhas agendadas cujo horário chegou entram na fila. */
  activateScheduledCampaigns() {
    this.db
      .prepare(
        `UPDATE campaigns SET status = 'queued', updated_at = ?
          WHERE status = 'draft' AND scheduled_at IS NOT NULL AND scheduled_at <= ?`,
      )
      .run(nowIso(), nowIso());
  }

  /**
   * Processa um lote da campanha.
   * @returns {Promise<number>} quantidade de mensagens processadas
   */
  async processCampaign(campaign) {
    const batchSize = Math.max(this.concurrency * 4, 20);
    const batch = this.db
      .prepare(
        `SELECT * FROM messages
          WHERE campaign_id = ? AND status = 'pending'
            AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
          ORDER BY id LIMIT ?`,
      )
      .all(campaign.id, nowIso(), batchSize);

    if (batch.length === 0) {
      this.finalizeIfDone(campaign);
      return 0;
    }

    if (campaign.status !== CAMPAIGN_STATUS.RUNNING) {
      setStatus(campaign.id, CAMPAIGN_STATUS.RUNNING, { startedAt: campaign.started_at ?? nowIso() }, this.db);
    }

    // Marca como 'sending' para que outra instância não pegue as mesmas linhas.
    const claim = this.db.prepare(
      "UPDATE messages SET status = 'sending', updated_at = ? WHERE id = ? AND status = 'pending'",
    );
    const claimed = [];
    const claimAll = this.db.transaction(() => {
      for (const message of batch) {
        if (claim.run(nowIso(), message.id).changes > 0) claimed.push(message);
      }
    });
    claimAll();

    let cursor = 0;
    let paused = false;
    const processedIds = new Set();

    const worker = async () => {
      while (!this.stopping && !paused) {
        const current = claimed[cursor++];
        if (!current) return;

        await this.limiter.acquire();
        const outcome = await this.sendOne(current, campaign);
        processedIds.add(current.id);

        if (outcome === ERROR_ACTIONS.PAUSE) {
          paused = true;
          return;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(this.concurrency, claimed.length) }, worker));

    // Devolve à fila o que sobrou quando o lote foi interrompido.
    const leftovers = claimed.filter((m) => !processedIds.has(m.id));
    if (leftovers.length > 0) {
      const requeue = this.db.prepare(
        "UPDATE messages SET status = 'pending', updated_at = ? WHERE id = ? AND status = 'sending'",
      );
      const requeueAll = this.db.transaction(() => {
        for (const message of leftovers) requeue.run(nowIso(), message.id);
      });
      requeueAll();
    }

    this.finalizeIfDone(campaign);
    return processedIds.size;
  }

  /**
   * Envia uma mensagem e persiste o resultado.
   * @returns {Promise<string>} 'sent' ou a ação de erro aplicada
   */
  async sendOne(message, campaign) {
    const contact = getContactById(message.contact_id, this.db);

    if (!contact) {
      this.markSkipped(message, 'contato removido da base');
      return 'skipped';
    }
    if (!contact.opted_in) {
      this.markSkipped(message, 'contato descadastrado (opt-out)');
      return 'skipped';
    }

    // Texto livre exige janela de 24h aberta — regra da Meta, não do sistema.
    if (campaign.message_type === 'text' && !isWithin24hWindow(contact)) {
      this.markSkipped(
        message,
        'janela de 24h fechada: use um template aprovado para iniciar a conversa com este contato',
      );
      return 'skipped';
    }

    if (!this.reserveDailySlot(message.phone_e164)) {
      // Teto diário do tier atingido: devolve para amanhã em vez de queimar a tentativa.
      const tomorrow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      this.db
        .prepare("UPDATE messages SET status = 'pending', next_attempt_at = ?, updated_at = ? WHERE id = ?")
        .run(tomorrow, nowIso(), message.id);
      log.warn('limite diário de destinatários únicos atingido', { limite: this.dailyLimit });
      return 'deferred';
    }

    const payload = this.buildPayload(message, campaign, contact);

    try {
      const { wamid } = await this.client.sendMessage(payload);
      this.db
        .prepare(
          `UPDATE messages
              SET status = 'sent', wamid = ?, attempts = attempts + 1, sent_at = ?,
                  payload = ?, error_code = NULL, error_title = NULL, error_detail = NULL, updated_at = ?
            WHERE id = ?`,
        )
        .run(wamid, nowIso(), JSON.stringify(payload), nowIso(), message.id);

      this.stats.sent += 1;
      this.limiter.recover();
      log.debug('mensagem enviada', { messageId: message.id, to: message.phone_e164, wamid });
      return 'sent';
    } catch (error) {
      return this.handleSendError(message, campaign, contact, payload, error);
    }
  }

  buildPayload(message, campaign, contact) {
    const variables = {
      ...contact.attributes,
      name: contact.name ?? contact.attributes?.name ?? '',
      nome: contact.name ?? contact.attributes?.nome ?? '',
      phone: contact.phone_e164,
      telefone: contact.phone_e164,
    };

    if (campaign.message_type === 'template') {
      const definition = campaign.template_components ? JSON.parse(campaign.template_components) : null;
      const components = buildTemplateComponents(definition, variables);
      return buildTemplateMessage(
        message.phone_e164,
        campaign.template_name,
        campaign.template_language,
        components,
      );
    }

    return buildTextMessage(message.phone_e164, interpolate(campaign.body_text, variables));
  }

  handleSendError(message, campaign, contact, payload, error) {
    const action = error.action ?? ERROR_ACTIONS.RETRY;
    const attempts = message.attempts + 1;
    const base = {
      code: error.code ?? null,
      title: error.title ?? 'erro',
      detail: error.detail ?? error.message,
    };

    if (action === ERROR_ACTIONS.INVALID) {
      markInvalidWhatsApp(contact.id, this.db);
      this.markFailed(message, base, attempts, payload);
      log.info('destinatário sem WhatsApp', { to: message.phone_e164 });
      return action;
    }

    if (action === ERROR_ACTIONS.PAUSE) {
      // Devolve a mensagem à fila: o problema é da conta, não dela.
      this.db
        .prepare("UPDATE messages SET status = 'pending', updated_at = ? WHERE id = ?")
        .run(nowIso(), message.id);
      setStatus(campaign.id, CAMPAIGN_STATUS.PAUSED, { lastError: `[${base.code}] ${base.detail}` }, this.db);
      log.error('campanha pausada por erro de conta/credencial', {
        campaignId: campaign.id,
        code: base.code,
        detail: base.detail,
      });
      return action;
    }

    if (action === ERROR_ACTIONS.THROTTLE) {
      const newRate = this.limiter.backoff();
      this.stats.throttles += 1;
      log.warn('limite de taxa da Meta atingido, reduzindo ritmo', { novoRitmo: newRate, code: base.code });
      this.requeue(message, attempts, base, payload);
      return action;
    }

    if (action === ERROR_ACTIONS.RETRY && attempts <= this.maxRetries) {
      this.requeue(message, attempts, base, payload);
      return action;
    }

    this.markFailed(message, base, attempts, payload);
    return ERROR_ACTIONS.FAIL;
  }

  /** Reagenda com backoff exponencial + jitter. */
  requeue(message, attempts, error, payload) {
    if (attempts > this.maxRetries) {
      this.markFailed(message, error, attempts, payload);
      return;
    }
    const delay = this.retryBaseDelayMs * 2 ** (attempts - 1);
    const jitter = Math.floor(Math.random() * Math.min(delay, 5000));
    const nextAttempt = new Date(Date.now() + delay + jitter).toISOString();

    this.db
      .prepare(
        `UPDATE messages
            SET status = 'pending', attempts = ?, next_attempt_at = ?,
                error_code = ?, error_title = ?, error_detail = ?, payload = ?, updated_at = ?
          WHERE id = ?`,
      )
      .run(attempts, nextAttempt, error.code, error.title, error.detail, JSON.stringify(payload), nowIso(), message.id);

    log.debug('mensagem reagendada', { messageId: message.id, attempts, nextAttempt });
  }

  markFailed(message, error, attempts, payload) {
    this.db
      .prepare(
        `UPDATE messages
            SET status = 'failed', attempts = ?, failed_at = ?,
                error_code = ?, error_title = ?, error_detail = ?, payload = ?, updated_at = ?
          WHERE id = ?`,
      )
      .run(attempts, nowIso(), error.code, error.title, error.detail, JSON.stringify(payload ?? null), nowIso(), message.id);
    this.stats.failed += 1;
  }

  markSkipped(message, reason) {
    this.db
      .prepare(
        `UPDATE messages SET status = 'skipped', error_title = 'ignorado', error_detail = ?, updated_at = ? WHERE id = ?`,
      )
      .run(reason, nowIso(), message.id);
    this.stats.skipped += 1;
  }

  /**
   * Reserva uma vaga no teto diário de destinatários únicos do tier da Meta.
   * Reenvio para um número já contabilizado hoje não consome nova vaga.
   */
  reserveDailySlot(phone) {
    if (!this.dailyLimit || this.dailyLimit <= 0) return true;
    const day = todayUtc();

    const already = this.db
      .prepare('SELECT 1 FROM daily_send_counter WHERE day = ? AND phone_e164 = ?')
      .get(day, phone);
    if (already) return true;

    const { count } = this.db.prepare('SELECT COUNT(*) AS count FROM daily_send_counter WHERE day = ?').get(day);
    if (count >= this.dailyLimit) return false;

    this.db
      .prepare('INSERT INTO daily_send_counter (day, phone_e164) VALUES (?, ?) ON CONFLICT DO NOTHING')
      .run(day, phone);
    return true;
  }

  /** Marca a campanha como concluída quando não há mais nada pendente. */
  finalizeIfDone(campaign) {
    const pending = this.db
      .prepare("SELECT COUNT(*) AS count FROM messages WHERE campaign_id = ? AND status IN ('pending', 'sending')")
      .get(campaign.id);

    if (pending.count > 0) return false;

    const current = this.db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaign.id);
    if (!current || ![CAMPAIGN_STATUS.RUNNING, CAMPAIGN_STATUS.QUEUED].includes(current.status)) return false;

    const stats = getCampaignStats(campaign.id, this.db);
    setStatus(campaign.id, CAMPAIGN_STATUS.COMPLETED, { finishedAt: nowIso() }, this.db);
    log.info('campanha concluída', { campaignId: campaign.id, ...stats });
    return true;
  }

  status() {
    const { count: pending } = this.db
      .prepare("SELECT COUNT(*) AS count FROM messages WHERE status IN ('pending', 'sending')")
      .get();
    const { count: sentToday } = this.db
      .prepare('SELECT COUNT(*) AS count FROM daily_send_counter WHERE day = ?')
      .get(todayUtc());

    return {
      running: this.running,
      dryRun: config.sending.dryRun,
      pendingMessages: pending,
      uniqueRecipientsToday: sentToday,
      dailyLimit: this.dailyLimit || 'ilimitado',
      rate: this.limiter.stats(),
      concurrency: this.concurrency,
      totals: this.stats,
    };
  }
}

let shared = null;
export function getDispatcher() {
  if (!shared) shared = new Dispatcher();
  return shared;
}

export default Dispatcher;
