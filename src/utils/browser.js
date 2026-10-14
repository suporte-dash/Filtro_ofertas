import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Ativa o plugin de stealth para bypass anti-bot
puppeteer.use(StealthPlugin());

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'
];

/**
 * Inicializa a instância do browser headless otimizada para automação e bypass anti-bot.
 */
export async function initBrowser() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  return browser;
}

/**
 * Cria uma nova aba de navegação com headers e user-agent dinâmicos.
 * @param {import('puppeteer').Browser} browser 
 */
export async function createStealthPage(browser) {
  const page = await browser.newPage();

  // Seleção aleatória de User-Agent
  const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(randomUA);

  // Viewport realista Desktop
  await page.setViewport({ width: 1366, height: 768 });

  // Headers realistas em português
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Ch-Ua': '"Chromium";v="129", "Not=A?Brand";v="8", "Google Chrome";v="129"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
  });

  // Otimização de requisições: bloqueia recursos dispensáveis para acelerar scraping
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['font', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

/**
 * Aguarda um intervalo aleatório para simular comportamento humano.
 * @param {number} minMs 
 * @param {number} maxMs 
 */
export async function randomDelay(minMs = 1000, maxMs = 2500) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Realiza uma rolagem suave da página para acionar lazy-loading de elementos e imagens.
 * @param {import('puppeteer').Page} page 
 */
export async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= 2000 || totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
}
