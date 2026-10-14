import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initBrowser } from './utils/browser.js';
import { scrapeMercadoLivre } from './scrapers/mercadolivre.js';
import { scrapeMagalu } from './scrapers/magalu.js';
import { scrapeAmericanas } from './scrapers/americanas.js';
import { scrapeKabum } from './scrapers/kabum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'ofertas.json');

/**
 * Orquestrador principal de raspagem e consolidação de ofertas.
 */
async function main() {
  console.log('====================================================');
  console.log('🚀 Iniciando Monitor de Ofertas Diárias (E-commerce BR)');
  console.log('====================================================');

  const startTime = Date.now();
  let browser = null;
  const allDeals = [];
  const storeStats = {};

  const scrapers = [
    { name: 'Mercado Livre', fn: scrapeMercadoLivre },
    { name: 'Magazine Luiza', fn: scrapeMagalu },
    { name: 'Americanas', fn: scrapeAmericanas },
    { name: 'Kabum', fn: scrapeKabum }
  ];

  try {
    browser = await initBrowser();

    for (const { name, fn } of scrapers) {
      console.log(`\n🔍 Processando loja: ${name}...`);
      try {
        const items = await fn(browser);
        allDeals.push(...items);
        storeStats[name] = items.length;
        console.log(`✅ [${name}] Sucesso: ${items.length} itens capturados.`);
      } catch (storeError) {
        // Garante isolamento: falha em uma loja não interrompe as demais
        storeStats[name] = 0;
        console.error(`❌ [${name}] Falha na execução da loja:`, storeError.message);
      }
    }
  } catch (globalError) {
    console.error('💥 Erro crítico no processo global de scraping:', globalError.message);
  } finally {
    if (browser) {
      console.log('\n🔒 Encerrando instância do navegador...');
      await browser.close().catch(() => {});
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const now = new Date();

  const payload = {
    updatedAt: now.toISOString(),
    updatedAtFormatted: new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'America/Sao_Paulo'
    }).format(now),
    totalDeals: allDeals.length,
    stores: storeStats,
    deals: allDeals
  };

  try {
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    console.log('\n====================================================');
    console.log(`💾 Arquivo '${OUTPUT_FILE}' gerado com sucesso!`);
    console.log(`📊 Total de ofertas consolidadas: ${allDeals.length}`);
    console.log(`⏱️ Tempo total de execução: ${durationSec}s`);
    console.log('====================================================');
  } catch (fsError) {
    console.error('❌ Erro ao salvar arquivo ofertas.json:', fsError.message);
    process.exitCode = 1;
  }
}

main();
