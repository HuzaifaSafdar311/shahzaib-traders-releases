// Shahzaib Traders - Trade Features Database Module
// Handles Daily Expenses, Electrician Estimates (Kacha Bill), Warranty Claims, and Day-End Cash Closing

let db = null;

function initTradeFeatures(dbInstance) {
  db = dbInstance;
}

// ========================================================
// 1. DAILY EXPENSES (DUKAN KHARCHAY)
// ========================================================
function getNextExpenseVoucherNo() {
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
  if (!db) throw new Error('Database not initialized');
  const now = new Date().toISOString();
  const id = data.id || `exp-${Date.now()}`;
  const voucherNo = data.voucherNo || getNextExpenseVoucherNo();

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
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return { success: true };
}

function getChartOfAccounts() {
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
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM estimates ORDER BY entryDate DESC, estimateNo DESC').all();
  } catch (e) {
    return [];
  }
}

function getEstimateById(id) {
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
  if (!db) throw new Error('Database not initialized');
  const now = new Date().toISOString();
  const id = data.id || `est-${Date.now()}`;
  const estimateNo = data.estimateNo || getNextEstimateNo();

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
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM estimate_items WHERE estimateId = ?').run(id);
  db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
  return { success: true };
}

// ========================================================
// 3. WARRANTY & DEFECTIVE CLAIMS (KHARAB SAMAAN)
// ========================================================
function getNextClaimNo() {
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
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM claims ORDER BY entryDate DESC, claimNo DESC').all();
  } catch (e) {
    return [];
  }
}

function saveClaim(data) {
  if (!db) throw new Error('Database not initialized');
  const now = new Date().toISOString();
  const id = data.id || `clm-${Date.now()}`;
  const claimNo = data.claimNo || getNextClaimNo();

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
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM claims WHERE id = ?').run(id);
  return { success: true };
}

// ========================================================
// 4. DAY-END CASH CLOSING & HANDOVER (SHAM KA HISAAB)
// ========================================================
function getDailyClosingSummary(dateStr) {
  if (!db) return null;
  const date = dateStr || new Date().toISOString().split('T')[0];
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
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM day_end_closings ORDER BY closingDate DESC').all();
  } catch (e) {
    return [];
  }
}

function saveDayEndClosing(data) {
  if (!db) throw new Error('Database not initialized');
  const now = new Date().toISOString();
  const date = data.closingDate || now.split('T')[0];
  const id = data.id || `dec-${date}`;

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
