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
