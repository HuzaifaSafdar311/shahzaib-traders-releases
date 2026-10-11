// Vendors Module Logic
let vendorPage = 1;
let returnToStockModalAfterVendor = false;

const vendorEl = {
  vendorTableBody: document.getElementById('vendorTableBody'),
  vendorEmptyState: document.getElementById('vendorEmptyState'),
  vendorSearchBy: document.getElementById('vendorSearchBy'),
  vendorSearchInput: document.getElementById('vendorSearchInput'),
  btnClearVendorSearch: document.getElementById('btnClearVendorSearch'),
  btnOpenAddVendor: document.getElementById('btnOpenAddVendor'),

  vendorPaginationInfo: document.getElementById('vendorPaginationInfo'),
  btnVendorPrevPage: document.getElementById('btnVendorPrevPage'),
  btnVendorNextPage: document.getElementById('btnVendorNextPage'),
  vendorPageNumbers: document.getElementById('vendorPageNumbers'),

  modalVendor: document.getElementById('modalVendor'),
  modalVendorTitle: document.getElementById('modalVendorTitle'),
  btnCloseVendorModal: document.getElementById('btnCloseVendorModal'),
  btnCancelVendor: document.getElementById('btnCancelVendor'),
  vendorForm: document.getElementById('vendorForm'),
  vendorId: document.getElementById('vendorId'),
  vendorNameInput: document.getElementById('vendorNameInput'),
  vendorPhoneInput: document.getElementById('vendorPhoneInput'),
  badgeVendorCount: document.getElementById('badgeVendorCount'),
  stockVendorSelect: document.getElementById('stockVendorSelect'),
  modalStock: document.getElementById('modalStock')
};

function getFilteredVendors() {
  let list = [...(window.appData && window.appData.vendors ? window.appData.vendors : [])];
  const query = (vendorEl.vendorSearchInput ? vendorEl.vendorSearchInput.value : '').trim().toLowerCase();
  const searchBy = vendorEl.vendorSearchBy ? vendorEl.vendorSearchBy.value : 'all';

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
  if (!vendorEl.vendorTableBody) return;
  const filtered = getFilteredVendors();
  const total = filtered.length;
  const pageSize = window.getAdaptivePageSize('vendors');
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (vendorPage > totalPages) vendorPage = totalPages;
  if (vendorPage < 1) vendorPage = 1;

  const start = (vendorPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  vendorEl.vendorTableBody.innerHTML = '';

  if (pageItems.length === 0) {
    if (vendorEl.vendorEmptyState) vendorEl.vendorEmptyState.classList.remove('hidden');
    if (vendorEl.vendorPaginationInfo) vendorEl.vendorPaginationInfo.textContent = 'Showing 0 of 0 vendors';
  } else {
    if (vendorEl.vendorEmptyState) vendorEl.vendorEmptyState.classList.add('hidden');
    const end = Math.min(start + pageSize, total);
    if (vendorEl.vendorPaginationInfo) vendorEl.vendorPaginationInfo.textContent = `Showing ${start + 1}-${end} of ${total} vendors`;

    pageItems.forEach((vendor) => {
      const menuId = `menu-ven-${vendor.id}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-vendor-name">
          <div class="vendor-avatar-row">
            <div class="vendor-avatar">${window.escapeHtml((vendor.name || 'V').substring(0, 2).toUpperCase())}</div>
            <span class="vendor-name-text">${window.escapeHtml(vendor.name)}</span>
          </div>
        </td>
        <td class="col-phone font-num">${window.escapeHtml(vendor.phone || '-')}</td>
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
      vendorEl.vendorTableBody.appendChild(tr);
    });
  }

  // Update Pagination Controls
  if (vendorEl.btnVendorPrevPage) vendorEl.btnVendorPrevPage.disabled = vendorPage <= 1;
  if (vendorEl.btnVendorNextPage) vendorEl.btnVendorNextPage.disabled = vendorPage >= totalPages;

  window.renderPaginationNumbers(vendorEl.vendorPageNumbers, vendorPage, totalPages, (page) => {
    vendorPage = page;
    renderVendors();
  });
}

function openAddVendor(fromStockModal = false) {
  returnToStockModalAfterVendor = fromStockModal;
  if (fromStockModal && vendorEl.modalStock) {
    vendorEl.modalStock.classList.add('hidden');
  }
  vendorEl.modalVendorTitle.textContent = 'Add Vendor';
  vendorEl.vendorId.value = '';
  vendorEl.vendorNameInput.value = '';
  vendorEl.vendorPhoneInput.value = '';
  vendorEl.modalVendor.classList.remove('hidden');
}

function openEditVendor(vendorId) {
  window.closeAllActionMenus();
  const vendor = (window.appData && window.appData.vendors ? window.appData.vendors : []).find(v => v.id === vendorId);
  if (!vendor) return;

  vendorEl.modalVendorTitle.textContent = 'Edit Vendor';
  vendorEl.vendorId.value = vendor.id;
  vendorEl.vendorNameInput.value = vendor.name;
  vendorEl.vendorPhoneInput.value = vendor.phone || '';
  vendorEl.modalVendor.classList.remove('hidden');
}

function closeVendorModal() {
  vendorEl.modalVendor.classList.add('hidden');
  if (returnToStockModalAfterVendor && vendorEl.modalStock) {
    vendorEl.modalStock.classList.remove('hidden');
    returnToStockModalAfterVendor = false;
  }
}

function confirmDeleteVendor(vendorId) {
  window.closeAllActionMenus();
  const vendor = (window.appData && window.appData.vendors ? window.appData.vendors : []).find(v => v.id === vendorId);
  const name = vendor ? vendor.name : 'this vendor';

  if (window.openConfirmModal) {
    window.openConfirmModal({
      title: 'Delete Vendor',
      message: `Are you sure you want to delete vendor "${name}"? Associated stock vendor references will be cleared.`,
      onConfirm: async () => {
        if (window.api && window.api.deleteVendor) {
          await window.api.deleteVendor(vendorId);
        }
        window.showToast('Vendor deleted');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
      }
    });
  }
}

function refreshVendorDropdowns(selectedVendorId = null) {
  if (!vendorEl.stockVendorSelect) return;
  vendorEl.stockVendorSelect.innerHTML = '<option value="">Select Vendor</option>';
  const list = (window.appData && window.appData.vendors ? window.appData.vendors : []);
  list.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    if (selectedVendorId && v.id === selectedVendorId) opt.selected = true;
    vendorEl.stockVendorSelect.appendChild(opt);
  });
}

// Vendor Form Submit
if (vendorEl.vendorForm) {
  vendorEl.vendorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = vendorEl.vendorId.value;
    const name = vendorEl.vendorNameInput.value.trim();
    const phone = vendorEl.vendorPhoneInput.value.trim();

    let createdVendorId = id;
    if (id) {
      const updated = { id, name, phone };
      if (window.api && window.api.updateVendor) await window.api.updateVendor(updated);
      window.showToast('Vendor updated');
    } else {
      createdVendorId = 'v-' + Date.now();
      const newVendor = { id: createdVendorId, name, phone, createdAt: window.getTodayString() };
      if (window.api && window.api.addVendor) await window.api.addVendor(newVendor);
      window.showToast('Vendor added');
    }

    if (window.reloadFromDatabase) await window.reloadFromDatabase();
    refreshVendorDropdowns(createdVendorId);
    vendorEl.modalVendor.classList.add('hidden');

    if (returnToStockModalAfterVendor && vendorEl.modalStock) {
      vendorEl.modalStock.classList.remove('hidden');
      if (vendorEl.stockVendorSelect) vendorEl.stockVendorSelect.value = createdVendorId;
      returnToStockModalAfterVendor = false;
    }

    renderVendors();
    if (window.renderInventory) window.renderInventory();
  });
}

// Event Listeners
if (vendorEl.btnOpenAddVendor) vendorEl.btnOpenAddVendor.addEventListener('click', () => openAddVendor(false));
if (vendorEl.btnCloseVendorModal) vendorEl.btnCloseVendorModal.addEventListener('click', closeVendorModal);
if (vendorEl.btnCancelVendor) vendorEl.btnCancelVendor.addEventListener('click', closeVendorModal);

if (vendorEl.vendorSearchInput) {
  vendorEl.vendorSearchInput.addEventListener('input', (e) => {
    if (vendorEl.btnClearVendorSearch) {
      if (e.target.value) vendorEl.btnClearVendorSearch.classList.remove('hidden');
      else vendorEl.btnClearVendorSearch.classList.add('hidden');
    }
    vendorPage = 1;
    renderVendors();
  });
}

if (vendorEl.vendorSearchBy) {
  vendorEl.vendorSearchBy.addEventListener('change', () => {
    vendorPage = 1;
    renderVendors();
  });
}

if (vendorEl.btnClearVendorSearch) {
  vendorEl.btnClearVendorSearch.addEventListener('click', () => {
    vendorEl.vendorSearchInput.value = '';
    vendorEl.btnClearVendorSearch.classList.add('hidden');
    vendorPage = 1;
    renderVendors();
  });
}

if (vendorEl.btnVendorPrevPage) {
  vendorEl.btnVendorPrevPage.addEventListener('click', () => {
    if (vendorPage > 1) {
      vendorPage--;
      renderVendors();
    }
  });
}

if (vendorEl.btnVendorNextPage) {
  vendorEl.btnVendorNextPage.addEventListener('click', () => {
    const pageSize = window.getAdaptivePageSize('vendors');
    const totalPages = Math.ceil(getFilteredVendors().length / pageSize) || 1;
    if (vendorPage < totalPages) {
      vendorPage++;
      renderVendors();
    }
  });
}

// Expose on window
window.renderVendors = renderVendors;
window.getFilteredVendors = getFilteredVendors;
window.openAddVendor = openAddVendor;
window.openEditVendor = openEditVendor;
window.closeVendorModal = closeVendorModal;
window.confirmDeleteVendor = confirmDeleteVendor;
window.refreshVendorDropdowns = refreshVendorDropdowns;
