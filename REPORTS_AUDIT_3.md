# REPORTS SECTION DEEP AUDIT: PART 6 TO PART 7
**File:** `REPORTS_AUDIT_3.md`  
**Application:** Shahzaib Traders POS & Inventory System  
**Audit Scope:** Live Test Runs on Temp Database Copies, Known Dataset Hand Checks, Prioritized Findings & Report Verdicts  
**Date of Audit:** October 31, 2026  

---

## PART 6: REAL TEST RUNS & VERIFICATION

Testing was conducted exclusively on temporary copies:
1. `scratch/report_audit_copy.db`: A duplicate of the real production database (`inventory.db`) to audit real-world data and compare report engine outputs against independent SQL queries.
2. `scratch/report_audit_known.db`: A known, hand-calculated dataset constructed from scratch to verify exact mathematical precision across sales, returns, purchases, vouchers, and discounts.

The live production database (`inventory.db`) was untouched.

---

### 6.1 Section A: Engine vs Raw SQL Comparison on Real Data Copy

Tests were executed across 4 standardized date ranges:
- **Range 1 (Today)**: `2026-10-31` to `2026-10-31`
- **Range 2 (This Month)**: `2026-10-01` to `2026-10-31`
- **Range 3 (All Time)**: Full database history
- **Range 4 (Single Day)**: `2026-10-31`

#### Test Execution Results Table

| Date Range | Report Name | Engine Totals | Independent Raw SQL Totals | Difference | Test Result | Analysis & Notes |
|---|---|---|---|---|---|---|
| **Today** | Bill-wise Sales | Records: 0, Net: Rs. 0.00 | Records: 0, Net: Rs. 0.00 | 0.00 | **PASS** | No sales recorded today. |
| | Bill-wise Purchases | Records: 1, Grand: Rs. 0.00 | Records: 1, Grand: Rs. 0.00 | 0.00 | **PASS** | 1 test purchase voucher with 0 total. |
| | Sales Returns | Records: 0, Refund: Rs. 0.00 | Records: 0, Refund: Rs. 0.00 | 0.00 | **PASS** | No returns today. |
| | CRV Register | Records: 0, Amount: Rs. 0.00 | Records: 0, Amount: Rs. 0.00 | 0.00 | **PASS** | No CRVs today. |
| | CPV Register | Records: 0, Amount: Rs. 0.00 | Records: 0, Amount: Rs. 0.00 | 0.00 | **PASS** | No CPVs today. |
| | Cash Book | In: 0.00, Out: 0.00, Net: 0.00 | In: 0.00, Out: 0.00, Net: 0.00 | 0.00 | **PASS** | Perfectly balanced. |
| | Profit & Loss | Net Sales: 0.00, Net Profit: 0.00 | Net Sales: 0.00, Net Profit: 0.00 | 0.00 | **PASS** | Zero activity. |
| **This Month** | Bill-wise Sales | Records: 0, Net: Rs. 0.00 | Records: 0, Net: Rs. 0.00 | 0.00 | **PASS** | No sales recorded this month. |
| | Bill-wise Purchases | Records: 1, Grand: Rs. 0.00 | Records: 1, Grand: Rs. 0.00 | 0.00 | **PASS** | Single purchase record. |
| | Sales Returns | Records: 0, Refund: Rs. 0.00 | Records: 0, Refund: Rs. 0.00 | 0.00 | **PASS** | Zero returns. |
| | CRV Register | Records: 39, Amount: Rs. 1,038,554.00 | Records: 39, Amount: Rs. 1,038,554.00 | 0.00 | **PASS** | All 39 cash receipts match SQL exactly. |
| | CPV Register | Records: 23, Amount: Rs. 810,704.00 | Records: 23, Amount: Rs. 810,704.00 | 0.00 | **PASS** | All 23 cash payments match SQL exactly. |
| | Cash Book | In: 1,038,554.00, Out: 810,704.00, Net: +227,850.00 | In: 1,038,554.00, Out: 810,704.00, Net: +227,850.00 | 0.00 | **PASS** | Net monthly cash flow is positive Rs. 227,850. |
| | Profit & Loss | Net Sales: 0.00, Net Profit: 0.00 | Net Sales: 0.00, Net Profit: 0.00 | 0.00 | **PASS** | Operating expenses were 0 for this month. |
| **All Time** | Bill-wise Sales | Records: 0, Net: Rs. 0.00 | Records: 0, Net: Rs. 0.00 | 0.00 | **PASS** | Zero sales in customer's current database. |
| | Bill-wise Purchases | Records: 1, Grand: Rs. 0.00 | Records: 1, Grand: Rs. 0.00 | 0.00 | **PASS** | Single purchase voucher. |
| | Sales Returns | Records: 0, Refund: Rs. 0.00 | Records: 0, Refund: Rs. 0.00 | 0.00 | **PASS** | Zero returns. |
| | CRV Register | Records: 232, Amount: Rs. 17,843,096.00 | Records: 232, Amount: Rs. 17,843,096.00 | 0.00 | **PASS** | Rs. 17.84M in receipts matches SQL. |
| | CPV Register | Records: 163, Amount: Rs. 24,951,347.00 | Records: 163, Amount: Rs. 24,951,347.00 | 0.00 | **PASS** | Rs. 24.95M in payments matches SQL. |
| | Cash Book | In: 17,843,096.00, Out: 24,951,347.00, Net: -7,108,251.00 | In: 17,843,096.00, Out: 24,951,347.00, Net: -7,108,251.00 | 0.00 | **PASS** | All-time cash flow is negative Rs. 7.1M due to absence of recorded cash sales. |
| | Profit & Loss | Net Sales: 0.00, Net Profit: 0.00 | Net Sales: 0.00, Net Profit: 0.00 | 0.00 | **PASS** | No sales recorded. |
| **Single Day (2026-10-31)** | All Registers | Matches Today results | Matches Today results | 0.00 | **PASS** | Single-day filter works cleanly. |
| **Snapshot** | Customer Receivables | Records: 35, Total: Rs. 14,062,622.00 | Records: 35, Total: Rs. 14,062,622.00 | 0.00 | **PASS** | 35 customers with positive balances. |
| **Snapshot** | Supplier Payables | Records: 22, Total: Rs. 17,776,143.00 | Records: 22, Total: Rs. 17,776,143.00 | 0.00 | **PASS** | 22 suppliers with payable balances. |
| **Snapshot** | Stock Position | Qty: 39,160, Cost Val: Rs. 76,938,676.00 | Qty: 39,160, Cost Val: Rs. 76,938,676.00 | 0.00 | **PASS** | Catalog inventory value: Rs. 76.93M. |

---

### 6.2 Section B: Known Dataset Hand-Check Verification

Executed on `scratch/report_audit_known.db` via `scratch/run_known_test.js`:

#### Scenario 1: Basic Trading, Returns & Stock
- **Input Data**: Opening Stock: 0. Purchase 10 items @ Rs. 100 (Total spend Rs. 1,000). Sell 4 items @ Rs. 150 (Gross Rs. 600). Customer returns 1 item @ Rs. 150 (Refund Rs. 150).
- **Expected Results**:
  - Net Sales: $600 - 150 = \text{Rs. } 450$
  - COGS: $(4 \times 100) - (1 \times 100) = \text{Rs. } 300$
  - Gross Trading Profit: $450 - 300 = \text{Rs. } 150$
  - Stock On-Hand Quantity: $10 - 4 + 1 = 7 \text{ units}$
  - Stock Cost Valuation: $7 \times 100 = \text{Rs. } 700$
- **Actual Engine Results & Pass/Fail**:
  | Metric | Expected Value | Actual Engine Value | Status | Finding / Defect |
  |---|---|---|---|---|
  | P&L Net Sales | Rs. 450.00 | Rs. 450.00 | **PASS** | Return refund is correctly subtracted from sales revenue. |
  | P&L COGS | Rs. 300.00 | **Rs. 400.00** | **FAIL** | **CRITICAL**: Return items do not store `purchasePrice`, so returns COGS is never deducted. |
  | P&L Gross Profit | Rs. 150.00 | **Rs. 50.00** | **FAIL** | **CRITICAL**: Gross profit is understated by Rs. 100 (the entire cost of returned goods). |
  | Stock Position Qty | 7 units | 7 units | **PASS** | Accurate. |
  | Stock Position Cost Value | Rs. 700.00 | Rs. 700.00 | **PASS** | Accurate. |
  | Bill-wise Profit Revenue | Rs. 450.00 | **Rs. 600.00** | **FAIL** | Bill-wise profit report completely ignores sales returns. |
  | Item-wise Sales Revenue | Rs. 450.00 | **Rs. 600.00** | **FAIL** | Item-wise sales report completely ignores sales returns. |

#### Scenario 2: Credit Sale & Customer Payment
- **Input Data**: Customer credit sale Rs. 5,000 with down payment Rs. 2,000 (Balance Due Rs. 3,000). Customer subsequently pays Rs. 1,500 via CRV.
- **Expected Result**: Net Customer Receivable = $3,000 - 1,500 = \text{Rs. } 1,500$.
- **Actual Engine Result**:
  - Customer Receivables Report: **Rs. 1,500.00** -> **PASS**
  - Customer Sales Report Balance Due: **Rs. 3,000.00** -> **FAIL** (Customer Sales report sums `s.balanceDue` from the invoice and ignores the subsequent CRV).

#### Scenario 3: Supplier Purchase & Payment
- **Input Data**: Supplier purchase invoice Rs. 8,000 (unpaid). Shop pays Rs. 3,000 via CPV.
- **Expected Result**: Net Supplier Payable = $8,000 - 3,000 = \text{Rs. } 5,000$.
- **Actual Engine Result**:
  - Supplier Payables Report: **Rs. 5,000.00** -> **PASS**

#### Scenario 4: Operating Expenses & Special Bill Discount
- **Input Data**: Shop Expense Rs. 500. Sale with Gross Rs. 1,000, Special Bill Discount Rs. 100, Net Rs. 900 (COGS Rs. 100).
- **Expected Results**:
  - P&L Net Sales: Rs. 900.00
  - P&L COGS: Rs. 100.00
  - P&L Operating Expenses: Rs. 500.00
  - P&L Net Profit: $900 - 100 - 500 = \text{Rs. } 300.00$
  - Cash Book Inflow: Rs. 900.00 | Outflow: Rs. 500.00 | Net Cash: Rs. 400.00
- **Actual Engine Results & Pass/Fail**:
  | Metric | Expected Value | Actual Engine Value | Status | Finding / Defect |
  |---|---|---|---|---|
  | P&L Net Sales | Rs. 900.00 | Rs. 900.00 | **PASS** | Special discount is deducted from gross sales. |
  | P&L Operating Expenses | Rs. 500.00 | Rs. 500.00 | **PASS** | Expenses table is included. |
  | P&L Net Profit | Rs. 300.00 | Rs. 300.00 | **PASS** | Accurate on screen card. |
  | Cash Book Inflow | Rs. 900.00 | Rs. 900.00 | **PASS** | Accurate. |
  | Cash Book Outflow | Rs. 500.00 | Rs. 500.00 | **PASS** | Accurate. |
  | Cash Book Net Cash | Rs. 400.00 | Rs. 400.00 | **PASS** | Accurate. |
  | Item-wise Sales Net Revenue | Rs. 900.00 | **Rs. 1,000.00** | **FAIL** | **HIGH**: Item-wise sales report ignores special bill discount! |
  | Item-wise Sales Gross Profit | Rs. 800.00 | **Rs. 900.00** | **FAIL** | **HIGH**: Item profit is overstated by Rs. 100! |

#### Scenario 5: CRV with Settlement Discount
- **Input Data**: Customer settles Rs. 1,000 debt by paying Rs. 900 cash and receiving Rs. 100 early settlement discount (`accounts_vouchers.discount = 100`).
- **Expected Effect on P&L**: Rs. 100 should be recognized as a Financial Expense / Discount Allowed, reducing Net Profit by Rs. 100.
- **Actual Engine Result**:
  - P&L Operating Expenses: **Rs. 0.00** -> **FAIL**
  - P&L Discounts Given: **Rs. 0.00** -> **FAIL**
  - P&L Net Profit Effect: **Rs. 0.00** -> **FAIL** (Settlement discounts granted to customers are **100% ignored** by Profit & Loss).

---

### 6.3 Section C: Audit of Real Data Copy Anomalies

Running all reports across the customer's actual database revealed these critical findings:

1. **Negative Cash Book Net Cash (-Rs. 7,108,251.00)**:
   - All-time CPV payments equal Rs. 24,951,347.00.
   - All-time CRV receipts equal Rs. 17,843,096.00.
   - The `sales` table has 0 historical cash sales recorded.
   - Consequently, the Cash Book reports that the drawer has a cash deficit of **negative Rs. 7.1 Million**.
2. **Territory Sales Report Totals Show Rs. 0.00**:
   - The table footer for Gross Sales and Discount renders **Rs. 0.00** because `totals.gross` and `totals.discount` were never computed in `reports-engine.js:295`.
3. **P&L Shows Zero For All Periods**:
   - Because no transactions were posted to `sales`, the P&L report displays 0.00 across all revenue and COGS metrics.
4. **Supplier CRVs (Rs. 10,000,000+)**:
   - As audited in Fix 5, 18 CRVs exist under suppliers. Because historical code applied `+net` to supplier balances for CRVs, the shopkeeper used the CRV screen to enter inward vendor debts.

---

## PART 7: FINDINGS & ACTION PLAN

### 7.1 Prioritized Findings Table (Sorted by Severity)

| ID | Severity | Report Name | File:Line | What Is Wrong | Effect on Shopkeeper's Decision or Money | Steps to Reproduce | Suggested Fix |
|---|---|---|---|---|---|---|---|
| **REP-01** | **CRITICAL** | **Profit & Loss Statement** | [`reports.js:844`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L844) | Passes unconfirmed `masterData.sales` containing Estimated (kacha) bills to P&L generator. | Kacha bills that were never confirmed or delivered are counted as real revenue and profit, inflating taxable income and misleading the owner on business profitability. | 1. Create an estimate (kacha bill) for Rs. 500,000.<br>2. Open Profit & Loss.<br>3. Observe Net Sales increases by Rs. 500,000. | Change `reports.js:844` to pass `confirmedSales` (which filters out `billStatus === 'Estimated'`). |
| **REP-02** | **CRITICAL** | **Profit & Loss Statement** | [`reports-engine.js:1024`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1024) | Reversion of Cost of Goods Sold on sales returns multiplies by `toNum(it.purchasePrice || 0)`. In `sale_return_items`, `purchasePrice` does not exist. | Returns reduce sales revenue by the full retail refund, but COGS is NOT reduced by the cost of the returned goods. Gross profit is understated by the entire wholesale cost of all returned items. | 1. Sell 1 item for Rs. 150 (Cost Rs. 100).<br>2. Return 1 item for Rs. 150.<br>3. P&L Net Sales is 0, but COGS remains Rs. 100, showing a fake loss of -Rs. 100. | In `generateProfitAndLossReport`, look up product's catalog `purchasePrice` or `averageCost` when `it.purchasePrice` is missing. |
| **REP-03** | **CRITICAL** | **Profit & Loss Export (Excel & PDF)** | [`reports.js:2264-2276`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2264-L2276) | Excel and PDF export mapper stops at Gross Profit. Operating Expenses, Expense breakdown, and Net Profit are omitted. | Printed and exported statements given to bank managers, tax accountants, or partners show Gross Profit as Net Profit and completely hide all operating expenses. | 1. Log Rs. 50,000 in shop expenses.<br>2. Open P&L and click Export to Excel or PDF.<br>3. Inspect the exported file: Expenses and Net Profit are completely missing. | Update `getReportExportData` for `profit-loss` to include rows for Operating Expenses, category breakdowns, and Net Profit. |
| **REP-04** | **CRITICAL** | **Item Purchases Report** | [`reports-engine.js:540`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L540) | Adds `packQty + unitQty + bonus` directly without multiplying `packQty * packSize`. | If 10 cartons of 24 pieces are purchased, the report records total units as 10 instead of 240. Average unit cost is computed as 24 times higher than reality, corrupting purchasing analytics. | 1. Enter purchase for 1 carton (24 pcs) @ Rs. 2,400.<br>2. Open Item Purchases report.<br>3. Total Qty shows 1 pc, and Avg Unit Cost shows Rs. 2,400 instead of Rs. 100. | Change `reports-engine.js:540` to calculate `(packQty * packSize) + unitQty + bonus`. |
| **REP-05** | **HIGH** | **Daily Cash Book Report** | [`reports-engine.js:915-970`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L915-L970) | Does not subtract cash refunds on sales returns (`sales_returns.refundMode = 'Cash'`). | Cash Book reports more cash in the drawer than physically exists. Cashier is blamed for cash shortages when balancing the drawer at day-end. | 1. Issue a cash refund of Rs. 1,000 on a return.<br>2. Compare Cash Book Net Cash with Day-End Closing.<br>3. Cash Book shows Rs. 1,000 higher than drawer cash. | In `generateCashBookReport`, iterate `returns` and subtract `totalAmount` where `refundMode === 'Cash'`. |
| **REP-06** | **HIGH** | **Item-wise Sales Report** | [`reports-engine.js:223`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L223) | Uses line item `it.netAmount` and ignores invoice-level special bill discount (`sales.discount`). | Item-wise Sales revenue and profit totals exceed Bill-wise Sales and P&L by the amount of special discounts, creating confusion during audits. | 1. Sell items for Rs. 5,000 with a special bill discount of Rs. 500.<br>2. Compare Bill-wise Sales (Net Rs. 4,500) with Item-wise Sales (Net Rs. 5,000). | In `generateItemWiseSalesReport`, proportionally allocate bill-level discount across invoice line items. |
| **REP-07** | **HIGH** | **Territory Sales Report** | [`reports-engine.js:295`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L295) | `totals` calculation reduces bills, net, paid, and balance, but never computes `gross` or `discount`. | On-screen table footer and exports display **Gross: Rs. 0.00** and **Discount: Rs. 0.00** for all territory sales, destroying executive sales reporting. | 1. Open Territory Sales report.<br>2. Look at table footer: Gross Sales and Discount show Rs. 0.00 despite millions in sales. | Add `acc.gross += r.gross; acc.discount += r.discount;` into `totals` reducer in `reports-engine.js:296`. |
| **REP-08** | **HIGH** | **Category Stock Export (Excel & PDF)** | [`reports.js:2215-2224`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2215-L2224) | Export mapper looks for `r.productCount` and `r.stockQty`, but engine returns `r.itemsCount` and `r.totalQty`. | Exported Excel and PDF files print **0 for Unique Items and 0 for Total Stock Units** across every single category. | 1. Open Category Stock report.<br>2. Click Export to Excel or PDF.<br>3. Open exported file: Columns 3 and 4 show 0 for every category. | In `reports.js:2215`, change `r.productCount` to `r.itemsCount` and `r.stockQty` to `r.totalQty`. |
| **REP-09** | **MEDIUM** | **Hub View Quick Stats** | [`reports.js:495,504`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L495) | (1) `updateHubCardStats` evaluates `0 \|\| openingBalance`, reporting paid customers as owing debt.<br>(2) P&L margin card subtracts total warehouse inventory valuation from sales revenue. | Customers who paid in full are reported as debtors on the dashboard card. PnL card displays absurd negative margin percentages (e.g. -600%). | 1. Customer with Rs. 10,000 opening pays in full (currentBalance = 0).<br>2. Open Reports Hub.<br>3. Customer Receivables card still includes Rs. 10,000. | Use `p.currentBalance !== null && p.currentBalance !== undefined ? p.currentBalance : p.openingBalance`. In PnL card, use COGS instead of `stockCostVal`. |
| **REP-10** | **MEDIUM** | **Area Filtering Across Sales & Receivables** | [`reports-engine.js:87,783`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L87) | Uses `if (filters.areaName && s.areaName && !s.areaName...) continue;`. | Sales and customers with null or empty area are not skipped when an area filter is active. Filtering by a city includes all walk-ins and area-less records. | 1. Filter Bill-wise Sales by any territory.<br>2. Invoices with no territory specified appear in the filtered list. | Change condition to `if (filters.areaName && (!s.areaName \|\| !s.areaName.toLowerCase().includes(filters.areaName.toLowerCase()))) continue;`. |
| **REP-11** | **MEDIUM** | **Supplier Payables Report** | [`reports-engine.js:823`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L823) | Uses `payableAmt = Math.abs(bal)`. | If the shop overpaid a supplier (advance payment resulting in a debit balance), it is converted into a positive liability, overstating total supplier debt. | 1. Pay supplier an advance so balance is -Rs. 5,000.<br>2. Open Supplier Payables.<br>3. Supplier appears owing Rs. 5,000 in payables. | Only include suppliers where `bal > 0` (or `bal < 0` depending on sign convention) and do not use `Math.abs`. |
| **REP-12** | **MEDIUM** | **Search Box vs Footers & Export** | [`reports.js:1904,2286`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1904) | Quick search filters the paginated view array, but footers read global `res.totals`, and exports export `res.rows`. | Footer totals do not match search results. Exporting or printing while searching exports the entire database rather than the searched rows. | 1. Search for a specific customer in Bill-wise Sales.<br>2. Table displays 2 rows, but footer displays total of 500 bills.<br>3. Exporting to Excel exports all 500 bills. | When search query is present, recalculate footer totals for `filteredRows` and pass `filteredRows` to print/export. |
| **REP-13** | **LOW** | **Master Data Orphaned IPC** | [`main.js:620`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L620), [`reports.js:561`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L561) | `getReportsMasterData` in `db.js` gathers master data efficiently, but `reports.js` makes 9 separate IPC calls instead. | Unnecessary IPC round-trip overhead and dead maintenance code. | Inspect `loadMasterData` in `reports.js`. | Refactor `loadMasterData` to call `reportsAPI.getReportsMasterData()`. |

---

### 7.2 Report-by-Report Safety Verdict

| Report Name | Total Defects Found | Severity Level | Verdict | Guidance for Shopkeeper |
|---|---|---|---|---|
| **Today's Sales Register** | 1 | Medium | **Use with caution** | Do not rely on territory filter for sales without an area. Otherwise accurate. |
| **Today's Full Day Register** | 2 | High | **Do not trust** | Omits operating expenses and drops vouchers due to date check flaw. |
| **Bill-wise Sales** | 1 | Medium | **Use with caution** | General sales figures are accurate; territory filter has leak for area-less bills. |
| **Customer / Party Sales** | 2 | High | **Do not trust** | Invoice balance due does not reflect subsequent payments. Ignores returns. |
| **Item-wise Sales** | 2 | High | **Use with caution** | Item quantities sold are accurate. Revenues and profits are overstated when special bill discounts are used. |
| **Territory Sales** | 2 | High | **Do not trust** | Gross sales and discount totals display Rs. 0.00 in footer and exports. |
| **Bill-wise Profit & Margins** | 2 | High | **Use with caution** | Invoices without stored purchase price show 100% margin. Sales returns are not subtracted. |
| **Sales Returns & Refunds** | 1 | Low | **Safe to use** | Return refunds and original voucher references are reliable. |
| **Bill-wise Purchases** | 1 | Low | **Safe to use** | Supplier voucher totals and freight expenses are accurate. |
| **Supplier Purchases** | 0 | None | **Safe to use** | Total inward spend and voucher counts per vendor are accurate. |
| **Item Purchases** | 2 | Critical | **Do not trust** | Total inward quantities and average unit costs are completely corrupt due to pack size math omission. |
| **Current Stock Position** | 2 | Medium | **Use with caution** | Quantities match catalog. Includes inactive products; no weighted average cost valuation option. |
| **Low Stock Alerts** | 1 | Low | **Safe to use** | Successfully flags items below minimum threshold. |
| **Out of Stock (Zero)** | 1 | Low | **Safe to use** | Accurate list of zero and negative stock items. |
| **Category Summary** | 1 | High | **Use with caution** | On-screen card works. Excel and PDF exports print 0 for item counts and stock units. |
| **Customer Receivables** | 2 | Medium | **Use with caution** | Positive debtor balances are accurate. Excludes advance-credit customers; territory filter has area-less leak. |
| **Supplier Payables** | 2 | Medium | **Use with caution** | Supplier payables are accurate unless an advance payment was made, which is mistakenly added as a debt. |
| **Cash Receipts (CRV)** | 0 | None | **Safe to use** | Accurate voucher log. |
| **Cash Payments (CPV)** | 0 | None | **Safe to use** | Accurate voucher log. |
| **Daily Cash Flow (Cash Book)** | 2 | High | **Use with caution** | Does not subtract cash refunds on returns. Excel export drops expense and purchase columns. |
| **Profit & Loss Statement** | 3 | Critical | **Do not trust** | Includes unconfirmed estimated kacha bills; does not deduct cost of returned goods; exports cut off expenses and net profit. |
| **Customer / Supplier Ledger** | 0 | None | **Safe to use** | Running debit/credit ledger in Accounts section is mathematically sound. |
| **Day End Cash Closing** | 0 | None | **Safe to use** | Accurate daily cash reconciliation. |

---

## 8. THINGS I COULD NOT VERIFY

1. **Physical Thermal Printer Formatting**: While the print layout (`dom.printArea` and `window.print()`) was verified in code, actual hardware page-breaks on 80mm and 58mm POS thermal receipt printers could not be physically tested.
2. **Historical Inward Invoices without Line Items**: Certain legacy purchase vouchers in older databases had `itemsJson = '[]'`. Whether their line-item inward spend was ever reconstructed outside the voucher total could not be determined.
3. **Supplier CRV Business Intent**: As documented in the Accounts Audit, 18 CRVs exist under suppliers totaling >Rs. 10 Million. Whether the customer intends to migrate these into formal purchase bills or maintain them as supplier vouchers remains pending administrative decision.

