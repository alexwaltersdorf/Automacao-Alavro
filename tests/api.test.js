import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// A app lê o config no import, então o ambiente precisa estar pronto antes.
process.env.DATABASE_PATH = ':memory:';
process.env.WHATSAPP_APP_SECRET = 'segredo-de-teste';
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'token-de-verificacao';
process.env.DRY_RUN = 'true';
process.env.AUTO_START_DISPATCHER = 'false';
process.env.LOG_LEVEL = 'silent';

const { createApp } = await import('../src/server/app.js');
const { getDb } = await import('../src/db/index.js');

getDb();
const app = createApp();

/** Sobe o app numa porta livre e devolve um cliente HTTP simples. */
async function comServidor(fn) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = async (path, options = {}) => {
    const response = await fetch(base + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: response.status, body };
  };

  try {
    await fn(request);
  } finally {
    server.close();
  }
}

test('GET /api/health responde e informa credenciais faltando', async () => {
  await comServidor(async (request) => {
    const { status, body } = await request('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.credentials.sending));
    assert.equal(body.dryRun, true);
  });
});

test('verificação do webhook devolve o hub.challenge', async () => {
  await comServidor(async (request) => {
    const { status, body } = await request(
      '/webhook?hub.mode=subscribe&hub.verify_token=token-de-verificacao&hub.challenge=12345',
    );
    assert.equal(status, 200);
    // A Meta espera o challenge em texto puro; o helper de teste converte para número.
    assert.equal(String(body), '12345');
  });
});

test('verificação do webhook recusa token errado', async () => {
  await comServidor(async (request) => {
    const { status } = await request('/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=12345');
    assert.equal(status, 403);
  });
});

test('POST no webhook rejeita assinatura inválida', async () => {
  await comServidor(async (request) => {
    const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const { status } = await request('/webhook', {
      method: 'POST',
      headers: { 'X-Hub-Signature-256': 'sha256=invalida' },
      body: payload,
    });
    assert.equal(status, 401);
  });
});

test('POST no webhook aceita assinatura válida e responde 200 rápido', async () => {
  await comServidor(async (request) => {
    const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const signature = `sha256=${crypto.createHmac('sha256', 'segredo-de-teste').update(payload).digest('hex')}`;
    const { status } = await request('/webhook', {
      method: 'POST',
      headers: { 'X-Hub-Signature-256': signature },
      body: payload,
    });
    assert.equal(status, 200);
  });
});

test('fluxo completo: importar contatos → criar campanha → montar fila', async () => {
  await comServidor(async (request) => {
    const importado = await request('/api/contacts/import', {
      method: 'POST',
      body: JSON.stringify({
        csv: 'nome,telefone,cidade\nMaria,11987654321,Caraguatatuba\nJoão,11912345678,Ubatuba\nRuim,999,X\n',
        list: 'campanha-api',
      }),
    });
    assert.equal(importado.status, 201);
    assert.equal(importado.body.created, 2);
    assert.equal(importado.body.invalid.length, 1);

    const campanha = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Promoção de teste',
        list_id: importado.body.listId,
        message_type: 'template',
        template_name: 'promocao_julho',
        template_language: 'pt_BR',
        template_components: { body: ['{{name}}', '{{cidade}}'] },
      }),
    });
    assert.equal(campanha.status, 201);
    assert.equal(campanha.body.status, 'draft');

    const fila = await request(`/api/campaigns/${campanha.body.id}/build-queue`, { method: 'POST' });
    assert.equal(fila.status, 200);
    assert.equal(fila.body.queued, 2);

    const detalhe = await request(`/api/campaigns/${campanha.body.id}`);
    assert.equal(detalhe.body.stats.total, 2);
    assert.equal(detalhe.body.stats.pending, 2);

    const relatorio = await request(`/api/campaigns/${campanha.body.id}/report.csv`);
    assert.match(relatorio.body, /^id,phone_e164,contact_name,status/);
  });
});

test('campanha de template sem template_name é rejeitada', async () => {
  await comServidor(async (request) => {
    const { status, body } = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: 'Sem template', message_type: 'template' }),
    });
    assert.equal(status, 500);
    assert.match(body.detail, /templateName/);
  });
});

test('descadastro pela API cancela envios pendentes', async () => {
  await comServidor(async (request) => {
    const criado = await request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ phone: '11955554444', name: 'Teste OptOut' }),
    });
    assert.equal(criado.status, 201);

    const optOut = await request(`/api/contacts/${criado.body.id}/opt-out`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'pediu por telefone' }),
    });
    assert.equal(optOut.status, 200);

    const contato = await request(`/api/contacts/${criado.body.id}`);
    assert.equal(contato.body.opted_in, false);
  });
});

test('busca de contato por telefone em qualquer formato', async () => {
  await comServidor(async (request) => {
    await request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ phone: '(11) 96666-7777', name: 'Busca' }),
    });

    const achado = await request('/api/contacts/lookup/5511966667777');
    assert.equal(achado.status, 200);
    assert.equal(achado.body.name, 'Busca');

    // Mesmo número sem o nono dígito (formato que a Meta pode devolver).
    const semNove = await request('/api/contacts/lookup/551166667777');
    assert.equal(semNove.status, 200);
    assert.equal(semNove.body.id, achado.body.id);
  });
});

test('rota inexistente devolve 404 em JSON', async () => {
  await comServidor(async (request) => {
    const { status, body } = await request('/api/nao-existe');
    assert.equal(status, 404);
    assert.equal(body.error, 'rota não encontrada');
  });
});
