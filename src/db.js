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
  inventory: [],
  invoices: []
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
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : []
      };
    } catch (e) {
      console.warn('Failed to parse existing JSON database, re-initializing:', e);
      jsonData = { vendors: [], inventory: [], invoices: [] };
    }
  }

  // Seed default vendors if empty
  if (jsonData.vendors.length === 0) {
    jsonData.vendors = [
      { id: 'v-1', name: 'Apex Industrial Supplies', phone: '+92 300 1234567', createdAt: '2025-01-15' },
      { id: 'v-2', name: 'Global Tech Components', phone: '+92 321 9876543', createdAt: '2025-01-18' },
      { id: 'v-3', name: 'Metro Logistics & Hardware', phone: '+92 333 4567890', createdAt: '2025-02-01' },
      { id: 'v-4', name: 'Shahzad Electric & Tools', phone: '+92 345 5678901', createdAt: '2025-02-05' }
    ];
  }

  // Seed default inventory items if low count
  if (jsonData.inventory.length < 5) {
    const defaultStock = [
      { id: 'inv-1', stockName: 'Precision Ball Bearings 608RS', vendorId: 'v-1', vendorName: 'Apex Industrial Supplies', quantity: 250, totalSell: 42, wholesalePrice: 450, individualPrice: 600, date: '2025-02-10', createdAt: '2025-02-10' },
      { id: 'inv-2', stockName: 'Solid State Relay 25A', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 80, totalSell: 16, wholesalePrice: 1800, individualPrice: 2400, date: '2025-02-12', createdAt: '2025-02-12' },
      { id: 'inv-3', stockName: 'Heavy Duty Steel Brackets', vendorId: 'v-3', vendorName: 'Metro Logistics & Hardware', quantity: 120, totalSell: 35, wholesalePrice: 820, individualPrice: 1100, date: '2025-02-14', createdAt: '2025-02-14' },
      { id: 'inv-4', stockName: 'Microcontroller Units ESP32', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 65, totalSell: 22, wholesalePrice: 950, individualPrice: 1400, date: '2025-02-18', createdAt: '2025-02-18' },
      { id: 'inv-5', stockName: 'Industrial Copper Wire 2.5mm (100m)', vendorId: 'v-4', vendorName: 'Shahzad Electric & Tools', quantity: 40, totalSell: 10, wholesalePrice: 8500, individualPrice: 10500, date: '2025-02-20', createdAt: '2025-02-20' },
      { id: 'inv-6', stockName: 'Brass Hex Nuts M8 (Pack of 500)', vendorId: 'v-1', vendorName: 'Apex Industrial Supplies', quantity: 150, totalSell: 20, wholesalePrice: 1200, individualPrice: 1600, date: '2025-02-21', createdAt: '2025-02-21' },
      { id: 'inv-7', stockName: 'Digital Multimeter Pro DT-9205A', vendorId: 'v-2', vendorName: 'Global Tech Components', quantity: 35, totalSell: 8, wholesalePrice: 2200, individualPrice: 3000, date: '2025-02-22', createdAt: '2025-02-22' },
      { id: 'inv-8', stockName: 'Hydraulic Seal Kit 32mm', vendorId: 'v-3', vendorName: 'Metro Logistics & Hardware', quantity: 90, totalSell: 15, wholesalePrice: 650, individualPrice: 950, date: '2025-02-24', createdAt: '2025-02-24' },
      { id: 'inv-9', stockName: 'LED Flood Light 100W IP66', vendorId: 'v-4', vendorName: 'Shahzad Electric & Tools', quantity: 50, totalSell: 12, wholesalePrice: 3200, individualPrice: 4200, date: '2025-02-25', createdAt: '2025-02-25' }
    ];

    const existingIds = new Set(jsonData.inventory.map(i => i.id));
    for (const item of defaultStock) {
      if (!existingIds.has(item.id)) {
        jsonData.inventory.push(item);
      }
    }
  }

  // Seed default sample invoice if empty
  if (jsonData.invoices.length === 0) {
    const sampleItems = JSON.stringify([
      { stockId: 'inv-1', stockName: 'Precision Ball Bearings 608RS', quantity: 10, price: 600, total: 6000 },
      { stockId: 'inv-7', stockName: 'Digital Multimeter Pro DT-9205A', quantity: 2, price: 3000, total: 6000 }
    ]);

    jsonData.invoices.push({
      id: 'invc-1',
      invoiceNumber: 'INV-1001',
      customerName: 'Bilal Traders & Engineering',
      customerPhone: '+92 312 9988776',
      customerAddress: 'Circular Road, Lahore',
      date: new Date().toISOString().split('T')[0],
      items: sampleItems,
      subtotal: 12000,
      discount: 500,
      totalAmount: 11500,
      notes: 'Paid via Cash. Goods received in good condition.',
      status: 'Paid',
      createdAt: new Date().toISOString()
    });
  }

  saveJsonData();
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
    const invoices = [...jsonData.invoices].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    return { vendors, inventory, invoices };
  }

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
  if (isJsonFallback) {
    jsonData.inventory.push({
      id: item.id,
      stockName: item.stockName,
      vendorId: item.vendorId || '',
      vendorName: item.vendorName || '',
      quantity: Number(item.quantity) || 0,
      totalSell: Number(item.totalSell) || 0,
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
      phone: vendor.phone,
      createdAt: vendor.createdAt || new Date().toISOString()
    });
    saveJsonData();
    return { success: true };
  }

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
  checkpoint();
  return { success: true };
}

function updateVendor(vendor) {
  if (isJsonFallback) {
    const idx = jsonData.vendors.findIndex(v => v.id === vendor.id);
    if (idx !== -1) {
      jsonData.vendors[idx].name = vendor.name;
      jsonData.vendors[idx].phone = vendor.phone;
      saveJsonData();
    }
    return { success: true };
  }

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

// ============================================
// INVOICE FUNCTIONS
// ============================================
function getAllInvoices() {
  if (isJsonFallback) {
    return [...jsonData.invoices].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('SELECT id, invoiceNumber, customerName, customerPhone, customerAddress, date, items, subtotal, discount, totalAmount, notes, status, createdAt FROM invoices ORDER BY date DESC, createdAt DESC');
  return stmt.all();
}

function createInvoice(invoice) {
  const itemsJson = typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items || []);

  if (isJsonFallback) {
    const newInvoice = {
      id: invoice.id || `invc-${Date.now()}`,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone || '',
      customerAddress: invoice.customerAddress || '',
      date: invoice.date,
      items: itemsJson,
      subtotal: Number(invoice.subtotal) || 0,
      discount: Number(invoice.discount) || 0,
      totalAmount: Number(invoice.totalAmount) || 0,
      notes: invoice.notes || '',
      status: invoice.status || 'Paid',
      createdAt: invoice.createdAt || new Date().toISOString()
    };
    // Validate stock availability before performing sale
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
    for (const it of items) {
      if (it.stockId) {
        const item = jsonData.inventory.find(s => s.id === it.stockId);
        const available = item ? (Number(item.quantity) || 0) : 0;
        const requested = Number(it.quantity) || 0;
        if (requested > available) {
          const name = (item && item.stockName) || it.stockName || 'Stock item';
          return {
            success: false,
            error: `Insufficient stock! Only ${available} units of "${name}" available, cannot sell ${requested}.`
          };
        }
      }
    }

    jsonData.invoices.push(newInvoice);

    // Update totalSell and deduct available quantity in inventory for sold items
    for (const it of items) {
      if (it.stockId) {
        const item = jsonData.inventory.find(s => s.id === it.stockId);
        if (item) {
          const soldQty = Number(it.quantity) || 0;
          item.totalSell = (Number(item.totalSell) || 0) + soldQty;
          item.quantity = Math.max(0, (Number(item.quantity) || 0) - soldQty);
        }
      }
    }

    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');

  // SQLite WAL: Validate stock availability and execute in a transaction
  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  const checkStockStmt = dbInstance.prepare('SELECT id, stockName, quantity FROM inventory WHERE id = ?');

  for (const it of items) {
    if (it.stockId) {
      const row = checkStockStmt.get(it.stockId);
      const available = row ? (Number(row.quantity) || 0) : 0;
      const requested = Number(it.quantity) || 0;
      if (requested > available) {
        const name = (row && row.stockName) || it.stockName || 'Stock item';
        return {
          success: false,
          error: `Insufficient stock! Only ${available} units of "${name}" available, cannot sell ${requested}.`
        };
      }
    }
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
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

    const updateSellStmt = dbInstance.prepare('UPDATE inventory SET totalSell = totalSell + ?, quantity = MAX(0, quantity - ?) WHERE id = ?');
    for (const it of items) {
      if (it.stockId) {
        const soldQty = Number(it.quantity) || 0;
        updateSellStmt.run(soldQty, soldQty, it.stockId);
      }
    }

    dbInstance.exec('COMMIT;');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    console.error('Error creating invoice in SQLite transaction:', err);
    return { success: false, error: err.message };
  }
}

function deleteInvoice(id) {
  if (isJsonFallback) {
    jsonData.invoices = jsonData.invoices.filter(i => i.id !== id);
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare('DELETE FROM invoices WHERE id = ?');
  stmt.run(id);
  checkpoint();
  return { success: true };
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
  addVendor,
  updateVendor,
  deleteVendor,
  getAllInvoices,
  createInvoice,
  deleteInvoice,
  syncAllData
};
