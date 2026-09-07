import crypto from 'node:crypto';
import config from '../config.js';
import logger from '../logger.js';
import { getDb, nowIso } from '../db/index.js';
import {
  getContactByPhone,
  upsertContact,
  markInboundReceived,
  markInvalidWhatsApp,
  optOut,
  optIn,
  isOptOutMessage,
  isOptInMessage,
} from './contacts.js';

const log = logger.child({ module: 'webhook' });

/**
 * Valida a assinatura X-Hub-Signature-256 enviada pela Meta.
 * O corpo precisa ser o BUFFER cru — reserializar o JSON quebra o HMAC.
 *
 * @param {Buffer|string} rawBody
 * @param {string} signatureHeader valor de X-Hub-Signature-256 ("sha256=...")
 * @param {string} appSecret
 */
export function verifySignature(rawBody, signatureHeader, appSecret = config.whatsapp.appSecret) {
  if (!appSecret) return { valid: false, reason: 'WHATSAPP_APP_SECRET não configurado' };
  if (!signatureHeader) return { valid: false, reason: 'header X-Hub-Signature-256 ausente' };

  const [algorithm, received] = String(signatureHeader).split('=');
  if (algorithm !== 'sha256' || !received) {
    return { valid: false, reason: 'formato da assinatura inválido' };
  }

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  if (a.length !== b.length) return { valid: false, reason: 'assinatura não confere' };

  return crypto.timingSafeEqual(a, b)
    ? { valid: true }
    : { valid: false, reason: 'assinatura não confere' };
}

/** Responde ao handshake de verificação (GET) configurado no painel da Meta. */
export function handleVerification(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token && token === config.whatsapp.webhookVerifyToken) {
    log.info('webhook verificado com sucesso pela Meta');
    return { ok: true, challenge };
  }
  log.warn('falha na verificação do webhook', { mode, tokenRecebido: token ? '***' : '(vazio)' });
  return { ok: false };
}

/**
 * Processa o corpo de uma notificação da Meta.
 * Estrutura: { object, entry: [{ id, changes: [{ value, field }] }] }
 */
export function processWebhook(body, db = getDb()) {
  const summary = { statuses: 0, messages: 0, errors: 0, optOuts: 0 };

  if (body?.object !== 'whatsapp_business_account') {
    log.debug('webhook ignorado: objeto não é whatsapp_business_account', { object: body?.object });
    return summary;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      db.prepare('INSERT INTO webhook_events (field, payload, received_at) VALUES (?, ?, ?)').run(
        change.field ?? null,
        JSON.stringify(change),
        nowIso(),
      );

      const value = change.value ?? {};

      for (const status of value.statuses ?? []) {
        applyStatus(status, db);
        summary.statuses += 1;
        if (status.status === 'failed') summary.errors += 1;
      }

      for (const message of value.messages ?? []) {
        const result = applyInboundMessage(message, value, db);
        summary.messages += 1;
        if (result?.optedOut) summary.optOuts += 1;
      }
    }
  }

  return summary;
}

/**
 * Atualiza o ciclo de vida da mensagem: sent → delivered → read (ou failed).
 * Webhooks podem chegar fora de ordem, então nunca regredimos o status.
 */
const STATUS_RANK = { pending: 0, sending: 1, sent: 2, delivered: 3, read: 4 };

function applyStatus(status, db) {
  const wamid = status.id;
  if (!wamid) return;

  // A mensagem pode ser de campanha ou avulsa — as duas recebem status da Meta.
  let table = 'messages';
  let message = db.prepare('SELECT * FROM messages WHERE wamid = ?').get(wamid);
  if (!message) {
    message = db.prepare('SELECT * FROM direct_messages WHERE wamid = ?').get(wamid);
    table = 'direct_messages';
  }
  if (!message) {
    log.debug('status recebido para mensagem desconhecida', { wamid, status: status.status });
    return;
  }

  const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : nowIso();

  if (status.status === 'failed') {
    const error = status.errors?.[0] ?? {};
    db.prepare(
      `UPDATE ${table}
          SET status = 'failed', failed_at = ?, error_code = ?, error_title = ?, error_detail = ?, updated_at = ?
        WHERE id = ?`,
    ).run(
      timestamp,
      error.code ?? null,
      error.title ?? 'falha na entrega',
      error.error_data?.details ?? error.message ?? null,
      nowIso(),
      message.id,
    );

    // 131026 = número não existe no WhatsApp: não vale tentar de novo.
    if (error.code === 131026 && message.contact_id) markInvalidWhatsApp(message.contact_id, db);
    log.info('mensagem falhou na entrega', { wamid, code: error.code });
    return;
  }

  const incoming = STATUS_RANK[status.status];
  const current = STATUS_RANK[message.status];
  if (incoming === undefined || current === undefined || incoming <= current) return;

  const column = { delivered: 'delivered_at', read: 'read_at', sent: 'sent_at' }[status.status];
  db.prepare(
    `UPDATE ${table} SET status = ?, ${column} = COALESCE(${column}, ?), updated_at = ? WHERE id = ?`,
  ).run(status.status, timestamp, nowIso(), message.id);
}

/**
 * Registra mensagem recebida. Isso abre a janela de 24h e permite o
 * descadastro automático por palavra-chave.
 */
function applyInboundMessage(message, value, db) {
  const waId = message.from;
  if (!waId) return null;

  const profileName = value.contacts?.find((c) => c.wa_id === waId)?.profile?.name ?? null;

  let contact = getContactByPhone(waId, db);
  if (!contact) {
    // Alguém escreveu primeiro: cadastramos para conseguir responder.
    const created = upsertContact({ phone: waId, name: profileName, attributes: { origem: 'inbound' } }, db);
    contact = created.ok ? created.contact : null;
  }

  const body = extractText(message);

  db.prepare(
    `INSERT INTO inbound_messages (wamid, contact_id, from_wa_id, profile_name, type, body, raw, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (wamid) DO NOTHING`,
  ).run(
    message.id ?? null,
    contact?.id ?? null,
    waId,
    profileName,
    message.type ?? null,
    body,
    JSON.stringify(message),
    message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : nowIso(),
  );

  if (!contact) return null;

  markInboundReceived(contact.id, db);

  if (isOptOutMessage(body)) {
    optOut(contact.id, `palavra-chave recebida: "${String(body).trim().slice(0, 40)}"`, db);
    log.info('descadastro automático por palavra-chave', { contactId: contact.id });
    return { optedOut: true, contact };
  }

  if (isOptInMessage(body) && !contact.opted_in) {
    optIn(contact.id, db);
    log.info('recadastro automático por palavra-chave', { contactId: contact.id });
  }

  return { optedOut: false, contact };
}

function extractText(message) {
  switch (message.type) {
    case 'text':
      return message.text?.body ?? '';
    case 'button':
      return message.button?.text ?? '';
    case 'interactive':
      return (
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        ''
      );
    case 'image':
    case 'video':
    case 'document':
      return message[message.type]?.caption ?? '';
    default:
      return '';
  }
}

export default { verifySignature, handleVerification, processWebhook };
