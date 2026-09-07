import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raiz do projeto (a pasta que contém src/ e package.json). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function str(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Variável de ambiente ${name} deve ser um número inteiro (recebido: "${raw}")`);
  }
  return parsed;
}

/**
 * ':memory:' é um destino especial do SQLite (banco só em RAM) e não pode
 * passar por path.resolve, que o transformaria num arquivo de verdade.
 */
function resolveDatabasePath(value) {
  if (value === ':memory:' || value.startsWith('file:')) return value;
  // Caminhos relativos apontam para a raiz do projeto, não para o diretório
  // de onde o comando foi chamado — assim o CLI acha o mesmo banco do servidor.
  return path.resolve(ROOT, value);
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(raw.toLowerCase());
}

export const config = {
  root: ROOT,

  whatsapp: {
    accessToken: str('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: str('WHATSAPP_PHONE_NUMBER_ID'),
    businessAccountId: str('WHATSAPP_BUSINESS_ACCOUNT_ID'),
    appSecret: str('WHATSAPP_APP_SECRET'),
    webhookVerifyToken: str('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    apiVersion: str('WHATSAPP_API_VERSION', 'v23.0'),
    graphBaseUrl: str('WHATSAPP_GRAPH_BASE_URL', 'https://graph.facebook.com'),
  },

  sending: {
    ratePerSecond: int('SEND_RATE_PER_SECOND', 15),
    concurrency: int('SEND_CONCURRENCY', 8),
    dailyUniqueRecipientLimit: int('DAILY_UNIQUE_RECIPIENT_LIMIT', 1000),
    // Pair rate limit da Meta: 1 mensagem a cada 6s para o mesmo destinatário.
    perRecipientIntervalMs: int('PER_RECIPIENT_INTERVAL_MS', 6000),
    maxRetries: int('MAX_RETRIES', 4),
    retryBaseDelayMs: int('RETRY_BASE_DELAY_MS', 2000),
    dryRun: bool('DRY_RUN', false),
  },

  app: {
    port: int('PORT', 3000),
    host: str('HOST', '0.0.0.0'),
    databasePath: resolveDatabasePath(str('DATABASE_PATH', './data/alavro.sqlite')),
    logLevel: str('LOG_LEVEL', 'info'),
    apiKey: str('API_KEY'),
    defaultCountryCode: str('DEFAULT_COUNTRY_CODE', '55'),
    autoStartDispatcher: bool('AUTO_START_DISPATCHER', true),
  },
};

/**
 * Verifica se as credenciais mínimas para ENVIAR mensagens estão presentes.
 * Retorna a lista de variáveis faltando (vazia = tudo certo).
 */
export function missingSendingCredentials() {
  const missing = [];
  if (!config.whatsapp.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!config.whatsapp.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  return missing;
}

/**
 * Verifica as credenciais necessárias para RECEBER webhooks da Meta.
 */
export function missingWebhookCredentials() {
  const missing = [];
  if (!config.whatsapp.webhookVerifyToken) missing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  if (!config.whatsapp.appSecret) missing.push('WHATSAPP_APP_SECRET');
  return missing;
}

export default config;
