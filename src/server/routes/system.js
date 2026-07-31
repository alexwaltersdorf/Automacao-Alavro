import express from 'express';
import config, { missingSendingCredentials, missingWebhookCredentials } from '../../config.js';
import { asyncHandler } from '../middleware.js';
import { getClient } from '../../whatsapp/client.js';
import { getDispatcher } from '../../core/dispatcher.js';
import { getDb, nowIso, todayUtc } from '../../db/index.js';
import { isWithin24hWindow } from '../../core/contacts.js';

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
router.get('/dispatcher', (_req, res) =>
  res.json({ ...getDispatcher().status(), graphApiUsage: getClient().usage }),
);

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

/**
 * Respostas recebidas dos contatos.
 * Numa campanha de disparo é aqui que aparece o retorno — e cada resposta
 * abre a janela de 24h para conversar por texto livre com aquele contato.
 */
router.get('/inbound', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Number(req.query.offset) || 0;
  const db = getDb();

  const items = db
    .prepare(
      `SELECT i.id, i.wamid, i.from_wa_id, i.profile_name, i.type, i.body, i.received_at,
              c.id AS contact_id, c.name AS contact_name, c.phone_e164, c.opted_in,
              c.last_inbound_at
         FROM inbound_messages i
         LEFT JOIN contacts c ON c.id = i.contact_id
        ORDER BY i.received_at DESC, i.id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(limit, offset)
    .map((row) => ({
      ...row,
      opted_in: row.opted_in === null ? null : Boolean(row.opted_in),
      // A janela de 24h só está aberta se a última mensagem recebida for recente.
      window_open: isWithin24hWindow({ last_inbound_at: row.last_inbound_at }),
    }));

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM inbound_messages').get();
  res.json({ total, items });
});

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
