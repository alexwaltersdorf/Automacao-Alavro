import { getDb, nowIso } from '../db/index.js';
import { getListContacts, getContactById } from './contacts.js';
import logger from '../logger.js';

const log = logger.child({ module: 'campaigns' });

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Cria uma campanha.
 *
 * Para disparo em massa (iniciar conversa), `message_type` deve ser 'template'
 * e o template precisa estar APROVADO na Meta. Mensagens de texto livre só
 * chegam a contatos com a janela de 24h aberta — os demais são marcados como
 * 'skipped' no momento do disparo.
 */
export function createCampaign(input, db = getDb()) {
  const {
    name,
    listId = null,
    messageType = 'template',
    templateName = null,
    templateLanguage = 'pt_BR',
    templateComponents = null,
    bodyText = null,
    scheduledAt = null,
  } = input;

  if (!name) throw new Error('nome da campanha é obrigatório');
  if (messageType === 'template' && !templateName) {
    throw new Error('templateName é obrigatório para campanhas do tipo template');
  }
  if (messageType === 'text' && !bodyText) {
    throw new Error('bodyText é obrigatório para campanhas do tipo text');
  }
  if (!['template', 'text'].includes(messageType)) {
    throw new Error(`messageType inválido: ${messageType}`);
  }

  const result = db
    .prepare(
      `INSERT INTO campaigns
         (name, status, list_id, message_type, template_name, template_language,
          template_components, body_text, scheduled_at, created_at, updated_at)
       VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      listId,
      messageType,
      templateName,
      templateLanguage,
      templateComponents ? JSON.stringify(templateComponents) : null,
      bodyText,
      scheduledAt,
      nowIso(),
      nowIso(),
    );

  log.info('campanha criada', { campaignId: result.lastInsertRowid, name });
  return getCampaign(result.lastInsertRowid, db);
}

export function getCampaign(id, db = getDb()) {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    template_components: row.template_components ? JSON.parse(row.template_components) : null,
    stats: getCampaignStats(id, db),
  };
}

export function listCampaigns({ limit = 50, offset = 0, status = null } = {}, db = getDb()) {
  const clause = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const rows = db
    .prepare(`SELECT * FROM campaigns ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM campaigns ${clause}`).get(...params);

  return {
    total,
    items: rows.map((row) => ({ ...row, stats: getCampaignStats(row.id, db) })),
  };
}

export function getCampaignStats(campaignId, db = getDb()) {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS count FROM messages WHERE campaign_id = ? GROUP BY status')
    .all(campaignId);

  const stats = {
    total: 0, pending: 0, sending: 0, sent: 0, delivered: 0,
    read: 0, failed: 0, skipped: 0, cancelled: 0,
  };
  for (const row of rows) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  // sent/delivered/read são estágios cumulativos da mesma mensagem.
  stats.processed = stats.sent + stats.delivered + stats.read + stats.failed + stats.skipped + stats.cancelled;
  stats.deliveredTotal = stats.delivered + stats.read;
  return stats;
}

/**
 * Materializa a fila de envio: cria uma linha em `messages` para cada contato
 * elegível. É idempotente — rodar de novo não duplica destinatários.
 *
 * @returns {{queued: number, skippedOptOut: number, alreadyQueued: number, audience: number}}
 */
export function buildQueue(campaignId, { contactIds = null } = {}, db = getDb()) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) throw new Error(`campanha ${campaignId} não encontrada`);

  let audience;
  if (contactIds) {
    audience = contactIds.map((id) => getContactById(id, db)).filter(Boolean);
  } else if (campaign.list_id) {
    audience = getListContacts(campaign.list_id, { onlyOptedIn: false }, db);
  } else {
    throw new Error('campanha sem lista: informe list_id na campanha ou contactIds ao montar a fila');
  }

  const summary = { audience: audience.length, queued: 0, skippedOptOut: 0, alreadyQueued: 0, invalidWhatsApp: 0 };

  const insert = db.prepare(
    `INSERT INTO messages (campaign_id, contact_id, phone_e164, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?)
     ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
  );

  const run = db.transaction(() => {
    for (const contact of audience) {
      if (!contact.opted_in) {
        summary.skippedOptOut += 1;
        continue;
      }
      if (contact.is_valid_whatsapp === 0) {
        summary.invalidWhatsApp += 1;
        continue;
      }
      const result = insert.run(campaignId, contact.id, contact.phone_e164, nowIso(), nowIso());
      if (result.changes > 0) summary.queued += 1;
      else summary.alreadyQueued += 1;
    }
  });
  run();

  log.info('fila montada', { campaignId, ...summary });
  return summary;
}

export function setStatus(campaignId, status, extra = {}, db = getDb()) {
  const fields = ['status = ?', 'updated_at = ?'];
  const params = [status, nowIso()];

  if (extra.startedAt !== undefined) {
    fields.push('started_at = ?');
    params.push(extra.startedAt);
  }
  if (extra.finishedAt !== undefined) {
    fields.push('finished_at = ?');
    params.push(extra.finishedAt);
  }
  if (extra.lastError !== undefined) {
    fields.push('last_error = ?');
    params.push(extra.lastError);
  }

  params.push(campaignId);
  db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getCampaign(campaignId, db);
}

/** Coloca a campanha na fila de disparo (o dispatcher a pega no próximo ciclo). */
export function startCampaign(campaignId, db = getDb()) {
  const campaign = getCampaign(campaignId, db);
  if (!campaign) throw new Error(`campanha ${campaignId} não encontrada`);
  if ([CAMPAIGN_STATUS.RUNNING, CAMPAIGN_STATUS.QUEUED].includes(campaign.status)) return campaign;

  if (campaign.stats.total === 0) buildQueue(campaignId, {}, db);

  return setStatus(campaignId, CAMPAIGN_STATUS.QUEUED, { startedAt: campaign.started_at ?? nowIso() }, db);
}

export function pauseCampaign(campaignId, reason = null, db = getDb()) {
  return setStatus(campaignId, CAMPAIGN_STATUS.PAUSED, { lastError: reason }, db);
}

export function resumeCampaign(campaignId, db = getDb()) {
  return setStatus(campaignId, CAMPAIGN_STATUS.QUEUED, { lastError: null }, db);
}

export function cancelCampaign(campaignId, db = getDb()) {
  db.prepare(
    `UPDATE messages SET status = 'cancelled', updated_at = ?
      WHERE campaign_id = ? AND status IN ('pending', 'sending')`,
  ).run(nowIso(), campaignId);
  return setStatus(campaignId, CAMPAIGN_STATUS.CANCELLED, { finishedAt: nowIso() }, db);
}

/** Recoloca na fila as mensagens que falharam por erro temporário. */
export function retryFailed(campaignId, db = getDb()) {
  const result = db
    .prepare(
      `UPDATE messages
          SET status = 'pending', attempts = 0, next_attempt_at = NULL,
              error_code = NULL, error_title = NULL, error_detail = NULL, updated_at = ?
        WHERE campaign_id = ? AND status = 'failed'`,
    )
    .run(nowIso(), campaignId);

  if (result.changes > 0) setStatus(campaignId, CAMPAIGN_STATUS.QUEUED, {}, db);
  return { requeued: result.changes };
}

export function getCampaignMessages(campaignId, { limit = 100, offset = 0, status = null } = {}, db = getDb()) {
  const where = ['m.campaign_id = ?'];
  const params = [campaignId];
  if (status) {
    where.push('m.status = ?');
    params.push(status);
  }
  const clause = `WHERE ${where.join(' AND ')}`;

  const items = db
    .prepare(
      `SELECT m.*, c.name AS contact_name
         FROM messages m LEFT JOIN contacts c ON c.id = m.contact_id
        ${clause} ORDER BY m.id LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM messages m ${clause}`).get(...params);

  return { total, items };
}

export default {
  createCampaign,
  getCampaign,
  listCampaigns,
  getCampaignStats,
  buildQueue,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailed,
  getCampaignMessages,
  setStatus,
  CAMPAIGN_STATUS,
};
