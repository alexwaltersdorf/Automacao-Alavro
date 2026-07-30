import express from 'express';
import config from '../../config.js';
import logger from '../../logger.js';
import { verifySignature, handleVerification, processWebhook } from '../../core/webhookProcessor.js';

const log = logger.child({ module: 'webhook-route' });
const router = express.Router();

/**
 * Verificação do webhook (GET) — a Meta chama esta URL uma vez ao salvar a
 * configuração no painel e espera receber o hub.challenge de volta em texto puro.
 */
router.get('/', (req, res) => {
  const result = handleVerification(req.query);
  if (result.ok) return res.status(200).type('text/plain').send(String(result.challenge));
  return res.sendStatus(403);
});

/**
 * Recebimento das notificações (POST).
 *
 * Regra da Meta: responder 200 rapidamente. Se demorarmos ou devolvermos erro,
 * a Meta reenvia o evento e, na insistência, desativa a assinatura. Por isso
 * validamos a assinatura, respondemos e só então processamos.
 */
router.post('/', express.raw({ type: '*/*', limit: '5mb' }), (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ''));

  if (config.whatsapp.appSecret) {
    const signature = verifySignature(rawBody, req.get('x-hub-signature-256'));
    if (!signature.valid) {
      log.warn('webhook rejeitado', { motivo: signature.reason });
      return res.sendStatus(401);
    }
  } else {
    log.warn('WHATSAPP_APP_SECRET não configurado: assinatura do webhook NÃO está sendo validada');
  }

  res.sendStatus(200);

  setImmediate(() => {
    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      const summary = processWebhook(body);
      if (summary.statuses || summary.messages) log.debug('webhook processado', summary);
    } catch (error) {
      log.error('falha ao processar webhook', { error: error.message });
    }
  });
});

export default router;
