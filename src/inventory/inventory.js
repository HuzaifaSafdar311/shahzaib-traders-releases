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

  // 2. Product Type
  productTypeTableBody: document.getElementById('productTypeTableBody'),
  productTypeEmptyState: document.getElementById('productTypeEmptyState'),
  productTypeSearchInput: document.getElementById('productTypeSearchInput'),
  btnClearProductTypeSearch: document.getElementById('btnClearProductTypeSearch'),
  btnOpenAddProductType: document.getElementById('btnOpenAddProductType'),
  modalProductType: document.getElementById('modalProductType'),
  modalProductTypeTitle: document.getElementById('modalProductTypeTitle'),
  productTypeForm: document.getElementById('productTypeForm'),
  productTypeId: document.getElementById('productTypeId'),
  productTypeNameInput: document.getElementById('productTypeNameInput'),
  productTypeDescInput: document.getElementById('productTypeDescInput'),
  btnCloseProductTypeModal: document.getElementById('btnCloseProductTypeModal'),
  btnCancelProductType: document.getElementById('btnCancelProductType'),

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

  // Line item entry
  pieCode: document.getElementById('pieCode'),
  btnPieFind: document.getElementById('btnPieFind'),
  pieProductSelect: document.getElementById('pieProductSelect'),
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

  // 7. Product Info Master
  btnProductInfoList: document.getElementById('btnProductInfoList'),
  productInfoForm: document.getElementById('productInfoForm'),
  piCode: document.getElementById('piCode'),
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
    'product-type': 'viewProductType',
    'product-category': 'viewProductCategory',
    'product-categories': 'viewProductCategory',
    'product-sub-category': 'viewProductSubCategory',
    'purchase': 'viewPurchase',
    'product-info': 'viewProductInfo',
    'stock': 'viewStock'
  };

  const targetId = viewMap[subtab] || 'viewUnitInfo';
  const allSubviews = document.querySelectorAll('.subview-section');
  allSubviews.forEach(section => {
    section.classList.toggle('active', section.id === targetId);
  });

  // Lifecycle updates for active view
  if (subtab === 'unit-info') renderUnits();
  if (subtab === 'product-type') renderProductTypes();
  if (subtab === 'product-category' || subtab === 'product-categories') renderProductCategories();
  if (subtab === 'product-sub-category') renderProductSubCategories();
  if (subtab === 'purchase') initPurchaseView();
  if (subtab === 'product-info') initProductInfoView();
  if (subtab === 'stock') initStockView();
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
function renderUnits() {
  const units = window.appData?.units || [];
  const q = (inv.unitSearchInput?.value || '').trim().toLowerCase();
  const filtered = units.filter(u => !q || u.name.toLowerCase().includes(q) || (u.symbol || '').toLowerCase().includes(q));

  if (!inv.unitTableBody) return;
  inv.unitTableBody.innerHTML = '';

  if (filtered.length === 0) {
    if (inv.unitEmptyState) inv.unitEmptyState.classList.remove('hidden');
    return;
  }
  if (inv.unitEmptyState) inv.unitEmptyState.classList.add('hidden');

  filtered.forEach((unit, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-unit-sr font-num" style="text-align: left; padding-left: 24px;">${idx + 1}</td>
      <td class="col-unit-name font-bold" style="text-align: left; padding-left: 16px;">${window.escapeHtml(unit.name)}</td>
      <td class="col-unit-symbol" style="text-align: center;"><span class="code-pill">${window.escapeHtml(unit.symbol || '-')}</span></td>
      <td class="col-unit-actions col-dots-actions text-center">
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

// ========================================================
// 2. PRODUCT TYPE MODULE
// ========================================================
function renderProductTypes() {
  const types = window.appData?.product_types || [];
  const q = (inv.productTypeSearchInput?.value || '').trim().toLowerCase();
  const filtered = types.filter(t => !q || t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));

  if (!inv.productTypeTableBody) return;
  inv.productTypeTableBody.innerHTML = '';

  if (filtered.length === 0) {
    if (inv.productTypeEmptyState) inv.productTypeEmptyState.classList.remove('hidden');
    return;
  }
  if (inv.productTypeEmptyState) inv.productTypeEmptyState.classList.add('hidden');

  filtered.forEach((type, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-pt-sr font-num" style="text-align: left; padding-left: 24px;">${idx + 1}</td>
      <td class="col-pt-name font-bold" style="text-align: left; padding-left: 16px;">${window.escapeHtml(type.name)}</td>
      <td class="col-pt-desc text-secondary" style="text-align: center;">${window.escapeHtml(type.description || '-')}</td>
      <td class="col-pt-actions col-dots-actions text-center">
        <div class="dots-wrapper">
          <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, 'ptMenu_${type.id}')" title="Actions">
            <svg class="dots-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
          <div id="ptMenu_${type.id}" class="action-menu hidden">
            <button type="button" class="action-menu-item" onclick="window.openEditProductType('${type.id}')">
              <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button type="button" class="action-menu-item text-danger" onclick="window.confirmDeleteProductType('${type.id}')">
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
    inv.productTypeTableBody.appendChild(tr);
  });
}

function openAddProductType() {
  if (inv.modalProductTypeTitle) inv.modalProductTypeTitle.textContent = 'Add Product Type';
  if (inv.productTypeId) inv.productTypeId.value = '';
  if (inv.productTypeNameInput) inv.productTypeNameInput.value = '';
  if (inv.productTypeDescInput) inv.productTypeDescInput.value = '';
  if (inv.modalProductType) inv.modalProductType.classList.remove('hidden');
}

function openEditProductType(id) {
  const item = (window.appData?.product_types || []).find(t => t.id === id);
  if (!item) return;
  if (inv.modalProductTypeTitle) inv.modalProductTypeTitle.textContent = 'Edit Product Type';
  if (inv.productTypeId) inv.productTypeId.value = item.id;
  if (inv.productTypeNameInput) inv.productTypeNameInput.value = item.name;
  if (inv.productTypeDescInput) inv.productTypeDescInput.value = item.description || '';
  if (inv.modalProductType) inv.modalProductType.classList.remove('hidden');
}

function closeProductTypeModal() {
  if (inv.modalProductType) inv.modalProductType.classList.add('hidden');
}

async function handleSaveProductType(e) {
  if (e) e.preventDefault();
  const name = inv.productTypeNameInput?.value.trim();
  if (!name) return;
  const item = {
    id: inv.productTypeId?.value || undefined,
    name,
    description: inv.productTypeDescInput?.value.trim() || ''
  };

  try {
    if (window.api?.saveProductType) await window.api.saveProductType(item);
    await window.reloadFromDatabase();
    closeProductTypeModal();
    renderProductTypes();
  } catch (err) {
    console.error('Save product type failed:', err);
  }
}

function confirmDeleteProductType(id) {
  window.openConfirmModal({
    title: 'Delete Product Type',
    message: 'Are you sure you want to delete this product type?',
    onConfirm: async () => {
      try {
        if (window.api?.deleteProductType) await window.api.deleteProductType(id);
        await window.reloadFromDatabase();
        renderProductTypes();
      } catch (err) {
        console.error('Delete product type failed:', err);
      }
    }
  });
}

if (inv.btnOpenAddProductType) inv.btnOpenAddProductType.addEventListener('click', openAddProductType);
if (inv.btnCloseProductTypeModal) inv.btnCloseProductTypeModal.addEventListener('click', closeProductTypeModal);
if (inv.btnCancelProductType) inv.btnCancelProductType.addEventListener('click', closeProductTypeModal);
if (inv.productTypeForm) inv.productTypeForm.addEventListener('submit', handleSaveProductType);
if (inv.productTypeSearchInput) inv.productTypeSearchInput.addEventListener('input', renderProductTypes);

// 3. PRODUCT CATEGORY MODULE
// ========================================================
function renderProductCategories() {
  const categories = window.appData?.product_categories || [];
  const allSubs = window.appData?.product_sub_categories || [];
  const q = (inv.categorySearchInput?.value || '').trim().toLowerCase();
  const filtered = categories.filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q));

  if (inv.badgeCategoryCount) inv.badgeCategoryCount.textContent = categories.length;
  if (!inv.categoryTableBody) return;
  inv.categoryTableBody.innerHTML = '';

  if (filtered.length === 0) {
    if (inv.categoryEmptyState) inv.categoryEmptyState.classList.remove('hidden');
    return;
  }
  if (inv.categoryEmptyState) inv.categoryEmptyState.classList.add('hidden');

  filtered.forEach((cat, idx) => {
    const subCount = allSubs.filter(s => s.categoryId === cat.id).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-cat-sr font-num" style="text-align: left; padding-left: 24px;">${idx + 1}</td>
      <td class="col-cat-name font-bold" style="text-align: left; padding-left: 16px;">${window.escapeHtml(cat.name)}</td>
      <td class="col-cat-code" style="text-align: center;"><span class="code-pill">${window.escapeHtml(cat.code || '-')}</span></td>
      <td class="col-cat-subs" style="text-align: center;"><span class="badge-tag">${subCount} Sub Categor${subCount === 1 ? 'y' : 'ies'}</span></td>
      <td class="col-cat-actions col-dots-actions text-center">
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
  inv.subCategoryTableBody.innerHTML = '';

  if (filtered.length === 0) {
    if (inv.subCategoryEmptyState) inv.subCategoryEmptyState.classList.remove('hidden');
    return;
  }
  if (inv.subCategoryEmptyState) inv.subCategoryEmptyState.classList.add('hidden');

  filtered.forEach((sub, idx) => {
    const parentCat = categories.find(c => c.id === sub.categoryId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-sub-sr font-num" style="text-align: left; padding-left: 24px;">${idx + 1}</td>
      <td class="col-sub-name font-bold" style="text-align: left; padding-left: 16px;">${window.escapeHtml(sub.name)}</td>
      <td class="col-sub-code" style="text-align: center;"><span class="code-pill">${window.escapeHtml(sub.code || '-')}</span></td>
      <td class="col-sub-parent" style="text-align: center;"><span class="badge-tag">${window.escapeHtml(parentCat?.name || '-')}</span></td>
      <td class="col-sub-actions col-dots-actions text-center">
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
if (inv.btnClearProductTypeSearch && inv.productTypeSearchInput) {
  inv.productTypeSearchInput.addEventListener('input', () => {
    inv.btnClearProductTypeSearch.classList.toggle('hidden', !inv.productTypeSearchInput.value);
  });
  inv.btnClearProductTypeSearch.addEventListener('click', () => {
    inv.productTypeSearchInput.value = '';
    inv.btnClearProductTypeSearch.classList.add('hidden');
    renderProductTypes();
  });
}
// ========================================================
// 5. PURCHASE VOUCHER MODULE (ENTERPRISE)
// ========================================================
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

    inv.purPartySelect.innerHTML = '<option value="">-- Please Select Supplier / Vendor --</option>' +
      listToUse.map(p => `<option value="${p.id}" data-contact="${window.escapeHtml(p.contactPerson || '')}" data-phone="${window.escapeHtml(p.phone || '')}" data-area="${window.escapeHtml(p.areaName || p.city || '')}">${window.escapeHtml(p.name)} [${window.escapeHtml(p.partyTypeName || 'Supplier')}]</option>`).join('');
  }

  // Populate Products Dropdown
  const prods = window.appData?.products || [];
  if (inv.pieProductSelect) {
    inv.pieProductSelect.innerHTML = '<option value="">-- Select Product --</option>' +
      prods.map(p => `<option value="${p.code}">${p.code} - ${window.escapeHtml(p.titleEng)}</option>`).join('');
  }

  // Set default entry date
  if (inv.purEntryDate && !inv.purEntryDate.value) {
    inv.purEntryDate.value = new Date().toISOString().split('T')[0];
  }

  // Fetch Next Voucher Number
  if (inv.purVoucherNo && !inv.purVoucherNo.value) {
    try {
      const vNo = window.api?.getNextPurchaseVoucherNo ? await window.api.getNextPurchaseVoucherNo() : '109';
      inv.purVoucherNo.value = vNo;
    } catch (e) {
      inv.purVoucherNo.value = '109';
    }
  }

  loadedPurchases = window.appData?.purchases || [];
  renderPurchaseLineItems();
}

// When Party dropdown changes, auto-fill contact person
if (inv.purPartySelect) {
  inv.purPartySelect.addEventListener('change', () => {
    const selected = inv.purPartySelect.options[inv.purPartySelect.selectedIndex];
    if (inv.purContactPerson) {
      inv.purContactPerson.value = selected?.dataset?.contact || '';
    }
  });
}

// Code and Product Dropdown Sync
function selectProductForPurchase(prod) {
  if (!prod) return;
  if (inv.pieCode) inv.pieCode.value = prod.code;
  if (inv.pieProductSelect) inv.pieProductSelect.value = prod.code;
  if (inv.pieTradePrice) inv.pieTradePrice.value = Number(prod.purchasePrice || 0).toFixed(2);
  if (inv.pieRetailPricePill) inv.pieRetailPricePill.textContent = Number(prod.retailPrice || 0).toFixed(2);
  if (inv.pieWholesalePricePill) inv.pieWholesalePricePill.textContent = Number(prod.wholesalePrice || 0).toFixed(2);
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
  // 1. Mandatory Party Selection Check (Legacy Validation popup)
  if (!inv.purPartySelect || !inv.purPartySelect.value) {
    showAlert('Please Select the Party Title!');
    inv.purPartySelect?.focus();
    return;
  }

  const code = inv.pieCode?.value.trim();
  const prod = (window.appData?.products || []).find(p => String(p.code).trim() === code);
  if (!prod) {
    showAlert('Please enter or select a valid product code!');
    inv.pieCode?.focus();
    return;
  }

  const pQty = Number(inv.piePackQty?.value) || 0;
  const uQty = Number(inv.pieUnitQty?.value) || 0;
  const bonus = Number(inv.pieBonus?.value) || 0;
  const tp = Number(inv.pieTradePrice?.value) || 0;
  const tradeOffer = Number(inv.pieTradeOffer?.value) || 0;
  const discPercent = Number(inv.pieDiscPercent?.value) || 0;

  if (pQty === 0 && uQty === 0 && bonus === 0) {
    showAlert('Please enter a quantity (P.Qty or U.Qty)!');
    inv.piePackQty?.focus();
    return;
  }

  // Calculate Net Amount
  const totalUnits = (pQty * (Number(prod.packSize) || 1)) + uQty;
  let rawAmount = totalUnits * tp;
  if (tradeOffer > 0) rawAmount -= tradeOffer;
  if (discPercent > 0) rawAmount -= (rawAmount * (discPercent / 100));
  const netAmount = Math.max(0, rawAmount);

  // Profit Margin %
  const rp = Number(prod.retailPrice) || 0;
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
    wholesalePrice: prod.wholesalePrice || 0,
    tradeOffer,
    discountPercent: discPercent,
    netAmount: netAmount.toFixed(2)
  };

  currentPurchaseItems.push(lineItem);
  renderPurchaseLineItems();

  // Reset entry line inputs
  if (inv.pieCode) inv.pieCode.value = '';
  if (inv.pieProductSelect) inv.pieProductSelect.value = '';
  if (inv.piePackQty) inv.piePackQty.value = 0;
  if (inv.pieUnitQty) inv.pieUnitQty.value = 0;
  if (inv.pieBonus) inv.pieBonus.value = 0;
  if (inv.pieTradePrice) inv.pieTradePrice.value = '0.00';
  if (inv.pieRetailPricePill) inv.pieRetailPricePill.textContent = '0.00';
  if (inv.pieWholesalePricePill) inv.pieWholesalePricePill.textContent = '0.00';
  if (inv.pieTradeOffer) inv.pieTradeOffer.value = '0.00';
  if (inv.pieDiscPercent) inv.pieDiscPercent.value = '0.0';
  inv.pieCode?.focus();
}

if (inv.btnAddPurchaseItem) inv.btnAddPurchaseItem.addEventListener('click', addPurchaseLineItem);

function removePurchaseLineItem(index) {
  currentPurchaseItems.splice(index, 1);
  currentPurchaseItems.forEach((item, i) => { item.srNo = i + 1; });
  renderPurchaseLineItems();
}

function renderPurchaseLineItems() {
  if (!inv.purchaseItemsTableBody) return;
  inv.purchaseItemsTableBody.innerHTML = '';

  if (currentPurchaseItems.length === 0) {
    if (inv.purchaseItemsEmptyState) inv.purchaseItemsEmptyState.classList.remove('hidden');
    calculatePurchaseBill();
    return;
  }
  if (inv.purchaseItemsEmptyState) inv.purchaseItemsEmptyState.classList.add('hidden');

  currentPurchaseItems.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-num text-center">${item.srNo}</td>
      <td class="font-num text-center">${window.escapeHtml(item.productCode)}</td>
      <td class="font-bold">${window.escapeHtml(item.productTitle)}</td>
      <td class="font-num">${item.packQty}</td>
      <td class="font-num">${item.unitQty}</td>
      <td class="font-num">${item.bonus}</td>
      <td class="font-num">${Number(item.tradePrice).toFixed(2)}</td>
      <td class="font-num text-success">${item.profitMargin}%</td>
      <td class="font-num">${Number(item.retailPrice).toFixed(2)}</td>
      <td class="font-num">${Number(item.wholesalePrice).toFixed(2)}</td>
      <td class="font-num">${Number(item.tradeOffer).toFixed(2)}</td>
      <td class="font-num">${item.discountPercent}%</td>
      <td class="font-num font-bold text-accent">${Number(item.netAmount).toFixed(2)}</td>
      <td>
        <button class="btn-icon-xs text-danger" onclick="removePurchaseLineItem(${idx})" title="Remove Line">✕</button>
      </td>
    `;
    inv.purchaseItemsTableBody.appendChild(tr);
  });

  calculatePurchaseBill();
}

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
      const vNo = window.api?.getNextPurchaseVoucherNo ? await window.api.getNextPurchaseVoucherNo() : '109';
      inv.purVoucherNo.value = vNo;
    } catch (e) {}
  }
  if (inv.purManualNo) inv.purManualNo.value = '';
  if (inv.purPartySelect) inv.purPartySelect.value = '';
  if (inv.purContactPerson) inv.purContactPerson.value = '';
  if (inv.purDescription) inv.purDescription.value = '';
  if (inv.purDiscount) inv.purDiscount.value = '0.00';
  if (inv.purFreightDisc) inv.purFreightDisc.value = '0.00';
  if (inv.purFreightExpn) inv.purFreightExpn.value = '0.00';
  if (inv.purSalesTax) inv.purSalesTax.value = '0.00';
  if (inv.purExtraCharges) inv.purExtraCharges.value = '0.00';
  renderPurchaseLineItems();
}

function loadPurchaseRecord(pur) {
  if (!pur) return;
  if (inv.purVoucherNo) inv.purVoucherNo.value = pur.voucherNo;
  if (inv.purManualNo) inv.purManualNo.value = pur.manualNo || '';
  if (inv.purEntryDate) inv.purEntryDate.value = pur.entryDate || '';
  if (inv.purPartySelect) inv.purPartySelect.value = pur.partyId || '';
  if (inv.purContactPerson) inv.purContactPerson.value = pur.contactPerson || '';
  if (inv.purDescription) inv.purDescription.value = pur.description || '';
  if (inv.purStoreTitle) inv.purStoreTitle.value = pur.storeTitle || 'Store';
  if (inv.purDueDate) inv.purDueDate.value = pur.dueDate || '';
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

if (inv.btnPurFirst) {
  inv.btnPurFirst.addEventListener('click', () => {
    const list = window.appData?.purchases || [];
    if (list.length > 0) {
      purchaseNavIndex = 0;
      loadPurchaseRecord(list[purchaseNavIndex]);
    }
  });
}
if (inv.btnPurPrev) {
  inv.btnPurPrev.addEventListener('click', () => {
    const list = window.appData?.purchases || [];
    if (list.length > 0) {
      purchaseNavIndex = Math.max(0, purchaseNavIndex - 1);
      loadPurchaseRecord(list[purchaseNavIndex]);
    }
  });
}
if (inv.btnPurNext) {
  inv.btnPurNext.addEventListener('click', () => {
    const list = window.appData?.purchases || [];
    if (list.length > 0) {
      purchaseNavIndex = Math.min(list.length - 1, purchaseNavIndex + 1);
      loadPurchaseRecord(list[purchaseNavIndex]);
    }
  });
}
if (inv.btnPurLast) {
  inv.btnPurLast.addEventListener('click', () => {
    const list = window.appData?.purchases || [];
    if (list.length > 0) {
      purchaseNavIndex = list.length - 1;
      loadPurchaseRecord(list[purchaseNavIndex]);
    }
  });
}

// ========================================================
// 7. PRODUCT INFO MASTER MODULE (LEGACY REPLICA)
// ========================================================
async function initProductInfoView() {
  populateProductInfoDropdowns();

  const prods = window.appData?.products || [];
  if (prods.length > 0 && productNavIndex === -1) {
    productNavIndex = 0;
    loadProductRecord(prods[0]);
  } else if (prods.length === 0) {
    resetProductInfoForm();
  }
}

function populateProductInfoDropdowns() {
  // Categories
  const cats = window.appData?.product_categories || [];
  if (inv.piCategorySelect) {
    inv.piCategorySelect.innerHTML = '<option value="">-- Select Category --</option>' +
      cats.map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('');
  }

  // Units
  const units = window.appData?.units || [];
  if (inv.piUnitSelect) {
    inv.piUnitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
      units.map(u => `<option value="${u.id}">${window.escapeHtml(u.name)} (${u.symbol || ''})</option>`).join('');
  }

  // Types
  const types = window.appData?.product_types || [];
  if (inv.piTypeSelect && types.length > 0) {
    inv.piTypeSelect.innerHTML = types.map(t => `<option value="${t.name}">${window.escapeHtml(t.name)}</option>`).join('');
  }

  updateProductSubCategoryDropdown();
}

function updateProductSubCategoryDropdown() {
  const catId = inv.piCategorySelect?.value;
  const subs = window.appData?.product_sub_categories || [];
  const filtered = catId ? subs.filter(s => s.categoryId === catId) : subs;

  if (inv.piSubCategorySelect) {
    inv.piSubCategorySelect.innerHTML = '<option value="">-- Select Sub Category --</option>' +
      filtered.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');
  }
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
    showAlert(`Product [${prod.code}] ${prod.titleEng} saved successfully!`, 'Saved');
    if (res && res.id) {
      currentProductFormMode = 'edit';
      currentEditingProductId = res.id;
      if (inv.piCode) inv.piCode.value = res.code || prod.code;
      if (inv.piFormModeBadge) {
        inv.piFormModeBadge.textContent = `Editing: #${res.code || prod.code}`;
        inv.piFormModeBadge.className = 'badge-price-pill bg-warning-pill font-num font-bold';
      }
      if (inv.btnPiSaveText) inv.btnPiSaveText.textContent = 'Save Changes (Update)';
    }
  } catch (err) {
    console.error('Save product error:', err);
    showAlert('Error saving product: ' + err.message, 'Error');
  }
}

// Product Action Dock Listeners
if (inv.btnPiNew) inv.btnPiNew.addEventListener('click', resetProductInfoForm);
if (inv.btnPiSave) inv.btnPiSave.addEventListener('click', saveProductRecord);
if (inv.btnPiRefresh) inv.btnPiRefresh.addEventListener('click', resetProductInfoForm);
if (inv.btnPiClose) inv.btnPiClose.addEventListener('click', resetProductInfoForm);
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
    if (window.currentTab === 'sale' && window.SalesModule?.selectProduct) {
      window.SalesModule.selectProduct(p);
    } else if (currentSubTab === 'purchase') {
      selectProductForPurchase(p);
    } else {
      switchSubTab('product-info');
      loadProductRecord(p);
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
    const salesView = document.getElementById('salesView');
    const isInvActive = inventoryView && inventoryView.classList.contains('active');
    const isSalesActive = salesView && salesView.classList.contains('active');

    if (isInvActive || isSalesActive) {
      e.preventDefault();
      openProductSearchModal();
    }
  }
});

// ========================================================
// STOCK CATALOG & LIVE INVENTORY SECTION
// ========================================================
let stockCatalogProducts = [];
let filteredStockCatalog = [];
let isStockViewInitialized = false;

async function initStockView(forceRefresh = false) {
  const viewStock = document.getElementById('viewStock');
  if (!viewStock) return;

  try {
    // 1. Fetch live products from backend
    if (window.electronAPI?.getProducts) {
      stockCatalogProducts = await window.electronAPI.getProducts();
    } else if (window.appData?.products) {
      stockCatalogProducts = window.appData.products;
    } else {
      stockCatalogProducts = [];
    }
  } catch (err) {
    console.error('Failed to load stock products:', err);
    stockCatalogProducts = window.appData?.products || [];
  }

  // Ensure numeric properties and parsed group names
  stockCatalogProducts = (stockCatalogProducts || []).map(p => {
    const stockQty = Number(p.stockQty) || 0;
    const purchasePrice = Number(p.purchasePrice) || 0;
    const wholesalePrice = Number(p.wholesalePrice) || 0;
    const retailPrice = Number(p.retailPrice) || 0;
    let group = p.groupName || '';
    if (!group && p.description && p.description.includes('Group:')) {
      group = p.description.replace(/^Group:\s*/i, '').trim();
    }
    return {
      ...p,
      stockQty,
      purchasePrice,
      wholesalePrice,
      retailPrice,
      groupName: group,
      costValuation: stockQty * purchasePrice,
      retailValuation: stockQty * retailPrice
    };
  });

  // 2. Populate Dropdowns (Categories and Groups)
  populateStockFilters();

  // 3. Update KPI Summary Cards
  updateStockKPIs();

  // 4. Bind event listeners (once)
  if (!isStockViewInitialized) {
    bindStockEventListeners();
    isStockViewInitialized = true;
  }

  // 5. Apply filters and render
  applyStockFilters();
}

function populateStockFilters() {
  const catSelect = document.getElementById('stockCategoryFilter');
  const grpSelect = document.getElementById('stockGroupFilter');

  if (catSelect) {
    const currentCat = catSelect.value;
    const uniqueCats = [...new Set(stockCatalogProducts.map(p => (p.categoryName || '').trim()).filter(Boolean))].sort();
    catSelect.innerHTML = `<option value="">All Categories (${uniqueCats.length})</option>` +
      uniqueCats.map(c => `<option value="${window.escapeHtml(c)}" ${c === currentCat ? 'selected' : ''}>${window.escapeHtml(c)}</option>`).join('');
  }

  if (grpSelect) {
    const currentGrp = grpSelect.value;
    const uniqueGrps = [...new Set(stockCatalogProducts.map(p => (p.groupName || '').trim()).filter(Boolean))].sort();
    grpSelect.innerHTML = `<option value="">All Groups (${uniqueGrps.length})</option>` +
      uniqueGrps.map(g => `<option value="${window.escapeHtml(g)}" ${g === currentGrp ? 'selected' : ''}>${window.escapeHtml(g)}</option>`).join('');
  }
}

function updateStockKPIs() {
  const totalItems = stockCatalogProducts.length;
  const uniqueCats = new Set(stockCatalogProducts.map(p => p.categoryName).filter(Boolean)).size;
  const totalPieces = stockCatalogProducts.reduce((acc, p) => acc + (p.stockQty || 0), 0);
  const totalCostVal = stockCatalogProducts.reduce((acc, p) => acc + (p.costValuation || 0), 0);
  const totalRetailVal = stockCatalogProducts.reduce((acc, p) => acc + (p.retailValuation || 0), 0);
  const profitMarginVal = totalRetailVal - totalCostVal;

  const elItems = document.getElementById('stockKpiTotalItems');
  const elCats = document.getElementById('stockKpiCategories');
  const elPieces = document.getElementById('stockKpiTotalPieces');
  const elCost = document.getElementById('stockKpiCostVal');
  const elRetail = document.getElementById('stockKpiRetailVal');
  const elProfit = document.getElementById('stockKpiProfit');
  const badgeStock = document.getElementById('badgeStockCount');

  if (elItems) elItems.textContent = totalItems.toLocaleString();
  if (elCats) elCats.textContent = `${uniqueCats} Active Categories`;
  if (elPieces) elPieces.textContent = totalPieces.toLocaleString();
  if (elCost) elCost.textContent = `Rs. ${Math.round(totalCostVal).toLocaleString()}`;
  if (elRetail) elRetail.textContent = `Rs. ${Math.round(totalRetailVal).toLocaleString()}`;
  if (elProfit) elProfit.textContent = `Est. Margin: Rs. ${Math.round(profitMarginVal).toLocaleString()}`;
  if (badgeStock) badgeStock.textContent = totalItems;
}

function applyStockFilters() {
  const searchInput = document.getElementById('stockSearchInput');
  const btnClear = document.getElementById('btnClearStockSearch');
  const catSelect = document.getElementById('stockCategoryFilter');
  const grpSelect = document.getElementById('stockGroupFilter');
  const statusSelect = document.getElementById('stockStatusFilter');
  const sortSelect = document.getElementById('stockSortFilter');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedCat = catSelect?.value || '';
  const selectedGrp = grpSelect?.value || '';
  const selectedStatus = statusSelect?.value || '';
  const selectedSort = sortSelect?.value || 'code-asc';

  if (btnClear) {
    btnClear.classList.toggle('hidden', query.length === 0);
  }

  filteredStockCatalog = stockCatalogProducts.filter(p => {
    // Category filter
    if (selectedCat && (p.categoryName || '') !== selectedCat) return false;

    // Group filter
    if (selectedGrp && (p.groupName || '') !== selectedGrp) return false;

    // Stock Status filter
    if (selectedStatus === 'in-stock' && p.stockQty <= 10) return false;
    if (selectedStatus === 'low-stock' && (p.stockQty <= 0 || p.stockQty > 10)) return false;
    if (selectedStatus === 'zero-stock' && p.stockQty > 0) return false;

    // Search query
    if (query) {
      const matchCode = String(p.code || '').toLowerCase().includes(query);
      const matchTitle = (p.titleEng || '').toLowerCase().includes(query);
      const matchCategory = (p.categoryName || '').toLowerCase().includes(query);
      const matchGroup = (p.groupName || '').toLowerCase().includes(query);
      const matchDesc = (p.description || '').toLowerCase().includes(query);
      if (!matchCode && !matchTitle && !matchCategory && !matchGroup && !matchDesc) return false;
    }

    return true;
  });

  // Sorting
  filteredStockCatalog.sort((a, b) => {
    if (selectedSort === 'code-asc') {
      const numA = parseInt(a.code, 10);
      const numB = parseInt(b.code, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.code || '').localeCompare(String(b.code || ''));
    }
    if (selectedSort === 'name-asc') {
      return (a.titleEng || '').localeCompare(b.titleEng || '');
    }
    if (selectedSort === 'stock-desc') {
      return (b.stockQty || 0) - (a.stockQty || 0);
    }
    if (selectedSort === 'price-desc') {
      return (b.retailPrice || 0) - (a.retailPrice || 0);
    }
    return 0;
  });

  renderStockTable();
}

function renderStockTable() {
  const tbody = document.getElementById('stockTableBody');
  const tfoot = document.getElementById('stockTableFoot');
  const emptyState = document.getElementById('stockEmptyState');
  const footerSummary = document.getElementById('stockFooterSummary');
  const footerValuation = document.getElementById('stockFooterValuation');

  if (!tbody) return;

  if (filteredStockCatalog.length === 0) {
    tbody.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (footerSummary) footerSummary.textContent = `Showing 0 of ${stockCatalogProducts.length} products`;
    if (footerValuation) footerValuation.textContent = 'Total Pieces: 0';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  let totalFilteredPieces = 0;
  let totalFilteredCostVal = 0;
  let totalFilteredRetailVal = 0;

  const rowsHtml = filteredStockCatalog.map((p, idx) => {
    totalFilteredPieces += p.stockQty;
    totalFilteredCostVal += p.costValuation;
    totalFilteredRetailVal += p.retailValuation;

    const statusClass = p.stockQty > 10 ? 'in-stock' : p.stockQty > 0 ? 'low-stock' : 'out-stock';
    const statusLabel = p.stockQty > 10 ? 'In Stock' : p.stockQty > 0 ? 'Low Stock' : 'Out';
    const qtyCellClass = p.stockQty > 10 ? '' : p.stockQty > 0 ? 'low' : 'zero';

    return `
      <tr>
        <td class="font-num text-center text-muted" style="font-size: 0.8rem;">${idx + 1}</td>
        <td class="text-center font-num">
          <span class="stock-code-pill font-bold">${window.escapeHtml(p.code || '-')}</span>
        </td>
        <td style="padding-left: 12px;">
          <div class="stock-prod-title font-bold">${window.escapeHtml(p.titleEng || '-')}</div>
          ${p.groupName ? `<div class="stock-prod-sub">${window.escapeHtml(p.groupName)}</div>` : ''}
        </td>
        <td>
          <span class="stock-category-badge">${window.escapeHtml(p.categoryName || '-')}</span>
        </td>
        <td class="text-center" style="font-size: 0.82rem; color: #475569;">
          ${window.escapeHtml(p.unitName || 'Piece')}${p.packSize > 1 ? ` <span style="font-size: 0.72rem; color: #64748b;">(${p.packSize})</span>` : ''}
        </td>
        <td class="text-center">
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span class="stock-qty-cell ${qtyCellClass} font-num">${p.stockQty.toLocaleString()}</span>
            <span class="stock-status-pill ${statusClass}">${statusLabel}</span>
          </div>
        </td>
        <td class="text-right font-num" style="color: #475569;">
          Rs. ${p.purchasePrice.toLocaleString()}
        </td>
        <td class="text-right font-num" style="color: #475569;">
          Rs. ${p.wholesalePrice.toLocaleString()}
        </td>
        <td class="text-right font-num font-bold text-accent">
          Rs. ${p.retailPrice.toLocaleString()}
        </td>
        <td class="text-right font-num font-bold" style="color: #0284c7; padding-right: 14px;">
          Rs. ${p.retailValuation.toLocaleString()}
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: right; font-weight: 700; padding: 10px 14px; color: #1e293b;">
          Total Summary (${filteredStockCatalog.length} Products):
        </td>
        <td style="text-align: center; font-weight: 800;" class="font-num">
          <span style="color: #059669; font-size: 0.95rem;">${totalFilteredPieces.toLocaleString()} pcs</span>
        </td>
        <td colspan="3" style="text-align: right; font-weight: 600; color: #64748b;">
          Total Valuation (Retail):
        </td>
        <td style="text-align: right; font-weight: 800; color: #0284c7; font-size: 0.95rem; padding-right: 14px;" class="font-num">
          Rs. ${Math.round(totalFilteredRetailVal).toLocaleString()}
        </td>
      </tr>
    `;
  }

  if (footerSummary) {
    footerSummary.textContent = `Showing ${filteredStockCatalog.length} of ${stockCatalogProducts.length} products`;
  }
  if (footerValuation) {
    footerValuation.textContent = `Pieces: ${totalFilteredPieces.toLocaleString()} | Cost: Rs. ${Math.round(totalFilteredCostVal).toLocaleString()} | Retail: Rs. ${Math.round(totalFilteredRetailVal).toLocaleString()}`;
  }
}

function bindStockEventListeners() {
  const searchInput = document.getElementById('stockSearchInput');
  const btnClear = document.getElementById('btnClearStockSearch');
  const catSelect = document.getElementById('stockCategoryFilter');
  const grpSelect = document.getElementById('stockGroupFilter');
  const statusSelect = document.getElementById('stockStatusFilter');
  const sortSelect = document.getElementById('stockSortFilter');
  const btnRefresh = document.getElementById('btnStockRefresh');
  const btnExport = document.getElementById('btnStockExportExcel');
  const btnPrint = document.getElementById('btnStockPrint');

  if (searchInput) {
    searchInput.addEventListener('input', applyStockFilters);
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      applyStockFilters();
    });
  }

  if (catSelect) catSelect.addEventListener('change', applyStockFilters);
  if (grpSelect) grpSelect.addEventListener('change', applyStockFilters);
  if (statusSelect) statusSelect.addEventListener('change', applyStockFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyStockFilters);

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      try {
        await initStockView(true);
      } finally {
        btnRefresh.disabled = false;
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', exportStockToExcel);
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', printStockCatalog);
  }
}

function exportStockToExcel() {
  const itemsToExport = filteredStockCatalog.length > 0 ? filteredStockCatalog : stockCatalogProducts;
  if (!itemsToExport || itemsToExport.length === 0) {
    alert('No stock data available to export.');
    return;
  }

  const headers = [
    'SR #',
    'Product Code',
    'Product Title',
    'Group / Brand',
    'Category',
    'Unit',
    'Pack Size',
    'Pieces in Stock',
    'Purchase Price (PKR)',
    'Wholesale Price (PKR)',
    'Retail Price (PKR)',
    'Cost Valuation (PKR)',
    'Retail Valuation (PKR)',
    'Stock Status'
  ];

  const csvRows = [headers.join(',')];

  itemsToExport.forEach((p, idx) => {
    const status = p.stockQty > 10 ? 'In Stock' : p.stockQty > 0 ? 'Low Stock' : 'Out of Stock';
    const row = [
      idx + 1,
      `"${String(p.code || '').replace(/"/g, '""')}"`,
      `"${String(p.titleEng || '').replace(/"/g, '""')}"`,
      `"${String(p.groupName || '').replace(/"/g, '""')}"`,
      `"${String(p.categoryName || '').replace(/"/g, '""')}"`,
      `"${String(p.unitName || 'Piece').replace(/"/g, '""')}"`,
      p.packSize || 1,
      p.stockQty,
      p.purchasePrice,
      p.wholesalePrice,
      p.retailPrice,
      p.costValuation,
      p.retailValuation,
      `"${status}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Shahzaib_Traders_Stock_Catalog_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printStockCatalog() {
  const itemsToPrint = filteredStockCatalog.length > 0 ? filteredStockCatalog : stockCatalogProducts;
  const printArea = document.getElementById('stockPrintArea');
  if (!printArea) return;

  const totalPieces = itemsToPrint.reduce((acc, p) => acc + (p.stockQty || 0), 0);
  const totalCost = itemsToPrint.reduce((acc, p) => acc + (p.costValuation || 0), 0);
  const totalRetail = itemsToPrint.reduce((acc, p) => acc + (p.retailValuation || 0), 0);
  const now = new Date().toLocaleString('en-PK');

  let tableRows = itemsToPrint.map((p, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px;">${idx + 1}</td>
      <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 4px;">${window.escapeHtml(p.code || '-')}</td>
      <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">
        <div style="font-weight: 600;">${window.escapeHtml(p.titleEng || '-')}</div>
        ${p.groupName ? `<div style="font-size: 9px; color: #64748b;">${window.escapeHtml(p.groupName)}</div>` : ''}
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${window.escapeHtml(p.categoryName || '-')}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px;">${window.escapeHtml(p.unitName || 'Pc')}</td>
      <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 4px;">${p.stockQty.toLocaleString()}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 4px 6px;">Rs. ${p.purchasePrice.toLocaleString()}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 4px 6px;">Rs. ${p.wholesalePrice.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 600; border: 1px solid #cbd5e1; padding: 4px 6px;">Rs. ${p.retailPrice.toLocaleString()}</td>
      <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 4px 6px;">Rs. ${p.retailValuation.toLocaleString()}</td>
    </tr>
  `).join('');

  printArea.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 10px;">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Shahzaib Traders</h1>
        <p style="margin: 2px 0 0; font-size: 11px; color: #475569;">Warehouse Stock Catalog & Valuation Report</p>
        <p style="margin: 2px 0 0; font-size: 10px; color: #64748b;">Generated on: ${now} | Showing ${itemsToPrint.length} Products</p>
      </div>

      <div style="display: flex; justify-content: space-between; background: #f1f5f9; padding: 8px 12px; margin-bottom: 12px; border-radius: 4px; font-size: 11px;">
        <div><strong>Total Products:</strong> ${itemsToPrint.length}</div>
        <div><strong>Total Pieces in Stock:</strong> ${totalPieces.toLocaleString()} pcs</div>
        <div><strong>Total Cost Valuation:</strong> Rs. ${Math.round(totalCost).toLocaleString()}</div>
        <div><strong>Total Retail Valuation:</strong> Rs. ${Math.round(totalRetail).toLocaleString()}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="width: 4%; border: 1px solid #cbd5e1; padding: 5px;">SR#</th>
            <th style="width: 7%; border: 1px solid #cbd5e1; padding: 5px;">Code</th>
            <th style="width: 29%; border: 1px solid #cbd5e1; padding: 5px; text-align: left;">Product Title & Details</th>
            <th style="width: 14%; border: 1px solid #cbd5e1; padding: 5px; text-align: left;">Category</th>
            <th style="width: 6%; border: 1px solid #cbd5e1; padding: 5px;">Unit</th>
            <th style="width: 8%; border: 1px solid #cbd5e1; padding: 5px;">Stock Pcs</th>
            <th style="width: 8%; border: 1px solid #cbd5e1; padding: 5px; text-align: right;">Pur. Rate</th>
            <th style="width: 8%; border: 1px solid #cbd5e1; padding: 5px; text-align: right;">W.S. Rate</th>
            <th style="width: 8%; border: 1px solid #cbd5e1; padding: 5px; text-align: right;">Retail Rate</th>
            <th style="width: 8%; border: 1px solid #cbd5e1; padding: 5px; text-align: right;">Total Retail</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; font-weight: bold;">
            <td colspan="5" style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Grand Total:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${totalPieces.toLocaleString()}</td>
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Retail Valuation:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Rs. ${Math.round(totalRetail).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  window.print();
}

// Exports to window
window.renderUnits = renderUnits;
window.renderProductTypes = renderProductTypes;
window.renderProductCategories = renderProductCategories;
window.renderProductSubCategories = renderProductSubCategories;
window.openEditUnit = openEditUnit;
window.confirmDeleteUnit = confirmDeleteUnit;
window.openEditProductType = openEditProductType;
window.confirmDeleteProductType = confirmDeleteProductType;
window.openEditCategory = openEditCategory;
window.confirmDeleteCategory = confirmDeleteCategory;
window.openEditSubCategory = openEditSubCategory;
window.confirmDeleteSubCategory = confirmDeleteSubCategory;
window.initPurchaseView = initPurchaseView;
window.populateProductInfoDropdowns = populateProductInfoDropdowns;
window.resetProductInfoForm = resetProductInfoForm;
window.removePurchaseLineItem = removePurchaseLineItem;
window.openProductSearchModal = openProductSearchModal;
window.closeProductSearchModal = closeProductSearchModal;
window.initStockView = initStockView;
window.renderStockView = initStockView;


