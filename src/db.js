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

  // Update any existing default vendors to Pakistani numbers
  try {
    db.exec(`
      UPDATE vendors SET phone = '0300-9283401' WHERE id = 'v-1' AND phone LIKE '+1%';
      UPDATE vendors SET phone = '0321-4998120' WHERE id = 'v-2' AND phone LIKE '+1%';
      UPDATE vendors SET phone = '0333-8774315' WHERE id = 'v-3' AND phone LIKE '+1%';
    `);
  } catch (e) {}

  // Seed default data if empty
  const vendorCountStmt = db.prepare('SELECT COUNT(*) as count FROM vendors');
  const vendorCount = vendorCountStmt.get().count;

  if (vendorCount === 0) {
    const insertVendor = db.prepare(`
      INSERT INTO vendors (id, name, phone, createdAt)
      VALUES (?, ?, ?, ?)
    `);

    insertVendor.run('v-1', 'Apex Industrial Supplies', '0300-9283401', '2025-01-15');
    insertVendor.run('v-2', 'Global Tech Components', '0321-4998120', '2025-01-18');
    insertVendor.run('v-3', 'Metro Logistics & Hardware', '0333-8774315', '2025-02-01');

    const insertStock = db.prepare(`
      INSERT INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStock.run('inv-1', 'Precision Ball Bearings 608RS', 'v-1', 'Apex Industrial Supplies', 250, 42, 4.50, 7.00, '2025-02-10', '2025-02-10');
    insertStock.run('inv-2', 'Solid State Relay 25A', 'v-2', 'Global Tech Components', 80, 16, 18.00, 25.50, '2025-02-12', '2025-02-12');
    insertStock.run('inv-3', 'Heavy Duty Steel Brackets', 'v-3', 'Metro Logistics & Hardware', 120, 35, 8.20, 12.00, '2025-02-14', '2025-02-14');
    insertStock.run('inv-4', 'Microcontroller Units ESP32', 'v-2', 'Global Tech Components', 45, 22, 3.80, 6.00, '2025-02-18', '2025-02-18');
  }

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
  return { success: true };
}

function deleteStock(id) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('DELETE FROM inventory WHERE id = ?');
  stmt.run(id);
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
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK');
    throw err;
  }
}

module.exports = {
  initDatabase,
  getAllData,
  addStock,
  updateStock,
  deleteStock,
  addVendor,
  updateVendor,
  deleteVendor,
  syncAllData
};
