const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const db = require('./db');
const exporter = require('./exporter');

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
  const iconPath = path.join(__dirname, 'circle-logo.png');
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
