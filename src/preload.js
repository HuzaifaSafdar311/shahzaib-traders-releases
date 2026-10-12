const { contextBridge, ipcRenderer } = require('electron');

// Expose Auth API for PIN login
contextBridge.exposeInMainWorld('authAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  loginSuccess: () => ipcRenderer.send('login-success')
});

// Expose Electron API for Inventory, Sub-modules, Vendors, and Exports
contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  addStock: (item) => ipcRenderer.invoke('add-stock', item),
  updateStock: (item) => ipcRenderer.invoke('update-stock', item),
  deleteStock: (id) => ipcRenderer.invoke('delete-stock', id),
  addVendor: (vendor) => ipcRenderer.invoke('add-vendor', vendor),
  updateVendor: (vendor) => ipcRenderer.invoke('update-vendor', vendor),
  deleteVendor: (id) => ipcRenderer.invoke('delete-vendor', id),

  // Units
  getUnits: () => ipcRenderer.invoke('get-units'),
  saveUnit: (unit) => ipcRenderer.invoke('save-unit', unit),
  deleteUnit: (id) => ipcRenderer.invoke('delete-unit', id),

  // Product Types
  getProductTypes: () => ipcRenderer.invoke('get-product-types'),
  saveProductType: (pt) => ipcRenderer.invoke('save-product-type', pt),
  deleteProductType: (id) => ipcRenderer.invoke('delete-product-type', id),

  // Product Groups
  getProductGroups: () => ipcRenderer.invoke('get-product-groups'),
  saveProductGroup: (pg) => ipcRenderer.invoke('save-product-group', pg),
  deleteProductGroup: (id) => ipcRenderer.invoke('delete-product-group', id),

  // Product Categories & Sub-Categories
  getProductCategories: () => ipcRenderer.invoke('get-product-categories'),
  saveProductCategory: (cat) => ipcRenderer.invoke('save-product-category', cat),
  deleteProductCategory: (id) => ipcRenderer.invoke('delete-product-category', id),
  getProductSubCategories: (catId) => ipcRenderer.invoke('get-product-sub-categories', catId),
  saveProductSubCategory: (sub) => ipcRenderer.invoke('save-product-sub-category', sub),
  deleteProductSubCategory: (id) => ipcRenderer.invoke('delete-product-sub-category', id),

  // Products (Product Info)
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProduct: (id) => ipcRenderer.invoke('get-product', id),
  getProductByCode: (code) => ipcRenderer.invoke('get-product-by-code', code),
  getNextProductCode: () => ipcRenderer.invoke('get-next-product-code'),
  saveProduct: (prod) => ipcRenderer.invoke('save-product', prod),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),

  // Purchases
  getPurchases: () => ipcRenderer.invoke('get-purchases'),
  getPurchase: (id) => ipcRenderer.invoke('get-purchase', id),
  getNextPurchaseVoucherNo: () => ipcRenderer.invoke('get-next-purchase-voucher-no'),
  savePurchase: (purchaseData, items) => ipcRenderer.invoke('save-purchase', purchaseData, items),
  deletePurchase: (id) => ipcRenderer.invoke('delete-purchase', id),

  // Exports
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),
  exportCSV: (data) => ipcRenderer.invoke('export-csv', data)
});

// Expose General Info API for Company Info, Province, Area, Party Type
contextBridge.exposeInMainWorld('generalInfoAPI', {
  getGeneralInfo: () => ipcRenderer.invoke('get-general-info'),
  saveCompanyInfo: (info) => ipcRenderer.invoke('save-company-info', info),
  addProvince: (p) => ipcRenderer.invoke('add-province', p),
  updateProvince: (p) => ipcRenderer.invoke('update-province', p),
  deleteProvince: (id) => ipcRenderer.invoke('delete-province', id),
  addArea: (a) => ipcRenderer.invoke('add-area', a),
  updateArea: (a) => ipcRenderer.invoke('update-area', a),
  deleteArea: (id) => ipcRenderer.invoke('delete-area', id),
  addPartyType: (pt) => ipcRenderer.invoke('add-party-type', pt),
  updatePartyType: (pt) => ipcRenderer.invoke('update-party-type', pt),
  deletePartyType: (id) => ipcRenderer.invoke('delete-party-type', id),
  getParties: () => ipcRenderer.invoke('get-parties'),
  addParty: (p) => ipcRenderer.invoke('add-party', p),
  updateParty: (p) => ipcRenderer.invoke('update-party', p),
  deleteParty: (id) => ipcRenderer.invoke('delete-party', id)
});

