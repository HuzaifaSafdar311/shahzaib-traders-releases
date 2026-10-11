const path = require('path');
const fs = require('fs');

let DatabaseSync = null;
try {
  // Built-in node:sqlite is only available in Node 22.5+
  const sqlite = require('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (_err) {
  DatabaseSync = null;
}

let dbInstance = null;
let isJsonFallback = false;
let jsonFilePath = null;
let jsonData = {
  vendors: [],
  inventory: []
};

function saveJsonData() {
  if (!jsonFilePath) return;
  try {
    fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write json db file:', err);
  }
}

function initJsonFallback(dbPath) {
  isJsonFallback = true;
  jsonFilePath = dbPath.replace(/\.db$/i, '') + '.json';
  fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });

  if (fs.existsSync(jsonFilePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      jsonData = {
        vendors: Array.isArray(parsed.vendors) ? parsed.vendors : [],
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : []
      };
    } catch (e) {
      console.warn('Failed to parse existing JSON database, re-initializing:', e);
      jsonData = { vendors: [], inventory: [] };
    }
  } else {
    jsonData = { vendors: [], inventory: [] };
    saveJsonData();
  }

  dbInstance = { isFallback: true };
  return dbInstance;
}

function initDatabase(dbPath) {
  if (dbInstance) return dbInstance;

  if (!DatabaseSync) {
    console.log('node:sqlite not available in this Node/Electron version. Using robust JSON database fallback.');
    return initJsonFallback(dbPath);
  }

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);

    // Enable WAL mode for better concurrency and performance
    db.exec('PRAGMA journal_mode = WAL;');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contactPerson TEXT DEFAULT '',
        phone TEXT NOT NULL,
        email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        stockName TEXT NOT NULL,
        vendorId TEXT,
        vendorName TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        totalSell INTEGER NOT NULL DEFAULT 0,
        purchasePrice REAL NOT NULL DEFAULT 0,
        wholesalePrice REAL NOT NULL DEFAULT 0,
        individualPrice REAL NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    // Ensure columns exist for existing databases
    try { db.exec('ALTER TABLE inventory ADD COLUMN totalSell INTEGER DEFAULT 0;'); } catch (e) {}
    try { db.exec('ALTER TABLE inventory ADD COLUMN purchasePrice REAL DEFAULT 0;'); } catch (e) {}
    try { db.exec('ALTER TABLE inventory ADD COLUMN wholesalePrice REAL DEFAULT 0;'); } catch (e) {}
    try { db.exec('ALTER TABLE inventory ADD COLUMN individualPrice REAL DEFAULT 0;'); } catch (e) {}

    try { db.exec("ALTER TABLE vendors ADD COLUMN contactPerson TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE vendors ADD COLUMN email TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE vendors ADD COLUMN address TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE vendors ADD COLUMN notes TEXT DEFAULT '';"); } catch (e) {}

    dbInstance = db;
    return dbInstance;
  } catch (err) {
    console.warn('SQLite init failed, falling back to JSON database:', err);
    return initJsonFallback(dbPath);
  }
}

function getAllData() {
  if (isJsonFallback) {
    const vendors = [...jsonData.vendors].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '') || (a.name || '').localeCompare(b.name || '')
    );
    const inventory = [...jsonData.inventory].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    return { vendors, inventory };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const vendorsStmt = dbInstance.prepare('SELECT id, name, contactPerson, phone, email, address, notes, createdAt FROM vendors ORDER BY createdAt DESC, name ASC');
  const inventoryStmt = dbInstance.prepare('SELECT id, stockName, vendorId, vendorName, quantity, totalSell, purchasePrice, wholesalePrice, individualPrice, date, createdAt FROM inventory ORDER BY date DESC, createdAt DESC');

  return {
    vendors: vendorsStmt.all(),
    inventory: inventoryStmt.all()
  };
}

function addStock(item) {
  if (isJsonFallback) {
    jsonData.inventory.push({
      id: item.id,
      stockName: item.stockName,
      vendorId: item.vendorId || '',
      vendorName: item.vendorName || '',
      quantity: Number(item.quantity) || 0,
      totalSell: Number(item.totalSell) || 0,
      purchasePrice: Number(item.purchasePrice) || 0,
      wholesalePrice: Number(item.wholesalePrice) || 0,
      individualPrice: Number(item.individualPrice) || 0,
      date: item.date,
      createdAt: item.createdAt || new Date().toISOString()
    });
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    INSERT INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, purchasePrice, wholesalePrice, individualPrice, date, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    item.id,
    item.stockName,
    item.vendorId || '',
    item.vendorName || '',
    Number(item.quantity) || 0,
    Number(item.totalSell) || 0,
    Number(item.purchasePrice) || 0,
    Number(item.wholesalePrice) || 0,
    Number(item.individualPrice) || 0,
    item.date,
    item.createdAt || new Date().toISOString()
  );
  checkpoint();
  return { success: true };
}

function updateStock(item) {
  if (isJsonFallback) {
    const idx = jsonData.inventory.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      jsonData.inventory[idx] = {
        ...jsonData.inventory[idx],
        stockName: item.stockName,
        vendorId: item.vendorId || '',
        vendorName: item.vendorName || '',
        quantity: Number(item.quantity) || 0,
        totalSell: Number(item.totalSell) || 0,
        purchasePrice: Number(item.purchasePrice) || 0,
        wholesalePrice: Number(item.wholesalePrice) || 0,
        individualPrice: Number(item.individualPrice) || 0,
        date: item.date
      };
      saveJsonData();
    }
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    UPDATE inventory
    SET stockName = ?, vendorId = ?, vendorName = ?, quantity = ?, totalSell = ?, purchasePrice = ?, wholesalePrice = ?, individualPrice = ?, date = ?
    WHERE id = ?
  `);
  stmt.run(
    item.stockName,
    item.vendorId || '',
    item.vendorName || '',
    Number(item.quantity) || 0,
    Number(item.totalSell) || 0,
    Number(item.purchasePrice) || 0,
    Number(item.wholesalePrice) || 0,
    Number(item.individualPrice) || 0,
    item.date,
    item.id
  );
  checkpoint();
  return { success: true };
}

function deleteStock(id) {
  if (isJsonFallback) {
    jsonData.inventory = jsonData.inventory.filter(i => i.id !== id);
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('DELETE FROM inventory WHERE id = ?');
  stmt.run(id);
  checkpoint();
  return { success: true };
}

function addVendor(vendor) {
  if (isJsonFallback) {
    jsonData.vendors.push({
      id: vendor.id,
      name: vendor.name,
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone,
      email: vendor.email || '',
      address: vendor.address || '',
      notes: vendor.notes || '',
      createdAt: vendor.createdAt || new Date().toISOString()
    });
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    INSERT INTO vendors (id, name, contactPerson, phone, email, address, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    vendor.id,
    vendor.name,
    vendor.contactPerson || '',
    vendor.phone,
    vendor.email || '',
    vendor.address || '',
    vendor.notes || '',
    vendor.createdAt || new Date().toISOString()
  );
  checkpoint();
  return { success: true };
}

function updateVendor(vendor) {
  if (isJsonFallback) {
    const idx = jsonData.vendors.findIndex(v => v.id === vendor.id);
    if (idx !== -1) {
      jsonData.vendors[idx].name = vendor.name;
      jsonData.vendors[idx].contactPerson = vendor.contactPerson || '';
      jsonData.vendors[idx].phone = vendor.phone;
      jsonData.vendors[idx].email = vendor.email || '';
      jsonData.vendors[idx].address = vendor.address || '';
      jsonData.vendors[idx].notes = vendor.notes || '';
      saveJsonData();
    }
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    UPDATE vendors
    SET name = ?, contactPerson = ?, phone = ?, email = ?, address = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    vendor.name,
    vendor.contactPerson || '',
    vendor.phone || '',
    vendor.email || '',
    vendor.address || '',
    vendor.notes || '',
    vendor.id
  );

  // Also update vendorName across inventory items
  const updateInv = dbInstance.prepare(`
    UPDATE inventory
    SET vendorName = ?
    WHERE vendorId = ?
  `);
  updateInv.run(vendor.name, vendor.id);

  checkpoint();
  return { success: true };
}

function deleteVendor(id) {
  if (isJsonFallback) {
    // Cascade delete: Delete all stock items belonging to this vendor
    jsonData.inventory = jsonData.inventory.filter(i => i.vendorId !== id);
    // Delete the vendor record
    jsonData.vendors = jsonData.vendors.filter(v => v.id !== id);
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    // Cascade delete: Delete all stock items belonging to this vendor
    const deleteStockStmt = dbInstance.prepare('DELETE FROM inventory WHERE vendorId = ?');
    deleteStockStmt.run(id);

    // Delete the vendor record
    const deleteVenStmt = dbInstance.prepare('DELETE FROM vendors WHERE id = ?');
    deleteVenStmt.run(id);

    dbInstance.exec('COMMIT;');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function syncAllData(data) {
  if (isJsonFallback) {
    if (data.vendors && Array.isArray(data.vendors)) {
      jsonData.vendors = data.vendors;
    }
    if (data.inventory && Array.isArray(data.inventory)) {
      jsonData.inventory = data.inventory;
    }
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  // Transactional sync
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    if (data.vendors && Array.isArray(data.vendors)) {
      dbInstance.exec('DELETE FROM vendors;');
      const insertVendor = dbInstance.prepare('INSERT INTO vendors (id, name, contactPerson, phone, email, address, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const v of data.vendors) {
        insertVendor.run(v.id, v.name, v.contactPerson || '', v.phone, v.email || '', v.address || '', v.notes || '', v.createdAt || new Date().toISOString());
      }
    }

    if (data.inventory && Array.isArray(data.inventory)) {
      dbInstance.exec('DELETE FROM inventory;');
      const insertStock = dbInstance.prepare('INSERT INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, purchasePrice, wholesalePrice, individualPrice, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const s of data.inventory) {
        insertStock.run(s.id, s.stockName, s.vendorId || '', s.vendorName || '', Number(s.quantity) || 0, Number(s.totalSell) || 0, Number(s.purchasePrice) || 0, Number(s.wholesalePrice) || 0, Number(s.individualPrice) || 0, s.date, s.createdAt || new Date().toISOString());
      }
    }

    dbInstance.exec('COMMIT;');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function clearAllInventory() {
  if (isJsonFallback) {
    jsonData.inventory = [];
    saveJsonData();
    return { success: true };
  }
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec('DELETE FROM inventory;');
  checkpoint();
  return { success: true };
}

function clearAllVendors() {
  if (isJsonFallback) {
    jsonData.inventory = [];
    jsonData.vendors = [];
    saveJsonData();
    return { success: true };
  }
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    dbInstance.exec('DELETE FROM inventory;');
    dbInstance.exec('DELETE FROM vendors;');
    dbInstance.exec('COMMIT;');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function checkpoint() {
  if (dbInstance) {
    try {
      dbInstance.exec('PRAGMA wal_checkpoint(PASSIVE);');
    } catch (e) {}
  }
}

function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.exec('PRAGMA wal_checkpoint(FULL);');
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
}

module.exports = {
  initDatabase,
  closeDatabase,
  getAllData,
  addStock,
  updateStock,
  deleteStock,
  clearAllInventory,
  addVendor,
  updateVendor,
  deleteVendor,
  clearAllVendors,
  syncAllData
};
