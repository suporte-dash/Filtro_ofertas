import { createStealthPage, randomDelay, autoScroll } from '../utils/browser.js';
import { parsePrice, sanitizeTitle, normalizeUrl } from '../utils/formatters.js';

const STORE_NAME = 'Mercado Livre';
const BASE_URL = 'https://www.mercadolivre.com.br';
const DEALS_URL = 'https://www.mercadolivre.com.br/ofertas';

/**
 * Extrai as 10 principais ofertas do dia do Mercado Livre.
 * @param {import('puppeteer').Browser} browser
 * @returns {Promise<Array<{ title: string, price: string, priceNumeric: number, originalPrice: string|null, discount: string|null, store: string, url: string, image: string|null }>>}
 */
export async function scrapeMercadoLivre(browser) {
  const page = await createStealthPage(browser);
  const products = [];

  try {
    console.log(`[${STORE_NAME}] Acessando ${DEALS_URL}...`);
    await page.goto(DEALS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await randomDelay(1200, 2000);
    await autoScroll(page);

    // Aguarda carregar algum card de produto
    const cardSelectors = ['.promotion-item', '.poly-card', '.ui-search-layout__item', 'div[class*="promotion-item"]'];
    await Promise.race([
      ...cardSelectors.map(sel => page.waitForSelector(sel, { timeout: 12000 }).catch(() => null))
    ]);

    const rawProducts = await page.evaluate(() => {
      const items = [];
      // Tenta múltiplos seletores de cards
      const cards = document.querySelectorAll(
        '.promotion-item, .poly-card, .ui-search-layout__item, div[class*="promotion-item"], li[class*="promotion-item"]'
      );

      for (let i = 0; i < cards.length && items.length < 10; i++) {
        const card = cards[i];

        // Título
        const titleEl = card.querySelector(
          '.promotion-item__title, .poly-component__title, a.poly-component__title, .ui-search-item__title, h2, h3, a[title]'
        );
        const title = titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || '';

        // Preço atual
        const priceContainer = card.querySelector(
          '.promotion-item__price, .poly-price__current, .andes-money-amount--cents-superscript, .andes-money-amount'
        );
        const fraction = priceContainer?.querySelector('.andes-money-amount__fraction')?.textContent?.trim() || '';
        const cents = priceContainer?.querySelector('.andes-money-amount__cents')?.textContent?.trim() || '00';
        const priceText = fraction ? `${fraction},${cents}` : (priceContainer?.textContent?.trim() || '');

        // Preço original (se houver)
        const oldPriceEl = card.querySelector('.andes-money-amount--previous, s .andes-money-amount__fraction');
        const oldPrice = oldPriceEl?.textContent?.trim() || null;

        // Desconto (se houver)
        const discountEl = card.querySelector('.promotion-item__discount, .poly-price__discount, .andes-money-amount__discount');
        const discount = discountEl?.textContent?.trim() || null;

        // Link
        const linkEl = card.querySelector('a.promotion-item__link-container, a.poly-component__title, a[href*="produto.mercadolivre"], a[href*="/p/"], a');
        const url = linkEl?.getAttribute('href') || '';

        // Imagem
        const imgEl = card.querySelector('img.promotion-item__img, img.poly-component__picture, img[data-src], img[src]');
        const image = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || null;

        if (title && (priceText || fraction)) {
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
