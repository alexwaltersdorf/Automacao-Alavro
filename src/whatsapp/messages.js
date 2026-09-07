/**
 * Construtores dos payloads aceitos pelo endpoint
 * POST /{PHONE_NUMBER_ID}/messages da WhatsApp Cloud API.
 */

/** Mensagem de texto livre — só permitida dentro da janela de 24h. */
export function buildTextMessage(to, body, { previewUrl = false } = {}) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: previewUrl, body },
  };
}

/**
 * Mensagem de template — é o único formato permitido para iniciar conversas
 * (disparo em massa). O template precisa estar APROVADO na Meta.
 *
 * @param {string} to número em E.164 sem "+"
 * @param {string} name nome do template aprovado
 * @param {string} language código do idioma (ex.: pt_BR)
 * @param {Array}  components componentes já resolvidos (ver buildTemplateComponents)
 */
export function buildTemplateMessage(to, name, language = 'pt_BR', components = []) {
  const template = { name, language: { code: language } };
  if (components.length > 0) template.components = components;

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template,
  };
}

/**
 * Monta os `components` do template substituindo as variáveis pelos dados do contato.
 *
 * A definição vem da campanha e usa placeholders no estilo {{nome_do_campo}},
 * resolvidos contra os atributos do contato:
 *
 *   {
 *     header: { type: 'text', parameters: ['{{name}}'] },
 *     body:   ['{{name}}', '{{cidade}}'],
 *     buttons: [{ subType: 'url', index: 0, parameters: ['{{cupom}}'] }]
 *   }
 *
 * @param {object} definition definição salva na campanha (JSON)
 * @param {object} variables valores disponíveis (name, phone e atributos do contato)
 */
export function buildTemplateComponents(definition, variables = {}) {
  if (!definition || typeof definition !== 'object') return [];
  const components = [];

  if (definition.header) {
    const header = definition.header;
    if (header.type === 'text') {
      const parameters = (header.parameters ?? []).map((value) => ({
        type: 'text',
        text: interpolate(value, variables),
      }));
      if (parameters.length > 0) components.push({ type: 'header', parameters });
    } else if (['image', 'video', 'document'].includes(header.type)) {
      const media = {};
      if (header.link) media.link = interpolate(header.link, variables);
      if (header.id) media.id = header.id;
      if (header.type === 'document' && header.filename) media.filename = header.filename;
      components.push({
        type: 'header',
        parameters: [{ type: header.type, [header.type]: media }],
      });
    }
  }

  if (Array.isArray(definition.body) && definition.body.length > 0) {
    components.push({
      type: 'body',
      parameters: definition.body.map((value) => ({
        type: 'text',
        text: interpolate(value, variables),
      })),
    });
  }

  if (Array.isArray(definition.buttons)) {
    for (const button of definition.buttons) {
      components.push({
        type: 'button',
        sub_type: button.subType ?? button.sub_type ?? 'url',
        index: String(button.index ?? 0),
        parameters: (button.parameters ?? []).map((value) => ({
          type: 'text',
          text: interpolate(value, variables),
        })),
      });
    }
  }

  return components;
}

/**
 * Substitui {{campo}} pelos valores fornecidos.
 * Campos ausentes viram string vazia — a Meta rejeita parâmetros nulos.
 */
export function interpolate(template, variables = {}) {
  if (typeof template !== 'string') return String(template ?? '');
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    // A Meta rejeita parâmetros com quebras de linha, tabs ou 4+ espaços seguidos.
    return String(value).replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ');
  });
}

/** Mensagem de mídia (imagem, vídeo, documento, áudio) dentro da janela de 24h. */
export function buildMediaMessage(to, type, { link, id, caption, filename } = {}) {
  const media = {};
  if (link) media.link = link;
  if (id) media.id = id;
  if (caption && type !== 'audio') media.caption = caption;
  if (filename && type === 'document') media.filename = filename;

  return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type, [type]: media };
}

/** Marca uma mensagem recebida como lida (bom para a reputação do número). */
export function buildReadReceipt(messageId) {
  return { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
}

export default {
  buildTextMessage,
  buildTemplateMessage,
  buildTemplateComponents,
  buildMediaMessage,
  buildReadReceipt,
  interpolate,
};
