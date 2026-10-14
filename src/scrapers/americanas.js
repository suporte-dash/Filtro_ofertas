import { createStealthPage, randomDelay, autoScroll } from '../utils/browser.js';
import { parsePrice, sanitizeTitle, normalizeUrl } from '../utils/formatters.js';

const STORE_NAME = 'Americanas';
const BASE_URL = 'https://www.americanas.com.br';
const DEALS_URL = 'https://www.americanas.com.br/';

/**
 * Extrai as 10 principais ofertas da Americanas.
 * @param {import('puppeteer').Browser} browser
 * @returns {Promise<Array<{ title: string, price: string, priceNumeric: number, originalPrice: string|null, discount: string|null, store: string, url: string, image: string|null }>>}
 */
export async function scrapeAmericanas(browser) {
  const page = await createStealthPage(browser);
  const products = [];

  try {
    console.log(`[${STORE_NAME}] Acessando ${DEALS_URL}...`);
    await page.goto(DEALS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await randomDelay(1500, 2500);
    await autoScroll(page);

    // Aguarda carregar elementos de produtos da Americanas
    const cardSelectors = [
      'div[class*="product-card"]',
      'div[class*="inStockCard"]',
      'div[class*="src__Wrapper"]',
      'a[href*="/produto/"]'
    ];
    await Promise.race([
      ...cardSelectors.map(sel => page.waitForSelector(sel, { timeout: 12000 }).catch(() => null))
    ]);

    const rawProducts = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll(
        'div[class*="product-card"], div[class*="inStockCard"], div[class*="src__Wrapper"], div[class*="productGrid"] > div, a[href*="/produto/"]'
      );

      for (let i = 0; i < cards.length && items.length < 10; i++) {
        const card = cards[i];

        // Título
        const titleEl = card.querySelector(
          'h3, h2, span[class*="src__Title"], [class*="product-title"], [class*="name"]'
        );
        const title = titleEl?.textContent?.trim() || '';

        // Preço promocional
        const priceEl = card.querySelector(
          'span[class*="src__PromotionalPrice"], span[class*="price__SalesPrice"], [class*="promotional-price"], [class*="best-price"], [class*="price"]'
        );
        const priceText = priceEl?.textContent?.trim() || '';

        // Preço original (se houver)
        const oldPriceEl = card.querySelector(
          'span[class*="src__RegularPrice"], [class*="regular-price"], s, del'
        );
        const oldPrice = oldPriceEl?.textContent?.trim() || null;

        // Link
        const linkEl = card.tagName.toLowerCase() === 'a'
          ? card
          : card.querySelector('a[href*="/produto/"], a');
        const url = linkEl?.getAttribute('href') || '';

        // Imagem
        const imgEl = card.querySelector('img[src*="americanas"], img[src*="b2w"], img[src]');
        const image = imgEl?.getAttribute('src') || null;

        if (title && priceText && url) {
          items.push({
            title,
            priceText,
            oldPrice,
            url,
            image
          });
        }
      }

      return items;
    });

    for (const item of rawProducts) {
      const { formatted, numeric } = parsePrice(item.priceText);
      products.push({
        title: sanitizeTitle(item.title),
        price: formatted,
        priceNumeric: numeric,
        originalPrice: item.oldPrice ? parsePrice(item.oldPrice).formatted : null,
        discount: null,
        store: STORE_NAME,
        url: normalizeUrl(item.url, BASE_URL),
        image: item.image || null
      });
    }

    console.log(`[${STORE_NAME}] ${products.length} ofertas extraídas com sucesso.`);
  } catch (err) {
    console.error(`[${STORE_NAME}] Falha ao extrair ofertas:`, err.message);
  } finally {
    await page.close().catch(() => {});
  }

  return products;
}
