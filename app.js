/**
 * Radar de Ofertas - Frontend Logic
 * Arquitetura Vanilla JavaScript desacoplada, resiliente e mobile-first.
 */

// Estado global da aplicação
const state = {
  allDeals: [],
  filteredDeals: [],
  selectedStore: 'all',
  searchQuery: '',
  sortBy: 'featured',
  lastUpdated: null,
  isLoading: true,
  hasError: false,
  errorMessage: ''
};

// Referências de elementos do DOM
const DOM = {
  skeletonContainer: document.getElementById('skeletonContainer'),
  dealsGrid: document.getElementById('dealsGrid'),
  errorState: document.getElementById('errorState'),
  emptyState: document.getElementById('emptyState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  storeTabs: document.getElementById('storeTabs'),
  sortSelect: document.getElementById('sortSelect'),
  updateBadge: document.getElementById('updateBadge'),
  updateText: document.getElementById('updateText'),
  visibleCount: document.getElementById('visibleCount'),
  counts: {
    all: document.getElementById('countAll'),
    'Mercado Livre': document.getElementById('countML'),
    'Magazine Luiza': document.getElementById('countMagalu'),
    'Americanas': document.getElementById('countAmericanas'),
    'Kabum': document.getElementById('countKabum')
  }
};

/**
 * Escapa strings HTML para prevenção de ataques XSS.
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Transição entre os 4 estados visuais de interface.
 * @param {'loading'|'data'|'error'|'empty'} viewState 
 */
function setViewState(viewState) {
  DOM.skeletonContainer.style.display = viewState === 'loading' ? 'grid' : 'none';
  DOM.dealsGrid.style.display = viewState === 'data' ? 'grid' : 'none';
  DOM.errorState.style.display = viewState === 'error' ? 'flex' : 'none';
  DOM.emptyState.style.display = viewState === 'empty' ? 'flex' : 'none';
}

/**
 * Atualiza os contadores das abas de lojas.
 */
function updateStoreCounts() {
  const counts = {
    all: state.allDeals.length,
    'Mercado Livre': 0,
    'Magazine Luiza': 0,
    'Americanas': 0,
    'Kabum': 0
  };

  state.allDeals.forEach(deal => {
    if (counts[deal.store] !== undefined) {
      counts[deal.store]++;
    }
  });

  if (DOM.counts.all) DOM.counts.all.textContent = counts.all;
  if (DOM.counts['Mercado Livre']) DOM.counts['Mercado Livre'].textContent = counts['Mercado Livre'];
  if (DOM.counts['Magazine Luiza']) DOM.counts['Magazine Luiza'].textContent = counts['Magazine Luiza'];
  if (DOM.counts['Americanas']) DOM.counts['Americanas'].textContent = counts['Americanas'];
  if (DOM.counts['Kabum']) DOM.counts['Kabum'].textContent = counts['Kabum'];
}

/**
 * Aplica filtros de loja, termo de pesquisa e critérios de ordenação.
 */
function applyFiltersAndSort() {
  let result = [...state.allDeals];

  // 1. Filtro por Loja
  if (state.selectedStore !== 'all') {
    result = result.filter(deal => deal.store === state.selectedStore);
  }

  // 2. Filtro por Busca de Texto
  if (state.searchQuery.trim() !== '') {
    const query = state.searchQuery.toLowerCase().trim();
    result = result.filter(deal =>
      deal.title.toLowerCase().includes(query) ||
      deal.store.toLowerCase().includes(query)
    );
  }

  // 3. Ordenação
  switch (state.sortBy) {
    case 'price-asc':
      result.sort((a, b) => (a.priceNumeric || 0) - (b.priceNumeric || 0));
      break;
    case 'price-desc':
      result.sort((a, b) => (b.priceNumeric || 0) - (a.priceNumeric || 0));
      break;
    case 'name-asc':
      result.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      break;
    default:
      // Mantém a ordem padrão consolidada pelo scraper
      break;
  }

  state.filteredDeals = result;
  DOM.visibleCount.textContent = result.length;

  if (result.length === 0) {
    setViewState('empty');
  } else {
    renderDeals(result);
    setViewState('data');
  }
}

/**
 * Sanitiza URLs garantindo protocolo HTTP/HTTPS e evitando double encoding.
 * @param {string} url 
 * @returns {string}
 */
function sanitizeUrl(url) {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
  } catch {
    return '#';
  }
}

/**
 * Renderiza os cards de produtos no DOM.
 * @param {Array} deals 
 */
function renderDeals(deals) {
  DOM.dealsGrid.innerHTML = '';

  const fragment = document.createDocumentFragment();

  deals.forEach(deal => {
    const card = document.createElement('article');
    card.className = 'deal-card';

    const safeTitle = escapeHtml(deal.title);
    const safeStore = escapeHtml(deal.store);
    const safePrice = escapeHtml(deal.price);
    const safeOldPrice = deal.originalPrice ? escapeHtml(deal.originalPrice) : null;
    const safeDiscount = deal.discount ? escapeHtml(deal.discount) : null;
    const safeUrl = sanitizeUrl(deal.url);
    const safeImage = deal.image ? sanitizeUrl(deal.image) : null;

    const discountBadgeHtml = safeDiscount
      ? `<span class="discount-badge">${safeDiscount}</span>`
      : '';

    const imageHtml = safeImage
      ? `<img src="${safeImage}" alt="${safeTitle}" class="card-image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'image-fallback\\'>🛍️</div>'">`
      : `<div class="image-fallback">🛍️</div>`;

    const oldPriceHtml = safeOldPrice
      ? `<div class="original-price">${safeOldPrice}</div>`
      : '<div class="original-price">&nbsp;</div>';

    card.innerHTML = `
      <div class="card-image-wrapper">
        <span class="store-badge" data-store="${safeStore}">${safeStore}</span>
        ${discountBadgeHtml}
        ${imageHtml}
      </div>
      <div class="card-content">
        <h2 class="product-title" title="${safeTitle}">${safeTitle}</h2>
        <div class="price-container">
          ${oldPriceHtml}
          <div class="current-price">${safePrice}</div>
        </div>
        <a 
          href="${safeUrl}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="btn-view-store" 
          aria-label="Ver ${safeTitle} na loja ${safeStore}"
        >
          <span>Ver na Loja</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    `;

    fragment.appendChild(card);
  });

  DOM.dealsGrid.appendChild(fragment);
}

/**
 * Consome o arquivo ofertas.json de forma resiliente.
 */
async function fetchDeals() {
  setViewState('loading');
  state.isLoading = true;
  state.hasError = false;

  try {
    // Adiciona cache-buster para garantir dados frescos no GitHub Pages
    const response = await fetch(`./ofertas.json?t=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`Arquivo de ofertas não encontrado (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.deals)) {
      throw new Error('O formato dos dados em ofertas.json é inválido.');
    }

    state.allDeals = data.deals;
    state.lastUpdated = data.updatedAtFormatted || data.updatedAt || 'Recentemente';

    // Atualiza cabeçalho com a data de extração
    DOM.updateText.textContent = `Atualizado: ${state.lastUpdated}`;

    updateStoreCounts();
    applyFiltersAndSort();
  } catch (err) {
    console.error('[Radar de Ofertas] Erro ao carregar ofertas:', err);
    state.hasError = true;
    state.errorMessage = err.message || 'Falha na conexão com o servidor de ofertas.';
    DOM.errorMessage.textContent = `${state.errorMessage} - Caso o scraper ainda não tenha sido executado, rode 'npm run scrape' ou acione o GitHub Actions.`;
    setViewState('error');
  } finally {
    state.isLoading = false;
  }
}

/**
 * Configura os ouvintes de eventos da interface.
 */
function setupEventListeners() {
  // 1. Abas de Lojas
  DOM.storeTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    DOM.storeTabs.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });

    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');

    state.selectedStore = btn.dataset.store;
    applyFiltersAndSort();
  });

  // 2. Busca com debounce e botão de limpar
  let debounceTimeout;
  DOM.searchInput.addEventListener('input', (e) => {
    const value = e.target.value;
    state.searchQuery = value;
    DOM.clearSearchBtn.style.display = value ? 'flex' : 'none';

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      applyFiltersAndSort();
    }, 200);
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.style.display = 'none';
    DOM.searchInput.focus();
    applyFiltersAndSort();
  });

  // 3. Dropdown de Ordenação
  DOM.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applyFiltersAndSort();
  });

  // 4. Botão de Tentar Novamente (Estado de Erro)
  DOM.retryBtn.addEventListener('click', () => {
    fetchDeals();
  });

  // 5. Botão de Resetar Filtros (Estado Vazio)
  DOM.resetFiltersBtn.addEventListener('click', () => {
    state.searchQuery = '';
    state.selectedStore = 'all';
    state.sortBy = 'featured';

    DOM.searchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';
    DOM.sortSelect.value = 'featured';

    DOM.storeTabs.querySelectorAll('.tab-btn').forEach(btn => {
      const isAll = btn.dataset.store === 'all';
      btn.classList.toggle('active', isAll);
      btn.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    });

    applyFiltersAndSort();
  });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchDeals();
});
