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
    numeric = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  } else if (cleaned.includes(',')) {
    numeric = parseFloat(cleaned.replace(',', '.'));
  } else if (cleaned.includes('.')) {
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
 * Garante que o link leve diretamente ao produto. Se o scraper capturar uma URL genérica da loja,
 * gera automaticamente o link direto de busca do produto específico na loja oficial.
 * @param {string} store 
 * @param {string} rawUrl 
 * @param {string} title 
 * @param {string} baseUrl 
 * @returns {string}
 */
export function ensureDirectProductUrl(store, rawUrl, title, baseUrl) {
  const cleanTitle = sanitizeTitle(title);
  const encodedTitle = encodeURIComponent(cleanTitle);

  // Se a URL capturada for vazia ou for a página inicial/geral de ofertas
  const isGeneric = !rawUrl || 
    rawUrl === baseUrl || 
    rawUrl.endsWith('/ofertas') || 
    rawUrl.endsWith('/ofertas/') ||
    rawUrl.includes('/selecao/ofertasdodia') ||
    rawUrl === 'https://www.americanas.com.br/' ||
    rawUrl === 'https://www.kabum.com.br/ofertas';

  if (!isGeneric) {
    try {
      return new URL(rawUrl, baseUrl).href;
    } catch {
      // continua para fallback
    }
  }

  // Fallbacks diretos para a página de compra do produto na loja oficial
  switch (store) {
    case 'Mercado Livre':
      return `https://lista.mercadolivre.com.br/${encodedTitle}`;
    case 'Magazine Luiza':
      return `https://www.magazineluiza.com.br/busca/${encodedTitle}/`;
    case 'Americanas':
      return `https://www.americanas.com.br/busca/${encodedTitle}`;
    case 'Kabum':
      return `https://www.kabum.com.br/busca?query=${encodedTitle}`;
    default:
      return rawUrl || baseUrl;
  }
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
