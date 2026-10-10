const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

function initDatabase(dbPath) {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for better concurrency and performance
  db.exec('PRAGMA journal_mode = WAL;');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      stockName TEXT NOT NULL,
      vendorId TEXT,
      vendorName TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      totalSell INTEGER NOT NULL DEFAULT 0,
      wholesalePrice REAL NOT NULL DEFAULT 0,
      individualPrice REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Ensure new columns exist for existing databases
  try { db.exec('ALTER TABLE inventory ADD COLUMN totalSell INTEGER DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE inventory ADD COLUMN wholesalePrice REAL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE inventory ADD COLUMN individualPrice REAL DEFAULT 0;'); } catch (e) {}

  // Delete all seeder demo data from SQLite database
  try {
    db.exec(`
      DELETE FROM inventory WHERE id IN ('inv-1', 'inv-2', 'inv-3', 'inv-4');
      DELETE FROM vendors WHERE id IN ('v-1', 'v-2', 'v-3');
    `);
  } catch (e) {}

  dbInstance = db;
  return dbInstance;
}

function getAllData() {
  if (!dbInstance) throw new Error('Database not initialized');
  const vendorsStmt = dbInstance.prepare('SELECT id, name, phone, createdAt FROM vendors ORDER BY createdAt DESC, name ASC');
  const inventoryStmt = dbInstance.prepare('SELECT id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt FROM inventory ORDER BY date DESC, createdAt DESC');

  return {
    vendors: vendorsStmt.all(),
    inventory: inventoryStmt.all()
  };
}

function addStock(item) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    INSERT INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    item.id,
    item.stockName,
    item.vendorId || '',
    item.vendorName || '',
    Number(item.quantity) || 0,
    Number(item.totalSell) || 0,
    Number(item.wholesalePrice) || 0,
    Number(item.individualPrice) || 0,
    item.date,
    item.createdAt || new Date().toISOString()
  );
  checkpoint();
  return { success: true };
}

function updateStock(item) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    UPDATE inventory
    SET stockName = ?, vendorId = ?, vendorName = ?, quantity = ?, totalSell = ?, wholesalePrice = ?, individualPrice = ?, date = ?
    WHERE id = ?
  `);
  stmt.run(
    item.stockName,
    item.vendorId || '',
    item.vendorName || '',
    Number(item.quantity) || 0,
    Number(item.totalSell) || 0,
    Number(item.wholesalePrice) || 0,
    Number(item.individualPrice) || 0,
    item.date,
    item.id
  );
  checkpoint();
  return { success: true };
}

function deleteStock(id) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('DELETE FROM inventory WHERE id = ?');
  stmt.run(id);
  checkpoint();
  return { success: true };
}

function addVendor(vendor) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    INSERT INTO vendors (id, name, phone, createdAt)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(
    vendor.id,
    vendor.name,
    vendor.phone || '',
    vendor.createdAt || new Date().toISOString()
  );
  checkpoint();
  return { success: true };
}

function updateVendor(vendor) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(`
    UPDATE vendors
    SET name = ?, phone = ?
    WHERE id = ?
  `);
  stmt.run(vendor.name, vendor.phone || '', vendor.id);

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
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec('BEGIN TRANSACTION');
  try {
    // Cascade delete: Delete all stock items belonging to this vendor
    const deleteStock = dbInstance.prepare('DELETE FROM inventory WHERE vendorId = ?');
    deleteStock.run(id);

    // Delete the vendor record
    const deleteVen = dbInstance.prepare('DELETE FROM vendors WHERE id = ?');
    deleteVen.run(id);

    dbInstance.exec('COMMIT');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK');
    throw err;
  }
}

function syncAllData(data) {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec('BEGIN TRANSACTION');
  try {
    dbInstance.exec('DELETE FROM inventory; DELETE FROM vendors;');

    const insertVendor = dbInstance.prepare(`
      INSERT INTO vendors (id, name, phone, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    (data.vendors || []).forEach(v => {
      insertVendor.run(v.id, v.name, v.phone || '', v.createdAt || new Date().toISOString());
    });

    const insertStock = dbInstance.prepare(`
      INSERT INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    (data.inventory || []).forEach(item => {
      insertStock.run(
        item.id,
        item.stockName,
        item.vendorId || '',
        item.vendorName || '',
        Number(item.quantity) || 0,
        Number(item.totalSell) || 0,
        Number(item.wholesalePrice) || 0,
        Number(item.individualPrice) || 0,
        item.date,
        item.createdAt || new Date().toISOString()
      );
    });

    dbInstance.exec('COMMIT');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK');
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
  addVendor,
  updateVendor,
  deleteVendor,
  syncAllData
};
