const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');

let mainWindow;

function getDbFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'inventory.db');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#ffffff',
    title: 'Inventory Management System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  // Initialize SQLite Database
  const dbPath = getDbFilePath();
  console.log('SQLite Database Path:', dbPath);
  db.initDatabase(dbPath);

  createWindow();

  // IPC Handlers backed by SQLite
  ipcMain.handle('get-data', async () => {
    return db.getAllData();
  });

  ipcMain.handle('save-data', async (event, data) => {
    return db.syncAllData(data);
  });

  ipcMain.handle('add-stock', async (event, item) => {
    return db.addStock(item);
  });

  ipcMain.handle('update-stock', async (event, item) => {
    return db.updateStock(item);
  });

  ipcMain.handle('delete-stock', async (event, id) => {
    return db.deleteStock(id);
  });

  ipcMain.handle('add-vendor', async (event, vendor) => {
    return db.addVendor(vendor);
  });

  ipcMain.handle('update-vendor', async (event, vendor) => {
    return db.updateVendor(vendor);
  });

  ipcMain.handle('delete-vendor', async (event, id) => {
    return db.deleteVendor(id);
  });

  ipcMain.handle('export-csv', async (event, { content, filename }) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export CSV',
      defaultPath: filename || 'inventory_export.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
