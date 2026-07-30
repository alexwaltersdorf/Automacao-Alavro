import express from 'express';
import { asyncHandler } from '../middleware.js';
import { getClient } from '../../whatsapp/client.js';

const router = express.Router();

/**
 * Converte os parâmetros de período da query.
 * Aceita ISO 8601 ou timestamp Unix; o padrão é os últimos 30 dias.
 */
function period(query) {
  const end = query.end ? new Date(query.end) : new Date();
  const start = query.start
    ? new Date(query.start)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error('start e end devem ser datas válidas (ISO 8601 ou timestamp Unix)');
    error.status = 400;
    throw error;
  }
  if (start >= end) {
    const error = new Error('start precisa ser anterior a end');
    error.status = 400;
    throw error;
  }
  return { start, end };
}

/**
 * Volume de mensagens enviadas e entregues no período, direto da Meta.
 * Complementa os números locais: aqui aparece tudo que saiu pelo número,
 * inclusive fora deste sistema.
 */
router.get(
  '/messaging',
  asyncHandler(async (req, res) => {
    const { start, end } = period(req.query);
    const result = await getClient().getMessagingAnalytics({
      start,
      end,
      granularity: req.query.granularity ?? 'DAY',
      phoneNumbers: req.query.phone_numbers ? String(req.query.phone_numbers).split(',') : undefined,
    });
    res.json(result);
  }),
);

/** Detalhamento de custo por conversa. */
router.get(
  '/pricing',
  asyncHandler(async (req, res) => {
    const { start, end } = period(req.query);
    const result = await getClient().getPricingAnalytics({
      start,
      end,
      granularity: req.query.granularity ?? 'DAILY',
      dimensions: req.query.dimensions ? String(req.query.dimensions).split(',') : undefined,
    });
    res.json(result);
  }),
);

/**
 * Desempenho por template: enviadas, entregues, lidas e cliques nos botões.
 * Ex.: /api/analytics/templates?template_ids=123,456&start=2026-07-01
 */
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const ids = req.query.template_ids ? String(req.query.template_ids).split(',') : [];
    if (ids.length === 0) {
      return res.status(400).json({
        error: 'template_ids é obrigatório',
        detail: 'informe os IDs separados por vírgula; use POST /api/templates/sync para descobri-los',
      });
    }
    const { start, end } = period(req.query);
    const result = await getClient().getTemplateAnalytics({
      templateIds: ids,
      start,
      end,
      granularity: req.query.granularity ?? 'DAILY',
      metricTypes: req.query.metrics ? String(req.query.metrics).split(',') : undefined,
    });
    res.json(result);
  }),
);

export default router;
