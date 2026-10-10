// Application State
let appData = {
  vendors: [],
  inventory: []
};

let currentTab = 'inventory'; // 'inventory' | 'vendors'
let pendingDeleteAction = null;
let returnToStockModalAfterVendor = false;

// Fallback Storage API if window.electronAPI is unavailable
const api = window.electronAPI || {
  getData: async () => {
    const raw = localStorage.getItem('inventory_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      vendors: [
        { id: 'v-1', name: 'Apex Industrial Supplies', contactPerson: 'David Miller', phone: '+1 (555) 019-2834', email: 'sales@apexsupplies.com', createdAt: '2025-01-15' },
        { id: 'v-2', name: 'Global Tech Components', contactPerson: 'Sarah Chen', phone: '+1 (555) 014-9981', email: 'orders@globaltech.io', createdAt: '2025-01-18' },
        { id: 'v-3', name: 'Metro Logistics & Hardware', contactPerson: 'Tariq Mahmood', phone: '+1 (555) 018-7743', email: 'info@metrologistics.com', createdAt: '2025-02-01' }
      ],
      inventory: [
        { id: 'inv-1', stockName: 'Precision Ball Bearings 608RS', vendorId: 'v-1', vendorName: 'Apex Industrial Supplies', quantity: 250, date: '2025-02-10' },
        { id: 'inv-2', stockName: 'Solid State Relay 25A', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 80, date: '2025-02-12' },
        { id: 'inv-3', stockName: 'Heavy Duty Steel Brackets', vendorId: 'v-3', vendorName: 'Metro Logistics & Hardware', quantity: 120, date: '2025-02-14' },
        { id: 'inv-4', stockName: 'Microcontroller Units ESP32', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 45, date: '2025-02-18' }
      ]
    };
  },
  saveData: async (data) => {
    localStorage.setItem('inventory_data', JSON.stringify(data));
    return { success: true };
  },
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
  inventorySearchInput: document.getElementById('inventorySearchInput'),
  btnClearInventorySearch: document.getElementById('btnClearInventorySearch'),
  filterVendorSelect: document.getElementById('filterVendorSelect'),
  filterStockStatus: document.getElementById('filterStockStatus'),
  filterDateOrder: document.getElementById('filterDateOrder'),
  btnResetInventoryFilters: document.getElementById('btnResetInventoryFilters'),
  btnOpenAddStock: document.getElementById('btnOpenAddStock'),
  btnExportInventory: document.getElementById('btnExportInventory'),

  // Vendor Elements
  vendorTableBody: document.getElementById('vendorTableBody'),
  vendorEmptyState: document.getElementById('vendorEmptyState'),
  vendorSearchInput: document.getElementById('vendorSearchInput'),
  btnClearVendorSearch: document.getElementById('btnClearVendorSearch'),
  btnOpenAddVendor: document.getElementById('btnOpenAddVendor'),

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
  stockDateInput: document.getElementById('stockDateInput'),
  btnQuickAddVendor: document.getElementById('btnQuickAddVendor'),

  // Vendor Modal
  modalVendor: document.getElementById('modalVendor'),
  modalVendorTitle: document.getElementById('modalVendorTitle'),
  btnCloseVendorModal: document.getElementById('btnCloseVendorModal'),
  btnCancelVendor: document.getElementById('btnCancelVendor'),
  vendorForm: document.getElementById('vendorForm'),
  vendorId: document.getElementById('vendorId'),
  vendorNameInput: document.getElementById('vendorNameInput'),
  vendorContactInput: document.getElementById('vendorContactInput'),
  vendorPhoneInput: document.getElementById('vendorPhoneInput'),
  vendorEmailInput: document.getElementById('vendorEmailInput'),

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
  setTimeout(() => {
    toast.remove();
  }, 2600);
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function persist() {
  await api.saveData(appData);
  updateBadges();
}

function updateBadges() {
  el.badgeInventoryCount.textContent = appData.inventory.length;
  el.badgeVendorCount.textContent = appData.vendors.length;
}

// Tab Switching
function switchTab(tab) {
  currentTab = tab;
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
  // Filter Dropdown
  const currentFilterVal = el.filterVendorSelect.value;
  el.filterVendorSelect.innerHTML = '<option value="">All Vendors</option>';
  appData.vendors.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    el.filterVendorSelect.appendChild(opt);
  });
  el.filterVendorSelect.value = currentFilterVal;

  // Stock Modal Dropdown
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

// Inventory Rendering
function renderInventory() {
  const query = (el.inventorySearchInput.value || '').trim().toLowerCase();
  const vendorFilter = el.filterVendorSelect.value;
  const statusFilter = el.filterStockStatus.value;
  const sortOrder = el.filterDateOrder.value;

  let items = [...appData.inventory];

  // Search Filter
  if (query) {
    items = items.filter(item => {
      const nameMatch = item.stockName.toLowerCase().includes(query);
      const vendorMatch = (item.vendorName || '').toLowerCase().includes(query);
      return nameMatch || vendorMatch;
    });
  }

  // Vendor Filter
  if (vendorFilter) {
    items = items.filter(item => item.vendorId === vendorFilter);
  }

  // Stock Level Filter
  if (statusFilter === 'in-stock') {
    items = items.filter(item => Number(item.quantity) > 20);
  } else if (statusFilter === 'low-stock') {
    items = items.filter(item => Number(item.quantity) > 0 && Number(item.quantity) <= 20);
  } else if (statusFilter === 'out-of-stock') {
    items = items.filter(item => Number(item.quantity) <= 0);
  }

  // Sorting
  items.sort((a, b) => {
    if (sortOrder === 'newest') {
      return (b.date || '').localeCompare(a.date || '');
    } else if (sortOrder === 'oldest') {
      return (a.date || '').localeCompare(b.date || '');
    } else if (sortOrder === 'qty-high') {
      return Number(b.quantity) - Number(a.quantity);
    } else if (sortOrder === 'qty-low') {
      return Number(a.quantity) - Number(b.quantity);
    }
    return 0;
  });

  el.inventoryTableBody.innerHTML = '';

  if (items.length === 0) {
    el.inventoryEmptyState.classList.remove('hidden');
  } else {
    el.inventoryEmptyState.classList.add('hidden');
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="stock-name-cell">${escapeHtml(item.stockName)}</td>
        <td><span class="vendor-tag">${escapeHtml(item.vendorName || 'N/A')}</span></td>
        <td style="text-align: right;" class="qty-val">${Number(item.quantity).toLocaleString()}</td>
        <td class="date-val">${escapeHtml(item.date || '')}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action" onclick="openEditStock('${item.id}')">Edit</button>
            <button class="btn-table-action delete" onclick="confirmDeleteStock('${item.id}')">Delete</button>
          </div>
        </td>
      `;
      el.inventoryTableBody.appendChild(tr);
    });
  }
}

// Vendors Rendering
function renderVendors() {
  const query = (el.vendorSearchInput.value || '').trim().toLowerCase();
  let vendors = [...appData.vendors];

  if (query) {
    vendors = vendors.filter(v => {
      return (
        (v.name || '').toLowerCase().includes(query) ||
        (v.contactPerson || '').toLowerCase().includes(query) ||
        (v.phone || '').toLowerCase().includes(query) ||
        (v.email || '').toLowerCase().includes(query)
      );
    });
  }

  el.vendorTableBody.innerHTML = '';

  if (vendors.length === 0) {
    el.vendorEmptyState.classList.remove('hidden');
  } else {
    el.vendorEmptyState.classList.add('hidden');
    vendors.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="stock-name-cell">${escapeHtml(v.name)}</td>
        <td>${escapeHtml(v.contactPerson || '-')}</td>
        <td>${escapeHtml(v.phone || '-')}</td>
        <td>${escapeHtml(v.email || '-')}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action" onclick="openEditVendor('${v.id}')">Edit</button>
            <button class="btn-table-action delete" onclick="confirmDeleteVendor('${v.id}')">Delete</button>
          </div>
        </td>
      `;
      el.vendorTableBody.appendChild(tr);
    });
  }
}

// Stock Modal Actions
function openAddStock() {
  el.modalStockTitle.textContent = 'Add Stock';
  el.stockId.value = '';
  el.stockNameInput.value = '';
  refreshVendorDropdowns();
  el.stockVendorSelect.value = '';
  el.stockQtyInput.value = '';
  el.stockDateInput.value = getTodayString();
  el.modalStock.classList.remove('hidden');
  setTimeout(() => el.stockNameInput.focus(), 50);
}

window.openEditStock = function(id) {
  const item = appData.inventory.find(i => i.id === id);
  if (!item) return;

  el.modalStockTitle.textContent = 'Edit Stock';
  el.stockId.value = item.id;
  el.stockNameInput.value = item.stockName;
  refreshVendorDropdowns(item.vendorId);
  el.stockQtyInput.value = item.quantity;
  el.stockDateInput.value = item.date || getTodayString();
  el.modalStock.classList.remove('hidden');
  setTimeout(() => el.stockNameInput.focus(), 50);
};

function closeStockModal() {
  el.modalStock.classList.add('hidden');
}

// Vendor Modal Actions
function openAddVendor(fromStockModal = false) {
  returnToStockModalAfterVendor = fromStockModal;
  el.modalVendorTitle.textContent = 'Add Vendor';
  el.vendorId.value = '';
  el.vendorNameInput.value = '';
  el.vendorContactInput.value = '';
  el.vendorPhoneInput.value = '';
  el.vendorEmailInput.value = '';

  if (fromStockModal) {
    el.modalStock.classList.add('hidden');
  }

  el.modalVendor.classList.remove('hidden');
  setTimeout(() => el.vendorNameInput.focus(), 50);
}

window.openEditVendor = function(id) {
  returnToStockModalAfterVendor = false;
  const v = appData.vendors.find(item => item.id === id);
  if (!v) return;

  el.modalVendorTitle.textContent = 'Edit Vendor';
  el.vendorId.value = v.id;
  el.vendorNameInput.value = v.name;
  el.vendorContactInput.value = v.contactPerson || '';
  el.vendorPhoneInput.value = v.phone || '';
  el.vendorEmailInput.value = v.email || '';
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
  const item = appData.inventory.find(i => i.id === id);
  if (!item) return;

  el.confirmTitle.textContent = 'Delete Stock';
  el.confirmMessage.textContent = `Are you sure you want to delete "${item.stockName}"?`;
  pendingDeleteAction = async () => {
    appData.inventory = appData.inventory.filter(i => i.id !== id);
    await persist();
    renderInventory();
    showToast('Stock item deleted');
  };
  el.modalConfirm.classList.remove('hidden');
};

window.confirmDeleteVendor = function(id) {
  const v = appData.vendors.find(item => item.id === id);
  if (!v) return;

  const linkedItems = appData.inventory.filter(i => i.vendorId === id);
  let message = `Are you sure you want to delete vendor "${v.name}"?`;
  if (linkedItems.length > 0) {
    message += ` (${linkedItems.length} inventory item(s) are linked to this vendor).`;
  }

  el.confirmTitle.textContent = 'Delete Vendor';
  el.confirmMessage.textContent = message;
  pendingDeleteAction = async () => {
    appData.vendors = appData.vendors.filter(item => item.id !== id);
    // Keep inventory items but unlink or preserve vendor name
    appData.inventory.forEach(item => {
      if (item.vendorId === id) {
        item.vendorName = `${v.name} (Removed)`;
        item.vendorId = '';
      }
    });
    await persist();
    refreshVendorDropdowns();
    renderVendors();
    renderInventory();
    showToast('Vendor deleted');
  };
  el.modalConfirm.classList.remove('hidden');
};

function closeConfirmModal() {
  el.modalConfirm.classList.add('hidden');
  pendingDeleteAction = null;
}

// Save Handlers
el.stockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.stockId.value;
  const stockName = el.stockNameInput.value.trim();
  const vendorId = el.stockVendorSelect.value;
  const quantity = parseInt(el.stockQtyInput.value, 10) || 0;
  const date = el.stockDateInput.value;

  if (!stockName || !vendorId) {
    return;
  }

  const vendor = appData.vendors.find(v => v.id === vendorId);
  const vendorName = vendor ? vendor.name : 'Unknown';

  if (id) {
    // Edit existing
    const idx = appData.inventory.findIndex(item => item.id === id);
    if (idx !== -1) {
      appData.inventory[idx] = {
        ...appData.inventory[idx],
        stockName,
        vendorId,
        vendorName,
        quantity,
        date
      };
      showToast('Stock item updated');
    }
  } else {
    // Add new
    const newItem = {
      id: 'inv-' + Date.now(),
      stockName,
      vendorId,
      vendorName,
      quantity,
      date,
      createdAt: getTodayString()
    };
    appData.inventory.unshift(newItem);
    showToast('Stock item added');
  }

  await persist();
  closeStockModal();
  renderInventory();
});

el.vendorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.vendorId.value;
  const name = el.vendorNameInput.value.trim();
  const contactPerson = el.vendorContactInput.value.trim();
  const phone = el.vendorPhoneInput.value.trim();
  const email = el.vendorEmailInput.value.trim();

  if (!name) return;

  let createdVendorId = id;

  if (id) {
    // Edit existing
    const idx = appData.vendors.findIndex(v => v.id === id);
    if (idx !== -1) {
      appData.vendors[idx] = {
        ...appData.vendors[idx],
        name,
        contactPerson,
        phone,
        email
      };
      // Also update vendorName in inventory
      appData.inventory.forEach(item => {
        if (item.vendorId === id) {
          item.vendorName = name;
        }
      });
      showToast('Vendor updated');
    }
  } else {
    // Add new
    createdVendorId = 'v-' + Date.now();
    const newVendor = {
      id: createdVendorId,
      name,
      contactPerson,
      phone,
      email,
      createdAt: getTodayString()
    };
    appData.vendors.push(newVendor);
    showToast('Vendor added');
  }

  await persist();
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

  let csv = 'Stock Name,Vendor,Quantity,Date\r\n';
  appData.inventory.forEach(item => {
    const name = `"${(item.stockName || '').replace(/"/g, '""')}"`;
    const vendor = `"${(item.vendorName || '').replace(/"/g, '""')}"`;
    const qty = item.quantity;
    const date = item.date || '';
    csv += `${name},${vendor},${qty},${date}\r\n`;
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
  renderInventory();
});

el.btnClearInventorySearch.addEventListener('click', () => {
  el.inventorySearchInput.value = '';
  el.btnClearInventorySearch.classList.add('hidden');
  renderInventory();
});

el.vendorSearchInput.addEventListener('input', (e) => {
  if (e.target.value) {
    el.btnClearVendorSearch.classList.remove('hidden');
  } else {
    el.btnClearVendorSearch.classList.add('hidden');
  }
  renderVendors();
});

el.btnClearVendorSearch.addEventListener('click', () => {
  el.vendorSearchInput.value = '';
  el.btnClearVendorSearch.classList.add('hidden');
  renderVendors();
});

el.filterVendorSelect.addEventListener('change', renderInventory);
el.filterStockStatus.addEventListener('change', renderInventory);
el.filterDateOrder.addEventListener('change', renderInventory);

el.btnResetInventoryFilters.addEventListener('click', () => {
  el.inventorySearchInput.value = '';
  el.btnClearInventorySearch.classList.add('hidden');
  el.filterVendorSelect.value = '';
  el.filterStockStatus.value = '';
  el.filterDateOrder.value = 'newest';
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

// Initial Boot
async function init() {
  try {
    const data = await api.getData();
    if (data && (data.vendors || data.inventory)) {
      appData = {
        vendors: data.vendors || [],
        inventory: data.inventory || []
      };
    }
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }

  refreshVendorDropdowns();
  updateBadges();
  renderInventory();
}

window.addEventListener('DOMContentLoaded', init);
