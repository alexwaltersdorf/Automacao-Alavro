import test from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../src/core/rateLimiter.js';

/** Relógio controlado para testar o token bucket sem esperar de verdade. */
function fakeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms) => { now += ms; },
    sleep: async (ms) => { now += ms; },
  };
}

test('consome os tokens iniciais e depois espera', async () => {
  const clock = fakeClock();
  const limiter = new RateLimiter(10, { now: clock.now, sleep: clock.sleep });

  // Capacidade inicial = 10 tokens, disponíveis imediatamente.
  for (let i = 0; i < 10; i += 1) assert.equal(limiter.tryAcquire(), true, `token ${i}`);
  assert.equal(limiter.tryAcquire(), false, 'balde vazio após 10');

  // Passados 100 ms a 10/s, volta 1 token.
  clock.advance(100);
  assert.equal(limiter.tryAcquire(), true);
});

test('acquire aguarda o tempo necessário em vez de estourar o limite', async () => {
  const clock = fakeClock();
  const limiter = new RateLimiter(5, { now: clock.now, sleep: clock.sleep });

  const inicio = clock.now();
  for (let i = 0; i < 15; i += 1) await limiter.acquire();
  const decorrido = clock.now() - inicio;

  // 15 envios a 5/s com 5 tokens iniciais: ~2 s de espera.
  assert.ok(decorrido >= 1900, `esperava ao menos ~2s, obteve ${decorrido}ms`);
});

test('backoff corta o ritmo pela metade e recover recupera aos poucos', () => {
  const limiter = new RateLimiter(20);
  assert.equal(limiter.backoff(), 10);
  assert.equal(limiter.backoff(), 5);

  limiter.recover();
  assert.ok(limiter.currentRate > 5, 'ritmo deve subir após sucesso');
  assert.ok(limiter.currentRate <= 20, 'nunca ultrapassa o nominal');
});

test('recover nunca ultrapassa o ritmo nominal', () => {
  const limiter = new RateLimiter(10);
  for (let i = 0; i < 100; i += 1) limiter.recover();
  assert.equal(limiter.currentRate, 10);
});

test('backoff respeita o piso mínimo', () => {
  const limiter = new RateLimiter(4, { minRate: 1 });
  for (let i = 0; i < 20; i += 1) limiter.backoff();
  assert.equal(limiter.currentRate, 1);
});

test('setRate ajusta a capacidade em tempo real', () => {
  const limiter = new RateLimiter(10);
  limiter.setRate(50);
  assert.equal(limiter.nominalRate, 50);
  assert.equal(limiter.capacity, 50);
});
