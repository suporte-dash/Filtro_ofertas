import { createStealthPage, randomDelay, autoScroll } from '../utils/browser.js';
import { parsePrice, sanitizeTitle, normalizeUrl } from '../utils/formatters.js';

const STORE_NAME = 'Kabum';
const BASE_URL = 'https://www.kabum.com.br';
const DEALS_URL = 'https://www.kabum.com.br/ofertas';

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

    await randomDelay(1500, 2500);
    await autoScroll(page);

    // Aguarda carregar elementos de produtos da Kabum
    const cardSelectors = [
      'article.productCard',
      'div.productCard',
      'div[class*="productCard"]',
      'a[class*="productLink"]',
      'main div[class*="sc-"]'
    ];
    await Promise.race([
      ...cardSelectors.map(sel => page.waitForSelector(sel, { timeout: 12000 }).catch(() => null))
    ]);

    const rawProducts = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll(
        'article.productCard, div.productCard, div[class*="productCard"], a[class*="productLink"]'
      );

      for (let i = 0; i < cards.length && items.length < 10; i++) {
        const card = cards[i];

        // Título
        const titleEl = card.querySelector(
          'span[class*="nameCard"], h2[class*="nameCard"], [class*="nameCard"], [class*="title"], h2, h3'
        );
        const title = titleEl?.textContent?.trim() || '';

        // Preço à vista/promocional
        const priceEl = card.querySelector(
          'span[class*="priceCard"], [class*="priceCard"], [class*="price"], [class*="Price"]'
        );
        const priceText = priceEl?.textContent?.trim() || '';

        // Preço original (se houver)
        const oldPriceEl = card.querySelector(
          'span[class*="oldPriceCard"], [class*="oldPrice"], s, del'
        );
        const oldPrice = oldPriceEl?.textContent?.trim() || null;

        // Desconto (se houver)
        const discountEl = card.querySelector(
          'div[class*="discount"], span[class*="discount"], [class*="discountBadge"]'
        );
        const discount = discountEl?.textContent?.trim() || null;

        // Link
        const linkEl = card.tagName.toLowerCase() === 'a'
          ? card
          : card.querySelector('a[class*="productLink"], a[href*="/produto/"], a');
        const url = linkEl?.getAttribute('href') || '';

        // Imagem
        const imgEl = card.querySelector('img[class*="imageCard"], img[src*="kabum"], img[src]');
        const image = imgEl?.getAttribute('src') || null;

        if (title && priceText && url) {
          items.push({
            title,
            priceText,
            oldPrice,
            discount,
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
        discount: item.discount ? item.discount.replace(/\s+/g, ' ') : null,
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
