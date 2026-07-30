import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyError, ERROR_ACTIONS } from '../src/whatsapp/errors.js';

test('token expirado pausa a campanha', () => {
  const resultado = classifyError(401, { error: { code: 190, message: 'Session expired' } });
  assert.equal(resultado.action, ERROR_ACTIONS.PAUSE);
  assert.equal(resultado.code, 190);
  assert.equal(resultado.retryable, false);
});

test('limite de throughput vira throttle e é reprocessável', () => {
  const resultado = classifyError(400, { error: { code: 130429 } });
  assert.equal(resultado.action, ERROR_ACTIONS.THROTTLE);
  assert.equal(resultado.retryable, true);
});

test('número sem WhatsApp é marcado como inválido, não como retry', () => {
  const resultado = classifyError(400, { error: { code: 131026 } });
  assert.equal(resultado.action, ERROR_ACTIONS.INVALID);
  assert.equal(resultado.retryable, false);
});

test('janela de 24h fechada falha definitivamente', () => {
  const resultado = classifyError(400, { error: { code: 131047 } });
  assert.equal(resultado.action, ERROR_ACTIONS.FAIL);
  assert.equal(resultado.retryable, false);
  assert.match(resultado.detail, /template/i);
});

test('erro de parâmetros do template não é reenviado', () => {
  for (const code of [132000, 132001, 132005, 132012]) {
    const resultado = classifyError(400, { error: { code } });
    assert.equal(resultado.action, ERROR_ACTIONS.FAIL, `código ${code}`);
  }
});

test('limite anti-spam pausa a campanha inteira', () => {
  const resultado = classifyError(400, { error: { code: 131048 } });
  assert.equal(resultado.action, ERROR_ACTIONS.PAUSE);
});

test('erro 5xx sem código conhecido vira retry', () => {
  assert.equal(classifyError(503, {}).action, ERROR_ACTIONS.RETRY);
  assert.equal(classifyError(500, { error: {} }).action, ERROR_ACTIONS.RETRY);
});

test('HTTP 429 sem código conhecido vira throttle', () => {
  assert.equal(classifyError(429, {}).action, ERROR_ACTIONS.THROTTLE);
});

test('falha de rede (sem status) vira retry', () => {
  const resultado = classifyError(null, { error: { message: 'ECONNRESET' } });
  assert.equal(resultado.action, ERROR_ACTIONS.RETRY);
  assert.equal(resultado.retryable, true);
});

test('4xx desconhecido falha sem reenvio', () => {
  assert.equal(classifyError(422, { error: { code: 999999 } }).action, ERROR_ACTIONS.FAIL);
});
