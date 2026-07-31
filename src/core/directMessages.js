import config from '../config.js';
import logger from '../logger.js';
import { getDb, nowIso } from '../db/index.js';
import { getClient } from '../whatsapp/client.js';
import { normalizePhone } from '../utils/phone.js';
import {
  buildTextMessage,
  buildTemplateMessage,
  buildTemplateComponents,
  interpolate,
} from '../whatsapp/messages.js';
import { getContactByPhone, upsertContact, isWithin24hWindow, markInvalidWhatsApp } from './contacts.js';
import { pairRateWaitMs, recordRecipientSend, reserveDailySlot } from './limits.js';
import { ERROR_ACTIONS } from '../whatsapp/errors.js';

const log = logger.child({ module: 'direct-messages' });

/**
 * Erro de envio avulso com status HTTP, para o middleware de erro traduzir.
 */
export class SendRefusedError extends Error {
  constructor(message, { status = 422, reason, detail, retryAfterMs } = {}) {
    super(message);
    this.name = 'SendRefusedError';
    this.status = status;
    this.reason = reason;
    this.title = message;
    this.detail = detail ?? message;
    // Alimenta o header Retry-After quando a recusa é por tempo.
    if (retryAfterMs) this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Envia uma mensagem única, fora de campanha.
 *
 * Aplica exatamente as mesmas travas do disparo em massa — opt-out, janela de
 * 24h, intervalo por destinatário e teto diário do tier. Um endpoint que
 * pulasse essas regras seria um buraco no resto do sistema: descadastro
 * deixaria de valer e a contabilidade do tier ficaria errada.
 *
 * @param {object} input
 * @param {string} input.to telefone em qualquer formato
 * @param {'template'|'text'} [input.type]
 * @param {{name: string, language?: string, components?: object|Array}} [input.template]
 * @param {string} [input.text] corpo do texto livre (só dentro da janela de 24h)
 * @param {boolean} [input.previewUrl] gera preview de link no texto
 * @param {boolean} [input.ignoreOptOut] envia mesmo para descadastrado (ver README)
 * @param {string} [input.source] de onde veio o pedido, para auditoria
 */
export async function sendDirectMessage(input, { db = getDb(), client = getClient() } = {}) {
  const type = input.type ?? (input.template ? 'template' : 'text');

  if (!['template', 'text'].includes(type)) {
    throw new SendRefusedError(`type inválido: ${type}`, { status: 400, reason: 'invalid_type' });
  }
  if (type === 'template' && !input.template?.name) {
    throw new SendRefusedError('template.name é obrigatório para type "template"', {
      status: 400,
      reason: 'missing_template',
    });
  }
  if (type === 'text' && !input.text) {
    throw new SendRefusedError('text é obrigatório para type "text"', {
      status: 400,
      reason: 'missing_text',
    });
  }

  const normalized = normalizePhone(input.to, config.app.defaultCountryCode);
  if (!normalized.ok) {
    throw new SendRefusedError(`telefone inválido: ${normalized.error}`, {
      status: 400,
      reason: 'invalid_phone',
    });
  }
  const phone = normalized.e164;

  // Cadastra quem ainda não existe, para o histórico e o opt-out valerem
  // também para quem só recebeu mensagem avulsa.
  let contact = getContactByPhone(phone, db);
  if (!contact) {
    const created = upsertContact({ phone, attributes: { origem: input.source ?? 'avulsa' } }, db);
    contact = created.ok ? created.contact : null;
  }

  if (contact && !contact.opted_in && !input.ignoreOptOut) {
    throw new SendRefusedError(
      'contato descadastrado: ele pediu para não receber mensagens',
      {
        status: 409,
        reason: 'opted_out',
        detail:
          'Use ignore_opt_out apenas para mensagem transacional que o próprio cliente solicitou. ' +
          'Marketing para quem pediu descadastro viola a política da Meta.',
      },
    );
  }

  if (contact && !contact.opted_in && input.ignoreOptOut) {
    log.warn('envio para contato descadastrado com ignore_opt_out', { phone, source: input.source });
  }

  if (type === 'text' && !isWithin24hWindow(contact)) {
    throw new SendRefusedError(
      'janela de 24h fechada: só é possível enviar texto livre para quem respondeu nas últimas 24 horas',
      {
        status: 409,
        reason: 'window_closed',
        detail: 'Para iniciar a conversa use type "template" com um template aprovado na Meta.',
      },
    );
  }

  const waitMs = pairRateWaitMs(phone, config.sending.perRecipientIntervalMs, db);
  if (waitMs > 0) {
    throw new SendRefusedError(
      `aguarde ${Math.ceil(waitMs / 1000)}s: a Meta permite 1 mensagem a cada ${
        config.sending.perRecipientIntervalMs / 1000
      }s para o mesmo destinatário`,
      { status: 429, reason: 'pair_rate_limit', retryAfterMs: waitMs },
    );
  }

  if (!reserveDailySlot(phone, config.sending.dailyUniqueRecipientLimit, db)) {
    throw new SendRefusedError(
      `teto diário de ${config.sending.dailyUniqueRecipientLimit} destinatários únicos atingido`,
      { status: 429, reason: 'daily_limit' },
    );
  }

  const payload = buildPayload(type, phone, input, contact);

  try {
    const { wamid } = await client.sendMessage(payload);
    recordRecipientSend(phone, db);

    const result = db
      .prepare(
        `INSERT INTO direct_messages
           (contact_id, phone_e164, type, status, wamid, source, payload, sent_at, created_at, updated_at)
         VALUES (?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        contact?.id ?? null,
        phone,
        type,
        wamid,
        input.source ?? 'api',
        JSON.stringify(payload),
        nowIso(),
        nowIso(),
        nowIso(),
      );

    log.info('mensagem avulsa enviada', { to: phone, type, wamid });
    return getDirectMessage(result.lastInsertRowid, db);
  } catch (error) {
    if (error.action === ERROR_ACTIONS.INVALID && contact) markInvalidWhatsApp(contact.id, db);

    const result = db
      .prepare(
        `INSERT INTO direct_messages
           (contact_id, phone_e164, type, status, source, payload,
            error_code, error_title, error_detail, failed_at, created_at, updated_at)
         VALUES (?, ?, ?, 'failed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        contact?.id ?? null,
        phone,
        type,
        input.source ?? 'api',
        JSON.stringify(payload),
        error.code ?? null,
        error.title ?? 'falha no envio',
        error.detail ?? error.message,
        nowIso(),
        nowIso(),
        nowIso(),
      );

    log.warn('mensagem avulsa falhou', { to: phone, code: error.code, detail: error.detail });

    // Repassa o erro já classificado, anexando o registro gravado.
    error.status = error.httpStatus && error.httpStatus >= 400 ? error.httpStatus : 502;
    error.directMessage = getDirectMessage(result.lastInsertRowid, db);
    throw error;
  }
}

function buildPayload(type, phone, input, contact) {
  if (type === 'text') {
    return buildTextMessage(phone, input.text, { previewUrl: Boolean(input.previewUrl) });
  }

  const variables = {
    ...(contact?.attributes ?? {}),
    name: contact?.name ?? '',
    nome: contact?.name ?? '',
    phone,
    telefone: phone,
  };

  // Aceita tanto os componentes já no formato da Graph API quanto a forma
  // simplificada usada nas campanhas: { body: ['{{name}}', 'texto fixo'] }.
  const raw = input.template.components;
  const components = Array.isArray(raw)
    ? raw
    : buildTemplateComponents(raw ?? null, variables);

  return buildTemplateMessage(
    phone,
    input.template.name,
    input.template.language ?? 'pt_BR',
    components,
  );
}

export function getDirectMessage(id, db = getDb()) {
  const row = db
    .prepare(
      `SELECT d.*, c.name AS contact_name
         FROM direct_messages d LEFT JOIN contacts c ON c.id = d.contact_id
        WHERE d.id = ?`,
    )
    .get(id);
  if (!row) return null;
  return { ...row, payload: row.payload ? JSON.parse(row.payload) : null };
}

export function listDirectMessages({ limit = 50, offset = 0, status = null, phone = null } = {}, db = getDb()) {
  const where = [];
  const params = [];

  if (status) {
    where.push('d.status = ?');
    params.push(status);
  }
  if (phone) {
    const normalized = normalizePhone(phone, config.app.defaultCountryCode);
    where.push('d.phone_e164 = ?');
    params.push(normalized.ok ? normalized.e164 : phone);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const items = db
    .prepare(
      `SELECT d.id, d.phone_e164, d.type, d.status, d.wamid, d.source,
              d.error_code, d.error_detail, d.sent_at, d.delivered_at, d.read_at, d.failed_at,
              c.name AS contact_name
         FROM direct_messages d LEFT JOIN contacts c ON c.id = d.contact_id
        ${clause}
        ORDER BY d.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM direct_messages d ${clause}`).get(...params);
  return { total, items };
}

export default { sendDirectMessage, getDirectMessage, listDirectMessages, SendRefusedError };
