// Shahzaib Traders - Accounts Database Module
// Handles Cash Receipt Vouchers (CRV), Cash Payment Vouchers (CPV), and Party Ledgers

let db = null;
let isJson = false;
let jsonStore = null;
let saveJsonFn = null;
let checkpointFn = null;
let generalInfoRef = null;

function initAccountsDb(dbInstance, isFallback, jsonData, saveJsonCallback, checkpointCallback, giDb) {
  db = dbInstance;
  isJson = isFallback;
  jsonStore = jsonData;
  saveJsonFn = saveJsonCallback;
  checkpointFn = checkpointCallback;
  generalInfoRef = giDb;

  if (isJson) {
    if (!Array.isArray(jsonStore.accounts_vouchers)) {
      jsonStore.accounts_vouchers = [];
    }
    return;
  }

  if (!db) return;

  // Create SQLite table for Accounts Vouchers (CRV & CPV)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts_vouchers (
        id TEXT PRIMARY KEY,
        voucherType TEXT NOT NULL,
        voucherNo TEXT UNIQUE NOT NULL,
        manualNo TEXT DEFAULT '',
        entryDate TEXT NOT NULL,
        partyId TEXT NOT NULL,
        partyTitle TEXT NOT NULL,
        partyType TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        areaName TEXT DEFAULT '',
        city TEXT DEFAULT '',
        previousBalance REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        netAmount REAL DEFAULT 0,
        newBalance REAL DEFAULT 0,
        paymentMode TEXT DEFAULT 'Cash',
        accountTitle TEXT DEFAULT 'Main Cash Account',
        chequeOrRefNo TEXT DEFAULT '',
        remarks TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('Error creating accounts_vouchers table:', err);
  }
}

// Generate Next Voucher Number (e.g. CRV-0001 or CPV-0001)
function getNextVoucherNo(type) {
  const prefix = (type === 'CPV' ? 'CPV-' : 'CRV-');
  const pad = (num, size = 4) => String(num).padStart(size, '0');

  if (isJson) {
    const list = (jsonStore.accounts_vouchers || []).filter(v => v.voucherType === type);
    if (!list.length) return `${prefix}0001`;

    let maxNum = 0;
    for (const v of list) {
      if (v.voucherNo && v.voucherNo.startsWith(prefix)) {
        const num = parseInt(v.voucherNo.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${prefix}${pad(maxNum + 1)}`;
  }

  if (!db) return `${prefix}0001`;

  try {
    const rows = db.prepare(`
      SELECT voucherNo FROM accounts_vouchers
      WHERE voucherType = ? AND voucherNo LIKE ?
      ORDER BY rowid DESC LIMIT 100
    `).all(type, `${prefix}%`);

    let maxNum = 0;
    for (const row of rows) {
      const match = row.voucherNo.replace(prefix, '');
      const num = parseInt(match, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return `${prefix}${pad(maxNum + 1)}`;
  } catch (err) {
    console.error('Error getting next accounts voucher no:', err);
    return `${prefix}0001`;
  }
}

// Get All Vouchers with optional type and search filter
function getAllVouchers(filter = {}) {
  const typeFilter = filter.type || '';
  const search = (filter.search || '').trim().toLowerCase();

  if (isJson) {
    let list = jsonStore.accounts_vouchers || [];
    if (typeFilter) list = list.filter(v => v.voucherType === typeFilter);
    if (search) {
      list = list.filter(v =>
        (v.voucherNo && v.voucherNo.toLowerCase().includes(search)) ||
        (v.partyTitle && v.partyTitle.toLowerCase().includes(search)) ||
        (v.manualNo && v.manualNo.toLowerCase().includes(search)) ||
        (v.phone && v.phone.toLowerCase().includes(search))
      );
    }
    return list.slice().sort((a, b) => new Date(b.entryDate || b.createdAt) - new Date(a.entryDate || a.createdAt));
  }

  if (!db) return [];

  try {
    let query = 'SELECT * FROM accounts_vouchers';
    const params = [];
    const conditions = [];

    if (typeFilter) {
      conditions.push('voucherType = ?');
      params.push(typeFilter);
    }

    if (search) {
      conditions.push('(voucherNo LIKE ? OR partyTitle LIKE ? OR manualNo LIKE ? OR phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY entryDate DESC, createdAt DESC';

    return db.prepare(query).all(...params);
  } catch (err) {
    console.error('Error fetching accounts vouchers:', err);
    return [];
  }
}

// Get Voucher by ID
function getVoucherById(id) {
  if (isJson) {
    return (jsonStore.accounts_vouchers || []).find(v => v.id === id || v.voucherNo === id) || null;
  }
  if (!db) return null;
  try {
    return db.prepare('SELECT * FROM accounts_vouchers WHERE id = ? OR voucherNo = ?').get(id, id) || null;
  } catch (err) {
    console.error('Error getting voucher by id:', err);
    return null;
  }
}

// Helper: Check if party is a Supplier / Vendor
function isSupplierParty(partyId, fallbackType = '') {
  if (!partyId && !fallbackType) return false;
  if (isJson) {
    const p = (jsonStore.parties || []).find(x => x.id === partyId);
    if (p) {
      const t = String(p.partyTypeName || p.partyType || '').toLowerCase();
      const tid = String(p.partyTypeId || '').toLowerCase();
      return t.includes('vendor') || t.includes('supplier') || tid === 'pt-2';
    }
  } else if (db) {
    try {
      const p = db.prepare('SELECT partyTypeId, partyTypeName FROM parties WHERE id = ?').get(String(partyId));
      if (p) {
        const t = String(p.partyTypeName || '').toLowerCase();
        const tid = String(p.partyTypeId || '').toLowerCase();
        return t.includes('vendor') || t.includes('supplier') || tid === 'pt-2';
      }
    } catch (_e) {}
  }
  const fb = String(fallbackType || '').toLowerCase();
  return fb.includes('vendor') || fb.includes('supplier') || fb === 'pt-2';
}

// Balance delta calculation:
// Customer:
//   CRV (Cash receipt): Customer pays, balance decreases (-netAmount)
//   CPV (Cash payment): Paid to customer, balance increases (+netAmount)
// Supplier:
//   CRV (Cash receipt/refund): Supplier refunds, payable/balance increases (+netAmount)
//   CPV (Cash payment): Paid to supplier, payable/balance decreases (-netAmount)
function getVoucherBalanceDelta(isSupp, voucherType, netAmount) {
  const net = Number(netAmount) || 0;
  if (isSupp) {
    return voucherType === 'CRV' ? +net : -net;
  } else {
    return voucherType === 'CRV' ? -net : +net;
  }
}

// Save Accounts Voucher (CRV or CPV)
function saveVoucher(voucherData) {
  if (!voucherData) throw new Error('Voucher data is required');

  const now = new Date().toISOString();
  const id = voucherData.id || `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const voucherType = voucherData.voucherType === 'CPV' ? 'CPV' : 'CRV';
  const voucherNo = voucherData.voucherNo || getNextVoucherNo(voucherType);
  const entryDate = voucherData.entryDate || now.slice(0, 10);
  const partyId = String(voucherData.partyId || '').trim();
  const partyTitle = String(voucherData.partyTitle || '').trim();
  const partyType = String(voucherData.partyType || '').trim();
  const phone = String(voucherData.phone || '').trim();
  const areaName = String(voucherData.areaName || '').trim();
  const city = String(voucherData.city || '').trim();
  const manualNo = String(voucherData.manualNo || '').trim();

  const prevBalance = Number(voucherData.previousBalance) || 0;
  const amount = Number(voucherData.amount) || 0;
  const discount = Number(voucherData.discount) || 0;
  const netAmount = Number(voucherData.netAmount) || (amount + discount);

  const isSupp = isSupplierParty(partyId, partyType);
  const balanceDelta = getVoucherBalanceDelta(isSupp, voucherType, netAmount);
  const newBalance = Number(voucherData.newBalance !== undefined ? voucherData.newBalance : (prevBalance + balanceDelta));

  const paymentMode = String(voucherData.paymentMode || 'Cash').trim();
  const accountTitle = String(voucherData.accountTitle || 'Main Cash Account').trim();
  const chequeOrRefNo = String(voucherData.chequeOrRefNo || '').trim();
  const remarks = String(voucherData.remarks || '').trim();

  if (isJson) {
    const existingIndex = (jsonStore.accounts_vouchers || []).findIndex(v => v.id === id || v.voucherNo === voucherNo);
    let oldDelta = 0;
    let oldPartyId = '';

    if (existingIndex >= 0) {
      const oldVoucher = jsonStore.accounts_vouchers[existingIndex];
      oldPartyId = oldVoucher.partyId;
      const wasOldSupp = isSupplierParty(oldVoucher.partyId, oldVoucher.partyType);
      oldDelta = getVoucherBalanceDelta(wasOldSupp, oldVoucher.voucherType, oldVoucher.netAmount);

      jsonStore.accounts_vouchers[existingIndex] = {
        ...oldVoucher,
        voucherType,
        voucherNo,
        manualNo,
        entryDate,
        partyId,
        partyTitle,
        partyType,
        phone,
        areaName,
        city,
        previousBalance: prevBalance,
        amount,
        discount,
        netAmount,
        newBalance,
        paymentMode,
        accountTitle,
        chequeOrRefNo,
        remarks
      };
    } else {
      const record = {
        id,
        voucherType,
        voucherNo,
        manualNo,
        entryDate,
        partyId,
        partyTitle,
        partyType,
        phone,
        areaName,
        city,
        previousBalance: prevBalance,
        amount,
        discount,
        netAmount,
        newBalance,
        paymentMode,
        accountTitle,
        chequeOrRefNo,
        remarks,
        createdAt: now
      };
      jsonStore.accounts_vouchers.unshift(record);
    }

    if (saveJsonFn) saveJsonFn();

    // Update Party Balance in General Info
    if (generalInfoRef && generalInfoRef.updatePartyBalance) {
      if (existingIndex >= 0) {
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
  }

  if (!db) throw new Error('Database not initialized');

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

// Delete Accounts Voucher
function deleteVoucher(id) {
  if (isJson) {
    const v = (jsonStore.accounts_vouchers || []).find(x => x.id === id || x.voucherNo === id);
    if (v) {
      jsonStore.accounts_vouchers = jsonStore.accounts_vouchers.filter(x => x.id !== v.id);
      if (saveJsonFn) saveJsonFn();

      // Revert party balance
      if (v.partyId && generalInfoRef && generalInfoRef.updatePartyBalance) {
        const isSupp = isSupplierParty(v.partyId, v.partyType);
        const delta = getVoucherBalanceDelta(isSupp, v.voucherType, v.netAmount);
        generalInfoRef.updatePartyBalance(v.partyId, -delta);
      }
    }
    return { success: true };
  }

  if (!db) throw new Error('Database not initialized');

  db.exec('BEGIN TRANSACTION;');
  try {
    const v = db.prepare('SELECT id, voucherType, partyType, partyId, netAmount FROM accounts_vouchers WHERE id = ? OR voucherNo = ?').get(id, id);
    if (v) {
      db.prepare('DELETE FROM accounts_vouchers WHERE id = ?').run(v.id);
      db.exec('COMMIT;');
      if (checkpointFn) checkpointFn();

      if (v.partyId && generalInfoRef && generalInfoRef.updatePartyBalance) {
        const isSupp = isSupplierParty(v.partyId, v.partyType);
        const delta = getVoucherBalanceDelta(isSupp, v.voucherType, v.netAmount);
        generalInfoRef.updatePartyBalance(v.partyId, -delta);
      }
    } else {
      db.exec('COMMIT;');
    }
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error deleting accounts voucher:', err);
    throw err;
  }
}

// Get Complete Party Account Ledger
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
  if (isJson) {
    sales = (jsonStore.sales || []).filter(s => s.partyId === partyId && s.billStatus !== 'Estimated');
  } else if (db) {
    try {
      sales = db.prepare("SELECT * FROM sales WHERE partyId = ? AND (billStatus IS NULL OR billStatus != 'Estimated')").all(partyId);
    } catch (_e) { sales = []; }
  }

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
  if (isJson) {
    returns = (jsonStore.sales_returns || []).filter(r => r.partyId === partyId);
  } else if (db) {
    try {
      returns = db.prepare('SELECT * FROM sales_returns WHERE partyId = ?').all(partyId);
    } catch (_e) { returns = []; }
  }

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
  if (isJson) {
    purchases = (jsonStore.purchases || []).filter(p => p.partyId === partyId);
  } else if (db) {
    try {
      purchases = db.prepare('SELECT * FROM purchases WHERE partyId = ?').all(partyId);
    } catch (_e) { purchases = []; }
  }

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
  if (isJson) {
    vouchers = (jsonStore.accounts_vouchers || []).filter(v => v.partyId === partyId);
  } else if (db) {
    try {
      vouchers = db.prepare('SELECT * FROM accounts_vouchers WHERE partyId = ?').all(partyId);
    } catch (_e) { vouchers = []; }
  }

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

  // Sort all entries chronologically
  entries.sort((a, b) => {
    const cmp = (a.date || '').localeCompare(b.date || '');
    if (cmp !== 0) return cmp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // Base opening balance is the party's initial opening balance registered in parties.
  let baseOpeningBal = Number(party ? party.openingBalance : 0) || 0;
  let openingBal = baseOpeningBal;
  let runningBal = openingBal;
  let totalDebit = 0;
  let totalCredit = 0;

  const filteredEntries = [];
  const isSupp = isSupplierParty(partyId, party ? party.partyTypeName : '');

  for (const entry of entries) {
    const entryDate = entry.date || '';
    // For Customer: Debit increases receivable (+), Credit decreases receivable (-)
    // For Supplier: Credit increases payable (+), Debit decreases payable (-)
    const entryDelta = isSupp ? (entry.credit - entry.debit) : (entry.debit - entry.credit);

    if (fromDate && entryDate < fromDate) {
      // Prior to window, accumulate into opening balance
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

module.exports = {
  initAccountsDb,
  getNextVoucherNo,
  getAllVouchers,
  getVoucherById,
  saveVoucher,
  deleteVoucher,
  getPartyLedger
};
