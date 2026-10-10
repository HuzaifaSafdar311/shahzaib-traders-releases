const { contextBridge, ipcRenderer } = require('electron');

// Expose Auth API for PIN login
contextBridge.exposeInMainWorld('authAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  loginSuccess: () => ipcRenderer.send('login-success')
});

// Expose Electron API for Inventory, Vendors, and Invoices
contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  addStock: (item) => ipcRenderer.invoke('add-stock', item),
  updateStock: (item) => ipcRenderer.invoke('update-stock', item),
  deleteStock: (id) => ipcRenderer.invoke('delete-stock', id),
  addVendor: (vendor) => ipcRenderer.invoke('add-vendor', vendor),
  updateVendor: (vendor) => ipcRenderer.invoke('update-vendor', vendor),
  deleteVendor: (id) => ipcRenderer.invoke('delete-vendor', id),
  exportCSV: (options) => ipcRenderer.invoke('export-csv', options),
  // Invoices
  getInvoices: () => ipcRenderer.invoke('get-invoices'),
  createInvoice: (invoice) => ipcRenderer.invoke('create-invoice', invoice),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id)
});
