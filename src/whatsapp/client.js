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

    /**
     * Último consumo relatado pela Meta no header X-Business-Use-Case-Usage.
     * Os endpoints de gestão (templates, números, usuários) têm teto de
     * 200 req/h por app/WABA — 5000 quando a WABA tem número registrado.
     * O envio de mensagens NÃO entra nessa conta.
     */
    this.usage = { callCount: null, totalCputime: null, totalTime: null, updatedAt: null };
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
      this.captureUsage(response.headers);
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
   * Lê o header X-Business-Use-Case-Usage, onde a Meta informa quanto da cota
   * horária já foi consumida (0–100%). Serve para frear os endpoints de gestão
   * antes de tomar bloqueio.
   */
  captureUsage(headers) {
    const raw = headers?.get?.('x-business-use-case-usage');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      // O header vem como { "<business_id>": [{ call_count, total_cputime, ... }] }.
      const entry = Object.values(parsed).flat().filter(Boolean)[0];
      if (!entry) return;

      this.usage = {
        callCount: entry.call_count ?? null,
        totalCputime: entry.total_cputime ?? null,
        totalTime: entry.total_time ?? null,
        estimatedTimeToRegainAccess: entry.estimated_time_to_regain_access ?? null,
        updatedAt: new Date().toISOString(),
      };

      if (typeof this.usage.callCount === 'number' && this.usage.callCount >= 90) {
        log.warn('cota horária da Graph API quase esgotada', { consumoPercentual: this.usage.callCount });
      }
    } catch {
      // Header em formato inesperado não deve derrubar a chamada.
    }
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
  async listTemplates({ limit = 100, after } = {}) {
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
  async createTemplate(template) {
    if (!this.businessAccountId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID não configurado — necessário para gerenciar templates.');
    }
    return this.request('POST', `${this.businessAccountId}/message_templates`, { body: template });
  }

  deleteTemplate(name) {
    return this.request('DELETE', `${this.businessAccountId}/message_templates`, { query: { name } });
  }

  requireBusinessAccount() {
    if (!this.businessAccountId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID não configurado — necessário para analytics.');
    }
  }

  /**
   * Analytics de mensagens da WABA: quantidade enviada e entregue no período.
   * @param {{start: Date|number, end: Date|number, granularity?: 'HALF_HOUR'|'DAY'|'MONTH'}} range
   */
  async getMessagingAnalytics({ start, end, granularity = 'DAY', phoneNumbers } = {}) {
    this.requireBusinessAccount();
    const parts = [
      `start(${toUnix(start)})`,
      `end(${toUnix(end)})`,
      `granularity(${granularity})`,
    ];
    if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
      parts.push(`phone_numbers(${JSON.stringify(phoneNumbers)})`);
    }
    return this.request('GET', this.businessAccountId, {
      query: { fields: `analytics.${parts.join('.')}` },
    });
  }

  /**
   * Analytics de conversas e custo: detalhamento de preço por conversa.
   * @param {{start: Date|number, end: Date|number, granularity?: 'HALF_HOUR'|'DAILY'|'MONTHLY'}} range
   */
  async getPricingAnalytics({ start, end, granularity = 'DAILY', dimensions } = {}) {
    this.requireBusinessAccount();
    const parts = [
      `start(${toUnix(start)})`,
      `end(${toUnix(end)})`,
      `granularity(${granularity})`,
    ];
    if (Array.isArray(dimensions) && dimensions.length > 0) {
      parts.push(`dimensions(${JSON.stringify(dimensions)})`);
    }
    return this.request('GET', this.businessAccountId, {
      query: { fields: `pricing_analytics.${parts.join('.')}` },
    });
  }

  /**
   * Analytics por template: enviadas, entregues, lidas e cliques nos botões.
   * Exige que o template esteja com analytics habilitado na WABA.
   * @param {{templateIds: string[], start: Date|number, end: Date|number}} options
   */
  async getTemplateAnalytics({ templateIds, start, end, granularity = 'DAILY', metricTypes } = {}) {
    this.requireBusinessAccount();
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      throw new Error('templateIds é obrigatório para consultar analytics de template.');
    }
    return this.request('GET', `${this.businessAccountId}/template_analytics`, {
      query: {
        start: toUnix(start),
        end: toUnix(end),
        granularity,
        template_ids: JSON.stringify(templateIds),
        metric_types: JSON.stringify(metricTypes ?? ['SENT', 'DELIVERED', 'READ', 'CLICKED']),
      },
    });
  }

  /** Confere se o token está válido e quais permissões possui. */
  debugToken() {
    return this.request('GET', 'debug_token', { query: { input_token: this.accessToken } });
  }
}

/** A Graph API espera timestamps Unix em segundos. */
function toUnix(value) {
  if (value === undefined || value === null) {
    throw new Error('período de analytics exige start e end');
  }
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  const number = Number(value);
  if (Number.isNaN(number)) {
    const parsed = Date.parse(String(value));
    if (Number.isNaN(parsed)) throw new Error(`data inválida para analytics: ${value}`);
    return Math.floor(parsed / 1000);
  }
  // Aceita tanto segundos quanto milissegundos.
  return number > 1e11 ? Math.floor(number / 1000) : Math.floor(number);
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
