// Inventory Module Logic
let inventoryPage = 1;

const invEl = {
  inventoryTableBody: document.getElementById('inventoryTableBody'),
  inventoryEmptyState: document.getElementById('inventoryEmptyState'),
  inventorySearchBy: document.getElementById('inventorySearchBy'),
  inventorySearchInput: document.getElementById('inventorySearchInput'),
  btnClearInventorySearch: document.getElementById('btnClearInventorySearch'),
  filterStockLevelInput: document.getElementById('filterStockLevelInput'),
  btnResetInventoryFilters: document.getElementById('btnResetInventoryFilters'),
  btnOpenAddStock: document.getElementById('btnOpenAddStock'),

  // Radial Export
  radialExportWidget: document.getElementById('radialExportWidget'),
  btnExportToggle: document.getElementById('btnExportToggle'),
  radialNodesPanel: document.getElementById('radialNodesPanel'),
  radialBackdrop: document.getElementById('radialBackdrop'),
  btnExportPDF: document.getElementById('btnExportPDF'),
  btnExportExcel: document.getElementById('btnExportExcel'),
  btnExportCSV: document.getElementById('btnExportCSV'),

  // Pagination
  inventoryPaginationInfo: document.getElementById('inventoryPaginationInfo'),
  btnInvPrevPage: document.getElementById('btnInvPrevPage'),
  btnInvNextPage: document.getElementById('btnInvNextPage'),
  invPageNumbers: document.getElementById('invPageNumbers'),

  // Modal
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
  btnQuickAddVendor: document.getElementById('btnQuickAddVendor')
};

function getFilteredInventory() {
  let list = [...(window.appData && window.appData.inventory ? window.appData.inventory : [])];
  const query = (invEl.inventorySearchInput ? invEl.inventorySearchInput.value : '').trim().toLowerCase();
  const searchBy = invEl.inventorySearchBy ? invEl.inventorySearchBy.value : 'all';
  const userTargetStock = (invEl.filterStockLevelInput && invEl.filterStockLevelInput.value.trim() !== '') ? Number(invEl.filterStockLevelInput.value) : null;

  if (query) {
    list = list.filter(item => {
      if (searchBy === 'stockName') return (item.stockName || '').toLowerCase().includes(query);
      if (searchBy === 'vendorName') return (item.vendorName || '').toLowerCase().includes(query);
      return (item.stockName || '').toLowerCase().includes(query) || (item.vendorName || '').toLowerCase().includes(query);
    });
  }

  // Stock Proximity Ranking / Sorting
  if (userTargetStock !== null && !isNaN(userTargetStock)) {
    list.sort((a, b) => {
      const diffA = Math.abs(Number(a.quantity || 0) - userTargetStock);
      const diffB = Math.abs(Number(b.quantity || 0) - userTargetStock);
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      return (b.date || '').localeCompare(a.date || '');
    });
  } else {
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  return list;
}

function renderInventory() {
  if (!invEl.inventoryTableBody) return;
  const filtered = getFilteredInventory();
  const total = filtered.length;
  const pageSize = window.getAdaptivePageSize('inventory');
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (inventoryPage > totalPages) inventoryPage = totalPages;
  if (inventoryPage < 1) inventoryPage = 1;

  const start = (inventoryPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  invEl.inventoryTableBody.innerHTML = '';

  if (pageItems.length === 0) {
    if (invEl.inventoryEmptyState) invEl.inventoryEmptyState.classList.remove('hidden');
    if (invEl.inventoryPaginationInfo) invEl.inventoryPaginationInfo.textContent = 'Showing 0 of 0 items';
  } else {
    if (invEl.inventoryEmptyState) invEl.inventoryEmptyState.classList.add('hidden');
    const end = Math.min(start + pageSize, total);
    if (invEl.inventoryPaginationInfo) invEl.inventoryPaginationInfo.textContent = `Showing ${start + 1}-${end} of ${total} items`;

    pageItems.forEach((item) => {
      const menuId = `menu-inv-${item.id}`;
      const qty = Number(item.quantity) || 0;
      const sell = Number(item.totalSell) || 0;
      const wholesale = Number(item.wholesalePrice || 0).toFixed(2);
      const individual = Number(item.individualPrice || 0).toFixed(2);

      const qtyClass = qty <= 5 ? 'badge-danger' : (qty <= 15 ? 'badge-warning' : 'badge-normal');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-stock-name">
          <span class="stock-title">${window.escapeHtml(item.stockName)}</span>
        </td>
        <td class="col-vendor">
          <span class="vendor-tag">${window.escapeHtml(item.vendorName || 'Unassigned')}</span>
        </td>
        <td class="col-stock-qty">
          <span class="qty-pill ${qtyClass}">${qty}</span>
        </td>
        <td class="col-sell-qty">
          <span class="qty-sell-pill">${sell}</span>
        </td>
        <td class="col-price font-num">PKR ${wholesale}</td>
        <td class="col-price font-num">PKR ${individual}</td>
        <td class="col-date">${window.escapeHtml(item.date || '')}</td>
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
              <button onclick="openEditStock('${item.id}')" class="menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Stock</span>
              </button>
              <button onclick="confirmDeleteStock('${item.id}')" class="menu-item text-danger">
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
      invEl.inventoryTableBody.appendChild(tr);
    });
  }

  // Update Pagination Controls
  if (invEl.btnInvPrevPage) invEl.btnInvPrevPage.disabled = inventoryPage <= 1;
  if (invEl.btnInvNextPage) invEl.btnInvNextPage.disabled = inventoryPage >= totalPages;

  window.renderPaginationNumbers(invEl.invPageNumbers, inventoryPage, totalPages, (page) => {
    inventoryPage = page;
    renderInventory();
  });
}

function openAddStock() {
  invEl.modalStockTitle.textContent = 'Add Stock';
  invEl.stockId.value = '';
  invEl.stockNameInput.value = '';
  invEl.stockVendorSelect.value = '';
  invEl.stockQtyInput.value = '';
  invEl.stockSellInput.value = '0';
  invEl.stockWholesalePrice.value = '';
  invEl.stockIndividualPrice.value = '';
  invEl.stockDateInput.value = window.getTodayString();
  updateTotalPricesSummary();
  invEl.modalStock.classList.remove('hidden');
}

function openEditStock(stockId) {
  window.closeAllActionMenus();
  const item = (window.appData && window.appData.inventory ? window.appData.inventory : []).find(i => i.id === stockId);
  if (!item) return;

  invEl.modalStockTitle.textContent = 'Edit Stock';
  invEl.stockId.value = item.id;
  invEl.stockNameInput.value = item.stockName;
  invEl.stockVendorSelect.value = item.vendorId || '';
  invEl.stockQtyInput.value = item.quantity;
  invEl.stockSellInput.value = item.totalSell || 0;
  invEl.stockWholesalePrice.value = item.wholesalePrice || 0;
  invEl.stockIndividualPrice.value = item.individualPrice || 0;
  invEl.stockDateInput.value = item.date || window.getTodayString();
  updateTotalPricesSummary();
  invEl.modalStock.classList.remove('hidden');
}

function closeStockModal() {
  invEl.modalStock.classList.add('hidden');
}

function confirmDeleteStock(stockId) {
  window.closeAllActionMenus();
  const item = (window.appData && window.appData.inventory ? window.appData.inventory : []).find(i => i.id === stockId);
  const name = item ? item.stockName : 'this item';

  if (window.openConfirmModal) {
    window.openConfirmModal({
      title: 'Delete Stock',
      message: `Are you sure you want to delete "${name}"?`,
      onConfirm: async () => {
        if (window.api && window.api.deleteStock) {
          await window.api.deleteStock(stockId);
        }
        window.showToast('Stock item deleted');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
      }
    });
  }
}

function updateTotalPricesSummary() {
  const qty = Number(invEl.stockQtyInput.value) || 0;
  const wholesale = Number(invEl.stockWholesalePrice.value) || 0;
  const individual = Number(invEl.stockIndividualPrice.value) || 0;
  if (invEl.summaryTotalWholesale) invEl.summaryTotalWholesale.textContent = `PKR ${(qty * wholesale).toFixed(2)}`;
  if (invEl.summaryTotalIndividual) invEl.summaryTotalIndividual.textContent = `PKR ${(qty * individual).toFixed(2)}`;
}

// Stock Form Submit
if (invEl.stockForm) {
  invEl.stockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = invEl.stockId.value;
    const stockName = invEl.stockNameInput.value.trim();
    const vendorId = invEl.stockVendorSelect.value;
    const selectedVendor = (window.appData && window.appData.vendors ? window.appData.vendors : []).find(v => v.id === vendorId);
    const vendorName = selectedVendor ? selectedVendor.name : '';
    const quantity = Number(invEl.stockQtyInput.value);
    const totalSell = Number(invEl.stockSellInput.value) || 0;
    const wholesalePrice = Number(invEl.stockWholesalePrice.value);
    const individualPrice = Number(invEl.stockIndividualPrice.value);
    const date = invEl.stockDateInput.value;

    if (id) {
      const updated = { id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date };
      if (window.api && window.api.updateStock) await window.api.updateStock(updated);
      window.showToast('Stock item updated');
    } else {
      const newStock = { id: 'inv-' + Date.now(), stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date };
      if (window.api && window.api.addStock) await window.api.addStock(newStock);
      window.showToast('Stock item added');
    }

    if (window.reloadFromDatabase) await window.reloadFromDatabase();
    invEl.modalStock.classList.add('hidden');
    renderInventory();
  });
}

// Circular Radial Export Speed-Dial Controls
function openRadialExportMenu() {
  if (!invEl.radialNodesPanel) return;
  invEl.radialNodesPanel.classList.remove('hidden');
  invEl.btnExportToggle.classList.add('active');
  invEl.btnExportToggle.setAttribute('aria-expanded', 'true');
}

function closeRadialExportMenu() {
  if (!invEl.radialNodesPanel) return;
  invEl.radialNodesPanel.classList.add('hidden');
  invEl.btnExportToggle.classList.remove('active');
  invEl.btnExportToggle.setAttribute('aria-expanded', 'false');
}

function toggleRadialExportMenu(e) {
  if (e) e.stopPropagation();
  if (!invEl.radialNodesPanel) return;
  if (invEl.radialNodesPanel.classList.contains('hidden')) {
    openRadialExportMenu();
  } else {
    closeRadialExportMenu();
  }
}

if (invEl.btnExportToggle) invEl.btnExportToggle.addEventListener('click', toggleRadialExportMenu);
if (invEl.radialBackdrop) {
  invEl.radialBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
  });
}

document.addEventListener('click', (e) => {
  if (invEl.radialExportWidget && !invEl.radialExportWidget.contains(e.target)) {
    closeRadialExportMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeRadialExportMenu();
});

function getPreparedExportData() {
  const items = [...(window.appData && window.appData.inventory ? window.appData.inventory : [])];
  let totalQty = 0;
  let totalSell = 0;
  let totalWholesale = 0;
  let totalIndividual = 0;

  items.forEach(item => {
    const q = Number(item.quantity) || 0;
    const s = Number(item.totalSell) || 0;
    const wp = Number(item.wholesalePrice) || 0;
    const ip = Number(item.individualPrice) || 0;
    totalQty += q;
    totalSell += s;
    totalWholesale += q * wp;
    totalIndividual += q * ip;
  });

  const now = new Date();
  return {
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: totalQty,
      totalSell,
      totalWholesale,
      totalIndividual,
      dateGenerated: now.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }),
      timeGenerated: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    }
  };
}

if (invEl.btnExportPDF) {
  invEl.btnExportPDF.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
    if (!window.appData || window.appData.inventory.length === 0) {
      window.showToast('No inventory data to export');
      return;
    }
    window.showToast('Preparing PDF report...');
    try {
      const payload = getPreparedExportData();
      const res = await window.api.exportPDF(payload);
      if (res && res.success) window.showToast('PDF exported successfully');
    } catch (err) {
      console.error('PDF export failed:', err);
      window.showToast('Error exporting PDF');
    }
  });
}

if (invEl.btnExportExcel) {
  invEl.btnExportExcel.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
    if (!window.appData || window.appData.inventory.length === 0) {
      window.showToast('No inventory data to export');
      return;
    }
    window.showToast('Preparing Excel workbook...');
    try {
      const payload = getPreparedExportData();
      const res = await window.api.exportExcel(payload);
      if (res && res.success) window.showToast('Excel exported successfully');
    } catch (err) {
      console.error('Excel export failed:', err);
      window.showToast('Error exporting Excel');
    }
  });
}

if (invEl.btnExportCSV) {
  invEl.btnExportCSV.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeRadialExportMenu();
    if (!window.appData || window.appData.inventory.length === 0) {
      window.showToast('No inventory data to export');
      return;
    }
    window.showToast('Preparing CSV file...');
    try {
      const payload = getPreparedExportData();
      const res = await window.api.exportCSV(payload);
      if (res && res.success) window.showToast('CSV exported successfully');
    } catch (err) {
      console.error('CSV export failed:', err);
      window.showToast('Error exporting CSV');
    }
  });
}

// Event Listeners
if (invEl.btnOpenAddStock) invEl.btnOpenAddStock.addEventListener('click', openAddStock);
if (invEl.btnCloseStockModal) invEl.btnCloseStockModal.addEventListener('click', closeStockModal);
if (invEl.btnCancelStock) invEl.btnCancelStock.addEventListener('click', closeStockModal);
if (invEl.btnQuickAddVendor) invEl.btnQuickAddVendor.addEventListener('click', () => {
  if (window.openAddVendor) window.openAddVendor(true);
});

if (invEl.stockQtyInput) invEl.stockQtyInput.addEventListener('input', updateTotalPricesSummary);
if (invEl.stockWholesalePrice) invEl.stockWholesalePrice.addEventListener('input', updateTotalPricesSummary);
if (invEl.stockIndividualPrice) invEl.stockIndividualPrice.addEventListener('input', updateTotalPricesSummary);

if (invEl.inventorySearchInput) {
  invEl.inventorySearchInput.addEventListener('input', (e) => {
    if (invEl.btnClearInventorySearch) {
      if (e.target.value) invEl.btnClearInventorySearch.classList.remove('hidden');
      else invEl.btnClearInventorySearch.classList.add('hidden');
    }
    inventoryPage = 1;
    renderInventory();
  });
}

if (invEl.inventorySearchBy) {
  invEl.inventorySearchBy.addEventListener('change', () => {
    inventoryPage = 1;
    renderInventory();
  });
}

if (invEl.btnClearInventorySearch) {
  invEl.btnClearInventorySearch.addEventListener('click', () => {
    invEl.inventorySearchInput.value = '';
    invEl.btnClearInventorySearch.classList.add('hidden');
    inventoryPage = 1;
    renderInventory();
  });
}

if (invEl.filterStockLevelInput) {
  invEl.filterStockLevelInput.addEventListener('input', () => {
    inventoryPage = 1;
    renderInventory();
  });
}

if (invEl.btnResetInventoryFilters) {
  invEl.btnResetInventoryFilters.addEventListener('click', () => {
    if (invEl.inventorySearchInput) invEl.inventorySearchInput.value = '';
    if (invEl.btnClearInventorySearch) invEl.btnClearInventorySearch.classList.add('hidden');
    if (invEl.inventorySearchBy) invEl.inventorySearchBy.value = 'all';
    if (invEl.filterStockLevelInput) invEl.filterStockLevelInput.value = '';
    inventoryPage = 1;
    renderInventory();
  });
}

if (invEl.btnInvPrevPage) {
  invEl.btnInvPrevPage.addEventListener('click', () => {
    if (inventoryPage > 1) {
      inventoryPage--;
      renderInventory();
    }
  });
}

if (invEl.btnInvNextPage) {
  invEl.btnInvNextPage.addEventListener('click', () => {
    const pageSize = window.getAdaptivePageSize('inventory');
    const totalPages = Math.ceil(getFilteredInventory().length / pageSize) || 1;
    if (inventoryPage < totalPages) {
      inventoryPage++;
      renderInventory();
    }
  });
}

// Expose on window
window.renderInventory = renderInventory;
window.getFilteredInventory = getFilteredInventory;
window.openAddStock = openAddStock;
window.openEditStock = openEditStock;
window.closeStockModal = closeStockModal;
window.confirmDeleteStock = confirmDeleteStock;
window.updateTotalPricesSummary = updateTotalPricesSummary;
