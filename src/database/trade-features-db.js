// Shahzaib Traders - Trade Features Database Module
// Handles Daily Expenses, Electrician Estimates (Kacha Bill), Warranty Claims, and Day-End Cash Closing

let db = null;
let isJson = false;
let jsonStore = null;
let saveJsonFn = null;

function initTradeFeatures(dbInstance, isFallback = false, fallbackData = null, saveFn = null) {
  db = dbInstance;
  isJson = isFallback;
  jsonStore = fallbackData;
  saveJsonFn = saveFn;

  if (isJson && jsonStore) {
    if (!Array.isArray(jsonStore.expenses)) jsonStore.expenses = [];
    if (!Array.isArray(jsonStore.chart_of_accounts)) jsonStore.chart_of_accounts = [];
    if (!Array.isArray(jsonStore.estimates)) jsonStore.estimates = [];
    if (!Array.isArray(jsonStore.estimate_items)) jsonStore.estimate_items = [];
    if (!Array.isArray(jsonStore.claims)) jsonStore.claims = [];
    if (!Array.isArray(jsonStore.day_end_closings)) jsonStore.day_end_closings = [];

    if (jsonStore.chart_of_accounts.length === 0) {
      const now = new Date().toISOString();
      jsonStore.chart_of_accounts = [
        { id: 'coa-101', code: 'EXP-101', title: 'Shop Rent', category: 'Rent & Premises', createdAt: now },
        { id: 'coa-102', code: 'EXP-102', title: 'Electricity & Utilities', category: 'Utilities', createdAt: now },
        { id: 'coa-103', code: 'EXP-103', title: 'Tea & Refreshment', category: 'Refreshment', createdAt: now },
        { id: 'coa-104', code: 'EXP-104', title: 'Staff Salary & Wages', category: 'Payroll', createdAt: now },
        { id: 'coa-105', code: 'EXP-105', title: 'Freight & Carriage Inward', category: 'Freight & Logistics', createdAt: now },
        { id: 'coa-106', code: 'EXP-106', title: 'Repair & Maintenance', category: 'Maintenance', createdAt: now },
        { id: 'coa-107', code: 'EXP-107', title: 'Stationery & Printing', category: 'Office Supplies', createdAt: now },
        { id: 'coa-108', code: 'EXP-108', title: 'General / Miscellaneous Expense', category: 'General', createdAt: now }
      ];
      if (saveJsonFn) saveJsonFn();
    }
    return;
  }

  if (!db || db.isFallback) return;

  try {
    // 1. Daily Expenses (Dukan Kharchay) Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        voucherNo TEXT UNIQUE NOT NULL,
        entryDate TEXT NOT NULL,
        accountCode TEXT DEFAULT '',
        accountTitle TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        amount REAL DEFAULT 0,
        paymentMode TEXT DEFAULT 'Cash',
        paidTo TEXT DEFAULT '',
        remarks TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    // 2. Chart of Accounts Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Expense',
        createdAt TEXT NOT NULL
      );
    `);

    // Seed default chart of accounts if empty
    const coaCount = db.prepare('SELECT COUNT(*) as c FROM chart_of_accounts').get();
    if (!coaCount || coaCount.c === 0) {
      const now = new Date().toISOString();
      const insertCoa = db.prepare('INSERT INTO chart_of_accounts (id, code, title, category, createdAt) VALUES (?, ?, ?, ?, ?)');
      const defaults = [
        ['coa-101', 'EXP-101', 'Shop Rent', 'Rent & Premises', now],
        ['coa-102', 'EXP-102', 'Electricity & Utilities', 'Utilities', now],
        ['coa-103', 'EXP-103', 'Tea & Refreshment', 'Refreshment', now],
        ['coa-104', 'EXP-104', 'Staff Salary & Wages', 'Payroll', now],
        ['coa-105', 'EXP-105', 'Freight & Carriage Inward', 'Freight & Logistics', now],
        ['coa-106', 'EXP-106', 'Repair & Maintenance', 'Maintenance', now],
        ['coa-107', 'EXP-107', 'Stationery & Printing', 'Office Supplies', now],
        ['coa-108', 'EXP-108', 'General / Miscellaneous Expense', 'General', now]
      ];
      defaults.forEach(d => insertCoa.run(...d));
    }

    // 3. Electrician Estimates / Kacha Bill Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        estimateNo TEXT UNIQUE NOT NULL,
        entryDate TEXT NOT NULL,
        partyId TEXT DEFAULT '',
        partyName TEXT NOT NULL,
        customerPhone TEXT DEFAULT '',
        city TEXT DEFAULT '',
        remarks TEXT DEFAULT '',
        grossAmount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        netAmount REAL DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        itemsJson TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS estimate_items (
        id TEXT PRIMARY KEY,
        estimateId TEXT NOT NULL,
        srNo INTEGER DEFAULT 1,
        productId TEXT DEFAULT '',
        productCode TEXT DEFAULT '',
        productTitle TEXT NOT NULL,
        packSize REAL DEFAULT 1,
        qty REAL DEFAULT 1,
        rate REAL DEFAULT 0,
        netAmount REAL DEFAULT 0
      );
    `);

    // 4. Warranty & Defective Item Claims Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        claimNo TEXT UNIQUE NOT NULL,
        entryDate TEXT NOT NULL,
        customerName TEXT NOT NULL,
        customerPhone TEXT DEFAULT '',
        supplierName TEXT DEFAULT '',
        productTitle TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        faultReason TEXT DEFAULT '',
        status TEXT DEFAULT 'Received',
        createdAt TEXT NOT NULL
      );
    `);

    // 5. Day-End Cash Closing & Counter Handover Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS day_end_closings (
        id TEXT PRIMARY KEY,
        closingDate TEXT UNIQUE NOT NULL,
        openingDrawerCash REAL DEFAULT 0,
        totalCashSales REAL DEFAULT 0,
        totalCrvReceived REAL DEFAULT 0,
        totalCpvPaid REAL DEFAULT 0,
        totalExpensesPaid REAL DEFAULT 0,
        expectedDrawerCash REAL DEFAULT 0,
        actualCountedCash REAL DEFAULT 0,
        cashDifference REAL DEFAULT 0,
        cashDeliveredToManager REAL DEFAULT 0,
        closingDrawerBalance REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        closedBy TEXT DEFAULT 'Admin',
        createdAt TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('Error creating trade-features tables:', err);
  }
}

// ========================================================
// 1. DAILY EXPENSES (DUKAN KHARCHAY)
// ========================================================
function getNextExpenseVoucherNo() {
  if (isJson) {
    const list = jsonStore.expenses || [];
    let max = 0;
    for (const e of list) {
      if (e.voucherNo && e.voucherNo.startsWith('EXP-')) {
        const num = parseInt(e.voucherNo.replace('EXP-', ''), 10);
        if (!isNaN(num) && num > max) max = num;
      }
    }
    return `EXP-${String(max + 1).padStart(4, '0')}`;
  }
  if (!db) return 'EXP-0001';
  try {
    const row = db.prepare("SELECT voucherNo FROM expenses WHERE voucherNo LIKE 'EXP-%' ORDER BY id DESC LIMIT 1").get();
    if (!row || !row.voucherNo) return 'EXP-0001';
    const num = parseInt(row.voucherNo.replace('EXP-', ''), 10);
    const next = isNaN(num) ? 1 : num + 1;
    return `EXP-${String(next).padStart(4, '0')}`;
  } catch (e) {
    return 'EXP-0001';
  }
}

function getAllExpenses(filter = {}) {
  if (isJson) {
    let list = jsonStore.expenses || [];
    if (filter.startDate && filter.endDate) {
      list = list.filter(e => e.entryDate >= filter.startDate && e.entryDate <= filter.endDate);
    } else if (filter.date) {
      list = list.filter(e => e.entryDate === filter.date);
    }
    return list.slice().sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
  }
  if (!db) return [];
  try {
    let query = 'SELECT * FROM expenses';
    const params = [];
    if (filter.startDate && filter.endDate) {
      query += ' WHERE entryDate BETWEEN ? AND ?';
      params.push(filter.startDate, filter.endDate);
    } else if (filter.date) {
      query += ' WHERE entryDate = ?';
      params.push(filter.date);
    }
    query += ' ORDER BY entryDate DESC, voucherNo DESC';
    return db.prepare(query).all(...params);
  } catch (e) {
    console.error('Error fetching expenses:', e);
    return [];
  }
}

function saveExpense(data) {
  const now = new Date().toISOString();
  const id = data.id || `exp-${Date.now()}`;
  const voucherNo = data.voucherNo || getNextExpenseVoucherNo();

  if (isJson) {
    if (!Array.isArray(jsonStore.expenses)) jsonStore.expenses = [];
    const idx = jsonStore.expenses.findIndex(e => e.id === id);
    const rec = {
      id,
      voucherNo,
      entryDate: data.entryDate || now.split('T')[0],
      accountCode: data.accountCode || '',
      accountTitle: data.accountTitle || 'General Expense',
      category: data.category || 'General',
      amount: Number(data.amount) || 0,
      paymentMode: data.paymentMode || 'Cash',
      paidTo: data.paidTo || '',
      remarks: data.remarks || '',
      createdAt: idx !== -1 ? (jsonStore.expenses[idx].createdAt || now) : now
    };
    if (idx !== -1) {
      jsonStore.expenses[idx] = rec;
    } else {
      jsonStore.expenses.push(rec);
    }
    if (saveJsonFn) saveJsonFn();
    return { success: true, id, voucherNo };
  }

  if (!db) throw new Error('Database not initialized');
  const existing = data.id ? db.prepare('SELECT id FROM expenses WHERE id = ?').get(data.id) : null;
  if (existing) {
    db.prepare(`
      UPDATE expenses SET
        entryDate = ?, accountCode = ?, accountTitle = ?, category = ?,
        amount = ?, paymentMode = ?, paidTo = ?, remarks = ?
      WHERE id = ?
    `).run(
      data.entryDate || now.split('T')[0],
      data.accountCode || '',
      data.accountTitle || 'General Expense',
      data.category || 'General',
      Number(data.amount) || 0,
      data.paymentMode || 'Cash',
      data.paidTo || '',
      data.remarks || '',
      data.id
    );
    return { success: true, id: data.id, voucherNo };
  } else {
    db.prepare(`
      INSERT INTO expenses (id, voucherNo, entryDate, accountCode, accountTitle, category, amount, paymentMode, paidTo, remarks, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, voucherNo,
      data.entryDate || now.split('T')[0],
      data.accountCode || '',
      data.accountTitle || 'General Expense',
      data.category || 'General',
      Number(data.amount) || 0,
      data.paymentMode || 'Cash',
      data.paidTo || '',
      data.remarks || '',
      now
    );
    return { success: true, id, voucherNo };
  }
}

function deleteExpense(id) {
  if (isJson) {
    jsonStore.expenses = (jsonStore.expenses || []).filter(e => e.id !== id);
    if (saveJsonFn) saveJsonFn();
    return { success: true };
  }
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return { success: true };
}

function getChartOfAccounts() {
  if (isJson) {
    return jsonStore.chart_of_accounts || [];
  }
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM chart_of_accounts ORDER BY code ASC').all();
  } catch (e) {
    return [];
  }
}

// ========================================================
// 2. ESTIMATES / QUOTATIONS (KACHA BILL)
// ========================================================
function getNextEstimateNo() {
  if (isJson) {
    const list = jsonStore.estimates || [];
    let max = 0;
    for (const e of list) {
      if (e.estimateNo && e.estimateNo.startsWith('EST-')) {
        const num = parseInt(e.estimateNo.replace('EST-', ''), 10);
        if (!isNaN(num) && num > max) max = num;
      }
    }
    return `EST-${String(max + 1).padStart(4, '0')}`;
  }
  if (!db) return 'EST-0001';
  try {
    const row = db.prepare("SELECT estimateNo FROM estimates WHERE estimateNo LIKE 'EST-%' ORDER BY id DESC LIMIT 1").get();
    if (!row || !row.estimateNo) return 'EST-0001';
    const num = parseInt(row.estimateNo.replace('EST-', ''), 10);
    const next = isNaN(num) ? 1 : num + 1;
    return `EST-${String(next).padStart(4, '0')}`;
  } catch (e) {
    return 'EST-0001';
  }
}

function getAllEstimates() {
  if (isJson) {
    return (jsonStore.estimates || []).slice().sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
  }
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM estimates ORDER BY entryDate DESC, estimateNo DESC').all();
  } catch (e) {
    return [];
  }
}

function getEstimateById(id) {
  if (isJson) {
    const est = (jsonStore.estimates || []).find(e => e.id === id || e.estimateNo === id);
    if (!est) return null;
    let items = (jsonStore.estimate_items || []).filter(it => it.estimateId === est.id);
    if (!items.length && est.itemsJson) {
      try { items = JSON.parse(est.itemsJson); } catch (_) { items = []; }
    }
    return { ...est, items };
  }
  if (!db) return null;
  try {
    const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
    if (!est) return null;
    const items = db.prepare('SELECT * FROM estimate_items WHERE estimateId = ? ORDER BY srNo ASC').all(id);
    return { ...est, items };
  } catch (e) {
    return null;
  }
}

function saveEstimate(data, items = []) {
  const now = new Date().toISOString();
  const id = data.id || `est-${Date.now()}`;
  const estimateNo = data.estimateNo || getNextEstimateNo();

  if (isJson) {
    if (!Array.isArray(jsonStore.estimates)) jsonStore.estimates = [];
    if (!Array.isArray(jsonStore.estimate_items)) jsonStore.estimate_items = [];
    const idx = jsonStore.estimates.findIndex(e => e.id === id);
    const rec = {
      id,
      estimateNo,
      entryDate: data.entryDate || now.split('T')[0],
      partyId: data.partyId || '',
      partyName: data.partyName || 'Customer',
      customerPhone: data.customerPhone || '',
      city: data.city || '',
      remarks: data.remarks || '',
      grossAmount: Number(data.grossAmount) || 0,
      discount: Number(data.discount) || 0,
      netAmount: Number(data.netAmount) || 0,
      status: data.status || 'Pending',
      itemsJson: JSON.stringify(items || []),
      createdAt: idx !== -1 ? (jsonStore.estimates[idx].createdAt || now) : now
    };
    if (idx !== -1) {
      jsonStore.estimates[idx] = rec;
      jsonStore.estimate_items = jsonStore.estimate_items.filter(it => it.estimateId !== id);
    } else {
      jsonStore.estimates.push(rec);
    }
    (items || []).forEach((item, i) => {
      jsonStore.estimate_items.push({
        id: `esti-${Date.now()}-${i}`,
        estimateId: id,
        srNo: i + 1,
        productId: item.productId || '',
        productCode: item.productCode || '',
        productTitle: item.productTitle || '',
        packSize: Number(item.packSize) || 1,
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || 0,
        netAmount: Number(item.netAmount) || 0
      });
    });
    if (saveJsonFn) saveJsonFn();
    return { success: true, id, estimateNo };
  }

  if (!db) throw new Error('Database not initialized');
  const existing = data.id ? db.prepare('SELECT id FROM estimates WHERE id = ?').get(data.id) : null;
  if (existing) {
    db.prepare(`
      UPDATE estimates SET
        entryDate = ?, partyId = ?, partyName = ?, customerPhone = ?, city = ?,
        remarks = ?, grossAmount = ?, discount = ?, netAmount = ?, status = ?, itemsJson = ?
      WHERE id = ?
    `).run(
      data.entryDate || now.split('T')[0],
      data.partyId || '',
      data.partyName || 'Customer',
      data.customerPhone || '',
      data.city || '',
      data.remarks || '',
      Number(data.grossAmount) || 0,
      Number(data.discount) || 0,
      Number(data.netAmount) || 0,
      data.status || 'Pending',
      JSON.stringify(items || []),
      data.id
    );
    // Refresh items
    db.prepare('DELETE FROM estimate_items WHERE estimateId = ?').run(data.id);
  } else {
    db.prepare(`
      INSERT INTO estimates (id, estimateNo, entryDate, partyId, partyName, customerPhone, city, remarks, grossAmount, discount, netAmount, status, itemsJson, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, estimateNo,
      data.entryDate || now.split('T')[0],
      data.partyId || '',
      data.partyName || 'Customer',
      data.customerPhone || '',
      data.city || '',
      data.remarks || '',
      Number(data.grossAmount) || 0,
      Number(data.discount) || 0,
      Number(data.netAmount) || 0,
      data.status || 'Pending',
      JSON.stringify(items || []),
      now
    );
  }

  // Insert items
  const estId = existing ? data.id : id;
  const insertItem = db.prepare(`
    INSERT INTO estimate_items (id, estimateId, srNo, productId, productCode, productTitle, packSize, qty, rate, netAmount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  (items || []).forEach((item, idx) => {
    insertItem.run(
      `esti-${Date.now()}-${idx}`,
      estId,
      idx + 1,
      item.productId || '',
      item.productCode || '',
      item.productTitle || '',
      Number(item.packSize) || 1,
      Number(item.qty) || 1,
      Number(item.rate) || 0,
      Number(item.netAmount) || 0
    );
  });

  return { success: true, id: estId, estimateNo };
}

function deleteEstimate(id) {
  if (isJson) {
    jsonStore.estimates = (jsonStore.estimates || []).filter(e => e.id !== id);
    jsonStore.estimate_items = (jsonStore.estimate_items || []).filter(it => it.estimateId !== id);
    if (saveJsonFn) saveJsonFn();
    return { success: true };
  }
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM estimate_items WHERE estimateId = ?').run(id);
  db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
  return { success: true };
}

// ========================================================
// 3. WARRANTY & DEFECTIVE CLAIMS (KHARAB SAMAAN)
// ========================================================
function getNextClaimNo() {
  if (isJson) {
    const list = jsonStore.claims || [];
    let max = 0;
    for (const c of list) {
      if (c.claimNo && c.claimNo.startsWith('CLM-')) {
        const num = parseInt(c.claimNo.replace('CLM-', ''), 10);
        if (!isNaN(num) && num > max) max = num;
      }
    }
    return `CLM-${String(max + 1).padStart(4, '0')}`;
  }
  if (!db) return 'CLM-0001';
  try {
    const row = db.prepare("SELECT claimNo FROM claims WHERE claimNo LIKE 'CLM-%' ORDER BY id DESC LIMIT 1").get();
    if (!row || !row.claimNo) return 'CLM-0001';
    const num = parseInt(row.claimNo.replace('CLM-', ''), 10);
    const next = isNaN(num) ? 1 : num + 1;
    return `CLM-${String(next).padStart(4, '0')}`;
  } catch (e) {
    return 'CLM-0001';
  }
}

function getAllClaims() {
  if (isJson) {
    return (jsonStore.claims || []).slice().sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
  }
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM claims ORDER BY entryDate DESC, claimNo DESC').all();
  } catch (e) {
    return [];
  }
}

function saveClaim(data) {
  const now = new Date().toISOString();
  const id = data.id || `clm-${Date.now()}`;
  const claimNo = data.claimNo || getNextClaimNo();

  if (isJson) {
    if (!Array.isArray(jsonStore.claims)) jsonStore.claims = [];
    const idx = jsonStore.claims.findIndex(c => c.id === id);
    const rec = {
      id,
      claimNo,
      entryDate: data.entryDate || now.split('T')[0],
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      supplierName: data.supplierName || '',
      productCode: data.productCode || '',
      productTitle: data.productTitle || '',
      quantity: Number(data.quantity) || 1,
      faultReason: data.faultReason || '',
      status: data.status || 'Received',
      resolutionNote: data.resolutionNote || '',
      resolvedDate: data.resolvedDate || '',
      createdAt: idx !== -1 ? (jsonStore.claims[idx].createdAt || now) : now
    };
    if (idx !== -1) {
      jsonStore.claims[idx] = rec;
    } else {
      jsonStore.claims.push(rec);
    }
    if (saveJsonFn) saveJsonFn();
    return { success: true, id, claimNo };
  }

  if (!db) throw new Error('Database not initialized');
  const existing = data.id ? db.prepare('SELECT id FROM claims WHERE id = ?').get(data.id) : null;
  if (existing) {
    db.prepare(`
      UPDATE claims SET
        entryDate = ?, customerName = ?, customerPhone = ?, supplierName = ?,
        productCode = ?, productTitle = ?, quantity = ?, faultReason = ?,
        status = ?, resolutionNote = ?, resolvedDate = ?
      WHERE id = ?
    `).run(
      data.entryDate || now.split('T')[0],
      data.customerName || '',
      data.customerPhone || '',
      data.supplierName || '',
      data.productCode || '',
      data.productTitle || '',
      Number(data.quantity) || 1,
      data.faultReason || '',
      data.status || 'Received',
      data.resolutionNote || '',
      data.resolvedDate || '',
      data.id
    );
    return { success: true, id: data.id, claimNo };
  } else {
    db.prepare(`
      INSERT INTO claims (id, claimNo, entryDate, customerName, customerPhone, supplierName, productCode, productTitle, quantity, faultReason, status, resolutionNote, resolvedDate, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, claimNo,
      data.entryDate || now.split('T')[0],
      data.customerName || '',
      data.customerPhone || '',
      data.supplierName || '',
      data.productCode || '',
      data.productTitle || '',
      Number(data.quantity) || 1,
      data.faultReason || '',
      data.status || 'Received',
      data.resolutionNote || '',
      data.resolvedDate || '',
      now
    );
    return { success: true, id, claimNo };
  }
}

function deleteClaim(id) {
  if (isJson) {
    jsonStore.claims = (jsonStore.claims || []).filter(c => c.id !== id);
    if (saveJsonFn) saveJsonFn();
    return { success: true };
  }
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM claims WHERE id = ?').run(id);
  return { success: true };
}

// ========================================================
// 4. DAY-END CASH CLOSING & HANDOVER (SHAM KA HISAAB)
// ========================================================
function getDailyClosingSummary(dateStr) {
  const date = dateStr || new Date().toISOString().split('T')[0];

  if (isJson) {
    const totalCashSales = (jsonStore.sales || [])
      .filter(s => s.entryDate === date && s.paymentType === 'Cash')
      .reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);

    const totalCrvReceived = (jsonStore.accounts_vouchers || [])
      .filter(v => v.entryDate === date && v.voucherType === 'CRV' && (v.paymentMode === 'Cash' || !v.paymentMode))
      .reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

    const totalCpvPaid = (jsonStore.accounts_vouchers || [])
      .filter(v => v.entryDate === date && v.voucherType === 'CPV' && (v.paymentMode === 'Cash' || !v.paymentMode))
      .reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

    const totalExpensesPaid = (jsonStore.expenses || [])
      .filter(e => e.entryDate === date && (e.paymentMode === 'Cash' || !e.paymentMode))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const existingClosing = (jsonStore.day_end_closings || []).find(c => c.closingDate === date) || null;
    let openingDrawerCash = 0;
    if (existingClosing) {
      openingDrawerCash = existingClosing.openingDrawerCash;
    } else {
      const prevClosings = (jsonStore.day_end_closings || [])
        .filter(c => c.closingDate < date)
        .sort((a, b) => (b.closingDate || '').localeCompare(a.closingDate || ''));
      if (prevClosings.length) openingDrawerCash = prevClosings[0].closingDrawerBalance || 0;
    }
    const expectedDrawerCash = openingDrawerCash + totalCashSales + totalCrvReceived - totalCpvPaid - totalExpensesPaid;

    return {
      date,
      openingDrawerCash,
      totalCashSales,
      totalCrvReceived,
      totalCpvPaid,
      totalExpensesPaid,
      expectedDrawerCash,
      existingClosing
    };
  }

  if (!db) return null;
  try {
    // 1. Total Cash Sales for date
    const cashSalesRow = db.prepare(`
      SELECT COALESCE(SUM(paidAmount), 0) as totalCashSale
      FROM sales
      WHERE entryDate = ? AND paymentType = 'Cash'
    `).get(date);
    const totalCashSales = cashSalesRow ? cashSalesRow.totalCashSale : 0;

    // 2. Total CRV (Cash Receipts) for date
    const crvRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as totalCrv
      FROM accounts_vouchers
      WHERE entryDate = ? AND voucherType = 'CRV' AND paymentMode = 'Cash'
    `).get(date);
    const totalCrvReceived = crvRow ? crvRow.totalCrv : 0;

    // 3. Total CPV (Cash Payments to suppliers) for date
    const cpvRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as totalCpv
      FROM accounts_vouchers
      WHERE entryDate = ? AND voucherType = 'CPV' AND paymentMode = 'Cash'
    `).get(date);
    const totalCpvPaid = cpvRow ? cpvRow.totalCpv : 0;

    // 4. Total Daily Expenses for date
    const expRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as totalExp
      FROM expenses
      WHERE entryDate = ? AND paymentMode = 'Cash'
    `).get(date);
    const totalExpensesPaid = expRow ? expRow.totalExp : 0;

    // 5. Check if there was an existing closing record for this date
    const existingClosing = db.prepare('SELECT * FROM day_end_closings WHERE closingDate = ?').get(date);

    // 6. Get previous day's closing drawer balance as opening cash
    let openingDrawerCash = 0;
    if (existingClosing) {
      openingDrawerCash = existingClosing.openingDrawerCash;
    } else {
      const prevClosing = db.prepare('SELECT closingDrawerBalance FROM day_end_closings WHERE closingDate < ? ORDER BY closingDate DESC LIMIT 1').get(date);
      if (prevClosing) openingDrawerCash = prevClosing.closingDrawerBalance;
    }

    const expectedDrawerCash = openingDrawerCash + totalCashSales + totalCrvReceived - totalCpvPaid - totalExpensesPaid;

    return {
      date,
      openingDrawerCash,
      totalCashSales,
      totalCrvReceived,
      totalCpvPaid,
      totalExpensesPaid,
      expectedDrawerCash,
      existingClosing
    };
  } catch (e) {
    console.error('Error calculating daily closing summary:', e);
    return null;
  }
}

function getAllDayEndClosings() {
  if (isJson) {
    return (jsonStore.day_end_closings || []).slice().sort((a, b) => (b.closingDate || '').localeCompare(a.closingDate || ''));
  }
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM day_end_closings ORDER BY closingDate DESC').all();
  } catch (e) {
    return [];
  }
}

function saveDayEndClosing(data) {
  const now = new Date().toISOString();
  const date = data.closingDate || now.split('T')[0];
  const id = data.id || `dec-${date}`;

  if (isJson) {
    if (!Array.isArray(jsonStore.day_end_closings)) jsonStore.day_end_closings = [];
    const idx = jsonStore.day_end_closings.findIndex(c => c.closingDate === date);
    const rec = {
      id: idx !== -1 ? jsonStore.day_end_closings[idx].id : id,
      closingDate: date,
      openingDrawerCash: Number(data.openingDrawerCash) || 0,
      totalCashSales: Number(data.totalCashSales) || 0,
      totalCrvReceived: Number(data.totalCrvReceived) || 0,
      totalCpvPaid: Number(data.totalCpvPaid) || 0,
      totalExpensesPaid: Number(data.totalExpensesPaid) || 0,
      expectedDrawerCash: Number(data.expectedDrawerCash) || 0,
      actualCountedCash: Number(data.actualCountedCash) || 0,
      cashDifference: Number(data.cashDifference) || 0,
      cashDeliveredToManager: Number(data.cashDeliveredToManager) || 0,
      closingDrawerBalance: Number(data.closingDrawerBalance) || 0,
      notes: data.notes || '',
      closedBy: data.closedBy || 'Admin',
      createdAt: idx !== -1 ? (jsonStore.day_end_closings[idx].createdAt || now) : now
    };
    if (idx !== -1) {
      jsonStore.day_end_closings[idx] = rec;
    } else {
      jsonStore.day_end_closings.push(rec);
    }
    if (saveJsonFn) saveJsonFn();
    return { success: true, id: rec.id, date };
  }

  if (!db) throw new Error('Database not initialized');
  const existing = db.prepare('SELECT id FROM day_end_closings WHERE closingDate = ?').get(date);
  if (existing) {
    db.prepare(`
      UPDATE day_end_closings SET
        openingDrawerCash = ?, totalCashSales = ?, totalCrvReceived = ?, totalCpvPaid = ?, totalExpensesPaid = ?,
        expectedDrawerCash = ?, actualCountedCash = ?, cashDifference = ?,
        cashDeliveredToManager = ?, closingDrawerBalance = ?, notes = ?, closedBy = ?
      WHERE closingDate = ?
    `).run(
      Number(data.openingDrawerCash) || 0,
      Number(data.totalCashSales) || 0,
      Number(data.totalCrvReceived) || 0,
      Number(data.totalCpvPaid) || 0,
      Number(data.totalExpensesPaid) || 0,
      Number(data.expectedDrawerCash) || 0,
      Number(data.actualCountedCash) || 0,
      Number(data.cashDifference) || 0,
      Number(data.cashDeliveredToManager) || 0,
      Number(data.closingDrawerBalance) || 0,
      data.notes || '',
      data.closedBy || 'Admin',
      date
    );
    return { success: true, id: existing.id, date };
  } else {
    db.prepare(`
      INSERT INTO day_end_closings (
        id, closingDate, openingDrawerCash, totalCashSales, totalCrvReceived, totalCpvPaid, totalExpensesPaid,
        expectedDrawerCash, actualCountedCash, cashDifference, cashDeliveredToManager, closingDrawerBalance, notes, closedBy, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, date,
      Number(data.openingDrawerCash) || 0,
      Number(data.totalCashSales) || 0,
      Number(data.totalCrvReceived) || 0,
      Number(data.totalCpvPaid) || 0,
      Number(data.totalExpensesPaid) || 0,
      Number(data.expectedDrawerCash) || 0,
      Number(data.actualCountedCash) || 0,
      Number(data.cashDifference) || 0,
      Number(data.cashDeliveredToManager) || 0,
      Number(data.closingDrawerBalance) || 0,
      data.notes || '',
      data.closedBy || 'Admin',
      now
    );
    return { success: true, id, date };
  }
}

module.exports = {
  initTradeFeatures,
  // Expenses
  getNextExpenseVoucherNo,
  getAllExpenses,
  saveExpense,
  deleteExpense,
  getChartOfAccounts,
  // Estimates
  getNextEstimateNo,
  getAllEstimates,
  getEstimateById,
  saveEstimate,
  deleteEstimate,
  // Claims
  getNextClaimNo,
  getAllClaims,
  saveClaim,
  deleteClaim,
  // Day-End Closing
  getDailyClosingSummary,
  getAllDayEndClosings,
  saveDayEndClosing
};
