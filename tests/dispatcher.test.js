import test from 'node:test';
import assert from 'node:assert/strict';
import { testDb, mockClient, metaError, seedContacts, fakeSuccess } from './helpers.js';
import { Dispatcher } from '../src/core/dispatcher.js';
import { RateLimiter } from '../src/core/rateLimiter.js';
import { createCampaign, buildQueue, startCampaign, getCampaign } from '../src/core/campaigns.js';
import { getContactById, optOut } from '../src/core/contacts.js';

/** Limiter sem espera real, para os testes rodarem rápido. */
function fastLimiter() {
  return new RateLimiter(1000, { sleep: async () => {} });
}

function makeDispatcher(db, client, options = {}) {
  return new Dispatcher({ db, client, limiter: fastLimiter(), concurrency: 4, ...options });
}

function makeCampaign(db, listId, extra = {}) {
  return createCampaign(
    {
      name: 'Campanha de teste',
      listId,
      messageType: 'template',
      templateName: 'promocao_julho',
      templateLanguage: 'pt_BR',
      templateComponents: { body: ['{{name}}', '{{cidade}}'] },
      ...extra,
    },
    db,
  );
}

test('envia para toda a lista e conclui a campanha', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 10);
  const client = mockClient(() => ({ status: 200 }));
  const campaign = makeCampaign(db, listId);

  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);

  const dispatcher = makeDispatcher(db, client);
  await dispatcher.tick();

  const final = getCampaign(campaign.id, db);
  assert.equal(final.stats.sent, 10);
  assert.equal(final.stats.failed, 0);
  assert.equal(final.status, 'completed');
  assert.equal(client.calls.length, 10);
});

test('interpola as variáveis do template com os dados do contato', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 1);
  const client = mockClient(() => ({ status: 200 }));
  const campaign = makeCampaign(db, listId);

  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);
  await makeDispatcher(db, client).tick();

  const { payload } = client.calls[0];
  assert.equal(payload.type, 'template');
  assert.equal(payload.template.name, 'promocao_julho');
  assert.equal(payload.template.language.code, 'pt_BR');

  const body = payload.template.components.find((c) => c.type === 'body');
  assert.deepEqual(body.parameters.map((p) => p.text), ['Contato 1', 'Caraguatatuba']);
});

test('não envia para contatos com opt-out', async () => {
  const db = testDb();
  const { listId, contactIds } = seedContacts(db, 5);
  optOut(contactIds[0], 'teste', db);
  optOut(contactIds[1], 'teste', db);

  const client = mockClient(() => ({ status: 200 }));
  const campaign = makeCampaign(db, listId);

  const resumo = buildQueue(campaign.id, {}, db);
  assert.equal(resumo.skippedOptOut, 2);
  assert.equal(resumo.queued, 3);

  startCampaign(campaign.id, db);
  await makeDispatcher(db, client).tick();

  assert.equal(client.calls.length, 3);
  for (const call of client.calls) {
    const contato = db.prepare('SELECT * FROM contacts WHERE phone_e164 = ?').get(call.payload.to);
    assert.equal(contato.opted_in, 1);
  }
});

test('reagenda com backoff em erro temporário e não perde a mensagem', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 1);
  const client = mockClient((_payload, chamada) =>
    chamada === 1 ? { status: 500, body: metaError(131000) } : { status: 200 },
  );

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);

  const dispatcher = makeDispatcher(db, client, { retryBaseDelayMs: 0 });
  await dispatcher.tick();

  let message = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(campaign.id);
  assert.equal(message.status, 'pending', 'volta para a fila');
  assert.equal(message.attempts, 1);
  assert.ok(message.next_attempt_at, 'ganha horário de nova tentativa');

  // Segunda rodada: a Meta aceita.
  await new Promise((resolve) => setTimeout(resolve, 10));
  await dispatcher.tick();

  message = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(campaign.id);
  assert.equal(message.status, 'sent');
  assert.equal(message.attempts, 2);
});

test('desiste após esgotar as tentativas', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 1);
  const client = mockClient(() => ({ status: 500, body: metaError(131000) }));

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);

  const dispatcher = makeDispatcher(db, client, { maxRetries: 2, retryBaseDelayMs: 0 });
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    await dispatcher.tick();
  }

  const message = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(campaign.id);
  assert.equal(message.status, 'failed');
  assert.equal(message.attempts, 3, 'tentativa original + 2 retentativas');
});

test('marca o contato como sem WhatsApp no erro 131026', async () => {
  const db = testDb();
  const { listId, contactIds } = seedContacts(db, 1);
  const client = mockClient(() => ({ status: 400, body: metaError(131026) }));

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);
  await makeDispatcher(db, client).tick();

  const message = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(campaign.id);
  assert.equal(message.status, 'failed');
  assert.equal(message.error_code, 131026);
  assert.equal(getContactById(contactIds[0], db).is_valid_whatsapp, 0);
  assert.equal(client.calls.length, 1, 'não insiste em número inexistente');
});

test('token inválido pausa a campanha e devolve a mensagem à fila', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 8);
  const client = mockClient(() => ({ status: 401, body: metaError(190, 'Session expired') }));

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);
  await makeDispatcher(db, client, { concurrency: 1 }).tick();

  const final = getCampaign(campaign.id, db);
  assert.equal(final.status, 'paused');
  assert.match(final.last_error, /190/);
  assert.ok(client.calls.length < 8, 'para de disparar em vez de queimar a lista toda');

  const pendentes = db
    .prepare("SELECT COUNT(*) AS count FROM messages WHERE campaign_id = ? AND status = 'pending'")
    .get(campaign.id).count;
  assert.equal(pendentes, 8, 'nenhuma mensagem é perdida ao pausar');
});

test('reduz o ritmo quando a Meta responde throttle', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 2);
  const client = mockClient((_payload, chamada) =>
    chamada === 1 ? { status: 400, body: metaError(130429) } : { status: 200 },
  );

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);

  const dispatcher = makeDispatcher(db, client, { concurrency: 1, retryBaseDelayMs: 0 });
  const ritmoInicial = dispatcher.limiter.currentRate;
  await dispatcher.tick();

  assert.ok(dispatcher.limiter.currentRate < ritmoInicial, 'ritmo deve cair');
  assert.equal(dispatcher.stats.throttles, 1);
});

test('é idempotente: montar a fila duas vezes não duplica destinatários', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 6);
  const client = mockClient(() => ({ status: 200 }));
  const campaign = makeCampaign(db, listId);

  const primeira = buildQueue(campaign.id, {}, db);
  const segunda = buildQueue(campaign.id, {}, db);
  assert.equal(primeira.queued, 6);
  assert.equal(segunda.queued, 0);
  assert.equal(segunda.alreadyQueued, 6);

  startCampaign(campaign.id, db);
  await makeDispatcher(db, client).tick();
  assert.equal(client.calls.length, 6, 'cada contato recebe exatamente uma vez');
});

test('campanha de texto livre ignora quem está fora da janela de 24h', async () => {
  const db = testDb();
  const { listId, contactIds } = seedContacts(db, 3);

  // Só o primeiro respondeu recentemente.
  db.prepare('UPDATE contacts SET last_inbound_at = ? WHERE id = ?').run(new Date().toISOString(), contactIds[0]);
  // O segundo respondeu há 30 horas: janela fechada.
  db.prepare('UPDATE contacts SET last_inbound_at = ? WHERE id = ?').run(
    new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    contactIds[1],
  );

  const client = mockClient(() => ({ status: 200 }));
  const campaign = createCampaign(
    { name: 'Aviso', listId, messageType: 'text', bodyText: 'Oi {{name}}, tudo bem?' },
    db,
  );

  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);
  await makeDispatcher(db, client).tick();

  const final = getCampaign(campaign.id, db);
  assert.equal(final.stats.sent, 1, 'só quem tem janela aberta recebe');
  assert.equal(final.stats.skipped, 2);
  assert.equal(client.calls[0].payload.type, 'text');
  assert.equal(client.calls[0].payload.text.body, 'Oi Contato 1, tudo bem?');
});

test('respeita o teto diário de destinatários únicos', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 10);
  const client = mockClient(() => ({ status: 200 }));
  const campaign = makeCampaign(db, listId);

  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);
  await makeDispatcher(db, client, { dailyLimit: 4 }).tick();

  assert.equal(client.calls.length, 4, 'para no limite do tier');
  const final = getCampaign(campaign.id, db);
  assert.equal(final.status, 'running', 'campanha continua aberta para retomar depois');
  assert.equal(final.stats.pending, 6);
});

test('registra o wamid devolvido pela Meta para casar com o webhook', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 1);
  const client = mockClient((payload) => ({
    status: 200,
    body: { ...fakeSuccess(payload), messages: [{ id: 'wamid.ABC123' }] },
  }));

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);
  await makeDispatcher(db, client).tick();

  const message = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(campaign.id);
  assert.equal(message.wamid, 'wamid.ABC123');
  assert.ok(message.sent_at);
});

// --- Pair rate limit (1 mensagem a cada 6s por destinatário) ----------------

test('adia o segundo envio ao mesmo número em vez de estourar o limite da Meta', async () => {
  const db = testDb();
  const { listId, contactIds } = seedContacts(db, 1);
  const client = mockClient(() => ({ status: 200 }));

  // Duas campanhas para o mesmo contato, disparadas em sequência.
  const primeira = makeCampaign(db, listId, { name: 'Campanha A' });
  const segunda = makeCampaign(db, listId, { name: 'Campanha B' });

  buildQueue(primeira.id, {}, db);
  buildQueue(segunda.id, {}, db);
  startCampaign(primeira.id, db);
  startCampaign(segunda.id, db);

  const dispatcher = makeDispatcher(db, client);
  await dispatcher.tick();

  assert.equal(client.calls.length, 1, 'só a primeira sai; a segunda espera os 6s');
  assert.equal(dispatcher.stats.pairDeferrals, 1);

  const adiada = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(segunda.id);
  assert.equal(adiada.status, 'pending', 'a mensagem não se perde');
  assert.ok(
    new Date(adiada.next_attempt_at).getTime() > Date.now(),
    'ganha horário futuro respeitando o intervalo',
  );
  assert.equal(adiada.attempts, 0, 'adiar não consome tentativa');

  assert.equal(getContactById(contactIds[0], db).opted_in, true);
});

test('não adia envios para números diferentes', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 5);
  const client = mockClient(() => ({ status: 200 }));
  const campaign = makeCampaign(db, listId);

  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);

  const dispatcher = makeDispatcher(db, client);
  await dispatcher.tick();

  assert.equal(client.calls.length, 5, 'o limite é por destinatário, não global');
  assert.equal(dispatcher.stats.pairDeferrals, 0);
});

test('desligar o intervalo por destinatário libera os envios seguidos', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 1);
  const client = mockClient(() => ({ status: 200 }));

  const primeira = makeCampaign(db, listId, { name: 'A' });
  const segunda = makeCampaign(db, listId, { name: 'B' });
  buildQueue(primeira.id, {}, db);
  buildQueue(segunda.id, {}, db);
  startCampaign(primeira.id, db);
  startCampaign(segunda.id, db);

  await makeDispatcher(db, client, { perRecipientIntervalMs: 0 }).tick();
  assert.equal(client.calls.length, 2);
});

test('erro 131056 usa o backoff 4^X e não reduz o ritmo global', async () => {
  const db = testDb();
  const { listId } = seedContacts(db, 1);
  const client = mockClient(() => ({ status: 400, body: metaError(131056) }));

  const campaign = makeCampaign(db, listId);
  buildQueue(campaign.id, {}, db);
  startCampaign(campaign.id, db);

  const dispatcher = makeDispatcher(db, client, { perRecipientIntervalMs: 0 });
  const ritmoInicial = dispatcher.limiter.currentRate;
  const antes = Date.now();
  await dispatcher.tick();

  assert.equal(
    dispatcher.limiter.currentRate,
    ritmoInicial,
    'o limite é daquele destinatário: o ritmo do número comercial não muda',
  );
  assert.equal(dispatcher.stats.throttles, 1);

  const message = db.prepare('SELECT * FROM messages WHERE campaign_id = ?').get(campaign.id);
  assert.equal(message.status, 'pending');
  assert.equal(message.error_code, 131056);

  // 4^0 = 1s na primeira falha (mais jitter), bem abaixo dos 2s do backoff padrão.
  const espera = new Date(message.next_attempt_at).getTime() - antes;
  assert.ok(espera >= 1000, `esperava ao menos 1s, obteve ${espera}ms`);
  assert.ok(espera < 7000, `esperava menos que 7s, obteve ${espera}ms`);
});
