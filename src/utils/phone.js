/**
 * Normalização de telefones para o formato exigido pela WhatsApp Cloud API.
 *
 * A Meta espera o número em formato E.164 SEM o "+" e sem separadores,
 * por exemplo: 5511987654321.
 *
 * Particularidade brasileira: celulares ganharam um nono dígito ("9") em 2012-2016.
 * Números cadastrados no WhatsApp antes disso continuam devolvendo o `wa_id` nos
 * webhooks SEM o nono dígito (551187654321), mesmo quando o envio é feito COM ele.
 * Por isso `phoneVariants()` gera as duas formas para conseguirmos casar o
 * webhook recebido com o contato correto na base.
 */

const DDD_BR = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function onlyDigits(input) {
  return String(input ?? '').replace(/\D+/g, '');
}

/**
 * Converte uma entrada arbitrária em E.164 sem "+".
 * @param {string} input número em qualquer formato: (11) 98765-4321, +55 11 98765 4321…
 * @param {string} defaultCountryCode DDI assumido quando o número vem sem ele
 * @returns {{ok: true, e164: string} | {ok: false, error: string}}
 */
export function normalizePhone(input, defaultCountryCode = '55') {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, error: 'telefone vazio' };

  // "00" é prefixo internacional discado em vários países — equivale ao "+".
  let digits = onlyDigits(raw);
  if (!raw.startsWith('+') && digits.startsWith('00')) digits = digits.slice(2);

  if (!digits) return { ok: false, error: 'telefone sem dígitos' };
  if (/^0+$/.test(digits)) return { ok: false, error: 'telefone inválido' };

  const cc = onlyDigits(defaultCountryCode) || '55';
  const hadPlus = raw.startsWith('+');

  if (cc === '55') {
    const brazilian = normalizeBrazil(digits, hadPlus);
    if (brazilian) return brazilian;
  }

  // Demais países: se o usuário já informou o "+" ou o número claramente
  // contém o DDI, aceitamos como está; caso contrário prefixamos o DDI padrão.
  if (!hadPlus && !digits.startsWith(cc)) digits = cc + digits;

  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: `telefone com tamanho inválido (${digits.length} dígitos)` };
  }
  return { ok: true, e164: digits };
}

function normalizeBrazil(digits, hadPlus) {
  let national = digits;

  if (hadPlus && !national.startsWith('55')) {
    // "+" com outro DDI: não é um número brasileiro, deixa o fluxo genérico tratar.
    return null;
  }

  // Prefixo "0" da discagem nacional: 011 98765-4321, 0 11 3255-4321.
  // Retirado antes de qualquer coisa para não ser confundido com DDI.
  if (national.startsWith('0') && !national.startsWith('55')) {
    national = national.replace(/^0+/, '');
  }

  if (national.startsWith('55') && (national.length === 12 || national.length === 13)) {
    national = national.slice(2);
  } else if (national.length === 12 || national.length === 13) {
    // Tamanho de número internacional sem DDI brasileiro: não é daqui.
    return null;
  }

  if (national.length !== 10 && national.length !== 11) {
    return { ok: false, error: `número brasileiro deve ter DDD + 8 ou 9 dígitos (recebido ${national.length})` };
  }

  const ddd = Number.parseInt(national.slice(0, 2), 10);
  if (!DDD_BR.has(ddd)) return { ok: false, error: `DDD ${national.slice(0, 2)} não existe no Brasil` };

  let subscriber = national.slice(2);

  // Celular com 8 dígitos iniciando em 6-9: acrescenta o nono dígito.
  if (subscriber.length === 8 && /^[6-9]/.test(subscriber)) {
    subscriber = `9${subscriber}`;
  }

  if (subscriber.length === 9 && !/^9/.test(subscriber)) {
    return { ok: false, error: 'celular brasileiro de 9 dígitos deve começar com 9' };
  }
  if (subscriber.length === 8 && !/^[2-5]/.test(subscriber)) {
    return { ok: false, error: 'número fixo inválido' };
  }

  return { ok: true, e164: `55${national.slice(0, 2)}${subscriber}` };
}

/**
 * Retorna as formas equivalentes de um número — usado para casar o `wa_id`
 * recebido no webhook com o contato armazenado.
 * @param {string} e164
 * @returns {string[]} lista sem duplicatas, sempre contendo o próprio e164
 */
export function phoneVariants(e164) {
  const value = onlyDigits(e164);
  const variants = new Set([value]);

  if (value.startsWith('55')) {
    const national = value.slice(2);
    const ddd = national.slice(0, 2);
    const subscriber = national.slice(2);

    if (subscriber.length === 9 && subscriber.startsWith('9')) {
      variants.add(`55${ddd}${subscriber.slice(1)}`); // sem o nono dígito
    } else if (subscriber.length === 8 && /^[6-9]/.test(subscriber)) {
      variants.add(`55${ddd}9${subscriber}`); // com o nono dígito
    }
  }

  return [...variants];
}

/** Formata para exibição: +55 (11) 98765-4321 */
export function formatDisplay(e164) {
  const value = onlyDigits(e164);
  if (value.startsWith('55') && (value.length === 12 || value.length === 13)) {
    const ddd = value.slice(2, 4);
    const rest = value.slice(4);
    const head = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const tail = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `+55 (${ddd}) ${head}-${tail}`;
  }
  return `+${value}`;
}

export default { normalizePhone, phoneVariants, formatDisplay, onlyDigits };
