import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import config from '../config.js';
import logger from '../logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let instance = null;

/**
 * Abre (e cria, se necessário) o banco SQLite, aplicando o schema.
 * @param {string} [databasePath] útil em testes para usar ':memory:'
 */
export function openDatabase(databasePath = config.app.databasePath) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const schema = fs.readFileSync(path.join(HERE, 'schema.sql'), 'utf8');
  db.exec(schema);

  return db;
}

/** Instância compartilhada pela aplicação. */
export function getDb() {
  if (!instance) {
    instance = openDatabase();
    logger.debug('banco de dados aberto', { path: config.app.databasePath });
  }
  return instance;
}

export function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

/** Data/hora atual em ISO 8601 (UTC), formato usado em todas as colunas de tempo. */
export function nowIso() {
  return new Date().toISOString();
}

/** Dia atual em UTC no formato YYYY-MM-DD. */
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export default getDb;
