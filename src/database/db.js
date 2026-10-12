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
  purchase_items: []
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
        purchase_items: Array.isArray(parsed.purchase_items) ? parsed.purchase_items : []
      };
    } catch (e) {
      console.warn('Failed to parse existing JSON database, re-initializing:', e);
      jsonData = { units: [], product_types: [], product_categories: [], product_sub_categories: [], products: [], purchases: [], purchase_items: [] };
    }
  } else {
    jsonData = { units: [], product_types: [], product_categories: [], product_sub_categories: [], products: [], purchases: [], purchase_items: [] };
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
          prod.stockQty = (Number(prod.stockQty) || 0) + incomingQty;
          if (tp > 0) prod.purchasePrice = tp;
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

// Enterprise All-Data Fetcher
function getAllData() {
  return {
    units: getAllUnits(),
    product_types: getAllProductTypes(),
    product_categories: getAllProductCategories(),
    product_sub_categories: getSubCategoriesByCategory(),
    products: getAllProducts(),
    purchases: getAllPurchases()
  };
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
  getAllGeneralInfo: generalInfoDb.getAllGeneralInfo
};
