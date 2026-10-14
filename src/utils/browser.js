import puppeteer from 'puppeteer';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
];

/**
 * Inicializa a instância do browser com flags de bypass anti-bot modernas.
 */
export async function initBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-infobars',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--lang=pt-BR,pt'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  return browser;
}

/**
 * Cria uma nova aba configurada com headers e User-Agent realistas.
 * @param {import('puppeteer').Browser} browser 
 */
export async function createStealthPage(browser) {
  const page = await browser.newPage();

  const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(randomUA);
  await page.setViewport({ width: 1366, height: 768 });

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Ch-Ua': '"Chromium";v="129", "Not=A?Brand";v="8", "Google Chrome";v="129"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1'
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
  try {
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
  } catch {
    // Ignora se o contexto for alterado durante o scroll
  }
}
