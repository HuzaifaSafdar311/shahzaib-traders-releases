const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const db = require('./db');

// Load environment variables (.env) safely based on app packaging state
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

let mainWindow;

function getDbFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'inventory.db');
}

// Timing-safe PIN verification against process.env.APP_PIN
function verifyPin(inputPin) {
  if (typeof inputPin !== 'string' && typeof inputPin !== 'number') {
    return false;
  }
  const cleanInput = String(inputPin).trim();
  const configuredPin = String(process.env.APP_PIN || '1996').trim();

  const expectedHash = crypto.createHash('sha256').update(configuredPin).digest();
  const inputHash = crypto.createHash('sha256').update(cleanInput).digest();

  try {
    return crypto.timingSafeEqual(expectedHash, inputHash);
  } catch (err) {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 620,
    center: true,
    backgroundColor: '#0d0d0d',
    title: 'Shahzaib Traders - Inventory Management System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.removeMenu();

  // 1. Play splash animation
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // 2. Transition to login screen after splash finishes
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile(path.join(__dirname, 'login.html'));
    }
  }, 4800);
}

app.whenReady().then(() => {
  // Initialize SQLite Database
  const dbPath = getDbFilePath();
  console.log('SQLite Database Path:', dbPath);
  db.initDatabase(dbPath);

  createWindow();

  // ============================================
  // AUTHENTICATION IPC HANDLERS
  // ============================================
  ipcMain.handle('verify-pin', async (_event, pin) => {
    return verifyPin(pin);
  });

  ipcMain.on('login-success', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }
  });

  // ============================================
  // INVENTORY & VENDOR IPC HANDLERS
  // ============================================
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

  // ============================================
  // INVOICE IPC HANDLERS
  // ============================================
  ipcMain.handle('get-invoices', async () => {
    return db.getAllInvoices();
  });

  ipcMain.handle('create-invoice', async (event, invoice) => {
    return db.createInvoice(invoice);
  });

  ipcMain.handle('delete-invoice', async (event, id) => {
    return db.deleteInvoice(id);
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
