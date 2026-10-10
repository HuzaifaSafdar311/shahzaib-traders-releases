// Application State
let appData = {
  vendors: [],
  inventory: [],
  invoices: []
};

let currentTab = 'inventory'; // 'inventory' | 'vendors' | 'invoices'
let pendingDeleteAction = null;
let returnToStockModalAfterVendor = false;

// Pagination State (7 items per page)
let inventoryPage = 1;
const inventoryPageSize = 7;
let vendorPage = 1;
const vendorPageSize = 7;
let invoicePage = 1;
const invoicePageSize = 7;

// IPC Storage Bridge (SQLite Backend via window.electronAPI with fallback)
const api = window.electronAPI || {
  getData: async () => {
    const raw = localStorage.getItem('inventory_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      vendors: [
        { id: 'v-1', name: 'Apex Industrial Supplies', phone: '+92 300 1234567', createdAt: '2025-01-15' },
        { id: 'v-2', name: 'Global Tech Components', phone: '+92 321 9876543', createdAt: '2025-01-18' },
        { id: 'v-3', name: 'Metro Logistics & Hardware', phone: '+92 333 4567890', createdAt: '2025-02-01' }
      ],
      inventory: [
        { id: 'inv-1', stockName: 'Precision Ball Bearings 608RS', vendorId: 'v-1', vendorName: 'Apex Industrial Supplies', quantity: 250, totalSell: 42, wholesalePrice: 450, individualPrice: 600, date: '2025-02-10' },
        { id: 'inv-2', stockName: 'Solid State Relay 25A', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 80, totalSell: 16, wholesalePrice: 1800, individualPrice: 2400, date: '2025-02-12' },
        { id: 'inv-3', stockName: 'Heavy Duty Steel Brackets', vendorId: 'v-3', vendorName: 'Metro Logistics & Hardware', quantity: 120, totalSell: 35, wholesalePrice: 820, individualPrice: 1100, date: '2025-02-14' },
        { id: 'inv-4', stockName: 'Microcontroller Units ESP32', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 65, totalSell: 22, wholesalePrice: 950, individualPrice: 1400, date: '2025-02-18' }
      ],
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
  getInvoices: async () => [],
  createInvoice: async (inv) => ({ success: true }),
  deleteInvoice: async (id) => ({ success: true }),
  exportCSV: async ({ content, filename }) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
  }
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
  filterDateOrder: document.getElementById('filterDateOrder'),
  btnResetInventoryFilters: document.getElementById('btnResetInventoryFilters'),
  btnOpenAddStock: document.getElementById('btnOpenAddStock'),
  btnExportInventory: document.getElementById('btnExportInventory'),

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
    if (data) {
      appData = {
        vendors: data.vendors || [],
        inventory: data.inventory || [],
        invoices: data.invoices || []
      };
    }
  } catch (err) {
    console.error('Error reloading database data:', err);
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
  else if (tab === 'invoices') renderInvoices();
}

// ============================================
// INVENTORY TAB LOGIC
// ============================================
function getFilteredInventory() {
  let list = [...appData.inventory];
  const query = (el.inventorySearchInput.value || '').trim().toLowerCase();
  const searchBy = el.inventorySearchBy.value;

  if (query) {
    list = list.filter(item => {
      if (searchBy === 'stockName') return (item.stockName || '').toLowerCase().includes(query);
      if (searchBy === 'vendorName') return (item.vendorName || '').toLowerCase().includes(query);
      return (item.stockName || '').toLowerCase().includes(query) || (item.vendorName || '').toLowerCase().includes(query);
    });
  }

  const maxLevel = el.filterStockLevelInput.value;
  if (maxLevel !== '') {
    const num = Number(maxLevel);
    list = list.filter(item => item.quantity <= num);
  }

  const sortOrder = el.filterDateOrder.value;
  list.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0);
    const dateB = new Date(b.date || b.createdAt || 0);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return list;
}

function renderInventory() {
  const filtered = getFilteredInventory();
  const total = filtered.length;
  const totalPages = Math.ceil(total / inventoryPageSize) || 1;

  if (inventoryPage > totalPages) inventoryPage = totalPages;
  if (inventoryPage < 1) inventoryPage = 1;

  const start = (inventoryPage - 1) * inventoryPageSize;
  const pageItems = filtered.slice(start, start + inventoryPageSize);

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
        <td class="col-stock-name">
          <span class="stock-title">${escapeHtml(item.stockName)}</span>
        </td>
        <td class="col-vendor">${escapeHtml(item.vendorName || 'N/A')}</td>
        <td class="col-qty"><span class="qty-pill">${item.quantity}</span></td>
        <td class="col-sell">${sell}</td>
        <td class="col-price">$${wholesale}</td>
        <td class="col-price">$${individual}</td>
        <td class="col-date">${escapeHtml(item.date || '')}</td>
        <td class="col-dots-actions">
          <div class="dots-wrapper">
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions">&bull;&bull;&bull;</button>
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

  renderInventoryPagination(total, totalPages);
}

function renderInventoryPagination(total, totalPages) {
  const start = total === 0 ? 0 : (inventoryPage - 1) * inventoryPageSize + 1;
  const end = Math.min(inventoryPage * inventoryPageSize, total);
  el.inventoryPaginationInfo.textContent = `Showing ${start}-${end} of ${total} items`;

  el.btnInvPrevPage.disabled = inventoryPage <= 1;
  el.btnInvNextPage.disabled = inventoryPage >= totalPages;

  el.invPageNumbers.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn-page-number ${i === inventoryPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      inventoryPage = i;
      renderInventory();
    });
    el.invPageNumbers.appendChild(btn);
  }
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
  const totalPages = Math.ceil(total / vendorPageSize) || 1;

  if (vendorPage > totalPages) vendorPage = totalPages;
  if (vendorPage < 1) vendorPage = 1;

  const start = (vendorPage - 1) * vendorPageSize;
  const pageItems = filtered.slice(start, start + vendorPageSize);

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
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions">&bull;&bull;&bull;</button>
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

  renderVendorPagination(total, totalPages);
}

function renderVendorPagination(total, totalPages) {
  const start = total === 0 ? 0 : (vendorPage - 1) * vendorPageSize + 1;
  const end = Math.min(vendorPage * vendorPageSize, total);
  el.vendorPaginationInfo.textContent = `Showing ${start}-${end} of ${total} items`;

  el.btnVendorPrevPage.disabled = vendorPage <= 1;
  el.btnVendorNextPage.disabled = vendorPage >= totalPages;

  el.vendorPageNumbers.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn-page-number ${i === vendorPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      vendorPage = i;
      renderVendors();
    });
    el.vendorPageNumbers.appendChild(btn);
  }
}

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
  const totalPages = Math.ceil(total / invoicePageSize) || 1;

  if (invoicePage > totalPages) invoicePage = totalPages;
  if (invoicePage < 1) invoicePage = 1;

  const start = (invoicePage - 1) * invoicePageSize;
  const pageItems = filtered.slice(start, start + invoicePageSize);

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
            <button class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions">&bull;&bull;&bull;</button>
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

  renderInvoicePagination(total, totalPages);
}

function renderInvoicePagination(total, totalPages) {
  const start = total === 0 ? 0 : (invoicePage - 1) * invoicePageSize + 1;
  const end = Math.min(invoicePage * invoicePageSize, total);
  el.invoicePaginationInfo.textContent = `Showing ${start}-${end} of ${total} invoices`;

  el.btnInvoicePrevPage.disabled = invoicePage <= 1;
  el.btnInvoiceNextPage.disabled = invoicePage >= totalPages;

  el.invoicePageNumbers.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn-page-number ${i === invoicePage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      invoicePage = i;
      renderInvoices();
    });
    el.invoicePageNumbers.appendChild(btn);
  }
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

// View and Print Invoice Sheet
window.openViewInvoice = function(invId) {
  closeAllActionMenus();
  const inv = (appData.invoices || []).find(i => i.id === invId);
  if (!inv) return;

  let items = [];
  try {
    items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
  } catch (e) {}

  let itemsHtml = '';
  items.forEach((it, index) => {
    itemsHtml += `
      <tr>
        <td><strong>${index + 1}.</strong> ${escapeHtml(it.stockName)}</td>
        <td>${it.quantity}</td>
        <td>Rs ${Number(it.price || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
        <td>Rs ${Number(it.total || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  const subtotalFormatted = Number(inv.subtotal || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
  const discountFormatted = Number(inv.discount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
  const totalFormatted = Number(inv.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
  const statusColor = (inv.status === 'Paid') ? '#065f46' : '#92400e';

  el.printableInvoiceSheet.innerHTML = `
    <div class="print-header">
      <div class="print-brand">
        <img src="full-logo.png" alt="Shahzaib Traders" class="print-logo">
        <div class="print-company-name">SHAHZAIB TRADERS</div>
        <div class="print-company-sub">Wholesale & Industrial Hardware Distribution</div>
        <div class="print-company-sub">Phone: +92 300 0000000 | Email: sales@shahzaibtraders.com</div>
      </div>
      <div class="print-meta-right">
        <div class="print-invoice-title">INVOICE</div>
        <div class="print-meta-line"><strong>Invoice No:</strong> ${escapeHtml(inv.invoiceNumber)}</div>
        <div class="print-meta-line"><strong>Date:</strong> ${escapeHtml(inv.date)}</div>
        <div class="print-meta-line"><strong>Status:</strong> <span style="font-weight: 700; color: ${statusColor};">${escapeHtml(inv.status || 'Paid')}</span></div>
      </div>
    </div>

    <div class="print-parties-grid">
      <div class="party-box">
        <div class="party-box-title">Billed To (Customer)</div>
        <div class="party-name">${escapeHtml(inv.customerName)}</div>
        <div class="party-detail"><strong>Phone:</strong> ${escapeHtml(inv.customerPhone || 'N/A')}</div>
        <div class="party-detail"><strong>Address:</strong> ${escapeHtml(inv.customerAddress || 'N/A')}</div>
      </div>
      <div class="party-box">
        <div class="party-box-title">Payment & Shipment</div>
        <div class="party-detail"><strong>Payment Mode:</strong> Cash / Bank Transfer</div>
        <div class="party-detail"><strong>Issued By:</strong> Shahzaib Traders Sales Counter</div>
      </div>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="width: 15%;">Qty</th>
          <th style="width: 20%;">Rate</th>
          <th style="width: 20%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="print-footer-grid">
      <div class="print-notes-box">
        <div class="print-notes-title">Terms & Notes</div>
        <div class="print-notes-text">${escapeHtml(inv.notes || 'Goods sold in sound condition. Thank you for doing business with Shahzaib Traders.')}</div>
      </div>
      <div class="print-totals-box">
        <div class="print-total-row">
          <span>Subtotal:</span>
          <span>Rs ${subtotalFormatted}</span>
        </div>
        <div class="print-total-row">
          <span>Discount:</span>
          <span>Rs ${discountFormatted}</span>
        </div>
        <div class="print-total-row print-grand-total">
          <span>Grand Total:</span>
          <span>Rs ${totalFormatted}</span>
        </div>
      </div>
    </div>

    <div class="print-signature-area">
      <div class="signature-line">Customer Signature</div>
      <div class="signature-line">Authorized Signatory & Stamp</div>
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

// Export CSV Handler
el.btnExportInventory.addEventListener('click', async () => {
  if (appData.inventory.length === 0) {
    showToast('No inventory data to export');
    return;
  }
  let csv = 'Stock Name,Vendor,Total Stock,Total Sell,Wholesale Price,Individual Price,Date\r\n';
  appData.inventory.forEach(item => {
    const name = `"${(item.stockName || '').replace(/"/g, '""')}"`;
    const vendor = `"${(item.vendorName || '').replace(/"/g, '""')}"`;
    const qty = item.quantity;
    const sell = item.totalSell || 0;
    const whole = Number(item.wholesalePrice || 0).toFixed(2);
    const indiv = Number(item.individualPrice || 0).toFixed(2);
    const date = item.date || '';
    csv += `${name},${vendor},${qty},${sell},${whole},${indiv},${date}\r\n`;
  });

  const res = await api.exportCSV({ content: csv, filename: `inventory_${getTodayString()}.csv` });
  if (res && res.success) showToast('CSV export successful');
});

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
    if (e.target.value) el.btnClearInventorySearch.classList.remove('hidden');
    else el.btnClearInventorySearch.classList.add('hidden');
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

if (el.vendorSearchInput) {
  el.vendorSearchInput.addEventListener('input', (e) => {
    if (e.target.value) el.btnClearVendorSearch.classList.remove('hidden');
    else el.btnClearVendorSearch.classList.add('hidden');
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
if (el.filterInvoiceStatus) {
  el.filterInvoiceStatus.addEventListener('change', () => {
    invoicePage = 1;
    renderInvoices();
  });
}

if (el.btnResetInventoryFilters) {
  el.btnResetInventoryFilters.addEventListener('click', () => {
    el.inventorySearchInput.value = '';
    el.btnClearInventorySearch.classList.add('hidden');
    el.inventorySearchBy.value = 'all';
    el.filterStockLevelInput.value = '';
    el.filterDateOrder.value = 'desc';
    inventoryPage = 1;
    renderInventory();
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
const brandMini = document.querySelector('.brand-mini');

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

if (brandMini) {
  brandMini.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
      toggleSidebar();
    }
  });
}

try {
  if (localStorage.getItem('sidebar_collapsed') === 'true' && sidebarEl) {
    sidebarEl.classList.add('collapsed');
  }
} catch (e) {}

// Initial Boot
async function init() {
  await reloadFromDatabase();
  renderInventory();
}

window.addEventListener('DOMContentLoaded', init);
