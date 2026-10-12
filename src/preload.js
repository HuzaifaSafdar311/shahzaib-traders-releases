const { contextBridge, ipcRenderer } = require('electron');

// Expose Auth API for PIN login
contextBridge.exposeInMainWorld('authAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  loginSuccess: () => ipcRenderer.send('login-success')
});

// Expose Electron API for Enterprise Inventory, Products, Purchases, and Exports
contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),

  // Units
  getUnits: () => ipcRenderer.invoke('get-units'),
  saveUnit: (unit) => ipcRenderer.invoke('save-unit', unit),
  deleteUnit: (id) => ipcRenderer.invoke('delete-unit', id),

  // Product Types
  getProductTypes: () => ipcRenderer.invoke('get-product-types'),
  saveProductType: (pt) => ipcRenderer.invoke('save-product-type', pt),
  deleteProductType: (id) => ipcRenderer.invoke('delete-product-type', id),

  // Product Categories & Sub-Categories
  getProductCategories: () => ipcRenderer.invoke('get-product-categories'),
  saveProductCategory: (cat) => ipcRenderer.invoke('save-product-category', cat),
  deleteProductCategory: (id) => ipcRenderer.invoke('delete-product-category', id),
  getProductSubCategories: (catId) => ipcRenderer.invoke('get-product-sub-categories', catId),
  saveProductSubCategory: (sub) => ipcRenderer.invoke('save-product-sub-category', sub),
  deleteProductSubCategory: (id) => ipcRenderer.invoke('delete-product-sub-category', id),

  // Products (Product Catalog)
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProduct: (id) => ipcRenderer.invoke('get-product', id),
  getProductByCode: (code) => ipcRenderer.invoke('get-product-by-code', code),
  getNextProductCode: () => ipcRenderer.invoke('get-next-product-code'),
  saveProduct: (prod) => ipcRenderer.invoke('save-product', prod),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),

  // Purchases (Vouchers)
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

// Expose General Info API for Company Info, Provinces, Areas, Party Types, and Parties
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
