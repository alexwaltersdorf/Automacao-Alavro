import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

/** Nomes de coluna aceitos para o telefone e para o nome. */
const PHONE_HEADERS = ['phone', 'telefone', 'celular', 'whatsapp', 'numero', 'número', 'fone', 'contato'];
const NAME_HEADERS = ['name', 'nome', 'cliente', 'contato_nome', 'nome_completo'];

/**
 * Lê um CSV de contatos e devolve linhas normalizadas.
 * Colunas extras viram `attributes`, disponíveis como variáveis {{coluna}}
 * nos templates da campanha.
 *
 * @param {string} content conteúdo do arquivo
 * @returns {Array<{phone: string, name: string|null, attributes: object}>}
 */
export function parseContactsCsv(content) {
  const records = parse(content, {
    columns: (header) => header.map((column) => String(column).trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    delimiter: detectDelimiter(content),
  });

  return records
    .map((record) => {
      const phoneKey = PHONE_HEADERS.find((key) => record[key] !== undefined && record[key] !== '');
      const nameKey = NAME_HEADERS.find((key) => record[key] !== undefined && record[key] !== '');

      const attributes = {};
      for (const [key, value] of Object.entries(record)) {
        if (key === phoneKey || key === nameKey) continue;
        if (value !== undefined && value !== '') attributes[key] = value;
      }

      return {
        phone: phoneKey ? record[phoneKey] : '',
        name: nameKey ? record[nameKey] : null,
        attributes,
      };
    })
    .filter((row) => row.phone !== '');
}

export function parseContactsCsvFile(filePath) {
  return parseContactsCsv(fs.readFileSync(filePath, 'utf8'));
}

/** Detecta se o separador é vírgula ou ponto e vírgula (comum em CSV do Excel BR). */
function detectDelimiter(content) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

/** Serializa linhas em CSV (usado nos relatórios exportáveis). */
export function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((column) => escape(row[column])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

export default { parseContactsCsv, parseContactsCsvFile, toCsv };
