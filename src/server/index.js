#!/usr/bin/env node
import config, { missingSendingCredentials, missingWebhookCredentials } from '../config.js';
import logger from '../logger.js';
import { getDb, closeDb } from '../db/index.js';
import { getDispatcher } from '../core/dispatcher.js';
import { createApp } from './app.js';

const log = logger.child({ module: 'server' });

getDb(); // aplica o schema já no boot

const app = createApp();
const server = app.listen(config.app.port, config.app.host, () => {
  log.info(`servidor no ar em http://${config.app.host}:${config.app.port}`);
  log.info(`painel: http://localhost:${config.app.port}/`);
  log.info(`URL do webhook para cadastrar na Meta: https://SEU-DOMINIO/webhook`);

  const missingSending = missingSendingCredentials();
  if (missingSending.length > 0) {
    log.warn('credenciais de envio ausentes — o disparo não vai funcionar', { faltando: missingSending });
  }
  const missingWebhook = missingWebhookCredentials();
  if (missingWebhook.length > 0) {
    log.warn('credenciais de webhook ausentes — status de entrega não serão recebidos', { faltando: missingWebhook });
  }
  if (config.sending.dryRun) {
    log.warn('DRY_RUN ativo: nenhuma mensagem será realmente enviada à Meta');
  }
});

const dispatcher = getDispatcher();
if (config.app.autoStartDispatcher) dispatcher.start();

async function shutdown(signal) {
  log.info(`recebido ${signal}, encerrando com segurança…`);
  server.close();
  await dispatcher.stop();
  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  log.error('promise rejeitada sem tratamento', { reason: reason?.message ?? String(reason) });
});

export { app, server };
