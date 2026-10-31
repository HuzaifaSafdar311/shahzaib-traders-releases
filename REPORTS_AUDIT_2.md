# REPORTS SECTION DEEP AUDIT: PART 4 TO PART 5
**File:** `REPORTS_AUDIT_2.md`  
**Application:** Shahzaib Traders POS & Inventory System  
**Audit Scope:** Filters, Date Handling, Cross-Report Mathematical Consistency, Performance & Integrity  
**Date of Audit:** October 31, 2026  

---

## PART 4: FILTER AND DATE AUDIT

### 4.1 From and To Dates Inclusivity
- **Engine Implementation**: [`reports-engine.js:18-24`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L18-L24):
  ```javascript
  function isDateInRange(dateStr, fromDate, toDate) {
    if (!dateStr) return false;
    const d = String(dateStr).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }
  ```
- **Analysis**:
  - `fromDate` and `toDate` are **inclusive** because only `< fromDate` or `> toDate` return `false`. When `d === fromDate` or `d === toDate`, the condition returns `true`.
  - For single-day filtering (e.g. `fromDate: '2026-10-31', toDate: '2026-10-31'`), all records with `d === '2026-10-31'` are correctly included.

### 4.2 End of Day Handling & Date Format Comparison
- **Date String vs Date Object**:
  - Filtering relies exclusively on standard lexicographical string comparisons (`d < fromDate` and `d > toDate`) of the 10-character ISO format `YYYY-MM-DD`.
  - There is no parsing into JavaScript `new Date()` objects for comparison inside the loop. This avoids timezone drift bugs during traversal, **provided the input date strings are strictly formatted as `YYYY-MM-DD`**.
- **End-of-Day Boundary**:
  - Because `d` is extracted via `.slice(0, 10)`, an invoice created at `2026-10-31 23:59:59` is reduced to `2026-10-31`.
  - When `toDate` is `2026-10-31`, `d > toDate` evaluates to `false`, correctly capturing transactions up to the final millisecond of the day.

### 4.3 UTC vs Pakistan Time Slicing of `createdAt`
- **Defect Location**: [`reports-engine.js:83`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L83), [`reports-engine.js:143`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L143), [`reports-engine.js:922`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L922):
  ```javascript
  const date = (s.entryDate || s.createdAt || '').slice(0, 10);
  ```
- **Analysis**:
  - In `sales`, `purchases`, `accounts_vouchers`, and `expenses`, the `entryDate` column stores local calendar dates formatted as `YYYY-MM-DD` (e.g. `2026-10-31`).
  - However, when `entryDate` is null or corrupted, the code falls back to `s.createdAt.slice(0, 10)`.
  - In Electron/Node.js, `createdAt` is populated via `new Date().toISOString()`, which is stored in **UTC (GMT+0)**.
  - Pakistan Standard Time (PKT) is **UTC+5**. Any transaction entered in Pakistan between 12:00 AM (midnight) and 4:59 AM has a UTC timestamp of the **previous calendar day** (e.g., local `2026-10-31 02:00:00` is stored as UTC `2026-10-30T21:00:00.000Z`).
  - Slicing `createdAt.slice(0, 10)` extracts `2026-10-30`. As a result, early-morning transactions will be assigned to yesterday's reports if `entryDate` is missing.

### 4.4 Empty Filter Behavior
- When `fromDate` is empty (`""`) and `toDate` is empty (`""`), `isDateInRange` returns `true` for all valid `dateStr` entries.
- If `filters.partyId` is empty string or undefined, the party filter check `if (filters.partyId && ...)` safely evaluates to `false` and is skipped, returning all parties.
- If `filters.paymentType` is `'All'`, the condition `if (filters.paymentType && filters.paymentType !== 'All' ...)` safely skips, returning all payment methods.

### 4.5 Party Filter Behavior
- **Bill-wise Sales** ([`reports-engine.js:85`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L85)):
  ```javascript
  if (filters.partyId && s.partyId !== filters.partyId) continue;
  ```
  Matches strictly by `partyId`. Walk-in sales typically have `partyId: ""` or `"walk-in"`. If a registered party is selected, walk-ins are correctly excluded.
- **CRV & CPV Registers** ([`reports-engine.js:853`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L853), [`reports-engine.js:887`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L887)):
  ```javascript
  if (filters.partyId && String(v.partyId) !== String(filters.partyId)) return false;
  ```
  Uses string coercion to match party IDs safely against numeric or UUID strings.

### 4.6 Area Filter Case Sensitivity and Falsy Area Bug
- **Defect Locations**:
  - `generateBillWiseSalesReport`: [`reports-engine.js:87`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L87)
  - `generateCustomerReceivablesReport`: [`reports-engine.js:783`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L783)
- **Verbatim Buggy Code**:
  ```javascript
  if (filters.areaName && s.areaName && !s.areaName.toLowerCase().includes(filters.areaName.toLowerCase())) continue;
  ```
- **Exact Flaw**:
  - The condition requires `s.areaName` to be truthy before checking whether it includes `filters.areaName`.
  - If a sale was made to a Walk-in customer or a customer with **no area specified** (`s.areaName = null` or `""`), `s.areaName && ...` evaluates to `false`.
  - The `continue` statement is skipped, and **the transaction is incorrectly included in the filtered report**!
  - **Reproduction**: Filter Bill-wise Sales by "Rawalpindi". Every invoice that has no territory specified will be displayed on screen and in export alongside Rawalpindi invoices.
  - **Correct Logic**:
    ```javascript
    if (filters.areaName && (!s.areaName || !s.areaName.toLowerCase().includes(filters.areaName.toLowerCase()))) continue;
    ```

### 4.7 Product and Category Filter
- **Implementation**: [`reports-engine.js:45-71`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L45-L71):
  - `matchesCategoryAndSubCategory` tests `pCatId !== filterCat && pCatName !== filterCatLower`.
  - Case-insensitive comparison is correctly implemented for category and subcategory names.
  - Correctly handles both ID-based and name-based selections.

### 4.8 Search Box Behavior
- **Defect Location**: `src/reports/reports.js` lines 1904-1925 & 2286-2375.
- **The Issue**:
  1. The quick search box (`#repTableSearch`) filters only the paginated view array in `renderReportTable`:
     ```javascript
     const filteredRows = q ? allMatchingRows.filter(...) : allMatchingRows;
     ```
  2. The table footer totals (`tf`) are rendered from `res.totals`, which are the totals for the entire unfiltered report:
     ```javascript
     const { th, tb, tf } = buildTableMarkup(res, rows, startIdx);
     ```
     When a cashier types a search query to inspect one customer, the footer displays the million-rupee totals of all customers combined.
  3. Export to Excel and Export to PDF completely bypass `filteredRows` and export all records from `res.rows`. The search box filter is discarded during export.

### 4.9 Behavior When There Is No Data
- If `sales`, `purchases`, or other collections are `null` or `undefined`, all generators guard iterations with `(sales || [])`.
- Returns empty rows array: `{ rows: [], totals: { records: 0, ... } }`.
- In `renderReportTable` ([`reports.js:1936`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1936)):
  Injects a clean colspan message: `"No transactions found matching your filter criteria."`

---

## PART 5: CONSISTENCY AUDIT ACROSS REPORTS

### 5.1 Verification Proof of the 9 Core Financial Relations

#### 1. Sales Register Total = Sales Summary Total = Profit Report Sales
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - In `generateBillWiseSalesReport` ([`reports-engine.js:94,130`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L94)):
    `totals.net = sum(s.netAmount)` across all confirmed sales.
  - In `generateProfitAndLossReport` ([`reports-engine.js:1037`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1037)):
    `netSales = Math.max(0, totalSalesRevenue - totalSalesDiscounts - totalRefunds)`.
    P&L subtracts sales returns (`totalRefunds`), whereas the Sales Register does not subtract returns. Whenever returns exist, **Sales Register Net > P&L Net Sales**.
  - In `generateItemWiseSalesReport` ([`reports-engine.js:223`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L223)):
    `netRevenue` sums `it.netAmount` which ignores invoice-level special discounts (`sales.discount`). Whenever a special bill discount is granted, **Item-wise Sales Net Revenue > Sales Register Net Total**.
  - In `generateProfitAndLossReport` caller ([`reports.js:844`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L844)):
    P&L is passed raw `masterData.sales` containing unconfirmed Estimated (kacha) bills, while the Sales Register is passed `confirmedSales`. Whenever estimated bills exist, **P&L Sales > Sales Register Sales**.

#### 2. Profit Report Cost = Stock Movement Cost
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - The application possesses no stock movement ledger or audit log tracking cost changes per stock transaction.
  - In `generateProfitAndLossReport` ([`reports-engine.js:1001`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1001)):
    COGS is calculated dynamically as `sum(qty * it.purchasePrice)`.
  - In `products` table, inventory valuation uses `p.purchasePrice` or `p.averageCost`. If a product's purchase price was edited or arrived via weighted average, historical sales in P&L continue to read whatever was saved in `sale_items.purchasePrice`.

#### 3. Receivables Report Total = Sum of Customer `currentBalance` = Ledger Closing Balances
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - In `generateCustomerReceivablesReport` ([`reports-engine.js:787`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L787)):
    ```javascript
    const bal = toNum(p.currentBalance !== null && p.currentBalance !== undefined ? p.currentBalance : p.openingBalance);
    if (bal > 0) { totalReceivable += bal; ... }
    ```
    The report explicitly skips all parties where `bal <= 0`. If a customer has an advance credit balance of `-Rs. 1,000`, they are omitted from the report.
    Therefore, the sum of all customer `currentBalance` values in the database (net receivables) **does not match** `totalReceivable` of the report whenever advance credit balances exist.
  - In `getPartyLedger` ([`accounts-db.js:425`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/accounts/accounts-db.js#L425)), the ledger computes a running balance from opening balance and transactions. If transactions occurred before an audit reset or opening balances were adjusted without creating a voucher, the customer's ledger closing balance deviates from `p.currentBalance`.

#### 4. Payables Report Total = Sum of Supplier `currentBalance`
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - In `generateSupplierPayablesReport` ([`reports-engine.js:823`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L823)):
    ```javascript
    const payableAmt = Math.abs(bal);
    totalPayable += payableAmt;
    ```
    If the business overpaid a supplier (advance payment) such that the supplier has a debit balance of `-Rs. 10,000` (supplier owes money to shop), `Math.abs` converts this into positive `+Rs. 10,000` and adds it to total payables.
    Therefore, `totalPayable` **does not match** the algebraic sum of supplier `currentBalance`.

#### 5. Cash Book Total = Day-End Closing Expected Cash
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - In `generateCashBookReport` ([`reports-engine.js:958`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L958)):
    `netCash = totalIn - totalOut` where `totalOut = cpvPaid + cashPurchases + cashExpenses`.
    **Cash refunded to customers on sales returns (`sales_returns.refundMode = 'Cash'`) is never subtracted in Cash Book.**
  - In `getDailyClosingSummary` ([`trade-features-db.js:680,740`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/database/trade-features-db.js#L680)):
    `expectedDrawerCash = openingDrawerCash + totalCashSales + totalCrvReceived - totalCpvPaid - totalExpensesPaid - totalCashRefunds;`
    Day-End Closing explicitly subtracts `totalCashRefunds`.
  - Whenever cash refunds are issued on returned goods, **Cash Book Net Cash > Day-End Drawer Cash** by the amount of cash refunded.

#### 6. CRV and CPV Register Totals = Amounts Used in Cash Book and Profit Report
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - In `generateCRVReport` ([`reports-engine.js:873`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L873)):
    Sums `amount` across **all payment modes** (Cash, Bank, Online, Cheque).
  - In `generateCashBookReport` ([`reports-engine.js:925`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L925)):
    Filters strictly for `mode === 'cash'`. Bank or Cheque receipts are excluded.
  - In `generateProfitAndLossReport` ([`reports-engine.js:1016`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1016)):
    CRVs are not counted at all. CPVs are only included if `v.expenseCategory || remarks.includes('expense')`.
  - The registers show all vouchers, while Cash Book shows cash-only and P&L shows expense-only.

#### 7. Stock Report Quantity = `products.stockQty` = Purchases Minus Sales Plus Returns
- **Result**: **NO (FAILED)**
- **Proof & Discrepancies**:
  - In `generateStockPositionReport` ([`reports-engine.js:569`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L569)):
    The report reads `p.stockQty` directly from the `products` table row.
  - There is no recalculation from transaction history. If an adjustment was made, or if a sale was entered while stock deduction failed, `p.stockQty` deviates from `purchases - sales + returns`.

#### 8. Stock Value Report = Quantity Times the Chosen Price
- **Result**: **YES**
- **Proof**:
  - In `generateStockPositionReport` ([`reports-engine.js:573-575`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L573-L575)):
    `costVal = qty * purPrice;`
    `retVal = qty * retPrice;`
  - The stock value is guaranteed to equal `stockQty * purchasePrice` for cost and `stockQty * retailPrice` for retail.

#### 9. Same Report Opened From Two Places Gives the Same Number
- **Result**: **PARTLY (DISCREPANCY IN TODAY'S SUMMARY)**
- **Proof**:
  - "Today's Sales Register" opened from Category **Today's Report** (`today-register`) and from Category **Sales & Revenue** (`today-register`) both call `generateTodaySalesRegisterReport` passing `confirmedSales`, yielding identical numbers.
  - However, Category **Today's Report** also features "Today's Full Day Register" (`today-summary` -> `generateTodayBusinessSummaryReport`).
    In `generateTodayBusinessSummaryReport` ([`reports-engine.js:1093`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1093)):
    ```javascript
    const vouchers = (masterData.vouchers || []).filter(v => (v.date || v.createdAt || '').slice(0, 10) === todayStr);
    ```
    The voucher table column is `entryDate`. `v.date` is undefined. If `v.createdAt` differs or is missing, vouchers are dropped from `today-summary` while appearing in `cash-book` and `crv-report`.

---

### 5.2 Deep Technical & Environmental Checks

#### 1. SQLite and JSON Fallback Parity
- **Finding**: For reports, `reports.js` fetches data into an in-memory object `masterData`, which is then passed to `reports-engine.js`.
- However, if the application is running in JSON mode:
  - In `tradeFeaturesDb.getDailyClosingSummary` ([`trade-features-db.js:641`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/database/trade-features-db.js#L641)), JSON fallback filters `s.billStatus !== 'Estimated'` and `Number(s.paidAmount) > 0`, matching the SQLite SQL query.
  - In JSON mode, `sale_return_items` has no `purchasePrice`, reproducing the same return COGS omission bug found in SQLite.

#### 2. Duplicate and Unused Report Functions
- `getReportsMasterData` in `src/database/db.js:1681` and its IPC handler in `src/main.js:620` (`get-reports-master-data`) are **completely unused/orphaned**. `src/reports/reports.js` never calls `reportsAPI.getReportsMasterData()`, instead making 9 separate IPC calls inside `loadMasterData()`.
- `generateTodaySalesRegisterReport` ([`reports-engine.js:1078`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1078)) is a thin wrapper that overrides `fromDate` and `toDate` to today and calls `generateBillWiseSalesReport`.

#### 3. Hardcoded Values
- In `src/reports/reports.js` lines 2005-2006 (`handlePrintReport`):
  Company fallback info is hardcoded:
  ```javascript
  const comp = state.masterData.companyInfo || { name: 'Shahzaib Traders', phone: '0300-1234567', address: 'Wah Cantt' };
  ```
- In `src/reports/reports.js` line 1475:
  Pack size falls back to hardcoded `1` if undefined.
- In `src/reports/reports.js` line 1520:
  Low stock reorder level falls back to hardcoded `10`.

#### 4. NaN or Undefined Shown on Screen
- In `generateTerritoryWiseSalesReport` ([`reports-engine.js:295-300`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L295-L300)):
  `totals.gross` and `totals.discount` are omitted. In `reports.js` line 1256, it uses `formatMoney(t.gross || 0)` to prevent displaying `NaN` or `undefined`, but this forces the table footer to display **Rs. 0.00** for all territory sales.
- In `generateItemWisePurchaseReport` ([`reports-engine.js:547`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L547)):
  If `totalQtyInward` is 0, `avgCost` is guarded with `r.totalQtyInward > 0 ? ... : 0`, successfully preventing division by zero.

#### 5. Pagination and Slicing Data Loss
- In `renderReportTable` ([`reports.js:1924`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1924)):
  Pagination uses `rows = filteredRows.slice(startIdx, endIdx)`.
  Table rows on screen are restricted to the selected page size (`20`, `50`, `100`).
  Table footers read `res.totals`, correctly preserving global totals across all pages.
  However, as documented in Part 4, using `#repTableSearch` does not update `res.totals`, causing the footer to display global totals rather than search-filtered totals.

#### 6. Large Data Memory and UI Thread Performance
- `loadMasterData` loads every sale, purchase, voucher, expense, return, product, and party into renderer memory.
- In `generateItemWiseSalesReport` ([`reports-engine.js:198`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L198)):
  ```javascript
  for (const it of items) {
    const prod = (products || []).find(p => (code && String(p.code) === code) || ...);
  }
  ```
  This is an **$O(N \times M)$ unindexed nested loop** on the main Electron browser thread. For a shop with 10,000 products and 20,000 sales invoices containing 100,000 line items, running the Item-wise Sales Report executes up to **$1,000,000,000$ (1 billion) loop iterations**, causing the application window to freeze ("Not Responding") for several seconds.

