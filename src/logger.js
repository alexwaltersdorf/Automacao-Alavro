import config from './config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const threshold = LEVELS[config.app.logLevel] ?? LEVELS.info;

const COLORS = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';
const useColor = process.stdout.isTTY;

/** Campos que nunca devem aparecer nos logs. */
const REDACTED_KEYS = new Set([
  'access_token',
  'accessToken',
  'authorization',
  'appSecret',
  'app_secret',
  'apiKey',
  'api_key',
  'password',
  'token',
]);

function redact(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  const output = {};
  for (const [key, val] of Object.entries(value)) {
    output[key] = REDACTED_KEYS.has(key) ? '[REDACTED]' : redact(val, depth + 1);
  }
  return output;
}

function emit(level, message, context) {
  if (LEVELS[level] < threshold) return;
  const timestamp = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const head = useColor ? `${COLORS[level]}${tag}${RESET}` : tag;
  const tail =
    context && Object.keys(context).length > 0 ? ` ${JSON.stringify(redact(context))}` : '';
  const line = `${timestamp} ${head} ${message}${tail}`;
  if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  debug: (message, context) => emit('debug', message, context),
  info: (message, context) => emit('info', message, context),
  warn: (message, context) => emit('warn', message, context),
  error: (message, context) => emit('error', message, context),
  /** Cria um logger com contexto fixo (ex.: { campaignId: 3 }). */
  child(base) {
    return {
      debug: (message, context) => emit('debug', message, { ...base, ...context }),
      info: (message, context) => emit('info', message, { ...base, ...context }),
      warn: (message, context) => emit('warn', message, { ...base, ...context }),
      error: (message, context) => emit('error', message, { ...base, ...context }),
      child: (extra) => logger.child({ ...base, ...extra }),
    };
  },
};

export default logger;
