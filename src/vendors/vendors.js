// Vendors Module Logic
let vendorPage = 1;

const vendorEl = {
  vendorTableBody: document.getElementById('vendorTableBody'),
  vendorEmptyState: document.getElementById('vendorEmptyState'),
  vendorSearchBy: document.getElementById('vendorSearchBy'),
  vendorSearchInput: document.getElementById('vendorSearchInput'),
  btnClearVendorSearch: document.getElementById('btnClearVendorSearch'),
  btnOpenAddVendor: document.getElementById('btnOpenAddVendor'),

  modalVendor: document.getElementById('modalVendor'),
  modalVendorTitle: document.getElementById('modalVendorTitle'),
  btnCloseVendorModal: document.getElementById('btnCloseVendorModal'),
  btnCancelVendor: document.getElementById('btnCancelVendor'),
  vendorForm: document.getElementById('vendorForm'),
  vendorId: document.getElementById('vendorId'),
  vendorNameInput: document.getElementById('vendorNameInput'),
  vendorPhoneInput: document.getElementById('vendorPhoneInput'),
  vendorContactPersonInput: document.getElementById('vendorContactPersonInput'),
  vendorEmailInput: document.getElementById('vendorEmailInput'),
  vendorAddressInput: document.getElementById('vendorAddressInput'),
  vendorNotesInput: document.getElementById('vendorNotesInput')
};

function getFilteredVendors() {
  let list = [...(window.appData && window.appData.vendors ? window.appData.vendors : [])];
  const query = (vendorEl.vendorSearchInput ? vendorEl.vendorSearchInput.value : '').trim().toLowerCase();
  const searchBy = vendorEl.vendorSearchBy ? vendorEl.vendorSearchBy.value : 'all';

  if (query) {
    list = list.filter(v => {
      if (searchBy === 'name') return (v.name || '').toLowerCase().includes(query);
      if (searchBy === 'phone') return (v.phone || '').toLowerCase().includes(query);
      return (v.name || '').toLowerCase().includes(query) ||
        (v.phone || '').toLowerCase().includes(query) ||
        (v.contactPerson || '').toLowerCase().includes(query) ||
        (v.address || '').toLowerCase().includes(query);
    });
  }

  return list;
}

function renderVendors() {
  if (!vendorEl.vendorTableBody) return;
  const filtered = getFilteredVendors();

  vendorEl.vendorTableBody.innerHTML = '';

  if (filtered.length === 0) {
    if (vendorEl.vendorEmptyState) vendorEl.vendorEmptyState.classList.remove('hidden');
    return;
  }
  if (vendorEl.vendorEmptyState) vendorEl.vendorEmptyState.classList.add('hidden');

  filtered.forEach((vendor) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-vendor-name">
        <div class="vendor-avatar-row">
          <div class="vendor-avatar">${window.escapeHtml((vendor.name || 'V').substring(0, 2).toUpperCase())}</div>
          <span class="vendor-name-text font-bold">${window.escapeHtml(vendor.name)}</span>
        </div>
      </td>
      <td class="col-phone font-num">${window.escapeHtml(vendor.phone || '-')}</td>
      <td>${window.escapeHtml(vendor.contactPerson || '-')}</td>
      <td class="text-secondary">${window.escapeHtml(vendor.address || '-')}</td>
      <td class="col-dots-actions">
        <button class="btn btn-sm btn-secondary" onclick="openEditVendor('${vendor.id}')" title="Edit Vendor">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteVendor('${vendor.id}')" title="Delete Vendor">🗑️</button>
      </td>
    `;
    vendorEl.vendorTableBody.appendChild(tr);
  });
}

function openAddVendor() {
  if (vendorEl.modalVendorTitle) vendorEl.modalVendorTitle.textContent = 'Add Vendor';
  if (vendorEl.vendorId) vendorEl.vendorId.value = '';
  if (vendorEl.vendorNameInput) vendorEl.vendorNameInput.value = '';
  if (vendorEl.vendorPhoneInput) vendorEl.vendorPhoneInput.value = '';
  if (vendorEl.vendorContactPersonInput) vendorEl.vendorContactPersonInput.value = '';
  if (vendorEl.vendorEmailInput) vendorEl.vendorEmailInput.value = '';
  if (vendorEl.vendorAddressInput) vendorEl.vendorAddressInput.value = '';
  if (vendorEl.vendorNotesInput) vendorEl.vendorNotesInput.value = '';
  if (vendorEl.modalVendor) vendorEl.modalVendor.classList.remove('hidden');
}

function openEditVendor(vendorId) {
  const vendor = (window.appData && window.appData.vendors ? window.appData.vendors : []).find(v => v.id === vendorId);
  if (!vendor) return;

  if (vendorEl.modalVendorTitle) vendorEl.modalVendorTitle.textContent = 'Edit Vendor';
  if (vendorEl.vendorId) vendorEl.vendorId.value = vendor.id;
  if (vendorEl.vendorNameInput) vendorEl.vendorNameInput.value = vendor.name;
  if (vendorEl.vendorPhoneInput) vendorEl.vendorPhoneInput.value = vendor.phone || '';
  if (vendorEl.vendorContactPersonInput) vendorEl.vendorContactPersonInput.value = vendor.contactPerson || '';
  if (vendorEl.vendorEmailInput) vendorEl.vendorEmailInput.value = vendor.email || '';
  if (vendorEl.vendorAddressInput) vendorEl.vendorAddressInput.value = vendor.address || '';
  if (vendorEl.vendorNotesInput) vendorEl.vendorNotesInput.value = vendor.notes || '';
  if (vendorEl.modalVendor) vendorEl.modalVendor.classList.remove('hidden');
}

function closeVendorModal() {
  if (vendorEl.modalVendor) vendorEl.modalVendor.classList.add('hidden');
}

function confirmDeleteVendor(vendorId) {
  const vendor = (window.appData && window.appData.vendors ? window.appData.vendors : []).find(v => v.id === vendorId);
  const name = vendor ? vendor.name : 'this vendor';

  if (window.openConfirmModal) {
    window.openConfirmModal({
      title: 'Delete Vendor',
      message: `Are you sure you want to delete vendor "${name}"?`,
      onConfirm: async () => {
        if (window.api && window.api.deleteVendor) {
          await window.api.deleteVendor(vendorId);
        }
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
        renderVendors();
      }
    });
  }
}

// Vendor Form Submit
if (vendorEl.vendorForm) {
  vendorEl.vendorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = vendorEl.vendorId?.value;
    const name = vendorEl.vendorNameInput?.value.trim();
    const phone = vendorEl.vendorPhoneInput?.value.trim();
    const contactPerson = vendorEl.vendorContactPersonInput?.value.trim() || '';
    const email = vendorEl.vendorEmailInput?.value.trim() || '';
    const address = vendorEl.vendorAddressInput?.value.trim() || '';
    const notes = vendorEl.vendorNotesInput?.value.trim() || '';

    if (!name || !phone) return;

    const vendorRecord = {
      id: id || undefined,
      name,
      phone,
      contactPerson,
      email,
      address,
      notes
    };

    if (id) {
      if (window.api && window.api.updateVendor) await window.api.updateVendor(vendorRecord);
    } else {
      if (window.api && window.api.addVendor) await window.api.addVendor(vendorRecord);
    }

    if (window.reloadFromDatabase) await window.reloadFromDatabase();
    closeVendorModal();
    renderVendors();
  });
}

// Event Listeners
if (vendorEl.btnOpenAddVendor) vendorEl.btnOpenAddVendor.addEventListener('click', openAddVendor);
if (vendorEl.btnCloseVendorModal) vendorEl.btnCloseVendorModal.addEventListener('click', closeVendorModal);
if (vendorEl.btnCancelVendor) vendorEl.btnCancelVendor.addEventListener('click', closeVendorModal);

if (vendorEl.vendorSearchInput) {
  vendorEl.vendorSearchInput.addEventListener('input', (e) => {
    if (vendorEl.btnClearVendorSearch) {
      if (e.target.value) vendorEl.btnClearVendorSearch.classList.remove('hidden');
      else vendorEl.btnClearVendorSearch.classList.add('hidden');
    }
    renderVendors();
  });
}

if (vendorEl.vendorSearchBy) {
  vendorEl.vendorSearchBy.addEventListener('change', () => {
    renderVendors();
  });
}

if (vendorEl.btnClearVendorSearch) {
  vendorEl.btnClearVendorSearch.addEventListener('click', () => {
    vendorEl.vendorSearchInput.value = '';
    vendorEl.btnClearVendorSearch.classList.add('hidden');
    renderVendors();
  });
}

// Expose on window
window.renderVendors = renderVendors;
window.getFilteredVendors = getFilteredVendors;
window.openAddVendor = openAddVendor;
window.openEditVendor = openEditVendor;
window.closeVendorModal = closeVendorModal;
window.confirmDeleteVendor = confirmDeleteVendor;
