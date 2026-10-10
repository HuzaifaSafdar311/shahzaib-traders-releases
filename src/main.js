const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getDataFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'inventory_data.json');
}

function getDefaultData() {
  return {
    vendors: [
      {
        id: 'v-1',
        name: 'Apex Industrial Supplies',
        contactPerson: 'David Miller',
        phone: '+1 (555) 019-2834',
        email: 'sales@apexsupplies.com',
        createdAt: '2025-01-15'
      },
      {
        id: 'v-2',
        name: 'Global Tech Components',
        contactPerson: 'Sarah Chen',
        phone: '+1 (555) 014-9981',
        email: 'orders@globaltech.io',
        createdAt: '2025-01-18'
      },
      {
        id: 'v-3',
        name: 'Metro Logistics & Hardware',
        contactPerson: 'Tariq Mahmood',
        phone: '+1 (555) 018-7743',
        email: 'info@metrologistics.com',
        createdAt: '2025-02-01'
      }
    ],
    inventory: [
      {
        id: 'inv-1',
        stockName: 'Precision Ball Bearings 608RS',
        vendorId: 'v-1',
        vendorName: 'Apex Industrial Supplies',
        quantity: 250,
        date: '2025-02-10',
        createdAt: '2025-02-10'
      },
      {
        id: 'inv-2',
        stockName: 'Solid State Relay 25A',
        vendorId: 'v-2',
        vendorName: 'Global Tech Components',
        quantity: 80,
        date: '2025-02-12',
        createdAt: '2025-02-12'
      },
      {
        id: 'inv-3',
        stockName: 'Heavy Duty Steel Brackets',
        vendorId: 'v-3',
        vendorName: 'Metro Logistics & Hardware',
        quantity: 120,
        date: '2025-02-14',
        createdAt: '2025-02-14'
      },
      {
        id: 'inv-4',
        stockName: 'Microcontroller Units ESP32',
        vendorId: 'v-2',
        vendorName: 'Global Tech Components',
        quantity: 45,
        date: '2025-02-18',
        createdAt: '2025-02-18'
      }
    ]
  };
}

function loadData() {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data, falling back to defaults:', err);
  }
  const defaultData = getDefaultData();
  saveData(defaultData);
  return defaultData;
}

function saveData(data) {
  try {
    const filePath = getDataFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error saving data:', err);
    return { success: false, error: err.message };
  }
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
  createWindow();

  ipcMain.handle('get-data', async () => {
    return loadData();
  });

  ipcMain.handle('save-data', async (event, data) => {
    return saveData(data);
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
