import test from 'node:test';
import assert from 'node:assert/strict';
import { WhatsAppClient } from '../src/whatsapp/client.js';
import { pairBackoffMs, classifyError } from '../src/whatsapp/errors.js';

/**
 * Cliente com fetch falso que devolve headers, para exercitar a leitura
 * do X-Business-Use-Case-Usage.
 */
function clientComHeaders(headers = {}, body = {}) {
  const calls = [];
  const client = new WhatsAppClient({
    accessToken: 'TOKEN',
    phoneNumberId: '111',
    businessAccountId: '222',
    dryRun: false,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => headers[name.toLowerCase()] ?? null },
        text: async () => JSON.stringify(body),
      };
    },
  });
  client.calls = calls;
  return client;
}

// --- Consumo da cota da Graph API -------------------------------------------

test('lê o consumo da cota no header X-Business-Use-Case-Usage', async () => {
  const client = clientComHeaders({
    'x-business-use-case-usage': JSON.stringify({
      '9876543210': [{ type: 'whatsapp', call_count: 42, total_cputime: 3, total_time: 5 }],
    }),
  });

  await client.getPhoneNumber();
  assert.equal(client.usage.callCount, 42);
  assert.equal(client.usage.totalCputime, 3);
  assert.ok(client.usage.updatedAt);
});

test('header ausente ou malformado não derruba a chamada', async () => {
  const semHeader = clientComHeaders({});
  await semHeader.getPhoneNumber();
  assert.equal(semHeader.usage.callCount, null);

  const quebrado = clientComHeaders({ 'x-business-use-case-usage': 'isto não é json' });
  await assert.doesNotReject(() => quebrado.getPhoneNumber());
  assert.equal(quebrado.usage.callCount, null);
});

test('resposta sem objeto headers não quebra o cliente', async () => {
  const client = new WhatsAppClient({
    accessToken: 'T',
    phoneNumberId: '1',
    dryRun: false,
    fetch: async () => ({ ok: true, status: 200, text: async () => '{}' }),
  });
  await assert.doesNotReject(() => client.getPhoneNumber());
});

// --- Backoff do pair rate limit ---------------------------------------------

test('pairBackoffMs segue o 4^X prescrito pela Meta', () => {
  assert.equal(pairBackoffMs(1), 1000); // 4^0
  assert.equal(pairBackoffMs(2), 4000); // 4^1
  assert.equal(pairBackoffMs(3), 16000); // 4^2
  assert.equal(pairBackoffMs(4), 64000); // 4^3
  assert.equal(pairBackoffMs(5), 256000); // 4^4
  assert.equal(pairBackoffMs(9), 256000, 'teto de 256s para não parar a mensagem por horas');
});

test('131056 é classificado como limite por destinatário, com backoff próprio', () => {
  const resultado = classifyError(400, { error: { code: 131056 } });
  assert.equal(resultado.perRecipient, true);
  assert.equal(resultado.backoff, 'pair');
  assert.equal(resultado.retryable, true);
});

test('demais erros de throttle usam o backoff exponencial padrão', () => {
  const resultado = classifyError(400, { error: { code: 130429 } });
  assert.equal(resultado.perRecipient, false, 'este é limite do número, não do destinatário');
  assert.equal(resultado.backoff, 'exponential');
});

// --- Analytics --------------------------------------------------------------

test('monta a consulta de analytics de mensagens com timestamps Unix', async () => {
  const client = clientComHeaders({}, { analytics: { data_points: [] } });
  const start = new Date('2026-07-01T00:00:00Z');
  const end = new Date('2026-07-31T00:00:00Z');

  await client.getMessagingAnalytics({ start, end, granularity: 'DAY' });

  const url = new URL(client.calls[0].url);
  assert.match(url.pathname, /\/222$/, 'consulta a WABA');
  const fields = url.searchParams.get('fields');
  assert.match(fields, /^analytics\./);
  assert.match(fields, /start\(1782864000\)/);
  assert.match(fields, /end\(1785456000\)/);
  assert.match(fields, /granularity\(DAY\)/);
});

test('analytics de template exige os IDs e envia as métricas padrão', async () => {
  const client = clientComHeaders({}, { data: [] });

  await assert.rejects(
    () => client.getTemplateAnalytics({ start: new Date(), end: new Date(), templateIds: [] }),
    /templateIds é obrigatório/,
  );

  await client.getTemplateAnalytics({
    templateIds: ['123', '456'],
    start: new Date('2026-07-01T00:00:00Z'),
    end: new Date('2026-07-31T00:00:00Z'),
  });

  const url = new URL(client.calls[0].url);
  assert.match(url.pathname, /\/222\/template_analytics$/);
  assert.deepEqual(JSON.parse(url.searchParams.get('template_ids')), ['123', '456']);
  assert.deepEqual(JSON.parse(url.searchParams.get('metric_types')), ['SENT', 'DELIVERED', 'READ', 'CLICKED']);
});

test('analytics exige WABA configurada', async () => {
  const client = new WhatsAppClient({ accessToken: 'T', phoneNumberId: '1', businessAccountId: '' });
  await assert.rejects(
    () => client.getMessagingAnalytics({ start: new Date(), end: new Date() }),
    /WHATSAPP_BUSINESS_ACCOUNT_ID/,
  );
});

test('erro de validação vem como promise rejeitada, não como throw síncrono', async () => {
  // Métodos que devolvem promise precisam falhar sempre pelo mesmo caminho,
  // senão quem usa .catch() leva uma exceção não tratada.
  const client = new WhatsAppClient({ accessToken: 'T', phoneNumberId: '1', businessAccountId: '' });
  let capturado = null;
  await client.listTemplates().catch((error) => {
    capturado = error;
  });
  assert.match(capturado?.message ?? '', /WHATSAPP_BUSINESS_ACCOUNT_ID/);
});

test('aceita data em ISO, timestamp em segundos e em milissegundos', async () => {
  const emSegundos = clientComHeaders({}, {});
  await emSegundos.getMessagingAnalytics({ start: 1782864000, end: 1785456000 });
  assert.match(new URL(emSegundos.calls[0].url).searchParams.get('fields'), /start\(1782864000\)/);

  const emMillis = clientComHeaders({}, {});
  await emMillis.getMessagingAnalytics({ start: 1782864000000, end: 1785456000000 });
  assert.match(new URL(emMillis.calls[0].url).searchParams.get('fields'), /start\(1782864000\)/);

  const emIso = clientComHeaders({}, {});
  await emIso.getMessagingAnalytics({ start: '2026-07-01T00:00:00Z', end: '2026-07-31T00:00:00Z' });
  assert.match(new URL(emIso.calls[0].url).searchParams.get('fields'), /start\(1782864000\)/);
});

test('rejeita período inválido', async () => {
  const client = clientComHeaders({}, {});
  await assert.rejects(() => client.getMessagingAnalytics({ start: 'ontem', end: new Date() }), /data inválida/);
  await assert.rejects(() => client.getMessagingAnalytics({ end: new Date() }), /start e end/);
});
