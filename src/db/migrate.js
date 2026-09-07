#!/usr/bin/env node
import config from '../config.js';
import { openDatabase } from './index.js';
import logger from '../logger.js';

const db = openDatabase();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);

logger.info('schema aplicado com sucesso', { path: config.app.databasePath, tables });
db.close();
