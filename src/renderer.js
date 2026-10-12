// Shahzaib Traders - Main Application Orchestrator

// Global Application State
window.appData = {
  vendors: [],
  inventory: []
};

window.currentTab = 'inventory'; // 'inventory' | 'vendors'

// API Storage Bridge (Electron IPC with fallback)
window.api = window.electronAPI || {
  getData: async () => {
    const raw = localStorage.getItem('inventory_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return { vendors: [], inventory: [] };
  },
  saveData: async (data) => {
    localStorage.setItem('inventory_data', JSON.stringify(data));
    return { success: true };
  },
  addStock: async () => ({ success: true }),
  updateStock: async () => ({ success: true }),
  deleteStock: async () => ({ success: true }),
  addVendor: async () => ({ success: true }),
  updateVendor: async () => ({ success: true }),
  deleteVendor: async () => ({ success: true }),
  exportPDF: async () => ({ success: true }),
  exportExcel: async () => ({ success: true }),
  exportCSV: async () => ({ success: true })
};

// DOM References
const appEl = {
  navInventoryBtn: document.getElementById('navInventoryBtn'),
  navVendorBtn: document.getElementById('navVendorBtn'),
  navGeneralInfoBtn: document.getElementById('navGeneralInfoBtn'),
  inventoryView: document.getElementById('inventoryView'),
  vendorView: document.getElementById('vendorView'),
  generalInfoView: document.getElementById('generalInfoView'),
  badgeInventoryCount: document.getElementById('badgeInventoryCount'),
  badgeVendorCount: document.getElementById('badgeVendorCount'),

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
function switchTab(tab) {
  window.currentTab = tab;
  if (window.closeAllActionMenus) window.closeAllActionMenus();

  if (appEl.navInventoryBtn) appEl.navInventoryBtn.classList.toggle('active', tab === 'inventory');
  if (appEl.navVendorBtn) appEl.navVendorBtn.classList.toggle('active', tab === 'vendors');
  if (appEl.navGeneralInfoBtn) appEl.navGeneralInfoBtn.classList.toggle('active', tab === 'general-info');

  if (appEl.inventoryView) appEl.inventoryView.classList.toggle('active', tab === 'inventory');
  if (appEl.vendorView) appEl.vendorView.classList.toggle('active', tab === 'vendors');
  if (appEl.generalInfoView) appEl.generalInfoView.classList.toggle('active', tab === 'general-info');

  if (tab === 'inventory' && window.renderInventory) {
    window.renderInventory();
  } else if (tab === 'vendors' && window.renderVendors) {
    window.renderVendors();
  } else if (tab === 'general-info' && window.GeneralInfoModule) {
    window.GeneralInfoModule.onActivate();
  }
}

window.switchTab = switchTab;

if (appEl.navInventoryBtn) appEl.navInventoryBtn.addEventListener('click', () => switchTab('inventory'));
if (appEl.navVendorBtn) appEl.navVendorBtn.addEventListener('click', () => switchTab('vendors'));
if (appEl.navGeneralInfoBtn) appEl.navGeneralInfoBtn.addEventListener('click', () => switchTab('general-info'));

// Badges Update
function updateBadges() {
  const invCount = (window.appData && window.appData.inventory ? window.appData.inventory.length : 0);
  const venCount = (window.appData && window.appData.vendors ? window.appData.vendors.length : 0);
  if (appEl.badgeInventoryCount) appEl.badgeInventoryCount.textContent = invCount;
  if (appEl.badgeVendorCount) appEl.badgeVendorCount.textContent = venCount;
}

window.updateBadges = updateBadges;

// Database Reload
async function reloadFromDatabase() {
  try {
    const data = await window.api.getData();
    if (data && (Array.isArray(data.vendors) || Array.isArray(data.inventory))) {
      window.appData = {
        vendors: Array.isArray(data.vendors) ? data.vendors : [],
        inventory: Array.isArray(data.inventory) ? data.inventory : []
      };
      try {
        localStorage.setItem('inventory_db_backup', JSON.stringify(window.appData));
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error reloading database data:', err);
    try {
      const raw = localStorage.getItem('inventory_db_backup');
      if (raw) {
        const parsed = JSON.parse(raw);
        window.appData = {
          vendors: Array.isArray(parsed.vendors) ? parsed.vendors : [],
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : []
        };
      }
    } catch (e) {}
  }

  updateBadges();
  if (window.refreshVendorDropdowns) window.refreshVendorDropdowns();
  if (window.renderInventory) window.renderInventory();
  if (window.renderVendors) window.renderVendors();
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else {
  init();
}

// Window Resize Debounce
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.currentTab === 'inventory' && window.renderInventory) {
      window.renderInventory();
    } else if (window.currentTab === 'vendors' && window.renderVendors) {
      window.renderVendors();
    }
  }, 120);
});
