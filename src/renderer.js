// Application State
let appData = {
  vendors: [],
  inventory: [],
  invoices: []
};

let currentTab = 'inventory'; // 'inventory' | 'vendors' | 'invoices'
let pendingDeleteAction = null;
let returnToStockModalAfterVendor = false;

// Pagination State (Adaptive page size calculated dynamically to fit available screen height)
let inventoryPage = 1;
let vendorPage = 1;
let invoicePage = 1;

function getAdaptivePageSize(tabType = 'inventory') {
  let selector = '#inventoryView .table-container';
  if (tabType === 'vendors') selector = '#vendorView .table-container';
  if (tabType === 'invoices') selector = '#invoiceView .table-container';

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
    // Guarantee at least 10 items (so standard lists of 10 items stay fully on 1 page without pagination split)
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
const getInvoicePageSize = () => getAdaptivePageSize('invoices');

// IPC Storage Bridge (SQLite Backend via window.electronAPI with fallback)
const api = window.electronAPI || {
  getData: async () => {
    const raw = localStorage.getItem('inventory_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      vendors: [],
      inventory: [],
      invoices: []
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
  exportCSV: async (data) => ({ success: true }),
  getInvoices: async () => [],
  createInvoice: async (inv) => ({ success: true }),
  deleteInvoice: async (id) => ({ success: true })
};

// DOM Elements
const el = {
  navInventoryBtn: document.getElementById('navInventoryBtn'),
  navVendorBtn: document.getElementById('navVendorBtn'),
  navInvoiceBtn: document.getElementById('navInvoiceBtn'),

  inventoryView: document.getElementById('inventoryView'),
  vendorView: document.getElementById('vendorView'),
  invoiceView: document.getElementById('invoiceView'),

  badgeInventoryCount: document.getElementById('badgeInventoryCount'),
  badgeVendorCount: document.getElementById('badgeVendorCount'),
  badgeInvoiceCount: document.getElementById('badgeInvoiceCount'),

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

  // Shop Tab Switcher & Sub-Views
  btnShopTabCounter: document.getElementById('btnShopTabCounter'),
  btnShopTabHistory: document.getElementById('btnShopTabHistory'),
  shopCounterView: document.getElementById('shopCounterView'),
  shopHistoryView: document.getElementById('shopHistoryView'),

  // Shop POS Catalog Elements
  shopCatalogSearch: document.getElementById('shopCatalogSearch'),
  btnClearShopSearch: document.getElementById('btnClearShopSearch'),
  shopProductsGrid: document.getElementById('shopProductsGrid'),
  shopProductsEmpty: document.getElementById('shopProductsEmpty'),

  // Shop POS Cart Elements
  shopCartPanel: document.getElementById('shopCartPanel'),
  cartIconBadge: document.getElementById('cartIconBadge'),
  cartBadgeCount: document.getElementById('cartBadgeCount'),
  cartItemsSubtitle: document.getElementById('cartItemsSubtitle'),
  btnClearCart: document.getElementById('btnClearCart'),
  posCustomerName: document.getElementById('posCustomerName'),
  posCustomerPhone: document.getElementById('posCustomerPhone'),
  cartItemsList: document.getElementById('cartItemsList'),
  cartEmptyState: document.getElementById('cartEmptyState'),
  posSubtotal: document.getElementById('posSubtotal'),
  posDiscountInput: document.getElementById('posDiscountInput'),
  posGrandTotal: document.getElementById('posGrandTotal'),
  posCashReceived: document.getElementById('posCashReceived'),
  posChangeDue: document.getElementById('posChangeDue'),
  btnCheckoutOrder: document.getElementById('btnCheckoutOrder'),

  // Invoice List Elements
  invoiceTableBody: document.getElementById('invoiceTableBody'),
  invoiceEmptyState: document.getElementById('invoiceEmptyState'),
  invoiceSearchBy: document.getElementById('invoiceSearchBy'),
  invoiceSearchInput: document.getElementById('invoiceSearchInput'),
  btnClearInvoiceSearch: document.getElementById('btnClearInvoiceSearch'),
  filterInvoiceStatus: document.getElementById('filterInvoiceStatus'),
  btnResetInvoiceFilters: document.getElementById('btnResetInvoiceFilters'),
  btnOpenCreateInvoice: document.getElementById('btnOpenCreateInvoice'),

  // Invoice Pagination
  invoicePaginationInfo: document.getElementById('invoicePaginationInfo'),
  btnInvoicePrevPage: document.getElementById('btnInvoicePrevPage'),
  btnInvoiceNextPage: document.getElementById('btnInvoiceNextPage'),
  invoicePageNumbers: document.getElementById('invoicePageNumbers'),

  // Create Invoice Modal Elements
  modalInvoice: document.getElementById('modalInvoice'),
  btnCloseInvoiceModal: document.getElementById('btnCloseInvoiceModal'),
  btnCancelInvoice: document.getElementById('btnCancelInvoice'),
  invoiceForm: document.getElementById('invoiceForm'),
  invNumberInput: document.getElementById('invNumberInput'),
  invDateInput: document.getElementById('invDateInput'),
  invStatusSelect: document.getElementById('invStatusSelect'),
  invCustomerNameInput: document.getElementById('invCustomerNameInput'),
  invCustomerPhoneInput: document.getElementById('invCustomerPhoneInput'),
  invCustomerAddressInput: document.getElementById('invCustomerAddressInput'),
  btnAddInvoiceItemRow: document.getElementById('btnAddInvoiceItemRow'),
  invoiceItemsTableBody: document.getElementById('invoiceItemsTableBody'),
  invNotesInput: document.getElementById('invNotesInput'),
  invSubtotalDisplay: document.getElementById('invSubtotalDisplay'),
  invDiscountInput: document.getElementById('invDiscountInput'),
  invTotalDisplay: document.getElementById('invTotalDisplay'),

  // View / Print Invoice Modal Elements
  modalViewInvoice: document.getElementById('modalViewInvoice'),
  btnCloseViewInvoiceModal: document.getElementById('btnCloseViewInvoiceModal'),
  btnPrintInvoice: document.getElementById('btnPrintInvoice'),
  printableInvoiceSheet: document.getElementById('printableInvoiceSheet'),

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
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
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
        inventory: Array.isArray(data.inventory) ? data.inventory : [],
        invoices: Array.isArray(data.invoices) ? data.invoices : []
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
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : []
        };
      }
    } catch (e) {}
  }
  updateBadges();
  refreshVendorDropdowns();
}

function updateBadges() {
  if (el.badgeInventoryCount) el.badgeInventoryCount.textContent = appData.inventory.length;
  if (el.badgeVendorCount) el.badgeVendorCount.textContent = appData.vendors.length;
  if (el.badgeInvoiceCount) el.badgeInvoiceCount.textContent = appData.invoices.length;
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
  if (el.navInvoiceBtn) el.navInvoiceBtn.classList.toggle('active', tab === 'invoices');

  if (el.inventoryView) el.inventoryView.classList.toggle('active', tab === 'inventory');
  if (el.vendorView) el.vendorView.classList.toggle('active', tab === 'vendors');
  if (el.invoiceView) el.invoiceView.classList.toggle('active', tab === 'invoices');

  if (tab === 'inventory') renderInventory();
  else if (tab === 'vendors') renderVendors();
  else if (tab === 'invoices') {
    renderShopProducts();
    renderPosCart();
    renderInvoices();
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
    // Default: Newest date first
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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

  if (total === 0) {
    el.inventoryEmptyState.classList.remove('hidden');
  } else {
    el.inventoryEmptyState.classList.add('hidden');
    pageItems.forEach(item => {
      const wholesale = Number(item.wholesalePrice || 0).toFixed(2);
      const individual = Number(item.individualPrice || 0).toFixed(2);
      const sell = item.totalSell || 0;
      const menuId = `menu-inv-${item.id}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-stock-name stock-name-cell">${escapeHtml(item.stockName)}</td>
        <td class="col-vendor"><span class="vendor-tag">${escapeHtml(item.vendorName || 'N/A')}</span></td>
        <td class="col-stock-qty qty-val">${Number(item.quantity).toLocaleString()}</td>
        <td class="col-sell-qty sell-val">${Number(item.totalSell || 0).toLocaleString()}</td>
        <td class="col-price price-val">PKR ${Number(wholesale).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="col-price price-val">PKR ${Number(individual).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="col-date date-val">${escapeHtml(item.date || '')}</td>
        <td class="col-dots-actions">
          <div class="dots-wrapper">
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions" aria-label="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div id="${menuId}" class="action-menu hidden">
              <button class="action-menu-item" onclick="openEditStock('${item.id}')">Edit</button>
              <button class="action-menu-item danger" onclick="confirmDeleteStock('${item.id}')">Delete</button>
            </div>
          </div>
        </td>
      `;
      el.inventoryTableBody.appendChild(tr);
    });
  }

  renderInventoryPagination(total, totalPages, pageSize);
}

function renderPaginationNumbers(container, currentPage, totalPages, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  if (totalPages <= 0) return;

  const createBtn = (page) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-page-number btn-page-num ${page === currentPage ? 'active' : ''}`;
    btn.textContent = page;
    btn.setAttribute('aria-label', `Page ${page}`);
    if (page === currentPage) btn.setAttribute('aria-current', 'page');
    btn.addEventListener('click', () => onSelect(page));
    return btn;
  };

  const createEllipsis = () => {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '…';
    return span;
  };

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      container.appendChild(createBtn(i));
    }
  } else {
    container.appendChild(createBtn(1));

    if (currentPage > 3) {
      container.appendChild(createEllipsis());
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      container.appendChild(createBtn(i));
    }

    if (currentPage < totalPages - 2) {
      container.appendChild(createEllipsis());
    }

    container.appendChild(createBtn(totalPages));
  }
}

function renderInventoryPagination(total, totalPages, pageSize) {
  const size = pageSize || getAdaptivePageSize('inventory');
  const start = total === 0 ? 0 : (inventoryPage - 1) * size + 1;
  const end = Math.min(inventoryPage * size, total);
  el.inventoryPaginationInfo.textContent = `Showing ${start}-${end} of ${total} items`;

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
  const query = (el.vendorSearchInput.value || '').trim().toLowerCase();
  const searchBy = el.vendorSearchBy.value;

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

  if (total === 0) {
    el.vendorEmptyState.classList.remove('hidden');
  } else {
    el.vendorEmptyState.classList.add('hidden');
    pageItems.forEach(vendor => {
      const menuId = `menu-ven-${vendor.id}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-vendor-name">${escapeHtml(vendor.name)}</td>
        <td class="col-phone">${escapeHtml(vendor.phone || 'N/A')}</td>
        <td class="col-dots-actions">
          <div class="dots-wrapper">
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions" aria-label="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div id="${menuId}" class="action-menu hidden">
              <button class="action-menu-item" onclick="openEditVendor('${vendor.id}')">Edit</button>
              <button class="action-menu-item danger" onclick="confirmDeleteVendor('${vendor.id}')">Delete</button>
            </div>
          </div>
        </td>
      `;
      el.vendorTableBody.appendChild(tr);
    });
  }

  renderVendorPagination(total, totalPages, pageSize);
}

function renderVendorPagination(total, totalPages, pageSize) {
  const size = pageSize || getAdaptivePageSize('vendors');
  const start = total === 0 ? 0 : (vendorPage - 1) * size + 1;
  const end = Math.min(vendorPage * size, total);
  el.vendorPaginationInfo.textContent = `Showing ${start}-${end} of ${total} items`;

  el.btnVendorPrevPage.disabled = vendorPage <= 1;
  el.btnVendorNextPage.disabled = vendorPage >= totalPages;

  renderPaginationNumbers(el.vendorPageNumbers, vendorPage, totalPages, (page) => {
    vendorPage = page;
    renderVendors();
  });
}

// ============================================
// SHOP / POS MODULE (Real-time Point of Sale)
// ============================================
let posCart = []; // [{ stockId, stockName, price, wholesalePrice, quantity, maxQty, vendorName }]
let posSelectedFilter = 'all'; // 'all' | 'in-stock' | 'low-stock'
let posPaymentMode = 'Cash';
let shopSubTab = 'counter'; // 'counter' | 'history'

function switchShopSubTab(subTab) {
  shopSubTab = subTab;
  if (el.btnShopTabCounter) el.btnShopTabCounter.classList.toggle('active', subTab === 'counter');
  if (el.btnShopTabHistory) el.btnShopTabHistory.classList.toggle('active', subTab === 'history');

  if (el.shopCounterView) el.shopCounterView.classList.toggle('hidden', subTab !== 'counter');
  if (el.shopHistoryView) el.shopHistoryView.classList.toggle('hidden', subTab !== 'history');

  if (subTab === 'counter') {
    renderShopProducts();
    renderPosCart();
  } else {
    renderInvoices();
  }
}

function triggerFlyToCartAnimation(buttonEl, itemName) {
  const targetBadge = el.cartIconBadge || document.getElementById('cartIconBadge');
  if (!buttonEl || !targetBadge) return;

  const btnRect = buttonEl.getBoundingClientRect();
  const targetRect = targetBadge.getBoundingClientRect();

  const fly = document.createElement('div');
  fly.className = 'flying-cart-item';
  fly.innerHTML = `<span>+</span> <strong>${escapeHtml(itemName.substring(0, 18))}</strong>`;

  fly.style.left = `${btnRect.left + btnRect.width / 2}px`;
  fly.style.top = `${btnRect.top + btnRect.height / 2}px`;

  document.body.appendChild(fly);

  // Force reflow
  void fly.offsetWidth;

  const deltaX = (targetRect.left + targetRect.width / 2) - (btnRect.left + btnRect.width / 2);
  const deltaY = (targetRect.top + targetRect.height / 2) - (btnRect.top + btnRect.height / 2);

  fly.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.35)`;
  fly.style.opacity = '0';

  setTimeout(() => {
    fly.remove();
    targetBadge.classList.add('pulse');
    setTimeout(() => targetBadge.classList.remove('pulse'), 400);
  }, 460);
}

function renderShopProducts() {
  if (!el.shopProductsGrid) return;
  const query = (el.shopCatalogSearch ? el.shopCatalogSearch.value : '').trim().toLowerCase();

  let list = [...appData.inventory];

  if (query) {
    list = list.filter(item => {
      const name = (item.stockName || '').toLowerCase();
      const vendor = (item.vendorName || '').toLowerCase();
      return name.includes(query) || vendor.includes(query);
    });
  }

  if (posSelectedFilter === 'in-stock') {
    list = list.filter(i => Number(i.quantity || 0) > 0);
  } else if (posSelectedFilter === 'low-stock') {
    list = list.filter(i => {
      const q = Number(i.quantity || 0);
      return q > 0 && q <= 10;
    });
  }

  el.shopProductsGrid.innerHTML = '';

  if (list.length === 0) {
    if (el.shopProductsEmpty) el.shopProductsEmpty.classList.remove('hidden');
    return;
  }
  if (el.shopProductsEmpty) el.shopProductsEmpty.classList.add('hidden');

  list.forEach(item => {
    const availableQty = Number(item.quantity || 0);
    const retailPrice = Number(item.individualPrice || item.wholesalePrice || 0);
    const card = document.createElement('div');
    card.className = 'pos-product-card';

    let badgeClass = 'in-stock';
    let badgeText = `${availableQty} in stock`;
    if (availableQty === 0) {
      badgeClass = 'out-stock';
      badgeText = 'Out of stock';
    } else if (availableQty <= 10) {
      badgeClass = 'low-stock';
      badgeText = `${availableQty} low stock`;
    }

    const priceFormatted = Number(retailPrice).toLocaleString('en-PK', { minimumFractionDigits: 2 });

    card.innerHTML = `
      <div class="pos-product-vendor">${escapeHtml(item.vendorName || 'General Stock')}</div>
      <div class="pos-product-title" title="${escapeHtml(item.stockName)}">${escapeHtml(item.stockName)}</div>
      <div class="pos-product-meta-row">
        <div class="pos-product-price">PKR ${priceFormatted}</div>
        <span class="pos-stock-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="pos-card-actions">
        <div class="pos-qty-stepper">
          <button type="button" class="pos-btn-step btn-step-down" ${availableQty <= 0 ? 'disabled' : ''}>-</button>
          <input type="number" class="pos-step-input" value="1" min="1" max="${availableQty}" ${availableQty <= 0 ? 'disabled' : ''}>
          <button type="button" class="pos-btn-step btn-step-up" ${availableQty <= 0 ? 'disabled' : ''}>+</button>
        </div>
        <button type="button" class="btn-pos-add" ${availableQty <= 0 ? 'disabled' : ''} data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span>Add</span>
        </button>
      </div>
    `;

    const stepInput = card.querySelector('.pos-step-input');
    const btnDown = card.querySelector('.btn-step-down');
    const btnUp = card.querySelector('.btn-step-up');
    const btnAdd = card.querySelector('.btn-pos-add');

    if (btnDown && stepInput) {
      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = parseInt(stepInput.value, 10) || 1;
        if (val > 1) stepInput.value = val - 1;
      });
    }

    if (btnUp && stepInput) {
      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = parseInt(stepInput.value, 10) || 1;
        if (val < availableQty) stepInput.value = val + 1;
      });
    }

    if (btnAdd && stepInput) {
      btnAdd.addEventListener('click', (e) => {
        e.stopPropagation();
        const qtyToAdd = parseInt(stepInput.value, 10) || 1;
        triggerFlyToCartAnimation(btnAdd, item.stockName);
        addToPosCart(item.id, qtyToAdd);
      });
    }

    el.shopProductsGrid.appendChild(card);
  });
}

function addToPosCart(stockId, quantity = 1) {
  const stock = (appData.inventory || []).find(i => i.id === stockId);
  if (!stock) return;

  const available = Number(stock.quantity || 0);
  if (available <= 0) {
    showToast('Item is out of stock', 'error');
    return;
  }

  const existing = posCart.find(i => i.stockId === stockId);
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > available) {
      existing.quantity = available;
      showToast(`Maximum available stock (${available}) reached`, 'warning');
    } else {
      existing.quantity = newQty;
    }
  } else {
    const addQty = Math.min(quantity, available);
    const price = Number(stock.individualPrice || stock.wholesalePrice || 0);
    posCart.push({
      stockId: stock.id,
      stockName: stock.stockName,
      price: price,
      wholesalePrice: Number(stock.wholesalePrice || 0),
      quantity: addQty,
      maxQty: available,
      vendorName: stock.vendorName || ''
    });
  }

  renderPosCart();
}

function updatePosCartQty(stockId, delta) {
  const item = posCart.find(i => i.stockId === stockId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    posCart = posCart.filter(i => i.stockId !== stockId);
  } else if (item.quantity > item.maxQty) {
    item.quantity = item.maxQty;
    showToast(`Maximum available stock is ${item.maxQty}`, 'warning');
  }

  renderPosCart();
}

function removeFromPosCart(stockId) {
  posCart = posCart.filter(i => i.stockId !== stockId);
  renderPosCart();
}

function clearPosCart() {
  if (posCart.length === 0) return;
  posCart = [];
  renderPosCart();
  showToast('Cart cleared');
}

function renderPosCart() {
  if (!el.cartItemsList) return;

  el.cartItemsList.innerHTML = '';
  const totalCount = posCart.reduce((sum, i) => sum + i.quantity, 0);

  if (el.cartBadgeCount) el.cartBadgeCount.textContent = totalCount;
  if (el.cartItemsSubtitle) el.cartItemsSubtitle.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'} in cart`;

  if (posCart.length === 0) {
    if (el.cartEmptyState) el.cartEmptyState.classList.remove('hidden');
    if (el.posSubtotal) el.posSubtotal.textContent = 'PKR 0.00';
    if (el.posGrandTotal) el.posGrandTotal.textContent = 'PKR 0.00';
    if (el.posChangeDue) el.posChangeDue.textContent = 'PKR 0.00';
    if (el.btnCheckoutOrder) el.btnCheckoutOrder.disabled = true;
    return;
  }

  if (el.cartEmptyState) el.cartEmptyState.classList.add('hidden');

  let subtotal = 0;

  posCart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name" title="${escapeHtml(item.stockName)}">${escapeHtml(item.stockName)}</div>
        <div class="cart-item-rate">@ PKR ${Number(item.price).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="cart-item-stepper">
        <button type="button" class="btn-cart-step" onclick="updatePosCartQty('${item.stockId}', -1)">-</button>
        <span class="cart-step-val">${item.quantity}</span>
        <button type="button" class="btn-cart-step" onclick="updatePosCartQty('${item.stockId}', 1)">+</button>
      </div>
      <div class="cart-item-amount">Rs ${Number(lineTotal).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</div>
      <button type="button" class="btn-cart-del" onclick="removeFromPosCart('${item.stockId}')" title="Remove">&times;</button>
    `;
    el.cartItemsList.appendChild(row);
  });

  const discountVal = Number(el.posDiscountInput ? el.posDiscountInput.value : 0) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal);

  if (el.posSubtotal) el.posSubtotal.textContent = `PKR ${Number(subtotal).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.posGrandTotal) el.posGrandTotal.textContent = `PKR ${Number(grandTotal).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  const cashReceived = Number(el.posCashReceived ? el.posCashReceived.value : 0) || 0;
  const changeDue = cashReceived > grandTotal ? (cashReceived - grandTotal) : 0;
  if (el.posChangeDue) {
    el.posChangeDue.textContent = `PKR ${Number(changeDue).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  }

  if (el.btnCheckoutOrder) el.btnCheckoutOrder.disabled = false;
}

async function checkoutPosSale() {
  if (posCart.length === 0) {
    showToast('Cart is empty. Add items first.', 'warning');
    return;
  }

  const subtotal = posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discount = Number(el.posDiscountInput ? el.posDiscountInput.value : 0) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const customerName = (el.posCustomerName && el.posCustomerName.value.trim()) ? el.posCustomerName.value.trim() : 'Walk-in Customer';
  const customerPhone = el.posCustomerPhone ? el.posCustomerPhone.value.trim() : '';
  const cashReceived = Number(el.posCashReceived ? el.posCashReceived.value : 0) || grandTotal;
  const changeDue = Math.max(0, cashReceived - grandTotal);

  const newInvoice = {
    id: `invc-${Date.now()}`,
    invoiceNumber: getNextInvoiceNumber(),
    customerName: customerName,
    customerPhone: customerPhone,
    customerAddress: 'Counter Sale',
    date: getTodayString(),
    items: posCart.map(item => ({
      stockId: item.stockId,
      stockName: item.stockName,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    })),
    subtotal: subtotal,
    discount: discount,
    totalAmount: grandTotal,
    notes: `Paid via ${posPaymentMode}. Thank you for your business.`,
    status: 'Paid',
    createdAt: new Date().toISOString()
  };

  try {
    const res = await api.createInvoice(newInvoice);
    if (res && res.success === false) {
      showToast('Failed to complete sale: ' + (res.error || 'Unknown error'), 'error');
      return;
    }

    await reloadFromDatabase();
    renderInventory();
    renderShopProducts();
    renderInvoices();

    // Open Realistic Thermal Cash Receipt matching reference image
    openViewInvoice(newInvoice.id, {
      cashReceived: cashReceived,
      changeDue: changeDue,
      paymentMode: posPaymentMode
    });

    // Reset Cart
    posCart = [];
    if (el.posDiscountInput) el.posDiscountInput.value = '0';
    if (el.posCashReceived) el.posCashReceived.value = '';
    renderPosCart();

    showToast(`Sale completed! Receipt #${newInvoice.invoiceNumber} generated.`);
  } catch (err) {
    console.error('Error during sale checkout:', err);
    showToast('Failed to save sale: ' + err.message, 'error');
  }
}

window.addToPosCart = addToPosCart;
window.updatePosCartQty = updatePosCartQty;
window.removeFromPosCart = removeFromPosCart;
window.clearPosCart = clearPosCart;

// ============================================
// INVOICE MODULE LOGIC (Clean & Professional)
// ============================================
function getFilteredInvoices() {
  let list = [...(appData.invoices || [])];
  const query = (el.invoiceSearchInput.value || '').trim().toLowerCase();
  const searchBy = el.invoiceSearchBy.value;

  if (query) {
    list = list.filter(inv => {
      if (searchBy === 'invoiceNumber') return (inv.invoiceNumber || '').toLowerCase().includes(query);
      if (searchBy === 'customerName') return (inv.customerName || '').toLowerCase().includes(query);
      return (inv.invoiceNumber || '').toLowerCase().includes(query) || (inv.customerName || '').toLowerCase().includes(query);
    });
  }

  const status = el.filterInvoiceStatus.value;
  if (status !== 'all') {
    list = list.filter(inv => (inv.status || 'Paid') === status);
  }

  return list;
}

function renderInvoices() {
  const filtered = getFilteredInvoices();
  const total = filtered.length;
  const pageSize = getAdaptivePageSize('invoices');
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (invoicePage > totalPages) invoicePage = totalPages;
  if (invoicePage < 1) invoicePage = 1;

  const start = (invoicePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  el.invoiceTableBody.innerHTML = '';

  if (total === 0) {
    el.invoiceEmptyState.classList.remove('hidden');
  } else {
    el.invoiceEmptyState.classList.add('hidden');
    pageItems.forEach(inv => {
      let itemsArr = [];
      try {
        itemsArr = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
      } catch (e) {}

      const itemsCount = itemsArr.length;
      const totalFormatted = Number(inv.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
      const statusClass = (inv.status === 'Paid') ? 'badge-paid' : 'badge-pending';
      const menuId = `menu-invc-${inv.id}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-inv-no"><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
        <td class="col-date">${escapeHtml(inv.date || '')}</td>
        <td class="col-customer">${escapeHtml(inv.customerName)}</td>
        <td class="col-phone">${escapeHtml(inv.customerPhone || '-')}</td>
        <td class="col-items-count">${itemsCount} item(s)</td>
        <td class="col-total">Rs ${totalFormatted}</td>
        <td class="col-status"><span class="badge-status ${statusClass}">${escapeHtml(inv.status || 'Paid')}</span></td>
        <td class="col-dots-actions">
          <div class="dots-wrapper">
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions" aria-label="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div id="${menuId}" class="action-menu hidden">
              <button class="action-menu-item" onclick="openViewInvoice('${inv.id}')">View / Print</button>
              <button class="action-menu-item danger" onclick="confirmDeleteInvoice('${inv.id}')">Delete</button>
            </div>
          </div>
        </td>
      `;
      el.invoiceTableBody.appendChild(tr);
    });
  }

  renderInvoicePagination(total, totalPages, pageSize);
}

function renderInvoicePagination(total, totalPages, pageSize) {
  const size = pageSize || getAdaptivePageSize('invoices');
  const start = total === 0 ? 0 : (invoicePage - 1) * size + 1;
  const end = Math.min(invoicePage * size, total);
  el.invoicePaginationInfo.textContent = `Showing ${start}-${end} of ${total} invoices`;

  el.btnInvoicePrevPage.disabled = invoicePage <= 1;
  el.btnInvoiceNextPage.disabled = invoicePage >= totalPages;

  renderPaginationNumbers(el.invoicePageNumbers, invoicePage, totalPages, (page) => {
    invoicePage = page;
    renderInvoices();
  });
}

// Generate sequential Invoice number
function getNextInvoiceNumber() {
  const count = (appData.invoices || []).length;
  return `INV-${1001 + count}`;
}

// Open Create Invoice Modal
function openCreateInvoiceModal() {
  el.invNumberInput.value = getNextInvoiceNumber();
  el.invDateInput.value = getTodayString();
  el.invStatusSelect.value = 'Paid';
  el.invCustomerNameInput.value = '';
  el.invCustomerPhoneInput.value = '';
  el.invCustomerAddressInput.value = '';
  el.invNotesInput.value = 'Goods sold in sound condition. Thank you for doing business with Shahzaib Traders.';
  el.invDiscountInput.value = '0';

  // Clear rows & add 1 default row
  el.invoiceItemsTableBody.innerHTML = '';
  addInvoiceItemRow();
  updateInvoiceCalculations();

  el.modalInvoice.classList.remove('hidden');
}

function closeInvoiceModal() {
  el.modalInvoice.classList.add('hidden');
}

// Add a line item row to the invoice builder table
function addInvoiceItemRow(selectedStockId = '', initialQty = 1, customPrice = null) {
  const rowId = `item-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.className = 'invoice-item-row';

  // Build stock options
  let optionsHtml = '<option value="">-- Select Stock Item --</option>';
  appData.inventory.forEach(stk => {
    const isSelected = stk.id === selectedStockId ? 'selected' : '';
    const price = stk.individualPrice || stk.wholesalePrice || 0;
    optionsHtml += `<option value="${stk.id}" data-price="${price}" data-qty="${stk.quantity}" ${isSelected}>${escapeHtml(stk.stockName)} (In Stock: ${stk.quantity})</option>`;
  });

  tr.innerHTML = `
    <td>
      <select class="invoice-item-select stock-select" required>
        ${optionsHtml}
      </select>
    </td>
    <td>
      <span class="stock-avail-display" style="color: var(--text-muted); font-size: 12.5px;">-</span>
    </td>
    <td>
      <input type="number" class="invoice-item-input qty-input" min="1" step="1" value="${initialQty}" required>
    </td>
    <td>
      <input type="number" class="invoice-item-input price-input" min="0" step="0.5" value="0.00" required>
    </td>
    <td>
      <span class="line-total-display" style="font-weight: 600; color: #111827;">Rs 0.00</span>
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-remove-row" title="Remove Item">&times;</button>
    </td>
  `;

  el.invoiceItemsTableBody.appendChild(tr);

  const stockSelect = tr.querySelector('.stock-select');
  const qtyInput = tr.querySelector('.qty-input');
  const priceInput = tr.querySelector('.price-input');
  const availDisplay = tr.querySelector('.stock-avail-display');
  const removeBtn = tr.querySelector('.btn-remove-row');

  function onStockChange() {
    const opt = stockSelect.selectedOptions[0];
    if (opt && opt.value) {
      const p = customPrice !== null ? customPrice : Number(opt.dataset.price || 0);
      const q = Number(opt.dataset.qty || 0);
      availDisplay.textContent = `${q} units`;
      priceInput.value = p;
    } else {
      availDisplay.textContent = '-';
      priceInput.value = '0';
    }
    updateInvoiceCalculations();
  }

  stockSelect.addEventListener('change', () => {
    customPrice = null;
    onStockChange();
  });
  qtyInput.addEventListener('input', updateInvoiceCalculations);
  priceInput.addEventListener('input', updateInvoiceCalculations);

  removeBtn.addEventListener('click', () => {
    tr.remove();
    updateInvoiceCalculations();
  });

  if (selectedStockId) {
    onStockChange();
  }
}

// Calculate subtotal, discount, grand total
function updateInvoiceCalculations() {
  let subtotal = 0;
  const rows = el.invoiceItemsTableBody.querySelectorAll('.invoice-item-row');

  rows.forEach(r => {
    const qty = Number(r.querySelector('.qty-input').value) || 0;
    const price = Number(r.querySelector('.price-input').value) || 0;
    const lineTotal = qty * price;
    r.querySelector('.line-total-display').textContent = `Rs ${lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
    subtotal += lineTotal;
  });

  const discount = Number(el.invDiscountInput.value) || 0;
  const grandTotal = Math.max(0, subtotal - discount);

  el.invSubtotalDisplay.textContent = `Rs ${subtotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  el.invTotalDisplay.textContent = `Rs ${grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
}

// Save Invoice
el.invoiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const customerName = el.invCustomerNameInput.value.trim();
  if (!customerName) {
    showToast('Customer Name is required');
    return;
  }

  const rows = el.invoiceItemsTableBody.querySelectorAll('.invoice-item-row');
  if (rows.length === 0) {
    showToast('Add at least one item to the invoice');
    return;
  }

  const items = [];
  let subtotal = 0;

  for (const r of rows) {
    const sel = r.querySelector('.stock-select');
    const stockId = sel.value;
    const stockName = sel.selectedOptions[0]?.textContent?.split(' (In Stock:')[0] || 'Custom Item';
    const quantity = Number(r.querySelector('.qty-input').value) || 0;
    const price = Number(r.querySelector('.price-input').value) || 0;

    if (!stockId) {
      showToast('Please select a stock item for all rows');
      return;
    }
    if (quantity <= 0) {
      showToast('Quantity must be greater than 0');
      return;
    }

    const total = quantity * price;
    subtotal += total;

    items.push({
      stockId,
      stockName,
      quantity,
      price,
      total
    });
  }

  const discount = Number(el.invDiscountInput.value) || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  const newInvoice = {
    id: `invc-${Date.now()}`,
    invoiceNumber: el.invNumberInput.value,
    customerName,
    customerPhone: el.invCustomerPhoneInput.value.trim(),
    customerAddress: el.invCustomerAddressInput.value.trim(),
    date: el.invDateInput.value,
    items,
    subtotal,
    discount,
    totalAmount,
    notes: el.invNotesInput.value.trim(),
    status: el.invStatusSelect.value
  };

  try {
    if (api.createInvoice) {
      await api.createInvoice(newInvoice);
    }
    showToast('Invoice created successfully');
    closeInvoiceModal();
    await reloadFromDatabase();
    renderInvoices();
    renderInventory();

    // Immediately open clean printable preview of created invoice
    openViewInvoice(newInvoice.id);
  } catch (err) {
    console.error('Error saving invoice:', err);
    showToast('Failed to save invoice');
  }
});

// View and Print Thermal Cash Receipt Sheet (Matching Reference Design)
window.openViewInvoice = function(invId, checkoutMeta = null) {
  closeAllActionMenus();
  const inv = (appData.invoices || []).find(i => i.id === invId);
  if (!inv) return;

  let items = [];
  try {
    items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
  } catch (e) {}

  let totalQtyCount = 0;
  let receiptItemsHtml = '';
  items.forEach((it) => {
    const qty = Number(it.quantity) || 0;
    totalQtyCount += qty;
    const priceFormatted = Number(it.price || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
    const lineTotalFormatted = Number(it.total || (qty * (it.price || 0))).toLocaleString('en-PK', { minimumFractionDigits: 2 });

    receiptItemsHtml += `
      <tr>
        <td class="tr-item-desc" colspan="4">${escapeHtml(it.stockName)}</td>
      </tr>
      <tr>
        <td style="color: #6b7280; font-size: 10.5px;">&nbsp;&nbsp;Code: ${escapeHtml((it.stockId || '').substring(0, 8))}</td>
        <td style="text-align: center;">${qty}</td>
        <td style="text-align: right;">${priceFormatted}</td>
        <td style="text-align: right; font-weight: 700;">${lineTotalFormatted}</td>
      </tr>
    `;
  });

  const subtotalFormatted = Number(inv.subtotal || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
  const discountFormatted = Number(inv.discount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
  const totalFormatted = Number(inv.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });

  const cashPaid = checkoutMeta && checkoutMeta.cashReceived ? Number(checkoutMeta.cashReceived) : Number(inv.totalAmount || 0);
  const changeDue = checkoutMeta && checkoutMeta.changeDue ? Number(checkoutMeta.changeDue) : 0;
  const paymentMode = checkoutMeta && checkoutMeta.paymentMode ? checkoutMeta.paymentMode : (inv.status === 'Paid' ? 'CASH' : 'PENDING');

  const barcodeNumber = String(inv.invoiceNumber || 'INV-1001').replace(/[^a-zA-Z0-9]/g, '');

  el.printableInvoiceSheet.innerHTML = `
    <div class="thermal-receipt-paper">
      <!-- Store Header -->
      <div class="tr-store-header">
        <div class="tr-store-name">SHAHZAIB TRADERS</div>
        <div class="tr-store-sub">Wholesale & Industrial Hardware Distribution</div>
        <div class="tr-store-sub">Circular Road, Badami Bagh, Lahore</div>
        <div class="tr-store-sub">Tel: +92 300 1234567 | NTN: 829104-5</div>
      </div>

      <!-- Top Barcode (matches reference image receipts 1, 3) -->
      <div class="tr-barcode-box">
        <svg class="tr-barcode-svg" viewBox="0 0 160 30" preserveAspectRatio="none">
          <rect x="0" y="0" width="3" height="30" fill="#111827"/>
          <rect x="5" y="0" width="1" height="30" fill="#111827"/>
          <rect x="8" y="0" width="4" height="30" fill="#111827"/>
          <rect x="14" y="0" width="2" height="30" fill="#111827"/>
          <rect x="18" y="0" width="1" height="30" fill="#111827"/>
          <rect x="22" y="0" width="5" height="30" fill="#111827"/>
          <rect x="29" y="0" width="2" height="30" fill="#111827"/>
          <rect x="33" y="0" width="3" height="30" fill="#111827"/>
          <rect x="38" y="0" width="1" height="30" fill="#111827"/>
          <rect x="42" y="0" width="4" height="30" fill="#111827"/>
          <rect x="48" y="0" width="2" height="30" fill="#111827"/>
          <rect x="52" y="0" width="1" height="30" fill="#111827"/>
          <rect x="56" y="0" width="3" height="30" fill="#111827"/>
          <rect x="61" y="0" width="5" height="30" fill="#111827"/>
          <rect x="68" y="0" width="2" height="30" fill="#111827"/>
          <rect x="73" y="0" width="4" height="30" fill="#111827"/>
          <rect x="79" y="0" width="1" height="30" fill="#111827"/>
          <rect x="83" y="0" width="3" height="30" fill="#111827"/>
          <rect x="88" y="0" width="2" height="30" fill="#111827"/>
          <rect x="92" y="0" width="4" height="30" fill="#111827"/>
          <rect x="98" y="0" width="1" height="30" fill="#111827"/>
          <rect x="102" y="0" width="3" height="30" fill="#111827"/>
          <rect x="107" y="0" width="5" height="30" fill="#111827"/>
          <rect x="114" y="0" width="2" height="30" fill="#111827"/>
          <rect x="118" y="0" width="4" height="30" fill="#111827"/>
          <rect x="124" y="0" width="1" height="30" fill="#111827"/>
          <rect x="128" y="0" width="3" height="30" fill="#111827"/>
          <rect x="133" y="0" width="2" height="30" fill="#111827"/>
          <rect x="137" y="0" width="5" height="30" fill="#111827"/>
          <rect x="144" y="0" width="2" height="30" fill="#111827"/>
          <rect x="148" y="0" width="4" height="30" fill="#111827"/>
          <rect x="154" y="0" width="2" height="30" fill="#111827"/>
          <rect x="158" y="0" width="2" height="30" fill="#111827"/>
        </svg>
        <span class="tr-barcode-code">* ${escapeHtml(barcodeNumber)} *</span>
      </div>

      <div class="tr-title-pill">*** CASH RECEIPT ***</div>

      <!-- Receipt Metadata -->
      <table class="tr-meta-table">
        <tr>
          <td class="tr-meta-label">RECEIPT #:</td>
          <td class="tr-meta-val">${escapeHtml(inv.invoiceNumber)}</td>
        </tr>
        <tr>
          <td class="tr-meta-label">DATE/TIME:</td>
          <td class="tr-meta-val">${escapeHtml(inv.date)}</td>
        </tr>
        <tr>
          <td class="tr-meta-label">CUSTOMER:</td>
          <td class="tr-meta-val">${escapeHtml(inv.customerName || 'Walk-in Customer')}</td>
        </tr>
        ${inv.customerPhone ? `<tr><td class="tr-meta-label">PHONE:</td><td class="tr-meta-val">${escapeHtml(inv.customerPhone)}</td></tr>` : ''}
        <tr>
          <td class="tr-meta-label">PAYMENT:</td>
          <td class="tr-meta-val">${escapeHtml(paymentMode)}</td>
        </tr>
        <tr>
          <td class="tr-meta-label">OPERATOR:</td>
          <td class="tr-meta-val">Counter #1 (Admin)</td>
        </tr>
      </table>

      <div class="tr-dashed-divider"></div>

      <!-- Line Items Table -->
      <table class="tr-items-table">
        <thead>
          <tr>
            <th style="text-align: left; width: 44%;">ITEM</th>
            <th style="text-align: center; width: 14%;">QTY</th>
            <th style="text-align: right; width: 21%;">RATE</th>
            <th style="text-align: right; width: 21%;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${receiptItemsHtml}
        </tbody>
      </table>

      <div class="tr-dashed-divider"></div>

      <!-- Summary Table -->
      <table class="tr-summary-table">
        <tr>
          <td>TOTAL ITEMS:</td>
          <td style="text-align: right; font-weight: 700;">${totalQtyCount}</td>
        </tr>
        <tr>
          <td>SUBTOTAL:</td>
          <td style="text-align: right;">PKR ${subtotalFormatted}</td>
        </tr>
        ${Number(inv.discount || 0) > 0 ? `
        <tr>
          <td>DISCOUNT:</td>
          <td style="text-align: right; color: #dc2626;">- PKR ${discountFormatted}</td>
        </tr>` : ''}
        <tr>
          <td>TAX (0%):</td>
          <td style="text-align: right;">PKR 0.00</td>
        </tr>
        <tr class="tr-grand-total-row">
          <td colspan="2"><div class="tr-heavy-divider"></div></td>
        </tr>
        <tr class="tr-grand-total-row">
          <td>GRAND TOTAL:</td>
          <td style="text-align: right;">PKR ${totalFormatted}</td>
        </tr>
        <tr class="tr-grand-total-row">
          <td colspan="2"><div class="tr-heavy-divider"></div></td>
        </tr>
        ${cashPaid > 0 ? `
        <tr>
          <td>CASH PAID:</td>
          <td style="text-align: right; font-weight: 600;">PKR ${Number(cashPaid).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>CHANGE DUE:</td>
          <td style="text-align: right; font-weight: 700; color: #059669;">PKR ${Number(changeDue).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
        </tr>` : ''}
      </table>

      <div class="tr-dashed-divider"></div>

      <!-- QR Code & Footer (matches reference image receipts 4, 5, 8) -->
      <div class="tr-footer-section">
        <svg class="tr-qr-svg" viewBox="0 0 100 100" fill="#111827">
          <rect x="5" y="5" width="28" height="28" fill="#111827"/>
          <rect x="9" y="9" width="20" height="20" fill="#ffffff"/>
          <rect x="13" y="13" width="12" height="12" fill="#111827"/>
          <rect x="67" y="5" width="28" height="28" fill="#111827"/>
          <rect x="71" y="9" width="20" height="20" fill="#ffffff"/>
          <rect x="75" y="13" width="12" height="12" fill="#111827"/>
          <rect x="5" y="67" width="28" height="28" fill="#111827"/>
          <rect x="9" y="71" width="20" height="20" fill="#ffffff"/>
          <rect x="13" y="75" width="12" height="12" fill="#111827"/>
          <rect x="40" y="8" width="5" height="5"/>
          <rect x="49" y="8" width="5" height="5"/>
          <rect x="58" y="8" width="5" height="5"/>
          <rect x="8" y="40" width="5" height="5"/>
          <rect x="8" y="49" width="5" height="5"/>
          <rect x="8" y="58" width="5" height="5"/>
          <rect x="40" y="40" width="6" height="6"/>
          <rect x="50" y="40" width="6" height="6"/>
          <rect x="40" y="50" width="6" height="6"/>
          <rect x="50" y="50" width="6" height="6"/>
          <rect x="60" y="40" width="6" height="6"/>
          <rect x="40" y="60" width="6" height="6"/>
          <rect x="50" y="60" width="6" height="6"/>
          <rect x="60" y="60" width="6" height="6"/>
          <rect x="72" y="40" width="5" height="5"/>
          <rect x="82" y="45" width="5" height="5"/>
          <rect x="72" y="55" width="5" height="5"/>
          <rect x="82" y="65" width="5" height="5"/>
          <rect x="40" y="72" width="5" height="5"/>
          <rect x="45" y="82" width="5" height="5"/>
          <rect x="55" y="72" width="5" height="5"/>
          <rect x="65" y="82" width="5" height="5"/>
          <rect x="75" y="75" width="5" height="5"/>
          <rect x="85" y="85" width="5" height="5"/>
        </svg>
        <div class="tr-thank-you">THANK YOU FOR YOUR PURCHASE!</div>
        <div class="tr-notice">Please retain receipt for exchange within 3 days.</div>
        <div class="tr-notice">Software by Shahzaib Traders POS</div>
      </div>
    </div>
  `;

  el.modalViewInvoice.classList.remove('hidden');
};

function closeViewInvoiceModal() {
  el.modalViewInvoice.classList.add('hidden');
}

// Delete Invoice Confirm
window.confirmDeleteInvoice = function(invId) {
  closeAllActionMenus();
  const inv = (appData.invoices || []).find(i => i.id === invId);
  const name = inv ? inv.invoiceNumber : 'this invoice';

  el.confirmTitle.textContent = 'Delete Invoice';
  el.confirmMessage.textContent = `Are you sure you want to delete invoice ${name}? This action cannot be undone.`;

  pendingDeleteAction = async () => {
    if (api.deleteInvoice) {
      await api.deleteInvoice(invId);
    }
    showToast('Invoice deleted');
    await reloadFromDatabase();
    renderInvoices();
  };

  el.modalConfirm.classList.remove('hidden');
};

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
  el.summaryTotalWholesale.textContent = `$${(qty * wholesale).toFixed(2)}`;
  el.summaryTotalIndividual.textContent = `$${(qty * individual).toFixed(2)}`;
}

function refreshVendorDropdowns(selectedVendorId = null) {
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

// Vendor Form Submit
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

// Confirm Delete Handler
el.btnExecuteConfirm.addEventListener('click', async () => {
  if (pendingDeleteAction) await pendingDeleteAction();
  closeConfirmModal();
});

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
// Close radial menu when clicking outside
document.addEventListener('click', (e) => {
  if (el.radialExportWidget && !el.radialExportWidget.contains(e.target)) {
    closeRadialExportMenu();
  }
});

// Close radial menu on Escape
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
if (el.navInvoiceBtn) el.navInvoiceBtn.addEventListener('click', () => switchTab('invoices'));

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

// Shop / POS Event Listeners
if (el.btnShopTabCounter) {
  el.btnShopTabCounter.addEventListener('click', () => switchShopSubTab('counter'));
}
if (el.btnShopTabHistory) {
  el.btnShopTabHistory.addEventListener('click', () => switchShopSubTab('history'));
}

if (el.shopCatalogSearch) {
  el.shopCatalogSearch.addEventListener('input', (e) => {
    if (el.btnClearShopSearch) {
      if (e.target.value) el.btnClearShopSearch.classList.remove('hidden');
      else el.btnClearShopSearch.classList.add('hidden');
    }
    renderShopProducts();
  });
}

if (el.btnClearShopSearch) {
  el.btnClearShopSearch.addEventListener('click', () => {
    if (el.shopCatalogSearch) el.shopCatalogSearch.value = '';
    el.btnClearShopSearch.classList.add('hidden');
    renderShopProducts();
  });
}

document.querySelectorAll('.shop-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.shop-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    posSelectedFilter = chip.dataset.filter || 'all';
    renderShopProducts();
  });
});

document.querySelectorAll('.btn-pay-mode').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-pay-mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    posPaymentMode = btn.dataset.mode || 'Cash';
  });
});

if (el.posDiscountInput) {
  el.posDiscountInput.addEventListener('input', () => renderPosCart());
}
if (el.posCashReceived) {
  el.posCashReceived.addEventListener('input', () => renderPosCart());
}
if (el.btnClearCart) {
  el.btnClearCart.addEventListener('click', clearPosCart);
}
if (el.btnCheckoutOrder) {
  el.btnCheckoutOrder.addEventListener('click', checkoutPosSale);
}

// Invoice Event Listeners
if (el.btnOpenCreateInvoice) el.btnOpenCreateInvoice.addEventListener('click', openCreateInvoiceModal);
if (el.btnCloseInvoiceModal) el.btnCloseInvoiceModal.addEventListener('click', closeInvoiceModal);
if (el.btnCancelInvoice) el.btnCancelInvoice.addEventListener('click', closeInvoiceModal);
if (el.btnAddInvoiceItemRow) el.btnAddInvoiceItemRow.addEventListener('click', () => addInvoiceItemRow());
if (el.invDiscountInput) el.invDiscountInput.addEventListener('input', updateInvoiceCalculations);

if (el.btnCloseViewInvoiceModal) el.btnCloseViewInvoiceModal.addEventListener('click', closeViewInvoiceModal);
if (el.btnPrintInvoice) el.btnPrintInvoice.addEventListener('click', () => window.print());

if (el.invoiceSearchInput) {
  el.invoiceSearchInput.addEventListener('input', (e) => {
    if (el.btnClearInvoiceSearch) {
      if (e.target.value) el.btnClearInvoiceSearch.classList.remove('hidden');
      else el.btnClearInvoiceSearch.classList.add('hidden');
    }
    invoicePage = 1;
    renderInvoices();
  });
}
if (el.invoiceSearchBy) el.invoiceSearchBy.addEventListener('change', () => { invoicePage = 1; renderInvoices(); });
if (el.btnClearInvoiceSearch) {
  el.btnClearInvoiceSearch.addEventListener('click', () => {
    el.invoiceSearchInput.value = '';
    el.btnClearInvoiceSearch.classList.add('hidden');
    invoicePage = 1;
    renderInvoices();
  });
}
if (el.filterInvoiceStatus) el.filterInvoiceStatus.addEventListener('change', () => { invoicePage = 1; renderInvoices(); });
if (el.btnResetInvoiceFilters) {
  el.btnResetInvoiceFilters.addEventListener('click', () => {
    el.invoiceSearchInput.value = '';
    if (el.btnClearInvoiceSearch) el.btnClearInvoiceSearch.classList.add('hidden');
    el.invoiceSearchBy.value = 'all';
    el.filterInvoiceStatus.value = 'all';
    invoicePage = 1;
    renderInvoices();
  });
}

if (el.btnCloseConfirmModal) el.btnCloseConfirmModal.addEventListener('click', closeConfirmModal);
if (el.btnCancelConfirm) el.btnCancelConfirm.addEventListener('click', closeConfirmModal);

// Search & Filter Events for Inventory & Vendors
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
if (el.inventorySearchBy) el.inventorySearchBy.addEventListener('change', () => { inventoryPage = 1; renderInventory(); });
if (el.btnClearInventorySearch) {
  el.btnClearInventorySearch.addEventListener('click', () => {
    el.inventorySearchInput.value = '';
    el.btnClearInventorySearch.classList.add('hidden');
    inventoryPage = 1;
    renderInventory();
  });
}
if (el.filterStockLevelInput) el.filterStockLevelInput.addEventListener('input', () => { inventoryPage = 1; renderInventory(); });
if (el.filterDateOrder) el.filterDateOrder.addEventListener('change', () => { inventoryPage = 1; renderInventory(); });
if (el.btnResetInventoryFilters) {
  el.btnResetInventoryFilters.addEventListener('click', () => {
    if (el.inventorySearchInput) el.inventorySearchInput.value = '';
    if (el.btnClearInventorySearch) el.btnClearInventorySearch.classList.add('hidden');
    if (el.inventorySearchBy) el.inventorySearchBy.value = 'all';
    if (el.filterStockLevelInput) el.filterStockLevelInput.value = '';
    if (el.filterDateOrder) el.filterDateOrder.value = 'desc';
    inventoryPage = 1;
    renderInventory();
  });
}

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
if (el.vendorSearchBy) el.vendorSearchBy.addEventListener('change', () => { vendorPage = 1; renderVendors(); });
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

if (el.btnInvoicePrevPage) {
  el.btnInvoicePrevPage.addEventListener('click', () => {
    if (invoicePage > 1) {
      invoicePage--;
      renderInvoices();
    }
  });
}
if (el.btnInvoiceNextPage) {
  el.btnInvoiceNextPage.addEventListener('click', () => {
    const pageSize = getAdaptivePageSize('invoices');
    const totalPages = Math.ceil(getFilteredInvoices().length / pageSize) || 1;
    if (invoicePage < totalPages) {
      invoicePage++;
      renderInvoices();
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

// When sidebar is closed, clicking on the circle logo or brand header opens it immediately
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
  renderShopProducts();
  renderPosCart();
  renderInvoices();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else {
  // DOM is already parsed and ready
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
    } else if (currentTab === 'invoices') {
      renderShopProducts();
      renderInvoices();
    }
  }, 120);
});

