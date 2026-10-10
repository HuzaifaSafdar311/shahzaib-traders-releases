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

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT NOT NULL,
      customerName TEXT NOT NULL,
      customerPhone TEXT,
      customerAddress TEXT,
      date TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      totalAmount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Paid',
      createdAt TEXT NOT NULL
    );
  `);

  // Ensure new columns exist for existing databases
  try { db.exec('ALTER TABLE inventory ADD COLUMN totalSell INTEGER DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE inventory ADD COLUMN wholesalePrice REAL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE inventory ADD COLUMN individualPrice REAL DEFAULT 0;'); } catch (e) {}

  // Seed default data if empty or has very few items
  const vendorCountStmt = db.prepare('SELECT COUNT(*) as count FROM vendors');
  const vendorCount = vendorCountStmt.get().count;

  if (vendorCount === 0) {
    const insertVendor = db.prepare(`
      INSERT INTO vendors (id, name, phone, createdAt)
      VALUES (?, ?, ?, ?)
    `);

    insertVendor.run('v-1', 'Apex Industrial Supplies', '+92 300 1234567', '2025-01-15');
    insertVendor.run('v-2', 'Global Tech Components', '+92 321 9876543', '2025-01-18');
    insertVendor.run('v-3', 'Metro Logistics & Hardware', '+92 333 4567890', '2025-02-01');
    insertVendor.run('v-4', 'Shahzad Electric & Tools', '+92 345 5678901', '2025-02-05');
  }

  const stockCountStmt = db.prepare('SELECT COUNT(*) as count FROM inventory');
  const stockCount = stockCountStmt.get().count;

  if (stockCount < 5) {
    const insertStock = db.prepare(`
      INSERT OR IGNORE INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStock.run('inv-1', 'Precision Ball Bearings 608RS', 'v-1', 'Apex Industrial Supplies', 250, 42, 450, 600, '2025-02-10', '2025-02-10');
    insertStock.run('inv-2', 'Solid State Relay 25A', 'v-2', 'Global Tech Components', 80, 16, 1800, 2400, '2025-02-12', '2025-02-12');
    insertStock.run('inv-3', 'Heavy Duty Steel Brackets', 'v-3', 'Metro Logistics & Hardware', 120, 35, 820, 1100, '2025-02-14', '2025-02-14');
    insertStock.run('inv-4', 'Microcontroller Units ESP32', 'v-2', 'Global Tech Components', 65, 22, 950, 1400, '2025-02-18', '2025-02-18');
    insertStock.run('inv-5', 'Industrial Copper Wire 2.5mm (100m)', 'v-4', 'Shahzad Electric & Tools', 40, 10, 8500, 10500, '2025-02-20', '2025-02-20');
    insertStock.run('inv-6', 'Brass Hex Nuts M8 (Pack of 500)', 'v-1', 'Apex Industrial Supplies', 150, 20, 1200, 1600, '2025-02-21', '2025-02-21');
    insertStock.run('inv-7', 'Digital Multimeter Pro DT-9205A', 'v-2', 'Global Tech Components', 35, 8, 2200, 3000, '2025-02-22', '2025-02-22');
    insertStock.run('inv-8', 'Hydraulic Seal Kit 32mm', 'v-3', 'Metro Logistics & Hardware', 90, 15, 650, 950, '2025-02-24', '2025-02-24');
    insertStock.run('inv-9', 'LED Flood Light 100W IP66', 'v-4', 'Shahzad Electric & Tools', 50, 12, 3200, 4200, '2025-02-25', '2025-02-25');
  }

  // Seed sample invoice if empty
  const invoiceCountStmt = db.prepare('SELECT COUNT(*) as count FROM invoices');
  if (invoiceCountStmt.get().count === 0) {
    const insertInv = db.prepare(`
      INSERT INTO invoices (id, invoiceNumber, customerName, customerPhone, customerAddress, date, items, subtotal, discount, totalAmount, notes, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleItems = JSON.stringify([
      { stockId: 'inv-1', stockName: 'Precision Ball Bearings 608RS', quantity: 10, price: 600, total: 6000 },
      { stockId: 'inv-7', stockName: 'Digital Multimeter Pro DT-9205A', quantity: 2, price: 3000, total: 6000 }
    ]);

    insertInv.run(
      'invc-1',
      'INV-1001',
      'Bilal Traders & Engineering',
      '+92 312 9988776',
      'Circular Road, Lahore',
      new Date().toISOString().split('T')[0],
      sampleItems,
      12000,
      500,
      11500,
      'Paid via Cash. Goods received in good condition.',
      'Paid',
      new Date().toISOString()
    );
  }

  dbInstance = db;
  return dbInstance;
}

function getAllData() {
  if (!dbInstance) throw new Error('Database not initialized');
  const vendorsStmt = dbInstance.prepare('SELECT id, name, phone, createdAt FROM vendors ORDER BY createdAt DESC, name ASC');
  const inventoryStmt = dbInstance.prepare('SELECT id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt FROM inventory ORDER BY date DESC, createdAt DESC');
  const invoicesStmt = dbInstance.prepare('SELECT id, invoiceNumber, customerName, customerPhone, customerAddress, date, items, subtotal, discount, totalAmount, notes, status, createdAt FROM invoices ORDER BY date DESC, createdAt DESC');

  return {
    vendors: vendorsStmt.all(),
    inventory: inventoryStmt.all(),
    invoices: invoicesStmt.all()
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
    vendor.phone,
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
  stmt.run(
    vendor.name,
    vendor.phone,
    vendor.id
  );
  return { success: true };
}

function deleteVendor(id) {
  if (!dbInstance) throw new Error('Database not initialized');
  // First clear vendor reference from inventory
  const updateInvStmt = dbInstance.prepare('UPDATE inventory SET vendorId = "", vendorName = "Unknown Vendor" WHERE vendorId = ?');
  updateInvStmt.run(id);

  const stmt = dbInstance.prepare('DELETE FROM vendors WHERE id = ?');
  stmt.run(id);
  return { success: true };
}

// ============================================
// INVOICE FUNCTIONS
// ============================================
function getAllInvoices() {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('SELECT id, invoiceNumber, customerName, customerPhone, customerAddress, date, items, subtotal, discount, totalAmount, notes, status, createdAt FROM invoices ORDER BY date DESC, createdAt DESC');
  return stmt.all();
}

function createInvoice(invoice) {
  if (!dbInstance) throw new Error('Database not initialized');

  const itemsJson = typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items || []);

  const stmt = dbInstance.prepare(`
    INSERT INTO invoices (id, invoiceNumber, customerName, customerPhone, customerAddress, date, items, subtotal, discount, totalAmount, notes, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    invoice.id || `invc-${Date.now()}`,
    invoice.invoiceNumber,
    invoice.customerName,
    invoice.customerPhone || '',
    invoice.customerAddress || '',
    invoice.date,
    itemsJson,
    Number(invoice.subtotal) || 0,
    Number(invoice.discount) || 0,
    Number(invoice.totalAmount) || 0,
    invoice.notes || '',
    invoice.status || 'Paid',
    invoice.createdAt || new Date().toISOString()
  );

  // Update totalSell in inventory for sold items
  try {
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
    const updateSellStmt = dbInstance.prepare('UPDATE inventory SET totalSell = totalSell + ? WHERE id = ?');
    for (const it of items) {
      if (it.stockId) {
        updateSellStmt.run(Number(it.quantity) || 0, it.stockId);
      }
    }
  } catch (err) {
    console.error('Error updating stock sell on invoice create:', err);
  }

  return { success: true };
}

function deleteInvoice(id) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('DELETE FROM invoices WHERE id = ?');
  stmt.run(id);
  return { success: true };
}

function syncAllData(data) {
  if (!dbInstance) throw new Error('Database not initialized');
  // Transactional sync
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    if (data.vendors && Array.isArray(data.vendors)) {
      dbInstance.exec('DELETE FROM vendors;');
      const insertVendor = dbInstance.prepare('INSERT INTO vendors (id, name, phone, createdAt) VALUES (?, ?, ?, ?)');
      for (const v of data.vendors) {
        insertVendor.run(v.id, v.name, v.phone, v.createdAt || new Date().toISOString());
      }
    }

    if (data.inventory && Array.isArray(data.inventory)) {
      dbInstance.exec('DELETE FROM inventory;');
      const insertStock = dbInstance.prepare('INSERT INTO inventory (id, stockName, vendorId, vendorName, quantity, totalSell, wholesalePrice, individualPrice, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const s of data.inventory) {
        insertStock.run(s.id, s.stockName, s.vendorId || '', s.vendorName || '', Number(s.quantity) || 0, Number(s.totalSell) || 0, Number(s.wholesalePrice) || 0, Number(s.individualPrice) || 0, s.date, s.createdAt || new Date().toISOString());
      }
    }

    dbInstance.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
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
  getAllInvoices,
  createInvoice,
  deleteInvoice,
  syncAllData
};
