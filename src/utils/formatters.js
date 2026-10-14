/**
 * Utilitários para formatação e higienização dos dados extraídos pelos scrapers.
 */

/**
 * Normaliza o preço para o padrão brasileiro (R$ 0,00) e calcula o valor numérico para ordenação.
 * @param {string|number} rawPrice 
 * @returns {{ formatted: string, numeric: number }}
 */
export function parsePrice(rawPrice) {
  if (!rawPrice) {
    return { formatted: 'Consulte na loja', numeric: 0 };
  }

  const str = String(rawPrice).trim();

  // Limpa caracteres deixando apenas dígitos, pontos e vírgulas
  const cleaned = str.replace(/[^\d.,]/g, '');

  let numeric = 0;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Ex: 1.234,56
    numeric = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  } else if (cleaned.includes(',')) {
    // Ex: 1234,56
    numeric = parseFloat(cleaned.replace(',', '.'));
  } else if (cleaned.includes('.')) {
    // Ex: 1234.56
    numeric = parseFloat(cleaned);
  } else {
    numeric = parseFloat(cleaned) || 0;
  }

  const formatted = isNaN(numeric) || numeric === 0
    ? (str.startsWith('R$') ? str : `R$ ${str}`)
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);

  return {
    formatted,
    numeric: isNaN(numeric) ? 0 : numeric
  };
}

/**
 * Higieniza o título do produto removendo quebras de linha e espaços extras.
 * @param {string} rawTitle 
 * @returns {string}
 */
export function sanitizeTitle(rawTitle) {
  if (!rawTitle) return 'Produto sem título';
  return String(rawTitle)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Garante que a URL seja absoluta.
 * @param {string} url 
 * @param {string} baseUrl 
 * @returns {string}
 */
export function normalizeUrl(url, baseUrl) {
  if (!url) return baseUrl;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
