# Deep Technical Audit & Codebase Verification Report
**Application:** Shahzaib Traders - Desktop Inventory Management System  
**Repository Working Directory:** `c:\Users\Huzaifa Ali\Desktop\shazy bhi\shahzaib-traders-app`  
**Execution Environment:** Windows (x64), Electron 44.7.0, Node.js 24.18.0, SQLite via `node:sqlite` (DatabaseSync)  
**Audit Date:** 2026-10-28  

---

## PART 1: Verbatim Code

This section contains the verbatim implementation of all calculation functions, SQL statements, IPC handlers, database initialization, and backup routines.

### 1.1 Database Initialization & Connection

#### `src/database/db.js` (Lines 113–210, 369–388)
```javascript
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
```

#### `src/main.js` (Lines 109–132, 377–382)
```javascript
function getDbFilePath() {
  if (app.isPackaged) {
    const userDataDir = app.getPath('userData');
    const targetDb = path.join(userDataDir, 'inventory.db');
    if (!fs.existsSync(targetDb)) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
        const bundledDb = path.join(process.resourcesPath, 'inventory.db');
        const asarDb = path.join(__dirname, '..', 'inventory.db');
        if (fs.existsSync(bundledDb)) {
          fs.copyFileSync(bundledDb, targetDb);
        } else if (fs.existsSync(asarDb)) {
          fs.copyFileSync(asarDb, targetDb);
        }
      } catch (err) {
        console.warn('Initial database seed skipped/failed:', err);
      }
    }
    return targetDb;
  }
  // When running locally in development, use the project root database
  const localDb = path.join(__dirname, '..', 'inventory.db');
  return localDb;
}

app.whenReady().then(() => {
  // Initialize SQLite Database
  const dbPath = getDbFilePath();
  console.log('SQLite Database Path:', dbPath);
  db.initDatabase(dbPath);
```

---

### 1.2 Database Backup & Restoration

#### `src/database/db.js` (Lines 2057–2099, 2138–2215)
```javascript
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
```

---

### 1.3 Sales Calculation & Persistence

#### `src/sales/sales.js` (Lines 1528–1543, 1854–1924, 2033–2043)
```javascript
  function updateLineCalculations() {
    const packSize = Number(el.packSize?.value) || 1;
    const pQty = Number(el.packQty?.value) || 0;
    const uQty = Number(el.unitQty?.value) || 0;
    const totalQty = (pQty * packSize) + uQty;

    if (el.totalQty) el.totalQty.value = totalQty;

    const rate = Number(el.salePrice?.value) || 0;
    const discPct = Number(el.discountPercent?.value) || 0;
    const grossLine = totalQty * rate;
    const discAmt = grossLine * (discPct / 100);
    const netLine = Math.max(0, grossLine - discAmt);

    if (el.lineAmount) el.lineAmount.value = netLine.toFixed(2);
  }

  function updateVoucherTotals() {
    let gross = 0;
    let totalPieces = 0;
    let totalCost = 0;

    saleState.items.forEach(it => {
      gross += Number(it.netAmount || 0);
      totalPieces += Number(it.totalQty || 0);
      totalCost += (Number(it.purchasePrice || 0) * Number(it.totalQty || 0));
    });

    const specialDisc = Number(el.specialDiscount?.value) || 0;
    const netTotal = Math.max(0, gross - specialDisc);
    const estProfit = Math.max(0, netTotal - totalCost);

    // Auto-fill Cash Received with Net Total if Cash sale and not manually modified
    const isCash = (el.paymentType?.value || 'Cash') === 'Cash';
    if (isCash && el.paidAmount && el.paidAmount.dataset.userEdited !== 'true') {
      el.paidAmount.value = netTotal > 0 ? netTotal : 0;
    }

    const paid = Number(el.paidAmount?.value) || 0;
    const balanceDue = Math.max(0, netTotal - paid);
    const returnChange = Math.max(0, paid - netTotal);

    const prevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);
    const newCustomerBalance = prevBal + (netTotal - paid);

    if (el.totalItemsCount) el.totalItemsCount.textContent = saleState.items.length;
    if (el.totalPiecesCount) el.totalPiecesCount.textContent = totalPieces;
    const cartCountBadge = document.getElementById('posCartCountBadge');
    if (cartCountBadge) cartCountBadge.textContent = saleState.items.length;
    if (el.totalProfitPreview) el.totalProfitPreview.textContent = window.formatPKR ? window.formatPKR(estProfit) : `Rs ${estProfit.toFixed(2)}`;
    if (el.grossTotal) el.grossTotal.textContent = window.formatPKR ? window.formatPKR(gross) : `Rs ${gross.toFixed(2)}`;
    if (el.netTotal) el.netTotal.textContent = window.formatPKR ? window.formatPKR(netTotal) : `Rs ${netTotal.toFixed(2)}`;
    
    const slipGross = document.getElementById('posSlipGrossDisplay');
    const slipDiscount = document.getElementById('posSlipDiscountDisplay');
    const estNetEl = document.getElementById('posCartEstimatedNet');
    if (slipGross) slipGross.textContent = `Rs ${gross.toLocaleString()}`;
    if (slipDiscount) slipDiscount.textContent = `- Rs ${specialDisc.toLocaleString()}`;
    if (estNetEl) estNetEl.textContent = `Rs ${netTotal.toLocaleString()}`;

    if (el.balanceDue) el.balanceDue.textContent = window.formatPKR ? window.formatPKR(balanceDue) : `Rs ${balanceDue.toFixed(2)}`;
    if (el.returnChange) el.returnChange.textContent = window.formatPKR ? window.formatPKR(returnChange) : `Rs ${returnChange.toFixed(2)}`;
    const changeRow = document.getElementById('posChangeRow');
    const balanceRow = document.getElementById('posBalanceRow');
    if (changeRow && balanceRow) {
      if (paid > netTotal) {
        changeRow.style.display = 'flex';
        balanceRow.style.display = 'none';
      } else if (paid < netTotal) {
        changeRow.style.display = 'none';
        balanceRow.style.display = 'flex';
        if (el.balanceDue) el.balanceDue.style.color = '#dc2626';
      } else {
        changeRow.style.display = 'none';
        balanceRow.style.display = 'flex';
        if (el.balanceDue) {
          el.balanceDue.textContent = 'Rs 0.00';
          el.balanceDue.style.color = '#16a34a';
        }
      }
    }
    updateSlipMeta();

    if (el.finalCustomerBalance) {
      el.finalCustomerBalance.textContent = window.formatPKR ? window.formatPKR(newCustomerBalance) : `Rs ${newCustomerBalance.toFixed(2)}`;
      el.finalCustomerBalance.className = newCustomerBalance > 0 ? 'calc-val text-danger' : 'calc-val text-success';
    }
  }

  // in executeSaveSale:
  const gross = itemsSnapshot.reduce((s, it) => s + Number(it.netAmount || 0), 0);
  const specialDiscInput = document.getElementById('saleSpecialDiscount') || el.specialDiscount;
  const specialDisc = Number(specialDiscInput?.value) || 0;
  const net = Math.max(0, gross - specialDisc);
  const paidInput = document.getElementById('salePaidAmount') || el.paidAmount;
  const paid = Number(paidInput?.value) || 0;
  const balanceDue = Math.max(0, net - paid);
```

#### `src/database/db.js` (Lines 1317–1450, 1476–1502)
```javascript
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
```

---

### 1.4 Purchase Calculation & Persistence

#### `src/inventory/inventory.js` (Lines 1708–1735, 1784–1816)
```javascript
function calculatePurchaseBill() {
  const lineSum = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);
  let totalUnits = 0;
  currentPurchaseItems.forEach(it => {
    const pSize = Number(it.packSize) || 1;
    totalUnits += ((Number(it.packQty) || 0) * pSize) + (Number(it.unitQty) || 0);
  });

  if (inv.purTotalItemsCount) inv.purTotalItemsCount.textContent = currentPurchaseItems.length;
  if (inv.purTotalUnitsCount) inv.purTotalUnitsCount.textContent = totalUnits;
  if (inv.purSubtotalDisplay) {
    inv.purSubtotalDisplay.textContent = 'Rs. ' + lineSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const discount = Number(inv.purDiscount?.value) || 0;
  const freightDisc = Number(inv.purFreightDisc?.value) || 0;
  const freightExpn = Number(inv.purFreightExpn?.value) || 0;
  const salesTax = Number(inv.purSalesTax?.value) || 0;
  const extraCharges = Number(inv.purExtraCharges?.value) || 0;

  const grandTotal = Math.max(0, lineSum - discount - freightDisc + freightExpn + salesTax + extraCharges);

  if (inv.purGrandTotalDisplay) {
    const formatted = 'Rs. ' + grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if ('value' in inv.purGrandTotalDisplay) inv.purGrandTotalDisplay.value = grandTotal.toFixed(2);
    inv.purGrandTotalDisplay.textContent = formatted;
  }
}

// In savePurchaseVoucher:
  const lineSum = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);
  const discount = Number(inv.purDiscount?.value) || 0;
  const freightDisc = Number(inv.purFreightDisc?.value) || 0;
  const freightExpn = Number(inv.purFreightExpn?.value) || 0;
  const salesTax = Number(inv.purSalesTax?.value) || 0;
  const extraCharges = Number(inv.purExtraCharges?.value) || 0;
  const grandTotal = Math.max(0, lineSum - discount - freightDisc + freightExpn + salesTax + extraCharges);
```

#### `src/database/db.js` (Lines 951–1085, 1116–1144)
```javascript
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
```

---

### 1.5 Accounts Vouchers (CRV / CPV) & Party Ledger

#### `src/accounts/accounts.js` (Lines 780–800, 957–975)
```javascript
  function recalculateAmounts() {
    const isSupp = isSupplierParty(state.selectedParty);
    const prevBal = state.selectedParty ? (Number(state.selectedParty.currentBalance !== undefined ? state.selectedParty.currentBalance : state.selectedParty.openingBalance) || 0) : 0;
    const amount = Number(dom.amountInput?.value) || 0;
    const discount = Number(dom.discountInput?.value) || 0;
    const netSettlement = amount + discount;

    dom.netSettlementDisplay.textContent = formatMoney(netSettlement);

    const voucherType = state.activeTab === 'cpv' ? 'CPV' : 'CRV';
    let newBal = prevBal;
    if (isSupp) {
      newBal = voucherType === 'CRV' ? (prevBal + netSettlement) : (prevBal - netSettlement);
    } else {
      newBal = voucherType === 'CRV' ? (prevBal - netSettlement) : (prevBal + netSettlement);
    }
...
  }

  // in handleSaveVoucher:
  const amount = Number(dom.amountInput.value) || 0;
  const discount = Number(dom.discountInput.value) || 0;
  const netAmount = amount + discount;
  ...
  let newBal = prevBal;
  if (isSupp) {
    newBal = voucherType === 'CRV' ? (prevBal + netAmount) : (prevBal - netAmount);
  } else {
    newBal = voucherType === 'CRV' ? (prevBal - netAmount) : (prevBal + netAmount);
  }
```

#### `src/accounts/accounts-db.js` (Lines 195–202, 316–377, 424–578)
```javascript
function getVoucherBalanceDelta(isSupp, voucherType, netAmount) {
  const net = Number(netAmount) || 0;
  if (isSupp) {
    return voucherType === 'CRV' ? +net : -net;
  } else {
    return voucherType === 'CRV' ? -net : +net;
  }
}

function saveVoucher(voucherData) {
  ...
  db.exec('BEGIN TRANSACTION;');
  try {
    const existing = db.prepare('SELECT id, voucherType, partyType, partyId, netAmount FROM accounts_vouchers WHERE id = ? OR voucherNo = ?').get(id, voucherNo);
    let oldDelta = 0;
    let oldPartyId = '';

    if (existing) {
      oldPartyId = existing.partyId;
      const wasOldSupp = isSupplierParty(existing.partyId, existing.partyType);
      oldDelta = getVoucherBalanceDelta(wasOldSupp, existing.voucherType, existing.netAmount);

      db.prepare(`
        UPDATE accounts_vouchers SET
          voucherType = ?, manualNo = ?, entryDate = ?, partyId = ?, partyTitle = ?,
          partyType = ?, phone = ?, areaName = ?, city = ?, previousBalance = ?,
          amount = ?, discount = ?, netAmount = ?, newBalance = ?, paymentMode = ?,
          accountTitle = ?, chequeOrRefNo = ?, remarks = ?
        WHERE id = ?
      `).run(
        voucherType, manualNo, entryDate, partyId, partyTitle,
        partyType, phone, areaName, city, prevBalance,
        amount, discount, netAmount, newBalance, paymentMode,
        accountTitle, chequeOrRefNo, remarks, existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO accounts_vouchers (
          id, voucherType, voucherNo, manualNo, entryDate, partyId, partyTitle,
          partyType, phone, areaName, city, previousBalance, amount, discount,
          netAmount, newBalance, paymentMode, accountTitle, chequeOrRefNo, remarks, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, voucherType, voucherNo, manualNo, entryDate, partyId, partyTitle,
        partyType, phone, areaName, city, prevBalance, amount, discount,
        netAmount, newBalance, paymentMode, accountTitle, chequeOrRefNo, remarks, now
      );
    }

    db.exec('COMMIT;');
    if (checkpointFn) checkpointFn();

    // Adjust Party Balance
    if (generalInfoRef && generalInfoRef.updatePartyBalance) {
      if (existing) {
        if (oldPartyId === partyId) {
          generalInfoRef.updatePartyBalance(partyId, balanceDelta - oldDelta);
        } else {
          if (oldPartyId) generalInfoRef.updatePartyBalance(oldPartyId, -oldDelta);
          if (partyId) generalInfoRef.updatePartyBalance(partyId, balanceDelta);
        }
      } else if (partyId) {
        generalInfoRef.updatePartyBalance(partyId, balanceDelta);
      }
    }

    return { success: true, id, voucherNo, voucherType };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error saving accounts voucher:', err);
    throw err;
  }
}

function getPartyLedger(partyId, fromDate = '', toDate = '') {
  if (!partyId) return { party: null, openingBalance: 0, entries: [], closingBalance: 0, totalDebit: 0, totalCredit: 0 };

  let party = null;
  if (generalInfoRef && generalInfoRef.getParties) {
    const parties = generalInfoRef.getParties();
    party = (parties || []).find(p => p.id === partyId) || null;
  }

  const entries = [];

  // 1. Gather Sales for this party (excluding estimates)
  let sales = [];
  try {
    sales = db.prepare("SELECT * FROM sales WHERE partyId = ? AND (billStatus IS NULL OR billStatus != 'Estimated')").all(partyId);
  } catch (_e) { sales = []; }

  for (const s of sales) {
    entries.push({
      date: s.entryDate || s.createdAt.slice(0, 10),
      voucherNo: s.voucherNo,
      type: 'Sale Bill',
      description: `${s.paymentType || 'Credit'} Sale - Gross: ${s.grossAmount || 0}, Disc: ${s.discount || 0}`,
      debit: Number(s.netAmount) || 0,
      credit: Number(s.paidAmount) || 0,
      createdAt: s.createdAt
    });
  }

  // 2. Gather Sales Returns for this party
  let returns = [];
  try {
    returns = db.prepare('SELECT * FROM sales_returns WHERE partyId = ?').all(partyId);
  } catch (_e) { returns = []; }

  for (const r of returns) {
    const isCredit = (r.refundMode || 'Credit') === 'Credit';
    const amount = Number(r.totalAmount ?? r.netRefund ?? r.grandTotal ?? 0);
    entries.push({
      date: r.entryDate || (r.createdAt ? r.createdAt.slice(0, 10) : ''),
      voucherNo: r.returnNo,
      type: 'Sale Return',
      description: `Sales Return (${r.refundMode || 'Credit'}) - ${r.description || r.remarks || 'Returned Goods'}`,
      debit: isCredit ? 0 : amount,
      credit: amount,
      createdAt: r.createdAt || ''
    });
  }

  // 3. Gather Purchases for this party
  let purchases = [];
  try {
    purchases = db.prepare('SELECT * FROM purchases WHERE partyId = ?').all(partyId);
  } catch (_e) { purchases = []; }

  for (const p of purchases) {
    entries.push({
      date: p.entryDate || (p.createdAt ? p.createdAt.slice(0, 10) : ''),
      voucherNo: p.voucherNo,
      type: 'Purchase Bill',
      description: `Purchase Inventory (${p.description || 'Stock Received'})`,
      debit: 0,
      credit: Number(p.grandTotal) || 0,
      createdAt: p.createdAt || ''
    });
  }

  // 4. Gather Accounts Vouchers (CRV & CPV)
  let vouchers = [];
  try {
    vouchers = db.prepare('SELECT * FROM accounts_vouchers WHERE partyId = ?').all(partyId);
  } catch (_e) { vouchers = []; }

  for (const v of vouchers) {
    const isCRV = (v.voucherType === 'CRV');
    entries.push({
      date: v.entryDate || (v.createdAt ? v.createdAt.slice(0, 10) : ''),
      voucherNo: v.voucherNo,
      type: isCRV ? 'Cash Receipt (CRV)' : 'Cash Payment (CPV)',
      description: `${isCRV ? 'Received Cash' : 'Paid Cash'} via ${v.paymentMode || 'Cash'} ${v.remarks ? '- ' + v.remarks : ''} ${v.discount > 0 ? `(Disc: ${v.discount})` : ''}`,
      debit: isCRV ? 0 : Number(v.netAmount || v.amount || 0),
      credit: isCRV ? Number(v.netAmount || v.amount || 0) : 0,
      createdAt: v.createdAt || ''
    });
  }

  entries.sort((a, b) => {
    const cmp = (a.date || '').localeCompare(b.date || '');
    if (cmp !== 0) return cmp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  let baseOpeningBal = Number(party ? party.openingBalance : 0) || 0;
  let openingBal = baseOpeningBal;
  let runningBal = openingBal;
  let totalDebit = 0;
  let totalCredit = 0;

  const filteredEntries = [];
  const isSupp = isSupplierParty(partyId, party ? party.partyTypeName : '');

  for (const entry of entries) {
    const entryDate = entry.date || '';
    const entryDelta = isSupp ? (entry.credit - entry.debit) : (entry.debit - entry.credit);

    if (fromDate && entryDate < fromDate) {
      openingBal += entryDelta;
      continue;
    }

    if (toDate && entryDate > toDate) {
      continue;
    }

    runningBal = (filteredEntries.length === 0 ? openingBal : runningBal) + entryDelta;
    entry.balance = runningBal;
    totalDebit += entry.debit;
    totalCredit += entry.credit;
    filteredEntries.push(entry);
  }

  const closingBalance = (filteredEntries.length > 0)
    ? filteredEntries[filteredEntries.length - 1].balance
    : openingBal;

  return {
    party,
    openingBalance: openingBal,
    entries: filteredEntries,
    closingBalance,
    totalDebit,
    totalCredit
  };
}
```

#### `src/Genral info/general-info-db.js` (Lines 806–834)
```javascript
function updatePartyBalance(partyId, deltaBalance) {
  if (!partyId || !deltaBalance) return;
  const num = Number(deltaBalance);
  if (isNaN(num) || num === 0) return;

  if (isJson) {
    const p = (jsonStore.parties || []).find(x => x.id === partyId);
    if (p) {
      if (p.currentBalance === undefined) {
        p.currentBalance = Number(p.openingBalance) || 0;
      }
      p.currentBalance = Number(p.currentBalance || 0) + num;
      if (saveJsonFn) saveJsonFn();
    }
    return;
  }
  if (!db) return;
  try {
    db.prepare(`
      UPDATE parties
      SET currentBalance = COALESCE(currentBalance, openingBalance, 0) + ?
      WHERE id = ?
    `).run(num, String(partyId));
    if (checkpointFn) checkpointFn();
  } catch (err) {
    console.error('Failed to update party balance in general-info-db:', err);
  }
}
```

---

### 1.6 All SQL Queries & Statements in the System

| Target Table | SQL Statement (Verbatim) | File & Line |
|---|---|---|
| `units` | `CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT DEFAULT '', createdAt TEXT NOT NULL);` | `src/database/db.js:133-138` |
| `product_types` | `CREATE TABLE IF NOT EXISTS product_types (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', createdAt TEXT NOT NULL);` | `src/database/db.js:143-148` |
| `product_categories` | `CREATE TABLE IF NOT EXISTS product_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT DEFAULT '', createdAt TEXT NOT NULL);` | `src/database/db.js:153-158` |
| `product_sub_categories`| `CREATE TABLE IF NOT EXISTS product_sub_categories (id TEXT PRIMARY KEY, categoryId TEXT NOT NULL, name TEXT NOT NULL, code TEXT DEFAULT '', createdAt TEXT NOT NULL);` | `src/database/db.js:163-169` |
| `products` | `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, barcode TEXT DEFAULT '', additionalCode TEXT DEFAULT '', categoryId TEXT DEFAULT '', categoryName TEXT DEFAULT '', subCategoryId TEXT DEFAULT '', subCategoryName TEXT DEFAULT '', titleEng TEXT NOT NULL, titleUrdu TEXT DEFAULT '', packingType TEXT DEFAULT 'Piece', unitId TEXT DEFAULT '', unitName TEXT DEFAULT '', packSize REAL DEFAULT 1, purchasePrice REAL DEFAULT 0, profitMargin REAL DEFAULT 0, retailPrice REAL DEFAULT 0, wholesalePrice REAL DEFAULT 0, averageCost REAL DEFAULT 0, minStock REAL DEFAULT 0, reorderLevel REAL DEFAULT 0, stockQty REAL DEFAULT 0, location TEXT DEFAULT '', productType TEXT DEFAULT 'Both', taxPercent REAL DEFAULT 0, shortCode TEXT DEFAULT '', shortLabel TEXT DEFAULT '', description TEXT DEFAULT '', useBatchExpiry INTEGER DEFAULT 0, loosePackSize INTEGER DEFAULT 0, inActive INTEGER DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);` | `src/database/db.js:174-208` |
| `purchases` | `CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, voucherNo TEXT UNIQUE NOT NULL, manualNo TEXT DEFAULT '', entryDate TEXT NOT NULL, partyId TEXT NOT NULL, partyTitle TEXT NOT NULL, description TEXT DEFAULT '', storeTitle TEXT DEFAULT 'Store', receivable REAL DEFAULT 0, contactPerson TEXT DEFAULT '', dueDate TEXT DEFAULT '', totalAmount REAL DEFAULT 0, discount REAL DEFAULT 0, freightDisc REAL DEFAULT 0, freightExpn REAL DEFAULT 0, salesTax REAL DEFAULT 0, extraCharges REAL DEFAULT 0, grandTotal REAL DEFAULT 0, itemsJson TEXT DEFAULT '[]', createdAt TEXT NOT NULL);` | `src/database/db.js:213-234` |
| `purchase_items` | `CREATE TABLE IF NOT EXISTS purchase_items (id TEXT PRIMARY KEY, purchaseId TEXT NOT NULL, srNo INTEGER DEFAULT 1, productId TEXT, productCode TEXT NOT NULL, productTitle TEXT NOT NULL, packQty REAL DEFAULT 0, unitQty REAL DEFAULT 0, bonus REAL DEFAULT 0, tradePrice REAL DEFAULT 0, profitMargin REAL DEFAULT 0, retailPrice REAL DEFAULT 0, wholesalePrice REAL DEFAULT 0, tradeOffer REAL DEFAULT 0, discountPercent REAL DEFAULT 0, netAmount REAL DEFAULT 0);` | `src/database/db.js:239-256` |
| `sales` | `CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, voucherNo TEXT UNIQUE NOT NULL, manualNo TEXT DEFAULT '', entryDate TEXT NOT NULL, partyId TEXT NOT NULL, partyTitle TEXT NOT NULL, customerPhone TEXT DEFAULT '', areaName TEXT DEFAULT '', description TEXT DEFAULT '', storeTitle TEXT DEFAULT 'Main Store', paymentType TEXT DEFAULT 'Cash', previousBalance REAL DEFAULT 0, grossAmount REAL DEFAULT 0, discount REAL DEFAULT 0, netAmount REAL DEFAULT 0, paidAmount REAL DEFAULT 0, balanceDue REAL DEFAULT 0, billStatus TEXT DEFAULT 'Paid', itemsJson TEXT DEFAULT '[]', createdAt TEXT NOT NULL);` | `src/database/db.js:261-282` |
| `sale_items` | `CREATE TABLE IF NOT EXISTS sale_items (id TEXT PRIMARY KEY, saleId TEXT NOT NULL, srNo INTEGER DEFAULT 1, productId TEXT, productCode TEXT NOT NULL, productTitle TEXT NOT NULL, packSize REAL DEFAULT 1, packQty REAL DEFAULT 0, unitQty REAL DEFAULT 0, totalQty REAL DEFAULT 0, purchasePrice REAL DEFAULT 0, wholesalePrice REAL DEFAULT 0, retailPrice REAL DEFAULT 0, salePrice REAL DEFAULT 0, discountPercent REAL DEFAULT 0, discountAmount REAL DEFAULT 0, netAmount REAL DEFAULT 0, createdAt TEXT NOT NULL);` | `src/database/db.js:287-306` |
| `sales_returns` | `CREATE TABLE IF NOT EXISTS sales_returns (id TEXT PRIMARY KEY, returnNo TEXT UNIQUE NOT NULL, saleVoucherRef TEXT DEFAULT '', entryDate TEXT NOT NULL, partyId TEXT NOT NULL, partyTitle TEXT NOT NULL, customerPhone TEXT DEFAULT '', areaName TEXT DEFAULT '', description TEXT DEFAULT '', refundMode TEXT DEFAULT 'Credit', totalItems INTEGER DEFAULT 0, totalPieces REAL DEFAULT 0, totalAmount REAL DEFAULT 0, paidRefund REAL DEFAULT 0, itemsJson TEXT DEFAULT '[]', createdAt TEXT NOT NULL);` | `src/database/db.js:311-328` |
| `sale_return_items` | `CREATE TABLE IF NOT EXISTS sale_return_items (id TEXT PRIMARY KEY, returnId TEXT NOT NULL, srNo INTEGER DEFAULT 1, productId TEXT, productCode TEXT NOT NULL, productTitle TEXT NOT NULL, packSize REAL DEFAULT 1, packQty REAL DEFAULT 0, unitQty REAL DEFAULT 0, totalQty REAL DEFAULT 0, returnRate REAL DEFAULT 0, netAmount REAL DEFAULT 0, condition TEXT DEFAULT 'Good', createdAt TEXT NOT NULL);` | `src/database/db.js:333-348` |
| `accounts_vouchers` | `CREATE TABLE IF NOT EXISTS accounts_vouchers (id TEXT PRIMARY KEY, voucherType TEXT NOT NULL, voucherNo TEXT UNIQUE NOT NULL, manualNo TEXT DEFAULT '', entryDate TEXT NOT NULL, partyId TEXT NOT NULL, partyTitle TEXT NOT NULL, partyType TEXT DEFAULT '', phone TEXT DEFAULT '', areaName TEXT DEFAULT '', city TEXT DEFAULT '', previousBalance REAL DEFAULT 0, amount REAL DEFAULT 0, discount REAL DEFAULT 0, netAmount REAL DEFAULT 0, newBalance REAL DEFAULT 0, paymentMode TEXT DEFAULT 'Cash', accountTitle TEXT DEFAULT 'Main Cash Account', chequeOrRefNo TEXT DEFAULT '', remarks TEXT DEFAULT '', createdAt TEXT NOT NULL);` | `src/accounts/accounts-db.js:31-53` |
| `expenses` | `CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, voucherNo TEXT UNIQUE NOT NULL, entryDate TEXT NOT NULL, accountCode TEXT DEFAULT '', accountTitle TEXT NOT NULL, category TEXT DEFAULT 'General', amount REAL DEFAULT 0, paymentMode TEXT DEFAULT 'Cash', paidTo TEXT DEFAULT '', remarks TEXT DEFAULT '', createdAt TEXT NOT NULL);` | `src/database/trade-features-db.js:45-57` |
| `estimates` | `CREATE TABLE IF NOT EXISTS estimates (id TEXT PRIMARY KEY, estimateNo TEXT UNIQUE NOT NULL, entryDate TEXT NOT NULL, partyId TEXT DEFAULT '', partyName TEXT NOT NULL, customerPhone TEXT DEFAULT '', city TEXT DEFAULT '', remarks TEXT DEFAULT '', grossAmount REAL DEFAULT 0, discount REAL DEFAULT 0, netAmount REAL DEFAULT 0, status TEXT DEFAULT 'Pending', itemsJson TEXT DEFAULT '[]', createdAt TEXT NOT NULL);` | `src/database/trade-features-db.js:91-106` |
| `estimate_items` | `CREATE TABLE IF NOT EXISTS estimate_items (id TEXT PRIMARY KEY, estimateId TEXT NOT NULL, srNo INTEGER DEFAULT 1, productId TEXT DEFAULT '', productCode TEXT DEFAULT '', productTitle TEXT NOT NULL, packSize REAL DEFAULT 1, qty REAL DEFAULT 1, rate REAL DEFAULT 0, netAmount REAL DEFAULT 0);` | `src/database/trade-features-db.js:110-121` |
| `claims` | `CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, claimNo TEXT UNIQUE NOT NULL, entryDate TEXT NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT DEFAULT '', supplierName TEXT DEFAULT '', productTitle TEXT NOT NULL, quantity REAL DEFAULT 1, faultReason TEXT DEFAULT '', status TEXT DEFAULT 'Received', createdAt TEXT NOT NULL);` | `src/database/trade-features-db.js:126-138` |
| `day_end_closings` | `CREATE TABLE IF NOT EXISTS day_end_closings (id TEXT PRIMARY KEY, closingDate TEXT UNIQUE NOT NULL, openingDrawerCash REAL DEFAULT 0, totalCashSales REAL DEFAULT 0, totalCrvReceived REAL DEFAULT 0, totalCpvPaid REAL DEFAULT 0, totalExpensesPaid REAL DEFAULT 0, expectedDrawerCash REAL DEFAULT 0, actualCountedCash REAL DEFAULT 0, cashDifference REAL DEFAULT 0, cashDeliveredToManager REAL DEFAULT 0, closingDrawerBalance REAL DEFAULT 0, notes TEXT DEFAULT '', closedBy TEXT DEFAULT 'Admin', createdAt TEXT NOT NULL);` | `src/database/trade-features-db.js:143-159` |
| `parties` | `CREATE TABLE IF NOT EXISTS parties (id TEXT PRIMARY KEY, partyTypeId TEXT NOT NULL, partyTypeName TEXT NOT NULL, name TEXT NOT NULL, urduTitle TEXT DEFAULT '', phone TEXT DEFAULT '', mobile TEXT DEFAULT '', address TEXT DEFAULT '', city TEXT DEFAULT '', provinceId TEXT DEFAULT '', provinceName TEXT DEFAULT '', areaId TEXT DEFAULT '', areaName TEXT DEFAULT '', openingBalance REAL DEFAULT 0, currentBalance REAL DEFAULT 0, creditLimit REAL DEFAULT 0, ntn TEXT DEFAULT '', cnic TEXT DEFAULT '', strn TEXT DEFAULT '', email TEXT DEFAULT '', remarks TEXT DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);` | `src/Genral info/general-info-db.js:140-165` |
| `products` | `UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?` | `src/database/db.js:1384, 1411` |
| `products` | `UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?` | `src/database/db.js:1330, 1488, 1732` |
| `parties` | `UPDATE parties SET currentBalance = COALESCE(currentBalance, openingBalance, 0) + ? WHERE id = ?` | `src/Genral info/general-info-db.js:824-828` |

*(Note: The database contains no triggers, stored procedures, or views. SQLite does not support stored procedures).*

---

### 1.7 IPC Handlers & Renderer Call Map

| Channel | Handler (`src/main.js`) | Preload Bridge (`src/preload.js`) | Calling Renderer Modules |
|---|---|---|---|
| `updater:get-version` | Line 388 | `electronAPI.getAppVersion` (Line 73) | `src/renderer.js:380`, `src/settings/settings.js:40` |
| `updater:check` | Line 392 | `electronAPI.checkForUpdates` (Line 72) | `src/settings/settings.js:520` |
| `verify-pin` | Line 424 | `authAPI.verifyPin` (Line 5) | `src/auth/login.js:42`, `src/settings/settings.js:680` |
| `login-success` | Line 428 | `authAPI.loginSuccess` (Line 6) | `src/auth/login.js:65` |
| `logout` | Line 434 | `authAPI.logout` (Line 7) | `src/renderer.js:125` |
| `get-data` | Line 443 | `electronAPI.getData` (Line 12) | `src/renderer.js:38` |
| `get-units` | Line 448 | `electronAPI.getUnits` (Line 15) | `src/inventory/inventory.js:210` |
| `save-unit` | Line 449 | `electronAPI.saveUnit` (Line 16) | `src/inventory/inventory.js:390` |
| `delete-unit` | Line 450 | `electronAPI.deleteUnit` (Line 17) | `src/inventory/inventory.js:410` |
| `get-product-types` | Line 455 | `electronAPI.getProductTypes` (Line 20) | `src/inventory/inventory.js:212` |
| `save-product-type` | Line 456 | `electronAPI.saveProductType` (Line 21) | `src/inventory/inventory.js:450` |
| `delete-product-type` | Line 457 | `electronAPI.deleteProductType` (Line 22) | `src/inventory/inventory.js:470` |
| `get-general-info` | Line 462 | `generalInfoAPI.getGeneralInfo` (Line 135) | `src/Genral info/general-info.js:50` |
| `save-company-info` | Line 466 | `generalInfoAPI.saveCompanyInfo` (Line 136) | `src/Genral info/general-info.js:240` |
| `get-parties` | Line 510 | `generalInfoAPI.getParties` (Line 147) | `src/accounts/accounts.js:822`, `src/inventory/inventory.js:1110` |
| `add-party` | Line 514 | `generalInfoAPI.addParty` (Line 148) | `src/Genral info/general-info.js:1150` |
| `update-party` | Line 518 | `generalInfoAPI.updateParty` (Line 149) | `src/Genral info/general-info.js:1180` |
| `delete-party` | Line 522 | `generalInfoAPI.deleteParty` (Line 150) | `src/Genral info/general-info.js:1240` |
| `get-products` | Line 539 | `electronAPI.getProducts` (Line 33) | `src/sales/sales.js:83`, `src/find-product/find-product.js:30` |
| `save-product` | Line 543 | `electronAPI.saveProduct` (Line 37) | `src/inventory/inventory.js:2500` |
| `delete-product` | Line 544 | `electronAPI.deleteProduct` (Line 38) | `src/inventory/inventory.js:2600` |
| `get-purchases` | Line 550 | `electronAPI.getPurchases` (Line 42) | `src/inventory/inventory.js:1060` |
| `save-purchase` | Line 553 | `electronAPI.savePurchase` (Line 45) | `src/inventory/inventory.js:1530, 1815` |
| `delete-purchase` | Line 554 | `electronAPI.deletePurchase` (Line 46) | `src/inventory/inventory.js:1180` |
| `get-sales` | Line 559 | `electronAPI.getSales` (Line 49) / `salesAPI.getSales` (Line 78) | `src/sales/sales.js:2092, 3315` |
| `save-sale` | Line 562 | `electronAPI.saveSale` (Line 52) / `salesAPI.saveSale` (Line 81) | `src/sales/sales.js:2095` |
| `delete-sale` | Line 563 | `electronAPI.deleteSale` (Line 53) / `salesAPI.deleteSale` (Line 82) | `src/sales/sales.js:6062` |
| `get-sale-returns` | Line 568 | `salesReturnAPI.getReturns` (Line 87) | `src/sales/sales.js:5375` |
| `save-sale-return` | Line 571 | `salesReturnAPI.saveReturn` (Line 90) | `src/sales/sales.js:4890` |
| `delete-sale-return` | Line 572 | `salesReturnAPI.deleteReturn` (Line 91) | `src/sales/sales.js:6075` |
| `get-accounts-vouchers` | Line 577 | `accountsAPI.getAllVouchers` (Line 96) | `src/accounts/accounts.js:1540` |
| `save-accounts-voucher` | Line 580 | `accountsAPI.saveVoucher` (Line 99) | `src/accounts/accounts.js:1003` |
| `delete-accounts-voucher` | Line 581 | `accountsAPI.deleteVoucher` (Line 100) | `src/accounts/accounts.js:1042` |
| `get-party-ledger` | Line 582 | `accountsAPI.getPartyLedger` (Line 101) | `src/accounts/accounts.js:1320` |
| `get-expenses` | Line 587 | `tradeFeaturesAPI.getExpenses` (Line 107) | `src/features/trade-features.js:560` |
| `save-expense` | Line 589 | `tradeFeaturesAPI.saveExpense` (Line 109) | `src/features/trade-features.js:540` |
| `delete-expense` | Line 590 | `tradeFeaturesAPI.deleteExpense` (Line 110) | `src/features/trade-features.js:580` |
| `get-reports-master-data` | Line 620 | `reportsAPI.getReportsMasterData` (Line 181) | `src/reports/reports.js:140` |
| `export-pdf` | Line 627 | `electronAPI.exportPDF` (Line 66) | `src/reports/reports.js:2400` |
| `export-excel` | Line 631 | `electronAPI.exportExcel` (Line 67) | `src/reports/reports.js:2430` |
| `export-csv` | Line 635 | `electronAPI.exportCSV` (Line 68) | `src/reports/reports.js:2460` |
| `backup-database` | Line 655 | `settingsAPI.backupDatabase` (Line 170) | `src/settings/settings.js:450` |
| `restore-database` | Line 658 | `settingsAPI.restoreDatabase` (Line 171) | `src/settings/settings.js:480` |
| `optimize-database` | Line 687 | `settingsAPI.optimizeDatabase` (Line 172) | `src/settings/settings.js:500` |

---

## PART 2: Amount Flow, Step by Step

### 1. New Sale
- **Trace:**
  - Input box `el.packQty` (`#salePackQty`) & `el.unitQty` & `el.salePrice`
  - Function `updateLineCalculations()` (`src/sales/sales.js:1528`)
    - Formula: `totalQty = (packQty * packSize) + unitQty`
    - Formula: `grossLine = totalQty * rate`
    - Formula: `discAmt = grossLine * (discPct / 100)`
    - Formula: `netLine = Math.max(0, grossLine - discAmt)`
  - Function `addCurrentItem()` (`src/sales/sales.js:1548`) -> Pushes item into `saleState.items`
  - Function `updateVoucherTotals()` (`src/sales/sales.js:1854`)
    - Formula: `gross = sum(it.netAmount)`
    - Formula: `netTotal = Math.max(0, gross - specialDisc)`
    - Formula: `balanceDue = Math.max(0, netTotal - paid)`
    - Formula: `returnChange = Math.max(0, paid - netTotal)`
  - Function `executeSaveSale()` (`src/sales/sales.js:2000`)
  - IPC: `window.salesAPI.saveSale(saleRecord, itemsSnapshot)` -> Channel `save-sale` (`src/main.js:562`)
  - Backend: `db.saveSale(saleData, items)` (`src/database/db.js:1184`)
  - Query 1: `INSERT INTO sales (grossAmount, discount, netAmount, paidAmount, balanceDue, billStatus...) VALUES (...)` (`src/database/db.js:1354`)
  - Query 2: `INSERT INTO sale_items (totalQty, salePrice, discountPercent, discountAmount, netAmount...) VALUES (...)` (`src/database/db.js:1375`)
  - Query 3: `UPDATE products SET stockQty = MAX(0, stockQty - ?) WHERE code = ? OR id = ?` (`src/database/db.js:1383`)
  - Query 4: `UPDATE parties SET currentBalance = COALESCE(currentBalance, openingBalance, 0) + ? WHERE id = ?` (`src/Genral info/general-info-db.js:824`)
  - Screen: Returned to screen via `loadAndRenderSalesTable()` (`src/sales/sales.js:3368`) and POS product cards (`renderPosProductCatalog()`).
- **State Impact:**
  - **Stock Quantity:** Decreased by `totalQty` for each line item.
  - **Customer Balance:** Increased by `balanceDue` if customer is registered (`isRegPartySql`). If `paid > netTotal`, customer balance change is `+0` (overpayment is ignored in DB).
  - **Cash or Bank:** No dedicated cash ledger entry is written; `paidAmount` is stored in `sales.paidAmount`.
  - **Profit:** Estimated profit calculated on screen: `netTotal - sum(purchasePrice * totalQty)`.

### 2. Edit Sale
- **Trace:**
  - Screen action: Click "Edit" in sales history table (`src/sales/sales.js:3448`)
  - Function: `editSale(id)` (`src/sales/sales.js:3651`) -> loads sale into `saleState.items` and inputs.
  - User changes quantity via `changeItemQty(idx, newQty)` (`src/sales/sales.js:189`)
    - Formula: `discAmt = (it.salePrice * qty) * (discPct / 100)`
    - Formula: `it.netAmount = (it.salePrice * qty) - discAmt`
  - Function `updateVoucherTotals()` -> recalculates `gross, netTotal, balanceDue`.
  - Function `executeSaveSale()` (`src/sales/sales.js:2000`) -> IPC `save-sale` -> `db.saveSale` (`src/database/db.js:1184`).
  - Query 1: `SELECT productId, productCode, totalQty FROM sale_items WHERE saleId = ?` (`db.js:1327`)
  - Query 2: `UPDATE products SET stockQty = stockQty + ? WHERE code = ? OR id = ?` (`db.js:1329`) -> reverses old stock reduction.
  - Query 3: `DELETE FROM sale_items WHERE saleId = ?` (`db.js:1334`)
  - Query 4: `UPDATE sales SET ... WHERE id = ?` (`db.js:1340`)
  - Query 5: `INSERT INTO sale_items (...) VALUES (...)` (`db.js:1375`)
  - Query 6: `UPDATE products SET stockQty = MAX(0, stockQty - ?)` (`db.js:1383`) -> applies new stock reduction.
  - Query 7 (After Commit): `UPDATE parties SET currentBalance = currentBalance + (newBalanceDue - oldBalanceDue)` (`db.js:1432`).
- **State Impact:**
  - **Stock Quantity:** Old items restored, new items deducted.
  - **Customer Balance:** Adjusted by `newBalanceDue - oldBalanceDue`.
  - **Cash or Bank:** Updated `paidAmount` saved in `sales.paidAmount`.
  - **Profit:** Recalculated dynamically from updated items.

### 3. Delete Sale
- **Trace:**
  - Screen action: Click Delete -> `deleteSalePrompt(id)` (`src/sales/sales.js:6054`)
  - IPC: `window.salesAPI.deleteSale(id)` -> Channel `delete-sale` (`src/main.js:563`)
  - Backend: `db.deleteSale(id)` (`src/database/db.js:1452`)
  - Query 1: `SELECT id, partyId, balanceDue, billStatus FROM sales WHERE id = ?` (`db.js:1478`)
  - Query 2: `UPDATE parties SET currentBalance = currentBalance - balanceDue` (Only if `balanceDue > 0`) (`db.js:1483`)
  - Query 3: `SELECT productId, productCode, totalQty FROM sale_items WHERE saleId = ?` (`db.js:1485`)
  - Query 4: `UPDATE products SET stockQty = stockQty + ?` (`db.js:1488`) -> Restores stock.
  - Query 5: `DELETE FROM sale_items WHERE saleId = ?` (`db.js:1492`)
  - Query 6: `DELETE FROM sales WHERE id = ?` (`db.js:1493`)
- **State Impact:**
  - **Stock Quantity:** Restored (`stockQty = stockQty + totalQty`).
  - **Customer Balance:** Reduced by `s.balanceDue` (if `balanceDue > 0`). If `balanceDue == 0`, no adjustment is made to party balance.
  - **Cash or Bank:** Stored sale deleted; no cash ledger reversal entry created.
  - **Profit:** Removed from all subsequent sales and profit aggregations.

### 4. Sale Return
- **Trace:**
  - Input box `retQty` & `retRate` -> Function `updateReturnLineCalculations()` (`src/sales/sales.js:4321`)
  - Function `addCurrentReturnItem()` (`src/sales/sales.js:4335`) -> `saleReturnState.items`
  - Function `updateReturnTotals()` (`src/sales/sales.js:4850`)
    - Formula: `totalAmount = sum(it.netAmount)`
  - Function `confirmSaveSaleReturn()` (`src/sales/sales.js:4880`)
  - IPC: `window.salesReturnAPI.saveReturn(returnData, items)` -> Channel `save-sale-return` (`src/main.js:571`)
  - Backend: `db.saveSaleReturn(returnData, items)` (`src/database/db.js:1592`)
  - Query 1: `INSERT INTO sales_returns (...) VALUES (...)` (`db.js:1704`)
  - Query 2: `INSERT INTO sale_return_items (...) VALUES (...)` (`db.js:1723`)
  - Query 3: `UPDATE products SET stockQty = stockQty + ?` (`db.js:1732`) -> Stock restored.
  - Query 4 (After Commit): If `refundMode === 'Credit'`, `UPDATE parties SET currentBalance = currentBalance - totalAmount` (`db.js:1767`).
- **State Impact:**
  - **Stock Quantity:** Increased by returned quantity.
  - **Customer Balance:** Decreased by `totalAmount` if `refundMode === 'Credit'`. Unchanged if `refundMode === 'Cash'`.
  - **Cash or Bank:** If `refundMode === 'Cash'`, physical cash is refunded, but `day_end_closings` does NOT deduct it.
  - **Profit:** Revenue reduced by `totalAmount` in P&L report.

### 5. New Purchase
- **Trace:**
  - Inputs: `pieTradePrice, pieRetailPrice, pieWholesalePrice, piePackQty, pieUnitQty, pieBonus, pieTradeOffer, pieDiscPercent`
  - Function: `updateLineNetPreview()` (`src/inventory/inventory.js:1320`)
    - Formula: `lineGross = (packQty * packSize + unitQty) * tradePrice - tradeOffer`
    - Formula: `lineNet = lineGross * (1 - discPercent / 100)`
  - Function `calculatePurchaseBill()` (`src/inventory/inventory.js:1708`)
    - Formula: `grandTotal = lineSum - discount - freightDisc + freightExpn + salesTax + extraCharges`
  - Function `savePurchaseVoucher()` (`src/inventory/inventory.js:1769`)
  - IPC: `window.api.savePurchase(purchaseData, currentPurchaseItems)` -> Channel `save-purchase` (`src/main.js:553`)
  - Backend: `db.savePurchase` (`src/database/db.js:823`)
  - Query 1: `INSERT INTO purchases (...) VALUES (...)` (`db.js:988`)
  - Query 2: `INSERT INTO purchase_items (...) VALUES (...)` (`db.js:1008`)
  - Query 3: `UPDATE products SET stockQty = stockQty + ?, purchasePrice = ?, wholesalePrice = ?, retailPrice = ?, profitMargin = ?` (`db.js:1016`)
  - Query 4: `UPDATE products SET averageCost = ?` (Weighted average cost calculation) (`db.js:1058`)
  - Query 5 (After Commit): `UPDATE parties SET currentBalance = currentBalance + grandTotal` (`db.js:1083`)
- **State Impact:**
  - **Stock Quantity:** Increased by `packQty * packSize + unitQty + bonus`.
  - **Customer / Supplier Balance:** Supplier balance increased by `grandTotal` (Payable increases).
  - **Cash or Bank:** Unchanged (no cash outflow recorded in purchases table).
  - **Profit:** Average cost and purchase price updated for future COGS calculations.

### 6. Edit Purchase
- **Trace:**
  - Screen action: Click edit purchase in inventory history.
  - Re-opens purchase into `currentPurchaseItems`.
  - Function `savePurchaseVoucher()` (`src/inventory/inventory.js:1769`)
  - IPC: `save-purchase` -> `db.savePurchase` (`src/database/db.js:951`)
  - Query 1: `SELECT productCode, productId, packQty, unitQty, bonus FROM purchase_items WHERE purchaseId = ?` (`db.js:959`)
  - Query 2: `UPDATE products SET stockQty = MAX(0, stockQty - ?)` (`db.js:966`) -> Reverses old stock addition.
  - Query 3: `DELETE FROM purchase_items WHERE purchaseId = ?` (`db.js:985`)
  - Query 4: `UPDATE purchases SET ... WHERE id = ?` (`db.js:970`)
  - Query 5: `INSERT INTO purchase_items (...)` (`db.js:1008`)
  - Query 6: `UPDATE products SET stockQty = stockQty + ?` (`db.js:1016`) -> Adds new stock.
  - Query 7 (After Commit): `UPDATE parties SET currentBalance = currentBalance + (newGrandTotal - oldGrandTotal)` (`db.js:1072`).
- **State Impact:**
  - **Stock Quantity:** Old incoming stock deducted; new incoming stock added.
  - **Supplier Balance:** Adjusted by delta `newGrandTotal - oldGrandTotal`.
  - **Cash or Bank:** Unchanged.
  - **Profit:** Product purchase prices and average costs re-evaluated.

### 7. Purchase Return
- **Trace:**
  - *(Note: The codebase has no dedicated Purchase Return database table or IPC handler; see Section 3 & Part 5)*.

### 8. Stock Adjustment
- **Trace:**
  - Product catalog edit form in `src/inventory/inventory.js:2460` (`saveProductInformation()`)
  - Input: `inv.piStockQty.value`
  - IPC: `electronAPI.saveProduct(productObj)` -> Channel `save-product` (`src/main.js:543`)
  - Backend: `db.saveProduct(p)` (`src/database/db.js:609`)
  - Query: `UPDATE products SET stockQty = ?, purchasePrice = ?, retailPrice = ? ... WHERE id = ?` (`db.js:675`)
- **State Impact:**
  - **Stock Quantity:** Directly overwritten with entered value.
  - **Customer Balance:** Unchanged.
  - **Cash or Bank:** Unchanged.
  - **Profit:** Inventory valuation reflects new quantity (`stockQty * averageCost`).

### 9. Customer Payment Received (CRV)
- **Trace:**
  - Screen: Accounts Module (`src/accounts/accounts.js`) -> Tab `CRV` (Cash Receipt Voucher)
  - Input: `dom.amountInput` (`#accAmountInput`) & `dom.discountInput` (`#accDiscountInput`)
  - Function: `recalculateAmounts()` (`src/accounts/accounts.js:780`)
    - Formula: `netSettlement = amount + discount`
    - Formula: `newBal = prevBal - netSettlement`
  - Function: `handleSaveVoucher()` (`src/accounts/accounts.js:950`)
  - IPC: `accountsAPI.saveVoucher(voucherData)` -> Channel `save-accounts-voucher` (`src/main.js:580`)
  - Backend: `accountsDb.saveVoucher(voucherData)` (`src/accounts/accounts-db.js:205`)
  - Query 1: `INSERT INTO accounts_vouchers (voucherType='CRV', amount, discount, netAmount, newBalance...) VALUES (...)` (`accounts-db.js:342`)
  - Query 2 (After Commit): `UPDATE parties SET currentBalance = currentBalance - netAmount WHERE id = ?` (`general-info-db.js:824`)
- **State Impact:**
  - **Stock Quantity:** Unchanged.
  - **Customer Balance:** Decreased by `netAmount` (`amount + discount`).
  - **Cash or Bank:** Cash drawer receives `amount`.
  - **Profit:** Discount given is not written to expense table; tracked only on voucher.

### 10. Supplier Payment Given (CPV)
- **Trace:**
  - Screen: Accounts Module -> Tab `CPV` (Cash Payment Voucher)
  - Input: `dom.amountInput` & `dom.discountInput`
  - Function: `recalculateAmounts()` (`src/accounts/accounts.js:780`)
    - Formula: `netSettlement = amount + discount`
    - Formula: `newBal = prevBal - netSettlement` (Supplier payable decreases)
  - Function: `handleSaveVoucher()` (`src/accounts/accounts.js:950`)
  - IPC: `accountsAPI.saveVoucher(voucherData)` -> Channel `save-accounts-voucher` (`src/main.js:580`)
  - Backend: `accountsDb.saveVoucher(voucherData)` (`src/accounts/accounts-db.js:205`)
  - Query 1: `INSERT INTO accounts_vouchers (voucherType='CPV', amount, discount, netAmount, newBalance...) VALUES (...)` (`accounts-db.js:342`)
  - Query 2 (After Commit): `UPDATE parties SET currentBalance = currentBalance - netAmount WHERE id = ?` (`general-info-db.js:824`)
- **State Impact:**
  - **Stock Quantity:** Unchanged.
  - **Supplier Balance:** Decreased by `netAmount` (`amount + discount`).
  - **Cash or Bank:** Cash drawer outflow of `amount`.
  - **Profit:** Unchanged.

### 11. Daily Report (Day-End Cash Closing & Today Summary)
- **Trace:**
  - Screen: Day-End Cash Closing (`src/features/trade-features.js:600`)
  - Function: `loadDailyClosingSummary(date)`
  - IPC: `tradeFeaturesAPI.getDailyClosingSummary(date)` -> Channel `get-daily-closing-summary` (`src/main.js:613`)
  - Backend: `tradeFeaturesDb.getDailyClosingSummary(date)` (`src/database/trade-features-db.js:639`)
  - Queries:
    - `SELECT COALESCE(SUM(paidAmount), 0) FROM sales WHERE entryDate = ? AND paymentType = 'Cash'`
    - `SELECT COALESCE(SUM(amount), 0) FROM accounts_vouchers WHERE entryDate = ? AND voucherType = 'CRV' AND paymentMode = 'Cash'`
    - `SELECT COALESCE(SUM(amount), 0) FROM accounts_vouchers WHERE entryDate = ? AND voucherType = 'CPV' AND paymentMode = 'Cash'`
    - `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE entryDate = ? AND paymentMode = 'Cash'`
    - `SELECT closingDrawerBalance FROM day_end_closings WHERE closingDate < ? ORDER BY closingDate DESC LIMIT 1`
  - Formula: `expectedDrawerCash = openingDrawerCash + totalCashSales + totalCrvReceived - totalCpvPaid - totalExpensesPaid`
- **State Impact:**
  - Reports current cash state; saving day-end closing writes to `day_end_closings`.

### 12. Profit Report (Profit & Loss Performance Statement)
- **Trace:**
  - Screen: Reports Module (`src/reports/reports.js`) -> Tab `profit-loss`
  - Function: `ReportsEngine.generateProfitAndLossReport(masterData, filters)` (`src/reports/reports-engine.js:950`)
  - IPC: `reportsAPI.getReportsMasterData()` -> Channel `get-reports-master-data` (`src/main.js:620`)
  - Backend: `db.getReportsMasterData()` (`src/database/db.js:1523`)
  - Calculations in engine (`reports-engine.js:955-1018`):
    - `totalSalesRevenue = sum(s.netAmount)`
    - `totalSalesDiscounts = sum(s.discount)`
    - `totalCostOfGoodsSold = sum(qty * it.purchasePrice)`
    - `totalRefunds = sum(r.totalAmount)`
    - `netSales = Math.max(0, totalSalesRevenue - totalSalesDiscounts - totalRefunds)`
    - `grossProfit = netSales - totalCostOfGoodsSold`
    - `operatingExpenses = sum(v.netAmount) where v.voucherType == 'CPV' and expense keywords`
    - `netProfit = grossProfit - operatingExpenses`

### 13. Stock Report (Stock Position Report)
- **Trace:**
  - Screen: Reports Module -> Tab `stock-position`
  - Function: `ReportsEngine.generateStockPositionReport(products, filters)` (`src/reports/reports-engine.js:636`)
  - Backend: `db.getAllProducts()` -> `SELECT * FROM products ORDER BY titleEng ASC` (`db.js:585`)
  - Engine loops products matching category/subcategory:
    - `costValue = stockQty * averageCost`
    - `retailValue = stockQty * retailPrice`
    - `wholesaleValue = stockQty * wholesalePrice`
    - `potentialProfit = retailValue - costValue`

### 14. Invoice Print
- **Trace:**
  - Screen: Click Print in POS or Sale History (`src/sales/sales.js:3706`)
  - Function: `openReceiptModal(saleData)` (`src/sales/sales.js:2200`)
  - Function: `renderThermalSaleBill(data)` (`src/sales/sales.js:2812`) or `renderA5SaleBill(data)` (`src/sales/sales.js:2780`)
  - Formats line items, gross, discounts, net amount, cash paid, balance due, and customer final balance.

---

## PART 3: Logic Checks

| # | Check Description | Code Verdict | Proof (File:Line) & Explanation |
|---|---|---|---|
| 1 | Same calculation done in two places with different results | **YES** | 1) `sales.js:1880` calculates `newCustomerBalance = prevBal + (netTotal - paid)` (shows balance reduction on overpayment), but `db.js:1442` executes `updatePartyBalance(partyId, Number(saleRecord.balanceDue))` where `balanceDue = Math.max(0, net - paid)` (discards overpayment in DB).<br>2) `trade-features-db.js:670` calculates expected cash including expenses, whereas `reports-engine.js:1076` calculates net cash including returns and purchases but omitting expenses entirely. |
| 2 | Rounding done at different steps, or floating point math on money without rounding | **YES** | `sales.js:1539` calculates `const discAmt = grossLine * (discPct / 100);` without rounding. `accounts-db.js:224` computes `amount + discount` in raw floating point. `reports-engine.js:999` computes `grossProfit = netSales - totalCostOfGoodsSold` without rounding. |
| 3 | Discount applied before or after tax inconsistently | **YES** | In `inventory.js:1505` and `1728`, discount is deducted before sales tax is added (`lineSum - discount - freightDisc + freightExpn + salesTax`). In sales (`src/sales/sales.js`), sales tax is completely missing and never calculated, despite invoice headers stating "Sale Tax Invoice". |
| 4 | Stock reduced on sale but not restored on edit, delete or return | **NO** | Stock is restored on edit (`db.js:1329`), delete (`db.js:1488`), and sales return (`db.js:1732`). |
| 5 | Edit sale: does it reverse the old effect first, then apply the new one? | **YES** | For stock, `db.js:1327-1334` selects old items and restores `stockQty = stockQty + totalQty`, deletes old items, and then inserts new items with `stockQty = MAX(0, stockQty - totalQty)`. For party balance, `db.js:1430` applies `delta = newBalanceDue - oldBalanceDue`. |
| 6 | Multiple related queries without a transaction (if the second fails, is the first left saved?) | **YES** | 1) In `db.js:1065`, `COMMIT;` is executed before `generalInfoDb.updatePartyBalance(...)` at lines 1070-1084. If the party balance update fails, purchase and stock remain committed.<br>2) In `db.js:1416`, `COMMIT;` occurs before `generalInfoDb.updatePartyBalance(...)` at lines 1419-1444.<br>3) In `accounts-db.js:354`, `COMMIT;` occurs before `updatePartyBalance(...)` at line 358.<br>4) In `trade-features-db.js:440-485`, `saveEstimate` executes multiple INSERTs on `estimates` and `estimate_items` without any `BEGIN TRANSACTION` or `COMMIT` at all. |
| 7 | Any amount stored as text or read back as string and then added (e.g. "100" + "50" = "10050") | **YES** | In `accounts-db.js:224`: `const netAmount = Number(voucherData.netAmount) \|\| (amount + discount);`. If `amount` and `discount` are strings, `(amount + discount)` concatenates them. |
| 8 | NaN, null, undefined or empty input not handled | **YES** | In `sales.js:1875`, `Number(el.paidAmount?.value) \|\| 0` handles NaN, but negative numbers like `-50` pass through as valid numbers, causing `balanceDue = netTotal - (-50) = netTotal + 50`. |
| 9 | Negative quantity, zero price, discount more than total, paid more than total | **YES** | 1) In `sales.js:1566`, zero price is blocked (`if (rate <= 0) return`), preventing giveaway or promotional items.<br>2) If discount > gross, `Math.max(0, gross - specialDisc)` clamps net to 0, but stores negative gross margin.<br>3) If paid > net, `balanceDue = Math.max(0, net - paid) = 0`, discarding payments towards customer's old balance. |
| 10 | Division by zero | **NO** | Division operations in `inventory.js:2353`, `inventory.js:1753`, `reports-engine.js:1001`, and `db.js:921, 1022` check that the divisor is greater than zero. |
| 11 | Date and time bugs (timezone, date format used in filters and reports) | **YES** | Multiple files (`src/sales/sales.js:2048, 2166`, `src/inventory/inventory.js:1510, 1795`, `src/database/db.js:835, 1197`, `src/database/trade-features-db.js:640`, `src/accounts/accounts.js:982`) use `new Date().toISOString().split('T')[0]`. In Pakistan (UTC+5), between 12:00 AM and 5:00 AM, `toISOString()` produces the previous day's date. |
| 12 | Report queries whose totals do not match the screens they summarize | **YES** | 1) `reports-engine.js:1076` includes returns and purchases but omits expenses; `trade-features-db.js:670` includes expenses but omits returns and purchases.<br>2) `reports-engine.js:989-996` omits all records from the `expenses` table from the P&L report.<br>3) `reports-engine.js:73-120` includes Estimated bills in sales reports, whereas `accounts-db.js:441` excludes Estimated bills from the party ledger. |
| 13 | Duplicate or unused functions, dead code, and old code that still runs | **YES** | 1) `sales.js:580-584` defines empty dummy functions (`showPosRightView`, `updateRightPanelVisibility`, etc.).<br>2) `sales.js:4401` and `4725` define `function removeReturnItem(idx)` twice.<br>3) `inventory.js:1492` (`autoSaveCurrentPurchase`) and `inventory.js:1769` (`savePurchaseVoucher`) both run identical purchase save routines. |
| 14 | Hardcoded values (tax rate, IDs, server name, paths) | **YES** | 1) `main.js:145` hardcodes `'1996'` as fallback PIN.<br>2) `accounts-db.js:172, 185` hardcodes `'pt-2'` for supplier party type.<br>3) `trade-features-db.js:77-84` hardcodes IDs `coa-101` to `coa-108`.<br>4) `sales.js:2045` hardcodes `'SV-'` prefix format. |
| 15 | Missing foreign keys, missing indexes, columns that allow NULL but should not | **YES** | 1) `PRAGMA foreign_keys = ON;` is never executed; foreign keys are completely missing on `purchase_items`, `sale_items`, `sale_return_items`, `accounts_vouchers`, `expenses`, `estimates`.<br>2) Missing indexes on `accounts_vouchers(partyId, entryDate)`, `sales(entryDate)`, `purchases(entryDate)`, `expenses(entryDate)`.<br>3) `sales.grossAmount, discount, netAmount, paidAmount, balanceDue` allow NULL in schema. |
| 16 | SQL built by joining strings (injection risk) instead of parameters | **YES** | In `src/database/db.js:77`: `const cols = db.prepare(\`PRAGMA table_info(${tableName})\`).all();` interpolates `tableName` into the query string. |
| 17 | Two screens that can change the same data and get out of sync | **YES** | 1) Dedicated `Find Product` window (`src/find-product/find-product.js`) does not receive database updates when products are added or updated in main window until reloaded.<br>2) `general-info.js` edits party opening balances, but `accounts.js` caches `state.partiesList` and does not reflect changes without manual navigation. |
| 18 | Anything that works only on the developer's PC (absolute paths, local server names) | **NO** | No developer-specific absolute paths or localhost URLs exist in `src/`. Paths are dynamically generated via `__dirname` or Electron `app.getPath('userData')`. |

---

## PART 4: Test Scenarios

### Scenario 1: Sell 3 items at 100 each with 10% discount, paid 200
- **Input:** 3 items, rate 100, item discount 10%, paid 200.
- **Code Execution:**
  - `grossLine = 3 * 100 = 300`
  - `discAmt = 300 * 0.10 = 30`
  - `netLine = 300 - 30 = 270`
  - `gross = 270` (`updateVoucherTotals` sums line nets)
  - `specialDisc = 0`
  - `netTotal = 270`
  - `paid = 200`
  - `balanceDue = Math.max(0, 270 - 200) = 70`
  - Stock deducted: 3
  - Customer balance increased by: 70
- **Comparison:**
  - **Expected:** Gross 300, Discount 30, Net 270, Paid 200, Balance Due 70, Stock -3.
  - **Code Result:** `sales.grossAmount` is stored as **270** (wrong, should be 300); `sales.discount` is stored as **0** (item discount omitted from header); Net 270, Paid 200, Balance Due 70, Stock -3.
  - **Verdict:** Calculation amounts match net and balance, but header gross and discount fields are incorrect.

### Scenario 2: Edit that sale to 2 items
- **Input:** Change quantity from 3 to 2 on existing sale.
- **Code Execution:**
  - `netLine = (2 * 100) - 20 = 180`
  - `netTotal = 180`
  - `paid = 200` (retained from loaded sale)
  - `balanceDue = Math.max(0, 180 - 200) = 0`
  - `returnChange = Math.max(0, 200 - 180) = 20`
  - Stock update: Reverses 3, deducts 2 -> Net stock effect: +1 (Stock is 8).
  - Party balance delta (`db.js:1430`):
    - `oldBalanceDue = 70`
    - `newBalanceDue = 0`
    - `delta = 0 - 70 = -70`
    - Party balance updated by: `-70`
- **Comparison:**
  - **Expected:** Customer originally owed +70. Now customer owes 180 and paid 200 (customer should have a credit of -20). The change to customer balance should be `-90` (from +70 to -20).
  - **Code Result:** Customer balance is adjusted by **`-70`** instead of `-90`. The customer is shortchanged by 20 rupees because `balanceDue` cannot be negative.
  - **Verdict:** **INCORRECT (Bug in party balance delta calculation on edit).**

### Scenario 3: Delete that sale
- **Input:** Delete the edited sale (which had net 180, paid 200, balanceDue 0).
- **Code Execution:**
  - `db.deleteSale(id)` (`src/database/db.js:1478`):
  - `s.balanceDue = 0`
  - Line 1482: `if (s.balanceDue > 0 && s.partyId) generalInfoDb.updatePartyBalance(s.partyId, -Number(s.balanceDue))`
  - Condition `s.balanceDue > 0` is FALSE.
  - `updatePartyBalance` is NOT called!
  - Stock restored: `stockQty = stockQty + 2`.
  - Records deleted from `sale_items` and `sales`.
- **Comparison:**
  - **Expected:** Customer paid 200 cash for 180 worth of goods. Deleting the sale should restore customer balance by removing the sale transaction (+200 credit or cash refund effect).
  - **Code Result:** Customer balance is **not updated at all** (0 adjustment).
  - **Verdict:** **INCORRECT (Customer balance left out of sync upon deletion).**

### Scenario 4: Return 1 item from a sale
- **Input:** Return 1 item at rate 90, refund mode `Credit`.
- **Code Execution:**
  - `netAmount = 1 * 90 = 90`
  - In `db.saveSaleReturn`:
    - `stockQty = stockQty + 1`
    - `updatePartyBalance(partyId, -90)`
- **Comparison:**
  - **Expected:** Stock +1, Customer receivable -90.
  - **Code Result:** Stock +1, Customer receivable -90.
  - **Verdict:** **CORRECT** when `refundMode === 'Credit'`. (If `refundMode === 'Cash'`, physical cash is given but cash drawer does not record outflow).

### Scenario 5: Purchase 10 items, then sell 4, then check stock
- **Input:** Purchase 10 items, sell 4 items.
- **Code Execution:**
  - Purchase: `stockQty = stockQty + 10`
  - Sale: `stockQty = MAX(0, stockQty - 4)`
  - Stock remaining: `10 - 4 = 6`.
- **Comparison:**
  - **Expected:** 6 items in stock.
  - **Code Result:** 6 items in stock.
  - **Verdict:** **CORRECT.**

### Scenario 6: Customer pays old balance partly
- **Input:** Customer owes 1000. Customer pays 400.
- **Code Execution (via Accounts CRV):**
  - Amount = 400, Discount = 0 -> Net Settlement = 400.
  - `balanceDelta = -400`
  - `newBalance = 1000 - 400 = 600`.
  - `UPDATE parties SET currentBalance = currentBalance - 400`.
- **Comparison:**
  - **Expected:** Customer balance 600.
  - **Code Result:** 600.
  - **Verdict:** **CORRECT via Accounts CRV.**  
  *(Note: If paid inside Sales screen as an overpayment on a bill, the 400 is discarded from customer balance as documented in Scenario 1 & 2).*

---

## PART 5: Findings Table

| ID | Severity | File : Line | Description of Bug / Flaw | Data Impact | Suggested Fix |
|---|---|---|---|---|---|
| SEC-01 | **CRITICAL** | `src/sales/sales.js:1876-1880`, `src/database/db.js:1442-1444` | Customer overpayment on bill is clamped to `balanceDue = 0` and ignored in DB party balance update | When a customer pays towards an old balance during a sale, the payment is discarded from `parties.currentBalance`. Customer is still shown owing full old balance in database | Update party balance by `netTotal - paid` (can be negative) rather than `balanceDue`. |
| SEC-02 | **CRITICAL** | `src/database/db.js:1065, 1416, 1758, 1817`, `src/accounts/accounts-db.js:354, 404` | SQLite `COMMIT;` is executed before `updatePartyBalance()` across all voucher modules | If `updatePartyBalance()` throws an error or app crashes, the sale/purchase is committed but the party ledger/balance is lost, causing permanent ledger mismatch | Move `updatePartyBalance()` inside the active transaction before `COMMIT;`. |
| SEC-03 | **CRITICAL** | `src/database/trade-features-db.js:440-490` | `saveEstimate` executes multiple INSERTs on `estimates` and `estimate_items` without a transaction | If any line item insert fails, partial estimate data is left committed in database | Wrap `saveEstimate` in `BEGIN TRANSACTION;` and `COMMIT;` with rollback on error. |
| SEC-04 | **CRITICAL** | `src/database/db.js:1430-1433` | Edit Sale calculates party balance delta using `balanceDue` instead of net transaction impact | Customer balance is adjusted incorrectly when editing a sale where payments exceeded bill net amount | Compute delta as `(newNet - newPaid) - (oldNet - oldPaid)`. |
| SEC-05 | **CRITICAL** | `src/database/db.js:1482-1484` | `deleteSale` only adjusts party balance if `s.balanceDue > 0` | Deleting a fully paid sale leaves customer balance unaffected, corrupting accounting ledger | Revert party balance by `-(s.netAmount - s.paidAmount)`. |
| SEC-06 | **CRITICAL** | `src/database/trade-features-db.js:685-740` | Day-End Cash Closing query ignores cash refunded on Sales Returns | Day-end cash drawer calculation overstates expected cash by the amount of cash refunds given | Add `SELECT COALESCE(SUM(paidRefund), 0) FROM sales_returns WHERE entryDate = ? AND refundMode = 'Cash'` as a cash outflow. |
| SEC-07 | **CRITICAL** | `src/reports/reports-engine.js:83-120, 960-975`, `src/database/trade-features-db.js:686-691` | Estimated bills are summed into Sales Reports, Profit & Loss Report, and Cash Closing | Revenue, profit, and cash drawer are inflated by unconfirmed estimates | Add `AND (billStatus IS NULL OR billStatus != 'Estimated')` filter to reports and cash queries. |
| SEC-08 | **CRITICAL** | `src/reports/reports-engine.js:985`, `src/database/db.js:332-349` | P&L Report accesses `it.purchasePrice` on `sale_return_items`, which does not exist in schema | COGS is never reverted for returned goods in P&L report; profit is understated | Join with `products.purchasePrice` or store `purchasePrice` in `sale_return_items`. |
| SEC-09 | **CRITICAL** | `src/database/db.js:1523-1540`, `src/reports/reports-engine.js:989-996` | Daily expenses from `expenses` table are omitted from `getReportsMasterData()` and P&L Report | Net profit reported in P&L statement completely ignores all shop rent, utilities, staff wages, and daily expenses | Include `tradeFeaturesDb.getAllExpenses()` in `getReportsMasterData()` and sum into P&L expenses. |
| SEC-10 | **CRITICAL** | `src/database/db.js:213-234`, `src/reports/reports-engine.js:1059, 1116` | Purchases table schema lacks `paidAmount` column; daily register reads `p.paidAmount` which is always `undefined` | Purchase cash outflows are always reported as 0 in Today's Complete Business Register | Add `paidAmount` to `purchases` schema and record purchase cash payments. |
| SEC-11 | **CRITICAL** | `dist/win-unpacked/resources/app.asar` | Production build in `dist` is 4 hours older than source code and missing recent commits and bug fixes | Users running the distributed build execute stale code lacking recent updates | Run `npm run dist` / `npm run pack` to compile fresh source files into `app.asar`. |
| SEC-12 | **HIGH** | `src/database/db.js:129-368` | `PRAGMA foreign_keys = ON;` is never executed; foreign keys missing across all tables | Deleting a product, party, or sale leaves orphaned records in line item and voucher tables | Enable foreign key constraints in SQLite schema. |
| SEC-13 | **HIGH** | `src/database/db.js:732-741` | `deleteProduct` deletes product without checking active sale or purchase history | Historic sales and purchase records lose product references | Add check preventing deletion of products with existing transaction history. |
| SEC-14 | **HIGH** | `src/accounts/accounts-db.js:475` | Party Ledger sets both `debit` and `credit` to `amount` for cash sales returns | Inflates both total debit and total credit columns in customer ledger | If refund mode is cash, omit party ledger entry or record debit 0, credit 0. |
| SEC-15 | **HIGH** | `src/sales/sales.js:2048`, `src/inventory/inventory.js:1510`, `src/database/db.js:835` | `new Date().toISOString().split('T')[0]` used for transaction entry dates | Transactions between midnight and 5:00 AM PKT are recorded under yesterday's date | Use local date formatting (`new Date().toLocaleDateString('en-CA')`). |
| SEC-16 | **HIGH** | `src/sales/sales.js:1859-1860, 2033` | `sales.grossAmount` records the sum of line item nets rather than true gross amount | Sales invoice header shows net total as gross total; discounts appear applied twice or zeroed | Calculate `gross` as `sum(totalQty * salePrice)`. |
| SEC-17 | **HIGH** | `src/database/db.js:622-626` | When creating a product with an existing code, code is silently changed without user confirmation | User's barcode or designated catalog code is silently discarded and replaced | Throw error informing user that the code already exists. |
| SEC-18 | **HIGH** | `src/sales/sales.js:4401, 4725` | `removeReturnItem` function declared twice in same scope | The second definition silently overrides the first | Remove duplicate declaration. |
| SEC-19 | **MEDIUM** | `src/database/db.js:352-368` | Missing indexes on `accounts_vouchers(partyId, entryDate)`, `sales(entryDate)`, `expenses(entryDate)` | Performance degrades as transaction volume grows | Add database indexes on date and party columns. |
| SEC-20 | **MEDIUM** | `src/accounts/accounts-db.js:224` | Potential string concatenation in `(amount + discount)` | If input strings reach database layer, `100 + 50` becomes `"10050"` | Ensure `Number()` conversion on all arithmetic inputs. |
| SEC-21 | **MEDIUM** | `src/database/db.js:77` | `PRAGMA table_info(${tableName})` uses string interpolation | Theoretical SQL injection vulnerability if untrusted table names are queried | Validate table names against fixed whitelist. |
| SEC-22 | **MEDIUM** | `src/sales/sales.js:1566-1569` | `if (rate <= 0)` blocks adding zero-price items | Cannot record free promotional items or zero-cost warranty replacements | Allow zero price with an explicit confirmation dialog. |
| SEC-23 | **MEDIUM** | `src/sales/sales.js:1556-1558` | No validation blocking negative unit or pack quantities | Entering negative numbers can reverse stock and create negative totals | Enforce `min="0"` and validate `totalQty > 0` before adding. |
| SEC-24 | **LOW** | `src/main.js:145` | Hardcoded fallback PIN `'1996'` in source code | Security risk if database setting fails | Enforce prompt to set PIN on initial install. |
| SEC-25 | **LOW** | `src/sales/sales.js:580-584` | Empty dummy functions left in codebase | Dead code clutter | Clean up unused function declarations. |

---

## PART 6: Update and Build Verification

### 6.1 Artifact & Script Existence Audit
- **Prompt Assertion Check:**
  - File `update_files/app.asar`: **DOES NOT EXIST** anywhere in project root, parent directory, or system.
  - File `update.bat`: **DOES NOT EXIST** anywhere in project root, parent directory, or system.
- **Verification Proof:**
  - PowerShell search query: `Get-ChildItem -Path . -Recurse -Filter "*update*"` returned only `dist\win-unpacked\resources\app-update.yml`.
  - Search on Desktop: `Get-ChildItem -Path "C:\Users\Huzaifa Ali\Desktop" -Filter "*update*"` returned no files.
  - Git history check: `git log --all --full-history -- "**/update*"` returned no matches.

### 6.2 Application Update Mechanism
The project uses `electron-updater` with GitHub Releases (`HuzaifaSafdar311/shahzaib-traders-releases`) configured in `src/main.js` (lines 180–313) and `package.json` (lines 16–22):
```json
"publish": [
  {
    "provider": "github",
    "owner": "HuzaifaSafdar311",
    "repo": "shahzaib-traders-releases"
  }
]
```
Updates are applied via `autoUpdater.quitAndInstall(true, true)` upon user prompt, not via a batch script.

### 6.3 Build vs. Source Code Verification
A technical verification was executed comparing the packaged `app.asar` inside `dist/win-unpacked/resources/` against the working source files in `src/`:

| File | Location | Size (Bytes) | SHA-256 Hash | Last Modified |
|---|---|---|---|---|
| `app.asar` | `dist/win-unpacked/resources/` | 42,397,557 | `DDB1DEDC515A3B9A4BB719B880E2B4DA0CF9D45F03288C5EC121B0507062923F` | 2026-10-28 16:08:00 |
| `src/main.js` (Extracted from `app.asar`) | Inside `app.asar` | 30,656 | `505A5B18A599406976087F2521D8BCD240860FE881F91089EAD1B8D53F57C8E1` | Stale (v1.0.3 build) |
| `src/main.js` (Active Disk Source) | `src/main.js` | 30,146 | `B2AA0F763734B55BACB9704B76D166F775798C05A0C8A190CB696379A2140341` | 2026-10-28 20:09:12 |

**Conclusion:** The build in `dist` is **stale** (compiled at 4:08 PM) and **does not contain the latest source code modifications** made between 7:38 PM and 8:09 PM. A fresh compilation (`npm run dist` or `npm run pack`) is required to package current code.

---

## Things I Could Not Verify

1. **Purchase Returns UI & Processing:** The user prompt asked to trace "purchase return". No purchase return table, UI screen, or IPC handler exists in this codebase.
2. **Printer Hardware Execution:** Thermal receipt printing (`ESC/POS`) and A4 invoice printing format the HTML and launch Electron print/PDF previews; physical printer communication could not be verified in the sandbox environment.
3. **Auto-Updater Live Download:** Connection to GitHub release assets (`HuzaifaSafdar311/shahzaib-traders-releases`) requires internet access and valid remote release assets which were not tested live.
4. **`update_files` and `update.bat` Intent:** The origin or requested presence of `update_files` and `update.bat` could not be verified from git commits; they do not exist anywhere in the user's workspace.

