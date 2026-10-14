import { createStealthPage, randomDelay, autoScroll } from '../utils/browser.js';
import { parsePrice, sanitizeTitle, normalizeUrl } from '../utils/formatters.js';

const STORE_NAME = 'Magazine Luiza';
const BASE_URL = 'https://www.magazineluiza.com.br';
const DEALS_URL = 'https://www.magazineluiza.com.br/selecao/ofertasdodia/';

/**
 * Extrai as 10 principais ofertas do dia do Magazine Luiza.
 * @param {import('puppeteer').Browser} browser
 * @returns {Promise<Array<{ title: string, price: string, priceNumeric: number, originalPrice: string|null, discount: string|null, store: string, url: string, image: string|null }>>}
 */
export async function scrapeMagalu(browser) {
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

    // Aguarda carregar elementos de produto do Magalu
    const cardSelectors = [
      '[data-testid="product-card-container"]',
      'li[data-testid="list-item"]',
      'a[data-testid="product-card-container"]',
      'div[class*="productCard"]'
    ];
    await Promise.race([
      ...cardSelectors.map(sel => page.waitForSelector(sel, { timeout: 12000 }).catch(() => null))
    ]);

    const rawProducts = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll(
        '[data-testid="product-card-container"], li[data-testid="list-item"], a[data-testid="product-card-container"], div[class*="ProductCard"], [class*="product-card"]'
      );

      for (let i = 0; i < cards.length && items.length < 10; i++) {
        const card = cards[i];

        // Título
        const titleEl = card.querySelector(
          '[data-testid="product-title"], h2[data-testid="product-title"], h2, [class*="productTitle"], [class*="title"]'
        );
        const title = titleEl?.textContent?.trim() || '';

        // Preço atual
        const priceEl = card.querySelector(
          '[data-testid="price-value"], [data-testid="current-price"], p[data-testid="price-value"], [class*="price-value"], [class*="price"]'
        );
        const priceText = priceEl?.textContent?.trim() || '';

        // Preço original (se houver)
        const oldPriceEl = card.querySelector(
          '[data-testid="original-price"], [class*="oldPrice"], s, del'
        );
        const oldPrice = oldPriceEl?.textContent?.trim() || null;

        // Link
        const linkEl = card.tagName.toLowerCase() === 'a'
          ? card
          : card.querySelector('a[data-testid="product-card-container"], a[href*="/p/"], a');
        const url = linkEl?.getAttribute('href') || '';

        // Imagem
        const imgEl = card.querySelector(
          'img[data-testid="image"], img[src*="magazineluiza"], img[data-src], img[src]'
        );
        const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || null;

        if (title && priceText) {
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
