/**
 * Classificação dos códigos de erro da WhatsApp Cloud API.
 * Referência: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 *
 * A ação define o que o dispatcher faz com a mensagem:
 *   retry     → erro temporário, tenta de novo com backoff exponencial
 *   throttle  → estouro de limite; recua o ritmo global e tenta de novo
 *   fail      → erro definitivo daquela mensagem; não adianta repetir
 *   invalid   → o destinatário não existe / não usa WhatsApp; marca o contato
 *   pause     → problema na conta ou credencial; pausa a campanha inteira
 */

export const ERROR_ACTIONS = {
  RETRY: 'retry',
  THROTTLE: 'throttle',
  FAIL: 'fail',
  INVALID: 'invalid',
  PAUSE: 'pause',
};

const CATALOG = new Map([
  // --- Autenticação e autorização (fatal: pausa a campanha) ------------------
  [0, { action: ERROR_ACTIONS.PAUSE, message: 'Não foi possível autenticar o usuário. Verifique o token de acesso.' }],
  [3, { action: ERROR_ACTIONS.PAUSE, message: 'Permissão ausente no token. Adicione whatsapp_business_messaging ao usuário do sistema.' }],
  [10, { action: ERROR_ACTIONS.PAUSE, message: 'Permissão negada pelo aplicativo.' }],
  [190, { action: ERROR_ACTIONS.PAUSE, message: 'Token de acesso expirado ou inválido. Gere um novo token permanente.' }],
  [200, { action: ERROR_ACTIONS.PAUSE, message: 'Permissão insuficiente para enviar mensagens por este número.' }],
  [368, { action: ERROR_ACTIONS.PAUSE, message: 'Conta temporariamente bloqueada por violação das políticas da Meta.' }],
  [2500, { action: ERROR_ACTIONS.FAIL, message: 'Requisição malformada para a Graph API.' }],

  // --- Limites de throughput (recua e tenta de novo) -------------------------
  [4, { action: ERROR_ACTIONS.THROTTLE, message: 'Limite de requisições da aplicação atingido.' }],
  [80007, { action: ERROR_ACTIONS.THROTTLE, message: 'Limite de taxa da conta do WhatsApp Business atingido.' }],
  [130429, { action: ERROR_ACTIONS.THROTTLE, message: 'Limite de throughput da Cloud API atingido. Reduza SEND_RATE_PER_SECOND.' }],
  [131056, { action: ERROR_ACTIONS.THROTTLE, message: 'Muitas mensagens para o mesmo destinatário em pouco tempo.' }],
  [133016, { action: ERROR_ACTIONS.THROTTLE, message: 'Excesso de requisições no número comercial.' }],
  [131048, { action: ERROR_ACTIONS.PAUSE, message: 'Limite anti-spam atingido: a qualidade do número caiu. Pause os disparos e revise o conteúdo.' }],

  // --- Erros temporários da plataforma --------------------------------------
  [1, { action: ERROR_ACTIONS.RETRY, message: 'Erro desconhecido na API.' }],
  [2, { action: ERROR_ACTIONS.RETRY, message: 'Serviço temporariamente indisponível.' }],
  [131000, { action: ERROR_ACTIONS.RETRY, message: 'Erro interno da Meta ao processar a mensagem.' }],
  [131009, { action: ERROR_ACTIONS.FAIL, message: 'Valor de parâmetro inválido na mensagem.' }],
  [131016, { action: ERROR_ACTIONS.RETRY, message: 'Serviço do WhatsApp indisponível no momento.' }],

  // --- Destinatário ---------------------------------------------------------
  [131026, { action: ERROR_ACTIONS.INVALID, message: 'Mensagem não entregue: o número não usa WhatsApp ou não pode receber mensagens.' }],
  [131021, { action: ERROR_ACTIONS.FAIL, message: 'Remetente e destinatário são o mesmo número.' }],
  [131031, { action: ERROR_ACTIONS.PAUSE, message: 'Conta comercial bloqueada ou restrita pela Meta.' }],
  [131052, { action: ERROR_ACTIONS.FAIL, message: 'Falha ao baixar a mídia informada.' }],
  [131053, { action: ERROR_ACTIONS.FAIL, message: 'Formato de mídia não suportado.' }],

  // --- Janela de atendimento de 24h -----------------------------------------
  [131047, { action: ERROR_ACTIONS.FAIL, message: 'Janela de 24h fechada: só é possível enviar um template aprovado para este contato.' }],
  [131051, { action: ERROR_ACTIONS.FAIL, message: 'Tipo de mensagem não suportado.' }],
  [131045, { action: ERROR_ACTIONS.PAUSE, message: 'Número comercial não registrado corretamente na Cloud API.' }],

  // --- Templates ------------------------------------------------------------
  [132000, { action: ERROR_ACTIONS.FAIL, message: 'Número de parâmetros do template não confere com o template aprovado.' }],
  [132001, { action: ERROR_ACTIONS.FAIL, message: 'Template não existe no idioma informado ou não foi aprovado.' }],
  [132005, { action: ERROR_ACTIONS.FAIL, message: 'Texto do template excede o tamanho permitido após substituir as variáveis.' }],
  [132007, { action: ERROR_ACTIONS.FAIL, message: 'Conteúdo do template viola as políticas de formatação da Meta.' }],
  [132012, { action: ERROR_ACTIONS.FAIL, message: 'Formato de parâmetro do template incorreto.' }],
  [132015, { action: ERROR_ACTIONS.FAIL, message: 'Template pausado por baixa qualidade.' }],
  [132016, { action: ERROR_ACTIONS.FAIL, message: 'Template desabilitado definitivamente por baixa qualidade.' }],
  [132068, { action: ERROR_ACTIONS.FAIL, message: 'Fluxo (Flow) do template está bloqueado.' }],
  [133010, { action: ERROR_ACTIONS.PAUSE, message: 'Número comercial não registrado. Conclua o registro na Cloud API.' }],

  // --- Parâmetros -----------------------------------------------------------
  [100, { action: ERROR_ACTIONS.FAIL, message: 'Parâmetro inválido na chamada da API.' }],
]);

/**
 * Interpreta a resposta de erro da Graph API.
 * @param {number|null} httpStatus
 * @param {object|null} body corpo JSON retornado pela Meta
 * @returns {{action: string, code: number|null, subcode: number|null, title: string, detail: string, retryable: boolean}}
 */
export function classifyError(httpStatus, body) {
  const error = body?.error ?? {};
  const code = typeof error.code === 'number' ? error.code : null;
  const subcode = typeof error.error_subcode === 'number' ? error.error_subcode : null;

  const known = code !== null ? CATALOG.get(code) : undefined;

  let action;
  if (known) {
    action = known.action;
  } else if (httpStatus === 429) {
    action = ERROR_ACTIONS.THROTTLE;
  } else if (httpStatus && httpStatus >= 500) {
    action = ERROR_ACTIONS.RETRY;
  } else if (httpStatus === 401 || httpStatus === 403) {
    action = ERROR_ACTIONS.PAUSE;
  } else if (httpStatus && httpStatus >= 400) {
    action = ERROR_ACTIONS.FAIL;
  } else {
    // Sem status HTTP = falha de rede/timeout.
    action = ERROR_ACTIONS.RETRY;
  }

  const title = error.error_user_title || error.type || `HTTP ${httpStatus ?? 'network'}`;
  const detail =
    known?.message ||
    error.error_user_msg ||
    error.error_data?.details ||
    error.message ||
    'Erro não identificado ao chamar a Graph API.';

  return {
    action,
    code,
    subcode,
    title,
    detail,
    retryable: action === ERROR_ACTIONS.RETRY || action === ERROR_ACTIONS.THROTTLE,
  };
}

/** Erro lançado pelo cliente da Cloud API, já classificado. */
export class WhatsAppApiError extends Error {
  constructor(classification, httpStatus, body) {
    super(`[${classification.code ?? httpStatus}] ${classification.detail}`);
    this.name = 'WhatsAppApiError';
    this.httpStatus = httpStatus;
    this.body = body;
    this.code = classification.code;
    this.subcode = classification.subcode;
    this.title = classification.title;
    this.detail = classification.detail;
    this.action = classification.action;
    this.retryable = classification.retryable;
  }
}

export default { classifyError, WhatsAppApiError, ERROR_ACTIONS };
