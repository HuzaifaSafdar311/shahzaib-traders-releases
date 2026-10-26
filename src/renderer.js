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
if (!window.electronAPI) {
  const getLocalData = () => {
    try {
      const stored = localStorage.getItem('inventory_mock_data');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    // Default sample data for browser preview/testing
    return {
      units: [
        { id: '1', name: 'Piece', symbol: 'Pcs' },
        { id: '2', name: 'Box', symbol: 'Bx' },
        { id: '3', name: 'Pack', symbol: 'Pk' }
      ],
      product_types: [{ id: '1', name: 'General' }, { id: '2', name: 'Electronics' }],
      product_categories: [
        { id: '1', name: 'LED Lights' },
        { id: '2', name: 'Wires & Cables' },
        { id: '3', name: 'Switches & Sockets' }
      ],
      product_sub_categories: [
        { id: '1', categoryId: '1', name: 'Bulbs 12W-24W' },
        { id: '2', categoryId: '1', name: 'Flood Lights 50W+' },
        { id: '3', categoryId: '2', name: 'Copper Single Core' }
      ],
      products: [
        { id: 'p1', code: '101', barcode: '890101001', titleEng: 'Philips LED Bulb 18W Cool Daylight', categoryId: '1', categoryName: 'LED Lights', subCategoryId: '1', subCategoryName: 'Bulbs 12W-24W', unitName: 'Piece', packSize: 1, purchasePrice: 320, profitMargin: 25, retailPrice: 400, wholesalePrice: 360, stockQty: 85, minStock: 20 },
        { id: 'p2', code: '102', barcode: '890101002', titleEng: 'Osram Flood Light 50W IP65 Outdoor', categoryId: '1', categoryName: 'LED Lights', subCategoryId: '2', subCategoryName: 'Flood Lights 50W+', unitName: 'Piece', packSize: 1, purchasePrice: 1450, profitMargin: 20.7, retailPrice: 1750, wholesalePrice: 1600, stockQty: 14, minStock: 15 },
        { id: 'p3', code: '103', barcode: '890101003', titleEng: 'Pakistan Cables 7/29 Copper Red 90m', categoryId: '2', categoryName: 'Wires & Cables', subCategoryId: '3', subCategoryName: 'Copper Single Core', unitName: 'Box', packSize: 1, purchasePrice: 8500, profitMargin: 11.8, retailPrice: 9500, wholesalePrice: 9000, stockQty: 0, minStock: 5 }
      ],
      purchases: [],
      sales: [],
      sales_returns: []
    };
  };

  const saveLocalData = (data) => {
    try { localStorage.setItem('inventory_mock_data', JSON.stringify(data)); } catch (e) {}
  };

  window.api = {
    getData: async () => getLocalData(),
    getNextProductCode: async () => {
      const data = getLocalData();
      const codes = data.products.map(p => Number(p.code)).filter(c => !isNaN(c));
      return codes.length > 0 ? String(Math.max(...codes) + 1) : '101';
    },
    saveProduct: async (prod) => {
      const data = getLocalData();
      const isNew = !prod.id;
      if (isNew) {
        prod.id = `prod-${Date.now()}`;
        data.products.push(prod);
      } else {
        const idx = data.products.findIndex(p => p.id === prod.id || String(p.code) === String(prod.code));
        if (idx >= 0) data.products[idx] = { ...data.products[idx], ...prod };
        else data.products.push(prod);
      }
      saveLocalData(data);
      return { success: true };
    },
    deleteProduct: async (code) => {
      const data = getLocalData();
      data.products = data.products.filter(p => String(p.code) !== String(code));
      saveLocalData(data);
      return { success: true };
    },
    updateProductPrices: async (idOrCode, prices) => {
      const data = getLocalData();
      const prod = data.products.find(p => p.id === idOrCode || String(p.code) === String(idOrCode));
      if (!prod) return { success: false, message: 'Product not found' };
      if (prices.purchasePrice !== undefined) prod.purchasePrice = Number(prices.purchasePrice);
      if (prices.wholesalePrice !== undefined) prod.wholesalePrice = Number(prices.wholesalePrice);
      if (prices.retailPrice !== undefined) prod.retailPrice = Number(prices.retailPrice);
      saveLocalData(data);
      return { success: true };
    }
  };
} else {
  window.api = window.electronAPI;
}

// DOM References
const appEl = {
  navInventoryMainBtn: document.getElementById('navInventoryMainBtn'),
  navGeneralInfoBtn: document.getElementById('navGeneralInfoBtn'),
  navSalesMainBtn: document.getElementById('navSalesMainBtn'),
  navAccountsMainBtn: document.getElementById('navAccountsMainBtn'),
  navToolsMainBtn: document.getElementById('navToolsMainBtn') || document.getElementById('navSettingsMainBtn'),
  navSettingsMainBtn: document.getElementById('navSettingsMainBtn') || document.getElementById('navToolsMainBtn'),
  navReportsMainBtn: document.getElementById('navReportsMainBtn'),
  navLogoutBtn: document.getElementById('navLogoutBtn'),

  inventoryView: document.getElementById('inventoryView'),
  generalInfoView: document.getElementById('generalInfoView'),
  salesView: document.getElementById('salesView'),
  accountsView: document.getElementById('accountsView'),
  toolsView: document.getElementById('toolsView') || document.getElementById('settingsView'),
  settingsView: document.getElementById('settingsView') || document.getElementById('toolsView'),
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
  'settings': { btn: 'navSettingsMainBtn', view: 'settingsView' },
  'tools': { btn: 'navSettingsMainBtn', view: 'settingsView' },
  'reports': { btn: 'navReportsMainBtn', view: 'reportsView' }
};

function switchTab(tab) {
  if (!mainTabs[tab]) tab = 'general-info';
  window.currentTab = tab;

  Object.entries(mainTabs).forEach(([key, config]) => {
    const isActive = (key === tab || (tab === 'settings' && key === 'tools') || (tab === 'tools' && key === 'settings'));
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
  } else if (tab === 'settings' || tab === 'tools') {
    if (window.SettingsModule && window.SettingsModule.onActivate) {
      window.SettingsModule.onActivate();
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
if (appEl.navReportsMainBtn) appEl.navReportsMainBtn.addEventListener('click', () => switchTab('reports'));
if (appEl.navSettingsMainBtn) appEl.navSettingsMainBtn.addEventListener('click', () => switchTab('settings'));
if (appEl.navToolsMainBtn && appEl.navToolsMainBtn !== appEl.navSettingsMainBtn) {
  appEl.navToolsMainBtn.addEventListener('click', () => switchTab('settings'));
}
if (appEl.navLogoutBtn) {
  appEl.navLogoutBtn.addEventListener('click', () => {
    openConfirmModal({
      title: 'Confirm Log Out',
      message: 'Are you sure you want to lock the session and return to the PIN login screen?',
      onConfirm: () => {
        if (window.authAPI && window.authAPI.logout) {
          window.authAPI.logout();
        } else {
          window.location.href = 'auth/login.html';
        }
      }
    });
  });
}


// Badges Update
function updateBadges() {
  const prodCount = (window.appData && window.appData.products ? window.appData.products.length : 0);
  const catCount = (window.appData && window.appData.product_categories ? window.appData.product_categories.length : 0);
  const subCatCount = (window.appData && window.appData.product_sub_categories ? window.appData.product_sub_categories.length : 0);
  if (appEl.badgeProductsCount) appEl.badgeProductsCount.textContent = prodCount;
  if (appEl.badgeCategoryCount) appEl.badgeCategoryCount.textContent = catCount;
  if (appEl.badgeSubCategoryCount) appEl.badgeSubCategoryCount.textContent = subCatCount;
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
  if (window.renderProductCategories) window.renderProductCategories();
  if (window.renderProductSubCategories) window.renderProductSubCategories();
  if (window.populateProductInfoDropdowns) window.populateProductInfoDropdowns();
  if (window.renderProductsTable) window.renderProductsTable();
  if (window.initPurchaseView) window.initPurchaseView();
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

  // Initialize Auto-Updater UI & version display
  initAutoUpdaterUI();

  // Initial tab setup: Default to General Info per user requirement
  switchTab('general-info');
}

// ============================================
// AUTO-UPDATER & VERSION UI MANAGEMENT
// ============================================
async function initAutoUpdaterUI() {
  const lblCurrentAppVersion = document.getElementById('lblCurrentAppVersion');
  const sidebarAppVersion = document.getElementById('sidebarAppVersion');
  const sysAppVersion = document.getElementById('sysAppVersion');
  const btnCheckForUpdates = document.getElementById('btnCheckForUpdates');
  const btnCheckForUpdatesText = document.getElementById('btnCheckForUpdatesText');
  const updaterStatusText = document.getElementById('updaterStatusText');

  // Load and display current application version
  try {
    const version = (window.updaterAPI && typeof window.updaterAPI.getAppVersion === 'function')
      ? await window.updaterAPI.getAppVersion()
      : (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function' ? await window.electronAPI.getAppVersion() : '1.0.1');

    if (version) {
      if (lblCurrentAppVersion) lblCurrentAppVersion.textContent = `v${version}`;
      if (sidebarAppVersion) sidebarAppVersion.textContent = `v${version}`;
      if (sysAppVersion) sysAppVersion.textContent = `${version} Enterprise`;
    }
  } catch (verErr) {
    console.warn('Could not retrieve app version:', verErr);
  }

  // Handle manual "Check for Updates" button click
  if (btnCheckForUpdates) {
    btnCheckForUpdates.addEventListener('click', async () => {
      btnCheckForUpdates.disabled = true;
      if (btnCheckForUpdatesText) btnCheckForUpdatesText.textContent = 'Checking...';
      if (updaterStatusText) {
        updaterStatusText.textContent = 'Checking for updates...';
        updaterStatusText.style.color = '#0284c7';
      }

      try {
        const updater = window.updaterAPI || window.electronAPI;
        if (!updater || typeof updater.checkForUpdates !== 'function') {
          if (updaterStatusText) updaterStatusText.textContent = 'Updater API unavailable';
          if (typeof window.showToast === 'function') {
            window.showToast('Updater API not available in current window', 'warning');
          }
          return;
        }

        const res = await updater.checkForUpdates();
        if (res.status === 'dev-mode') {
          if (updaterStatusText) {
            updaterStatusText.textContent = 'Development mode (Updates enabled in packaged build)';
            updaterStatusText.style.color = '#d97706';
          }
          if (typeof window.showToast === 'function') {
            window.showToast(res.message || 'Auto-update is available in packaged desktop releases', 'info');
          }
        } else if (res.status === 'available') {
          if (updaterStatusText) {
            updaterStatusText.textContent = 'Downloading update...';
            updaterStatusText.style.color = '#0284c7';
          }
          if (typeof window.showToast === 'function') {
            window.showToast(`New version available: v${res.latestVersion || ''}. Downloading update...`, 'info');
          }
        } else if (res.status === 'not-available') {
          if (updaterStatusText) {
            updaterStatusText.textContent = 'Up to date';
            updaterStatusText.style.color = '#059669';
          }
          if (typeof window.showToast === 'function') {
            window.showToast(`Application is up to date (v${res.version || '1.0.1'})`, 'success');
          }
        } else if (res.status === 'error') {
          if (updaterStatusText) {
            updaterStatusText.textContent = 'Check failed';
            updaterStatusText.style.color = '#dc2626';
          }
          if (typeof window.showToast === 'function') {
            window.showToast(res.error || 'Unable to check for updates (offline or unreachable)', 'error');
          }
        }
      } catch (checkErr) {
        console.error('Update check error:', checkErr);
        if (updaterStatusText) {
          updaterStatusText.textContent = 'Check failed';
          updaterStatusText.style.color = '#dc2626';
        }
        if (typeof window.showToast === 'function') {
          window.showToast('Update check failed: ' + checkErr.message, 'error');
        }
      } finally {
        btnCheckForUpdates.disabled = false;
        if (btnCheckForUpdatesText) btnCheckForUpdatesText.textContent = 'Check for updates';
      }
    });
  }

  // Subscribe to background status updates
  if (window.updaterAPI && typeof window.updaterAPI.onUpdateStatus === 'function') {
    window.updaterAPI.onUpdateStatus((data) => {
      if (!data) return;
      if (data.status === 'available') {
        if (updaterStatusText) {
          updaterStatusText.textContent = 'Downloading update...';
          updaterStatusText.style.color = '#0284c7';
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Update available: v${data.version || ''}. Downloading...`, 'info');
        }
      } else if (data.status === 'downloading') {
        const pct = Math.round(data.percent || 0);
        if (updaterStatusText) {
          updaterStatusText.textContent = `Downloading update... (${pct}%)`;
          updaterStatusText.style.color = '#0284c7';
        }
      } else if (data.status === 'downloaded') {
        if (updaterStatusText) {
          updaterStatusText.textContent = 'Update ready';
          updaterStatusText.style.color = '#059669';
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Version ${data.version || ''} downloaded and ready to install!`, 'success');
        }
      } else if (data.status === 'not-available') {
        if (updaterStatusText) {
          updaterStatusText.textContent = 'Up to date';
          updaterStatusText.style.color = '#059669';
        }
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else {
  init();
}

