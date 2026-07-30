import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { testDb, seedContacts } from './helpers.js';
import { verifySignature, processWebhook } from '../src/core/webhookProcessor.js';
import { isOptOutMessage } from '../src/core/contacts.js';
import { getContactByPhone } from '../src/core/contacts.js';

const APP_SECRET = 'segredo-do-app-de-teste';

function assinar(body, secret = APP_SECRET) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

function statusEvent(wamid, status, extra = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '5511999999999', phone_number_id: '1234' },
              statuses: [
                {
                  id: wamid,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: '5511987654321',
                  ...extra,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function inboundEvent(from, text, { profileName = 'Maria' } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '5511999999999', phone_number_id: '1234' },
              contacts: [{ profile: { name: profileName }, wa_id: from }],
              messages: [
                {
                  from,
                  id: `wamid.IN${Math.random().toString(36).slice(2, 10)}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

// --- Assinatura -------------------------------------------------------------

test('aceita assinatura HMAC válida', () => {
  const body = Buffer.from(JSON.stringify({ ola: 'mundo' }));
  assert.equal(verifySignature(body, assinar(body), APP_SECRET).valid, true);
});

test('rejeita assinatura forjada', () => {
  const body = Buffer.from(JSON.stringify({ ola: 'mundo' }));
  const forjada = assinar(body, 'segredo-errado');
  assert.equal(verifySignature(body, forjada, APP_SECRET).valid, false);
});

test('rejeita corpo adulterado com assinatura do corpo original', () => {
  const original = Buffer.from(JSON.stringify({ valor: 100 }));
  const adulterado = Buffer.from(JSON.stringify({ valor: 999999 }));
  assert.equal(verifySignature(adulterado, assinar(original), APP_SECRET).valid, false);
});

test('rejeita header ausente ou malformado', () => {
  const body = Buffer.from('{}');
  assert.equal(verifySignature(body, undefined, APP_SECRET).valid, false);
  assert.equal(verifySignature(body, 'md5=abc', APP_SECRET).valid, false);
  assert.equal(verifySignature(body, 'sha256=', APP_SECRET).valid, false);
});

test('rejeita quando o app secret não está configurado', () => {
  const body = Buffer.from('{}');
  const resultado = verifySignature(body, assinar(body), '');
  assert.equal(resultado.valid, false);
  assert.match(resultado.reason, /APP_SECRET/);
});

// --- Status de entrega ------------------------------------------------------

function seedMessageEnviada(db, wamid = 'wamid.TESTE1') {
  const { listId, contactIds } = seedContacts(db, 1);
  db.prepare(
    `INSERT INTO campaigns (id, name, status, list_id, message_type, template_name, template_language, created_at, updated_at)
     VALUES (1, 'teste', 'running', ?, 'template', 'promo', 'pt_BR', datetime('now'), datetime('now'))`,
  ).run(listId);
  const phone = db.prepare('SELECT phone_e164 FROM contacts WHERE id = ?').get(contactIds[0]).phone_e164;
  db.prepare(
    `INSERT INTO messages (campaign_id, contact_id, phone_e164, status, wamid, sent_at, created_at, updated_at)
     VALUES (1, ?, ?, 'sent', ?, datetime('now'), datetime('now'), datetime('now'))`,
  ).run(contactIds[0], phone, wamid);
  return { wamid, contactId: contactIds[0], phone };
}

test('avança o status sent → delivered → read', () => {
  const db = testDb();
  const { wamid } = seedMessageEnviada(db);

  processWebhook(statusEvent(wamid, 'delivered'), db);
  let message = db.prepare('SELECT * FROM messages WHERE wamid = ?').get(wamid);
  assert.equal(message.status, 'delivered');
  assert.ok(message.delivered_at);

  processWebhook(statusEvent(wamid, 'read'), db);
  message = db.prepare('SELECT * FROM messages WHERE wamid = ?').get(wamid);
  assert.equal(message.status, 'read');
  assert.ok(message.read_at);
});

test('não regride o status quando o webhook chega fora de ordem', () => {
  const db = testDb();
  const { wamid } = seedMessageEnviada(db);

  processWebhook(statusEvent(wamid, 'read'), db);
  processWebhook(statusEvent(wamid, 'delivered'), db); // atrasado
  processWebhook(statusEvent(wamid, 'sent'), db); // ainda mais atrasado

  const message = db.prepare('SELECT * FROM messages WHERE wamid = ?').get(wamid);
  assert.equal(message.status, 'read', 'permanece no estágio mais avançado');
});

test('registra falha de entrega vinda do webhook', () => {
  const db = testDb();
  const { wamid } = seedMessageEnviada(db);

  processWebhook(
    statusEvent(wamid, 'failed', {
      errors: [{ code: 131026, title: 'Message undeliverable', error_data: { details: 'Receiver incapable' } }],
    }),
    db,
  );

  const message = db.prepare('SELECT * FROM messages WHERE wamid = ?').get(wamid);
  assert.equal(message.status, 'failed');
  assert.equal(message.error_code, 131026);
  assert.ok(message.failed_at);

  const contato = db.prepare('SELECT * FROM contacts WHERE id = ?').get(message.contact_id);
  assert.equal(contato.is_valid_whatsapp, 0, 'contato marcado como sem WhatsApp');
});

test('ignora status de mensagem desconhecida sem quebrar', () => {
  const db = testDb();
  assert.doesNotThrow(() => processWebhook(statusEvent('wamid.NAO_EXISTE', 'delivered'), db));
});

// --- Mensagens recebidas ----------------------------------------------------

test('mensagem recebida abre a janela de 24h', () => {
  const db = testDb();
  const { contactIds } = seedContacts(db, 1);
  const phone = db.prepare('SELECT phone_e164 FROM contacts WHERE id = ?').get(contactIds[0]).phone_e164;

  processWebhook(inboundEvent(phone, 'Oi, quero saber mais'), db);

  const contato = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactIds[0]);
  assert.ok(contato.last_inbound_at, 'janela de 24h registrada');

  const inbound = db.prepare('SELECT * FROM inbound_messages WHERE contact_id = ?').get(contactIds[0]);
  assert.equal(inbound.body, 'Oi, quero saber mais');
});

test('cadastra automaticamente quem escreve pela primeira vez', () => {
  const db = testDb();
  processWebhook(inboundEvent('5511912345678', 'Olá', { profileName: 'João' }), db);

  const contato = getContactByPhone('5511912345678', db);
  assert.ok(contato, 'contato criado a partir do inbound');
  assert.equal(contato.name, 'João');
  assert.equal(contato.attributes.origem, 'inbound');
});

test('casa o wa_id sem o nono dígito com o contato salvo com o nono', () => {
  const db = testDb();
  const { contactIds } = seedContacts(db, 1);
  const comNove = db.prepare('SELECT phone_e164 FROM contacts WHERE id = ?').get(contactIds[0]).phone_e164;
  const semNove = `${comNove.slice(0, 4)}${comNove.slice(5)}`;

  processWebhook(inboundEvent(semNove, 'Oi'), db);

  const total = db.prepare('SELECT COUNT(*) AS count FROM contacts').get().count;
  assert.equal(total, 1, 'não pode criar contato duplicado');

  const contato = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactIds[0]);
  assert.ok(contato.last_inbound_at, 'janela registrada no contato existente');
});

test('descadastra automaticamente ao receber palavra-chave', () => {
  const db = testDb();
  const { contactIds } = seedContacts(db, 1);
  const phone = db.prepare('SELECT phone_e164 FROM contacts WHERE id = ?').get(contactIds[0]).phone_e164;

  db.prepare(
    `INSERT INTO campaigns (id, name, status, message_type, template_name, template_language, created_at, updated_at)
     VALUES (1, 'x', 'running', 'template', 'p', 'pt_BR', datetime('now'), datetime('now'))`,
  ).run();
  db.prepare(
    `INSERT INTO messages (campaign_id, contact_id, phone_e164, status, created_at, updated_at)
     VALUES (1, ?, ?, 'pending', datetime('now'), datetime('now'))`,
  ).run(contactIds[0], phone);

  const resumo = processWebhook(inboundEvent(phone, 'SAIR'), db);
  assert.equal(resumo.optOuts, 1);

  const contato = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactIds[0]);
  assert.equal(contato.opted_in, 0);
  assert.ok(contato.opted_out_at);

  const message = db.prepare('SELECT * FROM messages WHERE contact_id = ?').get(contactIds[0]);
  assert.equal(message.status, 'cancelled', 'envio pendente é cancelado na hora');
});

test('detecta variações de pedido de descadastro', () => {
  for (const texto of ['PARAR', 'sair', 'Cancelar', 'descadastrar', 'STOP', 'remover', 'não quero']) {
    assert.equal(isOptOutMessage(texto), true, `deveria detectar: ${texto}`);
  }
});

test('não confunde frase comum com pedido de descadastro', () => {
  for (const texto of [
    'não quero perder essa promoção, me manda mais detalhes',
    'quero saber o preço',
    'pode parar de chover que eu vou aí',
    'oi',
    '',
  ]) {
    assert.equal(isOptOutMessage(texto), false, `falso positivo em: ${texto}`);
  }
});

test('guarda o evento bruto para auditoria', () => {
  const db = testDb();
  processWebhook(inboundEvent('5511912345678', 'teste'), db);
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM webhook_events').get();
  assert.equal(count, 1);
});

test('ignora payload de outro produto sem quebrar', () => {
  const db = testDb();
  const resumo = processWebhook({ object: 'page', entry: [] }, db);
  assert.deepEqual(resumo, { statuses: 0, messages: 0, errors: 0, optOuts: 0 });
});
