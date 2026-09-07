import { getDb, nowIso } from '../db/index.js';
import { normalizePhone, phoneVariants } from '../utils/phone.js';
import config from '../config.js';
import logger from '../logger.js';

const log = logger.child({ module: 'contacts' });

/**
 * Palavras-chave que, recebidas do contato, disparam o descadastro automático.
 * Exigência de boas práticas da Meta e da LGPD.
 */
export const OPT_OUT_KEYWORDS = [
  'parar', 'pare', 'sair', 'cancelar', 'descadastrar', 'descadastro',
  'remover', 'remova', 'nao quero', 'não quero', 'stop', 'unsubscribe',
  'pare de enviar', 'nao enviar', 'não enviar',
];

export const OPT_IN_KEYWORDS = ['voltar', 'reativar', 'quero receber', 'start', 'subscribe'];

/**
 * Detecta pedido de descadastro no texto recebido.
 * Só considera mensagens curtas para evitar falso positivo em frases longas
 * do tipo "não quero perder essa promoção".
 */
export function isOptOutMessage(text) {
  if (!text) return false;
  const normalized = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return false;
  if (normalized.split(' ').length > 4) return false;

  return OPT_OUT_KEYWORDS.some((keyword) => {
    const plain = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized === plain || normalized.startsWith(`${plain} `);
  });
}

export function isOptInMessage(text) {
  if (!text) return false;
  const normalized = String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return OPT_IN_KEYWORDS.some((keyword) => normalized === keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

function syncAliases(db, contactId, e164) {
  const insert = db.prepare(
    'INSERT INTO contact_aliases (phone_variant, contact_id) VALUES (?, ?) ON CONFLICT(phone_variant) DO UPDATE SET contact_id = excluded.contact_id',
  );
  for (const variant of phoneVariants(e164)) insert.run(variant, contactId);
}

/**
 * Cria ou atualiza um contato a partir de um telefone em qualquer formato.
 * @returns {{ok: true, contact: object, created: boolean} | {ok: false, error: string, input: string}}
 */
export function upsertContact({ phone, name, attributes = {}, optedIn = true }, db = getDb()) {
  const normalized = normalizePhone(phone, config.app.defaultCountryCode);
  if (!normalized.ok) return { ok: false, error: normalized.error, input: String(phone ?? '') };

  const e164 = normalized.e164;
  const existing = db.prepare('SELECT * FROM contacts WHERE phone_e164 = ?').get(e164);

  if (existing) {
    const mergedAttributes = { ...safeParse(existing.attributes), ...attributes };
    db.prepare(
      `UPDATE contacts
          SET name = COALESCE(?, name),
              attributes = ?,
              updated_at = ?
        WHERE id = ?`,
    ).run(name ?? null, JSON.stringify(mergedAttributes), nowIso(), existing.id);

    syncAliases(db, existing.id, e164);
    return { ok: true, created: false, contact: getContactById(existing.id, db) };
  }

  const result = db
    .prepare(
      `INSERT INTO contacts (phone_e164, name, attributes, opted_in, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(e164, name ?? null, JSON.stringify(attributes), optedIn ? 1 : 0, nowIso(), nowIso());

  syncAliases(db, result.lastInsertRowid, e164);
  return { ok: true, created: true, contact: getContactById(result.lastInsertRowid, db) };
}

export function getContactById(id, db = getDb()) {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  return row ? hydrate(row) : null;
}

export function getContactByPhone(phone, db = getDb()) {
  const normalized = normalizePhone(phone, config.app.defaultCountryCode);
  const candidates = normalized.ok ? phoneVariants(normalized.e164) : phoneVariants(String(phone ?? ''));

  for (const variant of candidates) {
    const direct = db.prepare('SELECT * FROM contacts WHERE phone_e164 = ?').get(variant);
    if (direct) return hydrate(direct);
  }

  // Fallback pelo índice de variantes (cobre wa_id sem o nono dígito).
  for (const variant of candidates) {
    const alias = db
      .prepare('SELECT c.* FROM contact_aliases a JOIN contacts c ON c.id = a.contact_id WHERE a.phone_variant = ?')
      .get(variant);
    if (alias) return hydrate(alias);
  }
  return null;
}

/** Importa uma lista de contatos de uma vez, dentro de uma transação. */
export function importContacts(rows, { listId = null, defaultOptedIn = true } = {}, db = getDb()) {
  const summary = { total: rows.length, created: 0, updated: 0, invalid: [], contactIds: [] };

  const run = db.transaction(() => {
    for (const row of rows) {
      const result = upsertContact(
        { phone: row.phone, name: row.name, attributes: row.attributes ?? {}, optedIn: defaultOptedIn },
        db,
      );
      if (!result.ok) {
        summary.invalid.push({ phone: row.phone, error: result.error });
        continue;
      }
      if (result.created) summary.created += 1;
      else summary.updated += 1;
      summary.contactIds.push(result.contact.id);

      if (listId) {
        db.prepare(
          'INSERT INTO list_contacts (list_id, contact_id, added_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
        ).run(listId, result.contact.id, nowIso());
      }
    }
  });

  run();
  log.info('importação concluída', {
    total: summary.total,
    criados: summary.created,
    atualizados: summary.updated,
    invalidos: summary.invalid.length,
  });
  return summary;
}

export function optOut(contactId, reason = 'solicitado pelo contato', db = getDb()) {
  db.prepare(
    'UPDATE contacts SET opted_in = 0, opted_out_at = ?, opt_out_reason = ?, updated_at = ? WHERE id = ?',
  ).run(nowIso(), reason, nowIso(), contactId);

  // Cancela envios ainda pendentes para este contato.
  const cancelled = db
    .prepare(
      `UPDATE messages
          SET status = 'cancelled', error_title = 'opt-out', error_detail = ?, updated_at = ?
        WHERE contact_id = ? AND status IN ('pending', 'sending')`,
    )
    .run(reason, nowIso(), contactId);

  log.info('contato descadastrado', { contactId, mensagensCanceladas: cancelled.changes });
  return { contactId, cancelledMessages: cancelled.changes };
}

export function optIn(contactId, db = getDb()) {
  db.prepare(
    'UPDATE contacts SET opted_in = 1, opted_out_at = NULL, opt_out_reason = NULL, updated_at = ? WHERE id = ?',
  ).run(nowIso(), contactId);
  return getContactById(contactId, db);
}

export function markInboundReceived(contactId, db = getDb()) {
  db.prepare('UPDATE contacts SET last_inbound_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), contactId);
}

export function markInvalidWhatsApp(contactId, db = getDb()) {
  db.prepare('UPDATE contacts SET is_valid_whatsapp = 0, updated_at = ? WHERE id = ?').run(nowIso(), contactId);
}

/**
 * A janela de atendimento de 24h está aberta?
 * Só com ela aberta é permitido enviar mensagem de texto livre.
 */
export function isWithin24hWindow(contact) {
  if (!contact?.last_inbound_at) return false;
  const elapsed = Date.now() - new Date(contact.last_inbound_at).getTime();
  return elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
}

export function listContacts({ limit = 50, offset = 0, search = '', optedIn = null } = {}, db = getDb()) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(phone_e164 LIKE ? OR name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (optedIn !== null) {
    where.push('opted_in = ?');
    params.push(optedIn ? 1 : 0);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM contacts ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM contacts ${clause}`).get(...params);

  return { total, items: rows.map(hydrate) };
}

// --- Listas -----------------------------------------------------------------

export function createList(name, description = null, db = getDb()) {
  const existing = db.prepare('SELECT * FROM lists WHERE name = ?').get(name);
  if (existing) return existing;
  const result = db
    .prepare('INSERT INTO lists (name, description, created_at) VALUES (?, ?, ?)')
    .run(name, description, nowIso());
  return db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
}

export function listLists(db = getDb()) {
  return db
    .prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM list_contacts lc WHERE lc.list_id = l.id) AS contact_count
         FROM lists l ORDER BY l.id DESC`,
    )
    .all();
}

export function getListContacts(listId, { onlyOptedIn = true } = {}, db = getDb()) {
  const clause = onlyOptedIn ? 'AND c.opted_in = 1' : '';
  return db
    .prepare(
      `SELECT c.* FROM list_contacts lc
         JOIN contacts c ON c.id = lc.contact_id
        WHERE lc.list_id = ? ${clause}
        ORDER BY c.id`,
    )
    .all(listId)
    .map(hydrate);
}

function hydrate(row) {
  return { ...row, attributes: safeParse(row.attributes), opted_in: Boolean(row.opted_in) };
}

function safeParse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default {
  upsertContact,
  importContacts,
  getContactById,
  getContactByPhone,
  listContacts,
  optOut,
  optIn,
  isOptOutMessage,
  isWithin24hWindow,
  createList,
  listLists,
  getListContacts,
};
