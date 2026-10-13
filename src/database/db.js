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

function initDatabase(dbPath) {
  if (dbInstance) return dbInstance;

  if (!DatabaseSync) {
    console.log('node:sqlite not available in this Node/Electron version. Using robust JSON database fallback.');
    const res = initJsonFallback(dbPath);
    generalInfoDb.initGeneralInfo(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint);
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

    dbInstance = db;
    generalInfoDb.initGeneralInfo(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint);
    return dbInstance;
  } catch (err) {
    console.warn('SQLite init failed, falling back to JSON database:', err);
    const res = initJsonFallback(dbPath);
    generalInfoDb.initGeneralInfo(dbInstance, isJsonFallback, jsonData, saveJsonData, checkpoint);
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
  const id = p.id || `prod-${Date.now()}`;
  const code = String(p.code || '').trim() || getNextProductCode();
  const now = new Date().toISOString();

  if (isJsonFallback) {
    const idx = jsonData.products.findIndex(pr => pr.id === id || pr.code === code);
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

  const existing = dbInstance.prepare('SELECT id FROM products WHERE id = ? OR code = ?').get(id, code);
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
  if (!purchases || purchases.length === 0) return '109';
  const numericNos = purchases
    .map(p => parseInt(p.voucherNo, 10))
    .filter(n => !isNaN(n) && n >= 100);
  if (numericNos.length === 0) return '109';
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

    if (pIdx !== -1) {
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
        }
      }
      sr++;
    }

    saveJsonData();
    return { success: true, id, voucherNo };
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const existing = dbInstance.prepare('SELECT id FROM purchases WHERE id = ? OR voucherNo = ?').get(id, voucherNo);
    if (existing) {
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
        purchasePrice = CASE WHEN ? > 0 THEN ? ELSE purchasePrice END
      WHERE code = ? OR id = ?
    `);

    let sr = 1;
    for (const item of items) {
      const itemId = `pi-${Date.now()}-${sr}`;
      const code = String(item.productCode || item.code || '').trim();
      const tp = Number(item.tradePrice || item.tp || 0);
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
        Number(item.retailPrice || item.rp || 0), Number(item.wholesalePrice || item.wp || 0),
        Number(item.tradeOffer || item.to || 0), Number(item.discountPercent || item.discPercent || 0),
        Number(item.netAmount || 0)
      );

      if (incomingQty > 0 && code) {
        updateProductStock.run(incomingQty, tp, tp, code, item.productId || '');
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
    return { success: true, id, voucherNo };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function deletePurchase(id) {
  if (isJsonFallback) {
    jsonData.purchases = jsonData.purchases.filter(p => p.id !== id && p.voucherNo !== id);
    jsonData.purchase_items = jsonData.purchase_items.filter(pi => pi.purchaseId !== id);
    saveJsonData();
    return { success: true };
  }
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const p = dbInstance.prepare('SELECT id FROM purchases WHERE id = ? OR voucherNo = ?').get(id, id);
    if (p) {
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
    itemsJson,
    createdAt: now
  };

  if (isJsonFallback) {
    const existing = jsonData.sales.find(s => s.id === id || s.voucherNo === voucherNo);
    if (existing) {
      const oldItems = jsonData.sale_items.filter(it => it.saleId === existing.id);
      for (const oldIt of oldItems) {
        const prod = jsonData.products.find(p => p.id === oldIt.productId || p.code === oldIt.productCode);
        if (prod) {
          prod.stockQty = (Number(prod.stockQty) || 0) + (Number(oldIt.totalQty) || 0);
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

      if (totalQty > 0) {
        const prod = jsonData.products.find(p => (code && p.code === code) || (item.productId && p.id === item.productId));
        if (prod) {
          prod.stockQty = Math.max(0, (Number(prod.stockQty) || 0) - totalQty);
        }
      }
      sr++;
    }

    saveJsonData();
    if (saleRecord.balanceDue > 0 && saleRecord.partyId) {
      generalInfoDb.updatePartyBalance(saleRecord.partyId, saleRecord.balanceDue);
    }
    return { success: true, id, voucherNo };
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const existing = dbInstance.prepare('SELECT id, createdAt FROM sales WHERE id = ? OR voucherNo = ?').get(id, voucherNo);
    if (existing) {
      const oldItems = dbInstance.prepare('SELECT productId, productCode, totalQty FROM sale_items WHERE saleId = ?').all(existing.id);
      for (const oldIt of oldItems) {
        dbInstance.prepare(`
          UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?
        `).run(Number(oldIt.totalQty) || 0, oldIt.productCode || '', oldIt.productId || '');
      }
      dbInstance.prepare('DELETE FROM sale_items WHERE saleId = ?').run(existing.id);
      dbInstance.prepare(`
        UPDATE sales SET
          voucherNo = ?, manualNo = ?, entryDate = ?, partyId = ?, partyTitle = ?,
          customerPhone = ?, areaName = ?, description = ?, storeTitle = ?, paymentType = ?,
          previousBalance = ?, grossAmount = ?, discount = ?, netAmount = ?,
          paidAmount = ?, balanceDue = ?, itemsJson = ?
        WHERE id = ?
      `).run(
        voucherNo, saleRecord.manualNo, saleRecord.entryDate, saleRecord.partyId, saleRecord.partyTitle,
        saleRecord.customerPhone, saleRecord.areaName, saleRecord.description, saleRecord.storeTitle, saleRecord.paymentType,
        saleRecord.previousBalance, saleRecord.grossAmount, saleRecord.discount, saleRecord.netAmount,
        saleRecord.paidAmount, saleRecord.balanceDue, itemsJson, existing.id
      );
    } else {
      dbInstance.prepare(`
        INSERT INTO sales (
          id, voucherNo, manualNo, entryDate, partyId, partyTitle,
          customerPhone, areaName, description, storeTitle, paymentType,
          previousBalance, grossAmount, discount, netAmount,
          paidAmount, balanceDue, itemsJson, createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `).run(
        id, voucherNo, saleRecord.manualNo, saleRecord.entryDate, saleRecord.partyId, saleRecord.partyTitle,
        saleRecord.customerPhone, saleRecord.areaName, saleRecord.description, saleRecord.storeTitle, saleRecord.paymentType,
        saleRecord.previousBalance, saleRecord.grossAmount, saleRecord.discount, saleRecord.netAmount,
        saleRecord.paidAmount, saleRecord.balanceDue, itemsJson, now
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
        itemId, id, sr, item.productId || '', code, item.productTitle || '',
        packSize, packQty, unitQty, totalQty,
        purchasePrice, wholesalePrice, retailPrice, salePrice,
        discountPercent, discountAmount, netAmount, now
      );

      if (totalQty > 0) {
        deductStock.run(totalQty, code, item.productId || '');
      }
      sr++;
    }

    dbInstance.exec('COMMIT;');
    checkpoint();
    if (saleRecord.balanceDue > 0 && saleRecord.partyId) {
      generalInfoDb.updatePartyBalance(saleRecord.partyId, saleRecord.balanceDue);
    }
    return { success: true, id, voucherNo };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
}

function deleteSale(id) {
  if (isJsonFallback) {
    const existing = jsonData.sales.find(s => s.id === id || s.voucherNo === id);
    if (existing) {
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
      jsonData.sales = jsonData.sales.filter(s => s.id !== existing.id);
      jsonData.sale_items = jsonData.sale_items.filter(it => it.saleId !== existing.id);
      saveJsonData();
    }
    return { success: true };
  }

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const s = dbInstance.prepare('SELECT id, partyId, balanceDue FROM sales WHERE id = ? OR voucherNo = ?').get(id, id);
    if (s) {
      if (s.balanceDue > 0 && s.partyId) {
        generalInfoDb.updatePartyBalance(s.partyId, -Number(s.balanceDue));
      }
      const items = dbInstance.prepare('SELECT productId, productCode, totalQty FROM sale_items WHERE saleId = ?').all(s.id);
      for (const it of items) {
        dbInstance.prepare(`
          UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?
        `).run(Number(it.totalQty) || 0, it.productCode || '', it.productId || '');
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
    sales_returns: getAllSaleReturns()
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

    // If updating, revert previous return stock addition first
    const existingIdx = jsonData.sales_returns.findIndex(r => r.id === id);
    if (existingIdx !== -1) {
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

    saveJsonData();
    return { success: true, id, returnNo };
  }

  // SQLite execution with transaction
  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const existing = dbInstance.prepare('SELECT id FROM sales_returns WHERE id = ?').get(id);
    if (existing) {
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
      const packSize = Number(item.packSize) || 1;
      const packQty = Number(item.packQty || 0);
      const unitQty = Number(item.unitQty || 0);
      const totalQty = (packQty * packSize) + unitQty;
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

  dbInstance.exec('BEGIN TRANSACTION;');
  try {
    const r = dbInstance.prepare('SELECT id FROM sales_returns WHERE id = ? OR returnNo = ?').get(id, id);
    if (r) {
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
    return { success: true };
  } catch (err) {
    dbInstance.exec('ROLLBACK;');
    throw err;
  }
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

module.exports = {
  initDatabase,
  closeDatabase,
  checkpoint,
  getAllData,

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
  getAllGeneralInfo: generalInfoDb.getAllGeneralInfo
};
