const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Expose Auth API for PIN login and logout
contextBridge.exposeInMainWorld('authAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  loginSuccess: () => ipcRenderer.send('login-success'),
  logout: () => ipcRenderer.send('logout')
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
  updateProductPrices: (idOrCode, prices) => ipcRenderer.invoke('update-product-prices', idOrCode, prices),

  // Purchases (Vouchers)
  getPurchases: () => ipcRenderer.invoke('get-purchases'),
  getPurchase: (id) => ipcRenderer.invoke('get-purchase', id),
  getNextPurchaseVoucherNo: () => ipcRenderer.invoke('get-next-purchase-voucher-no'),
  savePurchase: (purchaseData, items) => ipcRenderer.invoke('save-purchase', purchaseData, items),
  deletePurchase: (id) => ipcRenderer.invoke('delete-purchase', id),

  // Sales (Vouchers)
  getSales: () => ipcRenderer.invoke('get-sales'),
  getSale: (id) => ipcRenderer.invoke('get-sale', id),
  getNextSaleVoucherNo: () => ipcRenderer.invoke('get-next-sale-voucher-no'),
  saveSale: (saleData, items) => ipcRenderer.invoke('save-sale', saleData, items),
  deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),

  // Sales Returns
  getSaleReturns: () => ipcRenderer.invoke('get-sale-returns'),
  getSaleReturn: (id) => ipcRenderer.invoke('get-sale-return', id),
  getNextSaleReturnNo: () => ipcRenderer.invoke('get-next-sale-return-no'),
  saveSaleReturn: (returnData, items) => ipcRenderer.invoke('save-sale-return', returnData, items),
  deleteSaleReturn: (id) => ipcRenderer.invoke('delete-sale-return', id),

  // Groups / Brands fallback for older UI
  getProductGroups: () => ipcRenderer.invoke('get-product-sub-categories'),

  // Exports
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),
  exportCSV: (data) => ipcRenderer.invoke('export-csv', data),
  openPath: (fullPath) => ipcRenderer.invoke('open-path', fullPath),

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  getAppVersion: () => ipcRenderer.invoke('updater:get-version')
});

// Dedicated Sales API Bridge
contextBridge.exposeInMainWorld('salesAPI', {
  getSales: () => ipcRenderer.invoke('get-sales'),
  getSale: (id) => ipcRenderer.invoke('get-sale', id),
  getNextVoucherNo: () => ipcRenderer.invoke('get-next-sale-voucher-no'),
  saveSale: (saleData, items) => ipcRenderer.invoke('save-sale', saleData, items),
  deleteSale: (id) => ipcRenderer.invoke('delete-sale', id)
});

// Dedicated Sales Return API Bridge
contextBridge.exposeInMainWorld('salesReturnAPI', {
  getReturns: () => ipcRenderer.invoke('get-sale-returns'),
  getReturn: (id) => ipcRenderer.invoke('get-sale-return', id),
  getNextReturnNo: () => ipcRenderer.invoke('get-next-sale-return-no'),
  saveReturn: (returnData, items) => ipcRenderer.invoke('save-sale-return', returnData, items),
  deleteReturn: (id) => ipcRenderer.invoke('delete-sale-return', id)
});

// Dedicated Accounts API Bridge (Cash Receipts, Cash Payments, Party Ledgers)
contextBridge.exposeInMainWorld('accountsAPI', {
  getAllVouchers: (filter) => ipcRenderer.invoke('get-accounts-vouchers', filter),
  getVoucher: (id) => ipcRenderer.invoke('get-accounts-voucher', id),
  getNextVoucherNo: (type) => ipcRenderer.invoke('get-next-accounts-voucher-no', type),
  saveVoucher: (voucherData) => ipcRenderer.invoke('save-accounts-voucher', voucherData),
  deleteVoucher: (id) => ipcRenderer.invoke('delete-accounts-voucher', id),
  getPartyLedger: (partyId, fromDate, toDate) => ipcRenderer.invoke('get-party-ledger', partyId, fromDate, toDate)
});

// Trade Features API (Expenses, Estimates / Kacha Bill, Warranty Claims, Day-End Cash Closing)
contextBridge.exposeInMainWorld('tradeFeaturesAPI', {
  // Expenses
  getExpenses: (filter) => ipcRenderer.invoke('get-expenses', filter),
  getNextExpenseVoucherNo: () => ipcRenderer.invoke('get-next-expense-voucher-no'),
  saveExpense: (data) => ipcRenderer.invoke('save-expense', data),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
  getChartOfAccounts: () => ipcRenderer.invoke('get-chart-of-accounts'),

  // Estimates / Kacha Bill
  getEstimates: () => ipcRenderer.invoke('get-estimates'),
  getEstimate: (id) => ipcRenderer.invoke('get-estimate', id),
  getNextEstimateNo: () => ipcRenderer.invoke('get-next-estimate-no'),
  saveEstimate: (data, items) => ipcRenderer.invoke('save-estimate', data, items),
  deleteEstimate: (id) => ipcRenderer.invoke('delete-estimate', id),

  // Claims
  getClaims: () => ipcRenderer.invoke('get-claims'),
  getNextClaimNo: () => ipcRenderer.invoke('get-next-claim-no'),
  saveClaim: (data) => ipcRenderer.invoke('save-claim', data),
  deleteClaim: (id) => ipcRenderer.invoke('delete-claim', id),

  // Day-End Closing
  getDailyClosingSummary: (date) => ipcRenderer.invoke('get-daily-closing-summary', date),
  getDayEndClosings: () => ipcRenderer.invoke('get-day-end-closings'),
  saveDayEndClosing: (data) => ipcRenderer.invoke('save-day-end-closing', data)
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
  getPartyTypes: () => ipcRenderer.invoke('get-party-types'),
  addPartyType: (pt) => ipcRenderer.invoke('add-party-type', pt),
  updatePartyType: (pt) => ipcRenderer.invoke('update-party-type', pt),
  deletePartyType: (id) => ipcRenderer.invoke('delete-party-type', id),
  getParties: () => ipcRenderer.invoke('get-parties'),
  addParty: (p) => ipcRenderer.invoke('add-party', p),
  updateParty: (p) => ipcRenderer.invoke('update-party', p),
  deleteParty: (id) => ipcRenderer.invoke('delete-party', id)
});
// Expose Find Product Window API for dedicated OS window
contextBridge.exposeInMainWorld('findProductAPI', {
  openWindow: (context) => ipcRenderer.send('open-find-product-window', context),
  closeWindow: () => ipcRenderer.send('close-find-product-window'),
  selectProduct: (product) => ipcRenderer.send('select-find-product', product),
  onProductSelected: (callback) => {
    ipcRenderer.on('product-selected-from-window', (_event, product) => callback(product));
  },
  onRefreshProducts: (callback) => {
    ipcRenderer.on('refresh-products', () => callback());
  }
});

// Expose Settings & Maintenance API
contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-app-settings', settings),
  getDbStats: () => ipcRenderer.invoke('get-db-stats'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: (filePath) => ipcRenderer.invoke('restore-database', filePath),
  optimizeDatabase: () => ipcRenderer.invoke('optimize-database'),
  openBackupsFolder: () => ipcRenderer.invoke('open-backups-folder'),
  changeAppPin: (currentPin, newPin) => ipcRenderer.invoke('change-app-pin', { currentPin, newPin }),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  exportAllDataJson: () => ipcRenderer.invoke('export-all-data-json'),
  clearAllLedgers: (pin) => ipcRenderer.invoke('clear-all-ledgers', pin)
});

// Expose Reports API
contextBridge.exposeInMainWorld('reportsAPI', {
  getReportsMasterData: () => ipcRenderer.invoke('get-reports-master-data')
});

// Expose Display & Font Zoom API
contextBridge.exposeInMainWorld('displayAPI', {
  setZoomFactor: (factor) => {
    try {
      webFrame.setZoomFactor(Number(factor));
    } catch (e) {
      console.warn('setZoomFactor error:', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch (_) {
      return 1.0;
    }
  }
});

// Expose Auto-Updater API
contextBridge.exposeInMainWorld('updaterAPI', {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  getAppVersion: () => ipcRenderer.invoke('updater:get-version'),
  onUpdateStatus: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on('updater:status', (_event, data) => callback(data));
    }
  }
});

