/**
 * Shahzaib Traders - Party Balance Audit & Repair Tool
 * 
 * Usage:
 *   node repair_balances.js          # Dry-run audit (prints differences, modifies nothing)
 *   node repair_balances.js --apply  # Creates safety backup and applies repairs inside 1 transaction
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const isApply = process.argv.includes('--apply');
const dbPath = path.resolve(__dirname, 'inventory.db');

if (!fs.existsSync(dbPath)) {
  console.error('Error: Database file not found at:', dbPath);
  process.exit(1);
}

// 1. Create Safety Backup
const backupDir = path.resolve(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `inventory_pre_repair_backup_${timestamp}.db`);
fs.copyFileSync(dbPath, backupPath);

console.log('====================================================');
console.log('SHAHZAIB TRADERS - PARTY BALANCE AUDIT & REPAIR');
console.log(`Database: ${dbPath}`);
console.log(`Safety Backup: ${backupPath}`);
console.log(`Mode: ${isApply ? 'APPLY REPAIRS (Transactioned)' : 'DRY RUN (Audit Only, Zero Changes)'}`);
console.log('====================================================\n');

// Open database
const db = new DatabaseSync(dbPath);

function isSupplier(partyTypeId, partyTypeName) {
  const t = String(partyTypeName || '').toLowerCase();
  const tid = String(partyTypeId || '').toLowerCase();
  return t.includes('vendor') || t.includes('supplier') || tid === 'pt-2';
}

function getVoucherBalanceDelta(isSupp, voucherType, netAmount) {
  const net = Number(netAmount) || 0;
  if (isSupp) {
    return voucherType === 'CRV' ? +net : -net;
  } else {
    return voucherType === 'CRV' ? -net : +net;
  }
}

// Fetch all master data needed to recompute
const parties = db.prepare('SELECT * FROM parties ORDER BY name ASC').all();
const allSales = db.prepare("SELECT * FROM sales WHERE (billStatus IS NULL OR billStatus != 'Estimated')").all();
const allPurchases = db.prepare('SELECT * FROM purchases').all();
const allReturns = db.prepare('SELECT * FROM sales_returns').all();
const allVouchers = db.prepare('SELECT * FROM accounts_vouchers').all();

// Group transactions by partyId
const salesByParty = new Map();
for (const s of allSales) {
  if (!s.partyId) continue;
  if (!salesByParty.has(s.partyId)) salesByParty.set(s.partyId, []);
  salesByParty.get(s.partyId).push(s);
}

const purchasesByParty = new Map();
for (const pu of allPurchases) {
  if (!pu.partyId) continue;
  if (!purchasesByParty.has(pu.partyId)) purchasesByParty.set(pu.partyId, []);
  purchasesByParty.get(pu.partyId).push(pu);
}

const returnsByParty = new Map();
for (const r of allReturns) {
  if (!r.partyId) continue;
  if (!returnsByParty.has(r.partyId)) returnsByParty.set(r.partyId, []);
  returnsByParty.get(r.partyId).push(r);
}

const vouchersByParty = new Map();
for (const v of allVouchers) {
  if (!v.partyId) continue;
  if (!vouchersByParty.has(v.partyId)) vouchersByParty.set(v.partyId, []);
  vouchersByParty.get(v.partyId).push(v);
}

let totalParties = parties.length;
let matchCount = 0;
let mismatchCount = 0;
const repairList = [];

for (const p of parties) {
  const isSupp = isSupplier(p.partyTypeId, p.partyTypeName);
  const baseOpeningBal = Number(p.openingBalance) || 0;
  const storedBal = Number(p.currentBalance !== null && p.currentBalance !== undefined ? p.currentBalance : baseOpeningBal) || 0;

  const entries = [];

  // Sales
  const sales = salesByParty.get(p.id) || [];
  for (const s of sales) {
    entries.push({
      date: s.entryDate || (s.createdAt ? s.createdAt.slice(0, 10) : ''),
      debit: Number(s.netAmount) || 0,
      credit: Number(s.paidAmount) || 0,
      createdAt: s.createdAt || ''
    });
  }

  // Returns
  const returns = returnsByParty.get(p.id) || [];
  for (const r of returns) {
    const isCredit = (r.refundMode || 'Credit') === 'Credit';
    const amount = Number(r.totalAmount ?? r.netRefund ?? r.grandTotal ?? 0);
    entries.push({
      date: r.entryDate || (r.createdAt ? r.createdAt.slice(0, 10) : ''),
      debit: isCredit ? 0 : amount,
      credit: amount,
      createdAt: r.createdAt || ''
    });
  }

  // Purchases
  const purchases = purchasesByParty.get(p.id) || [];
  for (const pu of purchases) {
    entries.push({
      date: pu.entryDate || (pu.createdAt ? pu.createdAt.slice(0, 10) : ''),
      debit: 0,
      credit: Number(pu.grandTotal) || 0,
      createdAt: pu.createdAt || ''
    });
  }

  // Vouchers
  const vouchers = vouchersByParty.get(p.id) || [];
  for (const v of vouchers) {
    const isCRV = (v.voucherType === 'CRV');
    entries.push({
      date: v.entryDate || (v.createdAt ? v.createdAt.slice(0, 10) : ''),
      debit: isCRV ? 0 : Number(v.netAmount || v.amount || 0),
      credit: isCRV ? Number(v.netAmount || v.amount || 0) : 0,
      createdAt: v.createdAt || ''
    });
  }

  // Chronological sort
  entries.sort((a, b) => {
    const cmp = (a.date || '').localeCompare(b.date || '');
    if (cmp !== 0) return cmp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // Calculate closing balance
  let runningBal = baseOpeningBal;
  for (const e of entries) {
    const entryDelta = isSupp ? (e.credit - e.debit) : (e.debit - e.credit);
    runningBal = Math.round((runningBal + entryDelta) * 100) / 100;
  }

  const computedBal = runningBal;
  const diff = Math.round((storedBal - computedBal) * 100) / 100;

  if (Math.abs(diff) < 0.01) {
    matchCount++;
  } else {
    mismatchCount++;
    repairList.push({
      id: p.id,
      name: p.name,
      partyType: p.partyTypeName || (isSupp ? 'Supplier' : 'Customer'),
      openingBalance: baseOpeningBal,
      storedBalance: storedBal,
      recomputedBalance: computedBal,
      diff: diff
    });
  }
}

console.log(`Audit Summary:`);
console.log(`  Total Parties Checked: ${totalParties}`);
console.log(`  Matching Balances:     ${matchCount}`);
console.log(`  Mismatched Balances:   ${mismatchCount}\n`);

if (mismatchCount > 0) {
  console.log('Mismatched Parties:');
  console.log('----------------------------------------------------');
  repairList.forEach((r, idx) => {
    console.log(`[${idx + 1}] ${r.name} (${r.partyType}) [ID: ${r.id}]`);
    console.log(`    Opening: Rs. ${r.openingBalance} | Stored: Rs. ${r.storedBalance} | Recomputed: Rs. ${r.recomputedBalance} | Diff: Rs. ${r.diff}`);
  });
  console.log('----------------------------------------------------\n');
}

if (!isApply) {
  console.log('[DRY-RUN COMPLETE] No changes were written to the database.');
  console.log('To synchronize all stored balances with recomputed values, re-run with:');
  console.log('  node repair_balances.js --apply\n');
  db.close();
  process.exit(0);
}

// APPLY REPAIRS IN ONE TRANSACTION
if (mismatchCount === 0) {
  console.log('[APPLY] All party balances are already in 100% sync. Zero updates needed.');
  db.close();
  process.exit(0);
}

console.log(`[APPLYING REPAIRS] Synchronizing ${repairList.length} mismatched parties inside 1 transaction...`);

db.exec('BEGIN TRANSACTION;');
try {
  const updateStmt = db.prepare('UPDATE parties SET currentBalance = ? WHERE id = ?');
  for (const item of repairList) {
    updateStmt.run(item.recomputedBalance, item.id);
  }
  db.exec('COMMIT;');
  db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  console.log(`[SUCCESS] Synchronized ${repairList.length} party balances successfully!`);
} catch (err) {
  db.exec('ROLLBACK;');
  console.error('[ERROR] Repair failed, rolled back completely:', err);
  process.exit(1);
} finally {
  db.close();
}

