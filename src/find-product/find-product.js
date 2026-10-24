// ========================================================
// FIND PRODUCT (F1) - WINDOW LOGIC
// ========================================================

let allProducts = [];
let filteredProducts = [];
let selectedIndex = 0;

// DOM Elements
const f1SearchInput = document.getElementById('f1SearchInput');
const f1CategoryFilter = document.getElementById('f1CategoryFilter');
const f1StockFilter = document.getElementById('f1StockFilter');
const btnClearSearch = document.getElementById('btnClearSearch');
const btnResetFilters = document.getElementById('btnResetFilters');
const btnCloseWindow = document.getElementById('btnCloseWindow');
const f1TableBody = document.getElementById('f1TableBody');
const fpEmptyState = document.getElementById('fpEmptyState');
const fpEmptyMsg = document.getElementById('fpEmptyMsg');
const productCountBadge = document.getElementById('productCountBadge');

// Helper: Escape HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial Data Load
async function initFindProductWindow() {
  try {
    // 1. Load Categories for filter dropdown
    if (window.electronAPI?.getProductCategories) {
      const cats = await window.electronAPI.getProductCategories();
      populateDropdown(f1CategoryFilter, cats, 'All Categories');
    }

    // 2. Load all Products
    await loadProducts();
  } catch (err) {
    console.error('Error initializing Find Product window:', err);
  }
}

function populateDropdown(selectEl, list, defaultLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${defaultLabel}</option>`;
  (list || []).forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name || item.categoryName || item.id;
    opt.textContent = item.name || item.categoryName;
    selectEl.appendChild(opt);
  });
}

async function loadProducts() {
  if (!window.electronAPI?.getProducts) return;
  try {
    allProducts = await window.electronAPI.getProducts();
    applyFilters();
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

// Filter and Render
function applyFilters() {
  const query = (f1SearchInput?.value || '').trim().toLowerCase();
  const selectedCat = (f1CategoryFilter?.value || '').trim().toLowerCase();
  const stockOnly = f1StockFilter?.value === 'instock';

  // Toggle clear button
  if (btnClearSearch) {
    if (query.length > 0) btnClearSearch.classList.remove('hidden');
    else btnClearSearch.classList.add('hidden');
  }

  filteredProducts = (allProducts || []).filter(p => {
    const stock = Number(p.stockQty || 0);
    if (stockOnly && stock <= 0) return false;

    if (selectedCat) {
      const pCat = String(p.categoryName || p.categoryId || '').trim().toLowerCase();
      if (pCat !== selectedCat) return false;
    }

    if (!query) return true;

    const code = String(p.code || '').toLowerCase();
    const barcode = String(p.barcode || '').toLowerCase();
    const titleEng = String(p.titleEng || '').toLowerCase();
    const titleUrdu = String(p.titleUrdu || '').toLowerCase();
    const catName = String(p.categoryName || '').toLowerCase();
    const loc = String(p.location || '').toLowerCase();

    return (
      code.includes(query) ||
      barcode.includes(query) ||
      titleEng.includes(query) ||
      titleUrdu.includes(query) ||
      catName.includes(query) ||
      loc.includes(query)
    );
  });

  // Reset selected index within bounds
  if (selectedIndex >= filteredProducts.length) {
    selectedIndex = Math.max(0, filteredProducts.length - 1);
  }

  renderTable();
}

function renderTable() {
  if (!f1TableBody) return;
  f1TableBody.innerHTML = '';

  if (productCountBadge) {
    productCountBadge.textContent = `${filteredProducts.length} of ${allProducts.length} Products`;
  }

  if (filteredProducts.length === 0) {
    if (fpEmptyState) fpEmptyState.classList.remove('hidden');
    if (fpEmptyMsg) {
      const q = (f1SearchInput?.value || '').trim();
      fpEmptyMsg.textContent = q ? `No products match "${q}".` : 'No products available.';
    }
    return;
  }

  if (fpEmptyState) fpEmptyState.classList.add('hidden');

  filteredProducts.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.className = `fp-table-row ${idx === selectedIndex ? 'selected-row' : ''}`;
    tr.dataset.index = idx;

    const stock = Number(p.stockQty || 0);
    const isOut = stock <= 0;
    const isLow = stock > 0 && stock <= 5;
    const stockPillClass = isOut ? 'stock-out' : (isLow ? 'stock-low' : 'stock-in');
    const stockPillText = isOut ? '0 (Out)' : stock;

    const rp = Number(p.retailPrice || 0);
    const wp = Number(p.wholesalePrice || 0);

    tr.innerHTML = `
      <td class="col-f1-code font-num font-bold" style="text-align: left; padding-left: 14px;">
        <span class="f1-code-badge">${escapeHtml(p.code || '')}</span>
      </td>
      <td class="col-f1-title" style="text-align: left; padding-left: 14px;">
        <div class="f1-prod-title">${escapeHtml(p.titleEng || 'Untitled')}</div>
        <div class="f1-prod-sub">
          ${p.packSize > 1 ? `<span class="pack-sub">Pack of ${p.packSize}</span>` : ''}
        </div>
      </td>
      <td class="col-f1-category" style="text-align: center;">
        <span class="f1-cat-tag">
          ${escapeHtml(p.categoryName || 'General')}
        </span>
      </td>
      <td class="col-f1-stock font-num" style="text-align: center;">
        <span class="pos-stock-pill ${stockPillClass}">${stockPillText}</span>
      </td>
      <td class="col-f1-retail font-num" style="text-align: center;">
        <div class="f1-price-cell f1-price-retail">
          <span class="price-val">Rs ${rp.toLocaleString()}</span>
          <span class="price-lbl">Retail</span>
        </div>
      </td>
      <td class="col-f1-wholesale font-num" style="text-align: center;">
        <div class="f1-price-cell f1-price-wholesale">
          <span class="price-val">Rs ${wp.toLocaleString()}</span>
          <span class="price-lbl">Wholesale</span>
        </div>
      </td>
      <td class="col-f1-actions" style="text-align: center;">
        <button type="button" class="btn-f1-add ${isOut ? 'disabled' : ''}" 
          ${isOut ? 'disabled' : ''}
          onclick="event.stopPropagation(); selectProduct(filteredProducts[${idx}]);" 
          title="Add to Bill">
          + Add
        </button>
      </td>
    `;

    // Row click: highlight
    tr.addEventListener('click', () => {
      setSelectedIndex(idx);
    });

    // Double-click: select into main app with retail
    tr.addEventListener('dblclick', (e) => {
      const mode = e.shiftKey ? 'wholesale' : 'retail';
      selectProduct(p, mode);
    });

    f1TableBody.appendChild(tr);
  });

  scrollSelectedIntoView();
}

function setSelectedIndex(index) {
  if (index < 0 || index >= filteredProducts.length) return;
  selectedIndex = index;

  const rows = f1TableBody.querySelectorAll('tr');
  rows.forEach((r, idx) => {
    if (idx === selectedIndex) r.classList.add('selected-row');
    else r.classList.remove('selected-row');
  });

  scrollSelectedIntoView();
}

function scrollSelectedIntoView() {
  const row = f1TableBody.querySelector(`tr[data-index="${selectedIndex}"]`);
  if (row) {
    row.scrollIntoView({ block: 'nearest' });
  }
}

function selectProduct(product, rateMode = 'retail') {
  if (!product) return;
  const productWithRate = Object.assign({}, product, { _chosenRateType: rateMode });
  if (window.findProductAPI?.selectProduct) {
    window.findProductAPI.selectProduct(productWithRate);
  }
}

// Event Listeners
if (f1SearchInput) {
  f1SearchInput.addEventListener('input', () => {
    selectedIndex = 0;
    applyFilters();
  });
}

if (f1CategoryFilter) {
  f1CategoryFilter.addEventListener('change', () => {
    selectedIndex = 0;
    applyFilters();
  });
}

if (f1StockFilter) {
  f1StockFilter.addEventListener('change', () => {
    selectedIndex = 0;
    applyFilters();
  });
}

if (btnClearSearch) {
  btnClearSearch.addEventListener('click', () => {
    if (f1SearchInput) {
      f1SearchInput.value = '';
      f1SearchInput.focus();
    }
    applyFilters();
  });
}

if (btnResetFilters) {
  btnResetFilters.addEventListener('click', () => {
    if (f1SearchInput) f1SearchInput.value = '';
    if (f1CategoryFilter) f1CategoryFilter.value = '';
    if (f1StockFilter) f1StockFilter.value = 'all';
    applyFilters();
    if (f1SearchInput) f1SearchInput.focus();
  });
}

if (btnCloseWindow) {
  btnCloseWindow.addEventListener('click', () => {
    if (window.findProductAPI?.closeWindow) {
      window.findProductAPI.closeWindow();
    }
  });
}

// Global Keyboard Navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (selectedIndex < filteredProducts.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filteredProducts[selectedIndex]) {
      const mode = e.shiftKey ? 'wholesale' : 'retail';
      selectProduct(filteredProducts[selectedIndex], mode);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (window.findProductAPI?.closeWindow) {
      window.findProductAPI.closeWindow();
    }
  } else if (e.key === 'F1') {
    e.preventDefault();
    if (f1SearchInput) {
      f1SearchInput.focus();
      f1SearchInput.select();
    }
  }
});

// Refresh listener from main process
if (window.findProductAPI?.onRefreshProducts) {
  window.findProductAPI.onRefreshProducts(() => {
    loadProducts();
    if (f1SearchInput) {
      f1SearchInput.focus();
      f1SearchInput.select();
    }
  });
}

// Start
document.addEventListener('DOMContentLoaded', initFindProductWindow);
