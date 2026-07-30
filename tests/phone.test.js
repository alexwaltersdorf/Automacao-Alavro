import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, phoneVariants, formatDisplay } from '../src/utils/phone.js';

test('normaliza celular brasileiro em vários formatos', () => {
  const esperado = '5511987654321';
  for (const entrada of [
    '+55 11 98765-4321',
    '5511987654321',
    '(11) 98765-4321',
    '11987654321',
    '011 98765 4321',
    '+5511987654321',
    '0055 11 98765-4321',
  ]) {
    const resultado = normalizePhone(entrada, '55');
    assert.equal(resultado.ok, true, `falhou para ${entrada}: ${resultado.error}`);
    assert.equal(resultado.e164, esperado, `formato ${entrada}`);
  }
});

test('acrescenta o nono dígito em celulares antigos de 8 dígitos', () => {
  const resultado = normalizePhone('11 8765-4321', '55');
  assert.equal(resultado.ok, true);
  assert.equal(resultado.e164, '5511987654321');
});

test('preserva número fixo de 8 dígitos sem inventar o nono', () => {
  const resultado = normalizePhone('(11) 3255-4321', '55');
  assert.equal(resultado.ok, true);
  assert.equal(resultado.e164, '551132554321');
});

test('rejeita DDD inexistente', () => {
  const resultado = normalizePhone('(23) 98765-4321', '55');
  assert.equal(resultado.ok, false);
  assert.match(resultado.error, /DDD/);
});

test('rejeita entradas vazias ou sem dígitos', () => {
  assert.equal(normalizePhone('', '55').ok, false);
  assert.equal(normalizePhone('abc', '55').ok, false);
  assert.equal(normalizePhone(null, '55').ok, false);
  assert.equal(normalizePhone('0000', '55').ok, false);
});

test('rejeita celular de 9 dígitos que não começa com 9', () => {
  const resultado = normalizePhone('11 58765-4321', '55');
  assert.equal(resultado.ok, false);
});

test('aceita número internacional com +', () => {
  const resultado = normalizePhone('+1 415 555 2671', '55');
  assert.equal(resultado.ok, true);
  assert.equal(resultado.e164, '14155552671');
});

test('gera as duas variantes do nono dígito para casar o wa_id do webhook', () => {
  const variantes = phoneVariants('5511987654321');
  assert.ok(variantes.includes('5511987654321'), 'deve conter a forma com 9');
  assert.ok(variantes.includes('551187654321'), 'deve conter a forma sem 9');

  // A partir da forma sem o 9 chegamos na mesma dupla.
  const inverso = phoneVariants('551187654321');
  assert.ok(inverso.includes('5511987654321'));
  assert.ok(inverso.includes('551187654321'));
});

test('não gera variantes para números fixos', () => {
  assert.deepEqual(phoneVariants('551132554321'), ['551132554321']);
});

test('formata para exibição', () => {
  assert.equal(formatDisplay('5511987654321'), '+55 (11) 98765-4321');
  assert.equal(formatDisplay('551132554321'), '+55 (11) 3255-4321');
  assert.equal(formatDisplay('14155552671'), '+14155552671');
});
