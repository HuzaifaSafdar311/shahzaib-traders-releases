// Application State
let appData = {
  vendors: [],
  inventory: [],
  invoices: []
};

let currentTab = 'dashboard'; // 'dashboard' | 'shop' | 'inventory' | 'vendors'
let pendingDeleteAction = null;
let returnToStockModalAfterVendor = false;

// Pagination State (Adaptive page size calculated dynamically to fit available screen height)
let inventoryPage = 1;
let vendorPage = 1;
let invoicePage = 1;

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
  navDashboardBtn: document.getElementById('navDashboardBtn'),
  navShopBtn: document.getElementById('navShopBtn'),
  navInvoiceBtn: document.getElementById('navInvoiceBtn'),
  navInventoryBtn: document.getElementById('navInventoryBtn'),
  navVendorBtn: document.getElementById('navVendorBtn'),

  dashboardView: document.getElementById('dashboardView'),
  shopView: document.getElementById('shopView'),
  invoiceView: document.getElementById('invoiceView'),
  inventoryView: document.getElementById('inventoryView'),
  vendorView: document.getElementById('vendorView'),

  badgeAlertCount: document.getElementById('badgeAlertCount'),
  badgeShopCount: document.getElementById('badgeShopCount'),
  badgeInvoiceCount: document.getElementById('badgeInvoiceCount'),
  badgeInventoryCount: document.getElementById('badgeInventoryCount'),
  badgeVendorCount: document.getElementById('badgeVendorCount'),

  // Dashboard Elements
  dashAlertBanner: document.getElementById('dashAlertBanner'),
  dashAlertSubtitle: document.getElementById('dashAlertSubtitle'),
  btnDismissDashAlert: document.getElementById('btnDismissDashAlert'),
  dashAlertCardsGrid: document.getElementById('dashAlertCardsGrid'),
  btnDashQuickSale: document.getElementById('btnDashQuickSale'),
  btnDashAddStock: document.getElementById('btnDashAddStock'),
  btnDashViewAllInvoices: document.getElementById('btnDashViewAllInvoices'),
  dashTotalInventoryItems: document.getElementById('dashTotalInventoryItems'),
  dashTotalInventoryUnits: document.getElementById('dashTotalInventoryUnits'),
  dashTotalSalesPKR: document.getElementById('dashTotalSalesPKR'),
  dashTotalUnitsSold: document.getElementById('dashTotalUnitsSold'),
  dashWholesaleValuePKR: document.getElementById('dashWholesaleValuePKR'),
  dashIndividualValuePKR: document.getElementById('dashIndividualValuePKR'),
  dashRemainingUnits: document.getElementById('dashRemainingUnits'),
  dashStockHealthStatus: document.getElementById('dashStockHealthStatus'),
  dashPotentialMarginPKR: document.getElementById('dashPotentialMarginPKR'),
  dashStockRatioPercent: document.getElementById('dashStockRatioPercent'),
  countHealthyStock: document.getElementById('countHealthyStock'),
  countLowStock: document.getElementById('countLowStock'),
  countOutStock: document.getElementById('countOutStock'),
  dashTopProductsList: document.getElementById('dashTopProductsList'),
  dashRecentSalesBody: document.getElementById('dashRecentSalesBody'),
  dashWholesaleSub: document.getElementById('dashWholesaleSub'),
  dashRetailSub: document.getElementById('dashRetailSub'),
  dashMarginSub: document.getElementById('dashMarginSub'),

  // Invoices Stat Strip Elements
  invStatTotalCount: document.getElementById('invStatTotalCount'),
  invStatSoldItemsCount: document.getElementById('invStatSoldItemsCount'),
  invStatTotalRevenue: document.getElementById('invStatTotalRevenue'),
  invStatPaidCount: document.getElementById('invStatPaidCount'),
  btnShopGoToInvoices: document.getElementById('btnShopGoToInvoices'),

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

  // Vendor Elements & Metrics
  vendorKpiTotalVendors: document.getElementById('vendorKpiTotalVendors'),
  vendorKpiTotalSkus: document.getElementById('vendorKpiTotalSkus'),
  vendorKpiTotalUnits: document.getElementById('vendorKpiTotalUnits'),
  vendorKpiTotalSpend: document.getElementById('vendorKpiTotalSpend'),
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
  stockPurchasePrice: document.getElementById('stockPurchasePrice'),
  stockWholesalePrice: document.getElementById('stockWholesalePrice'),
  stockIndividualPrice: document.getElementById('stockIndividualPrice'),
  stockDateInput: document.getElementById('stockDateInput'),
  summaryTotalPurchase: document.getElementById('summaryTotalPurchase'),
  summaryTotalWholesale: document.getElementById('summaryTotalWholesale'),
  summaryTotalIndividual: document.getElementById('summaryTotalIndividual'),
  btnQuickAddVendor: document.getElementById('btnQuickAddVendor'),

  // Vendor Modal Form
  modalVendor: document.getElementById('modalVendor'),
  modalVendorTitle: document.getElementById('modalVendorTitle'),
  btnCloseVendorModal: document.getElementById('btnCloseVendorModal'),
  btnCancelVendor: document.getElementById('btnCancelVendor'),
  vendorForm: document.getElementById('vendorForm'),
  vendorId: document.getElementById('vendorId'),
  vendorNameInput: document.getElementById('vendorNameInput'),
  vendorContactPersonInput: document.getElementById('vendorContactPersonInput'),
  vendorPhoneInput: document.getElementById('vendorPhoneInput'),

  // Vendor Profile & Purchase Record Modal
  modalVendorProfile: document.getElementById('modalVendorProfile'),
  btnCloseVendorProfileModal: document.getElementById('btnCloseVendorProfileModal'),
  btnVendorProfileAddStock: document.getElementById('btnVendorProfileAddStock'),
  btnVendorProfileEdit: document.getElementById('btnVendorProfileEdit'),
  vpVendorName: document.getElementById('vpVendorName'),
  vpContactPill: document.getElementById('vpContactPill'),
  vpAddressSubtitle: document.getElementById('vpAddressSubtitle'),
  vpPhoneText: document.getElementById('vpPhoneText'),
  vpEmailText: document.getElementById('vpEmailText'),
  vpDateText: document.getElementById('vpDateText'),
  vpTotalSkus: document.getElementById('vpTotalSkus'),
  vpTotalUnits: document.getElementById('vpTotalUnits'),
  vpInStockUnits: document.getElementById('vpInStockUnits'),
  vpTotalSpend: document.getElementById('vpTotalSpend'),
  vpItemCountSubtitle: document.getElementById('vpItemCountSubtitle'),
  vpStockTableBody: document.getElementById('vpStockTableBody'),
  vpStockEmptyState: document.getElementById('vpStockEmptyState'),
  vpNotesCard: document.getElementById('vpNotesCard'),
  vpNotesContent: document.getElementById('vpNotesContent'),

  // Shop POS & Billing Elements
  btnOpenCreateBill: document.getElementById('btnOpenCreateBill'),
  btnShopHeaderCreateBill: document.getElementById('btnShopHeaderCreateBill'),
  btnShopEmptyCreateBill: document.getElementById('btnShopEmptyCreateBill'),
  shopBillsSearchInput: document.getElementById('shopBillsSearchInput'),
  btnClearShopBillsSearch: document.getElementById('btnClearShopBillsSearch'),
  shopBillsTableBody: document.getElementById('shopBillsTableBody'),
  shopBillsEmptyState: document.getElementById('shopBillsEmptyState'),
  shopBillsCountSubtitle: document.getElementById('shopBillsCountSubtitle'),
  shopTodayBillsCount: document.getElementById('shopTodayBillsCount'),
  shopTodayBillsSub: document.getElementById('shopTodayBillsSub'),
  shopTodayRevenue: document.getElementById('shopTodayRevenue'),
  shopTotalBillsCount: document.getElementById('shopTotalBillsCount'),
  shopTotalRevenue: document.getElementById('shopTotalRevenue'),

  // Modal Create Bill Elements
  modalCreateBill: document.getElementById('modalCreateBill'),
  btnCloseCreateBillModal: document.getElementById('btnCloseCreateBillModal'),
  btnCancelCreateBill: document.getElementById('btnCancelCreateBill'),
  btnBillWalkInCustomer: document.getElementById('btnBillWalkInCustomer'),
  billInvoiceNumberBadge: document.getElementById('billInvoiceNumberBadge'),
  billCustomerName: document.getElementById('billCustomerName'),
  billCustomerPhone: document.getElementById('billCustomerPhone'),
  billDateInput: document.getElementById('billDateInput'),
  billPaymentMode: document.getElementById('billPaymentMode'),
  billStockSelect: document.getElementById('billStockSelect'),
  billItemPrice: document.getElementById('billItemPrice'),
  btnPriceRetail: document.getElementById('btnPriceRetail'),
  btnPriceWholesale: document.getElementById('btnPriceWholesale'),
  billItemQty: document.getElementById('billItemQty'),
  billItemStockAvailableText: document.getElementById('billItemStockAvailableText'),
  btnAddBillItem: document.getElementById('btnAddBillItem'),
  billItemsTableBody: document.getElementById('billItemsTableBody'),
  billItemsEmptyPrompt: document.getElementById('billItemsEmptyPrompt'),
  billNotesInput: document.getElementById('billNotesInput'),
  billSubtotalDisplay: document.getElementById('billSubtotalDisplay'),
  billDiscountInput: document.getElementById('billDiscountInput'),
  billGrandTotalDisplay: document.getElementById('billGrandTotalDisplay'),
  billCashReceived: document.getElementById('billCashReceived'),
  billChangeDueDisplay: document.getElementById('billChangeDueDisplay'),
  btnSaveBillOnly: document.getElementById('btnSaveBillOnly'),
  btnSaveAndPrintBill: document.getElementById('btnSaveAndPrintBill'),

  // Dedicated Slip / Receipt Page Elements
  receiptPageView: document.getElementById('receiptPageView'),
  receiptPageSheet: document.getElementById('receiptPageSheet'),
  btnReceiptBackToShop: document.getElementById('btnReceiptBackToShop'),
  btnPrintReceiptPage: document.getElementById('btnPrintReceiptPage'),

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

  // Low Stock Startup Alert Modal
  modalLowStockAlert: document.getElementById('modalLowStockAlert'),
  btnCloseLowStockModalX: document.getElementById('btnCloseLowStockModalX'),
  btnDismissLowStockAlert: document.getElementById('btnDismissLowStockAlert'),
  lowStockAlertBadge: document.getElementById('lowStockAlertBadge'),
  lowStockTimerBar: document.getElementById('lowStockTimerBar'),
  lowStockAlertTimerText: document.getElementById('lowStockAlertTimerText'),
  lowStockModalTableBody: document.getElementById('lowStockModalTableBody'),
  lowStockCountdownLabel: document.getElementById('lowStockCountdownLabel'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// Utilities
function showToast(message, type = 'info') {
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
  if (el.badgeInventoryCount) el.badgeInventoryCount.textContent = (appData.inventory || []).length;
  if (el.badgeVendorCount) el.badgeVendorCount.textContent = (appData.vendors || []).length;
  if (el.badgeInvoiceCount) el.badgeInvoiceCount.textContent = (appData.invoices || []).length;
  
  // Active Shop cart count badge
  if (el.badgeShopCount) {
    const cartCount = (posCart || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    el.badgeShopCount.textContent = cartCount;
  }

  // Low stock alert count badge (warning pulse if <= 10)
  const lowCount = (appData.inventory || []).filter(i => (Number(i.quantity) || 0) <= 10).length;
  if (el.badgeAlertCount) {
    if (lowCount > 0) {
      el.badgeAlertCount.textContent = `${lowCount} ⚠️`;
      el.badgeAlertCount.classList.remove('hidden');
    } else {
      el.badgeAlertCount.classList.add('hidden');
    }
  }
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
  if (tab === 'invoices') tab = 'dashboard';
  currentTab = tab;
  closeAllActionMenus();

  if (el.navDashboardBtn) el.navDashboardBtn.classList.toggle('active', tab === 'dashboard');
  if (el.navShopBtn) el.navShopBtn.classList.toggle('active', tab === 'shop');
  if (el.navInventoryBtn) el.navInventoryBtn.classList.toggle('active', tab === 'inventory');
  if (el.navVendorBtn) el.navVendorBtn.classList.toggle('active', tab === 'vendors');

  if (el.dashboardView) el.dashboardView.classList.toggle('active', tab === 'dashboard');
  if (el.shopView) el.shopView.classList.toggle('active', tab === 'shop');
  if (el.inventoryView) el.inventoryView.classList.toggle('active', tab === 'inventory');
  if (el.vendorView) el.vendorView.classList.toggle('active', tab === 'vendors');
  if (el.receiptPageView) el.receiptPageView.classList.toggle('active', tab === 'receiptPage');

  if (tab === 'dashboard') renderDashboard();
  else if (tab === 'shop') {
    renderShopBills();
  } else if (tab === 'inventory') {
    renderInventory();
  } else if (tab === 'vendors') {
    renderVendors();
  }
}

// ============================================
// DASHBOARD LOGIC (Metrics, Alerts & Visuals)
// ============================================
function renderDashboard() {
  const inventory = appData.inventory || [];
  const invoices = appData.invoices || [];

  const totalItemsCount = inventory.length;
  let totalUnits = 0;
  let totalSoldUnits = 0;
  let totalWholesale = 0;
  let totalIndividual = 0;
  let healthyCount = 0;
  let lowCount = 0;
  let outCount = 0;
  const lowStockItems = [];

  inventory.forEach(item => {
    const q = Number(item.quantity) || 0;
    const s = Number(item.totalSell) || 0;
    const wp = Number(item.wholesalePrice) || 0;
    const ip = Number(item.individualPrice) || 0;

    totalUnits += q;
    totalSoldUnits += s;
    totalWholesale += q * wp;
    totalIndividual += q * ip;

    if (q === 0) {
      outCount++;
      lowStockItems.push(item);
    } else if (q <= 10) {
      lowCount++;
      lowStockItems.push(item);
    } else {
      healthyCount++;
    }
  });

  const totalSalesPKR = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const potentialMargin = Math.max(0, totalIndividual - totalWholesale);

  // 1. Metric Cards
  if (el.dashTotalInventoryItems) el.dashTotalInventoryItems.textContent = `${totalItemsCount} Products`;
  if (el.dashTotalSalesPKR) el.dashTotalSalesPKR.textContent = `PKR ${totalSalesPKR.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.dashWholesaleValuePKR) el.dashWholesaleValuePKR.textContent = `PKR ${totalWholesale.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.dashIndividualValuePKR) el.dashIndividualValuePKR.textContent = `PKR ${totalIndividual.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.dashRemainingUnits) el.dashRemainingUnits.textContent = `${totalUnits.toLocaleString('en-PK')} Units`;
  if (el.dashPotentialMarginPKR) el.dashPotentialMarginPKR.textContent = `PKR ${potentialMargin.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  // 2. Low Stock Alert Banner & Cards
  if (el.dashAlertBanner && el.dashAlertCardsGrid) {
    if (lowStockItems.length > 0) {
      el.dashAlertBanner.classList.remove('hidden');
      if (el.dashAlertSubtitle) {
        el.dashAlertSubtitle.textContent = `${lowStockItems.length} items require restock`;
      }
      el.dashAlertCardsGrid.innerHTML = '';
      lowStockItems.slice(0, 8).forEach(item => {
        const q = Number(item.quantity) || 0;
        const isOut = q === 0;
        const card = document.createElement('div');
        card.className = 'alert-stock-card';
        card.innerHTML = `
          <div class="alert-card-header">
            <span class="alert-card-name" title="${escapeHtml(item.stockName)}">${escapeHtml(item.stockName)}</span>
            <span class="alert-card-qty-badge ${isOut ? 'out' : 'low'}">${isOut ? 'OUT OF STOCK' : `${q} left`}</span>
          </div>
          <div class="alert-card-meta">
            <span>Vendor: <strong>${escapeHtml(item.vendorName || 'General')}</strong></span>
            <button type="button" class="alert-card-btn" onclick="openEditStock('${item.id}')">Restock</button>
          </div>
        `;
        el.dashAlertCardsGrid.appendChild(card);
      });
    } else {
      el.dashAlertBanner.classList.add('hidden');
    }
  }

  // 3. Stock Health Donut Chart (SVG)
  const donutSvg = document.getElementById('stockDonutSvg');
  const donutLegend = document.getElementById('stockDonutLegend');
  if (donutLegend) {
    donutLegend.innerHTML = `
      <div class="donut-legend-item"><span class="legend-dot" style="background:#10b981"></span><span>Healthy: <strong>${healthyCount}</strong></span></div>
      <div class="donut-legend-item"><span class="legend-dot" style="background:#f59e0b"></span><span>Low: <strong>${lowCount}</strong></span></div>
      <div class="donut-legend-item"><span class="legend-dot" style="background:#ef4444"></span><span>Out: <strong>${outCount}</strong></span></div>
    `;
  }
  if (donutSvg) {
    donutSvg.innerHTML = '';
    const totalItems = healthyCount + lowCount + outCount;
    const cx = 60, cy = 60, r = 44, strokeW = 18;
    const circumference = 2 * Math.PI * r;
    const segments = [
      { label: 'Healthy', count: healthyCount, color: '#10b981' },
      { label: 'Low',     count: lowCount,     color: '#f59e0b' },
      { label: 'Out',     count: outCount,      color: '#ef4444' }
    ];
    const svgNS = 'http://www.w3.org/2000/svg';

    // Background circle
    const bgCircle = document.createElementNS(svgNS, 'circle');
    bgCircle.setAttribute('cx', cx); bgCircle.setAttribute('cy', cy); bgCircle.setAttribute('r', r);
    bgCircle.setAttribute('fill', 'none'); bgCircle.setAttribute('stroke', '#f1f5f9');
    bgCircle.setAttribute('stroke-width', strokeW);
    donutSvg.appendChild(bgCircle);

    if (totalItems === 0) {
      // Empty donut placeholder
      const ph = document.createElementNS(svgNS, 'circle');
      ph.setAttribute('cx', cx); ph.setAttribute('cy', cy); ph.setAttribute('r', r);
      ph.setAttribute('fill', 'none'); ph.setAttribute('stroke', '#e2e8f0');
      ph.setAttribute('stroke-width', strokeW);
      donutSvg.appendChild(ph);
    } else {
      let offset = 0;
      segments.forEach(seg => {
        if (seg.count === 0) return;
        const pct = seg.count / totalItems;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', r);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', seg.color);
        circle.setAttribute('stroke-width', strokeW);
        circle.setAttribute('stroke-dasharray', `${dash} ${gap}`);
        circle.setAttribute('stroke-dashoffset', -offset * circumference);
        circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
        circle.setAttribute('stroke-linecap', 'round');
        donutSvg.appendChild(circle);
        offset += pct;
      });
    }

    // Center text
    const centerText = document.createElementNS(svgNS, 'text');
    centerText.setAttribute('x', cx); centerText.setAttribute('y', cy + 5);
    centerText.setAttribute('text-anchor', 'middle');
    centerText.setAttribute('font-size', '18'); centerText.setAttribute('font-weight', '800');
    centerText.setAttribute('fill', '#111827');
    centerText.textContent = totalItems;
    donutSvg.appendChild(centerText);

    const centerSub = document.createElementNS(svgNS, 'text');
    centerSub.setAttribute('x', cx); centerSub.setAttribute('y', cy + 18);
    centerSub.setAttribute('text-anchor', 'middle');
    centerSub.setAttribute('font-size', '8'); centerSub.setAttribute('fill', '#94a3b8');
    centerSub.textContent = 'products';
    donutSvg.appendChild(centerSub);
  }

  // Update sold/stock ratio badge
  const totalRatio = totalSoldUnits + totalUnits;
  const soldPct = totalRatio > 0 ? Math.round((totalSoldUnits / totalRatio) * 100) : 0;
  if (el.dashStockRatioPercent) el.dashStockRatioPercent.textContent = `${soldPct}% Sold`;

  // Stock Health Status Counters
  if (el.countHealthyStock) el.countHealthyStock.textContent = healthyCount;
  if (el.countLowStock) el.countLowStock.textContent = lowCount;
  if (el.countOutStock) el.countOutStock.textContent = outCount;



  // 4. Top Selling Products — SVG Bar Chart
  if (el.dashTopProductsList) {
    el.dashTopProductsList.innerHTML = '';
    const sorted = [...inventory].sort((a, b) => (Number(b.totalSell) || 0) - (Number(a.totalSell) || 0));
    const top5 = sorted.slice(0, 5);
    const maxSell = top5.length > 0 ? Math.max(1, Number(top5[0].totalSell) || 1) : 1;

    if (top5.length === 0 || (Number(top5[0].totalSell) || 0) === 0) {
      el.dashTopProductsList.innerHTML = '<div style="color: var(--text-muted); font-size: 12.5px; padding: 20px 0; text-align:center;">No sales recorded yet.</div>';
    } else {
      const BAR_W = 48, GAP = 18, CHART_H = 110, LABEL_H = 36;
      const totalW = top5.length * (BAR_W + GAP) - GAP;
      const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444'];

      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('viewBox', `0 0 ${totalW + 20} ${CHART_H + LABEL_H}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.overflow = 'visible';

      top5.forEach((prod, i) => {
        const sold = Number(prod.totalSell) || 0;
        const barH = Math.max(4, Math.round((sold / maxSell) * CHART_H));
        const x = 10 + i * (BAR_W + GAP);
        const y = CHART_H - barH;
        const color = colors[i % colors.length];

        // Bar
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', BAR_W); rect.setAttribute('height', barH);
        rect.setAttribute('rx', 5); rect.setAttribute('fill', color);
        rect.setAttribute('opacity', '0.88');
        svg.appendChild(rect);

        // Value label on top
        const valText = document.createElementNS(svgNS, 'text');
        valText.setAttribute('x', x + BAR_W / 2); valText.setAttribute('y', y - 5);
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('font-size', '11'); valText.setAttribute('font-weight', '700');
        valText.setAttribute('fill', '#1e293b');
        valText.textContent = sold;
        svg.appendChild(valText);

        // Product name (truncated, rotated)
        const nameText = document.createElementNS(svgNS, 'text');
        const name = (prod.stockName || '').substring(0, 12) + ((prod.stockName || '').length > 12 ? '…' : '');
        nameText.setAttribute('x', x + BAR_W / 2);
        nameText.setAttribute('y', CHART_H + 14);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-size', '10'); nameText.setAttribute('fill', '#64748b');
        nameText.textContent = name;
        svg.appendChild(nameText);

        // Revenue sub-label
        const rate = Number(prod.individualPrice || prod.wholesalePrice || 0);
        const rev = sold * rate;
        const revText = document.createElementNS(svgNS, 'text');
        revText.setAttribute('x', x + BAR_W / 2);
        revText.setAttribute('y', CHART_H + 28);
        revText.setAttribute('text-anchor', 'middle');
        revText.setAttribute('font-size', '9'); revText.setAttribute('fill', '#10b981');
        revText.setAttribute('font-weight', '600');
        revText.textContent = `PKR ${rev >= 1000 ? (rev/1000).toFixed(1)+'k' : rev}`;
        svg.appendChild(revText);
      });

      el.dashTopProductsList.appendChild(svg);
    }
  }


  // 5. Recent Sales Stream
  if (el.dashRecentSalesBody) {
    el.dashRecentSalesBody.innerHTML = '';
    const recent = [...invoices].slice(0, 5);
    if (recent.length === 0) {
      el.dashRecentSalesBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 16px 0;">No invoices recorded yet.</td></tr>';
    } else {
      recent.forEach(inv => {
        let itemsArr = [];
        try {
          itemsArr = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
        } catch (e) {}

        const itemsSold = itemsArr.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        const totalFmt = Number(inv.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
        const isPaid = (inv.status === 'Paid');

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
          <td>${escapeHtml(inv.date || '')}</td>
          <td>${escapeHtml(inv.customerName || 'Walk-in Customer')}</td>
          <td>${itemsSold} units</td>
          <td><strong>PKR ${totalFmt}</strong></td>
          <td><span class="badge-status ${isPaid ? 'badge-paid' : 'badge-pending'}">${escapeHtml(inv.status || 'Paid')}</span></td>
          <td style="text-align: right;">
            <button type="button" class="btn-view-receipt-sm" onclick="openViewInvoice('${inv.id}')">View</button>
          </td>
        `;
        el.dashRecentSalesBody.appendChild(tr);
      });
    }
  }

  updateBadges();
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
      const purchase = Number(item.purchasePrice || 0).toFixed(2);
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
        <td class="col-price price-val">PKR ${Number(purchase).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
  let list = [...(appData.vendors || [])];
  const query = (el.vendorSearchInput ? el.vendorSearchInput.value : '').trim().toLowerCase();
  const searchBy = el.vendorSearchBy ? el.vendorSearchBy.value : 'all';

  if (query) {
    list = list.filter(v => {
      const name = (v.name || '').toLowerCase();
      const contact = (v.contactPerson || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();

      if (searchBy === 'name') return name.includes(query);
      if (searchBy === 'contactPerson') return contact.includes(query);
      if (searchBy === 'phone') return phone.includes(query);
      return name.includes(query) || contact.includes(query) || phone.includes(query);
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

  const allInventory = appData.inventory || [];
  el.vendorTableBody.innerHTML = '';

  if (total === 0) {
    el.vendorEmptyState.classList.remove('hidden');
  } else {
    el.vendorEmptyState.classList.add('hidden');
    pageItems.forEach(vendor => {
      const vItems = allInventory.filter(i => i.vendorId === vendor.id);
      const skusCount = vItems.length;
      const totalBoughtUnits = vItems.reduce((acc, i) => acc + (Number(i.quantity) || 0) + (Number(i.totalSell) || 0), 0);
      const inStockUnits = vItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
      const soldUnits = vItems.reduce((acc, i) => acc + (Number(i.totalSell) || 0), 0);
      const totalSpend = vItems.reduce((acc, i) => {
        const initialQty = (Number(i.quantity) || 0) + (Number(i.totalSell) || 0);
        const cost = Number(i.purchasePrice) || 0;
        return acc + (initialQty * cost);
      }, 0);

      const menuId = `menu-ven-${vendor.id}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-vendor-company">
          <div class="vendor-company-cell">
            <span class="vendor-company-title">
              ${escapeHtml(vendor.name)}
            </span>
            ${vendor.contactPerson ? `<span class="vendor-rep-tag">${escapeHtml(vendor.contactPerson)}</span>` : ''}
          </div>
        </td>
        <td class="col-vendor-contact">
          <div class="vendor-contact-cell">
            <span class="vendor-phone-line">${escapeHtml(vendor.phone || 'N/A')}</span>
          </div>
        </td>
        <td class="col-vendor-skus">
          <span class="vendor-badge-pill badge-sku">${skusCount} ${skusCount === 1 ? 'Product' : 'Products'}</span>
        </td>
        <td class="col-vendor-units">
          <span class="vendor-badge-pill badge-units">${totalBoughtUnits.toLocaleString()} Units</span>
          <span class="units-subtext">${inStockUnits.toLocaleString()} in stock · ${soldUnits.toLocaleString()} sold</span>
        </td>
        <td class="col-vendor-spend">
          PKR ${totalSpend.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td class="col-vendor-actions">
          <div class="vendor-action-btns">
            <button type="button" class="btn-view-record" onclick="openVendorProfile('${vendor.id}')" title="View Full Purchase Record & Supplier Profile">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Record</span>
            </button>
            <div class="dots-wrapper">
              <button type="button" class="btn-dots" onclick="toggleRowMenu(event, '${menuId}')" title="Actions" aria-label="Actions">
                <svg class="dots-icon" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="12" cy="19" r="2"></circle>
                </svg>
              </button>
              <div id="${menuId}" class="action-menu hidden">
                <button type="button" class="action-menu-item" onclick="openVendorProfile('${vendor.id}')">View Purchase Record</button>
                <button type="button" class="action-menu-item" onclick="openEditVendor('${vendor.id}')">Edit Vendor</button>
                <button type="button" class="action-menu-item danger" onclick="confirmDeleteVendor('${vendor.id}')">Delete Vendor</button>
              </div>
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
let posCurrentStep = 'cart'; // 'cart' | 'receipt'

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

// ============================================
// SHOP POS & BILLING SYSTEM LOGIC
// ============================================
let activeBillItems = [];
let selectedPriceMode = 'retail'; // 'retail' or 'wholesale'

function renderShopBills() {
  const allInvoices = appData.invoices || [];
  const todayStr = getTodayString();

  // Metrics calculation
  const todayBills = allInvoices.filter(i => (i.date || '').startsWith(todayStr) || (i.createdAt || '').startsWith(todayStr));
  const todayRevenue = todayBills.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const totalBills = allInvoices.length;
  const totalRevenue = allInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  if (el.shopTodayBillsCount) el.shopTodayBillsCount.textContent = todayBills.length;
  if (el.shopTodayBillsSub) el.shopTodayBillsSub.textContent = `${todayBills.length} sale${todayBills.length === 1 ? '' : 's'} recorded today`;
  if (el.shopTodayRevenue) el.shopTodayRevenue.textContent = `PKR ${todayRevenue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.shopTotalBillsCount) el.shopTotalBillsCount.textContent = totalBills;
  if (el.shopTotalRevenue) el.shopTotalRevenue.textContent = `PKR ${totalRevenue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.shopBillsCountSubtitle) el.shopBillsCountSubtitle.textContent = `${totalBills} invoice${totalBills === 1 ? '' : 's'} recorded`;

  // Filter bills
  const query = (el.shopBillsSearchInput ? el.shopBillsSearchInput.value : '').trim().toLowerCase();
  let filtered = [...allInvoices];
  if (query) {
    filtered = filtered.filter(inv => {
      const num = (inv.invoiceNumber || '').toLowerCase();
      const name = (inv.customerName || '').toLowerCase();
      const phone = (inv.customerPhone || '').toLowerCase();
      return num.includes(query) || name.includes(query) || phone.includes(query);
    });
  }

  if (!el.shopBillsTableBody) return;
  el.shopBillsTableBody.innerHTML = '';

  if (filtered.length === 0) {
    if (el.shopBillsEmptyState) el.shopBillsEmptyState.classList.remove('hidden');
    return;
  }
  if (el.shopBillsEmptyState) el.shopBillsEmptyState.classList.add('hidden');

  filtered.forEach(inv => {
    let items = [];
    try {
      items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    } catch (e) {
      items = [];
    }
    const itemsCount = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    const subtotal = Number(inv.subtotal) || 0;
    const discount = Number(inv.discount) || 0;
    const grandTotal = Number(inv.totalAmount) || 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-bill-no">
        <div class="bill-num-cell">
          <span class="bill-badge-pill">${escapeHtml(inv.invoiceNumber || 'INV-000')}</span>
        </div>
      </td>
      <td class="col-bill-date bill-date-cell">${escapeHtml(inv.date || '')}</td>
      <td class="col-bill-customer">
        <div class="bill-cust-cell">
          <span class="bill-cust-name">${escapeHtml(inv.customerName || 'Walk-in Customer')}</span>
          ${inv.customerPhone ? `<span class="bill-cust-phone">${escapeHtml(inv.customerPhone)}</span>` : ''}
        </div>
      </td>
      <td class="col-bill-items">
        <span class="bill-items-badge">${itemsCount}</span>
      </td>
      <td class="col-bill-subtotal">PKR ${subtotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
      <td class="col-bill-discount ${discount > 0 ? 'discount-applied' : ''}">
        ${discount > 0 ? `- PKR ${discount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}` : '-'}
      </td>
      <td class="col-bill-total">
        <span class="bill-total-cell">PKR ${grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
      </td>
      <td class="col-bill-status">
        <span class="status-badge status-paid">${escapeHtml(inv.status || 'Paid')}</span>
      </td>
      <td class="col-bill-actions">
        <div class="bill-actions-wrap">
          <button type="button" class="btn-bill-action btn-bill-slip" onclick="openReceiptPage('${inv.id}')" title="View & Print Slip">
            <span>🖨️ Slip</span>
          </button>
          <button type="button" class="btn-bill-action btn-bill-delete" onclick="confirmDeleteInvoice('${inv.id}')" title="Delete Bill">
            <span>🗑️</span>
          </button>
        </div>
      </td>
    `;
    el.shopBillsTableBody.appendChild(tr);
  });
}

function openCreateBillModal() {
  activeBillItems = [];
  selectedPriceMode = 'retail';

  if (el.billInvoiceNumberBadge) {
    el.billInvoiceNumberBadge.textContent = getNextInvoiceNumber();
  }
  if (el.billCustomerName) el.billCustomerName.value = '';
  if (el.billCustomerPhone) el.billCustomerPhone.value = '';
  if (el.billDateInput) el.billDateInput.value = getTodayString();
  if (el.billPaymentMode) el.billPaymentMode.value = 'Cash';
  if (el.billDiscountInput) el.billDiscountInput.value = '0';
  if (el.billCashReceived) el.billCashReceived.value = '';
  if (el.billNotesInput) el.billNotesInput.value = 'Goods once sold are returnable within 3 days with receipt. Thank you for your business!';

  // Refresh price pills
  if (el.btnPriceRetail && el.btnPriceWholesale) {
    el.btnPriceRetail.classList.add('active');
    el.btnPriceWholesale.classList.remove('active');
  }

  // Populate Stock Selector
  refreshBillStockSelector();

  renderBillItemsTable();
  updateBillTotals();

  if (el.modalCreateBill) el.modalCreateBill.classList.remove('hidden');
}

function closeCreateBillModal() {
  if (el.modalCreateBill) el.modalCreateBill.classList.add('hidden');
  activeBillItems = [];
}

function refreshBillStockSelector() {
  if (!el.billStockSelect) return;
  el.billStockSelect.innerHTML = '<option value="">-- Choose Stock Item --</option>';

  const items = appData.inventory || [];
  items.forEach(stk => {
    const available = Number(stk.quantity) || 0;
    const retail = Number(stk.individualPrice || stk.wholesalePrice || 0);
    const opt = document.createElement('option');
    opt.value = stk.id;
    if (available <= 0) {
      opt.textContent = `${stk.stockName} (OUT OF STOCK)`;
      opt.disabled = true;
    } else {
      opt.textContent = `${stk.stockName} - Stock: ${available} - Rs ${retail.toLocaleString('en-PK')}`;
    }
    el.billStockSelect.appendChild(opt);
  });

  if (el.billItemPrice) el.billItemPrice.value = '';
  if (el.billItemQty) el.billItemQty.value = '1';
  if (el.billItemStockAvailableText) {
    el.billItemStockAvailableText.textContent = 'Available: -';
    el.billItemStockAvailableText.style.color = '#64748b';
  }
}

function onBillStockSelected() {
  const stockId = el.billStockSelect ? el.billStockSelect.value : '';
  if (!stockId) {
    if (el.billItemPrice) el.billItemPrice.value = '';
    if (el.billItemStockAvailableText) el.billItemStockAvailableText.textContent = 'Available: -';
    return;
  }

  const stk = (appData.inventory || []).find(i => i.id === stockId);
  if (!stk) return;

  const available = Number(stk.quantity) || 0;
  const retail = Number(stk.individualPrice || stk.wholesalePrice || 0);
  const wholesale = Number(stk.wholesalePrice || stk.individualPrice || 0);

  if (el.billItemPrice) {
    el.billItemPrice.value = (selectedPriceMode === 'wholesale' ? wholesale : retail) || '';
  }
  if (el.billItemQty) {
    el.billItemQty.value = '1';
    el.billItemQty.max = available;
  }
  if (el.billItemStockAvailableText) {
    el.billItemStockAvailableText.textContent = `Available: ${available} units`;
    el.billItemStockAvailableText.style.color = available <= 5 ? '#dc2626' : '#059669';
  }
}

function setBillPriceMode(mode) {
  selectedPriceMode = mode;
  if (el.btnPriceRetail && el.btnPriceWholesale) {
    el.btnPriceRetail.classList.toggle('active', mode === 'retail');
    el.btnPriceWholesale.classList.toggle('active', mode === 'wholesale');
  }

  const stockId = el.billStockSelect ? el.billStockSelect.value : '';
  if (stockId) {
    const stk = (appData.inventory || []).find(i => i.id === stockId);
    if (stk && el.billItemPrice) {
      const retail = Number(stk.individualPrice || stk.wholesalePrice || 0);
      const wholesale = Number(stk.wholesalePrice || stk.individualPrice || 0);
      el.billItemPrice.value = (mode === 'wholesale' ? wholesale : retail) || '';
    }
  }
}

function addBillItem() {
  const stockId = el.billStockSelect ? el.billStockSelect.value : '';
  if (!stockId) {
    showToast('Please select a product from the list', 'warning');
    return;
  }

  const stk = (appData.inventory || []).find(i => i.id === stockId);
  if (!stk) return;

  const available = Number(stk.quantity) || 0;
  if (available <= 0) {
    showToast(`"${stk.stockName}" is out of stock`, 'error');
    return;
  }

  const qty = parseInt(el.billItemQty ? el.billItemQty.value : 1, 10) || 1;
  const price = parseFloat(el.billItemPrice ? el.billItemPrice.value : 0) || 0;

  if (qty <= 0) {
    showToast('Quantity must be at least 1', 'warning');
    return;
  }

  const existing = activeBillItems.find(it => it.stockId === stockId);
  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > available) {
      showToast(`Cannot add ${qty}. Only ${available} available in stock (${existing.quantity} already in bill).`, 'error');
      return;
    }
    existing.quantity = newQty;
    existing.price = price;
  } else {
    if (qty > available) {
      showToast(`Cannot add ${qty}. Only ${available} available in stock.`, 'error');
      return;
    }
    activeBillItems.push({
      stockId: stk.id,
      stockName: stk.stockName,
      maxAvailable: available,
      quantity: qty,
      price: price
    });
  }

  renderBillItemsTable();
  updateBillTotals();

  // Reset selector for next item
  if (el.billStockSelect) el.billStockSelect.value = '';
  if (el.billItemPrice) el.billItemPrice.value = '';
  if (el.billItemQty) el.billItemQty.value = '1';
  if (el.billItemStockAvailableText) el.billItemStockAvailableText.textContent = 'Available: -';
}

function updateBillItemQty(stockId, delta) {
  const item = activeBillItems.find(it => it.stockId === stockId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty > item.maxAvailable) {
    showToast(`Cannot exceed ${item.maxAvailable} available units in stock`, 'warning');
    return;
  }
  if (newQty <= 0) {
    removeBillItem(stockId);
    return;
  }
  item.quantity = newQty;
  renderBillItemsTable();
  updateBillTotals();
}

function removeBillItem(stockId) {
  activeBillItems = activeBillItems.filter(it => it.stockId !== stockId);
  renderBillItemsTable();
  updateBillTotals();
}

function renderBillItemsTable() {
  if (!el.billItemsTableBody) return;
  el.billItemsTableBody.innerHTML = '';

  if (activeBillItems.length === 0) {
    if (el.billItemsEmptyPrompt) el.billItemsEmptyPrompt.classList.remove('hidden');
    return;
  }
  if (el.billItemsEmptyPrompt) el.billItemsEmptyPrompt.classList.add('hidden');

  activeBillItems.forEach((it, idx) => {
    const lineTotal = it.price * it.quantity;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center; color: #64748b; font-size: 12px;">${idx + 1}</td>
      <td><strong>${escapeHtml(it.stockName)}</strong></td>
      <td style="text-align: center; color: #2563eb; font-weight: 600;">${it.maxAvailable}</td>
      <td style="text-align: center;">
        <div class="bill-qty-stepper">
          <button type="button" class="bill-step-btn" onclick="updateBillItemQty('${it.stockId}', -1)" title="Decrease">−</button>
          <span class="bill-step-val">${it.quantity}</span>
          <button type="button" class="bill-step-btn" onclick="updateBillItemQty('${it.stockId}', 1)" title="Increase">+</button>
        </div>
      </td>
      <td style="text-align: right;">Rs ${it.price.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: 700;">Rs ${lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: center;">
        <button type="button" class="btn-bill-del-item" onclick="removeBillItem('${it.stockId}')" title="Remove item">&times;</button>
      </td>
    `;
    el.billItemsTableBody.appendChild(tr);
  });
}

function updateBillTotals() {
  const subtotal = activeBillItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const discount = parseFloat(el.billDiscountInput ? el.billDiscountInput.value : 0) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const cashReceived = parseFloat(el.billCashReceived ? el.billCashReceived.value : 0) || 0;
  const changeDue = cashReceived > 0 ? Math.max(0, cashReceived - grandTotal) : 0;

  if (el.billSubtotalDisplay) el.billSubtotalDisplay.textContent = `PKR ${subtotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.billGrandTotalDisplay) el.billGrandTotalDisplay.textContent = `PKR ${grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.billChangeDueDisplay) el.billChangeDueDisplay.textContent = `PKR ${changeDue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
}

async function saveCustomerBill(andPrint = false) {
  const customerName = el.billCustomerName ? el.billCustomerName.value.trim() : '';
  if (!customerName) {
    showToast('Customer Name is required to generate bill', 'error');
    if (el.billCustomerName) el.billCustomerName.focus();
    return;
  }

  if (activeBillItems.length === 0) {
    showToast('Please add at least one item to the bill', 'warning');
    return;
  }

  // Stock check
  for (const it of activeBillItems) {
    const stk = (appData.inventory || []).find(i => i.id === it.stockId);
    const available = stk ? Number(stk.quantity || 0) : 0;
    if (it.quantity > available) {
      showToast(`Insufficient stock for "${it.stockName}". Available: ${available}, Bill: ${it.quantity}.`, 'error');
      return;
    }
  }

  const subtotal = activeBillItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const discount = parseFloat(el.billDiscountInput ? el.billDiscountInput.value : 0) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const cashReceived = parseFloat(el.billCashReceived ? el.billCashReceived.value : 0) || grandTotal;
  const changeDue = Math.max(0, cashReceived - grandTotal);
  const paymentMode = el.billPaymentMode ? el.billPaymentMode.value : 'Cash';
  const customerPhone = el.billCustomerPhone ? el.billCustomerPhone.value.trim() : '';
  const billDate = el.billDateInput && el.billDateInput.value ? el.billDateInput.value : getTodayString();
  const notes = el.billNotesInput ? el.billNotesInput.value.trim() : '';
  const invoiceNumber = getNextInvoiceNumber();

  const newInvoice = {
    id: `invc-${Date.now()}`,
    invoiceNumber: invoiceNumber,
    customerName: customerName,
    customerPhone: customerPhone,
    customerAddress: 'Counter Sale',
    date: billDate,
    items: activeBillItems.map(it => ({
      stockId: it.stockId,
      stockName: it.stockName,
      quantity: it.quantity,
      price: it.price,
      total: it.price * it.quantity
    })),
    subtotal: subtotal,
    discount: discount,
    totalAmount: grandTotal,
    notes: notes || `Paid via ${paymentMode}`,
    status: 'Paid',
    createdAt: new Date().toISOString()
  };

  try {
    const res = await api.createInvoice(newInvoice);
    if (res && res.success === false) {
      showToast(res.error || 'Failed to save bill', 'error');
      return;
    }

    await reloadFromDatabase();
    renderDashboard();
    renderInventory();
    renderShopBills();

    closeCreateBillModal();

    if (andPrint) {
      openReceiptPage(newInvoice.id, {
        cashReceived: cashReceived,
        changeDue: changeDue,
        paymentMode: paymentMode
      });
    }

    showToast(`Bill #${newInvoice.invoiceNumber} created successfully!`);
  } catch (err) {
    console.error('Error saving customer bill:', err);
    showToast('Error saving bill: ' + err.message, 'error');
  }
}

// Backward compatibility stubs
function renderShopProducts() {}
function renderPosCart() {}
function addToPosCart() {}
function updatePosCartQty() {}
function removeFromPosCart() {}
function clearPosCart() {}

window.openCreateBillModal = openCreateBillModal;
window.closeCreateBillModal = closeCreateBillModal;
window.updateBillItemQty = updateBillItemQty;
window.removeBillItem = removeBillItem;
window.addToPosCart = addToPosCart;
window.updatePosCartQty = updatePosCartQty;
window.removeFromPosCart = removeFromPosCart;
window.clearPosCart = clearPosCart;

// ============================================
// INVOICE MODULE LOGIC (Clean & Professional)
// ============================================
function getFilteredInvoices() {
  if (!el.invoiceSearchInput || !el.invoiceSearchBy || !el.filterInvoiceStatus) return [];
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
  if (!el.invoiceTableBody) return;
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

      const totalQtySold = itemsArr.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
      const totalFormatted = Number(inv.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
      const statusClass = (inv.status === 'Paid') ? 'badge-paid' : 'badge-pending';
      const menuId = `menu-invc-${inv.id}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-inv-no"><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
        <td class="col-inv-date">${escapeHtml(inv.date || '')}</td>
        <td class="col-inv-customer" title="${escapeHtml(inv.customerName)}">${escapeHtml(inv.customerName)}</td>
        <td class="col-inv-phone">${escapeHtml(inv.customerPhone || '-')}</td>
        <td class="col-inv-items"><strong>${totalQtySold}</strong></td>
        <td class="col-inv-total">PKR ${totalFormatted}</td>
        <td class="col-inv-status"><span class="badge-status ${statusClass}">${escapeHtml(inv.status || 'Paid')}</span></td>
        <td class="col-inv-actions">
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
  if (!el.invoicePaginationInfo || !el.btnInvoicePrevPage || !el.btnInvoiceNextPage) return;
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
if (el.invoiceForm) {
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
        showToast('Quantity must be greater than 0', 'warning');
        return;
      }

      const stockItem = appData.inventory.find(s => s.id === stockId);
      const available = stockItem ? Number(stockItem.quantity || 0) : 0;
      if (quantity > available) {
        showToast(`Cannot create invoice! Insufficient stock for "${stockName}". Available: ${available}, Requested: ${quantity}.`, 'error');
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
        const res = await api.createInvoice(newInvoice);
        if (res && res.success === false) {
          showToast(res.error || 'Failed to save invoice', 'error');
          return;
        }
      }
      showToast('Invoice created successfully');
      closeInvoiceModal();
      await reloadFromDatabase();
      renderDashboard();
      renderInvoices();
      renderInventory();

      // Immediately open clean printable preview of created invoice
      openViewInvoice(newInvoice.id);
    } catch (err) {
      console.error('Error saving invoice:', err);
      showToast('Failed to save invoice: ' + err.message, 'error');
    }
  });
}

// Generate Thermal Cash Receipt HTML String
function generateReceiptPaperHtml(inv, checkoutMeta = null) {
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

  return `
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
        ${(inv.customerPhone && inv.customerPhone.trim()) ? `<tr><td class="tr-meta-label">PHONE:</td><td class="tr-meta-val">${escapeHtml(inv.customerPhone)}</td></tr>` : ''}
        <tr>
          <td class="tr-meta-label">PAYMENT:</td>
          <td class="tr-meta-val">${escapeHtml(paymentMode)}</td>
        </tr>
        <tr>
          <td class="tr-meta-label">STATUS:</td>
          <td class="tr-meta-val" style="font-weight: 800; color: #16a34a;">PAID / VERIFIED</td>
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
}

// Open Dedicated Slip / Receipt Page View (No Popup Modal!)
window.openReceiptPage = function(invId, checkoutMeta = null) {
  closeAllActionMenus();
  if (el.modalViewInvoice) el.modalViewInvoice.classList.add('hidden');

  const inv = (appData.invoices || []).find(i => i.id === invId);
  if (!inv) return;

  const receiptHtml = generateReceiptPaperHtml(inv, checkoutMeta);

  if (el.receiptPageSheet) {
    el.receiptPageSheet.innerHTML = receiptHtml;
  }
  if (el.printableInvoiceSheet) {
    el.printableInvoiceSheet.innerHTML = receiptHtml;
  }

  switchTab('receiptPage');
  if (el.receiptPageView) {
    el.receiptPageView.scrollTop = 0;
  }
};

// Also route openViewInvoice to the dedicated receipt page
window.openViewInvoice = function(invId, checkoutMeta = null) {
  openReceiptPage(invId, checkoutMeta);
};

function closeViewInvoiceModal() {
  if (el.modalViewInvoice) el.modalViewInvoice.classList.add('hidden');
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
    renderDashboard();
    renderShopBills();
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
  if (el.stockPurchasePrice) el.stockPurchasePrice.value = '';
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
  if (el.stockPurchasePrice) el.stockPurchasePrice.value = item.purchasePrice || 0;
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
  if (el.vendorContactPersonInput) el.vendorContactPersonInput.value = '';
  el.vendorPhoneInput.value = '';
  el.modalVendor.classList.remove('hidden');
}

window.openEditVendor = function(vendorId) {
  closeAllActionMenus();
  const vendor = appData.vendors.find(v => v.id === vendorId);
  if (!vendor) return;

  el.modalVendorTitle.textContent = 'Edit Vendor';
  el.vendorId.value = vendor.id;
  el.vendorNameInput.value = vendor.name || '';
  if (el.vendorContactPersonInput) el.vendorContactPersonInput.value = vendor.contactPerson || '';
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

function closeVendorProfileModal() {
  if (el.modalVendorProfile) el.modalVendorProfile.classList.add('hidden');
}

window.openVendorProfile = function(vendorId) {
  closeAllActionMenus();
  const vendor = (appData.vendors || []).find(v => v.id === vendorId);
  if (!vendor) return;

  const vItems = (appData.inventory || []).filter(i => i.vendorId === vendorId);
  const totalBoughtUnits = vItems.reduce((acc, i) => acc + (Number(i.quantity) || 0) + (Number(i.totalSell) || 0), 0);
  const inStockUnits = vItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const soldUnits = vItems.reduce((acc, i) => acc + (Number(i.totalSell) || 0), 0);
  const totalSpend = vItems.reduce((acc, i) => {
    const initialQty = (Number(i.quantity) || 0) + (Number(i.totalSell) || 0);
    const cost = Number(i.purchasePrice) || 0;
    return acc + (initialQty * cost);
  }, 0);

  if (el.vpVendorName) el.vpVendorName.textContent = vendor.name;
  if (el.vpContactPill) {
    if (vendor.contactPerson && vendor.contactPerson.trim()) {
      el.vpContactPill.textContent = `Rep: ${vendor.contactPerson.trim()}`;
      el.vpContactPill.classList.remove('hidden');
    } else {
      el.vpContactPill.classList.add('hidden');
    }
  }
  if (el.vpPhoneText) el.vpPhoneText.textContent = vendor.phone || 'N/A';
  if (el.vpDateText) el.vpDateText.textContent = `Partner since ${vendor.createdAt || '2025'}`;

  if (el.vpTotalSkus) el.vpTotalSkus.textContent = `${vItems.length} SKUs`;
  if (el.vpTotalUnits) el.vpTotalUnits.textContent = `${totalBoughtUnits.toLocaleString()} Units`;
  if (el.vpInStockUnits) el.vpInStockUnits.textContent = `${inStockUnits.toLocaleString()} Units`;
  if (el.vpTotalSpend) el.vpTotalSpend.textContent = `PKR ${totalSpend.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (el.vpItemCountSubtitle) el.vpItemCountSubtitle.textContent = `${vItems.length} product batches supplied by this vendor`;

  if (el.vpStockTableBody) {
    el.vpStockTableBody.innerHTML = '';
    if (vItems.length === 0) {
      if (el.vpStockEmptyState) el.vpStockEmptyState.classList.remove('hidden');
    } else {
      if (el.vpStockEmptyState) el.vpStockEmptyState.classList.add('hidden');
      vItems.forEach(item => {
        const initialQty = (Number(item.quantity) || 0) + (Number(item.totalSell) || 0);
        const inStock = Number(item.quantity) || 0;
        const sold = Number(item.totalSell) || 0;
        const cost = Number(item.purchasePrice) || 0;
        const totalBatchCost = initialQty * cost;
        const wholesale = Number(item.wholesalePrice) || 0;
        const retail = Number(item.individualPrice) || 0;

        let statusBadge = '<span class="status-badge status-paid">In Stock</span>';
        if (inStock === 0) {
          statusBadge = '<span class="status-badge" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;">Out of Stock</span>';
        } else if (inStock <= 15) {
          statusBadge = '<span class="status-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;">Low Stock</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(item.stockName)}</strong></td>
          <td>${escapeHtml(item.date || '')}</td>
          <td style="text-align: center; font-weight: 700;">${initialQty.toLocaleString()}</td>
          <td style="text-align: center; color: #2563eb; font-weight: 600;">${inStock.toLocaleString()}</td>
          <td style="text-align: center; color: #16a34a; font-weight: 600;">${sold.toLocaleString()}</td>
          <td style="text-align: right;">PKR ${cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-weight: 700;">PKR ${totalBatchCost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-size: 11px; color: #64748b;">
            Wholesale: PKR ${wholesale.toLocaleString()}<br>
            Retail: PKR ${retail.toLocaleString()}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
        `;
        el.vpStockTableBody.appendChild(tr);
      });
    }
  }


  if (el.btnVendorProfileAddStock) {
    el.btnVendorProfileAddStock.onclick = () => {
      closeVendorProfileModal();
      openAddStock();
      if (el.stockVendorSelect) el.stockVendorSelect.value = vendor.id;
    };
  }

  if (el.btnVendorProfileEdit) {
    el.btnVendorProfileEdit.onclick = () => {
      closeVendorProfileModal();
      openEditVendor(vendor.id);
    };
  }

  if (el.modalVendorProfile) el.modalVendorProfile.classList.remove('hidden');
};

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
  const purchase = Number(el.stockPurchasePrice ? el.stockPurchasePrice.value : 0) || 0;
  const wholesale = Number(el.stockWholesalePrice.value) || 0;
  const individual = Number(el.stockIndividualPrice.value) || 0;
  if (el.summaryTotalPurchase) el.summaryTotalPurchase.textContent = `PKR ${(qty * purchase).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.summaryTotalWholesale) el.summaryTotalWholesale.textContent = `PKR ${(qty * wholesale).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  if (el.summaryTotalIndividual) el.summaryTotalIndividual.textContent = `PKR ${(qty * individual).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
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
  const purchasePrice = Number(el.stockPurchasePrice ? el.stockPurchasePrice.value : 0) || 0;
  const wholesalePrice = Number(el.stockWholesalePrice.value);
  const individualPrice = Number(el.stockIndividualPrice.value);
  const date = el.stockDateInput.value;

  if (id) {
    const updated = { id, stockName, vendorId, vendorName, quantity, totalSell, purchasePrice, wholesalePrice, individualPrice, date };
    if (api.updateStock) await api.updateStock(updated);
    showToast('Stock item updated');
  } else {
    const newStock = { id: 'inv-' + Date.now(), stockName, vendorId, vendorName, quantity, totalSell, purchasePrice, wholesalePrice, individualPrice, date };
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
  const contactPerson = el.vendorContactPersonInput ? el.vendorContactPersonInput.value.trim() : '';
  const phone = el.vendorPhoneInput.value.trim();

  let createdVendorId = id;
  if (id) {
    const updated = { id, name, contactPerson, phone };
    if (api.updateVendor) await api.updateVendor(updated);
    showToast('Vendor updated');
  } else {
    createdVendorId = 'v-' + Date.now();
    const newVendor = { id: createdVendorId, name, contactPerson, phone, createdAt: getTodayString() };
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
if (el.navDashboardBtn) el.navDashboardBtn.addEventListener('click', () => switchTab('dashboard'));
if (el.navShopBtn) el.navShopBtn.addEventListener('click', () => switchTab('shop'));
if (el.navInventoryBtn) el.navInventoryBtn.addEventListener('click', () => switchTab('inventory'));
if (el.navVendorBtn) el.navVendorBtn.addEventListener('click', () => switchTab('vendors'));

// Dashboard & Shop Quick Action Listeners
if (el.btnDashQuickSale) el.btnDashQuickSale.addEventListener('click', () => switchTab('shop'));
if (el.btnDashAddStock) el.btnDashAddStock.addEventListener('click', openAddStock);
if (el.btnDismissDashAlert) el.btnDismissDashAlert.addEventListener('click', () => {
  if (el.dashAlertBanner) el.dashAlertBanner.classList.add('hidden');
});

if (el.btnOpenAddStock) el.btnOpenAddStock.addEventListener('click', openAddStock);
if (el.btnCloseStockModal) el.btnCloseStockModal.addEventListener('click', closeStockModal);
if (el.btnCancelStock) el.btnCancelStock.addEventListener('click', closeStockModal);
if (el.btnQuickAddVendor) el.btnQuickAddVendor.addEventListener('click', () => openAddVendor(true));

if (el.stockQtyInput) el.stockQtyInput.addEventListener('input', updateTotalPricesSummary);
if (el.stockPurchasePrice) el.stockPurchasePrice.addEventListener('input', updateTotalPricesSummary);
if (el.stockWholesalePrice) el.stockWholesalePrice.addEventListener('input', updateTotalPricesSummary);
if (el.stockIndividualPrice) el.stockIndividualPrice.addEventListener('input', updateTotalPricesSummary);

if (el.btnOpenAddVendor) el.btnOpenAddVendor.addEventListener('click', () => openAddVendor(false));
if (el.btnCloseVendorModal) el.btnCloseVendorModal.addEventListener('click', closeVendorModal);
if (el.btnCancelVendor) el.btnCancelVendor.addEventListener('click', closeVendorModal);
if (el.btnCloseVendorProfileModal) el.btnCloseVendorProfileModal.addEventListener('click', closeVendorProfileModal);
if (el.modalVendorProfile) {
  el.modalVendorProfile.addEventListener('click', (e) => {
    if (e.target === el.modalVendorProfile) closeVendorProfileModal();
  });
}

// Shop POS & Billing Event Listeners
if (el.btnOpenCreateBill) el.btnOpenCreateBill.addEventListener('click', openCreateBillModal);
if (el.btnShopHeaderCreateBill) el.btnShopHeaderCreateBill.addEventListener('click', openCreateBillModal);
if (el.btnShopEmptyCreateBill) el.btnShopEmptyCreateBill.addEventListener('click', openCreateBillModal);

if (el.btnCloseCreateBillModal) el.btnCloseCreateBillModal.addEventListener('click', closeCreateBillModal);
if (el.btnCancelCreateBill) el.btnCancelCreateBill.addEventListener('click', closeCreateBillModal);

if (el.btnBillWalkInCustomer) {
  el.btnBillWalkInCustomer.addEventListener('click', () => {
    if (el.billCustomerName) el.billCustomerName.value = 'Walk-in Customer';
    if (el.billCustomerPhone && !el.billCustomerPhone.value) el.billCustomerPhone.value = '0300-0000000';
  });
}

if (el.billStockSelect) {
  el.billStockSelect.addEventListener('change', onBillStockSelected);
}
if (el.btnPriceRetail) {
  el.btnPriceRetail.addEventListener('click', () => setBillPriceMode('retail'));
}
if (el.btnPriceWholesale) {
  el.btnPriceWholesale.addEventListener('click', () => setBillPriceMode('wholesale'));
}
if (el.btnAddBillItem) {
  el.btnAddBillItem.addEventListener('click', addBillItem);
}

if (el.billDiscountInput) {
  el.billDiscountInput.addEventListener('input', updateBillTotals);
}
if (el.billCashReceived) {
  el.billCashReceived.addEventListener('input', updateBillTotals);
}

if (el.btnSaveBillOnly) {
  el.btnSaveBillOnly.addEventListener('click', () => saveCustomerBill(false));
}
if (el.btnSaveAndPrintBill) {
  el.btnSaveAndPrintBill.addEventListener('click', () => saveCustomerBill(true));
}

// Shop Bills Search Filter
if (el.shopBillsSearchInput) {
  el.shopBillsSearchInput.addEventListener('input', (e) => {
    if (el.btnClearShopBillsSearch) {
      if (e.target.value) el.btnClearShopBillsSearch.classList.remove('hidden');
      else el.btnClearShopBillsSearch.classList.add('hidden');
    }
    renderShopBills();
  });
}
if (el.btnClearShopBillsSearch) {
  el.btnClearShopBillsSearch.addEventListener('click', () => {
    if (el.shopBillsSearchInput) el.shopBillsSearchInput.value = '';
    el.btnClearShopBillsSearch.classList.add('hidden');
    renderShopBills();
  });
}

// Dedicated Receipt Slip Page Toolbar Listeners
if (el.btnReceiptBackToShop) {
  el.btnReceiptBackToShop.addEventListener('click', () => switchTab('shop'));
}
if (el.btnPrintReceiptPage) {
  el.btnPrintReceiptPage.addEventListener('click', () => window.print());
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

// ========================================================
// LOW STOCK STARTUP ALERT POPUP (Mandatory 5-Second Review)
// ========================================================
let isLowStockAlertLocked = true;
let lowStockCountdownInterval = null;
let lowStockRemainingSeconds = 5;

function openLowStockStartupAlert(items) {
  if (!el.modalLowStockAlert || !items || items.length === 0) return;

  isLowStockAlertLocked = true;
  lowStockRemainingSeconds = 5;

  if (el.lowStockAlertBadge) {
    el.lowStockAlertBadge.textContent = `${items.length} ${items.length === 1 ? 'Item' : 'Items'}`;
  }

  if (el.lowStockModalTableBody) {
    el.lowStockModalTableBody.innerHTML = '';
    items.forEach(item => {
      const q = Number(item.quantity) || 0;
      const isOut = q === 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color: #0f172a;">${escapeHtml(item.stockName)}</strong></td>
        <td style="color: #64748b; font-size: 12.5px;">${escapeHtml(item.vendorName || 'General')}</td>
        <td style="text-align: center;">
          <span class="${isOut ? 'low-badge-out' : 'low-badge-warning'}">
            ${isOut ? 'Out of Stock' : `${q} Units`}
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-low-stock-restock" onclick="handleLowStockRestockClick('${item.id}')">Restock</button>
        </td>
      `;
      el.lowStockModalTableBody.appendChild(tr);
    });
  }

  // Lock dismiss buttons
  if (el.btnCloseLowStockModalX) {
    el.btnCloseLowStockModalX.disabled = true;
    el.btnCloseLowStockModalX.title = 'Close (Available in 5s)';
  }
  if (el.btnDismissLowStockAlert) {
    el.btnDismissLowStockAlert.disabled = true;
    el.btnDismissLowStockAlert.className = 'btn btn-secondary btn-dismiss-locked';
    el.btnDismissLowStockAlert.innerHTML = '<span>Closing available in 5s</span>';
  }
  if (el.lowStockAlertTimerText) {
    el.lowStockAlertTimerText.textContent = 'Please review low stock items. You can close this alert in 5 seconds.';
  }
  if (el.lowStockCountdownLabel) {
    el.lowStockCountdownLabel.textContent = 'Locked: 5s remaining';
  }

  // Trigger progress bar animation
  if (el.lowStockTimerBar) {
    el.lowStockTimerBar.style.transition = 'none';
    el.lowStockTimerBar.style.width = '0%';
    void el.lowStockTimerBar.offsetWidth; // Force reflow
    el.lowStockTimerBar.style.transition = 'width 5s linear';
    el.lowStockTimerBar.style.width = '100%';
  }

  // Show modal
  el.modalLowStockAlert.classList.remove('hidden');

  // Start 5-second countdown timer
  if (lowStockCountdownInterval) {
    clearInterval(lowStockCountdownInterval);
  }
  lowStockCountdownInterval = setInterval(() => {
    lowStockRemainingSeconds--;
    if (lowStockRemainingSeconds > 0) {
      if (el.lowStockAlertTimerText) {
        el.lowStockAlertTimerText.textContent = `Please review low stock items. You can close this alert in ${lowStockRemainingSeconds} second${lowStockRemainingSeconds === 1 ? '' : 's'}.`;
      }
      if (el.lowStockCountdownLabel) {
        el.lowStockCountdownLabel.textContent = `Locked: ${lowStockRemainingSeconds}s remaining`;
      }
      if (el.btnDismissLowStockAlert) {
        el.btnDismissLowStockAlert.innerHTML = `<span>Closing available in ${lowStockRemainingSeconds}s</span>`;
      }
    } else {
      clearInterval(lowStockCountdownInterval);
      lowStockCountdownInterval = null;
      isLowStockAlertLocked = false;

      if (el.btnCloseLowStockModalX) {
        el.btnCloseLowStockModalX.disabled = false;
        el.btnCloseLowStockModalX.title = 'Close Alert';
      }
      if (el.btnDismissLowStockAlert) {
        el.btnDismissLowStockAlert.disabled = false;
        el.btnDismissLowStockAlert.className = 'btn btn-primary';
        el.btnDismissLowStockAlert.innerHTML = '<span>&#10003; Acknowledge &amp; Close</span>';
      }
      if (el.lowStockAlertTimerText) {
        el.lowStockAlertTimerText.textContent = 'Review complete. You may now close this alert.';
      }
      if (el.lowStockCountdownLabel) {
        el.lowStockCountdownLabel.textContent = 'Unlocked (Ready to close)';
      }
    }
  }, 1000);
}

function closeLowStockStartupAlert() {
  if (isLowStockAlertLocked) return;
  if (lowStockCountdownInterval) {
    clearInterval(lowStockCountdownInterval);
    lowStockCountdownInterval = null;
  }
  if (el.modalLowStockAlert) {
    el.modalLowStockAlert.classList.add('hidden');
  }
}

window.handleLowStockRestockClick = function(stockId) {
  if (lowStockCountdownInterval) {
    clearInterval(lowStockCountdownInterval);
    lowStockCountdownInterval = null;
  }
  isLowStockAlertLocked = false;
  if (el.modalLowStockAlert) {
    el.modalLowStockAlert.classList.add('hidden');
  }
  if (window.openEditStock) {
    window.openEditStock(stockId);
  }
};

function checkLowStockStartupAlert() {
  const lowItems = (appData.inventory || []).filter(item => {
    const q = Number(item.quantity) || 0;
    return q <= 10;
  });

  if (lowItems.length > 0) {
    setTimeout(() => {
      openLowStockStartupAlert(lowItems);
    }, 450);
  }
}

if (el.btnCloseLowStockModalX) {
  el.btnCloseLowStockModalX.addEventListener('click', closeLowStockStartupAlert);
}
if (el.btnDismissLowStockAlert) {
  el.btnDismissLowStockAlert.addEventListener('click', closeLowStockStartupAlert);
}
if (el.modalLowStockAlert) {
  el.modalLowStockAlert.addEventListener('click', (e) => {
    if (e.target === el.modalLowStockAlert && !isLowStockAlertLocked) {
      closeLowStockStartupAlert();
    }
  });
}
if (el.dashAlertBanner) {
  el.dashAlertBanner.addEventListener('click', (e) => {
    if (e.target.closest('.alert-card-btn') || e.target.closest('#btnDismissDashAlert')) return;
    const lowItems = (appData.inventory || []).filter(item => (Number(item.quantity) || 0) <= 10);
    if (lowItems.length > 0) {
      openLowStockStartupAlert(lowItems);
    }
  });
}

// Initial Boot
let isAppInitialized = false;
async function init() {
  if (isAppInitialized) return;
  isAppInitialized = true;
  await reloadFromDatabase();
  renderDashboard();
  renderInventory();
  renderVendors();
  renderShopBills();
  renderInvoices();
  checkLowStockStartupAlert();
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
    if (currentTab === 'dashboard') {
      renderDashboard();
    } else if (currentTab === 'shop') {
      renderShopBills();
    } else if (currentTab === 'invoices') {
      renderInvoices();
    } else if (currentTab === 'inventory') {
      renderInventory();
    } else if (currentTab === 'vendors') {
      renderVendors();
    }
  }, 120);
});

