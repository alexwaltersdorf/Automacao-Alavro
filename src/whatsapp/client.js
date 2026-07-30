import config from '../config.js';
import logger from '../logger.js';
import { classifyError, WhatsAppApiError } from './errors.js';
import { buildTextMessage, buildTemplateMessage, buildReadReceipt } from './messages.js';

const log = logger.child({ module: 'whatsapp-client' });

/**
 * Cliente da WhatsApp Cloud API (Graph API oficial da Meta).
 *
 * Autenticação: Bearer com o token permanente do Usuário do Sistema.
 * Base: https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages
 */
export class WhatsAppClient {
  constructor(options = {}) {
    this.accessToken = options.accessToken ?? config.whatsapp.accessToken;
    this.phoneNumberId = options.phoneNumberId ?? config.whatsapp.phoneNumberId;
    this.businessAccountId = options.businessAccountId ?? config.whatsapp.businessAccountId;
    this.apiVersion = options.apiVersion ?? config.whatsapp.apiVersion;
    this.baseUrl = options.baseUrl ?? config.whatsapp.graphBaseUrl;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.dryRun = options.dryRun ?? config.sending.dryRun;
    // Injetável para testes.
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  url(pathname, query) {
    const url = new URL(`/${this.apiVersion}/${pathname}`.replace(/\/+/g, '/'), this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async request(method, pathname, { body, query } = {}) {
    const url = this.url(pathname, query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    let payload;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      payload = text ? safeJsonParse(text) : {};
    } catch (cause) {
      // Timeout, DNS, conexão recusada… tratado como erro temporário.
      const classification = classifyError(null, {
        error: { message: cause?.name === 'AbortError' ? 'Timeout na chamada à Graph API' : cause?.message },
      });
      throw new WhatsAppApiError(classification, null, null);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const classification = classifyError(response.status, payload);
      log.debug('erro da Graph API', {
        status: response.status,
        code: classification.code,
        action: classification.action,
      });
      throw new WhatsAppApiError(classification, response.status, payload);
    }

    return payload;
  }

  /**
   * Envia um payload já montado para /{PHONE_NUMBER_ID}/messages.
   * @returns {Promise<{wamid: string|null, raw: object}>}
   */
  async sendMessage(payload) {
    if (this.dryRun) {
      log.info('DRY_RUN: mensagem não enviada', { to: payload.to, type: payload.type });
      return { wamid: `dryrun.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`, raw: { dry_run: true } };
    }

    const raw = await this.request('POST', `${this.phoneNumberId}/messages`, { body: payload });
    return { wamid: raw?.messages?.[0]?.id ?? null, raw };
  }

  sendText(to, body, options) {
    return this.sendMessage(buildTextMessage(to, body, options));
  }

  sendTemplate(to, name, language, components) {
    return this.sendMessage(buildTemplateMessage(to, name, language, components));
  }

  markAsRead(messageId) {
    return this.request('POST', `${this.phoneNumberId}/messages`, { body: buildReadReceipt(messageId) });
  }

  /** Dados do número comercial: qualidade, limite de mensagens, nome exibido. */
  getPhoneNumber() {
    return this.request('GET', this.phoneNumberId, {
      query: {
        fields:
          'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status,platform_type,throughput',
      },
    });
  }

  /** Lista os templates da WABA (aprovados, pendentes e rejeitados). */
  listTemplates({ limit = 100, after } = {}) {
    if (!this.businessAccountId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID não configurado — necessário para gerenciar templates.');
    }
    return this.request('GET', `${this.businessAccountId}/message_templates`, {
      query: { limit, after, fields: 'name,status,category,language,components,quality_score,rejected_reason' },
    });
  }

  /**
   * Cria um template na Meta. A aprovação leva de minutos a 24h.
   * @param {{name: string, language: string, category: string, components: Array}} template
   */
  createTemplate(template) {
    if (!this.businessAccountId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID não configurado — necessário para gerenciar templates.');
    }
    return this.request('POST', `${this.businessAccountId}/message_templates`, { body: template });
  }

  deleteTemplate(name) {
    return this.request('DELETE', `${this.businessAccountId}/message_templates`, { query: { name } });
  }

  /** Confere se o token está válido e quais permissões possui. */
  debugToken() {
    return this.request('GET', 'debug_token', { query: { input_token: this.accessToken } });
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 500) } };
  }
}

let shared = null;
export function getClient() {
  if (!shared) shared = new WhatsAppClient();
  return shared;
}

/** Substitui a instância compartilhada (usado nos testes). */
export function setClient(client) {
  shared = client;
}

export default WhatsAppClient;
