// Shahzaib Traders - Inventory & Vendors Management System
// Clean Renderer Implementation

// Application State
let appData = {
  vendors: [],
  inventory: []
};

let currentTab = 'inventory'; // 'inventory' | 'vendors'
let pendingDeleteAction = null;
let returnToStockModalAfterVendor = false;

// Pagination & Filter State
let inventoryPage = 1;
let vendorPage = 1;

function getAdaptivePageSize(tabType = 'inventory') {
  let selector = '#inventoryView .table-container';
  if (tabType === 'vendors') selector = '#vendorView .table-container';

  let container = document.querySelector(selector);
  if (!container || container.clientHeight <= 0) {
    container = document.querySelector('.view-section.active .table-container') || document.querySelector('.table-container');
  }

  if (container && container.clientHeight > 140) {
    const thead = container.querySelector('thead');
    const headerHeight = thead && thead.offsetHeight > 0 ? thead.offsetHeight : 42;
    const availableHeight = container.clientHeight - headerHeight;
    // Each table row tr has ~43-44px height (padding: 11px 12px; font-size: 13px)
    const rowsThatFit = Math.floor(availableHeight / 43);
    return Math.max(rowsThatFit, 10);
  }

  // Fallback calculation based on window innerHeight
  if (window.innerHeight > 0) {
    const estimatedHeight = window.innerHeight - 250;
    const estimatedRows = Math.floor(estimatedHeight / 43);
    return Math.max(estimatedRows, 10);
  }

  return 12;
}

const getInventoryPageSize = () => getAdaptivePageSize('inventory');
const getVendorPageSize = () => getAdaptivePageSize('vendors');

// IPC Storage Bridge (SQLite Backend via window.electronAPI with fallback)
const api = window.electronAPI || {
  getData: async () => {
    const raw = localStorage.getItem('inventory_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      vendors: [],
      inventory: []
    };
  },
  saveData: async (data) => {
    localStorage.setItem('inventory_data', JSON.stringify(data));
    return { success: true };
  },
  addStock: async (item) => ({ success: true }),
  updateStock: async (item) => ({ success: true }),
  deleteStock: async (id) => ({ success: true }),
  addVendor: async (vendor) => ({ success: true }),
  updateVendor: async (vendor) => ({ success: true }),
  deleteVendor: async (id) => ({ success: true }),
  exportPDF: async (data) => ({ success: true }),
  exportExcel: async (data) => ({ success: true }),
  exportCSV: async (data) => ({ success: true })
};

// DOM Elements
const el = {
  navInventoryBtn: document.getElementById('navInventoryBtn'),
  navVendorBtn: document.getElementById('navVendorBtn'),

  inventoryView: document.getElementById('inventoryView'),
  vendorView: document.getElementById('vendorView'),

  badgeInventoryCount: document.getElementById('badgeInventoryCount'),
  badgeVendorCount: document.getElementById('badgeVendorCount'),

  // Inventory Elements
  inventoryTableBody: document.getElementById('inventoryTableBody'),
  inventoryEmptyState: document.getElementById('inventoryEmptyState'),
  inventorySearchBy: document.getElementById('inventorySearchBy'),
  inventorySearchInput: document.getElementById('inventorySearchInput'),
  btnClearInventorySearch: document.getElementById('btnClearInventorySearch'),
  filterStockLevelInput: document.getElementById('filterStockLevelInput'),
  btnResetInventoryFilters: document.getElementById('btnResetInventoryFilters'),
  btnOpenAddStock: document.getElementById('btnOpenAddStock'),

  // Radial Export Widget Elements
  radialExportWidget: document.getElementById('radialExportWidget'),
  btnExportToggle: document.getElementById('btnExportToggle'),
  radialNodesPanel: document.getElementById('radialNodesPanel'),
  radialBackdrop: document.getElementById('radialBackdrop'),
  btnExportPDF: document.getElementById('btnExportPDF'),
  btnExportExcel: document.getElementById('btnExportExcel'),
  btnExportCSV: document.getElementById('btnExportCSV'),

  // Inventory Pagination
  inventoryPaginationInfo: document.getElementById('inventoryPaginationInfo'),
  btnInvPrevPage: document.getElementById('btnInvPrevPage'),
  btnInvNextPage: document.getElementById('btnInvNextPage'),
  invPageNumbers: document.getElementById('invPageNumbers'),

  // Vendor Elements
  vendorTableBody: document.getElementById('vendorTableBody'),
  vendorEmptyState: document.getElementById('vendorEmptyState'),
  vendorSearchBy: document.getElementById('vendorSearchBy'),
  vendorSearchInput: document.getElementById('vendorSearchInput'),
  btnClearVendorSearch: document.getElementById('btnClearVendorSearch'),
  btnOpenAddVendor: document.getElementById('btnOpenAddVendor'),

  // Vendor Pagination
  vendorPaginationInfo: document.getElementById('vendorPaginationInfo'),
  btnVendorPrevPage: document.getElementById('btnVendorPrevPage'),
  btnVendorNextPage: document.getElementById('btnVendorNextPage'),
  vendorPageNumbers: document.getElementById('vendorPageNumbers'),

  // Stock Modal
  modalStock: document.getElementById('modalStock'),
  modalStockTitle: document.getElementById('modalStockTitle'),
  btnCloseStockModal: document.getElementById('btnCloseStockModal'),
  btnCancelStock: document.getElementById('btnCancelStock'),
  stockForm: document.getElementById('stockForm'),
  stockId: document.getElementById('stockId'),
  stockNameInput: document.getElementById('stockNameInput'),
  stockVendorSelect: document.getElementById('stockVendorSelect'),
  stockQtyInput: document.getElementById('stockQtyInput'),
  stockSellInput: document.getElementById('stockSellInput'),
  stockWholesalePrice: document.getElementById('stockWholesalePrice'),
  stockIndividualPrice: document.getElementById('stockIndividualPrice'),
  stockDateInput: document.getElementById('stockDateInput'),
  summaryTotalWholesale: document.getElementById('summaryTotalWholesale'),
  summaryTotalIndividual: document.getElementById('summaryTotalIndividual'),
  btnQuickAddVendor: document.getElementById('btnQuickAddVendor'),

  // Vendor Modal
  modalVendor: document.getElementById('modalVendor'),
  modalVendorTitle: document.getElementById('modalVendorTitle'),
  btnCloseVendorModal: document.getElementById('btnCloseVendorModal'),
  btnCancelVendor: document.getElementById('btnCancelVendor'),
  vendorForm: document.getElementById('vendorForm'),
  vendorId: document.getElementById('vendorId'),
  vendorNameInput: document.getElementById('vendorNameInput'),
  vendorPhoneInput: document.getElementById('vendorPhoneInput'),

  // Confirm Delete Modal
  modalConfirm: document.getElementById('modalConfirm'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  btnCloseConfirmModal: document.getElementById('btnCloseConfirmModal'),
  btnCancelConfirm: document.getElementById('btnCancelConfirm'),
  btnExecuteConfirm: document.getElementById('btnExecuteConfirm'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// Utilities
function showToast(message, type = 'info') {
  if (!el.toastContainer) return;
  const toast = document.createElement('div');
  const typeClass = type === 'error' ? 'toast-error' : (type === 'warning' ? 'toast-warning' : '');
  toast.className = `toast ${typeClass}`.trim();
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function reloadFromDatabase() {
  try {
    const data = await api.getData();
    if (data && (Array.isArray(data.vendors) || Array.isArray(data.inventory))) {
      appData = {
        vendors: Array.isArray(data.vendors) ? data.vendors : [],
        inventory: Array.isArray(data.inventory) ? data.inventory : []
      };
      try {
        localStorage.setItem('inventory_db_backup', JSON.stringify(appData));
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error reloading database data:', err);
    try {
      const raw = localStorage.getItem('inventory_db_backup');
      if (raw) {
        const parsed = JSON.parse(raw);
        appData = {
          vendors: Array.isArray(parsed.vendors) ? parsed.vendors : [],
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : []
        };
      }
    } catch (e) {}
  }
  updateBadges();
  refreshVendorDropdowns();
}

function updateBadges() {
  if (el.badgeInventoryCount) el.badgeInventoryCount.textContent = (appData.inventory || []).length;
  if (el.badgeVendorCount) el.badgeVendorCount.textContent = (appData.vendors || []).length;
}

// 3-Dots Action Menu Helpers
window.toggleRowMenu = function(e, menuId) {
  e.stopPropagation();
  const targetMenu = document.getElementById(menuId);
  const isCurrentlyOpen = targetMenu && !targetMenu.classList.contains('hidden');

  closeAllActionMenus();

  if (targetMenu && !isCurrentlyOpen) {
    targetMenu.classList.remove('hidden');
    const btn = targetMenu.previousElementSibling;
    if (btn) btn.classList.add('active');
  }
};

function closeAllActionMenus() {
  document.querySelectorAll('.action-menu').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.btn-dots').forEach(b => b.classList.remove('active'));
}

document.addEventListener('click', closeAllActionMenus);

// Tab Switching
function switchTab(tab) {
  currentTab = tab;
  closeAllActionMenus();

  if (el.navInventoryBtn) el.navInventoryBtn.classList.toggle('active', tab === 'inventory');
  if (el.navVendorBtn) el.navVendorBtn.classList.toggle('active', tab === 'vendors');

  if (el.inventoryView) el.inventoryView.classList.toggle('active', tab === 'inventory');
  if (el.vendorView) el.vendorView.classList.toggle('active', tab === 'vendors');

  if (tab === 'inventory') {
    renderInventory();
  } else if (tab === 'vendors') {
    renderVendors();
  }
}

// ============================================
// INVENTORY TAB LOGIC
// ============================================
function getFilteredInventory() {
  let list = [...appData.inventory];
  const query = (el.inventorySearchInput ? el.inventorySearchInput.value : '').trim().toLowerCase();
  const searchBy = el.inventorySearchBy ? el.inventorySearchBy.value : 'all';
  const userTargetStock = (el.filterStockLevelInput && el.filterStockLevelInput.value.trim() !== '') ? Number(el.filterStockLevelInput.value) : null;

  if (query) {
    list = list.filter(item => {
      if (searchBy === 'stockName') return (item.stockName || '').toLowerCase().includes(query);
      if (searchBy === 'vendorName') return (item.vendorName || '').toLowerCase().includes(query);
      return (item.stockName || '').toLowerCase().includes(query) || (item.vendorName || '').toLowerCase().includes(query);
    });
  }

  // Stock Proximity Ranking / Sorting: Items closest to the entered quantity appear first
  if (userTargetStock !== null && !isNaN(userTargetStock)) {
    list.sort((a, b) => {
      const diffA = Math.abs(Number(a.quantity || 0) - userTargetStock);
      const diffB = Math.abs(Number(b.quantity || 0) - userTargetStock);
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      return (b.date || '').localeCompare(a.date || '');
    });
  } else {
    // Default: Sort by newest date, then createdAt
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  return list;
}

function renderInventory() {
  const filtered = getFilteredInventory();
  const total = filtered.length;
  const pageSize = getAdaptivePageSize('inventory');
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (inventoryPage > totalPages) inventoryPage = totalPages;
  if (inventoryPage < 1) inventoryPage = 1;

  const start = (inventoryPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  el.inventoryTableBody.innerHTML = '';

  if (pageItems.length === 0) {
    el.inventoryEmptyState.classList.remove('hidden');
    el.inventoryPaginationInfo.textContent = 'Showing 0 of 0 items';
  } else {
    el.inventoryEmptyState.classList.add('hidden');
    const end = Math.min(start + pageSize, total);
    el.inventoryPaginationInfo.textContent = `Showing ${start + 1}-${end} of ${total} items`;

    pageItems.forEach((item, index) => {
      const menuId = `menu-inv-${item.id}`;
      const qty = Number(item.quantity) || 0;
      const sell = Number(item.totalSell) || 0;
      const wholesale = Number(item.wholesalePrice || 0).toFixed(2);
      const individual = Number(item.individualPrice || 0).toFixed(2);

      const qtyClass = qty <= 5 ? 'badge-danger' : (qty <= 15 ? 'badge-warning' : 'badge-normal');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-stock-name">
          <span class="stock-title">${escapeHtml(item.stockName)}</span>
        </td>
        <td class="col-vendor">
          <span class="vendor-tag">${escapeHtml(item.vendorName || 'Unassigned')}</span>
        </td>
        <td class="col-stock-qty">
          <span class="qty-pill ${qtyClass}">${qty}</span>
        </td>
        <td class="col-sell-qty">
          <span class="qty-sell-pill">${sell}</span>
        </td>
        <td class="col-price font-num">PKR ${wholesale}</td>
        <td class="col-price font-num">PKR ${individual}</td>
        <td class="col-date">${escapeHtml(item.date || '')}</td>
        <td class="col-dots-actions">
          <div class="action-dropdown-wrap">
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div id="${menuId}" class="action-menu hidden">
              <button onclick="openEditStock('${item.id}')" class="menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Stock</span>
              </button>
              <button onclick="confirmDeleteStock('${item.id}')" class="menu-item text-danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </td>
      `;
      el.inventoryTableBody.appendChild(tr);
    });
  }

  // Update Pagination Controls
  el.btnInvPrevPage.disabled = inventoryPage <= 1;
  el.btnInvNextPage.disabled = inventoryPage >= totalPages;

  renderPaginationNumbers(el.invPageNumbers, inventoryPage, totalPages, (page) => {
    inventoryPage = page;
    renderInventory();
  });
}

// ============================================
// VENDORS TAB LOGIC
// ============================================
function getFilteredVendors() {
  let list = [...appData.vendors];
  const query = (el.vendorSearchInput ? el.vendorSearchInput.value : '').trim().toLowerCase();
  const searchBy = el.vendorSearchBy ? el.vendorSearchBy.value : 'all';

  if (query) {
    list = list.filter(v => {
      if (searchBy === 'name') return (v.name || '').toLowerCase().includes(query);
      if (searchBy === 'phone') return (v.phone || '').toLowerCase().includes(query);
      return (v.name || '').toLowerCase().includes(query) || (v.phone || '').toLowerCase().includes(query);
    });
  }

  return list;
}

function renderVendors() {
  const filtered = getFilteredVendors();
  const total = filtered.length;
  const pageSize = getAdaptivePageSize('vendors');
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (vendorPage > totalPages) vendorPage = totalPages;
  if (vendorPage < 1) vendorPage = 1;

  const start = (vendorPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  el.vendorTableBody.innerHTML = '';

  if (pageItems.length === 0) {
    el.vendorEmptyState.classList.remove('hidden');
    el.vendorPaginationInfo.textContent = 'Showing 0 of 0 vendors';
  } else {
    el.vendorEmptyState.classList.add('hidden');
    const end = Math.min(start + pageSize, total);
    el.vendorPaginationInfo.textContent = `Showing ${start + 1}-${end} of ${total} vendors`;

    pageItems.forEach((vendor) => {
      const menuId = `menu-ven-${vendor.id}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-vendor-name">
          <div class="vendor-avatar-row">
            <div class="vendor-avatar">${escapeHtml((vendor.name || 'V').substring(0, 2).toUpperCase())}</div>
            <span class="vendor-name-text">${escapeHtml(vendor.name)}</span>
          </div>
        </td>
        <td class="col-phone font-num">${escapeHtml(vendor.phone || '-')}</td>
        <td class="col-dots-actions">
          <div class="action-dropdown-wrap">
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div id="${menuId}" class="action-menu hidden">
              <button onclick="openEditVendor('${vendor.id}')" class="menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Vendor</span>
              </button>
              <button onclick="confirmDeleteVendor('${vendor.id}')" class="menu-item text-danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </td>
      `;
      el.vendorTableBody.appendChild(tr);
    });
  }

  // Update Pagination Controls
  el.btnVendorPrevPage.disabled = vendorPage <= 1;
  el.btnVendorNextPage.disabled = vendorPage >= totalPages;

  renderPaginationNumbers(el.vendorPageNumbers, vendorPage, totalPages, (page) => {
    vendorPage = page;
    renderVendors();
  });
}

// Pagination Numbers Generator
function renderPaginationNumbers(container, currentPage, totalPages, onPageClick) {
  if (!container) return;
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const createBtn = (p, text = p, isCurrent = false) => {
    const btn = document.createElement('button');
    btn.className = `btn-page ${isCurrent ? 'active' : ''}`.trim();
    btn.textContent = text;
    btn.disabled = isCurrent;
    btn.addEventListener('click', () => onPageClick(p));
    return btn;
  };

  const createEllipsis = () => {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '...';
    return span;
  };

  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) {
      container.appendChild(createBtn(p, p, p === currentPage));
    }
  } else {
    container.appendChild(createBtn(1, 1, currentPage === 1));

    if (currentPage > 3) container.appendChild(createEllipsis());

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let p = start; p <= end; p++) {
      container.appendChild(createBtn(p, p, p === currentPage));
    }

    if (currentPage < totalPages - 2) container.appendChild(createEllipsis());

    container.appendChild(createBtn(totalPages, totalPages, currentPage === totalPages));
  }
}

// ============================================
// MODAL CONTROLS FOR STOCK & VENDORS
// ============================================
function openAddStock() {
  el.modalStockTitle.textContent = 'Add Stock';
  el.stockId.value = '';
  el.stockNameInput.value = '';
  el.stockVendorSelect.value = '';
  el.stockQtyInput.value = '';
  el.stockSellInput.value = '0';
  el.stockWholesalePrice.value = '';
  el.stockIndividualPrice.value = '';
  el.stockDateInput.value = getTodayString();
  updateTotalPricesSummary();
  el.modalStock.classList.remove('hidden');
}

window.openEditStock = function(stockId) {
  closeAllActionMenus();
  const item = appData.inventory.find(i => i.id === stockId);
  if (!item) return;

  el.modalStockTitle.textContent = 'Edit Stock';
  el.stockId.value = item.id;
  el.stockNameInput.value = item.stockName;
  el.stockVendorSelect.value = item.vendorId || '';
  el.stockQtyInput.value = item.quantity;
  el.stockSellInput.value = item.totalSell || 0;
  el.stockWholesalePrice.value = item.wholesalePrice || 0;
  el.stockIndividualPrice.value = item.individualPrice || 0;
  el.stockDateInput.value = item.date || getTodayString();
  updateTotalPricesSummary();
  el.modalStock.classList.remove('hidden');
};

function closeStockModal() {
  el.modalStock.classList.add('hidden');
}

function openAddVendor(fromStockModal = false) {
  returnToStockModalAfterVendor = fromStockModal;
  if (fromStockModal) {
    el.modalStock.classList.add('hidden');
  }
  el.modalVendorTitle.textContent = 'Add Vendor';
  el.vendorId.value = '';
  el.vendorNameInput.value = '';
  el.vendorPhoneInput.value = '';
  el.modalVendor.classList.remove('hidden');
}

window.openEditVendor = function(vendorId) {
  closeAllActionMenus();
  const vendor = appData.vendors.find(v => v.id === vendorId);
  if (!vendor) return;

  el.modalVendorTitle.textContent = 'Edit Vendor';
  el.vendorId.value = vendor.id;
  el.vendorNameInput.value = vendor.name;
  el.vendorPhoneInput.value = vendor.phone || '';
  el.modalVendor.classList.remove('hidden');
};

function closeVendorModal() {
  el.modalVendor.classList.add('hidden');
  if (returnToStockModalAfterVendor) {
    el.modalStock.classList.remove('hidden');
    returnToStockModalAfterVendor = false;
  }
}

function closeConfirmModal() {
  el.modalConfirm.classList.add('hidden');
  pendingDeleteAction = null;
}

window.confirmDeleteStock = function(stockId) {
  closeAllActionMenus();
  const item = appData.inventory.find(i => i.id === stockId);
  const name = item ? item.stockName : 'this item';
  el.confirmTitle.textContent = 'Delete Stock';
  el.confirmMessage.textContent = `Are you sure you want to delete "${name}"?`;
  pendingDeleteAction = async () => {
    if (api.deleteStock) await api.deleteStock(stockId);
    showToast('Stock item deleted');
    await reloadFromDatabase();
    renderInventory();
  };
  el.modalConfirm.classList.remove('hidden');
};

window.confirmDeleteVendor = function(vendorId) {
  closeAllActionMenus();
  const vendor = appData.vendors.find(v => v.id === vendorId);
  const name = vendor ? vendor.name : 'this vendor';
  el.confirmTitle.textContent = 'Delete Vendor';
  el.confirmMessage.textContent = `Are you sure you want to delete vendor "${name}"? Associated stock vendor references will be cleared.`;
  pendingDeleteAction = async () => {
    if (api.deleteVendor) await api.deleteVendor(vendorId);
    showToast('Vendor deleted');
    await reloadFromDatabase();
    renderVendors();
    renderInventory();
  };
  el.modalConfirm.classList.remove('hidden');
};

function updateTotalPricesSummary() {
  const qty = Number(el.stockQtyInput.value) || 0;
  const wholesale = Number(el.stockWholesalePrice.value) || 0;
  const individual = Number(el.stockIndividualPrice.value) || 0;
  el.summaryTotalWholesale.textContent = `PKR ${(qty * wholesale).toFixed(2)}`;
  el.summaryTotalIndividual.textContent = `PKR ${(qty * individual).toFixed(2)}`;
}

function refreshVendorDropdowns(selectedVendorId = null) {
  if (!el.stockVendorSelect) return;
  el.stockVendorSelect.innerHTML = '<option value="">Select Vendor</option>';
  appData.vendors.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    if (selectedVendorId && v.id === selectedVendorId) opt.selected = true;
    el.stockVendorSelect.appendChild(opt);
  });
}

// Stock Form Submit
if (el.stockForm) {
  el.stockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = el.stockId.value;
    const stockName = el.stockNameInput.value.trim();
    const vendorId = el.stockVendorSelect.value;
    const selectedVendor = appData.vendors.find(v => v.id === vendorId);
    const vendorName = selectedVendor ? selectedVendor.name : '';
    const quantity = Number(el.stockQtyInput.value);
    const totalSell = Number(el.stockSellInput.value) || 0;
    const wholesalePrice = Number(el.stockWholesalePrice.value);
    const individualPrice = Number(el.stockIndividualPrice.value);
    const date = el.stockDateInput.value;

    if (id) {
      const updated = { id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date };
      if (api.updateStock) await api.updateStock(updated);
      showToast('Stock item updated');
    } else {
      const newStock = { id: 'inv-' + Date.now(), stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date };
      if (api.addStock) await api.addStock(newStock);
      showToast('Stock item added');
    }

    await reloadFromDatabase();
    el.modalStock.classList.add('hidden');
    renderInventory();
  });
}

// Vendor Form Submit
if (el.vendorForm) {
  el.vendorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = el.vendorId.value;
    const name = el.vendorNameInput.value.trim();
    const phone = el.vendorPhoneInput.value.trim();

    let createdVendorId = id;
    if (id) {
      const updated = { id, name, phone };
      if (api.updateVendor) await api.updateVendor(updated);
      showToast('Vendor updated');
    } else {
      createdVendorId = 'v-' + Date.now();
      const newVendor = { id: createdVendorId, name, phone, createdAt: getTodayString() };
      if (api.addVendor) await api.addVendor(newVendor);
      showToast('Vendor added');
    }

    await reloadFromDatabase();
    refreshVendorDropdowns(createdVendorId);
    el.modalVendor.classList.add('hidden');

    if (returnToStockModalAfterVendor) {
      el.modalStock.classList.remove('hidden');
      el.stockVendorSelect.value = createdVendorId;
      returnToStockModalAfterVendor = false;
    }

    renderVendors();
    renderInventory();
  });
}

// Confirm Delete Handler
if (el.btnExecuteConfirm) {
  el.btnExecuteConfirm.addEventListener('click', async () => {
    if (pendingDeleteAction) await pendingDeleteAction();
    closeConfirmModal();
  });
}

// Circular Radial Export Speed-Dial Controls
function openRadialExportMenu() {
  if (!el.radialNodesPanel) return;
  el.radialNodesPanel.classList.remove('hidden');
  el.btnExportToggle.classList.add('active');
  el.btnExportToggle.setAttribute('aria-expanded', 'true');
}

function closeRadialExportMenu() {
  if (!el.radialNodesPanel) return;
  el.radialNodesPanel.classList.add('hidden');
  el.btnExportToggle.classList.remove('active');
  el.btnExportToggle.setAttribute('aria-expanded', 'false');
}

function toggleRadialExportMenu(e) {
  if (e) e.stopPropagation();
  if (!el.radialNodesPanel) return;
  if (el.radialNodesPanel.classList.contains('hidden')) {
    openRadialExportMenu();
  } else {
    closeRadialExportMenu();
  }
}

if (el.btnExportToggle) {
  el.btnExportToggle.addEventListener('click', toggleRadialExportMenu);
}

if (el.radialBackdrop) {
  el.radialBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
  });
}

document.addEventListener('click', (e) => {
  if (el.radialExportWidget && !el.radialExportWidget.contains(e.target)) {
    closeRadialExportMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeRadialExportMenu();
  }
});

function getPreparedExportData() {
  const items = [...appData.inventory];
  let totalQty = 0;
  let totalSell = 0;
  let totalWholesale = 0;
  let totalIndividual = 0;

  items.forEach(item => {
    const q = Number(item.quantity) || 0;
    const s = Number(item.totalSell) || 0;
    const wp = Number(item.wholesalePrice) || 0;
    const ip = Number(item.individualPrice) || 0;
    totalQty += q;
    totalSell += s;
    totalWholesale += q * wp;
    totalIndividual += q * ip;
  });

  const now = new Date();
  return {
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: totalQty,
      totalSell,
      totalWholesale,
      totalIndividual,
      dateGenerated: now.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }),
      timeGenerated: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    }
  };
}

// 1. PDF Export Node Handler
if (el.btnExportPDF) {
  el.btnExportPDF.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
    if (appData.inventory.length === 0) {
      showToast('No inventory data to export');
      return;
    }
    showToast('Preparing PDF report...');
    try {
      const payload = getPreparedExportData();
      const res = await api.exportPDF(payload);
      if (res && res.success) {
        showToast('PDF exported successfully');
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('Error exporting PDF');
    }
  });
}

// 2. Excel (.xlsx) Export Node Handler
if (el.btnExportExcel) {
  el.btnExportExcel.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
    if (appData.inventory.length === 0) {
      showToast('No inventory data to export');
      return;
    }
    showToast('Preparing Excel workbook...');
    try {
      const payload = getPreparedExportData();
      const res = await api.exportExcel(payload);
      if (res && res.success) {
        showToast('Excel exported successfully');
      }
    } catch (err) {
      console.error('Excel export failed:', err);
      showToast('Error exporting Excel');
    }
  });
}

// 3. CSV Export Node Handler
if (el.btnExportCSV) {
  el.btnExportCSV.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
    if (appData.inventory.length === 0) {
      showToast('No inventory data to export');
      return;
    }
    showToast('Preparing CSV file...');
    try {
      const payload = getPreparedExportData();
      const res = await api.exportCSV(payload);
      if (res && res.success) {
        showToast('CSV exported successfully');
      }
    } catch (err) {
      console.error('CSV export failed:', err);
      showToast('Error exporting CSV');
    }
  });
}

// Sidebar & Tab Event Listeners
if (el.navInventoryBtn) el.navInventoryBtn.addEventListener('click', () => switchTab('inventory'));
if (el.navVendorBtn) el.navVendorBtn.addEventListener('click', () => switchTab('vendors'));

if (el.btnOpenAddStock) el.btnOpenAddStock.addEventListener('click', openAddStock);
if (el.btnCloseStockModal) el.btnCloseStockModal.addEventListener('click', closeStockModal);
if (el.btnCancelStock) el.btnCancelStock.addEventListener('click', closeStockModal);
if (el.btnQuickAddVendor) el.btnQuickAddVendor.addEventListener('click', () => openAddVendor(true));

if (el.stockQtyInput) el.stockQtyInput.addEventListener('input', updateTotalPricesSummary);
if (el.stockWholesalePrice) el.stockWholesalePrice.addEventListener('input', updateTotalPricesSummary);
if (el.stockIndividualPrice) el.stockIndividualPrice.addEventListener('input', updateTotalPricesSummary);

if (el.btnOpenAddVendor) el.btnOpenAddVendor.addEventListener('click', () => openAddVendor(false));
if (el.btnCloseVendorModal) el.btnCloseVendorModal.addEventListener('click', closeVendorModal);
if (el.btnCancelVendor) el.btnCancelVendor.addEventListener('click', closeVendorModal);

if (el.btnCloseConfirmModal) el.btnCloseConfirmModal.addEventListener('click', closeConfirmModal);
if (el.btnCancelConfirm) el.btnCancelConfirm.addEventListener('click', closeConfirmModal);

// Search & Filter Events for Inventory
if (el.inventorySearchInput) {
  el.inventorySearchInput.addEventListener('input', (e) => {
    if (el.btnClearInventorySearch) {
      if (e.target.value) el.btnClearInventorySearch.classList.remove('hidden');
      else el.btnClearInventorySearch.classList.add('hidden');
    }
    inventoryPage = 1;
    renderInventory();
  });
}

if (el.inventorySearchBy) el.inventorySearchBy.addEventListener('change', () => {
  inventoryPage = 1;
  renderInventory();
});

if (el.btnClearInventorySearch) {
  el.btnClearInventorySearch.addEventListener('click', () => {
    el.inventorySearchInput.value = '';
    el.btnClearInventorySearch.classList.add('hidden');
    inventoryPage = 1;
    renderInventory();
  });
}

if (el.filterStockLevelInput) el.filterStockLevelInput.addEventListener('input', () => {
  inventoryPage = 1;
  renderInventory();
});

if (el.btnResetInventoryFilters) {
  el.btnResetInventoryFilters.addEventListener('click', () => {
    if (el.inventorySearchInput) el.inventorySearchInput.value = '';
    if (el.btnClearInventorySearch) el.btnClearInventorySearch.classList.add('hidden');
    if (el.inventorySearchBy) el.inventorySearchBy.value = 'all';
    if (el.filterStockLevelInput) el.filterStockLevelInput.value = '';
    inventoryPage = 1;
    renderInventory();
  });
}

// Search & Filter Events for Vendors
if (el.vendorSearchInput) {
  el.vendorSearchInput.addEventListener('input', (e) => {
    if (el.btnClearVendorSearch) {
      if (e.target.value) el.btnClearVendorSearch.classList.remove('hidden');
      else el.btnClearVendorSearch.classList.add('hidden');
    }
    vendorPage = 1;
    renderVendors();
  });
}

if (el.vendorSearchBy) el.vendorSearchBy.addEventListener('change', () => {
  vendorPage = 1;
  renderVendors();
});

if (el.btnClearVendorSearch) {
  el.btnClearVendorSearch.addEventListener('click', () => {
    el.vendorSearchInput.value = '';
    el.btnClearVendorSearch.classList.add('hidden');
    vendorPage = 1;
    renderVendors();
  });
}

// Pagination Prev/Next Click Event Listeners
if (el.btnInvPrevPage) {
  el.btnInvPrevPage.addEventListener('click', () => {
    if (inventoryPage > 1) {
      inventoryPage--;
      renderInventory();
    }
  });
}

if (el.btnInvNextPage) {
  el.btnInvNextPage.addEventListener('click', () => {
    const pageSize = getAdaptivePageSize('inventory');
    const totalPages = Math.ceil(getFilteredInventory().length / pageSize) || 1;
    if (inventoryPage < totalPages) {
      inventoryPage++;
      renderInventory();
    }
  });
}

if (el.btnVendorPrevPage) {
  el.btnVendorPrevPage.addEventListener('click', () => {
    if (vendorPage > 1) {
      vendorPage--;
      renderVendors();
    }
  });
}

if (el.btnVendorNextPage) {
  el.btnVendorNextPage.addEventListener('click', () => {
    const pageSize = getAdaptivePageSize('vendors');
    const totalPages = Math.ceil(getFilteredVendors().length / pageSize) || 1;
    if (vendorPage < totalPages) {
      vendorPage++;
      renderVendors();
    }
  });
}

// Escape HTML utility
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sidebar toggle handler
const sidebarEl = document.getElementById('sidebar');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const brandEl = document.querySelector('.brand');
const brandMini = document.querySelector('.brand-mini');

function openSidebar() {
  if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
    sidebarEl.classList.remove('collapsed');
    try {
      localStorage.setItem('sidebar_collapsed', 'false');
    } catch (e) {}
  }
}

function toggleSidebar() {
  if (!sidebarEl) return;
  sidebarEl.classList.toggle('collapsed');
  try {
    localStorage.setItem('sidebar_collapsed', sidebarEl.classList.contains('collapsed') ? 'true' : 'false');
  } catch (e) {}
}

if (btnToggleSidebar) {
  btnToggleSidebar.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
}

if (brandEl) {
  brandEl.addEventListener('click', (e) => {
    if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
      e.stopPropagation();
      openSidebar();
    }
  });
}

if (brandMini) {
  brandMini.addEventListener('click', (e) => {
    if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
      e.stopPropagation();
      openSidebar();
    }
  });
}

document.querySelectorAll('.brand-circle-img').forEach(img => {
  img.addEventListener('click', (e) => {
    if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
      e.stopPropagation();
      openSidebar();
    }
  });
});

// Restore saved sidebar collapsed state on load
try {
  if (localStorage.getItem('sidebar_collapsed') === 'true' && sidebarEl) {
    sidebarEl.classList.add('collapsed');
  }
} catch (e) {}

// Initial Boot
let isAppInitialized = false;
async function init() {
  if (isAppInitialized) return;
  isAppInitialized = true;
  await reloadFromDatabase();
  renderInventory();
  renderVendors();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else {
  init();
}

// Dynamically re-render on window resize/maximize to adapt row capacity
let resizeDebounceTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    if (currentTab === 'inventory') {
      renderInventory();
    } else if (currentTab === 'vendors') {
      renderVendors();
    }
  }, 120);
});
