// Shahzaib Traders - Main Application Orchestrator

// Global Application State
window.appData = {
  units: [],
  product_types: [],
  product_groups: [],
  product_categories: [],
  product_sub_categories: [],
  vendors: [],
  products: [],
  purchases: [],
  inventory: []
};

// API Storage Bridge (Electron IPC with local storage fallback)
window.api = window.electronAPI || {
  getData: async () => ({
    units: [],
    product_types: [],
    product_groups: [],
    product_categories: [],
    product_sub_categories: [],
    vendors: [],
    products: [],
    purchases: [],
    inventory: []
  }),
  saveData: async () => ({ success: true }),
  addVendor: async () => ({ success: true }),
  updateVendor: async () => ({ success: true }),
  deleteVendor: async () => ({ success: true })
};

// DOM References
const appEl = {
  badgeVendorCount: document.getElementById('badgeVendorCount'),
  badgeProductsCount: document.getElementById('badgeProductsCount'),

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

// Badges Update
function updateBadges() {
  const venCount = (window.appData && window.appData.vendors ? window.appData.vendors.length : 0);
  const prodCount = (window.appData && window.appData.products ? window.appData.products.length : 0);
  if (appEl.badgeVendorCount) appEl.badgeVendorCount.textContent = venCount;
  if (appEl.badgeProductsCount) appEl.badgeProductsCount.textContent = prodCount;
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
        product_groups: Array.isArray(data.product_groups) ? data.product_groups : [],
        product_categories: Array.isArray(data.product_categories) ? data.product_categories : [],
        product_sub_categories: Array.isArray(data.product_sub_categories) ? data.product_sub_categories : [],
        vendors: Array.isArray(data.vendors) ? data.vendors : [],
        products: Array.isArray(data.products) ? data.products : [],
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
        inventory: Array.isArray(data.inventory) ? data.inventory : []
      };
    }
  } catch (err) {
    console.error('Error reloading database data:', err);
  }

  updateBadges();

  // Refresh active views
  if (window.renderUnits) window.renderUnits();
  if (window.renderProductTypes) window.renderProductTypes();
  if (window.renderProductGroups) window.renderProductGroups();
  if (window.renderProductCategories) window.renderProductCategories();
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
