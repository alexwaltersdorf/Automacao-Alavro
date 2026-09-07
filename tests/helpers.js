import { openDatabase } from '../src/db/index.js';
import { WhatsAppClient } from '../src/whatsapp/client.js';

/** Banco em memória, isolado por teste. */
export function testDb() {
  return openDatabase(':memory:');
}

/**
 * Cliente da Cloud API com `fetch` falso.
 * @param {(payload: object, chamada: number) => object} responder
 *   devolve { status, body } simulando a resposta da Graph API
 */
export function mockClient(responder) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const payload = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, payload });
    const { status = 200, body = fakeSuccess(payload) } = responder(payload, calls.length) ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    };
  };

  const client = new WhatsAppClient({
    accessToken: 'TOKEN_DE_TESTE',
    phoneNumberId: '1234567890',
    businessAccountId: '9876543210',
    fetch: fetchImpl,
    dryRun: false,
  });
  client.calls = calls;
  return client;
}

export function fakeSuccess(payload) {
  return {
    messaging_product: 'whatsapp',
    contacts: [{ input: payload?.to, wa_id: payload?.to }],
    messages: [{ id: `wamid.TEST${Math.random().toString(36).slice(2, 12).toUpperCase()}` }],
  };
}

export function metaError(code, message = 'erro simulado') {
  return { error: { message, type: 'OAuthException', code, fbtrace_id: 'TESTE' } };
}

/** Cria contatos e uma lista prontos para uma campanha. */
export function seedContacts(db, quantidade, { prefix = '5511' } = {}) {
  const { upsertContact, createList } = importedContacts;
  const list = createList('lista-teste', null, db);
  const ids = [];

  for (let i = 0; i < quantidade; i += 1) {
    const phone = `${prefix}9${String(80000000 + i).padStart(8, '0')}`;
    const result = upsertContact({ phone, name: `Contato ${i + 1}`, attributes: { cidade: 'Caraguatatuba' } }, db);
    if (!result.ok) throw new Error(`seed falhou para ${phone}: ${result.error}`);
    ids.push(result.contact.id);
    db.prepare('INSERT INTO list_contacts (list_id, contact_id, added_at) VALUES (?, ?, ?)').run(
      list.id,
      result.contact.id,
      new Date().toISOString(),
    );
  }
  return { listId: list.id, contactIds: ids };
}

// Import tardio para evitar ciclo com o módulo de contatos.
const importedContacts = await import('../src/core/contacts.js');
