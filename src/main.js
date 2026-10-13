const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const db = require('./database/db');
const exporter = require('./export/exporter');

// Load environment variables (.env) safely based on app packaging state
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Prevent GPU/disk cache collision errors on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Ensure only one instance of the app runs at a time
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;
let findProductWindow = null;

function openFindProductWindow() {
  if (findProductWindow && !findProductWindow.isDestroyed()) {
    if (findProductWindow.isMinimized()) findProductWindow.restore();
    findProductWindow.focus();
    findProductWindow.webContents.send('refresh-products');
    return;
  }

  const iconPath = fs.existsSync(path.join(__dirname, 'assets', 'circle-logo.png'))
    ? path.join(__dirname, 'assets', 'circle-logo.png')
    : path.join(__dirname, 'circle-logo.png');

  findProductWindow = new BrowserWindow({
    width: 1260,
    height: 780,
    minWidth: 920,
    minHeight: 560,
    center: true,
    backgroundColor: '#ffffff',
    title: 'Find Product (F1) - Shahzaib Traders',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  findProductWindow.removeMenu();

  findProductWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      findProductWindow.reload();
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      findProductWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'Escape') {
      findProductWindow.close();
      event.preventDefault();
    }
  });

  findProductWindow.loadFile(path.join(__dirname, 'find-product', 'find-product.html'));

  findProductWindow.on('closed', () => {
    findProductWindow = null;
  });
}

function getDbFilePath() {
  if (app.isPackaged) {
    const userDataDir = app.getPath('userData');
    return path.join(userDataDir, 'inventory.db');
  }
  // When running locally in development, use the project root database
  const localDb = path.join(__dirname, '..', 'inventory.db');
  return localDb;
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
  const iconPath = fs.existsSync(path.join(__dirname, 'assets', 'circle-logo.png'))
    ? path.join(__dirname, 'assets', 'circle-logo.png')
    : path.join(__dirname, 'circle-logo.png');
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 620,
    center: true,
    backgroundColor: '#0d0d0d',
    title: 'Shahzaib Traders - Inventory Management System',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.removeMenu();

  // Hotkey support for quick reload (Ctrl+R / F5) and DevTools (Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // 1. Play splash animation
  mainWindow.loadFile(path.join(__dirname, 'splash', 'splash.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // 2. Transition to login screen after splash finishes
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile(path.join(__dirname, 'auth', 'login.html'));
    }
  }, 4800);

  mainWindow.on('closed', () => {
    if (findProductWindow && !findProductWindow.isDestroyed()) {
      findProductWindow.close();
    }
    mainWindow = null;
  });
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
  // ENTERPRISE DATA HANDLER
  // ============================================
  ipcMain.handle('get-data', async () => db.getAllData());

  // ============================================
  // UNITS IPC HANDLERS
  // ============================================
  ipcMain.handle('get-units', async () => db.getAllUnits());
  ipcMain.handle('save-unit', async (_event, unit) => db.saveUnit(unit));
  ipcMain.handle('delete-unit', async (_event, id) => db.deleteUnit(id));

  // ============================================
  // PRODUCT TYPES IPC HANDLERS
  // ============================================
  ipcMain.handle('get-product-types', async () => db.getAllProductTypes());
  ipcMain.handle('save-product-type', async (_event, pt) => db.saveProductType(pt));
  ipcMain.handle('delete-product-type', async (_event, id) => db.deleteProductType(id));

  // ============================================
  // GENERAL INFO IPC HANDLERS
  // ============================================
  ipcMain.handle('get-general-info', async () => {
    return db.getAllGeneralInfo();
  });

  ipcMain.handle('save-company-info', async (event, info) => {
    return db.saveCompanyInfo(info);
  });

  ipcMain.handle('add-province', async (event, province) => {
    return db.addProvince(province);
  });

  ipcMain.handle('update-province', async (event, province) => {
    return db.updateProvince(province);
  });

  ipcMain.handle('delete-province', async (event, id) => {
    return db.deleteProvince(id);
  });

  ipcMain.handle('add-area', async (event, area) => {
    return db.addArea(area);
  });

  ipcMain.handle('update-area', async (event, area) => {
    return db.updateArea(area);
  });

  ipcMain.handle('delete-area', async (event, id) => {
    return db.deleteArea(id);
  });

  ipcMain.handle('add-party-type', async (event, partyType) => {
    return db.addPartyType(partyType);
  });

  ipcMain.handle('update-party-type', async (event, partyType) => {
    return db.updatePartyType(partyType);
  });

  ipcMain.handle('delete-party-type', async (event, id) => {
    return db.deletePartyType(id);
  });

  ipcMain.handle('get-parties', async () => {
    return db.getParties();
  });

  ipcMain.handle('add-party', async (event, party) => {
    return db.addParty(party);
  });

  ipcMain.handle('update-party', async (event, party) => {
    return db.updateParty(party);
  });

  ipcMain.handle('delete-party', async (event, id) => {
    return db.deleteParty(id);
  });

  // ============================================
  // PRODUCT CATEGORIES & SUB-CATEGORIES IPC HANDLERS
  // ============================================
  ipcMain.handle('get-product-categories', async () => db.getAllProductCategories());
  ipcMain.handle('save-product-category', async (_event, cat) => db.saveProductCategory(cat));
  ipcMain.handle('delete-product-category', async (_event, id) => db.deleteProductCategory(id));
  ipcMain.handle('get-product-sub-categories', async (_event, catId) => db.getSubCategoriesByCategory(catId));
  ipcMain.handle('save-product-sub-category', async (_event, sub) => db.saveProductSubCategory(sub));
  ipcMain.handle('delete-product-sub-category', async (_event, id) => db.deleteProductSubCategory(id));

  // ============================================
  // PRODUCTS (PRODUCT INFO) IPC HANDLERS
  // ============================================
  ipcMain.handle('get-products', async () => db.getAllProducts());
  ipcMain.handle('get-product', async (_event, id) => db.getProductById(id));
  ipcMain.handle('get-product-by-code', async (_event, code) => db.getProductByCode(code));
  ipcMain.handle('get-next-product-code', async () => db.getNextProductCode());
  ipcMain.handle('save-product', async (_event, prod) => db.saveProduct(prod));
  ipcMain.handle('delete-product', async (_event, id) => db.deleteProduct(id));

  // ============================================
  // PURCHASES IPC HANDLERS
  // ============================================
  ipcMain.handle('get-purchases', async () => db.getAllPurchases());
  ipcMain.handle('get-purchase', async (_event, id) => db.getPurchaseById(id));
  ipcMain.handle('get-next-purchase-voucher-no', async () => db.getNextPurchaseVoucherNo());
  ipcMain.handle('save-purchase', async (_event, purchaseData, items) => db.savePurchase(purchaseData, items));
  ipcMain.handle('delete-purchase', async (_event, id) => db.deletePurchase(id));

  // ============================================
  // SALES IPC HANDLERS
  // ============================================
  ipcMain.handle('get-sales', async () => db.getAllSales());
  ipcMain.handle('get-sale', async (_event, id) => db.getSaleById(id));
  ipcMain.handle('get-next-sale-voucher-no', async () => db.getNextSaleVoucherNo());
  ipcMain.handle('save-sale', async (_event, saleData, items) => db.saveSale(saleData, items));
  ipcMain.handle('delete-sale', async (_event, id) => db.deleteSale(id));

  // ============================================
  // EXPORT IPC HANDLERS
  // ============================================
  ipcMain.handle('export-pdf', async (event, data) => {
    return exporter.exportPDF(data, mainWindow);
  });

  ipcMain.handle('export-excel', async (event, data) => {
    return exporter.exportExcel(data, mainWindow);
  });

  ipcMain.handle('export-csv', async (event, data) => {
    return exporter.exportCSV(data, mainWindow);
  });

  // ============================================
  // FIND PRODUCT DEDICATED WINDOW HANDLERS
  // ============================================
  ipcMain.on('open-find-product-window', () => {
    openFindProductWindow();
  });

  ipcMain.on('close-find-product-window', () => {
    if (findProductWindow && !findProductWindow.isDestroyed()) {
      findProductWindow.close();
    }
  });

  ipcMain.on('select-find-product', (_event, product) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('product-selected-from-window', product);
      mainWindow.focus();
    }
    if (findProductWindow && !findProductWindow.isDestroyed()) {
      findProductWindow.close();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  try {
    db.closeDatabase();
  } catch (err) {
    console.error('Error closing database:', err);
  }
});

app.on('window-all-closed', () => {
  try {
    db.closeDatabase();
  } catch (err) {}
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
