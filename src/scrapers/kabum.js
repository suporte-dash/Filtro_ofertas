import { createStealthPage, randomDelay } from '../utils/browser.js';
import { parsePrice, sanitizeTitle, normalizeUrl } from '../utils/formatters.js';

const STORE_NAME = 'Kabum';
const BASE_URL = 'https://www.kabum.com.br';
const DEALS_URL = 'https://www.kabum.com.br/espaco-gamer?search-term=gamer';

/**
 * Extrai as 10 principais ofertas da Kabum.
 * @param {import('puppeteer').Browser} browser
 * @returns {Promise<Array<{ title: string, price: string, priceNumeric: number, originalPrice: string|null, discount: string|null, store: string, url: string, image: string|null }>>}
 */
export async function scrapeKabum(browser) {
  const page = await createStealthPage(browser);
  const products = [];

  try {
    console.log(`[${STORE_NAME}] Acessando ${DEALS_URL}...`);
    await page.goto(DEALS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await randomDelay(1000, 2000);

    // Método 1: Extração rápida e precisa via __NEXT_DATA__ do SSR da Kabum
    const nextDataProducts = await page.evaluate(() => {
      try {
        const scriptEl = document.getElementById('__NEXT_DATA__');
        if (!scriptEl) return null;
        const parsed = JSON.parse(scriptEl.textContent || '{}');
        const rawData = parsed.props?.pageProps?.data;
        if (!rawData) return null;
        const inner = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const items = inner.catalogServer?.data || inner.catalog?.products || [];

        return items.slice(0, 10).map(p => {
          const title = p.name || p.friendlyName || '';
          const currentPrice = p.priceWithDiscount || p.price || 0;
          const oldPrice = p.oldPrice || p.price || null;
          const discount = p.discountPercentage ? `${p.discountPercentage}% OFF` : null;
          const code = p.code || '';
          const url = code ? `https://www.kabum.com.br/produto/${code}` : (p.friendlyName ? `https://www.kabum.com.br/produto/${p.friendlyName}` : '');
          const image = p.image || p.photos?.[0] || null;

          return { title, currentPrice, oldPrice, discount, url, image };
        });
      } catch {
        return null;
      }
    });

    if (nextDataProducts && nextDataProducts.length > 0) {
      for (const item of nextDataProducts) {
        if (!item.title) continue;
        const { formatted, numeric } = parsePrice(item.currentPrice);
        products.push({
          title: sanitizeTitle(item.title),
          price: formatted,
          priceNumeric: numeric,
          originalPrice: item.oldPrice ? parsePrice(item.oldPrice).formatted : null,
          discount: item.discount,
          store: STORE_NAME,
          url: normalizeUrl(item.url, BASE_URL),
          image: item.image || null
        });
      }
    } else {
      // Método 2: Fallback por seletores DOM
      const domProducts = await page.evaluate(() => {
        const items = [];
        const cards = document.querySelectorAll(
          'article.productCard, div.productCard, div[class*="productCard"], a[class*="productLink"]'
        );

        for (let i = 0; i < cards.length && items.length < 10; i++) {
          const card = cards[i];
          const title = card.querySelector('span[class*="nameCard"], [class*="title"], h2')?.textContent?.trim() || '';
          const price = card.querySelector('span[class*="priceCard"], [class*="price"]')?.textContent?.trim() || '';
          const oldPrice = card.querySelector('span[class*="oldPriceCard"], s')?.textContent?.trim() || null;
          const discount = card.querySelector('[class*="discount"]')?.textContent?.trim() || null;
          const linkEl = card.tagName.toLowerCase() === 'a' ? card : card.querySelector('a');
          const url = linkEl?.getAttribute('href') || '';
          const imgEl = card.querySelector('img');
          const image = imgEl?.getAttribute('src') || null;

          if (title && price) {
            items.push({ title, price, oldPrice, discount, url, image });
          }
        }
        return items;
      });

      for (const item of domProducts) {
        const { formatted, numeric } = parsePrice(item.price);
        products.push({
          title: sanitizeTitle(item.title),
          price: formatted,
          priceNumeric: numeric,
          originalPrice: item.oldPrice ? parsePrice(item.oldPrice).formatted : null,
          discount: item.discount,
          store: STORE_NAME,
          url: normalizeUrl(item.url, BASE_URL),
          image: item.image || null
        });
      }
    }

    console.log(`[${STORE_NAME}] ${products.length} ofertas extraídas com sucesso.`);
  } catch (err) {
    console.error(`[${STORE_NAME}] Falha ao extrair ofertas:`, err.message);
  } finally {
    await page.close().catch(() => {});
  }

  return products;
}
