const { contextBridge, ipcRenderer } = require('electron');

// Expose Auth API for PIN login
contextBridge.exposeInMainWorld('authAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  loginSuccess: () => ipcRenderer.send('login-success')
});

// Expose Electron API for Inventory, Vendors, and Exports
contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  addStock: (item) => ipcRenderer.invoke('add-stock', item),
  updateStock: (item) => ipcRenderer.invoke('update-stock', item),
  deleteStock: (id) => ipcRenderer.invoke('delete-stock', id),
  addVendor: (vendor) => ipcRenderer.invoke('add-vendor', vendor),
  updateVendor: (vendor) => ipcRenderer.invoke('update-vendor', vendor),
  deleteVendor: (id) => ipcRenderer.invoke('delete-vendor', id),

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
  deletePartyType: (id) => ipcRenderer.invoke('delete-party-type', id)
});

