// ========================================================
// SHAHZAIB TRADERS - INVENTORY & SUB-MODULES CONTROLLER
// ========================================================

let currentSubTab = 'unit-info';
let activeCategoryId = null;

// Navigation Indices for Record Browsing
let productNavIndex = -1;
let purchaseNavIndex = -1;

// Current Active Voucher State
let currentPurchaseItems = [];
let loadedPurchases = [];

// DOM Element Cache
const inv = {
  // Tabs
  sidebarItems: document.querySelectorAll('.flyout-sub-item[data-subtab], .nav-item[data-subtab]'),
  subtabBtns: document.querySelectorAll('.inv-tab-btn[data-subtab], .subtab-btn[data-subtab]'),
  subviews: document.querySelectorAll('.subview-section'),

  // Dropdown / Flyout
  navInventoryDropdown: document.getElementById('navInventoryDropdown'),
  navInventoryMainBtn: document.getElementById('navInventoryMainBtn'),
  inventoryFlyoutMenu: document.getElementById('inventoryFlyoutMenu'),

  // Badge Counters
  badgeProductsCount: document.getElementById('badgeProductsCount'),

  // 1. Unit Info
  unitTableBody: document.getElementById('unitTableBody'),
  unitEmptyState: document.getElementById('unitEmptyState'),
  unitSearchInput: document.getElementById('unitSearchInput'),
  btnClearUnitSearch: document.getElementById('btnClearUnitSearch'),
  btnOpenAddUnit: document.getElementById('btnOpenAddUnit'),
  modalUnit: document.getElementById('modalUnit'),
  modalUnitTitle: document.getElementById('modalUnitTitle'),
  unitForm: document.getElementById('unitForm'),
  unitId: document.getElementById('unitId'),
  unitNameInput: document.getElementById('unitNameInput'),
  unitSymbolInput: document.getElementById('unitSymbolInput'),
  btnCloseUnitModal: document.getElementById('btnCloseUnitModal'),
  btnCancelUnit: document.getElementById('btnCancelUnit'),


  // 3. Product Category
  badgeCategoryCount: document.getElementById('badgeCategoryCount'),
  categoryTableBody: document.getElementById('categoryTableBody'),
  categoryEmptyState: document.getElementById('categoryEmptyState'),
  categorySearchInput: document.getElementById('categorySearchInput'),
  btnClearCategorySearch: document.getElementById('btnClearCategorySearch'),
  btnOpenAddCategory: document.getElementById('btnOpenAddCategory'),

  modalCategory: document.getElementById('modalCategory'),
  modalCategoryTitle: document.getElementById('modalCategoryTitle'),
  categoryForm: document.getElementById('categoryForm'),
  categoryId: document.getElementById('categoryId'),
  categoryNameInput: document.getElementById('categoryNameInput'),
  categoryCodeInput: document.getElementById('categoryCodeInput'),
  btnCloseCategoryModal: document.getElementById('btnCloseCategoryModal'),
  btnCancelCategory: document.getElementById('btnCancelCategory'),

  // 5. Product Sub Category
  badgeSubCategoryCount: document.getElementById('badgeSubCategoryCount'),
  subCategoryTableBody: document.getElementById('subCategoryTableBody'),
  subCategoryEmptyState: document.getElementById('subCategoryEmptyState'),
  subCategorySearchInput: document.getElementById('subCategorySearchInput'),
  btnClearSubCategorySearch: document.getElementById('btnClearSubCategorySearch'),
  subCategoryParentFilter: document.getElementById('subCategoryParentFilter'),
  btnOpenAddSubCategory: document.getElementById('btnOpenAddSubCategory'),

  modalSubCategory: document.getElementById('modalSubCategory'),
  modalSubCategoryTitle: document.getElementById('modalSubCategoryTitle'),
  subCategoryForm: document.getElementById('subCategoryForm'),
  subCategoryId: document.getElementById('subCategoryId'),
  subCategoryParentSelect: document.getElementById('subCategoryParentSelect'),
  subCategoryNameInput: document.getElementById('subCategoryNameInput'),
  subCategoryCodeInput: document.getElementById('subCategoryCodeInput'),
  btnCloseSubCategoryModal: document.getElementById('btnCloseSubCategoryModal'),
  btnCancelSubCategory: document.getElementById('btnCancelSubCategory'),

  // 6. Purchase Voucher
  purEntryDate: document.getElementById('purEntryDate'),
  purVoucherNo: document.getElementById('purVoucherNo'),
  purManualNo: document.getElementById('purManualNo'),
  purPartySelect: document.getElementById('purPartySelect'),
  purDescription: document.getElementById('purDescription'),
  purStoreTitle: document.getElementById('purStoreTitle'),
  purReceivable: document.getElementById('purReceivable'),
  purContactPerson: document.getElementById('purContactPerson'),
  purDueDate: document.getElementById('purDueDate'),
  purPaymentStatus: document.getElementById('purPaymentStatus'),

  // Line item entry
  pieCode: document.getElementById('pieCode'),
  btnPieFind: document.getElementById('btnPieFind'),
  pieProductSelect: document.getElementById('pieProductSelect'),
  pieProductSearchInput: document.getElementById('pieProductSearchInput'),
  pieProductDropdownList: document.getElementById('pieProductDropdownList'),
  piePackQty: document.getElementById('piePackQty'),
  pieUnitQty: document.getElementById('pieUnitQty'),
  pieBonus: document.getElementById('pieBonus'),
  pieTradePrice: document.getElementById('pieTradePrice'),
  pieRetailPricePill: document.getElementById('pieRetailPricePill'),
  pieWholesalePricePill: document.getElementById('pieWholesalePricePill'),
  pieTradeOffer: document.getElementById('pieTradeOffer'),
  pieDiscPercent: document.getElementById('pieDiscPercent'),
  btnAddPurchaseItem: document.getElementById('btnAddPurchaseItem'),

  purchaseItemsTableBody: document.getElementById('purchaseItemsTableBody'),
  purchaseItemsEmptyState: document.getElementById('purchaseItemsEmptyState'),
  modalPurchaseItemsTableBody: document.getElementById('modalPurchaseItemsTableBody'),
  modalPurchaseEmptyState: document.getElementById('modalPurchaseEmptyState'),
  modalPurchaseSubtotal: document.getElementById('modalPurchaseSubtotal'),

  purDiscount: document.getElementById('purDiscount'),
  purFreightDisc: document.getElementById('purFreightDisc'),
  purFreightExpn: document.getElementById('purFreightExpn'),
  purSalesTax: document.getElementById('purSalesTax'),
  purExtraCharges: document.getElementById('purExtraCharges'),
  purGrandTotalDisplay: document.getElementById('purGrandTotalDisplay'),

  btnPurFirst: document.getElementById('btnPurFirst'),
  btnPurPrev: document.getElementById('btnPurPrev'),
  btnPurSave: document.getElementById('btnPurSave'),
  btnPurNext: document.getElementById('btnPurNext'),
  btnPurLast: document.getElementById('btnPurLast'),
  btnPurRefresh: document.getElementById('btnPurRefresh'),
  btnPurPrint: document.getElementById('btnPurPrint'),
  btnPurDelete: document.getElementById('btnPurDelete'),

  // Purchase Modal & Badges
  btnOpenAddPurchase: document.getElementById('btnOpenAddPurchase'),
  modalAddPurchase: document.getElementById('modalAddPurchase'),
  btnCloseAddPurchaseModal: document.getElementById('btnCloseAddPurchaseModal'),
  btnCancelAddPurchase: document.getElementById('btnCancelAddPurchase'),
  btnSavePurchaseModal: document.getElementById('btnSavePurchaseModal'),
  btnDonePurchaseModal: document.getElementById('btnDonePurchaseModal'),
  purVoucherNoDisplay: document.getElementById('purVoucherNoDisplay'),
  modalPurVoucherNoDisplay: document.getElementById('modalPurVoucherNoDisplay'),
  purActivePartyBadge: document.getElementById('purActivePartyBadge'),
  modalPurchaseItemCount: document.getElementById('modalPurchaseItemCount'),
  pieLineNetPreview: document.getElementById('pieLineNetPreview'),

  // Purchase Filter Toolbar & History Modal
  purFilterDate: document.getElementById('purFilterDate'),
  btnPurFilterToday: document.getElementById('btnPurFilterToday'),
  btnPurFilterAll: document.getElementById('btnPurFilterAll'),
  purVoucherQuickSelect: document.getElementById('purVoucherQuickSelect'),
  purDateCountDisplay: document.getElementById('purDateCountDisplay'),
  purDateTotalDisplay: document.getElementById('purDateTotalDisplay'),
  btnOpenPurchaseHistory: document.getElementById('btnOpenPurchaseHistory'),
  modalPurchaseHistory: document.getElementById('modalPurchaseHistory'),
  btnClosePurchaseHistory: document.getElementById('btnClosePurchaseHistory'),
  btnDonePurchaseHistory: document.getElementById('btnDonePurchaseHistory'),
  histDateBadge: document.getElementById('histDateBadge'),
  histTotalCount: document.getElementById('histTotalCount'),
  histTotalAmount: document.getElementById('histTotalAmount'),
  purchaseHistoryTableBody: document.getElementById('purchaseHistoryTableBody'),
  purchaseHistoryEmptyState: document.getElementById('purchaseHistoryEmptyState'),

  // 7. Product Info Master
  btnProductInfoList: document.getElementById('btnProductInfoList'),
  productInfoForm: document.getElementById('productInfoForm'),
  piCode: document.getElementById('piCode'),
  btnOpenAddProduct: document.getElementById('btnOpenAddProduct'),
  modalAddProduct: document.getElementById('modalAddProduct'),
  btnCloseAddProductModal: document.getElementById('btnCloseAddProductModal'),
  btnCancelProductModal: document.getElementById('btnCancelProductModal'),
  productModalTitle: document.getElementById('productModalTitle'),
  piSearchInput: document.getElementById('piSearchInput'),
  piCategoryFilter: document.getElementById('piCategoryFilter'),
  piSubCategoryFilter: document.getElementById('piSubCategoryFilter'),
  piStockFilter: document.getElementById('piStockFilter'),
  piSortFilter: document.getElementById('piSortFilter'),
  btnPiResetFilters: document.getElementById('btnPiResetFilters'),
  piResultsCounter: document.getElementById('piResultsCounter'),
  productsTableBody: document.getElementById('productsTableBody'),
  productsEmptyState: document.getElementById('productsEmptyState'),
  btnPiTemplate: document.getElementById('btnPiTemplate'),
  btnPiFind: document.getElementById('btnPiFind'),
  piBarcode: document.getElementById('piBarcode'),
  btnPiGenBarcode: document.getElementById('btnPiGenBarcode'),
  piAdditionalCode: document.getElementById('piAdditionalCode'),
  piPrintBarcode: document.getElementById('piPrintBarcode'),
  piGroupSelect: document.getElementById('piGroupSelect'),
  piCategorySelect: document.getElementById('piCategorySelect'),
  piSubCategorySelect: document.getElementById('piSubCategorySelect'),
  piTitleEng: document.getElementById('piTitleEng'),
  piTitleUrdu: document.getElementById('piTitleUrdu'),
  piPackingType: document.getElementById('piPackingType'),
  piUnitSelect: document.getElementById('piUnitSelect'),
  piPackSize: document.getElementById('piPackSize'),
  piTaxPercent: document.getElementById('piTaxPercent'),
  piPurchasePrice: document.getElementById('piPurchasePrice'),
  piProfitMargin: document.getElementById('piProfitMargin'),
  piRetailPrice: document.getElementById('piRetailPrice'),
  piWholesalePrice: document.getElementById('piWholesalePrice'),
  piMinStock: document.getElementById('piMinStock'),
  piReorderLevel: document.getElementById('piReorderLevel'),
  piGroupType: document.getElementById('piGroupType'),
  piTypeSelect: document.getElementById('piTypeSelect'),
  piAverageCost: document.getElementById('piAverageCost'),
  piLocation: document.getElementById('piLocation'),
  piShortCode: document.getElementById('piShortCode'),
  piStockQty: document.getElementById('piStockQty'),
  piShortLabel: document.getElementById('piShortLabel'),
  piDescription: document.getElementById('piDescription'),
  piBatchExpiry: document.getElementById('piBatchExpiry'),
  piLoosePackSize: document.getElementById('piLoosePackSize'),
  piInActive: document.getElementById('piInActive'),

  btnPiFirst: document.getElementById('btnPiFirst'),
  btnPiPrev: document.getElementById('btnPiPrev'),
  btnPiNext: document.getElementById('btnPiNext'),
  btnPiLast: document.getElementById('btnPiLast'),
  btnPiNew: document.getElementById('btnPiNew'),
  btnPiSave: document.getElementById('btnPiSave'),
  btnPiSaveText: document.getElementById('btnPiSaveText'),
  piFormModeBadge: document.getElementById('piFormModeBadge'),
  btnPiRefresh: document.getElementById('btnPiRefresh'),
  btnPiDelete: document.getElementById('btnPiDelete'),
  btnPiClose: document.getElementById('btnPiClose'),

  // F1 Search Modal
  modalProductSearch: document.getElementById('modalProductSearch'),
  btnCloseProductSearch: document.getElementById('btnCloseProductSearch'),
  f1SearchInput: document.getElementById('f1SearchInput'),
  f1ProductTableBody: document.getElementById('f1ProductTableBody'),

  // Alert Modal
  modalAlert: document.getElementById('modalAlert'),
  alertTitle: document.getElementById('alertTitle'),
  alertMessage: document.getElementById('alertMessage'),
  btnCloseAlertModal: document.getElementById('btnCloseAlertModal'),
  btnOkAlert: document.getElementById('btnOkAlert')
};

// ========================================================
// DESKTOP ALERT HELPER (FOR MANDATORY VALIDATION)
// ========================================================
function showAlert(message, title = 'Notice') {
  if (!inv.modalAlert) {
    alert(message);
    return;
  }
  if (inv.alertTitle) inv.alertTitle.textContent = title;
  if (inv.alertMessage) inv.alertMessage.textContent = message;
  inv.modalAlert.classList.remove('hidden');
}

function closeAlert() {
  if (inv.modalAlert) inv.modalAlert.classList.add('hidden');
}

if (inv.btnCloseAlertModal) inv.btnCloseAlertModal.addEventListener('click', closeAlert);
if (inv.btnOkAlert) inv.btnOkAlert.addEventListener('click', closeAlert);

// ========================================================
// SUB-TAB NAVIGATION ROUTING (7 EXACT TABS)
// ========================================================
function switchSubTab(subtab) {
  currentSubTab = subtab;
  window.currentSubTab = subtab;

  // Ensure Inventory view is active and General Info is inactive
  const invView = document.getElementById('inventoryView');
  const giView = document.getElementById('generalInfoView');
  const giBtn = document.getElementById('navGeneralInfoBtn');
  const invBtn = document.getElementById('navInventoryMainBtn');
  if (invView) invView.classList.add('active');
  if (giView) giView.classList.remove('active');
  if (giBtn) giBtn.classList.remove('active');
  if (invBtn) invBtn.classList.add('active');

  // Sync horizontal tabs active state
  document.querySelectorAll('.inv-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === subtab);
  });

  // View sections toggle
  const viewMap = {
    'unit-info': 'viewUnitInfo',
    'product-category': 'viewProductCategory',
    'product-categories': 'viewProductCategory',
    'product-sub-category': 'viewProductSubCategory',
    'purchase': 'viewPurchase',
    'product-info': 'viewProductInfo'
  };

  const targetId = viewMap[subtab] || 'viewUnitInfo';
  const allSubviews = document.querySelectorAll('.subview-section');
  allSubviews.forEach(section => {
    section.classList.toggle('active', section.id === targetId);
  });

  // Lifecycle updates for active view
  if (subtab === 'unit-info') renderUnits();
  if (subtab === 'product-category' || subtab === 'product-categories') renderProductCategories();
  if (subtab === 'product-sub-category') renderProductSubCategories();
  if (subtab === 'purchase') initPurchaseView();
  if (subtab === 'product-info') initProductInfoView();
}

window.switchSubTab = switchSubTab;

// Bind Tab Clicks
document.querySelectorAll('.inv-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab));
});

// Click on Inventory button activates inventory and active subtab
if (inv.navInventoryMainBtn) {
  inv.navInventoryMainBtn.addEventListener('click', () => {
    if (window.switchTab) {
      window.switchTab('inventory');
    } else {
      switchSubTab(currentSubTab || 'unit-info');
    }
  });
}

// ========================================================
// 1. UNIT INFO MODULE
// ========================================================
let unitPagination = null;
function renderUnits() {
  const units = window.appData?.units || [];
  const q = (inv.unitSearchInput?.value || '').trim().toLowerCase();
  const filtered = units.filter(u => !q || u.name.toLowerCase().includes(q) || (u.symbol || '').toLowerCase().includes(q));

  if (!inv.unitTableBody) return;

  if (!unitPagination && window.createTablePagination) {
    unitPagination = window.createTablePagination({
      container: '#viewUnitInfo .table-container',
      tbody: inv.unitTableBody,
      emptyStateEl: inv.unitEmptyState,
      onRenderPage: (slice, startIdx) => {
        inv.unitTableBody.innerHTML = '';
        slice.forEach((unit, idx) => {
          const globalSr = startIdx + idx + 1;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-unit-sr font-num" style="text-align: center;">${globalSr}</td>
            <td class="col-unit-name font-bold" style="text-align: center;">
              <span style="cursor: default;" data-full-name="${window.escapeHtml(unit.name)}">${window.escapeHtml(unit.name)}</span>
            </td>
            <td class="col-unit-symbol" style="text-align: center;">
              <span class="code-pill" style="cursor: default;" data-full-name="${window.escapeHtml(unit.symbol || '-')}">${window.escapeHtml(unit.symbol || '-')}</span>
            </td>
            <td class="col-unit-actions col-dots-actions" style="text-align: center;">
              <div class="dots-wrapper">
                <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'unitMenu_${unit.id}')" title="Actions">
                  <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                </button>
                <div id="unitMenu_${unit.id}" class="action-menu hidden">
                  <button type="button" class="action-menu-item" onclick="window.openEditUnit('${unit.id}')">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="action-menu-item text-danger" onclick="window.confirmDeleteUnit('${unit.id}')">
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
          inv.unitTableBody.appendChild(tr);
        });
      }
    });
  }

  if (unitPagination) {
    unitPagination.setItems(filtered, !!q);
  }
}

function openAddUnit() {
  if (inv.modalUnitTitle) inv.modalUnitTitle.textContent = 'Add Unit';
  if (inv.unitId) inv.unitId.value = '';
  if (inv.unitNameInput) inv.unitNameInput.value = '';
  if (inv.unitSymbolInput) inv.unitSymbolInput.value = '';
  if (inv.modalUnit) inv.modalUnit.classList.remove('hidden');
}

function openEditUnit(id) {
  const unit = (window.appData?.units || []).find(u => u.id === id);
  if (!unit) return;
  if (inv.modalUnitTitle) inv.modalUnitTitle.textContent = 'Edit Unit';
  if (inv.unitId) inv.unitId.value = unit.id;
  if (inv.unitNameInput) inv.unitNameInput.value = unit.name;
  if (inv.unitSymbolInput) inv.unitSymbolInput.value = unit.symbol || '';
  if (inv.modalUnit) inv.modalUnit.classList.remove('hidden');
}

function closeUnitModal() {
  if (inv.modalUnit) inv.modalUnit.classList.add('hidden');
}

async function handleSaveUnit(e) {
  if (e) e.preventDefault();
  const name = inv.unitNameInput?.value.trim();
  if (!name) return;
  const unit = {
    id: inv.unitId?.value || undefined,
    name,
    symbol: inv.unitSymbolInput?.value.trim() || ''
  };

  try {
    if (window.api?.saveUnit) {
      await window.api.saveUnit(unit);
    }
    await window.reloadFromDatabase();
    closeUnitModal();
    renderUnits();
  } catch (err) {
    console.error('Save unit failed:', err);
  }
}

function confirmDeleteUnit(id) {
  window.openConfirmModal({
    title: 'Delete Unit',
    message: 'Are you sure you want to delete this measuring unit?',
    onConfirm: async () => {
      try {
        if (window.api?.deleteUnit) await window.api.deleteUnit(id);
        await window.reloadFromDatabase();
        renderUnits();
      } catch (err) {
        console.error('Delete unit error:', err);
      }
    }
  });
}

if (inv.btnOpenAddUnit) inv.btnOpenAddUnit.addEventListener('click', openAddUnit);
if (inv.btnCloseUnitModal) inv.btnCloseUnitModal.addEventListener('click', closeUnitModal);
if (inv.btnCancelUnit) inv.btnCancelUnit.addEventListener('click', closeUnitModal);
if (inv.unitForm) inv.unitForm.addEventListener('submit', handleSaveUnit);
if (inv.unitSearchInput) inv.unitSearchInput.addEventListener('input', renderUnits);


// 3. PRODUCT CATEGORY MODULE
// ========================================================
let catPagination = null;
function renderProductCategories() {
  const categories = window.appData?.product_categories || [];
  const allSubs = window.appData?.product_sub_categories || [];
  const q = (inv.categorySearchInput?.value || '').trim().toLowerCase();
  const filtered = categories.filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q));

  if (inv.badgeCategoryCount) inv.badgeCategoryCount.textContent = categories.length;
  if (!inv.categoryTableBody) return;

  if (!catPagination && window.createTablePagination) {
    catPagination = window.createTablePagination({
      container: '#viewProductCategory .table-container',
      tbody: inv.categoryTableBody,
      emptyStateEl: inv.categoryEmptyState,
      onRenderPage: (slice, startIdx) => {
        inv.categoryTableBody.innerHTML = '';
        slice.forEach((cat, idx) => {
          const globalSr = startIdx + idx + 1;
          const subCount = allSubs.filter(s => s.categoryId === cat.id).length;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-cat-sr font-num" style="text-align: center;">${globalSr}</td>
            <td class="col-cat-name font-bold" style="text-align: center;">
              <span style="cursor: default;" data-full-name="${window.escapeHtml(cat.name)}">${window.escapeHtml(cat.name)}</span>
            </td>
            <td class="col-cat-code" style="text-align: center;">
              <span class="code-pill" style="cursor: default;" data-full-name="${window.escapeHtml(cat.code || '-')}">${window.escapeHtml(cat.code || '-')}</span>
            </td>
            <td class="col-cat-subs" style="text-align: center;">
              <span class="badge-tag" style="cursor: default;">${subCount} Sub Categor${subCount === 1 ? 'y' : 'ies'}</span>
            </td>
            <td class="col-cat-actions col-dots-actions" style="text-align: center;">
              <div class="dots-wrapper">
                <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'catMenu_${cat.id}')" title="Actions">
                  <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                </button>
                <div id="catMenu_${cat.id}" class="action-menu hidden">
                  <button type="button" class="action-menu-item" onclick="window.openEditCategory('${cat.id}')">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="action-menu-item text-danger" onclick="window.confirmDeleteCategory('${cat.id}')">
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
          inv.categoryTableBody.appendChild(tr);
        });
      }
    });
  }

  if (catPagination) {
    catPagination.setItems(filtered, !!q);
  }
}

function openAddCategory() {
  if (inv.modalCategoryTitle) inv.modalCategoryTitle.textContent = 'Add Category';
  if (inv.categoryId) inv.categoryId.value = '';
  if (inv.categoryNameInput) inv.categoryNameInput.value = '';
  if (inv.categoryCodeInput) inv.categoryCodeInput.value = '';
  if (inv.modalCategory) inv.modalCategory.classList.remove('hidden');
}

function openEditCategory(id) {
  const cat = (window.appData?.product_categories || []).find(c => c.id === id);
  if (!cat) return;
  if (inv.modalCategoryTitle) inv.modalCategoryTitle.textContent = 'Edit Category';
  if (inv.categoryId) inv.categoryId.value = cat.id;
  if (inv.categoryNameInput) inv.categoryNameInput.value = cat.name;
  if (inv.categoryCodeInput) inv.categoryCodeInput.value = cat.code || '';
  if (inv.modalCategory) inv.modalCategory.classList.remove('hidden');
}

function closeCategoryModal() {
  if (inv.modalCategory) inv.modalCategory.classList.add('hidden');
}

async function handleSaveCategory(e) {
  if (e) e.preventDefault();
  const name = inv.categoryNameInput?.value.trim();
  if (!name) return;
  const item = {
    id: inv.categoryId?.value || undefined,
    name,
    code: inv.categoryCodeInput?.value.trim() || ''
  };

  try {
    if (window.api?.saveProductCategory) await window.api.saveProductCategory(item);
    await window.reloadFromDatabase();
    closeCategoryModal();
    renderProductCategories();
    renderProductSubCategories();
  } catch (err) {
    console.error('Save category failed:', err);
  }
}

function confirmDeleteCategory(id) {
  window.openConfirmModal({
    title: 'Delete Category',
    message: 'Deleting this category will also remove all its sub-categories. Continue?',
    onConfirm: async () => {
      try {
        if (window.api?.deleteProductCategory) await window.api.deleteProductCategory(id);
        await window.reloadFromDatabase();
        renderProductCategories();
        renderProductSubCategories();
      } catch (err) {
        console.error('Delete category failed:', err);
      }
    }
  });
}

// ========================================================
// 5. PRODUCT SUB CATEGORY MODULE
// ========================================================
function renderProductSubCategories() {
  const allSubs = window.appData?.product_sub_categories || [];
  const categories = window.appData?.product_categories || [];

  if (inv.subCategoryParentFilter) {
    const currentVal = inv.subCategoryParentFilter.value;
    const catOptions = ['<option value="">All Categories</option>'];
    categories.forEach(c => {
      catOptions.push(`<option value="${c.id}">${window.escapeHtml(c.name)}</option>`);
    });
    inv.subCategoryParentFilter.innerHTML = catOptions.join('');
    if (currentVal && categories.some(c => c.id === currentVal)) {
      inv.subCategoryParentFilter.value = currentVal;
    }
  }

  const selectedCatId = inv.subCategoryParentFilter ? inv.subCategoryParentFilter.value : '';
  const q = (inv.subCategorySearchInput?.value || '').trim().toLowerCase();

  const filtered = allSubs.filter(s => {
    const matchesCat = selectedCatId ? s.categoryId === selectedCatId : true;
    const matchesQuery = !q || (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  if (inv.badgeSubCategoryCount) inv.badgeSubCategoryCount.textContent = allSubs.length;
  if (!inv.subCategoryTableBody) return;

  if (!window.subCatPagination && window.createTablePagination) {
    window.subCatPagination = window.createTablePagination({
      container: '#viewProductSubCategory .table-container',
      tbody: inv.subCategoryTableBody,
      emptyStateEl: inv.subCategoryEmptyState,
      onRenderPage: (slice, startIdx) => {
        inv.subCategoryTableBody.innerHTML = '';
        slice.forEach((sub, idx) => {
          const globalSr = startIdx + idx + 1;
          const parentCat = categories.find(c => c.id === sub.categoryId);
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-sub-sr font-num" style="text-align: center;">${globalSr}</td>
            <td class="col-sub-name font-bold" style="text-align: center;">
              <span style="cursor: default;" data-full-name="${window.escapeHtml(sub.name)}">${window.escapeHtml(sub.name)}</span>
            </td>
            <td class="col-sub-code" style="text-align: center;">
              <span class="code-pill" style="cursor: default;" data-full-name="${window.escapeHtml(sub.code || '-')}">${window.escapeHtml(sub.code || '-')}</span>
            </td>
            <td class="col-sub-parent" style="text-align: center;">
              <span class="badge-tag" style="cursor: default;" data-full-name="${window.escapeHtml(parentCat?.name || '-')}">${window.escapeHtml(parentCat?.name || '-')}</span>
            </td>
            <td class="col-sub-actions col-dots-actions" style="text-align: center;">
              <div class="dots-wrapper">
                <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'subCatMenu_${sub.id}')" title="Actions">
                  <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                </button>
                <div id="subCatMenu_${sub.id}" class="action-menu hidden">
                  <button type="button" class="action-menu-item" onclick="window.openEditSubCategory('${sub.id}')">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="action-menu-item text-danger" onclick="window.confirmDeleteSubCategory('${sub.id}')">
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
          inv.subCategoryTableBody.appendChild(tr);
        });
      }
    });
  }

  if (window.subCatPagination) {
    window.subCatPagination.setItems(filtered, !!q || !!selectedCatId);
  }
}

function openAddSubCategory() {
  const cats = window.appData?.product_categories || [];
  if (cats.length === 0) {
    showAlert('Please add at least one Product Category first.');
    return;
  }

  const selectedFilterCat = inv.subCategoryParentFilter ? inv.subCategoryParentFilter.value : '';

  if (inv.subCategoryParentSelect) {
    inv.subCategoryParentSelect.innerHTML = cats.map(c =>
      `<option value="${c.id}" ${c.id === selectedFilterCat ? 'selected' : ''}>${window.escapeHtml(c.name)}</option>`
    ).join('');
  }

  if (inv.modalSubCategoryTitle) inv.modalSubCategoryTitle.textContent = 'Add Sub Category';
  if (inv.subCategoryId) inv.subCategoryId.value = '';
  if (inv.subCategoryNameInput) inv.subCategoryNameInput.value = '';
  if (inv.subCategoryCodeInput) inv.subCategoryCodeInput.value = '';
  if (inv.modalSubCategory) inv.modalSubCategory.classList.remove('hidden');
}

function openEditSubCategory(id) {
  const sub = (window.appData?.product_sub_categories || []).find(s => s.id === id);
  if (!sub) return;
  const cats = window.appData?.product_categories || [];

  if (inv.subCategoryParentSelect) {
    inv.subCategoryParentSelect.innerHTML = cats.map(c =>
      `<option value="${c.id}" ${c.id === sub.categoryId ? 'selected' : ''}>${window.escapeHtml(c.name)}</option>`
    ).join('');
  }

  if (inv.modalSubCategoryTitle) inv.modalSubCategoryTitle.textContent = 'Edit Sub Category';
  if (inv.subCategoryId) inv.subCategoryId.value = sub.id;
  if (inv.subCategoryNameInput) inv.subCategoryNameInput.value = sub.name;
  if (inv.subCategoryCodeInput) inv.subCategoryCodeInput.value = sub.code || '';
  if (inv.modalSubCategory) inv.modalSubCategory.classList.remove('hidden');
}

function closeSubCategoryModal() {
  if (inv.modalSubCategory) inv.modalSubCategory.classList.add('hidden');
}

async function handleSaveSubCategory(e) {
  if (e) e.preventDefault();
  const name = inv.subCategoryNameInput?.value.trim();
  const categoryId = inv.subCategoryParentSelect?.value;
  if (!name || !categoryId) return;

  const item = {
    id: inv.subCategoryId?.value || undefined,
    categoryId,
    name,
    code: inv.subCategoryCodeInput?.value.trim() || ''
  };

  try {
    if (window.api?.saveProductSubCategory) await window.api.saveProductSubCategory(item);
    await window.reloadFromDatabase();
    closeSubCategoryModal();
    renderProductCategories();
    renderProductSubCategories();
  } catch (err) {
    console.error('Save sub category failed:', err);
  }
}

function confirmDeleteSubCategory(id) {
  window.openConfirmModal({
    title: 'Delete Sub Category',
    message: 'Are you sure you want to delete this sub-category?',
    onConfirm: async () => {
      try {
        if (window.api?.deleteProductSubCategory) await window.api.deleteProductSubCategory(id);
        await window.reloadFromDatabase();
        renderProductCategories();
        renderProductSubCategories();
      } catch (err) {
        console.error('Delete sub category failed:', err);
      }
    }
  });
}

// Category & Sub Category Bindings
if (inv.btnOpenAddCategory) inv.btnOpenAddCategory.addEventListener('click', openAddCategory);
if (inv.btnCloseCategoryModal) inv.btnCloseCategoryModal.addEventListener('click', closeCategoryModal);
if (inv.btnCancelCategory) inv.btnCancelCategory.addEventListener('click', closeCategoryModal);
if (inv.categoryForm) inv.categoryForm.addEventListener('submit', handleSaveCategory);
if (inv.categorySearchInput) {
  inv.categorySearchInput.addEventListener('input', () => {
    if (inv.btnClearCategorySearch) {
      inv.btnClearCategorySearch.classList.toggle('hidden', !inv.categorySearchInput.value);
    }
    renderProductCategories();
  });
}
if (inv.btnClearCategorySearch && inv.categorySearchInput) {
  inv.btnClearCategorySearch.addEventListener('click', () => {
    inv.categorySearchInput.value = '';
    inv.btnClearCategorySearch.classList.add('hidden');
    renderProductCategories();
  });
}

if (inv.btnOpenAddSubCategory) inv.btnOpenAddSubCategory.addEventListener('click', openAddSubCategory);
if (inv.btnCloseSubCategoryModal) inv.btnCloseSubCategoryModal.addEventListener('click', closeSubCategoryModal);
if (inv.btnCancelSubCategory) inv.btnCancelSubCategory.addEventListener('click', closeSubCategoryModal);
if (inv.subCategoryForm) inv.subCategoryForm.addEventListener('submit', handleSaveSubCategory);
if (inv.subCategorySearchInput) {
  inv.subCategorySearchInput.addEventListener('input', () => {
    if (inv.btnClearSubCategorySearch) {
      inv.btnClearSubCategorySearch.classList.toggle('hidden', !inv.subCategorySearchInput.value);
    }
    renderProductSubCategories();
  });
}
if (inv.btnClearSubCategorySearch && inv.subCategorySearchInput) {
  inv.btnClearSubCategorySearch.addEventListener('click', () => {
    inv.subCategorySearchInput.value = '';
    inv.btnClearSubCategorySearch.classList.add('hidden');
    renderProductSubCategories();
  });
}
if (inv.subCategoryParentFilter) {
  inv.subCategoryParentFilter.addEventListener('change', renderProductSubCategories);
}

// Unit, Product Type & Product Group Clear Search Buttons
if (inv.btnClearUnitSearch && inv.unitSearchInput) {
  inv.unitSearchInput.addEventListener('input', () => {
    inv.btnClearUnitSearch.classList.toggle('hidden', !inv.unitSearchInput.value);
  });
  inv.btnClearUnitSearch.addEventListener('click', () => {
    inv.unitSearchInput.value = '';
    inv.btnClearUnitSearch.classList.add('hidden');
    renderUnits();
  });
}
// ========================================================
// 5. PURCHASE VOUCHER MODULE (ENTERPRISE - MODAL WORKFLOW)
// ========================================================
let pieSearchTypeahead = null;
function initPieProductSearch() {
  if (pieSearchTypeahead) return;
  if (window.setupSearchableProductDropdown && inv.pieProductSearchInput && inv.pieProductDropdownList) {
    pieSearchTypeahead = window.setupSearchableProductDropdown({
      inputEl: inv.pieProductSearchInput,
      dropdownEl: inv.pieProductDropdownList,
      codeEl: inv.pieCode,
      selectEl: inv.pieProductSelect,
      compactRateOnly: true,
      onSelect: (prod) => {
        selectProductForPurchase(prod);
      },
      nextFocusEl: () => inv.piePackQty
    });
  }
}

function openAddPurchaseModal() {
  if (inv.modalAddPurchase) inv.modalAddPurchase.classList.remove('hidden');
  initPieProductSearch();
  updatePurchaseHeaderBadges();
  updateModalPurchaseCount();
  renderModalPurchaseItems();
  updateLineNetPreview();
  if (inv.purPartySelect && !inv.purPartySelect.value) {
    setTimeout(() => { if (inv.purPartySelect) inv.purPartySelect.focus(); }, 100);
  } else {
    setTimeout(() => {
      const pieSr = document.getElementById('pieSrNo');
      if (pieSr) pieSr.value = currentPurchaseItems.length + 1;
      if (inv.pieProductSearchInput) inv.pieProductSearchInput.focus();
    }, 100);
  }
}

function closeAddPurchaseModal() {
  if (inv.modalAddPurchase) inv.modalAddPurchase.classList.add('hidden');
  updatePurchaseHeaderBadges();
}

function updatePurchaseHeaderBadges() {
  const vNo = inv.purVoucherNo?.value || (window.appData?.purchases?.length ? String(window.appData.purchases.length + 100) : "101");
  if (inv.purVoucherNoDisplay) inv.purVoucherNoDisplay.textContent = vNo;
  if (inv.modalPurVoucherNoDisplay) inv.modalPurVoucherNoDisplay.textContent = vNo;

  const partySelect = inv.purPartySelect;
  const selectedParty = partySelect && partySelect.selectedIndex > 0 && partySelect.value
    ? partySelect.options[partySelect.selectedIndex].text
    : '';

  if (inv.purActivePartyBadge) {
    if (selectedParty) {
      inv.purActivePartyBadge.textContent = selectedParty.split('[')[0].trim();
      inv.purActivePartyBadge.classList.remove('hidden');
    } else {
      inv.purActivePartyBadge.classList.add('hidden');
    }
  }
}

function updateModalPurchaseCount() {
  if (inv.modalPurchaseItemCount) {
    inv.modalPurchaseItemCount.textContent = currentPurchaseItems.length;
  }
  if (inv.modalPurchaseSubtotal) {
    const subtotal = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);
    inv.modalPurchaseSubtotal.textContent = 'Rs. ' + subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function renderModalPurchaseItems() {
  if (!inv.modalPurchaseItemsTableBody) return;
  inv.modalPurchaseItemsTableBody.innerHTML = '';

  if (currentPurchaseItems.length === 0) {
    if (inv.modalPurchaseEmptyState) inv.modalPurchaseEmptyState.classList.remove('hidden');
    return;
  }
  if (inv.modalPurchaseEmptyState) inv.modalPurchaseEmptyState.classList.add('hidden');

  currentPurchaseItems.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;" class="font-num">${item.srNo}</td>
      <td style="text-align: center;" class="font-num font-bold">${window.escapeHtml(item.productCode)}</td>
      <td class="font-bold">${window.escapeHtml(item.productTitle)}</td>
      <td style="text-align: center;" class="font-num">${item.packQty}</td>
      <td style="text-align: center;" class="font-num">${item.unitQty}</td>
      <td style="text-align: center;" class="font-num">${item.bonus}</td>
      <td style="text-align: right;" class="font-num">${Number(item.tradePrice).toFixed(2)}</td>
      <td style="text-align: right;" class="font-num">${Number(item.tradeOffer).toFixed(2)}</td>
      <td style="text-align: right;" class="font-num">${item.discountPercent}%</td>
      <td style="text-align: right;" class="font-num font-bold text-accent">${Number(item.netAmount).toFixed(2)}</td>
      <td style="text-align: center;">
        <button type="button" class="btn-icon-xs text-danger" onclick="removePurchaseLineItem(${idx})" title="Remove Line">✕</button>
      </td>
    `;
    inv.modalPurchaseItemsTableBody.appendChild(tr);
  });
}

function updateLineNetPreview() {
  const code = inv.pieCode?.value.trim();
  const searchTitle = (inv.pieProductSearchInput?.value || '').trim().toLowerCase();
  let prod = (window.appData?.products || []).find(p => String(p.code).trim() === code);
  if (!prod && searchTitle) {
    prod = (window.appData?.products || []).find(p => (p.titleEng || '').toLowerCase() === searchTitle);
  }

  const packSize = Number(prod?.packSize) || 1;
  const pQty = Number(inv.piePackQty?.value) || 0;
  const uQty = Number(inv.pieUnitQty?.value) || 0;
  const tp = Number(inv.pieTradePrice?.value) || 0;
  const tradeOffer = Number(inv.pieTradeOffer?.value) || 0;
  const discPercent = Number(inv.pieDiscPercent?.value) || 0;

  const totalUnits = (pQty * packSize) + uQty;
  let rawAmount = totalUnits * tp;
  if (tradeOffer > 0) rawAmount -= tradeOffer;
  if (discPercent > 0) rawAmount -= (rawAmount * (discPercent / 100));
  const net = Math.max(0, rawAmount);
  if (inv.pieLineNetPreview) {
    const formatted = 'Rs. ' + net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if ('value' in inv.pieLineNetPreview) inv.pieLineNetPreview.value = formatted;
    inv.pieLineNetPreview.textContent = formatted;
  }
}

let filteredPurchases = [];

function applyPurchaseDateFilter() {
  const allPurchases = window.appData?.purchases || [];
  const selectedDate = inv.purFilterDate?.value || '';

  const btnClear = document.getElementById('btnPurClearDate');
  if (btnClear) {
    btnClear.style.display = selectedDate ? 'inline-flex' : 'none';
  }

  if (selectedDate) {
    filteredPurchases = allPurchases.filter(p => (p.entryDate || '').startsWith(selectedDate));
    if (inv.histDateBadge) inv.histDateBadge.textContent = selectedDate;
  } else {
    filteredPurchases = [...allPurchases];
    if (inv.histDateBadge) inv.histDateBadge.textContent = 'All Dates';
  }

  // Populate quick voucher selector & custom dropdown (showing ONLY name, NO #pv)
  renderVoucherDropdown();

  // Update nav index for filtered list
  if (filteredPurchases.length > 0) {
    const curVNo = inv.purVoucherNo?.value;
    const matchIdx = filteredPurchases.findIndex(p => p.voucherNo === curVNo);
    purchaseNavIndex = matchIdx !== -1 ? matchIdx : 0;
  } else {
    purchaseNavIndex = -1;
  }
}

function renderVoucherDropdown(filterQuery = '') {
  const list = filteredPurchases.length > 0 ? filteredPurchases : (inv.purFilterDate?.value ? [] : (window.appData?.purchases || []));
  const activeVNo = inv.purVoucherNo?.value;
  const menu = document.getElementById('purVoucherDropdownList');
  const searchInput = document.getElementById('purVoucherSearchInput');
  const quickSelect = inv.purVoucherQuickSelect || document.getElementById('purVoucherQuickSelect');

  // Sync quick select (showing ONLY partyTitle / name, NO #pv)
  if (quickSelect) {
    if (list.length === 0) {
      quickSelect.innerHTML = '<option value="">No Vouchers Found</option>';
    } else {
      quickSelect.innerHTML = '<option value="">Select Voucher</option>' +
        list.map(p => {
          const isSel = p.voucherNo === activeVNo ? ' selected' : '';
          const name = window.escapeHtml(p.partyTitle || 'Supplier');
          return `<option value="${p.voucherNo}"${isSel}>${name}</option>`;
        }).join('');
    }
  }

  // Update search input value if current voucher exists and input is not active
  if (searchInput && document.activeElement !== searchInput) {
    const curPur = list.find(p => p.voucherNo === activeVNo);
    if (curPur) {
      searchInput.value = curPur.partyTitle || 'Supplier';
    } else if (!activeVNo) {
      searchInput.value = '';
    }
  }

  if (!menu) return;

  const q = (filterQuery || '').trim().toLowerCase();
  const matching = q ? list.filter(p => (p.partyTitle || '').toLowerCase().includes(q)) : list;

  if (matching.length === 0) {
    menu.innerHTML = '<div class="pur-voucher-dropdown-empty">No vouchers found</div>';
    return;
  }

  menu.innerHTML = matching.map(p => {
    const isSel = p.voucherNo === activeVNo ? ' active' : '';
    const name = window.escapeHtml(p.partyTitle || 'Supplier');
    return `<div class="pur-voucher-dropdown-item${isSel}" data-voucher="${p.voucherNo}">${name}</div>`;
  }).join('');

  menu.querySelectorAll('.pur-voucher-dropdown-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const vNo = item.getAttribute('data-voucher');
      if (vNo) {
        selectAndLoadPurchase(vNo);
        if (searchInput) {
          const matched = list.find(p => p.voucherNo === vNo);
          searchInput.value = matched?.partyTitle || item.textContent;
        }
        menu.classList.add('hidden');
      }
    });
  });
}
window.renderVoucherDropdown = renderVoucherDropdown;

function openPurchaseHistoryModal() {
  renderPurchaseHistoryTable();
  if (inv.modalPurchaseHistory) inv.modalPurchaseHistory.classList.remove('hidden');
}

function closePurchaseHistoryModal() {
  if (inv.modalPurchaseHistory) inv.modalPurchaseHistory.classList.add('hidden');
}

function renderPurchaseHistoryTable() {
  if (!inv.purchaseHistoryTableBody) return;
  inv.purchaseHistoryTableBody.innerHTML = '';

  const list = filteredPurchases;
  const count = list.length;
  const totalAmount = list.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0);

  if (inv.histTotalCount) inv.histTotalCount.textContent = count;
  if (inv.histTotalAmount) {
    inv.histTotalAmount.textContent = 'Rs. ' + totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (count === 0) {
    if (inv.purchaseHistoryEmptyState) inv.purchaseHistoryEmptyState.classList.remove('hidden');
    return;
  }
  if (inv.purchaseHistoryEmptyState) inv.purchaseHistoryEmptyState.classList.add('hidden');

  list.forEach((pur, idx) => {
    let itemsCount = 0;
    try {
      const items = pur.itemsJson ? JSON.parse(pur.itemsJson) : [];
      itemsCount = items.length;
    } catch (_) {}

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;" class="font-num">${idx + 1}</td>
      <td style="text-align: center;" class="font-num font-bold text-primary">#${pur.voucherNo}</td>
      <td style="text-align: center;" class="font-num">${pur.entryDate || '-'}</td>
      <td style="text-align: left;" class="font-bold">${window.escapeHtml(pur.partyTitle || 'Supplier')}</td>
      <td style="text-align: center;" class="font-num">${itemsCount}</td>
      <td style="text-align: right;" class="font-num font-bold text-success">Rs. ${Number(pur.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: center;">
        <button type="button" class="btn btn-xs btn-primary" onclick="window.selectAndLoadPurchase('${pur.voucherNo}')">
          View Bill
        </button>
      </td>
    `;
    inv.purchaseHistoryTableBody.appendChild(tr);
  });
}

function selectAndLoadPurchase(voucherNo) {
  const p = (window.appData?.purchases || []).find(it => it.voucherNo === voucherNo);
  if (p) {
    loadPurchaseRecord(p);
    closePurchaseHistoryModal();
    if (inv.purVoucherQuickSelect) inv.purVoucherQuickSelect.value = voucherNo;
  }
}
window.selectAndLoadPurchase = selectAndLoadPurchase;

async function initPurchaseView() {
  // Populate Parties Dropdown from General Info Parties
  if (inv.purPartySelect) {
    let parties = [];
    try {
      if (window.generalInfoAPI && window.generalInfoAPI.getParties) {
        parties = await window.generalInfoAPI.getParties();
      }
    } catch (e) {
      console.warn('Failed to load parties for purchase voucher:', e);
    }
    // Filter vendors/suppliers first for accurate purchase accounting
    const vendors = parties.filter(p => {
      const t = (p.partyTypeName || '').toLowerCase();
      return t.includes('vendor') || t.includes('supplier') || t.includes('manufacturer') || t.includes('distributor');
    });
    const listToUse = vendors.length > 0 ? vendors : parties;

    inv.purPartySelect.innerHTML = '<option value="">Select Party Name</option>' +
      listToUse.map(p => `<option value="${p.id}" data-contact="${window.escapeHtml(p.contactPerson || '')}" data-phone="${window.escapeHtml(p.phone || '')}" data-area="${window.escapeHtml(p.areaName || p.city || '')}">${window.escapeHtml(p.name)} [${window.escapeHtml(p.partyTypeName || 'Supplier')}]</option>`).join('');
  }

  // Populate Products Dropdown
  const prods = window.appData?.products || [];
  if (inv.pieProductSelect) {
    inv.pieProductSelect.innerHTML = '<option value="">Select Product</option>' +
      prods.map(p => `<option value="${p.code}">${p.code} - ${window.escapeHtml(p.titleEng)}</option>`).join('');
  }

  // Initialize Searchable Product Typeahead
  initPieProductSearch();

  // Set default entry date
  if (inv.purEntryDate && !inv.purEntryDate.value) {
    inv.purEntryDate.value = new Date().toISOString().split('T')[0];
  }

  // Fetch Next Voucher Number
  if (inv.purVoucherNo && !inv.purVoucherNo.value) {
    try {
      const vNo = window.api?.getNextPurchaseVoucherNo ? await window.api.getNextPurchaseVoucherNo() : "101";
      inv.purVoucherNo.value = vNo;
    } catch (e) {
      inv.purVoucherNo.value = (window.appData?.purchases?.length ? String(window.appData.purchases.length + 100) : "101");
    }
  }

  loadedPurchases = window.appData?.purchases || [];
  renderPurchaseLineItems();
  updatePurchaseHeaderBadges();
  updateModalPurchaseCount();
  applyPurchaseDateFilter();
}

// When Party dropdown changes, auto-fill contact person & update badge
if (inv.purPartySelect) {
  inv.purPartySelect.addEventListener('change', () => {
    const selected = inv.purPartySelect.options[inv.purPartySelect.selectedIndex];
    if (inv.purContactPerson) {
      inv.purContactPerson.value = selected?.dataset?.contact || '';
    }
    updatePurchaseHeaderBadges();
    if (selected && selected.value && window.togglePurchaseItemDrawer) {
      window.togglePurchaseItemDrawer(true);
    }
  });
}

// Code and Product Dropdown Sync
function selectProductForPurchase(prod) {
  if (!prod) return;
  if (inv.pieCode) inv.pieCode.value = prod.code;
  if (inv.pieProductSelect) inv.pieProductSelect.value = prod.code;
  if (inv.pieProductSearchInput) inv.pieProductSearchInput.value = prod.titleEng || '';
  if (inv.pieTradePrice) inv.pieTradePrice.value = Number(prod.purchasePrice || prod.tradePrice || 0).toFixed(2);
  const pieWholesale = document.getElementById('pieWholesalePrice');
  if (pieWholesale) pieWholesale.value = Number(prod.wholesalePrice || 0).toFixed(2);
  const pieRetail = document.getElementById('pieRetailPrice');
  if (pieRetail) pieRetail.value = Number(prod.retailPrice || 0).toFixed(2);
  if (inv.pieRetailPricePill) inv.pieRetailPricePill.textContent = Number(prod.retailPrice || 0).toFixed(2);
  if (inv.pieWholesalePricePill) inv.pieWholesalePricePill.textContent = Number(prod.wholesalePrice || 0).toFixed(2);
  updateLineNetPreview();
}

if (inv.pieProductSelect) {
  inv.pieProductSelect.addEventListener('change', () => {
    const code = inv.pieProductSelect.value;
    const prod = (window.appData?.products || []).find(p => p.code === code);
    selectProductForPurchase(prod);
  });
}

if (inv.pieCode) {
  inv.pieCode.addEventListener('input', () => {
    const code = inv.pieCode.value.trim();
    const prod = (window.appData?.products || []).find(p => String(p.code).trim() === code);
    if (prod) selectProductForPurchase(prod);
  });
}

// Add Item to Voucher
function addPurchaseLineItem() {
  if (!inv.purPartySelect || !inv.purPartySelect.value) {
    showAlert('Please select Party Name first!');
    inv.purPartySelect?.focus();
    return;
  }

  const code = inv.pieCode?.value.trim();
  const searchTitle = (inv.pieProductSearchInput?.value || '').trim().toLowerCase();
  let prod = (window.appData?.products || []).find(p => String(p.code).trim() === code);
  if (!prod && searchTitle) {
    prod = (window.appData?.products || []).find(p => (p.titleEng || '').toLowerCase() === searchTitle);
  }

  if (!prod) {
    showAlert('Please select a Product from the dropdown!');
    inv.pieProductSearchInput?.focus();
    return;
  }

  const pQty = Number(inv.piePackQty?.value) || 0;
  const uQty = Number(inv.pieUnitQty?.value) || 0;
  const bonus = Number(inv.pieBonus?.value) || 0;
  const tp = Number(inv.pieTradePrice?.value) || 0;
  const wp = Number(document.getElementById('pieWholesalePrice')?.value) || Number(prod.wholesalePrice) || 0;
  const rp = Number(document.getElementById('pieRetailPrice')?.value) || Number(prod.retailPrice) || 0;
  const tradeOffer = Number(inv.pieTradeOffer?.value) || 0;
  const discPercent = Number(inv.pieDiscPercent?.value) || 0;

  if (pQty === 0 && uQty === 0 && bonus === 0) {
    showAlert('Please enter quantity (Pack Qty or Unit Qty)!');
    inv.piePackQty?.focus();
    return;
  }

  const totalUnits = (pQty * (Number(prod.packSize) || 1)) + uQty;
  let rawAmount = totalUnits * tp;
  if (tradeOffer > 0) rawAmount -= tradeOffer;
  if (discPercent > 0) rawAmount -= (rawAmount * (discPercent / 100));
  const netAmount = Math.max(0, rawAmount);

  const marginPercent = tp > 0 ? (((rp - tp) / tp) * 100).toFixed(1) : '0';

  const lineItem = {
    srNo: currentPurchaseItems.length + 1,
    productId: prod.id,
    productCode: prod.code,
    productTitle: prod.titleEng,
    packQty: pQty,
    unitQty: uQty,
    packSize: prod.packSize || 1,
    bonus,
    tradePrice: tp,
    profitMargin: marginPercent,
    retailPrice: rp,
    wholesalePrice: wp,
    tradeOffer,
    discountPercent: discPercent,
    netAmount: netAmount.toFixed(2)
  };

  currentPurchaseItems.push(lineItem);
  renderPurchaseLineItems();
  updateModalPurchaseCount();
  updatePurchaseHeaderBadges();
  autoSaveCurrentPurchase();

  const syncCatalog = document.getElementById('pieSyncCatalogPrices')?.checked;
  if (syncCatalog && (tp > 0 || wp > 0 || rp > 0)) {
    try {
      if (window.api?.updateProductPrices) {
        window.api.updateProductPrices(prod.id, { purchasePrice: tp, wholesalePrice: wp, retailPrice: rp });
      }
      if (prod) {
        if (tp > 0) prod.purchasePrice = tp;
        if (wp > 0) prod.wholesalePrice = wp;
        if (rp > 0) prod.retailPrice = rp;
        if (tp > 0 && rp > 0) prod.profitMargin = Number((((rp - tp) / tp) * 100).toFixed(1));
      }
    } catch (e) {
      console.warn('Sync catalog price error:', e);
    }
  }

  if (window.showToast) {
    window.showToast(`Item "${lineItem.productTitle}" added!`, 'success');
  }

  // Reset inputs
  if (inv.pieCode) inv.pieCode.value = '';
  if (inv.pieProductSearchInput) inv.pieProductSearchInput.value = '';
  if (inv.pieProductSelect) inv.pieProductSelect.value = '';
  if (inv.piePackQty) inv.piePackQty.value = 0;
  if (inv.pieUnitQty) inv.pieUnitQty.value = 0;
  if (inv.pieBonus) inv.pieBonus.value = 0;
  if (inv.pieTradePrice) inv.pieTradePrice.value = '0.00';
  const wpEl = document.getElementById('pieWholesalePrice');
  if (wpEl) wpEl.value = '0.00';
  const rpEl = document.getElementById('pieRetailPrice');
  if (rpEl) rpEl.value = '0.00';
  if (inv.pieTradeOffer) inv.pieTradeOffer.value = '0.00';
  if (inv.pieDiscPercent) inv.pieDiscPercent.value = '0.0';
  updateLineNetPreview();
  if (inv.pieProductSearchInput) inv.pieProductSearchInput.focus();
}

if (inv.btnAddPurchaseItem) inv.btnAddPurchaseItem.addEventListener('click', addPurchaseLineItem);

// Toggle Add Item Drawer (Accordion / Slide Down)
window.togglePurchaseItemDrawer = function(forceState) {
  const drawer = document.getElementById('purItemEntryDrawer');
  const btn = document.getElementById('btnToggleAddItem');
  if (!drawer) return;

  const isCollapsed = drawer.classList.contains('collapsed');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : isCollapsed;

  if (shouldOpen) {
    drawer.classList.remove('collapsed');
    if (btn) btn.classList.add('active');
    const dropdownList = document.getElementById('pieProductDropdownList');
    if (dropdownList) dropdownList.classList.add('hidden');
  } else {
    drawer.classList.add('collapsed');
    if (btn) btn.classList.remove('active');
    const dropdownList = document.getElementById('pieProductDropdownList');
    if (dropdownList) dropdownList.classList.add('hidden');
  }

  // Recalculate pagination size if active
  if (purLinePagination && typeof purLinePagination.render === 'function') {
    setTimeout(() => purLinePagination.render(), 360);
  }
};

const btnToggleAddItem = document.getElementById('btnToggleAddItem');
if (btnToggleAddItem) {
  btnToggleAddItem.addEventListener('click', (e) => {
    e.preventDefault();
    window.togglePurchaseItemDrawer();
  });
}

function removePurchaseLineItem(index) {
  currentPurchaseItems.splice(index, 1);
  currentPurchaseItems.forEach((item, i) => { item.srNo = i + 1; });
  renderPurchaseLineItems();
  updateModalPurchaseCount();
}

let purLinePagination = null;
function renderPurchaseLineItems() {
  if (!inv.purchaseItemsTableBody) return;

  const pieSrUpdate = document.getElementById('pieSrNo');
  if (pieSrUpdate) pieSrUpdate.value = currentPurchaseItems.length + 1;

  if (!purLinePagination && window.createTablePagination) {
    purLinePagination = window.createTablePagination({
      container: '#subviewPurchaseVoucher .pur-items-grid',
      tbody: inv.purchaseItemsTableBody,
      emptyStateEl: inv.purchaseItemsEmptyState,
      fixedPageSize: 6,
      onRenderPage: (slice, startIdx) => {
        inv.purchaseItemsTableBody.innerHTML = '';
        slice.forEach((item, idx) => {
          const actualIdx = startIdx + idx;
          const menuId = `purRowMenu_${actualIdx}`;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-pur-sr font-num">${item.srNo || (actualIdx + 1)}</td>
            <td class="col-pur-name font-bold">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span>${window.escapeHtml(item.productTitle)}</span>
                <button type="button" class="btn-xs" onclick="window.openChangeSubstancePriceModal(${actualIdx})" title="Change price of this substance" style="padding: 1px 6px; font-size: 0.7rem; border-radius: 4px; border: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; font-weight: 700; cursor: pointer; white-space: nowrap;">💰 Price</button>
              </div>
            </td>
            <td class="col-pur-pqty font-num">${item.packQty}</td>
            <td class="col-pur-uqty font-num">${item.unitQty}</td>
            <td class="col-pur-bonus font-num">${item.bonus || 0}</td>
            <td class="col-pur-tprice font-num" onclick="window.openChangeSubstancePriceModal(${actualIdx})" style="cursor: pointer; text-decoration: underline dotted #94a3b8;" title="Click to change rate">${Number(item.tradePrice).toFixed(2)}</td>
            <td class="col-pur-pro font-num text-success">${item.profitMargin}%</td>
            <td class="col-pur-pprice font-num" onclick="window.openChangeSubstancePriceModal(${actualIdx})" style="cursor: pointer; text-decoration: underline dotted #94a3b8;" title="Click to change retail price">${Number(item.retailPrice).toFixed(2)}</td>
            <td class="col-pur-wprice font-num" onclick="window.openChangeSubstancePriceModal(${actualIdx})" style="cursor: pointer; text-decoration: underline dotted #94a3b8;" title="Click to change wholesale price">${Number(item.wholesalePrice).toFixed(2)}</td>
            <td class="col-pur-toffer font-num">${Number(item.tradeOffer).toFixed(2)}</td>
            <td class="col-pur-disc font-num">${item.discountPercent}%</td>
            <td class="col-pur-amount font-num font-bold text-accent">${Number(item.netAmount).toFixed(2)}</td>
            <td class="col-pur-action" style="overflow: visible; position: relative;">
              <div class="dots-wrapper">
                <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
                  <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                </button>
                <div id="${menuId}" class="action-menu hidden">
                  <button type="button" class="action-menu-item text-primary" onclick="window.openChangeSubstancePriceModal(${actualIdx})">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <span>Change Price</span>
                  </button>
                  <button type="button" class="action-menu-item" onclick="window.editPurchaseLineItem(${actualIdx})">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Edit Line</span>
                  </button>
                  <button type="button" class="action-menu-item text-danger" onclick="window.removePurchaseLineItem(${actualIdx})">
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
          inv.purchaseItemsTableBody.appendChild(tr);
        });
      }
    });
  }

  if (purLinePagination) {
    purLinePagination.setItems(currentPurchaseItems, false);
  }

  renderModalPurchaseItems();
  calculatePurchaseBill();
}

function editPurchaseLineItem(index) {
  const item = currentPurchaseItems[index];
  if (!item) return;

  if (inv.pieCode) inv.pieCode.value = item.productCode || '';
  if (inv.pieProductSearchInput) inv.pieProductSearchInput.value = item.productTitle || '';
  if (inv.piePackQty) inv.piePackQty.value = item.packQty || 0;
  if (inv.pieUnitQty) inv.pieUnitQty.value = item.unitQty || 0;
  if (inv.pieBonus) inv.pieBonus.value = item.bonus || 0;
  if (inv.pieTradePrice) inv.pieTradePrice.value = Number(item.tradePrice || 0).toFixed(2);
  const wpEl = document.getElementById('pieWholesalePrice');
  if (wpEl) wpEl.value = Number(item.wholesalePrice || 0).toFixed(2);
  const rpEl = document.getElementById('pieRetailPrice');
  if (rpEl) rpEl.value = Number(item.retailPrice || 0).toFixed(2);
  if (inv.pieTradeOffer) inv.pieTradeOffer.value = Number(item.tradeOffer || 0).toFixed(2);
  if (inv.pieDiscPercent) inv.pieDiscPercent.value = Number(item.discountPercent || 0).toFixed(1);

  currentPurchaseItems.splice(index, 1);
  currentPurchaseItems.forEach((it, i) => { it.srNo = i + 1; });
  renderPurchaseLineItems();
  updateLineNetPreview();
  autoSaveCurrentPurchase();

  if (inv.piePackQty) inv.piePackQty.focus();
}
window.editPurchaseLineItem = editPurchaseLineItem;

function removePurchaseLineItem(index) {
  currentPurchaseItems.splice(index, 1);
  currentPurchaseItems.forEach((item, i) => { item.srNo = i + 1; });
  renderPurchaseLineItems();
  updateModalPurchaseCount();
  autoSaveCurrentPurchase();
}
window.removePurchaseLineItem = removePurchaseLineItem;

async function autoSaveCurrentPurchase() {
  if (!inv.purPartySelect || !inv.purPartySelect.value) return;
  const selectedParty = inv.purPartySelect.options[inv.purPartySelect.selectedIndex];
  const partyTitle = selectedParty ? selectedParty.text : '';

  const lineSum = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);
  const vNo = inv.purVoucherNo?.value || (window.appData?.purchases?.length ? String(window.appData.purchases.length + 100) : "101");

  const purchaseData = {
    voucherNo: vNo,
    manualNo: inv.purManualNo?.value.trim() || '',
    entryDate: inv.purEntryDate?.value || new Date().toISOString().split('T')[0],
    partyId: inv.purPartySelect.value,
    partyTitle,
    description: '',
    storeTitle: 'Main Store',
    receivable: 0,
    contactPerson: '',
    dueDate: '',
    paymentStatus: 'Pending',
    totalAmount: lineSum,
    discount: 0,
    freightDisc: 0,
    freightExpn: 0,
    salesTax: 0,
    extraCharges: 0,
    grandTotal: lineSum
  };

  try {
    if (window.api?.savePurchase) {
      await window.api.savePurchase(purchaseData, currentPurchaseItems);
    }
  } catch (err) {
    console.warn('Auto save purchase error:', err);
  }
}

// ========================================================
// CHANGE SUBSTANCE PRICE IN PURCHASE (MODAL WORKFLOW)
// ========================================================
function openChangeSubstancePriceModal(lineIdx, fallbackProduct = null) {
  const modal = document.getElementById('modalChangeSubstancePrice');
  if (!modal) return;

  let prod = null;
  let currentTp = 0;
  let currentWp = 0;
  let currentRp = 0;
  let title = '';
  let code = '';
  let packSize = 1;
  let stock = 0;

  if (lineIdx >= 0 && currentPurchaseItems[lineIdx]) {
    const it = currentPurchaseItems[lineIdx];
    title = it.productTitle || '';
    code = it.productCode || '';
    packSize = it.packSize || 1;
    currentTp = Number(it.tradePrice) || 0;
    currentWp = Number(it.wholesalePrice) || 0;
    currentRp = Number(it.retailPrice) || 0;
    prod = (window.appData?.products || []).find(p => String(p.code).trim() === String(code).trim() || p.id === it.productId);
    stock = prod ? Number(prod.stockQty || 0) : 0;
  } else {
    // Reading from drawer entry
    lineIdx = -1;
    if (fallbackProduct) {
      prod = fallbackProduct;
    } else {
      const codeInput = inv.pieCode?.value.trim();
      const searchTitle = (inv.pieProductSearchInput?.value || '').trim().toLowerCase();
      prod = (window.appData?.products || []).find(p => String(p.code).trim() === codeInput);
      if (!prod && searchTitle) {
        prod = (window.appData?.products || []).find(p => (p.titleEng || '').toLowerCase() === searchTitle);
      }
    }

    if (!prod) {
      if (window.showToast) window.showToast('Please select a product first to change price!', 'warning');
      else showAlert('Please select a product first to change price!');
      inv.pieProductSearchInput?.focus();
      return;
    }

    title = prod.titleEng || '';
    code = prod.code || '';
    packSize = Number(prod.packSize) || 1;
    stock = Number(prod.stockQty) || 0;
    currentTp = Number(inv.pieTradePrice?.value) || Number(prod.purchasePrice || prod.tradePrice || 0);
    const wpEl = document.getElementById('pieWholesalePrice');
    currentWp = wpEl ? (Number(wpEl.value) || Number(prod.wholesalePrice || 0)) : Number(prod.wholesalePrice || 0);
    const rpEl = document.getElementById('pieRetailPrice');
    currentRp = rpEl ? (Number(rpEl.value) || Number(prod.retailPrice || 0)) : Number(prod.retailPrice || 0);
  }

  // Populate modal
  const cspProdId = document.getElementById('cspProductId');
  if (cspProdId) cspProdId.value = prod?.id || '';
  const cspLineIdx = document.getElementById('cspLineItemIndex');
  if (cspLineIdx) cspLineIdx.value = lineIdx;
  const cspTitle = document.getElementById('cspProductTitle');
  if (cspTitle) cspTitle.textContent = title || 'Substance';
  const cspCode = document.getElementById('cspProductCode');
  if (cspCode) cspCode.textContent = code || '-';
  const cspPack = document.getElementById('cspPackSize');
  if (cspPack) cspPack.textContent = packSize;
  const cspStock = document.getElementById('cspCurrentStock');
  if (cspStock) cspStock.textContent = stock;

  const inTp = document.getElementById('cspTradePrice');
  const inWp = document.getElementById('cspWholesalePrice');
  const inRp = document.getElementById('cspRetailPrice');

  if (inTp) inTp.value = currentTp > 0 ? currentTp.toFixed(2) : '0.00';
  if (inWp) inWp.value = currentWp > 0 ? currentWp.toFixed(2) : '0.00';
  if (inRp) inRp.value = currentRp > 0 ? currentRp.toFixed(2) : '0.00';

  updateCspMarginBadge();
  modal.classList.remove('hidden');
  setTimeout(() => { if (inTp) { inTp.focus(); inTp.select(); } }, 100);
}
window.openChangeSubstancePriceModal = openChangeSubstancePriceModal;

function closeChangeSubstancePriceModal() {
  const modal = document.getElementById('modalChangeSubstancePrice');
  if (modal) modal.classList.add('hidden');
}
window.closeChangeSubstancePriceModal = closeChangeSubstancePriceModal;

function updateCspMarginBadge() {
  const tp = Number(document.getElementById('cspTradePrice')?.value) || 0;
  const rp = Number(document.getElementById('cspRetailPrice')?.value) || 0;
  const badge = document.getElementById('cspMarginBadge');
  if (!badge) return;
  if (tp > 0) {
    const margin = (((rp - tp) / tp) * 100).toFixed(1);
    badge.textContent = `${margin}%`;
    badge.style.color = Number(margin) >= 0 ? '#047857' : '#b91c1c';
  } else {
    badge.textContent = '0.0%';
    badge.style.color = '#047857';
  }
}

async function applyChangeSubstancePrice() {
  const lineIdx = parseInt(document.getElementById('cspLineItemIndex')?.value, 10);
  const prodId = document.getElementById('cspProductId')?.value;
  const tp = Number(document.getElementById('cspTradePrice')?.value) || 0;
  const wp = Number(document.getElementById('cspWholesalePrice')?.value) || 0;
  const rp = Number(document.getElementById('cspRetailPrice')?.value) || 0;
  const updateCatalog = document.getElementById('cspApplyToCatalog')?.checked;
  const title = document.getElementById('cspProductTitle')?.textContent || 'Substance';
  const marginPercent = tp > 0 ? (((rp - tp) / tp) * 100).toFixed(1) : '0';

  if (lineIdx >= 0 && currentPurchaseItems[lineIdx]) {
    const item = currentPurchaseItems[lineIdx];
    item.tradePrice = tp;
    item.wholesalePrice = wp;
    item.retailPrice = rp;
    item.profitMargin = marginPercent;

    // Recalculate line net amount
    const totalUnits = ((Number(item.packQty) || 0) * (Number(item.packSize) || 1)) + (Number(item.unitQty) || 0);
    let rawAmount = totalUnits * tp;
    const to = Number(item.tradeOffer) || 0;
    const disc = Number(item.discountPercent) || 0;
    if (to > 0) rawAmount -= to;
    if (disc > 0) rawAmount -= (rawAmount * (disc / 100));
    item.netAmount = Math.max(0, rawAmount).toFixed(2);

    renderPurchaseLineItems();
    updateModalPurchaseCount();
    autoSaveCurrentPurchase();
  } else {
    // Update drawer inputs
    if (inv.pieTradePrice) inv.pieTradePrice.value = tp.toFixed(2);
    const wpEl = document.getElementById('pieWholesalePrice');
    if (wpEl) wpEl.value = wp.toFixed(2);
    const rpEl = document.getElementById('pieRetailPrice');
    if (rpEl) rpEl.value = rp.toFixed(2);
    updateLineNetPreview();
  }

  // Update in database and in-memory appData if requested
  if (updateCatalog && prodId) {
    try {
      if (window.api?.updateProductPrices) {
        await window.api.updateProductPrices(prodId, { purchasePrice: tp, wholesalePrice: wp, retailPrice: rp });
      }
      const pObj = (window.appData?.products || []).find(p => p.id === prodId);
      if (pObj) {
        pObj.purchasePrice = tp;
        pObj.wholesalePrice = wp;
        pObj.retailPrice = rp;
        pObj.profitMargin = Number(marginPercent);
      }
    } catch (err) {
      console.warn('Update catalog prices error:', err);
    }
  }

  closeChangeSubstancePriceModal();
  if (window.showToast) {
    window.showToast(`Price for "${title}" updated! (Cost: Rs ${tp}, Whole: Rs ${wp}, Retail: Rs ${rp})`, 'success');
  }
}
window.applyChangeSubstancePrice = applyChangeSubstancePrice;

function calculatePurchaseBill() {
  const lineSum = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);
  const discount = Number(inv.purDiscount?.value) || 0;
  const freightDisc = Number(inv.purFreightDisc?.value) || 0;
  const freightExpn = Number(inv.purFreightExpn?.value) || 0;
  const salesTax = Number(inv.purSalesTax?.value) || 0;
  const extraCharges = Number(inv.purExtraCharges?.value) || 0;

  const grandTotal = Math.max(0, lineSum - discount - freightDisc + freightExpn + salesTax + extraCharges);

  if (inv.purGrandTotalDisplay) {
    inv.purGrandTotalDisplay.textContent = grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// Bind bill footer recalculation inputs
[inv.purDiscount, inv.purFreightDisc, inv.purFreightExpn, inv.purSalesTax, inv.purExtraCharges].forEach(input => {
  if (input) input.addEventListener('input', calculatePurchaseBill);
});

// Save Purchase Voucher
async function savePurchaseVoucher() {
  if (!inv.purPartySelect || !inv.purPartySelect.value) {
    showAlert('Please Select the Party Title!');
    inv.purPartySelect?.focus();
    return;
  }

  if (currentPurchaseItems.length === 0) {
    showAlert('Cannot save an empty voucher. Please add at least one line item!');
    return;
  }

  const selectedParty = inv.purPartySelect.options[inv.purPartySelect.selectedIndex];
  const partyTitle = selectedParty ? selectedParty.text : '';

  const lineSum = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);
  const discount = Number(inv.purDiscount?.value) || 0;
  const freightDisc = Number(inv.purFreightDisc?.value) || 0;
  const freightExpn = Number(inv.purFreightExpn?.value) || 0;
  const salesTax = Number(inv.purSalesTax?.value) || 0;
  const extraCharges = Number(inv.purExtraCharges?.value) || 0;
  const grandTotal = Math.max(0, lineSum - discount - freightDisc + freightExpn + salesTax + extraCharges);

  const purchaseData = {
    voucherNo: inv.purVoucherNo?.value.trim(),
    manualNo: inv.purManualNo?.value.trim() || '',
    entryDate: inv.purEntryDate?.value || new Date().toISOString().split('T')[0],
    partyId: inv.purPartySelect.value,
    partyTitle,
    description: inv.purDescription?.value.trim() || '',
    storeTitle: inv.purStoreTitle?.value.trim() || 'Store',
    receivable: Number(inv.purReceivable?.value) || 0,
    contactPerson: inv.purContactPerson?.value.trim() || '',
    dueDate: inv.purDueDate?.value || '',
    paymentStatus: inv.purPaymentStatus?.value || 'Pending',
    totalAmount: lineSum,
    discount,
    freightDisc,
    freightExpn,
    salesTax,
    extraCharges,
    grandTotal
  };

  try {
    if (window.api?.savePurchase) {
      await window.api.savePurchase(purchaseData, currentPurchaseItems);
    }
    await window.reloadFromDatabase();
    showAlert(`Purchase Voucher #${purchaseData.voucherNo} saved successfully! Stock updated.`, 'Success');
    applyPurchaseDateFilter();
    resetPurchaseForm();
  } catch (err) {
    console.error('Save purchase voucher error:', err);
    showAlert('Error saving purchase voucher: ' + err.message, 'Error');
  }
}

async function resetPurchaseForm() {
  currentPurchaseItems = [];
  if (inv.purVoucherNo) {
    try {
      const vNo = window.api?.getNextPurchaseVoucherNo ? await window.api.getNextPurchaseVoucherNo() : "101";
      inv.purVoucherNo.value = vNo;
    } catch (e) { }
  }
  if (inv.purManualNo) inv.purManualNo.value = '';
  if (inv.purPartySelect) inv.purPartySelect.value = '';
  if (inv.purContactPerson) inv.purContactPerson.value = '';
  if (inv.purPaymentStatus) inv.purPaymentStatus.value = 'Pending';
  if (inv.purDescription) inv.purDescription.value = '';
  if (inv.pieProductSearchInput) inv.pieProductSearchInput.value = '';
  if (inv.pieCode) inv.pieCode.value = '';
  if (inv.purDiscount) inv.purDiscount.value = '0.00';
  if (inv.purFreightDisc) inv.purFreightDisc.value = '0.00';
  if (inv.purFreightExpn) inv.purFreightExpn.value = '0.00';
  if (inv.purSalesTax) inv.purSalesTax.value = '0.00';
  if (inv.purExtraCharges) inv.purExtraCharges.value = '0.00';
  renderPurchaseLineItems();
  updatePurchaseHeaderBadges();
  updateModalPurchaseCount();
  applyPurchaseDateFilter();
}

function loadPurchaseRecord(pur) {
  if (!pur) return;
  const sInput = document.getElementById('purVoucherSearchInput');
  if (sInput) sInput.value = pur.partyTitle || '';
  if (inv.purVoucherNo) inv.purVoucherNo.value = pur.voucherNo;
  if (inv.purManualNo) inv.purManualNo.value = pur.manualNo || '';
  if (inv.purEntryDate) inv.purEntryDate.value = pur.entryDate || '';
  if (inv.purPartySelect) inv.purPartySelect.value = pur.partyId || '';
  if (inv.purContactPerson) inv.purContactPerson.value = pur.contactPerson || '';
  if (inv.purDescription) inv.purDescription.value = pur.description || '';
  if (inv.purStoreTitle) inv.purStoreTitle.value = pur.storeTitle || 'Store';
  if (inv.purDueDate) inv.purDueDate.value = pur.dueDate || '';
  if (inv.purPaymentStatus) inv.purPaymentStatus.value = pur.paymentStatus || 'Pending';
  if (inv.purDiscount) inv.purDiscount.value = Number(pur.discount || 0).toFixed(2);
  if (inv.purFreightDisc) inv.purFreightDisc.value = Number(pur.freightDisc || 0).toFixed(2);
  if (inv.purFreightExpn) inv.purFreightExpn.value = Number(pur.freightExpn || 0).toFixed(2);
  if (inv.purSalesTax) inv.purSalesTax.value = Number(pur.salesTax || 0).toFixed(2);
  if (inv.purExtraCharges) inv.purExtraCharges.value = Number(pur.extraCharges || 0).toFixed(2);

  try {
    currentPurchaseItems = pur.itemsJson ? JSON.parse(pur.itemsJson) : [];
  } catch (e) {
    currentPurchaseItems = [];
  }
  renderPurchaseLineItems();
  updatePurchaseHeaderBadges();
  updateModalPurchaseCount();
}

// Purchase Navigation Dock
if (inv.btnPurSave) inv.btnPurSave.addEventListener('click', savePurchaseVoucher);
if (inv.btnPurRefresh) inv.btnPurRefresh.addEventListener('click', resetPurchaseForm);
if (inv.btnPurPrint) inv.btnPurPrint.addEventListener('click', () => window.print());
if (inv.btnPurDelete) {
  inv.btnPurDelete.addEventListener('click', () => {
    const vNo = inv.purVoucherNo?.value;
    if (!vNo) return;
    window.openConfirmModal({
      title: 'Delete Purchase Voucher',
      message: `Are you sure you want to delete Purchase Voucher #${vNo}?`,
      onConfirm: async () => {
        try {
          if (window.api?.deletePurchase) await window.api.deletePurchase(vNo);
          await window.reloadFromDatabase();
          resetPurchaseForm();
        } catch (e) {
          showAlert('Error deleting voucher: ' + e.message);
        }
      }
    });
  });
}

// Purchase Modal Open & Close Event Bindings
if (inv.btnOpenAddPurchase) inv.btnOpenAddPurchase.addEventListener('click', openAddPurchaseModal);
if (inv.btnCloseAddPurchaseModal) inv.btnCloseAddPurchaseModal.addEventListener('click', closeAddPurchaseModal);
if (inv.btnCancelAddPurchase) inv.btnCancelAddPurchase.addEventListener('click', closeAddPurchaseModal);
if (inv.btnDonePurchaseModal) inv.btnDonePurchaseModal.addEventListener('click', closeAddPurchaseModal);
if (inv.btnSavePurchaseModal) {
  inv.btnSavePurchaseModal.addEventListener('click', async () => {
    await savePurchaseVoucher();
    closeAddPurchaseModal();
  });
}

// Live preview listeners for item entry inside modal
[inv.piePackQty, inv.pieUnitQty, inv.pieBonus, inv.pieTradePrice, document.getElementById('pieWholesalePrice'), document.getElementById('pieRetailPrice'), inv.pieTradeOffer, inv.pieDiscPercent].forEach(input => {
  if (input) input.addEventListener('input', updateLineNetPreview);
});

// Bind Change Substance Price Modal Event Listeners
const btnOpenChangePriceModal = document.getElementById('btnOpenChangePriceModal');
if (btnOpenChangePriceModal) {
  btnOpenChangePriceModal.addEventListener('click', (e) => {
    e.preventDefault();
    openChangeSubstancePriceModal(-1);
  });
}

const btnCloseChangePriceModal = document.getElementById('btnCloseChangePriceModal');
if (btnCloseChangePriceModal) btnCloseChangePriceModal.addEventListener('click', closeChangeSubstancePriceModal);

const btnCancelChangePriceModal = document.getElementById('btnCancelChangePriceModal');
if (btnCancelChangePriceModal) btnCancelChangePriceModal.addEventListener('click', closeChangeSubstancePriceModal);

const btnApplyChangePriceModal = document.getElementById('btnApplyChangePriceModal');
if (btnApplyChangePriceModal) btnApplyChangePriceModal.addEventListener('click', applyChangeSubstancePrice);

['cspTradePrice', 'cspRetailPrice'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateCspMarginBadge);
});

// Purchase Filter Toolbar Event Bindings
if (inv.purFilterDate) {
  inv.purFilterDate.addEventListener('change', applyPurchaseDateFilter);
  inv.purFilterDate.addEventListener('click', () => {
    try {
      if (typeof inv.purFilterDate.showPicker === 'function') inv.purFilterDate.showPicker();
    } catch (_) {}
  });
}

const btnPurClearDate = document.getElementById('btnPurClearDate');
if (btnPurClearDate) {
  btnPurClearDate.addEventListener('click', () => {
    if (inv.purFilterDate) inv.purFilterDate.value = '';
    applyPurchaseDateFilter();
  });
}

// Voucher Searchbar & Combobox Dropdown
const purVoucherSearchInput = document.getElementById('purVoucherSearchInput');
const btnToggleVoucherList = document.getElementById('btnToggleVoucherList');
const purVoucherDropdownList = document.getElementById('purVoucherDropdownList');

if (purVoucherSearchInput && purVoucherDropdownList) {
  purVoucherSearchInput.addEventListener('focus', () => {
    purVoucherSearchInput.select();
    renderVoucherDropdown(purVoucherSearchInput.value);
    purVoucherDropdownList.classList.remove('hidden');
  });

  purVoucherSearchInput.addEventListener('input', () => {
    renderVoucherDropdown(purVoucherSearchInput.value);
    purVoucherDropdownList.classList.remove('hidden');
  });

  purVoucherSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      purVoucherDropdownList.classList.add('hidden');
    } else if (e.key === 'Enter') {
      const firstItem = purVoucherDropdownList.querySelector('.pur-voucher-dropdown-item');
      if (firstItem) {
        firstItem.dispatchEvent(new MouseEvent('mousedown'));
      }
    }
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('purVoucherCombobox');
    if (wrap && !wrap.contains(e.target)) {
      purVoucherDropdownList.classList.add('hidden');
    }
  });
}

if (btnToggleVoucherList && purVoucherDropdownList) {
  btnToggleVoucherList.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = purVoucherDropdownList.classList.contains('hidden');
    if (isHidden) {
      renderVoucherDropdown(purVoucherSearchInput?.value || '');
      purVoucherDropdownList.classList.remove('hidden');
      if (purVoucherSearchInput) purVoucherSearchInput.focus();
    } else {
      purVoucherDropdownList.classList.add('hidden');
    }
  });
}

if (inv.purVoucherQuickSelect) {
  inv.purVoucherQuickSelect.addEventListener('change', () => {
    const vNo = inv.purVoucherQuickSelect.value;
    if (vNo) selectAndLoadPurchase(vNo);
  });
}
if (inv.btnOpenPurchaseHistory) inv.btnOpenPurchaseHistory.addEventListener('click', openPurchaseHistoryModal);
if (inv.btnClosePurchaseHistory) inv.btnClosePurchaseHistory.addEventListener('click', closePurchaseHistoryModal);
if (inv.btnDonePurchaseHistory) inv.btnDonePurchaseHistory.addEventListener('click', closePurchaseHistoryModal);

if (inv.btnPurFirst) {
  inv.btnPurFirst.addEventListener('click', () => {
    const list = filteredPurchases.length > 0 ? filteredPurchases : (window.appData?.purchases || []);
    if (list.length > 0) {
      purchaseNavIndex = 0;
      loadPurchaseRecord(list[purchaseNavIndex]);
      if (inv.purVoucherQuickSelect) inv.purVoucherQuickSelect.value = list[purchaseNavIndex].voucherNo;
    }
  });
}
if (inv.btnPurPrev) {
  inv.btnPurPrev.addEventListener('click', () => {
    const list = filteredPurchases.length > 0 ? filteredPurchases : (window.appData?.purchases || []);
    if (list.length > 0) {
      purchaseNavIndex = Math.max(0, purchaseNavIndex - 1);
      loadPurchaseRecord(list[purchaseNavIndex]);
      if (inv.purVoucherQuickSelect) inv.purVoucherQuickSelect.value = list[purchaseNavIndex].voucherNo;
    }
  });
}
if (inv.btnPurNext) {
  inv.btnPurNext.addEventListener('click', () => {
    const list = filteredPurchases.length > 0 ? filteredPurchases : (window.appData?.purchases || []);
    if (list.length > 0) {
      purchaseNavIndex = Math.min(list.length - 1, purchaseNavIndex + 1);
      loadPurchaseRecord(list[purchaseNavIndex]);
      if (inv.purVoucherQuickSelect) inv.purVoucherQuickSelect.value = list[purchaseNavIndex].voucherNo;
    }
  });
}
if (inv.btnPurLast) {
  inv.btnPurLast.addEventListener('click', () => {
    const list = filteredPurchases.length > 0 ? filteredPurchases : (window.appData?.purchases || []);
    if (list.length > 0) {
      purchaseNavIndex = list.length - 1;
      loadPurchaseRecord(list[purchaseNavIndex]);
      if (inv.purVoucherQuickSelect) inv.purVoucherQuickSelect.value = list[purchaseNavIndex].voucherNo;
    }
  });
}

// ========================================================
// 7. PRODUCT INFO MASTER MODULE (LEGACY REPLICA)
// ========================================================
async function initProductInfoView() {
  if (window.reloadFromDatabase) await window.reloadFromDatabase();
  populateProductInfoDropdowns();
  renderProductsTable();
}

function populateProductInfoDropdowns() {
  // Categories for Form
  const cats = window.appData?.product_categories || [];
  if (inv.piCategorySelect) {
    inv.piCategorySelect.innerHTML = '<option value="">Select Category</option>' +
      cats.map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('');
  }

  // Categories for Top Action Bar Filter
  if (inv.piCategoryFilter) {
    const curVal = inv.piCategoryFilter.value;
    inv.piCategoryFilter.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('');
    if (curVal) inv.piCategoryFilter.value = curVal;
  }

  // Units
  const units = window.appData?.units || [];
  if (inv.piUnitSelect) {
    inv.piUnitSelect.innerHTML = '<option value="">Select Unit</option>' +
      units.map(u => `<option value="${u.id}">${window.escapeHtml(u.name)} (${u.symbol || ''})</option>`).join('');
  }

  // Types
  const types = window.appData?.product_types || [];
  if (inv.piTypeSelect && types.length > 0) {
    inv.piTypeSelect.innerHTML = types.map(t => `<option value="${t.name}">${window.escapeHtml(t.name)}</option>`).join('');
  }

  updateProductSubCategoryDropdown();
  updateProductTopSubCategoryFilter();
}

function updateProductSubCategoryDropdown() {
  const catId = inv.piCategorySelect?.value;
  const subs = window.appData?.product_sub_categories || [];
  const filtered = catId ? subs.filter(s => String(s.categoryId) === String(catId)) : subs;

  if (inv.piSubCategorySelect) {
    inv.piSubCategorySelect.innerHTML = '<option value="">Select Sub Category</option>' +
      filtered.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');
  }
}

function updateProductTopSubCategoryFilter() {
  const catId = inv.piCategoryFilter?.value;
  if (!inv.piSubCategoryFilter) return;

  if (!catId) {
    inv.piSubCategoryFilter.disabled = true;
    inv.piSubCategoryFilter.innerHTML = '<option value="">All Sub Categories</option>';
    inv.piSubCategoryFilter.value = '';
    return;
  }

  inv.piSubCategoryFilter.disabled = false;
  const subs = window.appData?.product_sub_categories || [];
  const filtered = subs.filter(s => String(s.categoryId) === String(catId));
  const curVal = inv.piSubCategoryFilter.value;

  inv.piSubCategoryFilter.innerHTML = '<option value="">All Sub Categories</option>' +
    filtered.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');

  if (curVal && filtered.some(s => String(s.id) === String(curVal))) {
    inv.piSubCategoryFilter.value = curVal;
  } else {
    inv.piSubCategoryFilter.value = '';
  }
}

function renderProductsTable() {
  const prods = window.appData?.products || [];
  const q = (inv.piSearchInput?.value || '').trim().toLowerCase();
  const catFilter = inv.piCategoryFilter?.value || '';
  const subCatFilter = (catFilter && inv.piSubCategoryFilter?.value) ? inv.piSubCategoryFilter.value : '';

  let filtered = prods.filter(p => {
    // Search Filter
    const matchesQ = !q ||
      String(p.code || '').toLowerCase().includes(q) ||
      (p.titleEng || '').toLowerCase().includes(q) ||
      (p.titleUrdu || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.categoryName || '').toLowerCase().includes(q) ||
      (p.subCategoryName || '').toLowerCase().includes(q);

    // Category Filter
    const matchesCat = !catFilter || String(p.categoryId) === String(catFilter);

    // Sub Category Filter
    const matchesSubCat = !subCatFilter || String(p.subCategoryId) === String(subCatFilter);

    // Stock Filter
    const stockVal = inv.piStockFilter?.value || '';
    let matchesStock = true;
    const stockQty = Number(p.stockQty) || 0;
    if (stockVal === 'in_stock') matchesStock = stockQty > 0;
    else if (stockVal === 'out_of_stock') matchesStock = stockQty <= 0;
    else if (stockVal === 'low_stock') matchesStock = stockQty > 0 && stockQty <= 5;

    return matchesQ && matchesCat && matchesSubCat && matchesStock;
  });

  // Sorting based on piSortFilter
  const sortVal = inv.piSortFilter?.value || 'code_asc';
  if (sortVal === 'name_asc') {
    filtered.sort((a, b) => String(a.titleEng || '').localeCompare(String(b.titleEng || '')));
  } else if (sortVal === 'name_desc') {
    filtered.sort((a, b) => String(b.titleEng || '').localeCompare(String(a.titleEng || '')));
  } else if (sortVal === 'stock_desc') {
    filtered.sort((a, b) => (Number(b.stockQty) || 0) - (Number(a.stockQty) || 0));
  } else if (sortVal === 'stock_asc') {
    filtered.sort((a, b) => (Number(a.stockQty) || 0) - (Number(b.stockQty) || 0));
  } else if (sortVal === 'price_desc') {
    filtered.sort((a, b) => (Number(b.retailPrice) || 0) - (Number(a.retailPrice) || 0));
  } else if (sortVal === 'price_asc') {
    filtered.sort((a, b) => (Number(a.retailPrice) || 0) - (Number(b.retailPrice) || 0));
  } else if (sortVal === 'code_desc') {
    filtered.sort((a, b) => String(b.code || '').localeCompare(String(a.code || ''), undefined, { numeric: true }));
  } else {
    // code_asc default
    filtered.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true }));
  }

  // Results Counter Pill
  if (inv.piResultsCounter) {
    if (filtered.length === prods.length) {
      inv.piResultsCounter.textContent = `${prods.length} Products`;
    } else {
      inv.piResultsCounter.textContent = `Showing ${filtered.length} of ${prods.length} Products`;
    }
  }

  if (!inv.productsTableBody) return;

  if (!window.prodPagination && window.createTablePagination) {
    window.prodPagination = window.createTablePagination({
      container: '#viewProductInfo .table-container',
      tbody: inv.productsTableBody,
      emptyStateEl: inv.productsEmptyState,
      onRenderPage: (slice, startIdx) => {
        inv.productsTableBody.innerHTML = '';
        slice.forEach((p, idx) => {
          const globalSr = startIdx + idx + 1;
          const tr = document.createElement('tr');
          const menuId = `prodMenu_${p.id || p.code || globalSr}`;
          tr.innerHTML = `
            <td class="col-prod-sr font-num font-bold text-center">${globalSr}</td>
            <td class="col-prod-code font-num font-bold text-center"><span class="code-pill">${window.escapeHtml(p.code || '')}</span></td>
            <td class="col-prod-title font-bold text-left" title="${window.escapeHtml(p.titleEng || '')}">${window.escapeHtml(p.titleEng || '')}</td>
            <td class="col-prod-cat text-left" title="${window.escapeHtml(p.categoryName || '-')}">${window.escapeHtml(p.categoryName || '-')}</td>
            <td class="col-prod-unit text-center font-bold" title="${window.escapeHtml(p.unitName || p.packingType || '-')}">${window.escapeHtml(p.unitName || p.packingType || '-')}</td>
            <td class="col-prod-pack font-num text-center">${p.packSize || 1}</td>
            <td class="col-prod-pp font-num text-right">${Number(p.purchasePrice || 0).toFixed(2)}</td>
            <td class="col-prod-margin font-num text-success text-right font-bold">${Number(p.profitMargin || 0).toFixed(1)}%</td>
            <td class="col-prod-rp font-num font-bold text-warning text-right">${Number(p.retailPrice || 0).toFixed(2)}</td>
            <td class="col-prod-wp font-num font-bold text-right">${Number(p.wholesalePrice || 0).toFixed(2)}</td>
            <td class="col-prod-stock font-num font-bold text-accent text-center">${p.stockQty || 0}</td>
            <td class="col-prod-actions text-center" style="overflow: visible;">
              <div class="dots-wrapper">
                <button type="button" class="btn-dots btn-prod-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Product Actions">
                  <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                </button>
                <div id="${menuId}" class="action-menu hidden">
                  <button type="button" class="action-menu-item btn-action-edit">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Edit Product</span>
                  </button>
                  <button type="button" class="action-menu-item text-danger btn-action-del">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Delete Product</span>
                  </button>
                </div>
              </div>
            </td>
          `;

          tr.querySelector('.btn-action-edit')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.closeAllActionMenus) window.closeAllActionMenus();
            openEditProductModal(p);
          });

          tr.querySelector('.btn-action-del')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.closeAllActionMenus) window.closeAllActionMenus();
            confirmDeleteProduct(p);
          });

          tr.addEventListener('dblclick', () => {
            openEditProductModal(p);
          });

          inv.productsTableBody.appendChild(tr);
        });
      }
    });
  }

  if (window.prodPagination) {
    window.prodPagination.setItems(filtered, false);
  }
}

async function openAddProductModal() {
  await resetProductInfoForm();
  populateProductInfoDropdowns();
  if (inv.modalAddProduct) inv.modalAddProduct.classList.remove('hidden');
  if (inv.productModalTitle) inv.productModalTitle.textContent = 'Add Product';
  setTimeout(() => inv.piTitleEng?.focus(), 80);
}

function openEditProductModal(p) {
  loadProductRecord(p);
  populateProductInfoDropdowns();
  if (inv.piCategorySelect && p.categoryId) {
    inv.piCategorySelect.value = p.categoryId;
    updateProductSubCategoryDropdown();
  }
  if (inv.piSubCategorySelect && p.subCategoryId) {
    inv.piSubCategorySelect.value = p.subCategoryId;
  }
  if (inv.modalAddProduct) inv.modalAddProduct.classList.remove('hidden');
  if (inv.productModalTitle) inv.productModalTitle.textContent = `Edit Product #${p.code}`;
  setTimeout(() => inv.piTitleEng?.focus(), 80);
}

function closeAddProductModal() {
  if (inv.modalAddProduct) inv.modalAddProduct.classList.add('hidden');
}

function confirmDeleteProduct(p) {
  if (!p) return;
  window.openConfirmModal({
    title: 'Delete Product',
    message: `Are you sure you want to delete Product #${p.code} (${p.titleEng})?`,
    onConfirm: async () => {
      try {
        if (window.api?.deleteProduct) await window.api.deleteProduct(p.code);
        await window.reloadFromDatabase();
        renderProductsTable();
        if (window.showToast) {
          window.showToast(`Product #${p.code} deleted successfully!`, 'info');
        }
      } catch (e) {
        showAlert('Error deleting product: ' + e.message);
      }
    }
  });
}

if (inv.piCategorySelect) {
  inv.piCategorySelect.addEventListener('change', updateProductSubCategoryDropdown);
}

// Live Profit Margin % and Retail Price Auto-Math
function calcMarginFromRetail() {
  const purchase = Number(inv.piPurchasePrice?.value) || 0;
  const retail = Number(inv.piRetailPrice?.value) || 0;
  if (purchase > 0) {
    const margin = ((retail - purchase) / purchase) * 100;
    if (inv.piProfitMargin) inv.piProfitMargin.value = margin.toFixed(2);
  }
}

function calcRetailFromMargin() {
  const purchase = Number(inv.piPurchasePrice?.value) || 0;
  const margin = Number(inv.piProfitMargin?.value) || 0;
  if (purchase > 0) {
    const retail = purchase * (1 + (margin / 100));
    if (inv.piRetailPrice) inv.piRetailPrice.value = retail.toFixed(2);
  }
}

if (inv.piPurchasePrice) inv.piPurchasePrice.addEventListener('input', calcMarginFromRetail);
if (inv.piRetailPrice) inv.piRetailPrice.addEventListener('input', calcMarginFromRetail);
if (inv.piProfitMargin) inv.piProfitMargin.addEventListener('input', calcRetailFromMargin);

// Barcode Generator
if (inv.btnPiGenBarcode) {
  inv.btnPiGenBarcode.addEventListener('click', () => {
    const code = inv.piCode?.value.padStart(6, '0') || '000001';
    const rand = Math.floor(100000 + Math.random() * 900000);
    if (inv.piBarcode) inv.piBarcode.value = `890${code}${rand}`.substring(0, 12);
  });
}

let currentProductFormMode = 'new';
let currentEditingProductId = null;

function loadProductRecord(p) {
  if (!p) return;
  currentProductFormMode = 'edit';
  currentEditingProductId = p.id;
  if (inv.piFormModeBadge) {
    inv.piFormModeBadge.textContent = `Editing: #${p.code}`;
    inv.piFormModeBadge.className = 'badge-price-pill bg-warning-pill font-num font-bold';
  }
  if (inv.btnPiSaveText) inv.btnPiSaveText.textContent = 'Save Changes (Update)';

  if (inv.piCode) inv.piCode.value = p.code || '';
  if (inv.piBarcode) inv.piBarcode.value = p.barcode || '';
  if (inv.piAdditionalCode) inv.piAdditionalCode.value = p.additionalCode || '';
  if (inv.piCategorySelect) {
    inv.piCategorySelect.value = p.categoryId || '';
    updateProductSubCategoryDropdown();
  }
  if (inv.piSubCategorySelect) inv.piSubCategorySelect.value = p.subCategoryId || '';
  if (inv.piTitleEng) inv.piTitleEng.value = p.titleEng || '';
  if (inv.piTitleUrdu) inv.piTitleUrdu.value = p.titleUrdu || '';
  if (inv.piPackingType) inv.piPackingType.value = p.packingType || 'Piece';
  if (inv.piUnitSelect) inv.piUnitSelect.value = p.unitId || '';
  if (inv.piPackSize) inv.piPackSize.value = p.packSize || 1;
  if (inv.piPurchasePrice) inv.piPurchasePrice.value = Number(p.purchasePrice || 0).toFixed(2);
  if (inv.piProfitMargin) inv.piProfitMargin.value = Number(p.profitMargin || 0).toFixed(2);
  if (inv.piRetailPrice) inv.piRetailPrice.value = Number(p.retailPrice || 0).toFixed(2);
  if (inv.piWholesalePrice) inv.piWholesalePrice.value = Number(p.wholesalePrice || 0).toFixed(2);
  if (inv.piAverageCost) inv.piAverageCost.value = Number(p.averageCost || 0).toFixed(2);
  if (inv.piMinStock) inv.piMinStock.value = p.minStock || 0;
  if (inv.piReorderLevel) inv.piReorderLevel.value = p.reorderLevel || 0;
  if (inv.piStockQty) inv.piStockQty.value = p.stockQty || 0;
  if (inv.piLocation) inv.piLocation.value = p.location || '';
  if (inv.piTypeSelect) inv.piTypeSelect.value = p.productType || 'Both';
  if (inv.piTaxPercent) inv.piTaxPercent.value = p.taxPercent || 0;
  if (inv.piShortCode) inv.piShortCode.value = p.shortCode || '';
  if (inv.piShortLabel) inv.piShortLabel.value = p.shortLabel || '';
  if (inv.piDescription) inv.piDescription.value = p.description || '';
  if (inv.piBatchExpiry) inv.piBatchExpiry.checked = !!p.useBatchExpiry;
  if (inv.piLoosePackSize) inv.piLoosePackSize.checked = !!p.loosePackSize;
  if (inv.piInActive) inv.piInActive.checked = !!p.inActive;
}

async function resetProductInfoForm() {
  currentProductFormMode = 'new';
  currentEditingProductId = null;
  if (inv.productInfoForm) inv.productInfoForm.reset();
  let nextCode = '101';
  try {
    nextCode = window.api?.getNextProductCode ? await window.api.getNextProductCode() : '101';
  } catch (e) {
    nextCode = '101';
  }
  if (inv.piCode) inv.piCode.value = nextCode;
  if (inv.piPackSize) inv.piPackSize.value = 1;
  if (inv.piPurchasePrice) inv.piPurchasePrice.value = '0.00';
  if (inv.piProfitMargin) inv.piProfitMargin.value = '0.00';
  if (inv.piRetailPrice) inv.piRetailPrice.value = '0.00';
  if (inv.piWholesalePrice) inv.piWholesalePrice.value = '0.00';
  if (inv.piStockQty) inv.piStockQty.value = 0;
  if (inv.piFormModeBadge) {
    inv.piFormModeBadge.textContent = `New Product (#${nextCode})`;
    inv.piFormModeBadge.className = 'badge-price-pill bg-green-pill font-num font-bold';
  }
  if (inv.btnPiSaveText) inv.btnPiSaveText.textContent = '+ Save New Product';
  setTimeout(() => inv.piTitleEng?.focus(), 50);
}

async function saveProductRecord() {
  const title = inv.piTitleEng?.value.trim();
  if (!title) {
    showAlert('Please enter the Product Title!');
    inv.piTitleEng?.focus();
    return;
  }

  const catSelect = inv.piCategorySelect;
  const categoryName = catSelect?.options[catSelect.selectedIndex]?.text || '';
  const subSelect = inv.piSubCategorySelect;
  const subCategoryName = subSelect?.options[subSelect.selectedIndex]?.text || '';
  const unitSelect = inv.piUnitSelect;
  const unitName = unitSelect?.options[unitSelect.selectedIndex]?.text || '';

  const isNew = currentProductFormMode === 'new';
  const prod = {
    id: !isNew ? currentEditingProductId : undefined,
    isNew,
    code: inv.piCode?.value.trim(),
    barcode: inv.piBarcode?.value.trim() || '',
    additionalCode: inv.piAdditionalCode?.value.trim() || '',
    categoryId: inv.piCategorySelect?.value || '',
    categoryName,
    subCategoryId: inv.piSubCategorySelect?.value || '',
    subCategoryName,
    titleEng: title,
    titleUrdu: inv.piTitleUrdu?.value.trim() || '',
    packingType: inv.piPackingType?.value.trim() || 'Piece',
    unitId: inv.piUnitSelect?.value || '',
    unitName,
    packSize: Number(inv.piPackSize?.value) || 1,
    purchasePrice: Number(inv.piPurchasePrice?.value) || 0,
    profitMargin: Number(inv.piProfitMargin?.value) || 0,
    retailPrice: Number(inv.piRetailPrice?.value) || 0,
    wholesalePrice: Number(inv.piWholesalePrice?.value) || 0,
    averageCost: Number(inv.piAverageCost?.value) || 0,
    minStock: Number(inv.piMinStock?.value) || 0,
    reorderLevel: Number(inv.piReorderLevel?.value) || 0,
    stockQty: Number(inv.piStockQty?.value) || 0,
    location: inv.piLocation?.value.trim() || '',
    productType: inv.piTypeSelect?.value || 'Both',
    taxPercent: Number(inv.piTaxPercent?.value) || 0,
    shortCode: inv.piShortCode?.value.trim() || '',
    shortLabel: inv.piShortLabel?.value.trim() || '',
    description: inv.piDescription?.value.trim() || '',
    useBatchExpiry: inv.piBatchExpiry?.checked ? 1 : 0,
    loosePackSize: inv.piLoosePackSize?.checked ? 1 : 0,
    inActive: inv.piInActive?.checked ? 1 : 0
  };

  try {
    const res = window.api?.saveProduct ? await window.api.saveProduct(prod) : null;
    await window.reloadFromDatabase();
    renderProductsTable();
    closeAddProductModal();
    if (window.showToast) {
      window.showToast(`Product [${prod.code}] ${prod.titleEng} saved successfully!`, 'success');
    } else {
      showAlert(`Product [${prod.code}] ${prod.titleEng} saved successfully!`, 'Saved');
    }
  } catch (err) {
    console.error('Save product error:', err);
    showAlert('Error saving product: ' + err.message, 'Error');
  }
}

// Product Action Listeners (Top Bar & Modal)
if (inv.btnOpenAddProduct) inv.btnOpenAddProduct.addEventListener('click', openAddProductModal);
if (inv.btnCloseAddProductModal) inv.btnCloseAddProductModal.addEventListener('click', closeAddProductModal);
if (inv.btnCancelProductModal) inv.btnCancelProductModal.addEventListener('click', closeAddProductModal);
if (inv.piSearchInput) inv.piSearchInput.addEventListener('input', renderProductsTable);
if (inv.piCategoryFilter) {
  inv.piCategoryFilter.addEventListener('change', () => {
    updateProductTopSubCategoryFilter();
    renderProductsTable();
  });
}
if (inv.piSubCategoryFilter) inv.piSubCategoryFilter.addEventListener('change', renderProductsTable);
if (inv.piStockFilter) inv.piStockFilter.addEventListener('change', renderProductsTable);
if (inv.piSortFilter) inv.piSortFilter.addEventListener('change', renderProductsTable);
if (inv.btnPiResetFilters) {
  inv.btnPiResetFilters.addEventListener('click', () => {
    if (inv.piSearchInput) inv.piSearchInput.value = '';
    if (inv.piCategoryFilter) inv.piCategoryFilter.value = '';
    if (inv.piStockFilter) inv.piStockFilter.value = '';
    if (inv.piSortFilter) inv.piSortFilter.value = 'code_asc';
    updateProductTopSubCategoryFilter();
    renderProductsTable();
  });
}

if (inv.btnPiNew) inv.btnPiNew.addEventListener('click', openAddProductModal);
if (inv.btnPiSave) inv.btnPiSave.addEventListener('click', saveProductRecord);
if (inv.btnPiRefresh) inv.btnPiRefresh.addEventListener('click', resetProductInfoForm);
if (inv.btnPiClose) inv.btnPiClose.addEventListener('click', closeAddProductModal);
if (inv.btnPiDelete) {
  inv.btnPiDelete.addEventListener('click', () => {
    const code = inv.piCode?.value.trim();
    if (!code) return;
    window.openConfirmModal({
      title: 'Delete Product',
      message: `Are you sure you want to delete Product #${code}?`,
      onConfirm: async () => {
        try {
          if (window.api?.deleteProduct) await window.api.deleteProduct(code);
          await window.reloadFromDatabase();
          resetProductInfoForm();
        } catch (e) {
          showAlert('Error deleting product: ' + e.message);
        }
      }
    });
  });
}

if (inv.btnPiFirst) {
  inv.btnPiFirst.addEventListener('click', () => {
    const prods = window.appData?.products || [];
    if (prods.length > 0) {
      productNavIndex = 0;
      loadProductRecord(prods[0]);
    }
  });
}
if (inv.btnPiPrev) {
  inv.btnPiPrev.addEventListener('click', () => {
    const prods = window.appData?.products || [];
    if (prods.length > 0) {
      productNavIndex = Math.max(0, productNavIndex - 1);
      loadProductRecord(prods[productNavIndex]);
    }
  });
}
if (inv.btnPiNext) {
  inv.btnPiNext.addEventListener('click', () => {
    const prods = window.appData?.products || [];
    if (prods.length > 0) {
      productNavIndex = Math.min(prods.length - 1, productNavIndex + 1);
      loadProductRecord(prods[productNavIndex]);
    }
  });
}
if (inv.btnPiLast) {
  inv.btnPiLast.addEventListener('click', () => {
    const prods = window.appData?.products || [];
    if (prods.length > 0) {
      productNavIndex = prods.length - 1;
      loadProductRecord(prods[productNavIndex]);
    }
  });
}

// ========================================================
// GLOBAL F1 / QUICK PRODUCT SEARCH (DEDICATED WINDOW & FALLBACK MODAL)
// ========================================================
function openProductSearchModal() {
  if (window.findProductAPI?.openWindow) {
    window.findProductAPI.openWindow();
    return;
  }
  if (!inv.modalProductSearch) return;
  inv.modalProductSearch.classList.remove('hidden');
  renderF1ProductSearch();
  setTimeout(() => inv.f1SearchInput?.focus(), 50);
}

function closeProductSearchModal() {
  if (inv.modalProductSearch) inv.modalProductSearch.classList.add('hidden');
}

// Listener for product selected from the dedicated OS Find Product window
if (window.findProductAPI?.onProductSelected) {
  window.findProductAPI.onProductSelected((p) => {
    if (!p) return;
    const isInventoryActive = window.currentTab === 'inventory' ||
      (!window.currentTab && document.getElementById('inventoryView') && !document.getElementById('inventoryView').classList.contains('hidden'));

    if (isInventoryActive) {
      if (currentSubTab === 'purchase') {
        selectProductForPurchase(p);
      } else {
        switchSubTab('product-info');
        loadProductRecord(p);
      }
    }
  });
}

function renderF1ProductSearch() {
  const prods = window.appData?.products || [];
  const q = (inv.f1SearchInput?.value || '').trim().toLowerCase();
  const filtered = prods.filter(p =>
    !q ||
    String(p.code).toLowerCase().includes(q) ||
    p.titleEng.toLowerCase().includes(q) ||
    (p.categoryName || '').toLowerCase().includes(q) ||
    (p.groupName || '').toLowerCase().includes(q)
  );

  if (!inv.f1ProductTableBody) return;
  inv.f1ProductTableBody.innerHTML = '';

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td class="font-num font-bold text-center">${p.code}</td>
      <td class="font-bold">${window.escapeHtml(p.titleEng)}</td>
      <td class="font-num text-center">${p.packSize || 1}</td>
      <td class="font-num">${Number(p.purchasePrice || 0).toFixed(2)}</td>
      <td class="font-num text-warning font-bold">${Number(p.retailPrice || 0).toFixed(2)}</td>
      <td class="font-num font-bold">${Number(p.wholesalePrice || 0).toFixed(2)}</td>
      <td class="font-num text-accent font-bold text-center">${p.stockQty || 0}</td>
      <td>${window.escapeHtml(p.location || '-')}</td>
    `;
    tr.addEventListener('click', () => {
      if (window.currentTab === 'sale' && window.SalesModule?.selectProduct) {
        window.SalesModule.selectProduct(p);
      } else if (currentSubTab === 'purchase') {
        selectProductForPurchase(p);
      } else {
        switchSubTab('product-info');
        loadProductRecord(p);
      }
      closeProductSearchModal();
    });
    inv.f1ProductTableBody.appendChild(tr);
  });
}

if (inv.btnPiFind) inv.btnPiFind.addEventListener('click', openProductSearchModal);
if (inv.btnPieFind) inv.btnPieFind.addEventListener('click', openProductSearchModal);
if (inv.btnProductInfoList) inv.btnProductInfoList.addEventListener('click', openProductSearchModal);
if (inv.btnCloseProductSearch) inv.btnCloseProductSearch.addEventListener('click', closeProductSearchModal);
if (inv.f1SearchInput) inv.f1SearchInput.addEventListener('input', renderF1ProductSearch);

// Global F1 Hotkey Listener (Active only for Inventory or Sales views, never in Accounts)
window.addEventListener('keydown', (e) => {
  if (e.key === 'F1') {
    // If Accounts view is active, F1 belongs to Party Help Search
    const accountsView = document.getElementById('accountsView');
    if (accountsView && accountsView.classList.contains('active')) {
      return;
    }

    const generalInfoView = document.getElementById('generalInfoView');
    if (generalInfoView && generalInfoView.classList.contains('active')) {
      return;
    }

    const reportsView = document.getElementById('reportsView');
    if (reportsView && reportsView.classList.contains('active')) {
      return;
    }

    const inventoryView = document.getElementById('inventoryView');
    const isInvActive = inventoryView && inventoryView.classList.contains('active');

    if (isInvActive) {
      e.preventDefault();
      openProductSearchModal();
    }
  }
});

// Exports to window
window.renderUnits = renderUnits;
window.renderProductCategories = renderProductCategories;
window.renderProductSubCategories = renderProductSubCategories;
window.openEditUnit = openEditUnit;
window.confirmDeleteUnit = confirmDeleteUnit;
window.openEditCategory = openEditCategory;
window.confirmDeleteCategory = confirmDeleteCategory;
window.openEditSubCategory = openEditSubCategory;
window.confirmDeleteSubCategory = confirmDeleteSubCategory;
window.initPurchaseView = initPurchaseView;
window.initProductInfoView = initProductInfoView;
window.renderProductsTable = renderProductsTable;
window.openAddProductModal = openAddProductModal;
window.openEditProductModal = openEditProductModal;
window.populateProductInfoDropdowns = populateProductInfoDropdowns;
window.resetProductInfoForm = resetProductInfoForm;
window.removePurchaseLineItem = removePurchaseLineItem;
window.openProductSearchModal = openProductSearchModal;
window.closeProductSearchModal = closeProductSearchModal;



