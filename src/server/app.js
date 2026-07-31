import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { requireApiKey, requestLogger, errorHandler, notFound } from './middleware.js';
import webhookRouter from './routes/webhook.js';
import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import templatesRouter from './routes/templates.js';
import messagesRouter from './routes/messages.js';
import analyticsRouter from './routes/analytics.js';
import systemRouter from './routes/system.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);

  // O webhook vem ANTES do express.json(): a validação HMAC exige o corpo cru.
  // A Meta chama esta rota com a própria assinatura, por isso ela não usa X-API-Key.
  app.use('/webhook', webhookRouter);

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', requireApiKey);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api', systemRouter);

  app.use(express.static(path.join(HERE, 'public')));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
