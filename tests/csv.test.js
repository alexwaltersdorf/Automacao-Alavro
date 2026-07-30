import test from 'node:test';
import assert from 'node:assert/strict';
import { parseContactsCsv, toCsv } from '../src/utils/csv.js';
import { testDb } from './helpers.js';
import { importContacts, createList, getListContacts } from '../src/core/contacts.js';

test('lê CSV separado por vírgula com cabeçalho em português', () => {
  const csv = 'nome,telefone,cidade\nMaria Silva,(11) 98765-4321,Caraguatatuba\nJoão Souza,11912345678,Ubatuba\n';
  const linhas = parseContactsCsv(csv);

  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].name, 'Maria Silva');
  assert.equal(linhas[0].phone, '(11) 98765-4321');
  assert.deepEqual(linhas[0].attributes, { cidade: 'Caraguatatuba' });
});

test('lê CSV separado por ponto e vírgula (padrão do Excel brasileiro)', () => {
  const csv = 'nome;telefone;plano\nMaria;11987654321;Ouro\n';
  const linhas = parseContactsCsv(csv);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].phone, '11987654321');
  assert.equal(linhas[0].attributes.plano, 'Ouro');
});

test('aceita variações do nome da coluna de telefone', () => {
  for (const coluna of ['phone', 'telefone', 'celular', 'whatsapp', 'numero', 'contato']) {
    const linhas = parseContactsCsv(`nome,${coluna}\nAna,11987654321\n`);
    assert.equal(linhas[0].phone, '11987654321', `coluna ${coluna}`);
  }
});

test('lida com BOM do Excel e linhas vazias', () => {
  const csv = '﻿nome,telefone\nAna,11987654321\n\n\nBeto,11912345678\n';
  const linhas = parseContactsCsv(csv);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].name, 'Ana');
});

test('descarta linhas sem telefone', () => {
  const csv = 'nome,telefone\nAna,11987654321\nSemTelefone,\n';
  assert.equal(parseContactsCsv(csv).length, 1);
});

test('importa CSV inteiro para o banco, separando os inválidos', () => {
  const db = testDb();
  const csv = [
    'nome,telefone,cidade',
    'Maria,(11) 98765-4321,Caraguatatuba',
    'João,11912345678,Ubatuba',
    'Inválido,123,São Paulo',
    'DDD errado,(23) 98765-4321,Nenhuma',
  ].join('\n');

  const lista = createList('clientes-julho', null, db);
  const resumo = importContacts(parseContactsCsv(csv), { listId: lista.id }, db);

  assert.equal(resumo.created, 2);
  assert.equal(resumo.invalid.length, 2);

  const contatos = getListContacts(lista.id, {}, db);
  assert.equal(contatos.length, 2);
  assert.equal(contatos[0].phone_e164, '5511987654321');
  assert.equal(contatos[0].attributes.cidade, 'Caraguatatuba');
});

test('reimportar o mesmo CSV atualiza em vez de duplicar', () => {
  const db = testDb();
  const csv = 'nome,telefone\nMaria,11987654321\n';
  importContacts(parseContactsCsv(csv), {}, db);
  const resumo = importContacts(parseContactsCsv('nome,telefone,plano\nMaria Silva,11987654321,Ouro\n'), {}, db);

  assert.equal(resumo.created, 0);
  assert.equal(resumo.updated, 1);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM contacts').get();
  assert.equal(count, 1);

  const contato = db.prepare('SELECT * FROM contacts WHERE phone_e164 = ?').get('5511987654321');
  assert.equal(contato.name, 'Maria Silva');
  assert.equal(JSON.parse(contato.attributes).plano, 'Ouro');
});

test('exporta CSV escapando os campos com vírgula e aspas', () => {
  const csv = toCsv(
    [{ id: 1, nome: 'Maria, a Cliente', obs: 'disse "sim"' }],
    ['id', 'nome', 'obs'],
  );
  assert.match(csv, /^id,nome,obs\n/);
  assert.match(csv, /"Maria, a Cliente"/);
  assert.match(csv, /"disse ""sim"""/);
});
