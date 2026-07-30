import express from 'express';
import config, { missingSendingCredentials, missingWebhookCredentials } from '../../config.js';
import { asyncHandler } from '../middleware.js';
import { getClient } from '../../whatsapp/client.js';
import { getDispatcher } from '../../core/dispatcher.js';
import { getDb, nowIso, todayUtc } from '../../db/index.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    time: nowIso(),
    credentials: {
      sending: missingSendingCredentials(),
      webhook: missingWebhookCredentials(),
    },
    dryRun: config.sending.dryRun,
  });
});

/** Estado do motor de disparo. */
router.get('/dispatcher', (_req, res) => res.json(getDispatcher().status()));

router.post('/dispatcher/start', (_req, res) => {
  const dispatcher = getDispatcher();
  dispatcher.start();
  res.json(dispatcher.status());
});

router.post(
  '/dispatcher/stop',
  asyncHandler(async (_req, res) => {
    const dispatcher = getDispatcher();
    await dispatcher.stop();
    res.json(dispatcher.status());
  }),
);

/** Ajusta o ritmo de envio em tempo real. */
router.post('/dispatcher/rate', (req, res) => {
  const rate = Number(req.body?.rate_per_second ?? req.body?.ratePerSecond);
  if (!Number.isFinite(rate) || rate <= 0) {
    return res.status(400).json({ error: 'rate_per_second deve ser um número maior que zero' });
  }
  const dispatcher = getDispatcher();
  dispatcher.limiter.setRate(rate);
  res.json(dispatcher.status());
});

/** Dados do número comercial na Meta: qualidade e tier de mensagens. */
router.get(
  '/phone-number',
  asyncHandler(async (_req, res) => {
    const missing = missingSendingCredentials();
    if (missing.length > 0) {
      return res.status(400).json({ error: 'credenciais ausentes', missing });
    }
    res.json(await getClient().getPhoneNumber());
  }),
);

/** Valida o token de acesso configurado. */
router.get(
  '/token',
  asyncHandler(async (_req, res) => {
    const result = await getClient().debugToken();
    res.json(result);
  }),
);

/** Números métricos gerais para o painel. */
router.get('/overview', (_req, res) => {
  const db = getDb();
  const counts = (sql, ...params) => db.prepare(sql).get(...params).count;

  const byStatus = db.prepare('SELECT status, COUNT(*) AS count FROM messages GROUP BY status').all();
  const messages = Object.fromEntries(byStatus.map((row) => [row.status, row.count]));

  res.json({
    contacts: {
      total: counts('SELECT COUNT(*) AS count FROM contacts'),
      optedIn: counts('SELECT COUNT(*) AS count FROM contacts WHERE opted_in = 1'),
      optedOut: counts('SELECT COUNT(*) AS count FROM contacts WHERE opted_in = 0'),
      invalidWhatsApp: counts('SELECT COUNT(*) AS count FROM contacts WHERE is_valid_whatsapp = 0'),
    },
    campaigns: {
      total: counts('SELECT COUNT(*) AS count FROM campaigns'),
      running: counts("SELECT COUNT(*) AS count FROM campaigns WHERE status IN ('running', 'queued')"),
      completed: counts("SELECT COUNT(*) AS count FROM campaigns WHERE status = 'completed'"),
      paused: counts("SELECT COUNT(*) AS count FROM campaigns WHERE status = 'paused'"),
    },
    messages: {
      total: Object.values(messages).reduce((sum, value) => sum + value, 0),
      ...messages,
    },
    today: {
      uniqueRecipients: counts('SELECT COUNT(*) AS count FROM daily_send_counter WHERE day = ?', todayUtc()),
      limit: config.sending.dailyUniqueRecipientLimit || null,
    },
    inbound: counts('SELECT COUNT(*) AS count FROM inbound_messages'),
  });
});

export default router;
