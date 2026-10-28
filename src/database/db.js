const path = require('path');
const fs = require('fs');

let DatabaseSync = null;
try {
  const sqlite = require('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (_err) {
  DatabaseSync = null;
}

let dbInstance = null;
let isJsonFallback = false;
let jsonFilePath = null;
let jsonData = {
  units: [],
  product_types: [],
  product_categories: [],
  product_sub_categories: [],
  products: [],
  purchases: [],
  purchase_items: [],
  sales: [],
  sale_items: []
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
        units: Array.isArray(parsed.units) ? parsed.units : [],
        product_types: Array.isArray(parsed.product_types) ? parsed.product_types : [],
        product_categories: Array.isArray(parsed.product_categories) ? parsed.product_categories : [],
        product_sub_categories: Array.isArray(parsed.product_sub_categories) ? parsed.product_sub_categories : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
        purchase_items: Array.isArray(parsed.purchase_items) ? parsed.purchase_items : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        sale_items: Array.isArray(parsed.sale_items) ? parsed.sale_items : [],
        sales_returns: Array.isArray(parsed.sales_returns) ? parsed.sales_returns : [],
        sale_return_items: Array.isArray(parsed.sale_return_items) ? parsed.sale_return_items : []
      };
    } catch (e) {
      console.warn('Failed to parse existing JSON database, re-initializing:', e);
      jsonData = { units: [], product_types: [], product_categories: [], product_sub_categories: [], products: [], purchases: [], purchase_items: [], sales: [], sale_items: [], sales_returns: [], sale_return_items: [] };
    }
  } else {
    jsonData = { units: [], product_types: [], product_categories: [], product_sub_categories: [], products: [], purchases: [], purchase_items: [], sales: [], sale_items: [], sales_returns: [], sale_return_items: [] };
    saveJsonData();
  }

  dbInstance = { isFallback: true };
  return dbInstance;
}

const generalInfoDb = require('../Genral info/general-info-db');
const accountsDb = require('../accounts/accounts-db');
const tradeFeaturesDb = require('./trade-features-db');

function tableHasColumn(db, tableName, columnName) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return cols.some(c => c.name.toLowerCase() === columnName.toLowerCase());
  } catch (_) {
    return false;
  }
}

function runAdditiveMigrations(db) {
  let currentVersion = 0;
  try {
    const row = db.prepare('PRAGMA user_version;').get();
    if (row && typeof row.user_version === 'number') {
      currentVersion = row.user_version;
    }
  } catch (err) {
    console.warn('Could not read PRAGMA user_version:', err.message);
  }

  // Version 1: Additive column migrations guarded by tableHasColumn
  if (currentVersion < 1) {
    try {
      if (!tableHasColumn(db, 'sales', 'billStatus')) {
        db.exec("ALTER TABLE sales ADD COLUMN billStatus TEXT DEFAULT 'Paid';");
      }
    } catch (e) {
      console.warn('Migration v1 (sales.billStatus) note:', e.message);
    }

    try {
      db.exec('PRAGMA user_version = 1;');
    } catch (e) {
      console.warn('Could not update PRAGMA user_version to 1:', e.message);
    }
  }
}

function initDatabase(dbPath) {
  if (dbInstance) return dbInstance;

  if (!DatabaseSync) {
    console.log('node:sqlite not available in this Node/Electron version. Using robust JSON database fallback.');
    const res = initJsonFallback(dbPath);
    generalInfoDb.initGeneralInfo(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint);
    accountsDb.initAccountsDb(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint, generalInfoDb);
    tradeFeaturesDb.initTradeFeatures(dbInstance, isJsonFallback, jsonData, saveJsonData);
    return res;
  }

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);

    db.exec('PRAGMA journal_mode = WAL;');

    // 1. Units
    db.exec(`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    // 2. Product Types
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    // 3. Product Categories
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    // 4. Product Sub Categories
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_sub_categories (
        id TEXT PRIMARY KEY,
        categoryId TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    // 5. Products (Master Product Catalog)
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        barcode TEXT DEFAULT '',
        additionalCode TEXT DEFAULT '',
        categoryId TEXT DEFAULT '',
        categoryName TEXT DEFAULT '',
        subCategoryId TEXT DEFAULT '',
        subCategoryName TEXT DEFAULT '',
        titleEng TEXT NOT NULL,
        titleUrdu TEXT DEFAULT '',
        packingType TEXT DEFAULT 'Piece',
        unitId TEXT DEFAULT '',
        unitName TEXT DEFAULT '',
        packSize REAL DEFAULT 1,
        purchasePrice REAL DEFAULT 0,
        profitMargin REAL DEFAULT 0,
        retailPrice REAL DEFAULT 0,
        wholesalePrice REAL DEFAULT 0,
        averageCost REAL DEFAULT 0,
        minStock REAL DEFAULT 0,
        reorderLevel REAL DEFAULT 0,
        stockQty REAL DEFAULT 0,
        location TEXT DEFAULT '',
        productType TEXT DEFAULT 'Both',
        taxPercent REAL DEFAULT 0,
        shortCode TEXT DEFAULT '',
        shortLabel TEXT DEFAULT '',
        description TEXT DEFAULT '',
        useBatchExpiry INTEGER DEFAULT 0,
        loosePackSize INTEGER DEFAULT 0,
        inActive INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // 6. Purchases (Header)
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        voucherNo TEXT UNIQUE NOT NULL,
        manualNo TEXT DEFAULT '',
        entryDate TEXT NOT NULL,
        partyId TEXT NOT NULL,
        partyTitle TEXT NOT NULL,
        description TEXT DEFAULT '',
        storeTitle TEXT DEFAULT 'Store',
        receivable REAL DEFAULT 0,
        contactPerson TEXT DEFAULT '',
        dueDate TEXT DEFAULT '',
        totalAmount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        freightDisc REAL DEFAULT 0,
        freightExpn REAL DEFAULT 0,
        salesTax REAL DEFAULT 0,
        extraCharges REAL DEFAULT 0,
        grandTotal REAL DEFAULT 0,
        itemsJson TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL
      );
    `);

    // 7. Purchase Items (Line Items)
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchaseId TEXT NOT NULL,
        srNo INTEGER DEFAULT 1,
        productId TEXT,
        productCode TEXT NOT NULL,
        productTitle TEXT NOT NULL,
        packQty REAL DEFAULT 0,
        unitQty REAL DEFAULT 0,
        bonus REAL DEFAULT 0,
        tradePrice REAL DEFAULT 0,
        profitMargin REAL DEFAULT 0,
        retailPrice REAL DEFAULT 0,
        wholesalePrice REAL DEFAULT 0,
        tradeOffer REAL DEFAULT 0,
        discountPercent REAL DEFAULT 0,
        netAmount REAL DEFAULT 0
      );
    `);

    // 8. Sales (Header)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        voucherNo TEXT UNIQUE NOT NULL,
        manualNo TEXT DEFAULT '',
        entryDate TEXT NOT NULL,
        partyId TEXT NOT NULL,
        partyTitle TEXT NOT NULL,
        customerPhone TEXT DEFAULT '',
        areaName TEXT DEFAULT '',
        description TEXT DEFAULT '',
        storeTitle TEXT DEFAULT 'Main Store',
        paymentType TEXT DEFAULT 'Cash',
        previousBalance REAL DEFAULT 0,
        grossAmount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        netAmount REAL DEFAULT 0,
        paidAmount REAL DEFAULT 0,
        balanceDue REAL DEFAULT 0,
        billStatus TEXT DEFAULT 'Paid',
        itemsJson TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL
      );
    `);

    // 9. Sale Items (Line items with Purchase & Wholesale rate visibility)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        saleId TEXT NOT NULL,
        srNo INTEGER DEFAULT 1,
        productId TEXT,
        productCode TEXT NOT NULL,
        productTitle TEXT NOT NULL,
        packSize REAL DEFAULT 1,
        packQty REAL DEFAULT 0,
        unitQty REAL DEFAULT 0,
        totalQty REAL DEFAULT 0,
        purchasePrice REAL DEFAULT 0,
        wholesalePrice REAL DEFAULT 0,
        retailPrice REAL DEFAULT 0,
        salePrice REAL DEFAULT 0,
        discountPercent REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        netAmount REAL DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);

    // 10. Sales Returns (Customer return vouchers)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id TEXT PRIMARY KEY,
        returnNo TEXT UNIQUE NOT NULL,
        saleVoucherRef TEXT DEFAULT '',
        entryDate TEXT NOT NULL,
        partyId TEXT NOT NULL,
        partyTitle TEXT NOT NULL,
        customerPhone TEXT DEFAULT '',
        areaName TEXT DEFAULT '',
        description TEXT DEFAULT '',
        refundMode TEXT DEFAULT 'Credit',
        totalItems INTEGER DEFAULT 0,
        totalPieces REAL DEFAULT 0,
        totalAmount REAL DEFAULT 0,
        paidRefund REAL DEFAULT 0,
        itemsJson TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL
      );
    `);

    // 11. Sale Return Items (Returned items that restore stock)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sale_return_items (
        id TEXT PRIMARY KEY,
        returnId TEXT NOT NULL,
        srNo INTEGER DEFAULT 1,
        productId TEXT,
        productCode TEXT NOT NULL,
        productTitle TEXT NOT NULL,
        packSize REAL DEFAULT 1,
        packQty REAL DEFAULT 0,
        unitQty REAL DEFAULT 0,
        totalQty REAL DEFAULT 0,
        returnRate REAL DEFAULT 0,
        netAmount REAL DEFAULT 0,
        condition TEXT DEFAULT 'Good',
        createdAt TEXT NOT NULL
      );
    `);

    // 11. Application Settings & Preferences
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sale_items_saleId ON sale_items (saleId);
      CREATE INDEX IF NOT EXISTS idx_sale_items_productId ON sale_items (productId);
      CREATE INDEX IF NOT EXISTS idx_purchase_items_purchaseId ON purchase_items (purchaseId);
      CREATE INDEX IF NOT EXISTS idx_purchase_items_productId ON purchase_items (productId);
      CREATE INDEX IF NOT EXISTS idx_sales_party_date ON sales (partyId, entryDate);
      CREATE INDEX IF NOT EXISTS idx_purchases_party_date ON purchases (partyId, entryDate);
      CREATE INDEX IF NOT EXISTS idx_sales_returns_party_date ON sales_returns (partyId, entryDate);
      CREATE INDEX IF NOT EXISTS idx_sale_return_items_returnId ON sale_return_items (returnId);
      CREATE INDEX IF NOT EXISTS idx_products_code ON products (code);
    `);

    // Run versioned additive schema migrations
    runAdditiveMigrations(db);

    seedDefaultAppSettings(db);

    dbInstance = db;
    generalInfoDb.initGeneralInfo(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint);
    accountsDb.initAccountsDb(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint, generalInfoDb);
    tradeFeaturesDb.initTradeFeatures(dbInstance, isJsonFallback, jsonData, saveJsonData);
    return dbInstance;
  } catch (err) {
    console.warn('SQLite init failed, falling back to JSON database:', err);
    const res = initJsonFallback(dbPath);
    generalInfoDb.initGeneralInfo(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint);
    accountsDb.initAccountsDb(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint, generalInfoDb);
    tradeFeaturesDb.initTradeFeatures(dbInstance, isJsonFallback, jsonData, saveJsonData);
    return res;
  }
}

// ============================================
// UNITS CRUD
// ============================================
function getAllUnits() {
  if (isJsonFallback) return [...jsonData.units].sort((a, b) => a.name.localeCompare(b.name));
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.prepare('SELECT * FROM units ORDER BY name ASC').all();
}

function saveUnit(unit) {
  const id = unit.id || `u-${Date.now()}`;
  const now = new Date().toISOString();
  if (isJsonFallback) {
    const idx = jsonData.units.findIndex(u => u.id === id);
    if (idx !== -1) {
      jsonData.units[idx] = { ...jsonData.units[idx], name: unit.name, symbol: unit.symbol || '' };
    } else {
      jsonData.units.push({ id, name: unit.name, symbol: unit.symbol || '', createdAt: now });
    }
    saveJsonData();
    return { success: true, id };
  }
  const existing = dbInstance.prepare('SELECT id FROM units WHERE id = ?').get(id);
  if (existing) {
    dbInstance.prepare('UPDATE units SET name = ?, symbol = ? WHERE id = ?').run(unit.name, unit.symbol || '', id);
  } else {
    dbInstance.prepare('INSERT INTO units (id, name, symbol, createdAt) VALUES (?, ?, ?, ?)').run(id, unit.name, unit.symbol || '', now);
  }
  checkpoint();
  return { success: true, id };
}

function deleteUnit(id) {
  if (isJsonFallback) {
    jsonData.units = jsonData.units.filter(u => u.id !== id);
    saveJsonData();
    return { success: true };
  }
  dbInstance.prepare('DELETE FROM units WHERE id = ?').run(id);
  checkpoint();
  return { success: true };
}

// ============================================
// PRODUCT TYPES CRUD
// ============================================
function getAllProductTypes() {
  if (isJsonFallback) return [...jsonData.product_types].sort((a, b) => a.name.localeCompare(b.name));
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.prepare('SELECT * FROM product_types ORDER BY name ASC').all();
}

function saveProductType(pt) {
  const id = pt.id || `pt-${Date.now()}`;
  const now = new Date().toISOString();
  if (isJsonFallback) {
    const idx = jsonData.product_types.findIndex(p => p.id === id);
    if (idx !== -1) {
      jsonData.product_types[idx] = { ...jsonData.product_types[idx], name: pt.name, description: pt.description || '' };
    } else {
      jsonData.product_types.push({ id, name: pt.name, description: pt.description || '', createdAt: now });
    }
    saveJsonData();
    return { success: true, id };
  }
  const existing = dbInstance.prepare('SELECT id FROM product_types WHERE id = ?').get(id);
  if (existing) {
    dbInstance.prepare('UPDATE product_types SET name = ?, description = ? WHERE id = ?').run(pt.name, pt.description || '', id);
  } else {
    dbInstance.prepare('INSERT INTO product_types (id, name, description, createdAt) VALUES (?, ?, ?, ?)').run(id, pt.name, pt.description || '', now);
  }
  checkpoint();
  return { success: true, id };
}

function deleteProductType(id) {
  if (isJsonFallback) {
    jsonData.product_types = jsonData.product_types.filter(p => p.id !== id);
    saveJsonData();
    return { success: true };
  }
  dbInstance.prepare('DELETE FROM product_types WHERE id = ?').run(id);
  checkpoint();
  return { success: true };
}

// ============================================
// PRODUCT CATEGORIES & SUB-CATEGORIES CRUD
// ============================================
function getAllProductCategories() {
  if (isJsonFallback) return [...jsonData.product_categories].sort((a, b) => a.name.localeCompare(b.name));
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.prepare('SELECT * FROM product_categories ORDER BY name ASC').all();
}

function saveProductCategory(cat) {
  const id = cat.id || `cat-${Date.now()}`;
  const now = new Date().toISOString();
  if (isJsonFallback) {
    const idx = jsonData.product_categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      jsonData.product_categories[idx] = { ...jsonData.product_categories[idx], name: cat.name, code: cat.code || '' };
    } else {
      jsonData.product_categories.push({ id, name: cat.name, code: cat.code || '', createdAt: now });
    }
    saveJsonData();
    return { success: true, id };
  }
  const existing = dbInstance.prepare('SELECT id FROM product_categories WHERE id = ?').get(id);
  if (existing) {
    dbInstance.prepare('UPDATE product_categories SET name = ?, code = ? WHERE id = ?').run(cat.name, cat.code || '', id);
  } else {
    dbInstance.prepare('INSERT INTO product_categories (id, name, code, createdAt) VALUES (?, ?, ?, ?)').run(id, cat.name, cat.code || '', now);
  }
  checkpoint();
  return { success: true, id };
}

function deleteProductCategory(id) {
  if (isJsonFallback) {
    jsonData.product_categories = jsonData.product_categories.filter(c => c.id !== id);
    jsonData.product_sub_categories = jsonData.product_sub_categories.filter(s => s.categoryId !== id);
    saveJsonData();
    return { success: true };
  }
  dbInstance.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
  dbInstance.prepare('DELETE FROM product_sub_categories WHERE categoryId = ?').run(id);
  checkpoint();
  return { success: true };
}

function getSubCategoriesByCategory(categoryId = null) {
  if (isJsonFallback) {
    let list = [...jsonData.product_sub_categories];
    if (categoryId) list = list.filter(s => s.categoryId === categoryId);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (!dbInstance) throw new Error('DB not initialized');
  if (categoryId) {
    return dbInstance.prepare('SELECT * FROM product_sub_categories WHERE categoryId = ? ORDER BY name ASC').all(categoryId);
  }
  return dbInstance.prepare('SELECT * FROM product_sub_categories ORDER BY name ASC').all();
}

function saveProductSubCategory(sub) {
  const id = sub.id || `sub-${Date.now()}`;
  const now = new Date().toISOString();
  if (isJsonFallback) {
    const idx = jsonData.product_sub_categories.findIndex(s => s.id === id);
    if (idx !== -1) {
      jsonData.product_sub_categories[idx] = {
        ...jsonData.product_sub_categories[idx],
        categoryId: sub.categoryId,
        name: sub.name,
        code: sub.code || ''
      };
    } else {
      jsonData.product_sub_categories.push({
        id,
        categoryId: sub.categoryId,
        name: sub.name,
        code: sub.code || '',
        createdAt: now
      });
    }
    saveJsonData();
    return { success: true, id };
  }
  const existing = dbInstance.prepare('SELECT id FROM product_sub_categories WHERE id = ?').get(id);
  if (existing) {
    dbInstance.prepare('UPDATE product_sub_categories SET categoryId = ?, name = ?, code = ? WHERE id = ?').run(sub.categoryId, sub.name, sub.code || '', id);
  } else {
    dbInstance.prepare('INSERT INTO product_sub_categories (id, categoryId, name, code, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, sub.categoryId, sub.name, sub.code || '', now);
  }
  checkpoint();
  return { success: true, id };
}

function deleteProductSubCategory(id) {
  if (isJsonFallback) {
    jsonData.product_sub_categories = jsonData.product_sub_categories.filter(s => s.id !== id);
    saveJsonData();
    return { success: true };
  }
  dbInstance.prepare('DELETE FROM product_sub_categories WHERE id = ?').run(id);
  checkpoint();
  return { success: true };
}

// ============================================
// PRODUCTS (PRODUCT INFO) CRUD
// ============================================
function getAllProducts() {
  if (isJsonFallback) return [...jsonData.products].sort((a, b) => a.code.localeCompare(b.code));
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.prepare('SELECT * FROM products ORDER BY CAST(code AS INTEGER) ASC, code ASC').all();
}

function getProductById(id) {
  if (isJsonFallback) return jsonData.products.find(p => p.id === id) || null;
  return dbInstance.prepare('SELECT * FROM products WHERE id = ?').get(id) || null;
}

function getProductByCode(code) {
  if (isJsonFallback) return jsonData.products.find(p => p.code === code) || null;
  return dbInstance.prepare('SELECT * FROM products WHERE code = ?').get(code) || null;
}

function getNextProductCode() {
  const prods = getAllProducts();
  if (!prods || prods.length === 0) return '101';
  const numericCodes = prods
    .map(p => parseInt(p.code, 10))
    .filter(n => !isNaN(n) && n >= 100);
  if (numericCodes.length === 0) return '101';
  const max = Math.max(...numericCodes);
  return String(max + 1);
}

function saveProduct(p) {
  const isNew = !p.id || p.isNew === true;
  let id = isNew ? `prod-${Date.now()}` : p.id;
  let code = String(p.code || '').trim();
  const now = new Date().toISOString();

  if (isNew) {
    if (!code) {
      code = getNextProductCode();
    } else {
      const codeTaken = isJsonFallback
        ? jsonData.products.some(pr => pr.code === code)
        : dbInstance.prepare('SELECT id FROM products WHERE code = ?').get(code);
      if (codeTaken) {
        // Auto-assign next code to prevent destructive overwrite of existing products
        code = getNextProductCode();
      }
    }
  } else {
    if (code) {
      const codeCollision = isJsonFallback
        ? jsonData.products.some(pr => pr.code === code && pr.id !== id)
        : dbInstance.prepare('SELECT id FROM products WHERE code = ? AND id != ?').get(code, id);
      if (codeCollision) {
        throw new Error(`Product Code [${code}] is already in use by another product! Please assign a unique code.`);
      }
    }
  }

  if (isJsonFallback) {
    const idx = jsonData.products.findIndex(pr => pr.id === id);
    const updatedRecord = {
      id,
      code,
      barcode: p.barcode || '',
      additionalCode: p.additionalCode || '',
      categoryId: p.categoryId || '',
      categoryName: p.categoryName || '',
      subCategoryId: p.subCategoryId || '',
      subCategoryName: p.subCategoryName || '',
      titleEng: p.titleEng || '',
      titleUrdu: p.titleUrdu || '',
      packingType: p.packingType || 'Piece',
      unitId: p.unitId || '',
      unitName: p.unitName || '',
      packSize: Number(p.packSize) || 1,
      purchasePrice: Number(p.purchasePrice) || 0,
      profitMargin: Number(p.profitMargin) || 0,
      retailPrice: Number(p.retailPrice) || 0,
      wholesalePrice: Number(p.wholesalePrice) || 0,
      averageCost: Number(p.averageCost) || 0,
      minStock: Number(p.minStock) || 0,
      reorderLevel: Number(p.reorderLevel) || 0,
      stockQty: Number(p.stockQty) || 0,
      location: p.location || '',
      productType: p.productType || 'Both',
      taxPercent: Number(p.taxPercent) || 0,
      shortCode: p.shortCode || '',
      shortLabel: p.shortLabel || '',
      description: p.description || '',
      useBatchExpiry: p.useBatchExpiry ? 1 : 0,
      loosePackSize: p.loosePackSize ? 1 : 0,
      inActive: p.inActive ? 1 : 0,
      createdAt: (idx !== -1 ? jsonData.products[idx].createdAt : now),
      updatedAt: now
    };

    if (idx !== -1) {
      jsonData.products[idx] = updatedRecord;
    } else {
      jsonData.products.push(updatedRecord);
    }
    saveJsonData();
    return { success: true, id, code };
  }

  const existing = !isNew ? dbInstance.prepare('SELECT id FROM products WHERE id = ?').get(id) : null;
  if (existing) {
    const stmt = dbInstance.prepare(`
      UPDATE products SET
        code = ?, barcode = ?, additionalCode = ?, categoryId = ?, categoryName = ?,
        subCategoryId = ?, subCategoryName = ?, titleEng = ?, titleUrdu = ?, packingType = ?, unitId = ?, unitName = ?,
        packSize = ?, purchasePrice = ?, profitMargin = ?, retailPrice = ?, wholesalePrice = ?, averageCost = ?,
        minStock = ?, reorderLevel = ?, stockQty = ?, location = ?, productType = ?, taxPercent = ?,
        shortCode = ?, shortLabel = ?, description = ?, useBatchExpiry = ?, loosePackSize = ?, inActive = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      code, p.barcode || '', p.additionalCode || '', p.categoryId || '', p.categoryName || '',
      p.subCategoryId || '', p.subCategoryName || '', p.titleEng || '', p.titleUrdu || '', p.packingType || 'Piece', p.unitId || '', p.unitName || '',
      Number(p.packSize) || 1, Number(p.purchasePrice) || 0, Number(p.profitMargin) || 0, Number(p.retailPrice) || 0, Number(p.wholesalePrice) || 0, Number(p.averageCost) || 0,
      Number(p.minStock) || 0, Number(p.reorderLevel) || 0, Number(p.stockQty) || 0, p.location || '', p.productType || 'Both', Number(p.taxPercent) || 0,
      p.shortCode || '', p.shortLabel || '', p.description || '', p.useBatchExpiry ? 1 : 0, p.loosePackSize ? 1 : 0, p.inActive ? 1 : 0, now,
      existing.id
    );
  } else {
    const stmt = dbInstance.prepare(`
      INSERT INTO products (
        id, code, barcode, additionalCode, categoryId, categoryName,
        subCategoryId, subCategoryName, titleEng, titleUrdu, packingType, unitId, unitName,
        packSize, purchasePrice, profitMargin, retailPrice, wholesalePrice, averageCost,
        minStock, reorderLevel, stockQty, location, productType, taxPercent,
        shortCode, shortLabel, description, useBatchExpiry, loosePackSize, inActive, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    stmt.run(
      id, code, p.barcode || '', p.additionalCode || '', p.categoryId || '', p.categoryName || '',
      p.subCategoryId || '', p.subCategoryName || '', p.titleEng || '', p.titleUrdu || '', p.packingType || 'Piece', p.unitId || '', p.unitName || '',
      Number(p.packSize) || 1, Number(p.purchasePrice) || 0, Number(p.profitMargin) || 0, Number(p.retailPrice) || 0, Number(p.wholesalePrice) || 0, Number(p.averageCost) || 0,
      Number(p.minStock) || 0, Number(p.reorderLevel) || 0, Number(p.stockQty) || 0, p.location || '', p.productType || 'Both', Number(p.taxPercent) || 0,
      p.shortCode || '', p.shortLabel || '', p.description || '', p.useBatchExpiry ? 1 : 0, p.loosePackSize ? 1 : 0, p.inActive ? 1 : 0, now, now
    );
  }
  checkpoint();
  return { success: true, id, code };
}

function deleteProduct(id) {
  if (isJsonFallback) {
    jsonData.products = jsonData.products.filter(p => p.id !== id && p.code !== id);
    saveJsonData();
    return { success: true };
  }
  dbInstance.prepare('DELETE FROM products WHERE id = ? OR code = ?').run(id, id);
  checkpoint();
  return { success: true };
}

function updateProductPrices(idOrCode, prices = {}) {
  const codeOrId = String(idOrCode || '').trim();
  if (!codeOrId) return { success: false, message: 'Invalid product' };
  const now = new Date().toISOString();

  const { purchasePrice, wholesalePrice, retailPrice } = prices;

  if (isJsonFallback) {
    const prod = jsonData.products.find(p => p.id === codeOrId || String(p.code) === codeOrId);
    if (!prod) return { success: false, message: 'Product not found' };
    if (purchasePrice !== undefined && Number(purchasePrice) >= 0) prod.purchasePrice = Number(purchasePrice);
    if (wholesalePrice !== undefined && Number(wholesalePrice) >= 0) prod.wholesalePrice = Number(wholesalePrice);
    if (retailPrice !== undefined && Number(retailPrice) >= 0) prod.retailPrice = Number(retailPrice);
    const tp = Number(prod.purchasePrice) || 0;
    const rp = Number(prod.retailPrice) || 0;
    prod.profitMargin = tp > 0 ? Number((((rp - tp) / tp) * 100).toFixed(1)) : 0;
    prod.updatedAt = now;
    saveJsonData();
    return { success: true, data: prod };
  }

  const prod = dbInstance.prepare('SELECT * FROM products WHERE id = ? OR code = ?').get(codeOrId, codeOrId);
  if (!prod) return { success: false, message: 'Product not found' };

  const newPP = (purchasePrice !== undefined && Number(purchasePrice) >= 0) ? Number(purchasePrice) : Number(prod.purchasePrice || 0);
  const newWP = (wholesalePrice !== undefined && Number(wholesalePrice) >= 0) ? Number(wholesalePrice) : Number(prod.wholesalePrice || 0);
  const newRP = (retailPrice !== undefined && Number(retailPrice) >= 0) ? Number(retailPrice) : Number(prod.retailPrice || 0);
  const margin = newPP > 0 ? Number((((newRP - newPP) / newPP) * 100).toFixed(1)) : 0;

  dbInstance.prepare(`
    UPDATE products SET
      purchasePrice = ?,
      wholesalePrice = ?,
      retailPrice = ?,
      profitMargin = ?,
      updatedAt = ?
    WHERE id = ? OR code = ?
  `).run(newPP, newWP, newRP, margin, now, prod.id, prod.code);
  checkpoint();
  return { success: true, id: prod.id, code: prod.code, purchasePrice: newPP, wholesalePrice: newWP, retailPrice: newRP, profitMargin: margin };
}

// ============================================
// PURCHASES CRUD & STOCK INWARD
// ============================================
function getAllPurchases() {
  if (isJsonFallback) {
    return [...jsonData.purchases].sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
  }
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.prepare('SELECT * FROM purchases ORDER BY entryDate DESC, createdAt DESC').all();
}

function getPurchaseById(id) {
  if (isJsonFallback) {
    const p = jsonData.purchases.find(pr => pr.id === id || pr.voucherNo === id);
    if (!p) return null;
    const items = jsonData.purchase_items.filter(it => it.purchaseId === p.id);
    return { ...p, items };
  }
  const p = dbInstance.prepare('SELECT * FROM purchases WHERE id = ? OR voucherNo = ?').get(id, id);
  if (!p) return null;
  const items = dbInstance.prepare('SELECT * FROM purchase_items WHERE purchaseId = ? ORDER BY srNo ASC').all(p.id);
  return { ...p, items };
}

function getNextPurchaseVoucherNo() {
  const purchases = getAllPurchases();
  if (!purchases || purchases.length === 0) return '101';
  const numericNos = purchases
    .map(p => {
      const match = String(p.voucherNo || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  if (numericNos.length === 0) return '101';
  const max = Math.max(...numericNos);
  return String(max + 1);
}

function savePurchase(purchaseData, items = []) {
  const id = purchaseData.id || `pur-${Date.now()}`;
  const voucherNo = String(purchaseData.voucherNo || '').trim() || getNextPurchaseVoucherNo();
  const now = new Date().toISOString();
  const itemsJson = JSON.stringify(items);

  if (isJsonFallback) {
    const pIdx = jsonData.purchases.findIndex(p => p.id === id || p.voucherNo === voucherNo);
    const purchaseRecord = {
      id,
      voucherNo,
      manualNo: purchaseData.manualNo || '',
      entryDate: purchaseData.entryDate || new Date().toISOString().split('T')[0],
      partyId: purchaseData.partyId || '',
      partyTitle: purchaseData.partyTitle || '',
      description: purchaseData.description || '',
      storeTitle: purchaseData.storeTitle || 'Store',
      receivable: Number(purchaseData.receivable) || 0,
      contactPerson: purchaseData.contactPerson || '',
      dueDate: purchaseData.dueDate || '',
      totalAmount: Number(purchaseData.totalAmount) || 0,
      discount: Number(purchaseData.discount) || 0,
      freightDisc: Number(purchaseData.freightDisc) || 0,
      freightExpn: Number(purchaseData.freightExpn) || 0,
      salesTax: Number(purchaseData.salesTax) || 0,
      extraCharges: Number(purchaseData.extraCharges) || 0,
      grandTotal: Number(purchaseData.grandTotal) || 0,
      itemsJson,
      createdAt: pIdx !== -1 ? jsonData.purchases[pIdx].createdAt : now
    };

    let oldGrandTotal = 0;
    let oldPartyId = '';
    if (pIdx !== -1) {
      const oldPur = jsonData.purchases[pIdx];
      oldGrandTotal = Number(oldPur.grandTotal) || 0;
      oldPartyId = oldPur.partyId || '';
      const oldItems = jsonData.purchase_items.filter(pi => pi.purchaseId === oldPur.id);
      for (const oldIt of oldItems) {
        let packSize = 1;
        const prod = jsonData.products.find(p => p.code === oldIt.productCode || p.id === oldIt.productId);
        if (prod && Number(prod.packSize) > 0) packSize = Number(prod.packSize);
        const oldIncoming = (Number(oldIt.packQty || 0) * packSize) + Number(oldIt.unitQty || 0) + Number(oldIt.bonus || 0);
        if (prod && oldIncoming > 0) {
          prod.stockQty = Math.max(0, (Number(prod.stockQty) || 0) - oldIncoming);
        }
      }
      jsonData.purchases[pIdx] = purchaseRecord;
    } else {
      jsonData.purchases.push(purchaseRecord);
    }

    jsonData.purchase_items = jsonData.purchase_items.filter(pi => pi.purchaseId !== id);
    let sr = 1;
    for (const item of items) {
      const code = String(item.productCode || item.code || '').trim();
      const tp = Number(item.tradePrice || item.tp || 0);
      let packSize = Number(item.packSize) || 0;
      if (packSize <= 0 && code) {
        const pRec = jsonData.products.find(p => p.code === code || p.id === item.productId);
        if (pRec && pRec.packSize > 0) packSize = Number(pRec.packSize);
      }
      if (packSize <= 0) packSize = 1;
      const incomingQty = (Number(item.packQty || item.pQty || 0) * packSize) + Number(item.unitQty || item.uQty || 0) + Number(item.bonus || 0);

      jsonData.purchase_items.push({
        id: `pi-${Date.now()}-${sr}`,
        purchaseId: id,
        srNo: sr,
        productId: item.productId || '',
        productCode: code,
        productTitle: item.productTitle || '',
        packQty: Number(item.packQty || item.pQty || 0),
        unitQty: Number(item.unitQty || item.uQty || 0),
        bonus: Number(item.bonus || 0),
        tradePrice: tp,
        profitMargin: Number(item.profitMargin || item.proPercent || 0),
        retailPrice: Number(item.retailPrice || item.rp || 0),
        wholesalePrice: Number(item.wholesalePrice || item.wp || 0),
        tradeOffer: Number(item.tradeOffer || item.to || 0),
        discountPercent: Number(item.discountPercent || item.discPercent || 0),
        netAmount: Number(item.netAmount || 0)
      });

      if (incomingQty > 0 && code) {
        const prod = jsonData.products.find(p => p.code === code || p.id === item.productId);
        if (prod) {
          const prevStock = Number(prod.stockQty) || 0;
          prod.stockQty = prevStock + incomingQty;
          if (tp > 0) {
            prod.purchasePrice = tp;
            const prevCost = Number(prod.averageCost || prod.purchasePrice) || tp;
            prod.averageCost = prevStock > 0 ? Number((((prevStock * prevCost) + (incomingQty * tp)) / (prevStock + incomingQty)).toFixed(2)) : tp;
          }
          const wpJson = Number(item.wholesalePrice || item.wp || 0);
          const rpJson = Number(item.retailPrice || item.rp || 0);
          if (wpJson > 0) prod.wholesalePrice = wpJson;
          if (rpJson > 0) prod.retailPrice = rpJson;
          if (Number(prod.purchasePrice) > 0 && Number(prod.retailPrice) > 0) {
            prod.profitMargin = Number((((prod.retailPrice - prod.purchasePrice) / prod.purchasePrice) * 100).toFixed(1));
          }
        }
      }
      sr++;
    }

    saveJsonData();
    const isRegParty = purchaseData.partyId && purchaseData.partyId !== 'walk-in' && !purchaseData.partyId.startsWith('pt-');
    if (pIdx !== -1) {
      if (oldPartyId === purchaseData.partyId) {
        const delta = (Number(purchaseData.grandTotal) || 0) - oldGrandTotal;
        if (delta !== 0 && isRegParty) {
          generalInfoDb.updatePartyBalance(purchaseData.partyId, delta);
        }
      } else {
        if (oldPartyId && oldPartyId !== 'walk-in' && !oldPartyId.startsWith('pt-') && oldGrandTotal > 0) {
          generalInfoDb.updatePartyBalance(oldPartyId, -oldGrandTotal);
        }
        if (isRegParty && (Number(purchaseData.grandTotal) || 0) > 0) {
          generalInfoDb.updatePartyBalance(purchaseData.partyId, Number(purchaseData.grandTotal));
        }
      }
    } else if (isRegParty && Number(purchaseData.grandTotal) > 0) {
      generalInfoDb.updatePartyBalance(purchaseData.partyId, Number(purchaseData.grandTotal));
    }
    return { success: true, id, voucherNo };
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    let oldGrandTotal = 0;
    let oldPartyId = '';
    const existing = dbInstance.prepare('SELECT id, grandTotal, partyId FROM purchases WHERE id = ? OR voucherNo = ?').get(id, voucherNo);
    if (existing) {
      oldGrandTotal = Number(existing.grandTotal) || 0;
      oldPartyId = existing.partyId || '';
      const oldItems = dbInstance.prepare('SELECT productCode, productId, packQty, unitQty, bonus FROM purchase_items WHERE purchaseId = ?').all(existing.id);
      for (const oldIt of oldItems) {
        let packSize = 1;
        const pRec = dbInstance.prepare('SELECT packSize FROM products WHERE code = ? OR id = ?').get(oldIt.productCode || '', oldIt.productId || '');
        if (pRec && Number(pRec.packSize) > 0) packSize = Number(pRec.packSize);
        const oldIncoming = (Number(oldIt.packQty || 0) * packSize) + Number(oldIt.unitQty || 0) + Number(oldIt.bonus || 0);
        if (oldIncoming > 0) {
          dbInstance.prepare('UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?').run(oldIncoming, oldIt.productCode || '', oldIt.productId || '');
        }
      }

      const stmt = dbInstance.prepare(`
        UPDATE purchases SET
          voucherNo = ?, manualNo = ?, entryDate = ?, partyId = ?, partyTitle = ?,
          description = ?, storeTitle = ?, receivable = ?, contactPerson = ?, dueDate = ?,
          totalAmount = ?, discount = ?, freightDisc = ?, freightExpn = ?, salesTax = ?,
          extraCharges = ?, grandTotal = ?, itemsJson = ?
        WHERE id = ?
      `);
      stmt.run(
        voucherNo, purchaseData.manualNo || '', purchaseData.entryDate || '', purchaseData.partyId || '', purchaseData.partyTitle || '',
        purchaseData.description || '', purchaseData.storeTitle || 'Store', Number(purchaseData.receivable) || 0, purchaseData.contactPerson || '', purchaseData.dueDate || '',
        Number(purchaseData.totalAmount) || 0, Number(purchaseData.discount) || 0, Number(purchaseData.freightDisc) || 0, Number(purchaseData.freightExpn) || 0, Number(purchaseData.salesTax) || 0,
        Number(purchaseData.extraCharges) || 0, Number(purchaseData.grandTotal) || 0, itemsJson,
        existing.id
      );
      dbInstance.prepare('DELETE FROM purchase_items WHERE purchaseId = ?').run(existing.id);
    } else {
      const stmt = dbInstance.prepare(`
        INSERT INTO purchases (
          id, voucherNo, manualNo, entryDate, partyId, partyTitle,
          description, storeTitle, receivable, contactPerson, dueDate,
          totalAmount, discount, freightDisc, freightExpn, salesTax,
          extraCharges, grandTotal, itemsJson, createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);
      stmt.run(
        id, voucherNo, purchaseData.manualNo || '', purchaseData.entryDate || '', purchaseData.partyId || '', purchaseData.partyTitle || '',
        purchaseData.description || '', purchaseData.storeTitle || 'Store', Number(purchaseData.receivable) || 0, purchaseData.contactPerson || '', purchaseData.dueDate || '',
        Number(purchaseData.totalAmount) || 0, Number(purchaseData.discount) || 0, Number(purchaseData.freightDisc) || 0, Number(purchaseData.freightExpn) || 0, Number(purchaseData.salesTax) || 0,
        Number(purchaseData.extraCharges) || 0, Number(purchaseData.grandTotal) || 0, itemsJson, now
      );
    }

    const insertItem = dbInstance.prepare(`
      INSERT INTO purchase_items (
        id, purchaseId, srNo, productId, productCode, productTitle,
        packQty, unitQty, bonus, tradePrice, profitMargin,
        retailPrice, wholesalePrice, tradeOffer, discountPercent, netAmount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateProductStock = dbInstance.prepare(`
      UPDATE products SET
        stockQty = stockQty + ?,
        purchasePrice = CASE WHEN ? > 0 THEN ? ELSE purchasePrice END,
        wholesalePrice = CASE WHEN ? > 0 THEN ? ELSE wholesalePrice END,
        retailPrice = CASE WHEN ? > 0 THEN ? ELSE retailPrice END,
        profitMargin = CASE WHEN ? > 0 AND ? > 0 THEN ROUND(((CAST(? AS REAL) - CAST(? AS REAL)) / CAST(? AS REAL)) * 100, 1) ELSE profitMargin END
      WHERE code = ? OR id = ?
    `);

    let sr = 1;
    for (const item of items) {
      const itemId = `pi-${Date.now()}-${sr}`;
      const code = String(item.productCode || item.code || '').trim();
      const tp = Number(item.tradePrice || item.tp || 0);
      const wp = Number(item.wholesalePrice || item.wp || 0);
      const rp = Number(item.retailPrice || item.rp || 0);
      let packSize = Number(item.packSize) || 0;
      if (packSize <= 0 && code) {
        const pRec = dbInstance.prepare('SELECT packSize FROM products WHERE code = ? OR id = ?').get(code, item.productId || '');
        if (pRec && pRec.packSize > 0) packSize = Number(pRec.packSize);
      }
      if (packSize <= 0) packSize = 1;
      const incomingQty = (Number(item.packQty || item.pQty || 0) * packSize) + Number(item.unitQty || item.uQty || 0) + Number(item.bonus || 0);

      insertItem.run(
        itemId, id, sr, item.productId || '', code, item.productTitle || '',
        Number(item.packQty || item.pQty || 0), Number(item.unitQty || item.uQty || 0), Number(item.bonus || 0),
        tp, Number(item.profitMargin || item.proPercent || 0),
        rp, wp,
        Number(item.tradeOffer || item.to || 0), Number(item.discountPercent || item.discPercent || 0),
        Number(item.netAmount || 0)
      );

      if (incomingQty > 0 && code) {
        updateProductStock.run(incomingQty, tp, tp, wp, wp, rp, rp, tp, rp, rp, tp, tp, code, item.productId || '');
        if (tp > 0) {
          const pRec = dbInstance.prepare('SELECT stockQty, averageCost, purchasePrice FROM products WHERE code = ? OR id = ?').get(code, item.productId || '');
          if (pRec) {
            const prevStock = Math.max(0, (Number(pRec.stockQty) || 0) - incomingQty);
            const prevCost = Number(pRec.averageCost || pRec.purchasePrice) || tp;
            const wac = prevStock > 0 ? (((prevStock * prevCost) + (incomingQty * tp)) / (prevStock + incomingQty)) : tp;
            dbInstance.prepare('UPDATE products SET averageCost = ? WHERE code = ? OR id = ?').run(Number(wac.toFixed(2)), code, item.productId || '');
          }
        }
      }
      sr++;
    }

    dbInstance.exec('COMMIT;');
    checkpoint();
    const isRegPartySql = purchaseData.partyId && purchaseData.partyId !== 'walk-in' && !purchaseData.partyId.startsWith('pt-');
    if (existing) {
      if (oldPartyId === purchaseData.partyId) {
        const delta = (Number(purchaseData.grandTotal) || 0) - oldGrandTotal;
        if (delta !== 0 && isRegPartySql) {
          generalInfoDb.updatePartyBalance(purchaseData.partyId, delta);
        }
      } else {
        if (oldPartyId && oldPartyId !== 'walk-in' && !oldPartyId.startsWith('pt-') && oldGrandTotal > 0) {
          generalInfoDb.updatePartyBalance(oldPartyId, -oldGrandTotal);
        }
        if (isRegPartySql && (Number(purchaseData.grandTotal) || 0) > 0) {
          generalInfoDb.updatePartyBalance(purchaseData.partyId, Number(purchaseData.grandTotal));
        }
      }
    } else if (isRegPartySql && Number(purchaseData.grandTotal) > 0) {
      generalInfoDb.updatePartyBalance(purchaseData.partyId, Number(purchaseData.grandTotal));
    }
    return { success: true, id, voucherNo };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function deletePurchase(id) {
  if (isJsonFallback) {
    const p = jsonData.purchases.find(pr => pr.id === id || pr.voucherNo === id);
    if (p) {
      const isRegParty = p.partyId && p.partyId !== 'walk-in' && !p.partyId.startsWith('pt-');
      if (isRegParty && Number(p.grandTotal) > 0) {
        generalInfoDb.updatePartyBalance(p.partyId, -Number(p.grandTotal));
      }
      const items = jsonData.purchase_items.filter(pi => pi.purchaseId === p.id);
      for (const it of items) {
        let packSize = 1;
        const prod = jsonData.products.find(pr => pr.code === it.productCode || pr.id === it.productId);
        if (prod && Number(prod.packSize) > 0) packSize = Number(prod.packSize);
        const incoming = (Number(it.packQty || 0) * packSize) + Number(it.unitQty || 0) + Number(it.bonus || 0);
        if (prod && incoming > 0) {
          prod.stockQty = Math.max(0, (Number(prod.stockQty) || 0) - incoming);
        }
      }
      jsonData.purchases = jsonData.purchases.filter(pr => pr.id !== p.id);
      jsonData.purchase_items = jsonData.purchase_items.filter(pi => pi.purchaseId !== p.id);
      saveJsonData();
    }
    return { success: true };
  }
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const p = dbInstance.prepare('SELECT id, partyId, grandTotal FROM purchases WHERE id = ? OR voucherNo = ?').get(id, id);
    if (p) {
      const isRegPartySql = p.partyId && p.partyId !== 'walk-in' && !p.partyId.startsWith('pt-');
      if (isRegPartySql && Number(p.grandTotal) > 0) {
        generalInfoDb.updatePartyBalance(p.partyId, -Number(p.grandTotal));
      }
      const items = dbInstance.prepare('SELECT productCode, productId, packQty, unitQty, bonus FROM purchase_items WHERE purchaseId = ?').all(p.id);
      for (const it of items) {
        let packSize = 1;
        const pRec = dbInstance.prepare('SELECT packSize FROM products WHERE code = ? OR id = ?').get(it.productCode || '', it.productId || '');
        if (pRec && Number(pRec.packSize) > 0) packSize = Number(pRec.packSize);
        const incoming = (Number(it.packQty || 0) * packSize) + Number(it.unitQty || 0) + Number(it.bonus || 0);
        if (incoming > 0) {
          dbInstance.prepare('UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?').run(incoming, it.productCode || '', it.productId || '');
        }
      }
      dbInstance.prepare('DELETE FROM purchase_items WHERE purchaseId = ?').run(p.id);
      dbInstance.prepare('DELETE FROM purchases WHERE id = ?').run(p.id);
    }
    dbInstance.exec('COMMIT;');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

// ============================================
// SALES CRUD & STOCK OUTWARD (WITH RATES VISIBILITY)
// ============================================
function getAllSales() {
  if (isJsonFallback) {
    return [...jsonData.sales].sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
  }
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.prepare('SELECT * FROM sales ORDER BY entryDate DESC, createdAt DESC').all();
}

function getSaleById(id) {
  if (isJsonFallback) {
    const s = jsonData.sales.find(sr => sr.id === id || sr.voucherNo === id);
    if (!s) return null;
    const items = jsonData.sale_items.filter(it => it.saleId === s.id);
    return { ...s, items };
  }
  const s = dbInstance.prepare('SELECT * FROM sales WHERE id = ? OR voucherNo = ?').get(id, id);
  if (!s) return null;
  const items = dbInstance.prepare('SELECT * FROM sale_items WHERE saleId = ? ORDER BY srNo ASC').all(s.id);
  return { ...s, items };
}

function getNextSaleVoucherNo() {
  const sales = getAllSales();
  if (!sales || sales.length === 0) return 'SV-0001';
  const numericNos = sales
    .map(s => {
      const match = String(s.voucherNo || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter(n => !isNaN(n) && n > 0);
  if (numericNos.length === 0) return 'SV-0001';
  const max = Math.max(...numericNos);
  return 'SV-' + String(max + 1).padStart(4, '0');
}

function saveSale(saleData, items = []) {
  const id = saleData.id || `sale-${Date.now()}`;
  const voucherNo = String(saleData.voucherNo || '').trim() || getNextSaleVoucherNo();
  const now = new Date().toISOString();
  const itemsJson = JSON.stringify(items);

  const billStatus = saleData.billStatus === 'Estimated' ? 'Estimated' : 'Paid';
  const isEstimated = (billStatus === 'Estimated');

  const saleRecord = {
    id,
    voucherNo,
    manualNo: saleData.manualNo || '',
    entryDate: saleData.entryDate || new Date().toISOString().split('T')[0],
    partyId: saleData.partyId || '',
    partyTitle: saleData.partyTitle || '',
    customerPhone: saleData.customerPhone || '',
    areaName: saleData.areaName || '',
    description: saleData.description || '',
    storeTitle: saleData.storeTitle || 'Main Store',
    paymentType: saleData.paymentType || 'Cash',
    previousBalance: Number(saleData.previousBalance) || 0,
    grossAmount: Number(saleData.grossAmount) || 0,
    discount: Number(saleData.discount) || 0,
    netAmount: Number(saleData.netAmount) || 0,
    paidAmount: Number(saleData.paidAmount) || 0,
    balanceDue: Number(saleData.balanceDue) || 0,
    billStatus,
    itemsJson,
    createdAt: now
  };

  if (isJsonFallback) {
    let oldBalanceDue = 0;
    let oldPartyId = '';
    const existing = jsonData.sales.find(s => s.id === id || s.voucherNo === voucherNo);
    if (existing) {
      oldBalanceDue = Number(existing.balanceDue) || 0;
      oldPartyId = existing.partyId || '';
      const wasEstimated = (existing.billStatus === 'Estimated');
      if (!wasEstimated) {
        const oldItems = jsonData.sale_items.filter(it => it.saleId === existing.id);
        for (const oldIt of oldItems) {
          const prod = jsonData.products.find(p => p.id === oldIt.productId || p.code === oldIt.productCode);
          if (prod) {
            prod.stockQty = (Number(prod.stockQty) || 0) + (Number(oldIt.totalQty) || 0);
          }
        }
      }
      jsonData.sales = jsonData.sales.filter(s => s.id !== existing.id);
      jsonData.sale_items = jsonData.sale_items.filter(it => it.saleId !== existing.id);
      saleRecord.createdAt = existing.createdAt;
    }


    jsonData.sales.unshift(saleRecord);

    let sr = 1;
    for (const item of items) {
      const code = String(item.productCode || item.code || '').trim();
      let packSize = Number(item.packSize) || 1;
      const packQty = Number(item.packQty || 0);
      const unitQty = Number(item.unitQty || 0);
      const totalQty = (packQty * packSize) + unitQty;
      const salePrice = Number(item.salePrice || item.retailPrice || 0);
      const purchasePrice = Number(item.purchasePrice || 0);
      const wholesalePrice = Number(item.wholesalePrice || 0);
      const retailPrice = Number(item.retailPrice || 0);
      const discountPercent = Number(item.discountPercent || 0);
      const discountAmount = Number(item.discountAmount || 0);
      const netAmount = Number(item.netAmount || (totalQty * salePrice - discountAmount));

      jsonData.sale_items.push({
        id: `si-${Date.now()}-${sr}`,
        saleId: id,
        srNo: sr,
        productId: item.productId || '',
        productCode: code,
        productTitle: item.productTitle || '',
        packSize,
        packQty,
        unitQty,
        totalQty,
        purchasePrice,
        wholesalePrice,
        retailPrice,
        salePrice,
        discountPercent,
        discountAmount,
        netAmount,
        createdAt: now
      });

      if (!isEstimated && totalQty > 0) {
        const prod = jsonData.products.find(p => (code && p.code === code) || (item.productId && p.id === item.productId));
        if (prod) {
          prod.stockQty = Math.max(0, (Number(prod.stockQty) || 0) - totalQty);
        }
      }
      sr++;
    }

    saveJsonData();
    const isRegParty = saleRecord.partyId && saleRecord.partyId !== 'walk-in' && !saleRecord.partyId.startsWith('pt-');
    if (isEstimated) {
      // If converting from a previously paid bill with balance due, revert the old balance
      if (existing && existing.billStatus !== 'Estimated' && oldBalanceDue > 0 && oldPartyId && oldPartyId !== 'walk-in' && !oldPartyId.startsWith('pt-')) {
        generalInfoDb.updatePartyBalance(oldPartyId, -oldBalanceDue);
      }
    } else if (existing) {
      if (existing.billStatus === 'Estimated') {
        if (isRegParty && (Number(saleRecord.balanceDue) || 0) > 0) {
          generalInfoDb.updatePartyBalance(saleRecord.partyId, Number(saleRecord.balanceDue) || 0);
        }
      } else if (oldPartyId === saleRecord.partyId) {
        const delta = (Number(saleRecord.balanceDue) || 0) - oldBalanceDue;
        if (delta !== 0 && isRegParty) {
          generalInfoDb.updatePartyBalance(saleRecord.partyId, delta);
        }
      } else {
        if (oldPartyId && oldPartyId !== 'walk-in' && !oldPartyId.startsWith('pt-') && oldBalanceDue > 0) {
          generalInfoDb.updatePartyBalance(oldPartyId, -oldBalanceDue);
        }
        if (isRegParty && (Number(saleRecord.balanceDue) || 0) > 0) {
          generalInfoDb.updatePartyBalance(saleRecord.partyId, Number(saleRecord.balanceDue) || 0);
        }
      }
    } else if (isRegParty && (Number(saleRecord.balanceDue) || 0) > 0) {
      generalInfoDb.updatePartyBalance(saleRecord.partyId, Number(saleRecord.balanceDue) || 0);
    }
    return { success: true, id, voucherNo };
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    let oldBalanceDue = 0;
    let oldPartyId = '';
    const existing = dbInstance.prepare('SELECT id, createdAt, balanceDue, partyId, billStatus FROM sales WHERE id = ? OR voucherNo = ?').get(id, voucherNo);
    if (existing) {
      oldBalanceDue = Number(existing.balanceDue) || 0;
      oldPartyId = existing.partyId || '';
      const wasEstimated = (existing.billStatus === 'Estimated');
      if (!wasEstimated) {
        const oldItems = dbInstance.prepare('SELECT productId, productCode, totalQty FROM sale_items WHERE saleId = ?').all(existing.id);
        for (const oldIt of oldItems) {
          dbInstance.prepare(`
            UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?
          `).run(Number(oldIt.totalQty) || 0, oldIt.productCode || '', oldIt.productId || '');
        }
      }
      dbInstance.prepare('DELETE FROM sale_items WHERE saleId = ?').run(existing.id);
    }


    const actualSaleId = existing ? existing.id : id;
    if (existing) {
      dbInstance.prepare(`
        UPDATE sales SET
          voucherNo = ?, manualNo = ?, entryDate = ?, partyId = ?, partyTitle = ?,
          customerPhone = ?, areaName = ?, description = ?, storeTitle = ?, paymentType = ?,
          previousBalance = ?, grossAmount = ?, discount = ?, netAmount = ?,
          paidAmount = ?, balanceDue = ?, billStatus = ?, itemsJson = ?
        WHERE id = ?
      `).run(
        voucherNo, saleRecord.manualNo, saleRecord.entryDate, saleRecord.partyId, saleRecord.partyTitle,
        saleRecord.customerPhone, saleRecord.areaName, saleRecord.description, saleRecord.storeTitle, saleRecord.paymentType,
        saleRecord.previousBalance, saleRecord.grossAmount, saleRecord.discount, saleRecord.netAmount,
        saleRecord.paidAmount, saleRecord.balanceDue, billStatus, itemsJson, actualSaleId
      );
    } else {
      dbInstance.prepare(`
        INSERT INTO sales (
          id, voucherNo, manualNo, entryDate, partyId, partyTitle,
          customerPhone, areaName, description, storeTitle, paymentType,
          previousBalance, grossAmount, discount, netAmount,
          paidAmount, balanceDue, billStatus, itemsJson, createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        actualSaleId, voucherNo, saleRecord.manualNo, saleRecord.entryDate, saleRecord.partyId, saleRecord.partyTitle,
        saleRecord.customerPhone, saleRecord.areaName, saleRecord.description, saleRecord.storeTitle, saleRecord.paymentType,
        saleRecord.previousBalance, saleRecord.grossAmount, saleRecord.discount, saleRecord.netAmount,
        saleRecord.paidAmount, saleRecord.balanceDue, billStatus, itemsJson, now
      );
    }

    const insertItem = dbInstance.prepare(`
      INSERT INTO sale_items (
        id, saleId, srNo, productId, productCode, productTitle,
        packSize, packQty, unitQty, totalQty,
        purchasePrice, wholesalePrice, retailPrice, salePrice,
        discountPercent, discountAmount, netAmount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deductStock = dbInstance.prepare(`
      UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?
    `);

    let sr = 1;
    for (const item of items) {
      const itemId = `si-${Date.now()}-${sr}`;
      const code = String(item.productCode || item.code || '').trim();
      let packSize = Number(item.packSize) || 1;
      const packQty = Number(item.packQty || 0);
      const unitQty = Number(item.unitQty || 0);
      const totalQty = (packQty * packSize) + unitQty;
      const salePrice = Number(item.salePrice || item.retailPrice || 0);
      const purchasePrice = Number(item.purchasePrice || 0);
      const wholesalePrice = Number(item.wholesalePrice || 0);
      const retailPrice = Number(item.retailPrice || 0);
      const discountPercent = Number(item.discountPercent || 0);
      const discountAmount = Number(item.discountAmount || 0);
      const netAmount = Number(item.netAmount || (totalQty * salePrice - discountAmount));

      insertItem.run(
        itemId, actualSaleId, sr, item.productId || '', code, item.productTitle || '',
        packSize, packQty, unitQty, totalQty,
        purchasePrice, wholesalePrice, retailPrice, salePrice,
        discountPercent, discountAmount, netAmount, now
      );

      if (!isEstimated && totalQty > 0) {
        deductStock.run(totalQty, code, item.productId || '');
      }
      sr++;
    }

    dbInstance.exec('COMMIT;');
    checkpoint();
    const isRegPartySql = saleRecord.partyId && saleRecord.partyId !== 'walk-in' && !saleRecord.partyId.startsWith('pt-');
    if (isEstimated) {
      // If converting from a previously paid bill, revert the old balance
      if (existing && existing.billStatus !== 'Estimated' && oldBalanceDue > 0 && oldPartyId && oldPartyId !== 'walk-in' && !oldPartyId.startsWith('pt-')) {
        generalInfoDb.updatePartyBalance(oldPartyId, -oldBalanceDue);
      }
    } else if (existing) {
      if (existing.billStatus === 'Estimated') {
        if (isRegPartySql && (Number(saleRecord.balanceDue) || 0) > 0) {
          generalInfoDb.updatePartyBalance(saleRecord.partyId, Number(saleRecord.balanceDue) || 0);
        }
      } else if (oldPartyId === saleRecord.partyId) {
        const delta = (Number(saleRecord.balanceDue) || 0) - oldBalanceDue;
        if (delta !== 0 && isRegPartySql) {
          generalInfoDb.updatePartyBalance(saleRecord.partyId, delta);
        }
      } else {
        if (oldPartyId && oldPartyId !== 'walk-in' && !oldPartyId.startsWith('pt-') && oldBalanceDue > 0) {
          generalInfoDb.updatePartyBalance(oldPartyId, -oldBalanceDue);
        }
        if (isRegPartySql && (Number(saleRecord.balanceDue) || 0) > 0) {
          generalInfoDb.updatePartyBalance(saleRecord.partyId, Number(saleRecord.balanceDue) || 0);
        }
      }
    } else if (isRegPartySql && (Number(saleRecord.balanceDue) || 0) > 0) {
      generalInfoDb.updatePartyBalance(saleRecord.partyId, Number(saleRecord.balanceDue) || 0);
    }
    return { success: true, id: actualSaleId, voucherNo };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function deleteSale(id) {
  if (isJsonFallback) {
    const existing = jsonData.sales.find(s => s.id === id || s.voucherNo === id);
    if (existing) {
      const wasEstimated = (existing.billStatus === 'Estimated');
      if (!wasEstimated) {
        if (existing.balanceDue > 0 && existing.partyId) {
          generalInfoDb.updatePartyBalance(existing.partyId, -Number(existing.balanceDue));
        }
        const items = jsonData.sale_items.filter(it => it.saleId === existing.id);
        for (const it of items) {
          const prod = jsonData.products.find(p => p.id === it.productId || p.code === it.productCode);
          if (prod) {
            prod.stockQty = (Number(prod.stockQty) || 0) + (Number(it.totalQty) || 0);
          }
        }
      }
      jsonData.sales = jsonData.sales.filter(s => s.id !== existing.id);
      jsonData.sale_items = jsonData.sale_items.filter(it => it.saleId !== existing.id);
      saveJsonData();
    }
    return { success: true };
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const s = dbInstance.prepare('SELECT id, partyId, balanceDue, billStatus FROM sales WHERE id = ? OR voucherNo = ?').get(id, id);
    if (s) {
      const wasEstimated = (s.billStatus === 'Estimated');
      if (!wasEstimated) {
        if (s.balanceDue > 0 && s.partyId) {
          generalInfoDb.updatePartyBalance(s.partyId, -Number(s.balanceDue));
        }
        const items = dbInstance.prepare('SELECT productId, productCode, totalQty FROM sale_items WHERE saleId = ?').all(s.id);
        for (const it of items) {
          dbInstance.prepare(`
            UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?
          `).run(Number(it.totalQty) || 0, it.productCode || '', it.productId || '');
        }
      }
      dbInstance.prepare('DELETE FROM sale_items WHERE saleId = ?').run(s.id);
      dbInstance.prepare('DELETE FROM sales WHERE id = ?').run(s.id);
    }
    dbInstance.exec('COMMIT;');
    checkpoint();
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function getAllData() {
  return {
    units: getAllUnits(),
    product_types: getAllProductTypes(),
    product_categories: getAllProductCategories(),
    product_sub_categories: getSubCategoriesByCategory(),
    products: getAllProducts(),
    purchases: getAllPurchases(),
    sales: getAllSales(),
    sales_returns: getAllSaleReturns(),
    parties: generalInfoDb.getParties ? generalInfoDb.getParties() : [],
    party_types: generalInfoDb.getPartyTypes ? generalInfoDb.getPartyTypes() : [],
    areas: generalInfoDb.getAreas ? generalInfoDb.getAreas() : [],
    provinces: generalInfoDb.getProvinces ? generalInfoDb.getProvinces() : [],
    company_info: generalInfoDb.getCompanyInfo ? generalInfoDb.getCompanyInfo() : null,
    vouchers: accountsDb.getAllVouchers ? accountsDb.getAllVouchers() : []
  };
}

function getReportsMasterData() {
  return {
    sales: getAllSales(),
    purchases: getAllPurchases(),
    products: getAllProducts(),
    returns: getAllSaleReturns(),
    categories: getAllProductCategories(),
    subCategories: getSubCategoriesByCategory(),
    units: getAllUnits(),
    productTypes: getAllProductTypes(),
    parties: generalInfoDb.getParties ? generalInfoDb.getParties() : [],
    partyTypes: generalInfoDb.getPartyTypes ? generalInfoDb.getPartyTypes() : [],
    areas: generalInfoDb.getAreas ? generalInfoDb.getAreas() : [],
    provinces: generalInfoDb.getProvinces ? generalInfoDb.getProvinces() : [],
    companyInfo: generalInfoDb.getCompanyInfo ? generalInfoDb.getCompanyInfo() : null,
    vouchers: accountsDb.getAllVouchers ? accountsDb.getAllVouchers() : []
  };
}

// ============================================
// SALES RETURN FUNCTIONS
// ============================================

function getAllSaleReturns() {
  if (isJsonFallback) {
    return [...(jsonData.sales_returns || [])].reverse();
  }
  return dbInstance.prepare(`
    SELECT * FROM sales_returns ORDER BY createdAt DESC
  `).all();
}

function getSaleReturnById(id) {
  if (isJsonFallback) {
    const ret = (jsonData.sales_returns || []).find(r => r.id === id || r.returnNo === id);
    if (!ret) return null;
    const items = (jsonData.sale_return_items || []).filter(it => it.returnId === ret.id);
    return { ...ret, items };
  }
  const ret = dbInstance.prepare('SELECT * FROM sales_returns WHERE id = ? OR returnNo = ?').get(id, id);
  if (!ret) return null;
  const items = dbInstance.prepare('SELECT * FROM sale_return_items WHERE returnId = ? ORDER BY srNo ASC').all(ret.id);
  return { ...ret, items };
}

function getNextSaleReturnNo() {
  if (isJsonFallback) {
    let max = 0;
    for (const r of (jsonData.sales_returns || [])) {
      const match = (r.returnNo || '').match(/SR-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > max) max = n;
      }
    }
    return `SR-${String(max + 1).padStart(4, '0')}`;
  }
  const rows = dbInstance.prepare('SELECT returnNo FROM sales_returns ORDER BY id DESC LIMIT 50').all();
  let max = 0;
  for (const r of rows) {
    const match = (r.returnNo || '').match(/SR-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `SR-${String(max + 1).padStart(4, '0')}`;
}

function saveSaleReturn(returnData, items = []) {
  const now = new Date().toISOString();
  const id = returnData.id || `sr-${Date.now()}`;
  const returnNo = returnData.returnNo || getNextSaleReturnNo();

  if (isJsonFallback) {
    if (!jsonData.sales_returns) jsonData.sales_returns = [];
    if (!jsonData.sale_return_items) jsonData.sale_return_items = [];

    const returnRecord = {
      id,
      returnNo,
      saleVoucherRef: returnData.saleVoucherRef || '',
      entryDate: returnData.entryDate || now.slice(0, 10),
      partyId: String(returnData.partyId || ''),
      partyTitle: returnData.partyTitle || 'Walk-in Customer',
      customerPhone: returnData.customerPhone || '',
      areaName: returnData.areaName || '',
      description: returnData.description || '',
      refundMode: returnData.refundMode || 'Credit',
      totalItems: Number(returnData.totalItems || items.length),
      totalPieces: Number(returnData.totalPieces || 0),
      totalAmount: Number(returnData.totalAmount || 0),
      paidRefund: Number(returnData.paidRefund || 0),
      itemsJson: JSON.stringify(items),
      createdAt: returnData.createdAt || now
    };

    // If updating, revert previous return stock addition and previous credit party balance first
    const existingIdx = jsonData.sales_returns.findIndex(r => r.id === id);
    if (existingIdx !== -1) {
      const existing = jsonData.sales_returns[existingIdx];
      if (existing && existing.refundMode === 'Credit' && existing.partyId && Number(existing.totalAmount) > 0) {
        generalInfoDb.updatePartyBalance(existing.partyId, Number(existing.totalAmount));
      }
      const oldItems = jsonData.sale_return_items.filter(it => it.returnId === id);
      for (const it of oldItems) {
        const prod = jsonData.products.find(p => p.id === it.productId || p.code === it.productCode);
        if (prod) {
          prod.stockQty = Math.max(0, (Number(prod.stockQty) || 0) - (Number(it.totalQty) || 0));
        }
      }
      jsonData.sales_returns.splice(existingIdx, 1);
      jsonData.sale_return_items = jsonData.sale_return_items.filter(it => it.returnId !== id);
    }

    jsonData.sales_returns.push(returnRecord);

    let sr = 1;
    for (const item of items) {
      const totalQty = Number(item.totalQty) || 0;
      const returnRate = Number(item.returnRate || item.salePrice || 0);
      const netAmount = Number(item.netAmount || (totalQty * returnRate));

      const itemRec = {
        id: `sri-${Date.now()}-${sr}`,
        returnId: id,
        srNo: sr,
        productId: item.productId || '',
        productCode: item.productCode || item.code || '',
        productTitle: item.productTitle || item.title || '',
        packSize: Number(item.packSize) || 1,
        packQty: Number(item.packQty || 0),
        unitQty: Number(item.unitQty || 0),
        totalQty,
        returnRate,
        netAmount,
        condition: item.condition || 'Good',
        createdAt: now
      };
      jsonData.sale_return_items.push(itemRec);

      // ADD stock back to inventory!
      const prod = jsonData.products.find(p => p.id === item.productId || p.code === itemRec.productCode);
      if (prod && totalQty > 0) {
        prod.stockQty = (Number(prod.stockQty) || 0) + totalQty;
      }
      sr++;
    }

    if (returnData.refundMode === 'Credit' && returnData.partyId && Number(returnData.totalAmount) > 0) {
      generalInfoDb.updatePartyBalance(returnData.partyId, -Number(returnData.totalAmount));
    }

    saveJsonData();
    return { success: true, id, returnNo };
  }

  // SQLite execution with transaction
  let oldPartyId = null;
  let oldRefundMode = null;
  let oldTotalAmount = 0;

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const existing = dbInstance.prepare('SELECT id, partyId, refundMode, totalAmount FROM sales_returns WHERE id = ?').get(id);
    if (existing) {
      oldPartyId = existing.partyId;
      oldRefundMode = existing.refundMode;
      oldTotalAmount = Number(existing.totalAmount) || 0;

      const oldItems = dbInstance.prepare('SELECT productId, productCode, totalQty FROM sale_return_items WHERE returnId = ?').all(id);
      for (const it of oldItems) {
        dbInstance.prepare(`
          UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?
        `).run(Number(it.totalQty) || 0, it.productCode || '', it.productId || '');
      }
      dbInstance.prepare('DELETE FROM sale_return_items WHERE returnId = ?').run(id);
      dbInstance.prepare('DELETE FROM sales_returns WHERE id = ?').run(id);
    }

    const insertReturn = dbInstance.prepare(`
      INSERT INTO sales_returns (
        id, returnNo, saleVoucherRef, entryDate, partyId, partyTitle,
        customerPhone, areaName, description, refundMode,
        totalItems, totalPieces, totalAmount, paidRefund,
        itemsJson, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReturn.run(
      id, returnNo, returnData.saleVoucherRef || '', returnData.entryDate || now.slice(0, 10),
      String(returnData.partyId || ''), returnData.partyTitle || 'Walk-in Customer',
      returnData.customerPhone || '', returnData.areaName || '', returnData.description || '',
      returnData.refundMode || 'Credit',
      Number(returnData.totalItems || items.length), Number(returnData.totalPieces || 0),
      Number(returnData.totalAmount || 0), Number(returnData.paidRefund || 0),
      JSON.stringify(items), returnData.createdAt || now
    );

    const insertItem = dbInstance.prepare(`
      INSERT INTO sale_return_items (
        id, returnId, srNo, productId, productCode, productTitle,
        packSize, packQty, unitQty, totalQty, returnRate, netAmount,
        condition, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Add returned stock back to inventory
    const addStock = dbInstance.prepare(`
      UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?
    `);

    let sr = 1;
    for (const item of items) {
      const itemId = `sri-${Date.now()}-${sr}`;
      const code = String(item.productCode || item.code || '').trim();
      const packQty = Number(item.packQty || 0);
      const unitQty = Number(item.unitQty || 0);
      const packSize = Number(item.packSize) || 1;
      const totalQty = Number(item.totalQty) > 0 ? Number(item.totalQty) : (((packQty * packSize) + unitQty) || 1);
      const returnRate = Number(item.returnRate || item.salePrice || 0);
      const netAmount = Number(item.netAmount || (totalQty * returnRate));

      insertItem.run(
        itemId, id, sr, item.productId || '', code, item.productTitle || '',
        packSize, packQty, unitQty, totalQty, returnRate, netAmount,
        item.condition || 'Good', now
      );

      if (totalQty > 0) {
        addStock.run(totalQty, code, item.productId || '');
      }
      sr++;
    }

    dbInstance.exec('COMMIT;');
    checkpoint();

    // Revert previous credit return if needed
    if (oldPartyId && oldRefundMode === 'Credit' && oldTotalAmount > 0) {
      generalInfoDb.updatePartyBalance(oldPartyId, oldTotalAmount);
    }
    // Apply new credit return if needed
    if (returnData.refundMode === 'Credit' && returnData.partyId && Number(returnData.totalAmount) > 0) {
      generalInfoDb.updatePartyBalance(returnData.partyId, -Number(returnData.totalAmount));
    }
    return { success: true, id, returnNo };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function deleteSaleReturn(id) {
  if (isJsonFallback) {
    const existing = (jsonData.sales_returns || []).find(r => r.id === id || r.returnNo === id);
    if (existing) {
      if (existing.refundMode === 'Credit' && existing.partyId && Number(existing.totalAmount) > 0) {
        generalInfoDb.updatePartyBalance(existing.partyId, Number(existing.totalAmount));
      }
      const items = (jsonData.sale_return_items || []).filter(it => it.returnId === existing.id);
      for (const it of items) {
        const prod = jsonData.products.find(p => p.id === it.productId || p.code === it.productCode);
        if (prod) {
          prod.stockQty = Math.max(0, (Number(prod.stockQty) || 0) - (Number(it.totalQty) || 0));
        }
      }
      jsonData.sales_returns = jsonData.sales_returns.filter(r => r.id !== existing.id);
      jsonData.sale_return_items = jsonData.sale_return_items.filter(it => it.returnId !== existing.id);
      saveJsonData();
    }
    return { success: true };
  }

  let creditPartyId = null;
  let creditAmount = 0;

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const r = dbInstance.prepare('SELECT id, partyId, refundMode, totalAmount FROM sales_returns WHERE id = ? OR returnNo = ?').get(id, id);
    if (r) {
      if (r.refundMode === 'Credit' && r.partyId && Number(r.totalAmount) > 0) {
        creditPartyId = r.partyId;
        creditAmount = Number(r.totalAmount);
      }
      const items = dbInstance.prepare('SELECT productId, productCode, totalQty FROM sale_return_items WHERE returnId = ?').all(r.id);
      for (const it of items) {
        dbInstance.prepare(`
          UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?
        `).run(Number(it.totalQty) || 0, it.productCode || '', it.productId || '');
      }
      dbInstance.prepare('DELETE FROM sale_return_items WHERE returnId = ?').run(r.id);
      dbInstance.prepare('DELETE FROM sales_returns WHERE id = ?').run(r.id);
    }
    dbInstance.exec('COMMIT;');
    checkpoint();

    if (creditPartyId && creditAmount > 0) {
      generalInfoDb.updatePartyBalance(creditPartyId, creditAmount);
    }
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

// ============================================
// APPLICATION SETTINGS & PREFERENCES
// ============================================
const DEFAULT_APP_SETTINGS = {
  storeName: 'Shahzaib Traders',
  storeTagline: 'Wholesale & Retail Trading Solutions',
  contactPerson: 'Shahzaib Ali',
  contactPhone: '0300-1234567',
  altPhone: '042-37654321',
  contactEmail: 'info@shahzaibtraders.com',
  address: 'Main Bazar, Electrical Market, Lahore',
  ntn: '7654321-9',
  strn: '32-77-8765-432-1',
  currency: 'PKR',
  defaultWarehouse: 'Main Godown',
  defaultRateMode: 'retail', // 'retail' | 'wholesale' | 'last'
  lowStockThreshold: '10',
  paperSize: '80mm', // '80mm' | 'A4'
  autoPrintVoucher: 'false',
  requirePinOnDelete: 'true',
  receiptHeaderTitle: 'SHAHZAIB TRADERS',
  receiptSubtitle: 'Dealers in Electrical Goods & Accessories',
  receiptFooterNote: 'Thank you for your business!\nGoods once sold cannot be returned without bill.\nNo warranty on burnt or short-circuit electrical items.',
  invoiceTerms: '1. Please inspect all items upon receipt.\n2. In case of return, original sale slip is required within 7 days.',
  invoiceHeading: 'Sale Tax Invoice',
  invoiceHeadingA5: 'Sale Memo',
  estimateHeading: 'Estimate / Quotation',
  previousBillLabel: 'Previous Bill / Balance',
  netPayableLabel: 'TOTAL NET PAYABLE',
  signatureLabel1: 'Prepared By',
  signatureLabel2: 'Checked By',
  signatureLabel3: 'Customer Signature'
};

function seedDefaultAppSettings(db) {
  try {
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM app_settings').get();
    if (!existingCount || existingCount.count === 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)');
      const now = new Date().toISOString();
      for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
        stmt.run(key, String(value), now);
      }
    }
  } catch (err) {
    console.warn('Could not seed default app settings:', err);
  }
}

function getAppPin() {
  if (isJsonFallback) {
    if (jsonData.app_settings && jsonData.app_settings.adminPin) {
      return String(jsonData.app_settings.adminPin).trim();
    }
    return String(process.env.APP_PIN || '1996').trim();
  }
  if (!dbInstance) return String(process.env.APP_PIN || '1996').trim();
  try {
    const row = dbInstance.prepare("SELECT value FROM app_settings WHERE key = 'adminPin'").get();
    if (row && row.value) return String(row.value).trim();
  } catch (_e) {}
  return String(process.env.APP_PIN || '1996').trim();
}

function setAppPin(newPin) {
  const cleanPin = String(newPin).trim();
  const now = new Date().toISOString();
  if (isJsonFallback) {
    jsonData.app_settings = jsonData.app_settings || {};
    jsonData.app_settings.adminPin = cleanPin;
    saveJsonData();
    return true;
  }
  if (!dbInstance) return false;
  try {
    dbInstance.prepare(`
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES ('adminPin', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `).run(cleanPin, now);
    checkpoint();
    return true;
  } catch (err) {
    console.error('Failed to set app PIN in db:', err);
    return false;
  }
}

function getAppSettings() {
  const result = { ...DEFAULT_APP_SETTINGS };

  // Overlay live company info if available as fallback defaults
  try {
    const comp = generalInfoDb.getCompanyInfo();
    if (comp && comp.name) {
      if (comp.name) result.storeName = comp.name;
      if (comp.tagline) result.storeTagline = comp.tagline;
      if (comp.phone) result.contactPhone = comp.phone;
      if (comp.altPhone) result.altPhone = comp.altPhone;
      if (comp.address) result.address = comp.address;
      if (comp.ntn) result.ntn = comp.ntn;
      if (comp.strn) result.strn = comp.strn;
      if (comp.email) result.contactEmail = comp.email;
      if (comp.contactPerson) result.contactPerson = comp.contactPerson;
    }
  } catch (_compErr) {}

  if (isJsonFallback) {
    if (jsonData.app_settings && typeof jsonData.app_settings === 'object') {
      Object.assign(result, jsonData.app_settings);
    }
    return result;
  }

  if (!dbInstance) return result;

  try {
    const rows = dbInstance.prepare('SELECT key, value FROM app_settings').all();
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch (err) {
    console.error('Failed to get app settings:', err);
    return result;
  }
}

function saveAppSettings(settingsMap) {
  if (!settingsMap || typeof settingsMap !== 'object') {
    return { success: false, message: 'Invalid settings payload' };
  }

  const now = new Date().toISOString();

  if (isJsonFallback) {
    jsonData.app_settings = jsonData.app_settings || {};
    Object.assign(jsonData.app_settings, settingsMap);
    saveJsonData();
    return { success: true };
  }

  if (!dbInstance) throw new Error('DB not initialized');

  try {
    dbInstance.exec('BEGIN TRANSACTION;');
    const stmt = dbInstance.prepare(`
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `);

    for (const [key, val] of Object.entries(settingsMap)) {
      stmt.run(key, String(val ?? ''), now);
    }

    dbInstance.exec('COMMIT;');
    checkpoint();

    // Also update company_info if core store details changed
    try {
      const companyPayload = {};
      if (settingsMap.storeName) companyPayload.name = settingsMap.storeName;
      if (settingsMap.storeTagline !== undefined) companyPayload.tagline = settingsMap.storeTagline;
      if (settingsMap.contactPhone !== undefined) companyPayload.phone = settingsMap.contactPhone;
      if (settingsMap.altPhone !== undefined) companyPayload.altPhone = settingsMap.altPhone;
      if (settingsMap.contactPerson !== undefined) companyPayload.contactPerson = settingsMap.contactPerson;
      if (settingsMap.address !== undefined) companyPayload.address = settingsMap.address;
      if (settingsMap.ntn !== undefined) companyPayload.ntn = settingsMap.ntn;
      if (settingsMap.strn !== undefined) companyPayload.strn = settingsMap.strn;
      if (settingsMap.contactEmail !== undefined) companyPayload.email = settingsMap.contactEmail;

      if (Object.keys(companyPayload).length > 0) {
        generalInfoDb.saveCompanyInfo(companyPayload);
      }
    } catch (_syncErr) {}

    return { success: true };
  } catch (err) {
    try { dbInstance.exec('ROLLBACK;'); } catch (_e) {}
    console.error('Failed to save app settings:', err);
    throw err;
  }
}

function getDbStats(dbPath) {
  try {
    const stats = {
      dbPath: dbPath || 'inventory.db',
      fileSizeBytes: 0,
      fileSizeKB: '0 KB',
      productsCount: 0,
      partiesCount: 0,
      salesCount: 0,
      purchasesCount: 0,
      vouchersCount: 0,
      journalMode: 'WAL'
    };

    if (dbPath && fs.existsSync(dbPath)) {
      const st = fs.statSync(dbPath);
      stats.fileSizeBytes = st.size;
      stats.fileSizeKB = (st.size / 1024).toFixed(1) + ' KB';
      if (st.size > 1024 * 1024) {
        stats.fileSizeKB = (st.size / (1024 * 1024)).toFixed(2) + ' MB';
      }
    }

    if (dbInstance) {
      try { stats.productsCount = dbInstance.prepare('SELECT COUNT(*) as c FROM products').get()?.c || 0; } catch (_) {}
      try { stats.partiesCount = dbInstance.prepare('SELECT COUNT(*) as c FROM parties').get()?.c || 0; } catch (_) {}
      try { stats.salesCount = dbInstance.prepare('SELECT COUNT(*) as c FROM sales').get()?.c || 0; } catch (_) {}
      try { stats.purchasesCount = dbInstance.prepare('SELECT COUNT(*) as c FROM purchases').get()?.c || 0; } catch (_) {}
      try { stats.vouchersCount = dbInstance.prepare('SELECT COUNT(*) as c FROM accounts_vouchers').get()?.c || 0; } catch (_) {}
    } else if (isJsonFallback) {
      stats.productsCount = (jsonData.products || []).length;
      stats.salesCount = (jsonData.sales || []).length;
      stats.purchasesCount = (jsonData.purchases || []).length;
      stats.journalMode = 'JSON';
    }

    return { success: true, stats };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function backupDatabase(dbPath) {
  try {
    if (!dbPath || !fs.existsSync(dbPath)) {
      throw new Error(`Database file not found at: ${dbPath}`);
    }

    // Flush WAL to disk completely with TRUNCATE to avoid stale WAL
    if (dbInstance && typeof dbInstance.exec === 'function') {
      try {
        dbInstance.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      } catch (_e) {}
    } else if (isJsonFallback) {
      saveJsonData();
    }

    const backupDir = path.join(path.dirname(dbPath), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const ext = path.extname(dbPath) || (isJsonFallback ? '.json' : '.db');
    const filename = `inventory_backup_${dateStr}${ext}`;
    const targetPath = path.join(backupDir, filename);

    fs.copyFileSync(dbPath, targetPath);

    const st = fs.statSync(targetPath);
    const sizeKB = (st.size / 1024).toFixed(1) + ' KB';

    return {
      success: true,
      backupPath: targetPath,
      filename,
      sizeBytes: st.size,
      sizeFormatted: sizeKB,
      timestamp: now.toISOString()
    };
  } catch (err) {
    console.error('Backup error:', err);
    return { success: false, error: err.message };
  }
}

function optimizeDatabase() {
  try {
    if (dbInstance && typeof dbInstance.exec === 'function') {
      dbInstance.exec('PRAGMA wal_checkpoint(FULL);');
      dbInstance.exec('VACUUM;');
      dbInstance.exec('PRAGMA optimize;');
      return { success: true, message: 'Database optimized, vacuumed, and WAL checkpoints flushed successfully.' };
    }
    return { success: true, message: 'No active SQLite engine to vacuum (JSON mode).' };
  } catch (err) {
    console.error('Optimize error:', err);
    return { success: false, error: err.message };
  }
}

function exportAllDatabaseJson() {
  return getAllData();
}

function checkpoint() {
  if (dbInstance && typeof dbInstance.exec === 'function') {
    try {
      dbInstance.exec('PRAGMA wal_checkpoint(PASSIVE);');
    } catch (e) {}
  }
}

function closeDatabase() {
  if (dbInstance && typeof dbInstance.close === 'function') {
    try {
      dbInstance.exec('PRAGMA wal_checkpoint(FULL);');
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
}

function restoreDatabase(backupPath, currentDbPath) {
  try {
    if (!backupPath || !fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found at: ${backupPath}`);
    }

    if (!currentDbPath) {
      throw new Error('Current database target path is missing');
    }

    const ext = path.extname(backupPath).toLowerCase();

    // 1. Validate the backup file before touching active database
    if (ext === '.json') {
      const raw = fs.readFileSync(backupPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid JSON backup structure');
      }
    } else {
      if (DatabaseSync) {
        const testDb = new DatabaseSync(backupPath);
        const check = testDb.prepare("PRAGMA quick_check").get();
        testDb.close();
        if (!check || check.quick_check !== 'ok') {
          throw new Error('Backup file verification failed: file is corrupted or not a valid SQLite database.');
        }
      }
    }

    // 2. Create safety backup of the active database before overwriting
    let safetyBackupResult = null;
    if (fs.existsSync(currentDbPath)) {
      try {
        safetyBackupResult = backupDatabase(currentDbPath);
      } catch (bkpErr) {
        console.warn('Pre-restore safety backup notice:', bkpErr);
      }
    }

    // 3. Close the active database connection
    closeDatabase();

    // 4. Remove active WAL & SHM files to avoid page conflicts
    const walFile = currentDbPath + '-wal';
    const shmFile = currentDbPath + '-shm';
    if (fs.existsSync(walFile)) {
      try { fs.unlinkSync(walFile); } catch (_) {}
    }
    if (fs.existsSync(shmFile)) {
      try { fs.unlinkSync(shmFile); } catch (_) {}
    }

    // 5. Replace current database with backup file
    fs.mkdirSync(path.dirname(currentDbPath), { recursive: true });
    fs.copyFileSync(backupPath, currentDbPath);

    // 6. Re-initialize database instance and sub-modules
    initDatabase(currentDbPath);

    return {
      success: true,
      message: `Database successfully restored from ${path.basename(backupPath)}.`,
      filename: path.basename(backupPath),
      safetyBackup: safetyBackupResult?.filename || null
    };
  } catch (err) {
    console.error('Database restore error:', err);
    // Ensure database instance is restored if possible
    if (!dbInstance) {
      try { initDatabase(currentDbPath); } catch (_) {}
    }
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  initDatabase,
  closeDatabase,
  checkpoint,
  getAllData,
  getReportsMasterData,

  // Units
  getAllUnits,
  saveUnit,
  deleteUnit,

  // Product Types
  getAllProductTypes,
  saveProductType,
  deleteProductType,

  // Product Categories & Sub-Categories
  getAllProductCategories,
  saveProductCategory,
  deleteProductCategory,
  getSubCategoriesByCategory,
  saveProductSubCategory,
  deleteProductSubCategory,

  // Products
  getAllProducts,
  getProductById,
  getProductByCode,
  getNextProductCode,
  saveProduct,
  deleteProduct,
  updateProductPrices,

  // Purchases
  getAllPurchases,
  getPurchaseById,
  getNextPurchaseVoucherNo,
  savePurchase,
  deletePurchase,

  // Sales
  getAllSales,
  getSaleById,
  getNextSaleVoucherNo,
  saveSale,
  deleteSale,

  // Sales Returns
  getAllSaleReturns,
  getSaleReturnById,
  getNextSaleReturnNo,
  saveSaleReturn,
  deleteSaleReturn,

  // General Info Module (Company, Provinces, Areas, Party Types, Parties)
  getCompanyInfo: generalInfoDb.getCompanyInfo,
  saveCompanyInfo: generalInfoDb.saveCompanyInfo,
  getProvinces: generalInfoDb.getProvinces,
  addProvince: generalInfoDb.addProvince,
  updateProvince: generalInfoDb.updateProvince,
  deleteProvince: generalInfoDb.deleteProvince,
  getAreas: generalInfoDb.getAreas,
  addArea: generalInfoDb.addArea,
  updateArea: generalInfoDb.updateArea,
  deleteArea: generalInfoDb.deleteArea,
  getPartyTypes: generalInfoDb.getPartyTypes,
  addPartyType: generalInfoDb.addPartyType,
  updatePartyType: generalInfoDb.updatePartyType,
  deletePartyType: generalInfoDb.deletePartyType,
  getParties: generalInfoDb.getParties,
  addParty: generalInfoDb.addParty,
  updateParty: generalInfoDb.updateParty,
  deleteParty: generalInfoDb.deleteParty,
  updatePartyBalance: generalInfoDb.updatePartyBalance,
  getAllGeneralInfo: generalInfoDb.getAllGeneralInfo,

  // Accounts Module (Cash Receipt Voucher, Cash Payment Voucher, Party Ledgers)
  getAccountsNextVoucherNo: accountsDb.getNextVoucherNo,
  getAccountsVouchers: accountsDb.getAllVouchers,
  getAccountsVoucherById: accountsDb.getVoucherById,
  saveAccountsVoucher: accountsDb.saveVoucher,
  deleteAccountsVoucher: accountsDb.deleteVoucher,
  getPartyLedger: accountsDb.getPartyLedger,

  // Trade Features: Expenses, Estimates, Claims, Day-End Closing & Chart of Accounts
  getNextExpenseVoucherNo: tradeFeaturesDb.getNextExpenseVoucherNo,
  getAllExpenses: tradeFeaturesDb.getAllExpenses,
  saveExpense: tradeFeaturesDb.saveExpense,
  deleteExpense: tradeFeaturesDb.deleteExpense,
  getChartOfAccounts: tradeFeaturesDb.getChartOfAccounts,
  getNextEstimateNo: tradeFeaturesDb.getNextEstimateNo,
  getAllEstimates: tradeFeaturesDb.getAllEstimates,
  getEstimateById: tradeFeaturesDb.getEstimateById,
  saveEstimate: tradeFeaturesDb.saveEstimate,
  deleteEstimate: tradeFeaturesDb.deleteEstimate,
  getNextClaimNo: tradeFeaturesDb.getNextClaimNo,
  getAllClaims: tradeFeaturesDb.getAllClaims,
  saveClaim: tradeFeaturesDb.saveClaim,
  deleteClaim: tradeFeaturesDb.deleteClaim,
  getDailyClosingSummary: tradeFeaturesDb.getDailyClosingSummary,
  getAllDayEndClosings: tradeFeaturesDb.getAllDayEndClosings,
  saveDayEndClosing: tradeFeaturesDb.saveDayEndClosing,

  // Settings & System Maintenance
  getAppSettings,
  saveAppSettings,
  getAppPin,
  setAppPin,
  getDbStats,
  backupDatabase,
  restoreDatabase,
  optimizeDatabase,
  exportAllDatabaseJson
};
