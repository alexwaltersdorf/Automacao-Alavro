import express from 'express';
import { asyncHandler } from '../middleware.js';
import { toCsv } from '../../utils/csv.js';
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  buildQueue,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailed,
  getCampaignMessages,
} from '../../core/campaigns.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(
    listCampaigns({
      limit: Math.min(Number(req.query.limit) || 50, 200),
      offset: Number(req.query.offset) || 0,
      status: req.query.status ?? null,
    }),
  );
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const campaign = createCampaign({
      name: body.name,
      listId: body.list_id ?? body.listId ?? null,
      messageType: body.message_type ?? body.messageType ?? 'template',
      templateName: body.template_name ?? body.templateName ?? null,
      templateLanguage: body.template_language ?? body.templateLanguage ?? 'pt_BR',
      templateComponents: body.template_components ?? body.templateComponents ?? null,
      bodyText: body.body_text ?? body.bodyText ?? null,
      scheduledAt: body.scheduled_at ?? body.scheduledAt ?? null,
    });
    res.status(201).json(campaign);
  }),
);

router.get('/:id', (req, res) => {
  const campaign = getCampaign(Number(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'campanha não encontrada' });
  res.json(campaign);
});

/** Materializa a fila sem iniciar o envio — útil para conferir o público antes. */
router.post('/:id/build-queue', (req, res) => {
  const contactIds = Array.isArray(req.body?.contact_ids) ? req.body.contact_ids.map(Number) : null;
  res.json(buildQueue(Number(req.params.id), { contactIds }));
});

router.post('/:id/start', (req, res) => {
  const campaign = getCampaign(Number(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'campanha não encontrada' });
  res.json(startCampaign(campaign.id));
});

router.post('/:id/pause', (req, res) => res.json(pauseCampaign(Number(req.params.id), req.body?.reason ?? 'pausada manualmente')));
router.post('/:id/resume', (req, res) => res.json(resumeCampaign(Number(req.params.id))));
router.post('/:id/cancel', (req, res) => res.json(cancelCampaign(Number(req.params.id))));
router.post('/:id/retry-failed', (req, res) => res.json(retryFailed(Number(req.params.id))));

router.get('/:id/messages', (req, res) => {
  res.json(
    getCampaignMessages(Number(req.params.id), {
      limit: Math.min(Number(req.query.limit) || 100, 1000),
      offset: Number(req.query.offset) || 0,
      status: req.query.status ?? null,
    }),
  );
});

/** Relatório da campanha em CSV. */
router.get('/:id/report.csv', (req, res) => {
  const campaignId = Number(req.params.id);
  const campaign = getCampaign(campaignId);
  if (!campaign) return res.status(404).json({ error: 'campanha não encontrada' });

  const { items } = getCampaignMessages(campaignId, { limit: 100000 });
  const csv = toCsv(items, [
    'id', 'phone_e164', 'contact_name', 'status', 'wamid', 'attempts',
    'error_code', 'error_detail', 'sent_at', 'delivered_at', 'read_at', 'failed_at',
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="campanha-${campaignId}.csv"`);
  res.send(csv);
});

export default router;
