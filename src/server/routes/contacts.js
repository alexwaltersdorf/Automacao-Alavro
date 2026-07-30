import express from 'express';
import { asyncHandler } from '../middleware.js';
import { parseContactsCsv } from '../../utils/csv.js';
import {
  upsertContact,
  importContacts,
  listContacts,
  getContactById,
  getContactByPhone,
  optOut,
  optIn,
  createList,
  listLists,
  getListContacts,
} from '../../core/contacts.js';
import { getDb, nowIso } from '../../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  const optedIn = req.query.opted_in === undefined ? null : req.query.opted_in === 'true';
  res.json(
    listContacts({
      limit: Math.min(Number(req.query.limit) || 50, 500),
      offset: Number(req.query.offset) || 0,
      search: req.query.search ?? '',
      optedIn,
    }),
  );
});

router.post('/', (req, res) => {
  const result = upsertContact(req.body ?? {});
  if (!result.ok) return res.status(400).json({ error: 'telefone inválido', detail: result.error });
  res.status(result.created ? 201 : 200).json(result.contact);
});

router.get('/:id', (req, res) => {
  const contact = getContactById(Number(req.params.id));
  if (!contact) return res.status(404).json({ error: 'contato não encontrado' });
  res.json(contact);
});

router.post('/:id/opt-out', (req, res) => {
  const contact = getContactById(Number(req.params.id));
  if (!contact) return res.status(404).json({ error: 'contato não encontrado' });
  res.json(optOut(contact.id, req.body?.reason ?? 'descadastro manual'));
});

router.post('/:id/opt-in', (req, res) => {
  const contact = getContactById(Number(req.params.id));
  if (!contact) return res.status(404).json({ error: 'contato não encontrado' });
  res.json(optIn(contact.id));
});

/** Consulta por telefone em qualquer formato. */
router.get('/lookup/:phone', (req, res) => {
  const contact = getContactByPhone(req.params.phone);
  if (!contact) return res.status(404).json({ error: 'contato não encontrado' });
  res.json(contact);
});

/**
 * Importação em massa.
 * Aceita { csv: "..." } ou { contacts: [{ phone, name, attributes }] }.
 * Opcionalmente cria/usa uma lista com `list` (nome) ou `list_id`.
 */
router.post(
  '/import',
  express.json({ limit: '25mb' }),
  asyncHandler(async (req, res) => {
    const { csv, contacts, list, list_id: listIdRaw, opted_in: optedIn = true } = req.body ?? {};

    let rows;
    if (typeof csv === 'string' && csv.trim()) rows = parseContactsCsv(csv);
    else if (Array.isArray(contacts)) rows = contacts;
    else return res.status(400).json({ error: 'informe "csv" (texto) ou "contacts" (array)' });

    let listId = listIdRaw ? Number(listIdRaw) : null;
    if (!listId && list) listId = createList(list).id;

    const summary = importContacts(rows, { listId, defaultOptedIn: Boolean(optedIn) });
    res.status(201).json({ ...summary, listId });
  }),
);

// --- Listas -----------------------------------------------------------------

router.get('/lists/all', (_req, res) => res.json({ items: listLists() }));

router.post('/lists', (req, res) => {
  if (!req.body?.name) return res.status(400).json({ error: 'name é obrigatório' });
  res.status(201).json(createList(req.body.name, req.body.description ?? null));
});

router.get('/lists/:id/contacts', (req, res) => {
  const onlyOptedIn = req.query.only_opted_in !== 'false';
  res.json({ items: getListContacts(Number(req.params.id), { onlyOptedIn }) });
});

/** Adiciona contatos existentes a uma lista. */
router.post('/lists/:id/contacts', (req, res) => {
  const listId = Number(req.params.id);
  const ids = Array.isArray(req.body?.contact_ids) ? req.body.contact_ids : [];
  if (ids.length === 0) return res.status(400).json({ error: 'contact_ids é obrigatório' });

  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO list_contacts (list_id, contact_id, added_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
  );
  let added = 0;
  db.transaction(() => {
    for (const id of ids) added += insert.run(listId, Number(id), nowIso()).changes;
  })();

  res.json({ listId, added });
});

export default router;
