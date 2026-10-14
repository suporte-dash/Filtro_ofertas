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
 * Carrega a base atual de ofertas para garantir resiliência e preservação de cache.
 */
async function loadExistingDeals() {
  try {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.deals) && parsed.deals.length > 0) {
      return parsed;
    }
  } catch {
    // Se o arquivo não existir ou estiver corrompido, inicia vazio
  }
  return null;
}

/**
 * Orquestrador principal de raspagem e consolidação resiliente de ofertas.
 */
async function main() {
  console.log('====================================================');
  console.log('🚀 Iniciando Monitor de Ofertas Diárias (E-commerce BR)');
  console.log('====================================================');

  const startTime = Date.now();
  const existingPayload = await loadExistingDeals();
  const previousDeals = existingPayload ? existingPayload.deals : [];

  // Mapeia ofertas prévias por loja para mesclagem segura
  const storeMap = {
    'Mercado Livre': previousDeals.filter(d => d.store === 'Mercado Livre'),
    'Magazine Luiza': previousDeals.filter(d => d.store === 'Magazine Luiza'),
    'Americanas': previousDeals.filter(d => d.store === 'Americanas'),
    'Kabum': previousDeals.filter(d => d.store === 'Kabum')
  };

  const storeStats = {};
  let newlyScrapedCount = 0;
  let browser = null;

  const scrapers = [
    { name: 'Kabum', fn: scrapeKabum },
    { name: 'Mercado Livre', fn: scrapeMercadoLivre },
    { name: 'Magazine Luiza', fn: scrapeMagalu },
    { name: 'Americanas', fn: scrapeAmericanas }
  ];

  try {
    browser = await initBrowser();

    for (const { name, fn } of scrapers) {
      console.log(`\n🔍 Processando loja: ${name}...`);
      try {
        const items = await fn(browser);
        if (items && items.length > 0) {
          storeMap[name] = items;
          storeStats[name] = items.length;
          newlyScrapedCount += items.length;
          console.log(`✅ [${name}] Sucesso: ${items.length} ofertas atualizadas.`);
        } else {
          // Mantém as ofertas prévias daquela loja
          storeStats[name] = storeMap[name].length;
          console.warn(`⚠️ [${name}] 0 ofertas extraídas. Preservando ${storeMap[name].length} ofertas em cache.`);
        }
      } catch (storeError) {
        // Isolamento de falhas: preserva cache
        storeStats[name] = storeMap[name].length;
        console.error(`❌ [${name}] Falha na execução da loja:`, storeError.message);
        console.warn(`⚠️ [${name}] Preservando ${storeMap[name].length} ofertas prévias em cache.`);
      }
    }
  } catch (globalError) {
    console.error('💥 Erro crítico no processo de browser:', globalError.message);
  } finally {
    if (browser) {
      console.log('\n🔒 Encerrando instância do navegador...');
      await browser.close().catch(() => {});
    }
  }

  // Consolida todas as lojas
  const consolidatedDeals = [
    ...(storeMap['Mercado Livre'] || []),
    ...(storeMap['Magazine Luiza'] || []),
    ...(storeMap['Americanas'] || []),
    ...(storeMap['Kabum'] || [])
  ];

  // Regra de Ouro: Se a raspagem falhou completamente e não temos novos itens nem cache, não sobrescreve
  if (consolidatedDeals.length === 0) {
    console.warn('⚠️ Nenhuma oferta disponível para salvar. Arquivo existente mantido intacto.');
    return;
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
    totalDeals: consolidatedDeals.length,
    stores: storeStats,
    deals: consolidatedDeals
  };

  try {
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    console.log('\n====================================================');
    console.log(`💾 Arquivo '${OUTPUT_FILE}' atualizado com sucesso!`);
    console.log(`📊 Total de ofertas disponíveis: ${consolidatedDeals.length} (${newlyScrapedCount} novas extrações)`);
    console.log(`⏱️ Tempo total de execução: ${durationSec}s`);
    console.log('====================================================');
  } catch (fsError) {
    console.error('❌ Erro ao salvar arquivo ofertas.json:', fsError.message);
    process.exitCode = 1;
  }
}

main();
