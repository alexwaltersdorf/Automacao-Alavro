import test from 'node:test';
import assert from 'node:assert/strict';
import { testDb, mockClient, metaError } from './helpers.js';
import { sendDirectMessage, listDirectMessages } from '../src/core/directMessages.js';
import { upsertContact, optOut, getContactByPhone } from '../src/core/contacts.js';
import { processWebhook } from '../src/core/webhookProcessor.js';

const OK = () => ({ status: 200 });

function enviar(input, db, client) {
  return sendDirectMessage(input, { db, client });
}

// --- Caminho feliz ----------------------------------------------------------

test('envia template para um número novo e cadastra o contato', async () => {
  const db = testDb();
  const client = mockClient(OK);

  const message = await enviar(
    {
      to: '(11) 98765-4321',
      type: 'template',
      template: { name: 'promocao_julho', language: 'pt_BR', components: { body: ['Maria'] } },
    },
    db,
    client,
  );

  assert.equal(message.status, 'sent');
  assert.equal(message.phone_e164, '5511987654321');
  assert.ok(message.wamid);
  assert.ok(message.sent_at);

  const payload = client.calls[0].payload;
  assert.equal(payload.type, 'template');
  assert.equal(payload.to, '5511987654321');
  assert.equal(payload.template.name, 'promocao_julho');
  assert.deepEqual(payload.template.components[0].parameters.map((p) => p.text), ['Maria']);

  // O contato passa a existir, para o opt-out valer também para avulsas.
  const contato = getContactByPhone('11987654321', db);
  assert.ok(contato);
  assert.equal(contato.attributes.origem, 'avulsa');
});

test('aceita componentes já no formato da Graph API', async () => {
  const db = testDb();
  const client = mockClient(OK);

  await enviar(
    {
      to: '11987654321',
      template: {
        name: 'promo',
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Cru' }] }],
      },
    },
    db,
    client,
  );

  assert.deepEqual(client.calls[0].payload.template.components, [
    { type: 'body', parameters: [{ type: 'text', text: 'Cru' }] },
  ]);
});

test('interpola os dados do contato nas variáveis do template', async () => {
  const db = testDb();
  const client = mockClient(OK);
  upsertContact({ phone: '11987654321', name: 'Ana', attributes: { cidade: 'Ubatuba' } }, db);

  await enviar(
    { to: '11987654321', template: { name: 'promo', components: { body: ['{{name}}', '{{cidade}}'] } } },
    db,
    client,
  );

  assert.deepEqual(
    client.calls[0].payload.template.components[0].parameters.map((p) => p.text),
    ['Ana', 'Ubatuba'],
  );
});

// --- Travas de conformidade -------------------------------------------------

test('recusa envio para contato descadastrado', async () => {
  const db = testDb();
  const client = mockClient(OK);
  const criado = upsertContact({ phone: '11987654321', name: 'Saiu' }, db);
  optOut(criado.contact.id, 'pediu para sair', db);

  await assert.rejects(
    () => enviar({ to: '11987654321', template: { name: 'promo' } }, db, client),
    (error) => {
      assert.equal(error.reason, 'opted_out');
      assert.equal(error.status, 409);
      return true;
    },
  );
  assert.equal(client.calls.length, 0, 'não chega a chamar a Meta');
});

test('ignore_opt_out libera o envio, mas só quando pedido explicitamente', async () => {
  const db = testDb();
  const client = mockClient(OK);
  const criado = upsertContact({ phone: '11987654321' }, db);
  optOut(criado.contact.id, 'teste', db);

  const message = await enviar(
    { to: '11987654321', template: { name: 'confirmacao' }, ignoreOptOut: true },
    db,
    client,
  );
  assert.equal(message.status, 'sent');
  assert.equal(client.calls.length, 1);
});

test('recusa texto livre fora da janela de 24h', async () => {
  const db = testDb();
  const client = mockClient(OK);
  upsertContact({ phone: '11987654321' }, db);

  await assert.rejects(
    () => enviar({ to: '11987654321', type: 'text', text: 'Oi' }, db, client),
    (error) => {
      assert.equal(error.reason, 'window_closed');
      assert.match(error.detail, /template/i);
      return true;
    },
  );
  assert.equal(client.calls.length, 0);
});

test('permite texto livre quando o contato respondeu há pouco', async () => {
  const db = testDb();
  const client = mockClient(OK);
  const criado = upsertContact({ phone: '11987654321' }, db);
  db.prepare('UPDATE contacts SET last_inbound_at = ? WHERE id = ?').run(new Date().toISOString(), criado.contact.id);

  const message = await enviar(
    { to: '11987654321', type: 'text', text: 'Seu exame está pronto!' },
    db,
    client,
  );

  assert.equal(message.status, 'sent');
  assert.equal(client.calls[0].payload.type, 'text');
  assert.equal(client.calls[0].payload.text.body, 'Seu exame está pronto!');
});

test('respeita o intervalo por destinatário e diz quanto falta esperar', async () => {
  const db = testDb();
  const client = mockClient(OK);

  await enviar({ to: '11987654321', template: { name: 'promo' } }, db, client);

  await assert.rejects(
    () => enviar({ to: '11987654321', template: { name: 'promo' } }, db, client),
    (error) => {
      assert.equal(error.reason, 'pair_rate_limit');
      assert.equal(error.status, 429);
      assert.ok(error.retryAfterMs > 0, 'informa o tempo de espera');
      return true;
    },
  );
  assert.equal(client.calls.length, 1, 'a segunda nem sai');
});

test('números diferentes não disputam o mesmo intervalo', async () => {
  const db = testDb();
  const client = mockClient(OK);

  await enviar({ to: '11987654321', template: { name: 'promo' } }, db, client);
  await enviar({ to: '11912345678', template: { name: 'promo' } }, db, client);
  assert.equal(client.calls.length, 2);
});

// --- Validação --------------------------------------------------------------

test('rejeita telefone inválido antes de chamar a Meta', async () => {
  const db = testDb();
  const client = mockClient(OK);

  await assert.rejects(
    () => enviar({ to: '999', template: { name: 'promo' } }, db, client),
    (error) => {
      assert.equal(error.reason, 'invalid_phone');
      assert.equal(error.status, 400);
      return true;
    },
  );
  assert.equal(client.calls.length, 0);
});

test('exige template.name em envio de template e text em envio de texto', async () => {
  const db = testDb();
  const client = mockClient(OK);

  await assert.rejects(
    () => enviar({ to: '11987654321', type: 'template' }, db, client),
    (error) => error.reason === 'missing_template',
  );
  await assert.rejects(
    () => enviar({ to: '11987654321', type: 'text' }, db, client),
    (error) => error.reason === 'missing_text',
  );
});

// --- Erros da Meta ----------------------------------------------------------

test('grava a falha e marca o contato quando o número não tem WhatsApp', async () => {
  const db = testDb();
  const client = mockClient(() => ({ status: 400, body: metaError(131026) }));

  await assert.rejects(
    () => enviar({ to: '11987654321', template: { name: 'promo' } }, db, client),
    (error) => {
      assert.equal(error.code, 131026);
      assert.equal(error.directMessage.status, 'failed');
      return true;
    },
  );

  assert.equal(getContactByPhone('11987654321', db).is_valid_whatsapp, 0);

  const historico = listDirectMessages({}, db);
  assert.equal(historico.total, 1);
  assert.equal(historico.items[0].status, 'failed');
  assert.equal(historico.items[0].error_code, 131026);
});

// --- Status de entrega ------------------------------------------------------

test('o webhook atualiza a entrega da mensagem avulsa, não só a de campanha', async () => {
  const db = testDb();
  const client = mockClient((payload) => ({
    status: 200,
    body: { messages: [{ id: 'wamid.DIRETA1' }], contacts: [{ wa_id: payload.to }] },
  }));

  const message = await enviar({ to: '11987654321', template: { name: 'promo' } }, db, client);
  assert.equal(message.wamid, 'wamid.DIRETA1');

  const evento = (situacao) => ({
    object: 'whatsapp_business_account',
    entry: [{
      id: '1',
      changes: [{
        field: 'messages',
        value: {
          statuses: [{ id: 'wamid.DIRETA1', status: situacao, timestamp: String(Math.floor(Date.now() / 1000)) }],
        },
      }],
    }],
  });

  processWebhook(evento('delivered'), db);
  let atual = db.prepare('SELECT * FROM direct_messages WHERE wamid = ?').get('wamid.DIRETA1');
  assert.equal(atual.status, 'delivered');
  assert.ok(atual.delivered_at);

  processWebhook(evento('read'), db);
  atual = db.prepare('SELECT * FROM direct_messages WHERE wamid = ?').get('wamid.DIRETA1');
  assert.equal(atual.status, 'read');

  // Status atrasado não pode fazer a mensagem regredir.
  processWebhook(evento('delivered'), db);
  atual = db.prepare('SELECT * FROM direct_messages WHERE wamid = ?').get('wamid.DIRETA1');
  assert.equal(atual.status, 'read');
});

test('reenviar para o mesmo número gera dois registros, sem colidir', async () => {
  const db = testDb();
  const client = mockClient(OK);

  await enviar({ to: '11987654321', template: { name: 'promo' } }, db, client);
  // Zera o intervalo por destinatário para simular o tempo passando.
  db.prepare('UPDATE recipient_throttle SET last_sent_at = ?').run(new Date(Date.now() - 60_000).toISOString());
  await enviar({ to: '11987654321', template: { name: 'promo' } }, db, client);

  assert.equal(listDirectMessages({}, db).total, 2, 'avulsa repetida é legítima, ao contrário da campanha');
});
