// Application State
let appData = {
  vendors: [],
  inventory: []
};

let currentTab = 'inventory'; // 'inventory' | 'vendors'
let pendingDeleteAction = null;
let returnToStockModalAfterVendor = false;

// Pagination State (7 items per page as requested)
let inventoryPage = 1;
const inventoryPageSize = 7;
let vendorPage = 1;
const vendorPageSize = 7;

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

  // Confirm Modal
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
  el.badgeInventoryCount.textContent = appData.inventory.length;
  el.badgeVendorCount.textContent = appData.vendors.length;
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
  if (tab === 'inventory') {
    el.navInventoryBtn.classList.add('active');
    el.navVendorBtn.classList.remove('active');
    el.inventoryView.classList.add('active');
    el.vendorView.classList.remove('active');
    renderInventory();
  } else {
    el.navVendorBtn.classList.add('active');
    el.navInventoryBtn.classList.remove('active');
    el.vendorView.classList.add('active');
    el.inventoryView.classList.remove('active');
    renderVendors();
  }
}

// Vendor Dropdowns Populate
function refreshVendorDropdowns(selectedVendorId = '') {
  el.stockVendorSelect.innerHTML = '<option value="">Select Vendor</option>';
  appData.vendors.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    el.stockVendorSelect.appendChild(opt);
  });
  if (selectedVendorId) {
    el.stockVendorSelect.value = selectedVendorId;
  }
}

// Inventory Rendering (Row shows: Stock Name, Vendor, Total Stock, Total Sell, Wholesale, Individual, Date, 3-Dots Action)
function renderInventory() {
  closeAllActionMenus();
  const query = (el.inventorySearchInput.value || '').trim().toLowerCase();
  const searchBy = el.inventorySearchBy ? el.inventorySearchBy.value : 'all';
  const userTargetStock = el.filterStockLevelInput.value.trim() !== '' ? Number(el.filterStockLevelInput.value) : null;

  let items = [...appData.inventory];

  // Search Filter with Search By
  if (query) {
    items = items.filter(item => {
      const stockName = (item.stockName || '').toLowerCase();
      const vendorName = (item.vendorName || '').toLowerCase();

      if (searchBy === 'stockName') {
        return stockName.includes(query);
      } else if (searchBy === 'vendorName') {
        return vendorName.includes(query);
      } else {
        return stockName.includes(query) || vendorName.includes(query);
      }
    });
  }

  // Stock Proximity Ranking / Sorting: Items closest to the entered quantity appear first
  if (userTargetStock !== null && !isNaN(userTargetStock)) {
    items.sort((a, b) => {
      const diffA = Math.abs(Number(a.quantity || 0) - userTargetStock);
      const diffB = Math.abs(Number(b.quantity || 0) - userTargetStock);
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      return (b.date || '').localeCompare(a.date || '');
    });
  } else {
    // Default: Newest date first
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / inventoryPageSize));

  if (inventoryPage > totalPages) {
    inventoryPage = totalPages;
  }
  if (inventoryPage < 1) {
    inventoryPage = 1;
  }

  const startIdx = (inventoryPage - 1) * inventoryPageSize;
  const endIdx = Math.min(startIdx + inventoryPageSize, totalItems);
  const pageItems = items.slice(startIdx, endIdx);

  el.inventoryTableBody.innerHTML = '';

  if (totalItems === 0) {
    el.inventoryEmptyState.classList.remove('hidden');
    el.inventoryPaginationInfo.textContent = 'Showing 0-0 of 0 items';
  } else {
    el.inventoryEmptyState.classList.add('hidden');
    el.inventoryPaginationInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} items`;

    pageItems.forEach(item => {
      const tr = document.createElement('tr');
      const wholesale = Number(item.wholesalePrice || 0).toFixed(2);
      const individual = Number(item.individualPrice || 0).toFixed(2);

      tr.innerHTML = `
        <td class="col-stock-name stock-name-cell">${escapeHtml(item.stockName)}</td>
        <td class="col-vendor"><span class="vendor-tag">${escapeHtml(item.vendorName || 'N/A')}</span></td>
        <td class="col-stock-qty qty-val">${Number(item.quantity).toLocaleString()}</td>
        <td class="col-sell-qty sell-val">${Number(item.totalSell || 0).toLocaleString()}</td>
        <td class="col-price price-val">PKR ${Number(wholesale).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="col-price price-val">PKR ${Number(individual).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="col-date date-val">${escapeHtml(item.date || '')}</td>
        <td class="col-dots-actions">
          <div class="action-dropdown-container">
            <button type="button" class="btn-dots" onclick="toggleRowMenu(event, 'inv-menu-${item.id}')" title="More Options">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"></circle>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"></circle>
              </svg>
            </button>
            <div id="inv-menu-${item.id}" class="action-menu hidden">
              <button type="button" class="action-menu-item" onclick="openEditStock('${item.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-menu-item text-danger" onclick="confirmDeleteStock('${item.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

  // Render Inventory Pagination Controls
  renderPaginationControls(
    inventoryPage,
    totalPages,
    el.btnInvPrevPage,
    el.btnInvNextPage,
    el.invPageNumbers,
    (newPage) => {
      inventoryPage = newPage;
      renderInventory();
    }
  );
}

// Vendors Rendering
function renderVendors() {
  closeAllActionMenus();
  const query = (el.vendorSearchInput.value || '').trim().toLowerCase();
  const searchBy = el.vendorSearchBy ? el.vendorSearchBy.value : 'all';
  let vendors = [...appData.vendors];

  if (query) {
    vendors = vendors.filter(v => {
      const name = (v.name || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();

      if (searchBy === 'name') {
        return name.includes(query);
      } else if (searchBy === 'phone') {
        return phone.includes(query);
      } else {
        return name.includes(query) || phone.includes(query);
      }
    });
  }

  const totalItems = vendors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / vendorPageSize));

  if (vendorPage > totalPages) {
    vendorPage = totalPages;
  }
  if (vendorPage < 1) {
    vendorPage = 1;
  }

  const startIdx = (vendorPage - 1) * vendorPageSize;
  const endIdx = Math.min(startIdx + vendorPageSize, totalItems);
  const pageItems = vendors.slice(startIdx, endIdx);

  el.vendorTableBody.innerHTML = '';

  if (totalItems === 0) {
    el.vendorEmptyState.classList.remove('hidden');
    el.vendorPaginationInfo.textContent = 'Showing 0-0 of 0 items';
  } else {
    el.vendorEmptyState.classList.add('hidden');
    el.vendorPaginationInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} items`;

    pageItems.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-vendor-name stock-name-cell">${escapeHtml(v.name)}</td>
        <td class="col-phone">${escapeHtml(v.phone || '-')}</td>
        <td class="col-dots-actions">
          <div class="action-dropdown-container">
            <button type="button" class="btn-dots" onclick="toggleRowMenu(event, 'vend-menu-${v.id}')" title="More Options">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"></circle>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"></circle>
              </svg>
            </button>
            <div id="vend-menu-${v.id}" class="action-menu hidden">
              <button type="button" class="action-menu-item" onclick="openEditVendor('${v.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-menu-item text-danger" onclick="confirmDeleteVendor('${v.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

  // Render Vendor Pagination Controls
  renderPaginationControls(
    vendorPage,
    totalPages,
    el.btnVendorPrevPage,
    el.btnVendorNextPage,
    el.vendorPageNumbers,
    (newPage) => {
      vendorPage = newPage;
      renderVendors();
    }
  );
}

// Generic Pagination Controls Renderer
function renderPaginationControls(currentPage, totalPages, prevBtn, nextBtn, container, onPageChange) {
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;

  prevBtn.onclick = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  nextBtn.onclick = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  container.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-page-num ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => onPageChange(i);
    container.appendChild(btn);
  }
}

// Real-time Dynamic Total Prices Calculation in Stock Modal
function updateTotalPricesSummary() {
  const qty = parseInt(el.stockQtyInput.value, 10) || 0;
  const wholesale = parseFloat(el.stockWholesalePrice.value) || 0;
  const individual = parseFloat(el.stockIndividualPrice.value) || 0;

  const totalWholesale = (qty * wholesale).toFixed(2);
  const totalIndividual = (qty * individual).toFixed(2);

  if (el.summaryTotalWholesale) {
    el.summaryTotalWholesale.textContent = `PKR ${Number(totalWholesale).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
  if (el.summaryTotalIndividual) {
    el.summaryTotalIndividual.textContent = `PKR ${Number(totalIndividual).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}

// Stock Modal Actions
function openAddStock() {
  closeAllActionMenus();
  el.modalStockTitle.textContent = 'Add Stock';
  el.stockId.value = '';
  el.stockNameInput.value = '';
  refreshVendorDropdowns();
  el.stockVendorSelect.value = '';
  el.stockQtyInput.value = '';
  el.stockSellInput.value = '0';
  el.stockWholesalePrice.value = '';
  el.stockIndividualPrice.value = '';
  el.stockDateInput.value = getTodayString();
  updateTotalPricesSummary();
  el.modalStock.classList.remove('hidden');
  setTimeout(() => el.stockNameInput.focus(), 50);
}

window.openEditStock = function(id) {
  closeAllActionMenus();
  const item = appData.inventory.find(i => i.id === id);
  if (!item) return;

  el.modalStockTitle.textContent = 'Edit Stock';
  el.stockId.value = item.id;
  el.stockNameInput.value = item.stockName;
  refreshVendorDropdowns(item.vendorId);
  el.stockQtyInput.value = item.quantity;
  el.stockSellInput.value = item.totalSell || 0;
  el.stockWholesalePrice.value = item.wholesalePrice !== undefined ? item.wholesalePrice : '';
  el.stockIndividualPrice.value = item.individualPrice !== undefined ? item.individualPrice : '';
  el.stockDateInput.value = item.date || getTodayString();
  updateTotalPricesSummary();
  el.modalStock.classList.remove('hidden');
  setTimeout(() => el.stockNameInput.focus(), 50);
};

function closeStockModal() {
  el.modalStock.classList.add('hidden');
}

// Vendor Modal Actions (Only Name and Phone Number)
function openAddVendor(fromStockModal = false) {
  closeAllActionMenus();
  returnToStockModalAfterVendor = fromStockModal;
  el.modalVendorTitle.textContent = 'Add Vendor';
  el.vendorId.value = '';
  el.vendorNameInput.value = '';
  el.vendorPhoneInput.value = '';

  if (fromStockModal) {
    el.modalStock.classList.add('hidden');
  }

  el.modalVendor.classList.remove('hidden');
  setTimeout(() => el.vendorNameInput.focus(), 50);
}

window.openEditVendor = function(id) {
  closeAllActionMenus();
  returnToStockModalAfterVendor = false;
  const v = appData.vendors.find(item => item.id === id);
  if (!v) return;

  el.modalVendorTitle.textContent = 'Edit Vendor';
  el.vendorId.value = v.id;
  el.vendorNameInput.value = v.name;
  el.vendorPhoneInput.value = v.phone || '';
  el.modalVendor.classList.remove('hidden');
  setTimeout(() => el.vendorNameInput.focus(), 50);
};

function closeVendorModal() {
  el.modalVendor.classList.add('hidden');
  if (returnToStockModalAfterVendor) {
    el.modalStock.classList.remove('hidden');
    returnToStockModalAfterVendor = false;
  }
}

// Delete Confirmations
window.confirmDeleteStock = function(id) {
  closeAllActionMenus();
  const item = appData.inventory.find(i => i.id === id);
  if (!item) return;

  el.confirmTitle.textContent = 'Delete Stock';
  el.confirmMessage.textContent = `Are you sure you want to delete "${item.stockName}"?`;
  pendingDeleteAction = async () => {
    if (api.deleteStock) {
      await api.deleteStock(id);
    }
    await reloadFromDatabase();
    renderInventory();
    showToast('Stock item deleted');
  };
  el.modalConfirm.classList.remove('hidden');
};

window.confirmDeleteVendor = function(id) {
  closeAllActionMenus();
  const v = appData.vendors.find(item => item.id === id);
  if (!v) return;

  const linkedItems = appData.inventory.filter(i => i.vendorId === id);
  let message = `Are you sure you want to delete vendor "${v.name}"?`;
  if (linkedItems.length > 0) {
    message += ` This will also delete all associated stock (${linkedItems.length} item(s)).`;
  }

  el.confirmTitle.textContent = 'Delete Vendor';
  el.confirmMessage.textContent = message;
  pendingDeleteAction = async () => {
    if (api.deleteVendor) {
      await api.deleteVendor(id);
    }
    // Fallback if local storage
    appData.vendors = appData.vendors.filter(item => item.id !== id);
    appData.inventory = appData.inventory.filter(item => item.vendorId !== id);

    await reloadFromDatabase();
    renderVendors();
    renderInventory();
    showToast(linkedItems.length > 0 ? 'Vendor and associated stock deleted' : 'Vendor deleted');
  };
  el.modalConfirm.classList.remove('hidden');
};

function closeConfirmModal() {
  el.modalConfirm.classList.add('hidden');
  pendingDeleteAction = null;
}

// Save Handlers (Persisted to SQLite)
el.stockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.stockId.value;
  const stockName = el.stockNameInput.value.trim();
  const vendorId = el.stockVendorSelect.value;
  const quantity = parseInt(el.stockQtyInput.value, 10) || 0;
  const totalSell = parseInt(el.stockSellInput.value, 10) || 0;
  const wholesalePrice = parseFloat(el.stockWholesalePrice.value) || 0;
  const individualPrice = parseFloat(el.stockIndividualPrice.value) || 0;
  const date = el.stockDateInput.value;

  if (!stockName || !vendorId) {
    return;
  }

  const vendor = appData.vendors.find(v => v.id === vendorId);
  const vendorName = vendor ? vendor.name : 'Unknown';

  if (id) {
    // Edit existing
    const item = { id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date };
    if (api.updateStock) {
      await api.updateStock(item);
    }
    showToast('Stock item updated');
  } else {
    // Add new
    const newItem = {
      id: 'inv-' + Date.now(),
      stockName,
      vendorId,
      vendorName,
      quantity,
      totalSell,
      wholesalePrice,
      individualPrice,
      date,
      createdAt: getTodayString()
    };
    if (api.addStock) {
      await api.addStock(newItem);
    }
    showToast('Stock item added');
  }

  await reloadFromDatabase();
  closeStockModal();
  renderInventory();
});

el.vendorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.vendorId.value;
  const name = el.vendorNameInput.value.trim();
  const phone = el.vendorPhoneInput.value.trim();

  if (!name) return;

  let createdVendorId = id;

  if (id) {
    // Edit existing
    const vendor = { id, name, phone };
    if (api.updateVendor) {
      await api.updateVendor(vendor);
    }
    showToast('Vendor updated');
  } else {
    // Add new (only Name and Phone Number)
    createdVendorId = 'v-' + Date.now();
    const newVendor = {
      id: createdVendorId,
      name,
      phone,
      createdAt: getTodayString()
    };
    if (api.addVendor) {
      await api.addVendor(newVendor);
    }
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
  if (pendingDeleteAction) {
    await pendingDeleteAction();
  }
  closeConfirmModal();
});

// Export CSV
el.btnExportInventory.addEventListener('click', async () => {
  if (appData.inventory.length === 0) {
    showToast('No inventory data to export');
    return;
  }

  let csv = 'Stock Name,Vendor,Total Stock,Total Sell,Wholesale Price (PKR),Individual Price (PKR),Date\r\n';
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

  const res = await api.exportCSV({
    content: csv,
    filename: `inventory_${getTodayString()}.csv`
  });

  if (res && res.success) {
    showToast('CSV export successful');
  }
});

// Event Listeners
el.navInventoryBtn.addEventListener('click', () => switchTab('inventory'));
el.navVendorBtn.addEventListener('click', () => switchTab('vendors'));

el.btnOpenAddStock.addEventListener('click', openAddStock);
el.btnCloseStockModal.addEventListener('click', closeStockModal);
el.btnCancelStock.addEventListener('click', closeStockModal);
el.btnQuickAddVendor.addEventListener('click', () => openAddVendor(true));

// Live recalculation on quantity and price inputs
el.stockQtyInput.addEventListener('input', updateTotalPricesSummary);
el.stockWholesalePrice.addEventListener('input', updateTotalPricesSummary);
el.stockIndividualPrice.addEventListener('input', updateTotalPricesSummary);

el.btnOpenAddVendor.addEventListener('click', () => openAddVendor(false));
el.btnCloseVendorModal.addEventListener('click', closeVendorModal);
el.btnCancelVendor.addEventListener('click', closeVendorModal);

el.btnCloseConfirmModal.addEventListener('click', closeConfirmModal);
el.btnCancelConfirm.addEventListener('click', closeConfirmModal);

// Search & Filter Events
el.inventorySearchInput.addEventListener('input', (e) => {
  if (e.target.value) {
    el.btnClearInventorySearch.classList.remove('hidden');
  } else {
    el.btnClearInventorySearch.classList.add('hidden');
  }
  inventoryPage = 1;
  renderInventory();
});

el.inventorySearchBy.addEventListener('change', () => {
  inventoryPage = 1;
  renderInventory();
});

el.btnClearInventorySearch.addEventListener('click', () => {
  el.inventorySearchInput.value = '';
  el.btnClearInventorySearch.classList.add('hidden');
  inventoryPage = 1;
  renderInventory();
});

el.filterStockLevelInput.addEventListener('input', () => {
  inventoryPage = 1;
  renderInventory();
});

el.vendorSearchInput.addEventListener('input', (e) => {
  if (e.target.value) {
    el.btnClearVendorSearch.classList.remove('hidden');
  } else {
    el.btnClearVendorSearch.classList.add('hidden');
  }
  vendorPage = 1;
  renderVendors();
});

el.vendorSearchBy.addEventListener('change', () => {
  vendorPage = 1;
  renderVendors();
});

el.btnClearVendorSearch.addEventListener('click', () => {
  el.vendorSearchInput.value = '';
  el.btnClearVendorSearch.classList.add('hidden');
  vendorPage = 1;
  renderVendors();
});

el.btnResetInventoryFilters.addEventListener('click', () => {
  el.inventorySearchInput.value = '';
  el.btnClearInventorySearch.classList.add('hidden');
  el.inventorySearchBy.value = 'all';
  el.filterStockLevelInput.value = '';
  inventoryPage = 1;
  renderInventory();
});

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sidebar Toggle Handler (Full open vs Half-closed mini)
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else {
  // DOM is already parsed and ready
  init();
}
