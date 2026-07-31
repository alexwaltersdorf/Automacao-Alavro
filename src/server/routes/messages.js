import express from 'express';
import { asyncHandler } from '../middleware.js';
import { missingSendingCredentials } from '../../config.js';
import { sendDirectMessage, getDirectMessage, listDirectMessages } from '../../core/directMessages.js';

const router = express.Router();

/**
 * Envia uma mensagem única, fora de campanha.
 * Serve para integração (site, n8n, CRM) e para validar as credenciais.
 *
 * Template (inicia conversa — exige template aprovado na Meta):
 *   {
 *     "to": "(11) 98765-4321",
 *     "type": "template",
 *     "template": {
 *       "name": "promocao_julho",
 *       "language": "pt_BR",
 *       "components": { "body": ["Maria", "Caraguatatuba"] }
 *     }
 *   }
 *
 * Texto livre (só para quem respondeu nas últimas 24h):
 *   { "to": "5511987654321", "type": "text", "text": "Seu exame está pronto!" }
 *
 * Aplica as mesmas travas do disparo em massa: opt-out, janela de 24h,
 * intervalo por destinatário e teto diário do tier.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // A forma do pedido é conferida antes da configuração: quem está montando
    // a integração precisa ver o erro do payload, não o da credencial.
    const body = req.body ?? {};
    if (!body.to) {
      return res.status(400).json({ error: 'to é obrigatório', detail: 'informe o telefone do destinatário' });
    }

    const missing = missingSendingCredentials();
    if (missing.length > 0) {
      return res.status(503).json({
        error: 'credenciais da Meta ausentes',
        detail: `Preencha no .env: ${missing.join(', ')}`,
        missing,
      });
    }

    const message = await sendDirectMessage({
      to: body.to,
      type: body.type,
      template: body.template,
      text: body.text,
      previewUrl: body.preview_url ?? body.previewUrl,
      ignoreOptOut: body.ignore_opt_out ?? body.ignoreOptOut,
      source: 'api',
    });

    res.status(201).json(message);
  }),
);

/** Histórico das mensagens avulsas (`?status=`, `?phone=`). */
router.get('/', (req, res) => {
  res.json(
    listDirectMessages({
      limit: Math.min(Number(req.query.limit) || 50, 500),
      offset: Number(req.query.offset) || 0,
      status: req.query.status ?? null,
      phone: req.query.phone ?? null,
    }),
  );
});

/** Situação de uma mensagem avulsa, atualizada pelos webhooks de entrega. */
router.get('/:id', (req, res) => {
  const message = getDirectMessage(Number(req.params.id));
  if (!message) return res.status(404).json({ error: 'mensagem não encontrada' });
  res.json(message);
});

export default router;
