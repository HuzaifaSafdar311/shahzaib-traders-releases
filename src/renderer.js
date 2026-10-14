// Shahzaib Traders - Main Application Orchestrator

// Global Application State (Enterprise Model)
window.appData = {
  units: [],
  product_types: [],
  product_categories: [],
  product_sub_categories: [],
  products: [],
  purchases: [],
  sales: [],
  sales_returns: []
};

// API Storage Bridge (Electron IPC with local storage fallback)
window.api = window.electronAPI || {
  getData: async () => ({
    units: [],
    product_types: [],
    product_categories: [],
    product_sub_categories: [],
    products: [],
    purchases: [],
    sales: [],
    sales_returns: []
  })
};

// DOM References
const appEl = {
  navInventoryMainBtn: document.getElementById('navInventoryMainBtn'),
  navGeneralInfoBtn: document.getElementById('navGeneralInfoBtn'),
  navSalesMainBtn: document.getElementById('navSalesMainBtn'),
  navAccountsMainBtn: document.getElementById('navAccountsMainBtn'),
  navToolsMainBtn: document.getElementById('navToolsMainBtn'),
  navReportsMainBtn: document.getElementById('navReportsMainBtn'),

  inventoryView: document.getElementById('inventoryView'),
  generalInfoView: document.getElementById('generalInfoView'),
  salesView: document.getElementById('salesView'),
  accountsView: document.getElementById('accountsView'),
  toolsView: document.getElementById('toolsView'),
  reportsView: document.getElementById('reportsView'),

  badgeProductsCount: document.getElementById('badgeProductsCount'),
  badgeCategoryCount: document.getElementById('badgeCategoryCount'),
  badgeSubCategoryCount: document.getElementById('badgeSubCategoryCount'),

  // Confirm Modal
  modalConfirm: document.getElementById('modalConfirm'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  btnCloseConfirmModal: document.getElementById('btnCloseConfirmModal'),
  btnCancelConfirm: document.getElementById('btnCancelConfirm'),
  btnExecuteConfirm: document.getElementById('btnExecuteConfirm'),

  // Sidebar
  sidebar: document.getElementById('sidebar'),
  btnToggleSidebar: document.getElementById('btnToggleSidebar'),
  brand: document.querySelector('.brand'),
  brandMini: document.querySelector('.brand-mini')
};

let currentPendingDelete = null;

// Confirm Modal Helpers
function openConfirmModal({ title, message, onConfirm }) {
  if (!appEl.modalConfirm) return;
  if (appEl.confirmTitle) appEl.confirmTitle.textContent = title || 'Confirm Action';
  if (appEl.confirmMessage) appEl.confirmMessage.textContent = message || 'Are you sure you want to proceed?';
  currentPendingDelete = onConfirm;
  appEl.modalConfirm.classList.remove('hidden');
}

function closeConfirmModal() {
  if (appEl.modalConfirm) appEl.modalConfirm.classList.add('hidden');
  currentPendingDelete = null;
}

if (appEl.btnCloseConfirmModal) appEl.btnCloseConfirmModal.addEventListener('click', closeConfirmModal);
if (appEl.btnCancelConfirm) appEl.btnCancelConfirm.addEventListener('click', closeConfirmModal);
if (appEl.btnExecuteConfirm) {
  appEl.btnExecuteConfirm.addEventListener('click', async () => {
    if (currentPendingDelete) await currentPendingDelete();
    closeConfirmModal();
  });
}

window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;

// Tab Switching
const mainTabs = {
  'general-info': { btn: 'navGeneralInfoBtn', view: 'generalInfoView' },
  'inventory': { btn: 'navInventoryMainBtn', view: 'inventoryView' },
  'sale': { btn: 'navSalesMainBtn', view: 'salesView' },
  'accounts': { btn: 'navAccountsMainBtn', view: 'accountsView' },
  'tools': { btn: 'navToolsMainBtn', view: 'toolsView' },
  'reports': { btn: 'navReportsMainBtn', view: 'reportsView' }
};

function switchTab(tab) {
  if (!mainTabs[tab]) tab = 'inventory';
  window.currentTab = tab;

  Object.entries(mainTabs).forEach(([key, config]) => {
    const isActive = (key === tab);
    const btn = appEl[config.btn];
    const view = appEl[config.view];
    if (btn) btn.classList.toggle('active', isActive);
    if (view) view.classList.toggle('active', isActive);
  });

  if (tab === 'general-info') {
    if (window.GeneralInfoModule && window.GeneralInfoModule.onActivate) {
      window.GeneralInfoModule.onActivate();
    }
  } else if (tab === 'inventory') {
    if (window.switchSubTab) {
      window.switchSubTab(window.currentSubTab || 'unit-info');
    }
  } else if (tab === 'sale') {
    reloadFromDatabase().then(() => {
      if (window.SalesModule && window.SalesModule.onActivate) {
        window.SalesModule.onActivate();
      }
    });
  } else if (tab === 'accounts') {
    if (window.AccountsModule && window.AccountsModule.onActivate) {
      window.AccountsModule.onActivate();
    }
  } else if (tab === 'reports') {
    if (window.ReportsModule && window.ReportsModule.onActivate) {
      window.ReportsModule.onActivate();
    }
  }
}

window.switchTab = switchTab;

if (appEl.navGeneralInfoBtn) appEl.navGeneralInfoBtn.addEventListener('click', () => switchTab('general-info'));
if (appEl.navInventoryMainBtn) appEl.navInventoryMainBtn.addEventListener('click', () => switchTab('inventory'));
if (appEl.navSalesMainBtn) appEl.navSalesMainBtn.addEventListener('click', () => switchTab('sale'));
if (appEl.navAccountsMainBtn) appEl.navAccountsMainBtn.addEventListener('click', () => switchTab('accounts'));
if (appEl.navToolsMainBtn) appEl.navToolsMainBtn.addEventListener('click', () => switchTab('tools'));
if (appEl.navReportsMainBtn) appEl.navReportsMainBtn.addEventListener('click', () => switchTab('reports'));


// Badges Update
function updateBadges() {
  const prodCount = (window.appData && window.appData.products ? window.appData.products.length : 0);
  const catCount = (window.appData && window.appData.product_categories ? window.appData.product_categories.length : 0);
  const subCatCount = (window.appData && window.appData.product_sub_categories ? window.appData.product_sub_categories.length : 0);
  if (appEl.badgeProductsCount) appEl.badgeProductsCount.textContent = prodCount;
  if (appEl.badgeCategoryCount) appEl.badgeCategoryCount.textContent = catCount;
  if (appEl.badgeSubCategoryCount) appEl.badgeSubCategoryCount.textContent = subCatCount;
  const badgeStock = document.getElementById('badgeStockCount');
  if (badgeStock) badgeStock.textContent = prodCount;
}

window.updateBadges = updateBadges;

// Database Reload
async function reloadFromDatabase() {
  try {
    const data = await window.api.getData();
    if (data) {
      window.appData = {
        units: Array.isArray(data.units) ? data.units : [],
        product_types: Array.isArray(data.product_types) ? data.product_types : [],
        product_categories: Array.isArray(data.product_categories) ? data.product_categories : [],
        product_sub_categories: Array.isArray(data.product_sub_categories) ? data.product_sub_categories : [],
        products: Array.isArray(data.products) ? data.products : [],
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
        sales: Array.isArray(data.sales) ? data.sales : [],
        sales_returns: Array.isArray(data.sales_returns) ? data.sales_returns : []
      };
    }
  } catch (err) {
    console.error('Error reloading database data:', err);
  }

  updateBadges();

  // Refresh active views
  if (window.renderUnits) window.renderUnits();
  if (window.renderProductTypes) window.renderProductTypes();
  if (window.renderProductCategories) window.renderProductCategories();
  if (window.renderProductSubCategories) window.renderProductSubCategories();
  if (window.populateProductInfoDropdowns) window.populateProductInfoDropdowns();
  if (window.initPurchaseView) window.initPurchaseView();
  if (window.initStockView) {
    const viewStock = document.getElementById('viewStock');
    if (viewStock && viewStock.classList.contains('active')) {
      window.initStockView();
    }
  }
  if (window.SalesModule && window.SalesModule.refresh) window.SalesModule.refresh();
}

window.reloadFromDatabase = reloadFromDatabase;

// Sidebar Collapse / Expand
function openSidebar() {
  if (appEl.sidebar && appEl.sidebar.classList.contains('collapsed')) {
    appEl.sidebar.classList.remove('collapsed');
    try { localStorage.setItem('sidebar_collapsed', 'false'); } catch (e) {}
  }
}

function toggleSidebar() {
  if (!appEl.sidebar) return;
  appEl.sidebar.classList.toggle('collapsed');
  try {
    localStorage.setItem('sidebar_collapsed', appEl.sidebar.classList.contains('collapsed') ? 'true' : 'false');
  } catch (e) {}
}

if (appEl.btnToggleSidebar) {
  appEl.btnToggleSidebar.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
}

if (appEl.brand) {
  appEl.brand.addEventListener('click', (e) => {
    if (appEl.sidebar && appEl.sidebar.classList.contains('collapsed')) {
      e.stopPropagation();
      openSidebar();
    }
  });
}

if (appEl.brandMini) {
  appEl.brandMini.addEventListener('click', (e) => {
    if (appEl.sidebar && appEl.sidebar.classList.contains('collapsed')) {
      e.stopPropagation();
      openSidebar();
    }
  });
}

document.querySelectorAll('.brand-circle-img').forEach(img => {
  img.addEventListener('click', (e) => {
    if (appEl.sidebar && appEl.sidebar.classList.contains('collapsed')) {
      e.stopPropagation();
      openSidebar();
    }
  });
});

try {
  if (localStorage.getItem('sidebar_collapsed') === 'true' && appEl.sidebar) {
    appEl.sidebar.classList.add('collapsed');
  }
} catch (e) {}

// Bootstrap Initialization
let isAppInitialized = false;
async function init() {
  if (isAppInitialized) return;
  isAppInitialized = true;
  await reloadFromDatabase();
  if (window.GeneralInfoModule) {
    await window.GeneralInfoModule.init();
  }

  // Initial tab setup
  if (window.switchSubTab) {
    window.switchSubTab('unit-info');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else {
  init();
}
