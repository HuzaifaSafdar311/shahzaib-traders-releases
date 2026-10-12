// ========================================================
// FIND PRODUCT (F1) - WINDOW LOGIC
// ========================================================

let allProducts = [];
let filteredProducts = [];
let selectedIndex = 0;

// DOM Elements
const f1SearchInput = document.getElementById('f1SearchInput');
const f1CategoryFilter = document.getElementById('f1CategoryFilter');
const f1GroupFilter = document.getElementById('f1GroupFilter');
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

    // 2. Load Groups for filter dropdown
    if (window.electronAPI?.getProductGroups) {
      const grps = await window.electronAPI.getProductGroups();
      populateDropdown(f1GroupFilter, grps, 'All Groups / Brands');
    }

    // 3. Load all Products
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
    opt.value = item.name;
    opt.textContent = item.name;
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
  const selectedCat = f1CategoryFilter?.value || '';
  const selectedGrp = f1GroupFilter?.value || '';

  // Toggle clear button
  if (btnClearSearch) {
    if (query.length > 0) btnClearSearch.classList.remove('hidden');
    else btnClearSearch.classList.add('hidden');
  }

  filteredProducts = (allProducts || []).filter(p => {
    const matchesCat = !selectedCat || (p.categoryName || '') === selectedCat;
    const matchesGrp = !selectedGrp || (p.groupName || '') === selectedGrp;
    if (!matchesCat || !matchesGrp) return false;

    if (!query) return true;

    return (
      String(p.code || '').toLowerCase().includes(query) ||
      (p.titleEng || '').toLowerCase().includes(query) ||
      (p.categoryName || '').toLowerCase().includes(query) ||
      (p.groupName || '').toLowerCase().includes(query) ||
      (p.location || '').toLowerCase().includes(query) ||
      String(p.barcode || '').toLowerCase().includes(query)
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
    tr.dataset.index = idx;
    if (idx === selectedIndex) {
      tr.classList.add('selected-row');
    }

    tr.innerHTML = `
      <td class="col-f1-code" style="width: 8%; text-align: left; padding-left: 20px;">
        <span class="code-pill">${escapeHtml(p.code)}</span>
      </td>
      <td class="col-f1-title font-bold" style="width: 27%; text-align: left; padding-left: 14px;" title="${escapeHtml(p.titleEng)}">
        ${escapeHtml(p.titleEng)}
      </td>
      <td class="col-f1-category" style="width: 13%; text-align: center;">
        <span class="badge-tag">${escapeHtml(p.categoryName || '-')}</span>
      </td>
      <td class="col-f1-group text-secondary" style="width: 13%; text-align: center;">
        ${escapeHtml(p.groupName || '-')}
      </td>
      <td class="col-f1-pack font-num" style="width: 6%; text-align: center;">
        ${p.packSize || 1}
      </td>
      <td class="col-f1-purchase font-num" style="width: 9%; text-align: center;">
        ${Number(p.purchasePrice || 0).toFixed(2)}
      </td>
      <td class="col-f1-retail font-num font-bold text-warning" style="width: 9%; text-align: center;">
        ${Number(p.retailPrice || 0).toFixed(2)}
      </td>
      <td class="col-f1-wholesale font-num font-bold" style="width: 8%; text-align: center;">
        ${Number(p.wholesalePrice || 0).toFixed(2)}
      </td>
      <td class="col-f1-stock font-num font-bold text-accent" style="width: 7%; text-align: center;">
        ${p.stockQty || 0}
      </td>
    `;

    // Row click: highlight
    tr.addEventListener('click', () => {
      setSelectedIndex(idx);
    });

    // Double-click: select into main app
    tr.addEventListener('dblclick', () => {
      selectProduct(p);
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

function selectProduct(product) {
  if (!product) return;
  if (window.findProductAPI?.selectProduct) {
    window.findProductAPI.selectProduct(product);
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

if (f1GroupFilter) {
  f1GroupFilter.addEventListener('change', () => {
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
    if (f1GroupFilter) f1GroupFilter.value = '';
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
      selectProduct(filteredProducts[selectedIndex]);
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
