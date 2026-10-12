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

  filtered.forEach((vendor, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-ven-sr font-num" style="text-align: left; padding-left: 24px;">${idx + 1}</td>
      <td class="col-ven-name font-bold" style="text-align: left; padding-left: 16px;">${window.escapeHtml(vendor.name)}</td>
      <td class="col-ven-contact" style="text-align: center;">${window.escapeHtml(vendor.contactPerson || '-')}</td>
      <td class="col-ven-phone font-mono" style="text-align: center;"><span class="code-pill">${window.escapeHtml(vendor.phone || '-')}</span></td>
      <td class="col-ven-address text-secondary" style="text-align: center;">${window.escapeHtml(vendor.address || '-')}</td>
      <td class="col-ven-actions col-dots-actions text-center">
        <div class="dots-wrapper">
          <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'venMenu_${vendor.id}')" title="Actions">
            <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
          <div id="venMenu_${vendor.id}" class="action-menu hidden">
            <button type="button" class="action-menu-item" onclick="window.openEditVendor('${vendor.id}')">
              <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button type="button" class="action-menu-item text-danger" onclick="window.confirmDeleteVendor('${vendor.id}')">
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
