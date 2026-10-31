const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

console.log('====================================================');
console.log('AUDIT CROSS-PARTY TRANSACTIONS (READ-ONLY)');
console.log('Target: inventory.db (Open read-only, ZERO changes)');
console.log('====================================================\n');

const dbPath = path.join(__dirname, 'inventory.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });

function isSupplier(partyTypeId, partyTypeName) {
  const t = String(partyTypeName || '').toLowerCase();
  const tid = String(partyTypeId || '').toLowerCase();
  return t.includes('vendor') || t.includes('supplier') || tid === 'pt-2';
}

const parties = db.prepare('SELECT id, name, partyTypeId, partyTypeName, openingBalance, currentBalance FROM parties').all();
const partyMap = new Map();
for (const p of parties) {
  partyMap.set(p.id, {
    ...p,
    isSupp: isSupplier(p.partyTypeId, p.partyTypeName)
  });
}

// 1. Every Supplier with a CRV
console.log('1. SUPPLIERS WITH A CASH RECEIPT VOUCHER (CRV):');
console.log('----------------------------------------------------');
const crvs = db.prepare("SELECT * FROM accounts_vouchers WHERE voucherType = 'CRV'").all();
const supplierCrvs = [];

for (const v of crvs) {
  const p = partyMap.get(v.partyId);
  const isSupp = p ? p.isSupp : isSupplier(v.partyType, v.partyType);
  if (isSupp) {
    supplierCrvs.push({
      voucherNo: v.voucherNo,
      entryDate: v.entryDate,
      partyId: v.partyId,
      partyTitle: v.partyTitle || (p ? p.name : '--'),
      amount: v.amount,
      netAmount: v.netAmount,
      remarks: v.remarks
    });
  }
}

if (supplierCrvs.length === 0) {
  console.log('None found. (0 suppliers have CRV vouchers in this database)\n');
} else {
  console.log(`Found ${supplierCrvs.length} CRV voucher(s) logged under suppliers:`);
  supplierCrvs.forEach((c, idx) => {
    console.log(`  [${idx + 1}] Voucher: ${c.voucherNo} | Date: ${c.entryDate} | Supplier: ${c.partyTitle} (${c.partyId}) | Amount: Rs. ${c.amount} | Net: Rs. ${c.netAmount} | Remarks: ${c.remarks || '--'}`);
  });
  console.log('');
}

// 2. Every Sale billed to a Supplier
console.log('2. SALES BILLED TO A SUPPLIER / VENDOR:');
console.log('----------------------------------------------------');
const sales = db.prepare("SELECT id, voucherNo, entryDate, partyId, partyTitle, netAmount, paidAmount, balanceDue FROM sales WHERE partyId IS NOT NULL AND partyId != '' AND partyId != 'walk-in'").all();
const salesToSuppliers = [];

for (const s of sales) {
  const p = partyMap.get(s.partyId);
  if (p && p.isSupp) {
    salesToSuppliers.push({
      voucherNo: s.voucherNo,
      entryDate: s.entryDate,
      partyId: s.partyId,
      partyTitle: s.partyTitle || p.name,
      netAmount: s.netAmount,
      paidAmount: s.paidAmount,
      balanceDue: s.balanceDue
    });
  }
}

if (salesToSuppliers.length === 0) {
  console.log('None found. (0 sales are billed to suppliers in this database)\n');
} else {
  console.log(`Found ${salesToSuppliers.length} sale(s) billed to suppliers:`);
  salesToSuppliers.forEach((s, idx) => {
    console.log(`  [${idx + 1}] Sale: ${s.voucherNo} | Date: ${s.entryDate} | Supplier: ${s.partyTitle} (${s.partyId}) | Net: Rs. ${s.netAmount} | Paid: Rs. ${s.paidAmount} | Due: Rs. ${s.balanceDue}`);
  });
  console.log('');
}

// 3. Every Purchase booked under a Customer
console.log('3. PURCHASES BOOKED UNDER A CUSTOMER:');
console.log('----------------------------------------------------');
const purchases = db.prepare("SELECT id, voucherNo, entryDate, partyId, partyTitle, grandTotal FROM purchases WHERE partyId IS NOT NULL AND partyId != '' AND partyId != 'walk-in'").all();
const purchasesFromCustomers = [];

for (const pu of purchases) {
  const p = partyMap.get(pu.partyId);
  if (p && !p.isSupp) {
    purchasesFromCustomers.push({
      voucherNo: pu.voucherNo,
      entryDate: pu.entryDate,
      partyId: pu.partyId,
      partyTitle: pu.partyTitle || p.name,
      grandTotal: pu.grandTotal
    });
  }
}

if (purchasesFromCustomers.length === 0) {
  console.log('None found. (0 purchases are booked under customers in this database)\n');
} else {
  console.log(`Found ${purchasesFromCustomers.length} purchase(s) booked under customers:`);
  purchasesFromCustomers.forEach((pu, idx) => {
    console.log(`  [${idx + 1}] Purchase: ${pu.voucherNo} | Date: ${pu.entryDate} | Customer: ${pu.partyTitle} (${pu.partyId}) | Grand Total: Rs. ${pu.grandTotal}`);
  });
  console.log('');
}

db.close();
console.log('Audit completed cleanly in READ-ONLY mode.');

