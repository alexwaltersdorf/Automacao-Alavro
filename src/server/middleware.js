import config from '../config.js';
import logger from '../logger.js';

const log = logger.child({ module: 'http' });

/**
 * Autenticação simples por chave de API no header X-API-Key
 * (ou Authorization: Bearer <chave>).
 * Com API_KEY vazio a proteção fica desligada — use só em desenvolvimento.
 */
export function requireApiKey(req, res, next) {
  if (!config.app.apiKey) return next();

  const header = req.get('x-api-key') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (header && header === config.app.apiKey) return next();

  res.status(401).json({ error: 'não autorizado', detail: 'informe a chave em X-API-Key' });
}

/** Envolve handlers async para que erros caiam no middleware de erro. */
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (req.path === '/api/health') return;
    log.debug(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      ms: Date.now() - startedAt,
    });
  });
  next();
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status ?? error.httpStatus ?? 500;
  if (status >= 500) log.error('erro na requisição', { error: error.message, stack: error.stack });

  // Quando a recusa é por tempo (limite por destinatário), diz quando tentar de novo.
  if (error.retryAfterMs) res.setHeader('Retry-After', Math.ceil(error.retryAfterMs / 1000));

  res.status(status).json({
    error: error.title ?? error.message ?? 'erro ao processar a requisição',
    detail: error.detail ?? error.message,
    code: error.code ?? null,
    // Identificador estável do motivo, para quem integra tratar por código
    // em vez de comparar texto.
    reason: error.reason ?? null,
    ...(error.retryAfterMs ? { retry_after_ms: error.retryAfterMs } : {}),
  });
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'rota não encontrada' });
}
