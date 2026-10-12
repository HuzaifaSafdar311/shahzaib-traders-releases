// Shahzaib Traders - General Info Module Controller
// Manages Company Info, Province Info, Area Info, and Party Type sub-sections

(function() {
  'use strict';

  // API bridge with browser fallback
  const api = window.generalInfoAPI || (window.electronAPI && window.electronAPI.generalInfo) || {
    getGeneralInfo: async () => {
      const stored = localStorage.getItem('gi_data_backup');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
      return {
        companyInfo: {
          id: 'company-main',
          name: 'Shahzaib Traders',
          tagline: 'Wholesale & Retail Trading Solutions',
          contactPerson: 'Shahzaib Ali',
          phone: '0300-1234567',
          altPhone: '042-37654321',
          email: 'info@shahzaibtraders.com',
          address: 'Shop #14, Main Wholesale Commercial Market, Lahore, Pakistan',
          ntn: '4567890-1',
          strn: 'STRN-789654-2',
          currency: 'PKR',
          website: 'www.shahzaibtraders.com',
          notes: 'Providing top quality trade and distribution services across Pakistan.',
          updatedAt: new Date().toISOString()
        },
        provinces: [
          { id: 'prov-punjab', name: 'Punjab', code: 'PB', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'prov-sindh', name: 'Sindh', code: 'SD', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'prov-kpk', name: 'Khyber Pakhtunkhwa', code: 'KP', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'prov-balochistan', name: 'Balochistan', code: 'BA', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'prov-islamabad', name: 'Islamabad Capital Territory', code: 'ICT', status: 'Active', createdAt: new Date().toISOString() }
        ],
        areas: [
          { id: 'area-1', name: 'Badami Bagh', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Lahore', code: '54000', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'area-2', name: 'Shah Alam Market', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Lahore', code: '54000', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'area-3', name: 'Hall Road', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Lahore', code: '54000', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'area-4', name: 'Saddar', provinceId: 'prov-sindh', provinceName: 'Sindh', city: 'Karachi', code: '74400', status: 'Active', createdAt: new Date().toISOString() }
        ],
        partyTypes: [
          { id: 'pt-1', name: 'Customer', code: 'CUST', description: 'Standard purchasing client or buyer', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'pt-2', name: 'Vendor / Supplier', code: 'VEND', description: 'Goods supplier and manufacturer', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'pt-3', name: 'Wholesaler', code: 'WHL', description: 'Bulk quantity trade partner', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'pt-4', name: 'Retailer', code: 'RET', description: 'Small to mid volume store merchant', status: 'Active', createdAt: new Date().toISOString() }
        ],
        parties: [
          { id: 'party-1', name: 'Al-Madina Traders', partyTypeId: 'pt-1', partyTypeName: 'Customer', contactPerson: 'Haji Aslam', phone: '0300-9876543', email: 'aslam@almadina.com', provinceId: 'prov-punjab', provinceName: 'Punjab', areaId: 'area-1', areaName: 'Badami Bagh', city: 'Lahore', address: 'Shop #12, Wholesale Market', ntn: '1234567-8', openingBalance: 15000, status: 'Active', createdAt: new Date().toISOString() },
          { id: 'party-2', name: 'Tariq Corporation', partyTypeId: 'pt-2', partyTypeName: 'Vendor / Supplier', contactPerson: 'Tariq Mehmood', phone: '0321-4567890', email: 'tariq@corp.pk', provinceId: 'prov-punjab', provinceName: 'Punjab', areaId: 'area-2', areaName: 'Shah Alam Market', city: 'Lahore', address: 'Plot 45, Industrial Zone', ntn: '8765432-1', openingBalance: 0, status: 'Active', createdAt: new Date().toISOString() }
        ]
      };
    },
    saveCompanyInfo: async (info) => ({ success: true, data: info }),
    addProvince: async (p) => ({ success: true, data: p }),
    updateProvince: async (p) => ({ success: true, data: p }),
    deleteProvince: async (id) => ({ success: true }),
    addArea: async (a) => ({ success: true, data: a }),
    updateArea: async (a) => ({ success: true, data: a }),
    deleteArea: async (id) => ({ success: true }),
    addPartyType: async (pt) => ({ success: true, data: pt }),
    updatePartyType: async (pt) => ({ success: true, data: pt }),
    deletePartyType: async (id) => ({ success: true }),
    getParties: async () => [],
    addParty: async (p) => ({ success: true, data: p }),
    updateParty: async (p) => ({ success: true, data: p }),
    deleteParty: async (id) => ({ success: true })
  };

  let state = {
    activeSubTab: 'company', // 'company' | 'provinces' | 'areas' | 'party-types' | 'parties'
    companyInfo: {},
    provinces: [],
    areas: [],
    partyTypes: [],
    parties: [],
    filters: {
      provinceSearch: '',
      areaSearch: '',
      areaProvinceFilter: '',
      partyTypeSearch: '',
      partySearch: '',
      partyTypeFilter: '',
      partyProvinceFilter: ''
    }
  };

  // Helper toast notification
  function showToast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Load data from DB
  async function loadData() {
    try {
      const res = await api.getGeneralInfo();
      if (res) {
        state.companyInfo = res.companyInfo || {};
        state.provinces = Array.isArray(res.provinces) ? res.provinces : [];
        state.areas = Array.isArray(res.areas) ? res.areas : [];
        state.partyTypes = Array.isArray(res.partyTypes) ? res.partyTypes : [];
        state.parties = Array.isArray(res.parties) ? res.parties : [];

        try {
          localStorage.setItem('gi_data_backup', JSON.stringify(res));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error fetching General Info data:', err);
    }
    updateTabCounts();
  }

  function updateTabCounts() {
    const badgeProv = document.getElementById('badgeGiProvinces');
    const badgeArea = document.getElementById('badgeGiAreas');
    const badgePt = document.getElementById('badgeGiPartyTypes');
    const badgeParty = document.getElementById('badgeGiParties');

    if (badgeProv) badgeProv.textContent = state.provinces.length;
    if (badgeArea) badgeArea.textContent = state.areas.length;
    if (badgePt) badgePt.textContent = state.partyTypes.length;
    if (badgeParty) badgeParty.textContent = state.parties.length;
  }

  // Switch Sub-Tabs
  function switchSubTab(tabName) {
    state.activeSubTab = tabName;

    // Update tab button classes
    document.querySelectorAll('.gi-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update view containers
    document.querySelectorAll('.gi-sub-view').forEach(view => {
      view.classList.toggle('active', view.id === `giView-${tabName}`);
    });

    renderCurrentSubTab();
  }

  function renderCurrentSubTab() {
    switch (state.activeSubTab) {
      case 'company':
        renderCompanyInfo();
        break;
      case 'provinces':
        renderProvinces();
        break;
      case 'areas':
        renderAreas();
        break;
      case 'party-types':
        renderPartyTypes();
        break;
      case 'parties':
        renderParties();
        break;
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Section 1: Company Info
  // --------------------------------------------------------------------------
  function renderCompanyInfo() {
    const comp = state.companyInfo || {};

    const elName = document.getElementById('ciDisplayName');
    const elTagline = document.getElementById('ciDisplayTagline');
    const elPerson = document.getElementById('ciDisplayPerson');
    const elPhone = document.getElementById('ciDisplayPhone');
    const elAltPhone = document.getElementById('ciDisplayAltPhone');
    const elEmail = document.getElementById('ciDisplayEmail');
    const elAddress = document.getElementById('ciDisplayAddress');
    const elNtn = document.getElementById('ciDisplayNtn');
    const elStrn = document.getElementById('ciDisplayStrn');
    const elCurrency = document.getElementById('ciDisplayCurrency');
    const elWebsite = document.getElementById('ciDisplayWebsite');
    const elNotes = document.getElementById('ciDisplayNotes');
    const elAvatar = document.getElementById('ciAvatarInitials');

    if (elName) elName.textContent = comp.name || 'Shahzaib Traders';
    if (elTagline) elTagline.textContent = comp.tagline || 'Wholesale & Retail Trading Solutions';
    if (elPerson) elPerson.textContent = comp.contactPerson || '-';
    if (elPhone) elPhone.textContent = comp.phone || '-';
    if (elAltPhone) elAltPhone.textContent = comp.altPhone || '-';
    if (elEmail) elEmail.textContent = comp.email || '-';
    if (elAddress) elAddress.textContent = comp.address || '-';
    if (elNtn) elNtn.textContent = comp.ntn || '-';
    if (elStrn) elStrn.textContent = comp.strn || '-';
    if (elCurrency) elCurrency.textContent = comp.currency || 'PKR';
    if (elWebsite) elWebsite.textContent = comp.website || '-';
    if (elNotes) elNotes.textContent = comp.notes || '-';

    if (elAvatar) {
      const initials = (comp.name || 'ST').substring(0, 2).toUpperCase();
      elAvatar.textContent = initials;
    }
  }

  function openEditCompanyModal() {
    const comp = state.companyInfo || {};
    const modal = document.getElementById('modalEditCompany');
    if (!modal) return;

    document.getElementById('ciInputName').value = comp.name || '';
    document.getElementById('ciInputTagline').value = comp.tagline || '';
    document.getElementById('ciInputPerson').value = comp.contactPerson || '';
    document.getElementById('ciInputPhone').value = comp.phone || '';
    document.getElementById('ciInputAltPhone').value = comp.altPhone || '';
    document.getElementById('ciInputEmail').value = comp.email || '';
    document.getElementById('ciInputAddress').value = comp.address || '';
    document.getElementById('ciInputNtn').value = comp.ntn || '';
    document.getElementById('ciInputStrn').value = comp.strn || '';
    document.getElementById('ciInputCurrency').value = comp.currency || 'PKR';
    document.getElementById('ciInputWebsite').value = comp.website || '';
    document.getElementById('ciInputNotes').value = comp.notes || '';

    modal.classList.remove('hidden');
  }

  function closeEditCompanyModal() {
    const modal = document.getElementById('modalEditCompany');
    if (modal) modal.classList.add('hidden');
  }

  async function handleCompanyFormSubmit(e) {
    e.preventDefault();
    const payload = {
      id: state.companyInfo.id || 'company-main',
      name: document.getElementById('ciInputName').value.trim(),
      tagline: document.getElementById('ciInputTagline').value.trim(),
      contactPerson: document.getElementById('ciInputPerson').value.trim(),
      phone: document.getElementById('ciInputPhone').value.trim(),
      altPhone: document.getElementById('ciInputAltPhone').value.trim(),
      email: document.getElementById('ciInputEmail').value.trim(),
      address: document.getElementById('ciInputAddress').value.trim(),
      ntn: document.getElementById('ciInputNtn').value.trim(),
      strn: document.getElementById('ciInputStrn').value.trim(),
      currency: document.getElementById('ciInputCurrency').value.trim() || 'PKR',
      website: document.getElementById('ciInputWebsite').value.trim(),
      notes: document.getElementById('ciInputNotes').value.trim()
    };

    try {
      await api.saveCompanyInfo(payload);
      showToast('Company information updated successfully');
      await loadData();
      renderCompanyInfo();
      closeEditCompanyModal();
    } catch (err) {
      console.error('Failed to save company info:', err);
      showToast('Error saving company information', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Section 2: Province Info
  // --------------------------------------------------------------------------
  function renderProvinces() {
    const tbody = document.getElementById('provinceTableBody');
    const emptyState = document.getElementById('provinceEmptyState');
    const footerCount = document.getElementById('provinceFooterCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    const q = (state.filters.provinceSearch || '').toLowerCase().trim();

    const list = state.provinces.filter(p => {
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
    });

    if (footerCount) {
      footerCount.textContent = `Total: ${list.length} province${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    list.forEach(p => {
      // Calculate linked areas
      const areaCount = state.areas.filter(a => a.provinceId === p.id).length;
      const isActive = (p.status || 'Active').toLowerCase() === 'active';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: #0f172a; text-align: left; padding-left: 24px;">${escapeHtml(p.name)}</td>
        <td style="text-align: center;"><span class="code-pill">${escapeHtml(p.code || '-')}</span></td>
        <td style="text-align: center;">
          <span class="status-badge ${isActive ? 'active' : 'inactive'}">
            <span class="status-dot"></span>
            ${escapeHtml(p.status || 'Active')}
          </span>
        </td>
        <td style="text-align: center;"><span class="badge-tag">${areaCount} Area${areaCount === 1 ? '' : 's'}</span></td>
        <td class="gi-actions-cell" style="text-align: center;">
          <div class="dots-wrapper">
            <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'provMenu_${p.id}')" title="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div id="provMenu_${p.id}" class="action-menu hidden">
              <button type="button" class="action-menu-item" onclick="window.GeneralInfoModule.openEditProvince('${p.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-menu-item text-danger" onclick="window.GeneralInfoModule.confirmDeleteProvince('${p.id}')">
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
      tbody.appendChild(tr);
    });
  }

  function openAddProvince() {
    const modal = document.getElementById('modalProvince');
    if (!modal) return;
    document.getElementById('modalProvinceTitle').textContent = 'Add Province';
    document.getElementById('provinceId').value = '';
    document.getElementById('provinceNameInput').value = '';
    document.getElementById('provinceCodeInput').value = '';
    document.getElementById('provinceStatusSelect').value = 'Active';
    modal.classList.remove('hidden');
  }

  function openEditProvince(id) {
    const prov = state.provinces.find(p => p.id === id);
    if (!prov) return;
    const modal = document.getElementById('modalProvince');
    if (!modal) return;
    document.getElementById('modalProvinceTitle').textContent = 'Edit Province';
    document.getElementById('provinceId').value = prov.id;
    document.getElementById('provinceNameInput').value = prov.name || '';
    document.getElementById('provinceCodeInput').value = prov.code || '';
    document.getElementById('provinceStatusSelect').value = prov.status || 'Active';
    modal.classList.remove('hidden');
  }

  function closeProvinceModal() {
    const modal = document.getElementById('modalProvince');
    if (modal) modal.classList.add('hidden');
  }

  async function handleProvinceFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('provinceId').value;
    const name = document.getElementById('provinceNameInput').value.trim();
    const code = document.getElementById('provinceCodeInput').value.trim().toUpperCase();
    const status = document.getElementById('provinceStatusSelect').value;

    if (!name) return;

    try {
      if (id) {
        await api.updateProvince({ id, name, code, status });
        showToast('Province updated');
      } else {
        await api.addProvince({ name, code, status });
        showToast('Province added');
      }
      closeProvinceModal();
      await loadData();
      renderProvinces();
    } catch (err) {
      console.error('Province save error:', err);
      showToast('Error saving province', 'error');
    }
  }

  async function confirmDeleteProvince(id) {
    const prov = state.provinces.find(p => p.id === id);
    const name = prov ? prov.name : 'this province';
    if (!confirm(`Are you sure you want to delete province "${name}"? Linked areas will have their province unassigned.`)) {
      return;
    }
    try {
      await api.deleteProvince(id);
      showToast('Province deleted');
      await loadData();
      renderProvinces();
      renderAreas();
    } catch (err) {
      console.error('Delete province error:', err);
      showToast('Error deleting province', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Section 3: Area Info
  // --------------------------------------------------------------------------
  function populateAreaProvinceDropdowns() {
    // Populate toolbar filter
    const filterSelect = document.getElementById('areaProvinceFilter');
    if (filterSelect) {
      const curr = state.filters.areaProvinceFilter;
      filterSelect.innerHTML = '<option value="">All Provinces</option>';
      state.provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === curr) opt.selected = true;
        filterSelect.appendChild(opt);
      });
    }

    // Populate modal province select
    const modalSelect = document.getElementById('areaProvinceSelect');
    if (modalSelect) {
      modalSelect.innerHTML = '<option value="">Select Province</option>';
      state.provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        modalSelect.appendChild(opt);
      });
    }
  }

  function renderAreas() {
    populateAreaProvinceDropdowns();

    const tbody = document.getElementById('areaTableBody');
    const emptyState = document.getElementById('areaEmptyState');
    const footerCount = document.getElementById('areaFooterCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    const q = (state.filters.areaSearch || '').toLowerCase().trim();
    const provFilter = state.filters.areaProvinceFilter;

    const list = state.areas.filter(a => {
      if (provFilter && a.provinceId !== provFilter) return false;
      if (!q) return true;
      return (a.name || '').toLowerCase().includes(q) ||
             (a.city || '').toLowerCase().includes(q) ||
             (a.code || '').toLowerCase().includes(q) ||
             (a.provinceName || '').toLowerCase().includes(q);
    });

    if (footerCount) {
      footerCount.textContent = `Total: ${list.length} area${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    list.forEach(a => {
      const isActive = (a.status || 'Active').toLowerCase() === 'active';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: #0f172a; text-align: left; padding-left: 24px;">${escapeHtml(a.name)}</td>
        <td style="text-align: center;">${escapeHtml(a.city || '-')}</td>
        <td style="text-align: center;">
          <span class="badge-tag">${escapeHtml(a.provinceName || 'Unassigned')}</span>
        </td>
        <td style="text-align: center;"><span class="code-pill">${escapeHtml(a.code || '-')}</span></td>
        <td style="text-align: center;">
          <span class="status-badge ${isActive ? 'active' : 'inactive'}">
            <span class="status-dot"></span>
            ${escapeHtml(a.status || 'Active')}
          </span>
        </td>
        <td class="gi-actions-cell" style="text-align: center;">
          <div class="dots-wrapper">
            <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'areaMenu_${a.id}')" title="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div id="areaMenu_${a.id}" class="action-menu hidden">
              <button type="button" class="action-menu-item" onclick="window.GeneralInfoModule.openEditArea('${a.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-menu-item text-danger" onclick="window.GeneralInfoModule.confirmDeleteArea('${a.id}')">
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
      tbody.appendChild(tr);
    });
  }

  function openAddArea() {
    populateAreaProvinceDropdowns();
    const modal = document.getElementById('modalArea');
    if (!modal) return;
    document.getElementById('modalAreaTitle').textContent = 'Add Area';
    document.getElementById('areaId').value = '';
    document.getElementById('areaNameInput').value = '';
    document.getElementById('areaCityInput').value = '';
    document.getElementById('areaCodeInput').value = '';
    document.getElementById('areaProvinceSelect').value = '';
    document.getElementById('areaStatusSelect').value = 'Active';
    modal.classList.remove('hidden');
  }

  function openEditArea(id) {
    populateAreaProvinceDropdowns();
    const area = state.areas.find(a => a.id === id);
    if (!area) return;
    const modal = document.getElementById('modalArea');
    if (!modal) return;
    document.getElementById('modalAreaTitle').textContent = 'Edit Area';
    document.getElementById('areaId').value = area.id;
    document.getElementById('areaNameInput').value = area.name || '';
    document.getElementById('areaCityInput').value = area.city || '';
    document.getElementById('areaCodeInput').value = area.code || '';
    document.getElementById('areaProvinceSelect').value = area.provinceId || '';
    document.getElementById('areaStatusSelect').value = area.status || 'Active';
    modal.classList.remove('hidden');
  }

  function closeAreaModal() {
    const modal = document.getElementById('modalArea');
    if (modal) modal.classList.add('hidden');
  }

  async function handleAreaFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('areaId').value;
    const name = document.getElementById('areaNameInput').value.trim();
    const city = document.getElementById('areaCityInput').value.trim();
    const code = document.getElementById('areaCodeInput').value.trim();
    const provinceId = document.getElementById('areaProvinceSelect').value;
    const matchedProv = state.provinces.find(p => p.id === provinceId);
    const provinceName = matchedProv ? matchedProv.name : '';
    const status = document.getElementById('areaStatusSelect').value;

    if (!name) return;

    try {
      if (id) {
        await api.updateArea({ id, name, city, code, provinceId, provinceName, status });
        showToast('Area updated');
      } else {
        await api.addArea({ name, city, code, provinceId, provinceName, status });
        showToast('Area added');
      }
      closeAreaModal();
      await loadData();
      renderAreas();
    } catch (err) {
      console.error('Area save error:', err);
      showToast('Error saving area', 'error');
    }
  }

  async function confirmDeleteArea(id) {
    const area = state.areas.find(a => a.id === id);
    const name = area ? area.name : 'this area';
    if (!confirm(`Are you sure you want to delete area "${name}"?`)) return;

    try {
      await api.deleteArea(id);
      showToast('Area deleted');
      await loadData();
      renderAreas();
    } catch (err) {
      console.error('Delete area error:', err);
      showToast('Error deleting area', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Section 4: Party Type
  // --------------------------------------------------------------------------
  function renderPartyTypes() {
    const tbody = document.getElementById('partyTypeTableBody');
    const emptyState = document.getElementById('partyTypeEmptyState');
    const footerCount = document.getElementById('partyTypeFooterCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    const q = (state.filters.partyTypeSearch || '').toLowerCase().trim();

    const list = state.partyTypes.filter(pt => {
      if (!q) return true;
      return (pt.name || '').toLowerCase().includes(q) ||
             (pt.code || '').toLowerCase().includes(q) ||
             (pt.description || '').toLowerCase().includes(q);
    });

    if (footerCount) {
      footerCount.textContent = `Total: ${list.length} party type${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    list.forEach(pt => {
      const isActive = (pt.status || 'Active').toLowerCase() === 'active';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: #0f172a; text-align: left; padding-left: 24px;">${escapeHtml(pt.name)}</td>
        <td style="text-align: center;"><span class="code-pill">${escapeHtml(pt.code || '-')}</span></td>
        <td style="color: #64748b; font-size: 13px; text-align: center;">${escapeHtml(pt.description || '-')}</td>
        <td style="text-align: center;">
          <span class="status-badge ${isActive ? 'active' : 'inactive'}">
            <span class="status-dot"></span>
            ${escapeHtml(pt.status || 'Active')}
          </span>
        </td>
        <td class="gi-actions-cell" style="text-align: center;">
          <div class="dots-wrapper">
            <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'ptMenu_${pt.id}')" title="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div id="ptMenu_${pt.id}" class="action-menu hidden">
              <button type="button" class="action-menu-item" onclick="window.GeneralInfoModule.openEditPartyType('${pt.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-menu-item text-danger" onclick="window.GeneralInfoModule.confirmDeletePartyType('${pt.id}')">
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
      tbody.appendChild(tr);
    });
  }

  function openAddPartyType() {
    const modal = document.getElementById('modalPartyType');
    if (!modal) return;
    document.getElementById('modalPartyTypeTitle').textContent = 'Add Party Type';
    document.getElementById('partyTypeId').value = '';
    document.getElementById('partyTypeNameInput').value = '';
    document.getElementById('partyTypeCodeInput').value = '';
    document.getElementById('partyTypeDescInput').value = '';
    document.getElementById('partyTypeStatusSelect').value = 'Active';
    modal.classList.remove('hidden');
  }

  function openEditPartyType(id) {
    const pt = state.partyTypes.find(p => p.id === id);
    if (!pt) return;
    const modal = document.getElementById('modalPartyType');
    if (!modal) return;
    document.getElementById('modalPartyTypeTitle').textContent = 'Edit Party Type';
    document.getElementById('partyTypeId').value = pt.id;
    document.getElementById('partyTypeNameInput').value = pt.name || '';
    document.getElementById('partyTypeCodeInput').value = pt.code || '';
    document.getElementById('partyTypeDescInput').value = pt.description || '';
    document.getElementById('partyTypeStatusSelect').value = pt.status || 'Active';
    modal.classList.remove('hidden');
  }

  function closePartyTypeModal() {
    const modal = document.getElementById('modalPartyType');
    if (modal) modal.classList.add('hidden');
  }

  async function handlePartyTypeFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('partyTypeId').value;
    const name = document.getElementById('partyTypeNameInput').value.trim();
    const code = document.getElementById('partyTypeCodeInput').value.trim().toUpperCase();
    const description = document.getElementById('partyTypeDescInput').value.trim();
    const status = document.getElementById('partyTypeStatusSelect').value;

    if (!name) return;

    try {
      if (id) {
        await api.updatePartyType({ id, name, code, description, status });
        showToast('Party Type updated');
      } else {
        await api.addPartyType({ name, code, description, status });
        showToast('Party Type added');
      }
      closePartyTypeModal();
      await loadData();
      renderPartyTypes();
    } catch (err) {
      console.error('Party Type save error:', err);
      showToast('Error saving party type', 'error');
    }
  }

  async function confirmDeletePartyType(id) {
    const pt = state.partyTypes.find(p => p.id === id);
    const name = pt ? pt.name : 'this party type';
    if (!confirm(`Are you sure you want to delete party type "${name}"?`)) return;

    try {
      await api.deletePartyType(id);
      showToast('Party Type deleted');
      await loadData();
      renderPartyTypes();
    } catch (err) {
      console.error('Delete party type error:', err);
      showToast('Error deleting party type', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Section 5: Party Info
  // --------------------------------------------------------------------------
  function populatePartyDropdowns() {
    // Toolbar Party Type filter
    const filterPt = document.getElementById('partyTypeFilterSelect');
    if (filterPt) {
      const curr = state.filters.partyTypeFilter;
      filterPt.innerHTML = '<option value="">All Party Types</option>';
      state.partyTypes.forEach(pt => {
        const opt = document.createElement('option');
        opt.value = pt.id;
        opt.textContent = pt.name;
        if (pt.id === curr) opt.selected = true;
        filterPt.appendChild(opt);
      });
    }

    // Toolbar Province filter
    const filterProv = document.getElementById('partyProvinceFilterSelect');
    if (filterProv) {
      const curr = state.filters.partyProvinceFilter;
      filterProv.innerHTML = '<option value="">All Provinces</option>';
      state.provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === curr) opt.selected = true;
        filterProv.appendChild(opt);
      });
    }

    // Modal Party Type select
    const modalPt = document.getElementById('partyTypeSelect');
    if (modalPt) {
      modalPt.innerHTML = '<option value="">Select Party Type</option>';
      state.partyTypes.forEach(pt => {
        const opt = document.createElement('option');
        opt.value = pt.id;
        opt.textContent = pt.name;
        modalPt.appendChild(opt);
      });
    }

    // Modal Province select
    const modalProv = document.getElementById('partyProvinceSelect');
    if (modalProv) {
      modalProv.innerHTML = '<option value="">Select Province</option>';
      state.provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        modalProv.appendChild(opt);
      });
    }
  }

  function updateModalPartyAreaDropdown(selectedAreaId = '') {
    const modalProv = document.getElementById('partyProvinceSelect');
    const modalArea = document.getElementById('partyAreaSelect');
    if (!modalArea) return;

    const provId = modalProv ? modalProv.value : '';
    modalArea.innerHTML = '<option value="">Select Area</option>';

    const relevantAreas = provId
      ? state.areas.filter(a => a.provinceId === provId)
      : state.areas;

    relevantAreas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.name}${a.city ? ' (' + a.city + ')' : ''}`;
      if (a.id === selectedAreaId) opt.selected = true;
      modalArea.appendChild(opt);
    });
  }

  function renderParties() {
    populatePartyDropdowns();

    const tbody = document.getElementById('partyTableBody');
    const emptyState = document.getElementById('partyEmptyState');
    const footerCount = document.getElementById('partyFooterCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    const q = (state.filters.partySearch || '').toLowerCase().trim();
    const ptFilter = state.filters.partyTypeFilter;
    const provFilter = state.filters.partyProvinceFilter;

    const list = state.parties.filter(p => {
      if (ptFilter && p.partyTypeId !== ptFilter) return false;
      if (provFilter && p.provinceId !== provFilter) return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q) ||
             (p.contactPerson || '').toLowerCase().includes(q) ||
             (p.phone || '').toLowerCase().includes(q) ||
             (p.email || '').toLowerCase().includes(q) ||
             (p.ntn || '').toLowerCase().includes(q) ||
             (p.city || '').toLowerCase().includes(q) ||
             (p.areaName || '').toLowerCase().includes(q) ||
             (p.address || '').toLowerCase().includes(q);
    });

    if (footerCount) {
      footerCount.textContent = `Total: ${list.length} part${list.length === 1 ? 'y' : 'ies'}`;
    }

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    list.forEach(p => {
      const tr = document.createElement('tr');
      const balance = Number(p.openingBalance) || 0;
      const formattedBalance = 'PKR ' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const locationParts = [p.areaName, p.city, p.provinceName].filter(Boolean);
      const locationStr = locationParts.join(', ') || '-';
      const isActive = (p.status || 'Active').toLowerCase() === 'active';

      tr.innerHTML = `
        <td class="font-mono" style="font-size: 12.5px; text-align: left; padding-left: 24px;">${escapeHtml(p.ntn || '-')}</td>
        <td>
          <div class="party-info-cell">
            <div class="party-name-block">
              <span class="cell-title font-bold" style="color: #0f172a;">${escapeHtml(p.name)}</span>
              ${p.address ? `<div class="cell-subtitle" style="color: #64748b; font-size: 11.5px; margin-top: 2px;" title="${escapeHtml(p.address)}">${escapeHtml(p.address)}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="badge-party-type">${escapeHtml(p.partyTypeName || 'Standard')}</span>
        </td>
        <td>
          <span class="font-medium">${escapeHtml(p.contactPerson || '-')}</span>
        </td>
        <td>
          <span class="font-mono text-xs">${escapeHtml(p.phone || '-')}</span>
        </td>
        <td>
          <span style="font-size: 12.5px; color: #475569;">${escapeHtml(p.email || '-')}</span>
        </td>
        <td>
          <span class="location-text" style="font-size: 12.5px;">${escapeHtml(locationStr)}</span>
        </td>
        <td style="text-align: right;">
          <span class="font-mono ${balance > 0 ? 'text-balance-pos' : balance < 0 ? 'text-balance-neg' : 'text-muted'}">${formattedBalance}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-badge ${isActive ? 'active' : 'inactive'}">
            <span class="status-dot"></span>
            ${escapeHtml(p.status || 'Active')}
          </span>
        </td>
        <td class="gi-actions-cell" style="text-align: center;">
          <div class="dots-wrapper">
            <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'partyMenu_${p.id}')" title="Actions">
              <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div id="partyMenu_${p.id}" class="action-menu hidden">
              <button type="button" class="action-menu-item" onclick="window.GeneralInfoModule.openEditParty('${p.id}')">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-menu-item text-danger" onclick="window.GeneralInfoModule.confirmDeleteParty('${p.id}')">
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
      tbody.appendChild(tr);
    });
  }

  function openAddParty() {
    populatePartyDropdowns();
    const modal = document.getElementById('modalParty');
    if (!modal) return;
    document.getElementById('modalPartyTitle').textContent = 'Add Party';
    document.getElementById('partyId').value = '';
    document.getElementById('partyNameInput').value = '';
    document.getElementById('partyTypeSelect').value = '';
    document.getElementById('partyStatusSelect').value = 'Active';
    document.getElementById('partyContactPersonInput').value = '';
    document.getElementById('partyPhoneInput').value = '';
    document.getElementById('partyEmailInput').value = '';
    document.getElementById('partyNtnInput').value = '';
    document.getElementById('partyProvinceSelect').value = '';
    updateModalPartyAreaDropdown('');
    document.getElementById('partyCityInput').value = '';
    document.getElementById('partyOpeningBalanceInput').value = '0';
    document.getElementById('partyAddressInput').value = '';
    modal.classList.remove('hidden');
  }

  function openEditParty(id) {
    populatePartyDropdowns();
    const p = state.parties.find(x => x.id === id);
    if (!p) return;
    const modal = document.getElementById('modalParty');
    if (!modal) return;
    document.getElementById('modalPartyTitle').textContent = 'Edit Party';
    document.getElementById('partyId').value = p.id;
    document.getElementById('partyNameInput').value = p.name || '';
    document.getElementById('partyTypeSelect').value = p.partyTypeId || '';
    document.getElementById('partyStatusSelect').value = p.status || 'Active';
    document.getElementById('partyContactPersonInput').value = p.contactPerson || '';
    document.getElementById('partyPhoneInput').value = p.phone || '';
    document.getElementById('partyEmailInput').value = p.email || '';
    document.getElementById('partyNtnInput').value = p.ntn || '';
    document.getElementById('partyProvinceSelect').value = p.provinceId || '';
    updateModalPartyAreaDropdown(p.areaId || '');
    document.getElementById('partyCityInput').value = p.city || '';
    document.getElementById('partyOpeningBalanceInput').value = p.openingBalance ?? 0;
    document.getElementById('partyAddressInput').value = p.address || '';
    modal.classList.remove('hidden');
  }

  function closePartyModal() {
    const modal = document.getElementById('modalParty');
    if (modal) modal.classList.add('hidden');
  }

  async function handlePartyFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('partyId').value;
    const name = document.getElementById('partyNameInput').value.trim();
    const partyTypeId = document.getElementById('partyTypeSelect').value;
    const status = document.getElementById('partyStatusSelect').value;
    const contactPerson = document.getElementById('partyContactPersonInput').value.trim();
    const phone = document.getElementById('partyPhoneInput').value.trim();
    const email = document.getElementById('partyEmailInput').value.trim();
    const ntn = document.getElementById('partyNtnInput').value.trim();
    const provinceId = document.getElementById('partyProvinceSelect').value;
    const areaId = document.getElementById('partyAreaSelect').value;
    const city = document.getElementById('partyCityInput').value.trim();
    const openingBalance = parseFloat(document.getElementById('partyOpeningBalanceInput').value) || 0;
    const address = document.getElementById('partyAddressInput').value.trim();

    if (!name || !phone) return;

    const ptObj = state.partyTypes.find(t => t.id === partyTypeId);
    const partyTypeName = ptObj ? ptObj.name : '';
    const provObj = state.provinces.find(pr => pr.id === provinceId);
    const provinceName = provObj ? provObj.name : '';
    const areaObj = state.areas.find(ar => ar.id === areaId);
    const areaName = areaObj ? areaObj.name : '';

    const partyData = {
      name,
      partyTypeId,
      partyTypeName,
      contactPerson,
      phone,
      email,
      provinceId,
      provinceName,
      areaId,
      areaName,
      city: city || (areaObj ? areaObj.city : ''),
      address,
      ntn,
      openingBalance,
      status
    };

    try {
      if (id) {
        partyData.id = id;
        await api.updateParty(partyData);
        showToast('Party updated');
      } else {
        await api.addParty(partyData);
        showToast('Party added');
      }
      closePartyModal();
      await loadData();
      renderParties();
    } catch (err) {
      console.error('Party save error:', err);
      showToast('Error saving party', 'error');
    }
  }

  async function confirmDeleteParty(id) {
    const p = state.parties.find(x => x.id === id);
    const name = p ? p.name : 'this party';
    if (!confirm(`Are you sure you want to delete party "${name}"?`)) return;

    try {
      await api.deleteParty(id);
      showToast('Party deleted');
      await loadData();
      renderParties();
    } catch (err) {
      console.error('Delete party error:', err);
      showToast('Error deleting party', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Sub-tab buttons
    document.querySelectorAll('.gi-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab) switchSubTab(tab);
      });
    });

    // Company Info edit button & form
    const btnEditCompany = document.getElementById('btnEditCompany');
    if (btnEditCompany) btnEditCompany.addEventListener('click', openEditCompanyModal);

    const btnCloseCompanyModal = document.getElementById('btnCloseCompanyModal');
    if (btnCloseCompanyModal) btnCloseCompanyModal.addEventListener('click', closeEditCompanyModal);

    const btnCancelCompany = document.getElementById('btnCancelCompany');
    if (btnCancelCompany) btnCancelCompany.addEventListener('click', closeEditCompanyModal);

    const formCompany = document.getElementById('companyEditForm');
    if (formCompany) formCompany.addEventListener('submit', handleCompanyFormSubmit);

    // Province actions
    const btnOpenAddProvince = document.getElementById('btnOpenAddProvince');
    if (btnOpenAddProvince) btnOpenAddProvince.addEventListener('click', openAddProvince);

    const btnCloseProvinceModal = document.getElementById('btnCloseProvinceModal');
    if (btnCloseProvinceModal) btnCloseProvinceModal.addEventListener('click', closeProvinceModal);

    const btnCancelProvince = document.getElementById('btnCancelProvince');
    if (btnCancelProvince) btnCancelProvince.addEventListener('click', closeProvinceModal);

    const formProvince = document.getElementById('provinceForm');
    if (formProvince) formProvince.addEventListener('submit', handleProvinceFormSubmit);

    const provinceSearchInput = document.getElementById('provinceSearchInput');
    if (provinceSearchInput) {
      provinceSearchInput.addEventListener('input', (e) => {
        state.filters.provinceSearch = e.target.value;
        renderProvinces();
      });
    }

    // Area actions
    const btnOpenAddArea = document.getElementById('btnOpenAddArea');
    if (btnOpenAddArea) btnOpenAddArea.addEventListener('click', openAddArea);

    const btnCloseAreaModal = document.getElementById('btnCloseAreaModal');
    if (btnCloseAreaModal) btnCloseAreaModal.addEventListener('click', closeAreaModal);

    const btnCancelArea = document.getElementById('btnCancelArea');
    if (btnCancelArea) btnCancelArea.addEventListener('click', closeAreaModal);

    const formArea = document.getElementById('areaForm');
    if (formArea) formArea.addEventListener('submit', handleAreaFormSubmit);

    const areaSearchInput = document.getElementById('areaSearchInput');
    if (areaSearchInput) {
      areaSearchInput.addEventListener('input', (e) => {
        state.filters.areaSearch = e.target.value;
        renderAreas();
      });
    }

    const areaProvinceFilter = document.getElementById('areaProvinceFilter');
    if (areaProvinceFilter) {
      areaProvinceFilter.addEventListener('change', (e) => {
        state.filters.areaProvinceFilter = e.target.value;
        renderAreas();
      });
    }

    // Party Type actions
    const btnOpenAddPartyType = document.getElementById('btnOpenAddPartyType');
    if (btnOpenAddPartyType) btnOpenAddPartyType.addEventListener('click', openAddPartyType);

    const btnClosePartyTypeModal = document.getElementById('btnClosePartyTypeModal');
    if (btnClosePartyTypeModal) btnClosePartyTypeModal.addEventListener('click', closePartyTypeModal);

    const btnCancelPartyType = document.getElementById('btnCancelPartyType');
    if (btnCancelPartyType) btnCancelPartyType.addEventListener('click', closePartyTypeModal);

    const formPartyType = document.getElementById('partyTypeForm');
    if (formPartyType) formPartyType.addEventListener('submit', handlePartyTypeFormSubmit);

    const partyTypeSearchInput = document.getElementById('partyTypeSearchInput');
    if (partyTypeSearchInput) {
      partyTypeSearchInput.addEventListener('input', (e) => {
        state.filters.partyTypeSearch = e.target.value;
        renderPartyTypes();
      });
    }

    // Party Info actions
    const btnOpenAddParty = document.getElementById('btnOpenAddParty');
    if (btnOpenAddParty) btnOpenAddParty.addEventListener('click', openAddParty);

    const btnClosePartyModal = document.getElementById('btnClosePartyModal');
    if (btnClosePartyModal) btnClosePartyModal.addEventListener('click', closePartyModal);

    const btnCancelParty = document.getElementById('btnCancelParty');
    if (btnCancelParty) btnCancelParty.addEventListener('click', closePartyModal);

    const formParty = document.getElementById('partyForm');
    if (formParty) formParty.addEventListener('submit', handlePartyFormSubmit);

    const partySearchInput = document.getElementById('partySearchInput');
    if (partySearchInput) {
      partySearchInput.addEventListener('input', (e) => {
        state.filters.partySearch = e.target.value;
        renderParties();
      });
    }

    const partyTypeFilterSelect = document.getElementById('partyTypeFilterSelect');
    if (partyTypeFilterSelect) {
      partyTypeFilterSelect.addEventListener('change', (e) => {
        state.filters.partyTypeFilter = e.target.value;
        renderParties();
      });
    }

    const partyProvinceFilterSelect = document.getElementById('partyProvinceFilterSelect');
    if (partyProvinceFilterSelect) {
      partyProvinceFilterSelect.addEventListener('change', (e) => {
        state.filters.partyProvinceFilter = e.target.value;
        renderParties();
      });
    }

    const modalPartyProv = document.getElementById('partyProvinceSelect');
    if (modalPartyProv) {
      modalPartyProv.addEventListener('change', () => {
        updateModalPartyAreaDropdown();
      });
    }

    const modalPartyArea = document.getElementById('partyAreaSelect');
    if (modalPartyArea) {
      modalPartyArea.addEventListener('change', (e) => {
        const selArea = state.areas.find(a => a.id === e.target.value);
        const cityInput = document.getElementById('partyCityInput');
        if (selArea && selArea.city && cityInput && !cityInput.value) {
          cityInput.value = selArea.city;
        }
      });
    }
  }

  // Public module API
  window.GeneralInfoModule = {
    init: async function() {
      setupEventListeners();
      await loadData();
      renderCurrentSubTab();
    },
    onActivate: async function() {
      await loadData();
      renderCurrentSubTab();
    },
    switchSubTab: switchSubTab,
    openEditCompany: openEditCompanyModal,
    openAddProvince: openAddProvince,
    openEditProvince: openEditProvince,
    confirmDeleteProvince: confirmDeleteProvince,
    openAddArea: openAddArea,
    openEditArea: openEditArea,
    confirmDeleteArea: confirmDeleteArea,
    openAddPartyType: openAddPartyType,
    openEditPartyType: openEditPartyType,
    confirmDeletePartyType: confirmDeletePartyType,
    openAddParty: openAddParty,
    openEditParty: openEditParty,
    confirmDeleteParty: confirmDeleteParty
  };

})();
