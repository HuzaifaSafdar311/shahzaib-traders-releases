# REPORTS SECTION DEEP AUDIT: PART 1 TO PART 3
**File:** `REPORTS_AUDIT_1.md`  
**Application:** Shahzaib Traders POS & Inventory System  
**Audit Scope:** `src/reports/*` (`reports-engine.js`, `reports.js`, `reports.css`), `getReportsMasterData` in `src/database/db.js`, `src/export/exporter.js`, related IPC handlers in `src/main.js` and `src/preload.js`.  
**Date of Audit:** October 31, 2026  
**Auditor Mode:** Read-Only Code Verification & Live Test Run  

---

## PART 1: INVENTORY OF REPORTS & SYSTEM FUNCTIONS

### 1.1 Complete Reports Inventory Table

The system defines 6 primary category cards on the Hub screen (`#repHubCardsGrid`) that route into 21 sub-report statements in `src/reports/reports.js` and `src/reports/reports-engine.js`. Additionally, 2 reports exist in other application modules (`Party History / Customer Ledger` in `src/accounts/accounts.js` and `Day End Cash Closing` in `src/features/trade-features.js`).

| # | Report Name | Generator Function (File:Line) | Trigger Screen Button / Tab | Data Received from MasterData | Supported Filters | What It Should Show | What It Really Shows | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | **Today's Sales Register** | `generateTodaySalesRegisterReport`<br>[`reports-engine.js:1078`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1078) | Category: **Today's Report**<br>Pill: `today-register` | `confirmedSales` (filtered `sales` where `billStatus != 'Estimated'`) | `fromDate`, `toDate` (overridden to today), `partyId`, `areaName`, `paymentType` | Itemized cashier log of today's confirmed counter sales | Itemized sales for today. However, area filtering is broken for sales without an area. | **Partly wrong** |
| 2 | **Today's Full Day Register** | `generateTodayBusinessSummaryReport`<br>[`reports-engine.js:1088`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1088) | Category: **Today's Report**<br>Pill: `today-summary` | `masterData` (`sales`, `purchases`, `returns`, `vouchers`) | `toDate`, `fromDate` (overridden to today) | Multi-module chronological timeline of today's sales, purchases, returns, CRVs, CPVs, and expenses with net cash | Timeline of sales, returns, purchases, and vouchers. **Completely omits daily operating expenses**, voucher date filter checks non-existent `v.date`, and purchases ignore purchase returns. | **Broken** |
| 3 | **Bill-wise Sales** | `generateBillWiseSalesReport`<br>[`reports-engine.js:73`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L73) | Category: **Sales & Revenue**<br>Pill: `bill-wise-sales` | `confirmedSales` | `fromDate`, `toDate`, `partyId`, `areaName`, `paymentType` | Invoices listed by bill number with gross, bill discount, net, paid, and balance due | Displays confirmed invoices. Area filter bug includes invoices with null/empty area. | **Partly wrong** |
| 4 | **Customer / Party Sales** | `generatePartyWiseSalesReport`<br>[`reports-engine.js:139`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L139) | Category: **Sales & Revenue**<br>Pill: `party-wise-sales` | `confirmedSales`, `parties` | `fromDate`, `toDate`, `partyId`, `paymentType` | Aggregated sales volume, invoice count, discounts, and payments per customer | Aggregated customer sales volume. Ignores sales returns. Omits area filter despite displaying area column. | **Partly wrong** |
| 5 | **Item-wise Sales** | `generateItemWiseSalesReport`<br>[`reports-engine.js:189`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L189) | Category: **Sales & Revenue**<br>Pill: `item-wise-sales` | `confirmedSales`, `products` | `fromDate`, `toDate`, `partyId`, `categoryId`, `subCategoryId` | Quantity sold, sales revenue, purchase cost, and gross profit per item | Quantities and revenues. **Ignores invoice-level special discounts**, inflating net revenue and profit. Does not subtract sales returns. | **Partly wrong** |
| 6 | **Territory Sales** | `generateTerritoryWiseSalesReport`<br>[`reports-engine.js:264`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L264) | Category: **Sales & Revenue**<br>Pill: `territory-wise-sales` | `confirmedSales`, `parties`, `areas` | `fromDate`, `toDate` | Sales revenue, bill count, and cash collections grouped by territory/area | Groups by territory. **Totals footer displays Gross: Rs. 0.00 and Discount: Rs. 0.00** because generator never calculates them in `totals`. | **Broken** |
| 7 | **Bill-wise Profit & Margins** | `generateBillWiseProfitReport`<br>[`reports-engine.js:305`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L305) | Category: **Sales & Revenue**<br>Pill: `bill-wise-profit` | `confirmedSales` | `fromDate`, `toDate`, `partyId` | Net sales revenue, actual line-item cost of goods, gross profit, and margin % per invoice | Calculates profit per invoice. If `it.purchasePrice` is 0 or missing on old records, cost defaults to 0 and profit shows 100%. Does not subtract returns. | **Partly wrong** |
| 8 | **Sales Returns & Refunds** | `generateSalesReturnReport`<br>[`reports-engine.js:361`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L361) | Category: **Sales & Revenue**<br>Pill: `sales-returns` | `returns` | `fromDate`, `toDate`, `partyId` | Log of returned merchandise, original invoice references, refund mode, and refunded amounts | Displays sales returns. `itemsCount` falls back to 1 if `items` is empty, causing inaccurate total pieces. | **Working** |
| 9 | **Bill-wise Purchases** | `generateBillWisePurchaseReport`<br>[`reports-engine.js:412`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L412) | Category: **Purchases & Suppliers**<br>Pill: `bill-wise-purchases` | `purchases` | `fromDate`, `toDate`, `partyId` | Supplier inward purchase vouchers with freight, discount, and grand total | Inward purchase vouchers. Table footer has no gross column; discount logic reads `freightDisc` if `discount` is 0. | **Working** |
| 10 | **Supplier Purchases** | `generateSupplierWisePurchaseReport`<br>[`reports-engine.js:457`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L457) | Category: **Purchases & Suppliers**<br>Pill: `supplier-wise-purchases` | `purchases`, `parties` | `fromDate`, `toDate`, `partyId` | Total purchase volume and voucher count per supplier | Total inward purchases per vendor. Correctly uses live balance fallback. | **Working** |
| 11 | **Item Purchases** | `generateItemWisePurchaseReport`<br>[`reports-engine.js:495`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L495) | Category: **Purchases & Suppliers**<br>Pill: `item-wise-purchases` | `purchases`, `products` | `fromDate`, `toDate`, `partyId`, `categoryId`, `subCategoryId` | Total units purchased, bonus units, total inward spend, and average unit cost | Itemized inward purchases. **Critical Math Error**: Adds `packQty + unitQty + bonus` directly without multiplying `packQty * packSize`. | **Broken** |
| 12 | **Current Stock Position** | `generateStockPositionReport`<br>[`reports-engine.js:556`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L556) | Category: **Stock & Inventory**<br>Pill: `stock-position` | `products`, `categories` | `categoryId`, `subCategoryId` | On-hand quantity, purchase rate, retail rate, stock cost value, and potential gross profit | Current product stock. Includes inactive products (`inActive = 1`). Does not calculate valuation at `averageCost`. | **Partly wrong** |
| 13 | **Low Stock Alerts** | `generateLowStockReport`<br>[`reports-engine.js:620`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L620) | Category: **Stock & Inventory**<br>Pill: `low-stock` | `products`, `categories` | `categoryId`, `subCategoryId` | Products at or below reorder level with shortage units and estimated replenishment cost | Lists products with stock <= minStock. Includes inactive products. | **Working** |
| 14 | **Out of Stock (Zero)** | `generateOutOfStockReport`<br>[`reports-engine.js:668`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L668) | Category: **Stock & Inventory**<br>Pill: `zero-stock` | `products`, `categories` | `categoryId`, `subCategoryId` | Products with 0 or negative on-hand quantity | Lists products with stockQty <= 0. Includes inactive/discontinued products. | **Working** |
| 15 | **Category Summary** | `generateCategoryStockReport`<br>[`reports-engine.js:703`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L703) | Category: **Stock & Inventory**<br>Pill: `category-stock` | `products`, `categories` | `categoryId`, `subCategoryId` | Total unique items, total units, cost valuation, retail valuation, and gross margin by category | On-screen table works. **Excel & PDF export prints 0 for Unique Items and 0 for Total Stock Units** due to field name mismatch (`r.productCount` vs `r.itemsCount`). | **Partly wrong** |
| 16 | **Customer Receivables** | `generateCustomerReceivablesReport`<br>[`reports-engine.js:775`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L775) | Category: **Accounts & Finance**<br>Pill: `customer-receivables` | `parties` | `partyId`, `areaName` | Active customer balances with positive debt (shopkeeper is owed money) | Displays customer receivables. Excludes advance-credit customers (`bal < 0`). Area filter bug includes customers without an area. | **Partly wrong** |
| 17 | **Supplier Payables** | `generateSupplierPayablesReport`<br>[`reports-engine.js:812`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L812) | Category: **Accounts & Finance**<br>Pill: `supplier-payables` | `parties` | `partyId` | Active supplier balances owed by the business | Uses `Math.abs(bal)`. If a supplier was overpaid (advance debit balance), `Math.abs` converts it into a payable liability. Area filter is unsupported. | **Partly wrong** |
| 18 | **Cash Receipts (CRV)** | `generateCRVReport`<br>[`reports-engine.js:847`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L847) | Category: **Accounts & Finance**<br>Pill: `crv-report` | `vouchers` | `fromDate`, `toDate`, `partyId` | Cash receipt register showing amount received, settlement discount, and total credit | All CRVs. Shows total credit (`amount + discount`). Does not distinguish Cash vs Bank/Cheque in totals. | **Working** |
| 19 | **Cash Payments (CPV)** | `generateCPVReport`<br>[`reports-engine.js:881`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L881) | Category: **Accounts & Finance**<br>Pill: `cpv-report` | `vouchers` | `fromDate`, `toDate`, `partyId` | Cash payment register showing amount paid, settlement discount received, and total debit | All CPVs. Does not distinguish Cash vs Bank/Cheque in totals. | **Working** |
| 20 | **Daily Cash Flow (Cash Book)** | `generateCashBookReport`<br>[`reports-engine.js:915`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L915) | Category: **Accounts & Finance**<br>Pill: `cash-book` | `vouchers`, `sales`, `purchases`, `expenses` | `fromDate`, `toDate`, `expenses` | Daily reconciliation of cash sales, CRVs, cash purchases, daily expenses, and cash refunds | Daily cash flow. **Fails to subtract cash refunded on sales returns**, causing Cash Book to report higher net cash than actual cash drawer. Excel export drops expense and purchase columns. | **Partly wrong** |
| 21 | **Profit & Loss Statement** | `generateProfitAndLossReport`<br>[`reports-engine.js:985`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L985) | Category: **Profit & Loss**<br>Card: `pnl` | `sales`, `purchases`, `vouchers`, `returns`, `expenses` | `fromDate`, `toDate`, `expenses` | Complete trading & operating statement: Gross Sales, Discounts, Returns, COGS, Gross Profit, Operating Expenses, Net Profit | **Critical Flaws**: (1) Counts unconfirmed Estimated (kacha) bills because `reports.js:844` passes raw `masterData.sales`. (2) Return items have no `purchasePrice`, so returns COGS is never deducted. (3) Excel/PDF export completely cuts off Operating Expenses and Net Profit. | **Broken** |
| 22 | **Customer / Supplier Ledger Statement** | `getPartyLedger`<br>[`accounts-db.js:425`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/accounts/accounts-db.js#L425) | Navigation: **Accounts** -> Tab: `F1 Party History / Ledger` | Raw SQLite queries on `parties`, `sales`, `purchases`, `sales_returns`, `accounts_vouchers` | `partyId`, `fromDate`, `toDate` | Full running debit/credit ledger with opening balance, transaction description, and running balance | Running ledger statement. Computes dynamically. If opening balance or vouchers are inconsistent, running balance deviates from `parties.currentBalance`. | **Working** |
| 23 | **Day End Cash Closing Report** | `getDailyClosingSummary`<br>[`trade-features-db.js:639`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/database/trade-features-db.js#L639) | Navigation: **Day End Closing Modal** | Raw SQLite queries on `sales`, `accounts_vouchers`, `expenses`, `sales_returns`, `day_end_closings` | `dateStr` | Opening drawer cash, counter cash sales (including down-payments), CRV receipts, CPV payments, expenses, cash refunds, and expected drawer balance | Correctly reflects drawer cash. Reconciled with Fix 3. | **Working** |

---

### 1.2 Table of Formatting, Grouping, Sorting, Printing, and Exporting Functions in `src/reports/reports.js`

| Function Name | File:Line | Scope / Purpose | What It Really Does |
|---|---|---|---|
| `showToast` | [`reports.js:90`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L90) | UI Toast Alerts | Displays 3.5s floating toast notifications for export warnings or errors. |
| `renderReportsTemplate` | [`reports.js:146`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L146) | HTML DOM Injection | Injects Hub View cards, Detail View topbar, filter dropdowns, table skeleton, and print area into `#reportsView`. |
| `cacheDom` | [`reports.js:397`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L397) | DOM Element Caching | Queries and caches references to inputs, dropdowns, tables, and buttons in `dom`. |
| `updateHubCardStats` | [`reports.js:455`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L455) | Hub Cards Live Badge Metrics | Computes quick stats on the 6 Hub cards. **Contains severe formula errors**: (1) calculates PnL margin by subtracting warehouse stock valuation from sales revenue; (2) checks non-existent `p.partyType` and falls back to `openingBalance` if `currentBalance = 0`. |
| `applyDatePreset` | [`reports.js:514`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L514) | Date Presets Formatting | Calculates `fromDate` and `toDate` for presets: `today`, `yesterday`, `this-week`, `this-month`, `last-month`, `this-year`, `all`. |
| `loadMasterData` | [`reports.js:561`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L561) | Data Fetching & Hydration | Fetches data via `electronAPI`, `generalInfoAPI`, `tradeFeaturesAPI`, `accountsAPI`. Never calls `reportsAPI.getReportsMasterData`. If sales array is empty, does not clear stale data. |
| `populateFilterDropdowns` | [`reports.js:663`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L663) | Filter UI Population | Fills party, category, subcategory, area dropdowns with HTML options. |
| `populateSubCategories` | [`reports.js:695`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L695) | Dependent Dropdown Population | Cascades subcategories based on selected category. |
| `renderSubPills` | [`reports.js:714`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L714) | Sub-Report Pill Navigation | Renders horizontal pill buttons for sub-reports in active category. |
| `showCardsHubView` | [`reports.js:732`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L732) | Screen Navigation | Shows Screen 1 (`#repHubView`) and hides Screen 2 (`#repDetailView`). |
| `openCategoryReport` | [`reports.js:739`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L739) | Screen Navigation | Hides Hub View, shows Detail View, activates category, and triggers active report. |
| `switchCategory` | [`reports.js:746`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L746) | Category Switching | Updates header title, icon, sub-pills, and loads the first sub-report in the category. |
| `generateActiveReport` | [`reports.js:788`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L788) | Report Orchestration | Reads input filters, executes the appropriate `ReportsEngine` generator, updates titles, and calls renderers. Passes raw `sales` with estimated bills to P&L and Cash Book. |
| `renderKpiCards` | [`reports.js:870`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L870) | KPI Summary Cards UI | Renders 3-4 top highlight metric cards (e.g. Total Revenue, Total Bills, Avg Bill Size) above the grid. |
| `buildTableMarkup` | [`reports.js:1050`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1050) | Table HTML Renderer | Generates `th` (headers), `tb` (rows), `tf` (footer totals) for each of the 21 reports. Uses `t = res.totals` for footers. Displays Rs. 0.00 for territory gross/discount. |
| `renderPaginationControls` | [`reports.js:1859`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1859) | Pagination UI | Renders Prev, Next, page count, and page size dropdown (`20`, `50`, `100`, `all`). |
| `generateFullTableHtml` | [`reports.js:1882`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1882) | Print Table Generator | Calls `buildTableMarkup` passing all rows (`res.rows`) to render unpaginated table HTML for printing. |
| `renderReportTable` | [`reports.js:1896`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1896) | Table Lifecycle Controller | Applies table search filter, computes pagination slice, and injects HTML into `#repTableHead`, `#repTableBody`, `#repTableFoot`. |
| `renderProfitAndLossView` | [`reports.js:1943`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1943) | P&L Dedicated Card UI | Renders visual financial cards for Gross Sales, COGS, Gross Profit, Operating Expenses breakdown, and Net Profit. |
| `handleTableSearch` | [`reports.js:1991`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1991) | Quick Search Event | Resets pagination to page 1 and calls `renderReportTable`. Does not update footer totals. |
| `handlePrintReport` | [`reports.js:1999`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L1999) | Direct Browser Printing | Builds print layout with company header, verification signature lines, and calls `window.print()`. Ignores active table search filter. |
| `getReportExportData` | [`reports.js:2042`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2042) | Export Data Mapper | Maps generator result into structured arrays `[headers, exportedRows, totalsRow]` for Excel and PDF. Drops P&L operating expenses and net profit; prints 0 for category stock units/items; drops cash book purchase/expense columns. |
| `handleExportExcel` | [`reports.js:2286`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2286) | Excel (.xlsx) Exporter | Invokes `electronAPI.exportExcel` with branded workbook options. Ignores active table search query. |
| `handleExportPdf` | [`reports.js:2370`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2370) | PDF Exporter | Invokes `electronAPI.exportPDF` with landscape/portrait layout and company header. Ignores active table search query. |
| `bindEvents` | [`reports.js:2430`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2430) | Event Listeners | Attaches event handlers to card clicks, pill clicks, filter inputs (`change`), search (`input`), print, export, and pagination buttons. |
| `init` | [`reports.js:2622`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports.js#L2622) | Bootstrap Initialization | Injects template, caches DOM, binds events, sets date preset to `this-month`, loads master data, and displays Screen 1 (Cards Hub). |

---

### 1.3 Complete Inventory of IPC Channels Used by Reports

| IPC Channel Name | Direction | Preload Bridge Method | Main.js Handler (File:Line) | Database / Engine Function Invoked |
|---|---|---|---|---|
| `get-reports-master-data` | Renderer -> Main | `window.reportsAPI.getReportsMasterData()` | [`main.js:620`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L620) | `db.getReportsMasterData()` in `src/database/db.js:1681` (Gathers sales, purchases, products, returns, expenses, vouchers, parties, categories). **Currently orphaned**: `reports.js` never calls this bridge. |
| `get-sales` | Renderer -> Main | `window.electronAPI.getSales()` | [`main.js:338`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L338) | `db.getAllSales()` |
| `get-purchases` | Renderer -> Main | `window.electronAPI.getPurchases()` | [`main.js:342`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L342) | `db.getAllPurchases()` |
| `get-products` | Renderer -> Main | `window.electronAPI.getProducts()` | [`main.js:346`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L346) | `db.getAllProducts()` |
| `get-sale-returns` | Renderer -> Main | `window.electronAPI.getSaleReturns()` | [`main.js:350`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L350) | `db.getAllSaleReturns()` |
| `get-product-categories` | Renderer -> Main | `window.electronAPI.getProductCategories()` | [`main.js:354`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L354) | `db.getAllProductCategories()` |
| `get-product-sub-categories` | Renderer -> Main | `window.electronAPI.getProductSubCategories()` | [`main.js:358`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L358) | `db.getSubCategoriesByCategory()` |
| `get-general-info` | Renderer -> Main | `window.generalInfoAPI.getGeneralInfo()` | [`main.js:410`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L410) | Fetches parties, areas, provinces, and company info from `general-info-db.js`. |
| `get-expenses` | Renderer -> Main | `window.tradeFeaturesAPI.getExpenses()` | [`main.js:462`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L462) | `tradeFeaturesDb.getAllExpenses()` |
| `get-all-vouchers` | Renderer -> Main | `window.accountsAPI.getAllVouchers()` | [`main.js:435`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L435) | `accountsDb.getAllVouchers()` |
| `export-excel` | Renderer -> Main | `window.electronAPI.exportExcel(data)` | [`main.js:631`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L631) | `exporter.exportExcel(data, mainWindow)` in `src/export/exporter.js:65` |
| `export-pdf` | Renderer -> Main | `window.electronAPI.exportPDF(data)` | [`main.js:627`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L627) | `exporter.exportPDF(data, mainWindow)` in `src/export/exporter.js:210` |
| `get-party-ledger` | Renderer -> Main | `window.accountsAPI.getPartyLedger(partyId, fromDate, toDate)` | [`main.js:440`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/main.js#L440) | `accountsDb.getPartyLedger(partyId, fromDate, toDate)` in `src/accounts/accounts-db.js:425` |

---

## PART 2: VERBATIM CODE

### 2.1 Master Data Fetcher (`src/database/db.js:1681-1699`)

```javascript
// src/database/db.js lines 1681-1699
function getReportsMasterData() {
  return {
    sales: getAllSales(),
    purchases: getAllPurchases(),
    products: getAllProducts(),
    returns: getAllSaleReturns(),
    expenses: tradeFeaturesDb && tradeFeaturesDb.getAllExpenses ? tradeFeaturesDb.getAllExpenses() : [],
    categories: getAllProductCategories(),
    subCategories: getSubCategoriesByCategory(),
    units: getAllUnits(),
    productTypes: getAllProductTypes(),
    parties: generalInfoDb.getParties ? generalInfoDb.getParties() : [],
    partyTypes: generalInfoDb.getPartyTypes ? generalInfoDb.getPartyTypes() : [],
    areas: generalInfoDb.getAreas ? generalInfoDb.getAreas() : [],
    provinces: generalInfoDb.getProvinces ? generalInfoDb.getProvinces() : [],
    companyInfo: generalInfoDb.getCompanyInfo ? generalInfoDb.getCompanyInfo() : null,
    vouchers: accountsDb.getAllVouchers ? accountsDb.getAllVouchers() : []
  };
}
```

---

### 2.2 Filter and Date Helpers (`src/reports/reports-engine.js:17-71`)

```javascript
// src/reports/reports-engine.js lines 17-71
  // Helper: Date in range check (YYYY-MM-DD)
  function isDateInRange(dateStr, fromDate, toDate) {
    if (!dateStr) return false;
    const d = String(dateStr).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }

  // Helper: Safe JSON parse for line items
  function getItems(record) {
    if (Array.isArray(record.items)) return record.items;
    if (typeof record.itemsJson === 'string') {
      try {
        return JSON.parse(record.itemsJson) || [];
      } catch (_e) {
        return [];
      }
    }
    return [];
  }

  // Helper: Number formatter
  function toNum(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  // Helper: Match product with category & subcategory filters
  function matchesCategoryAndSubCategory(prod, categoryId, subCategoryId) {
    if (!prod) return false;
    if (categoryId && categoryId !== 'all' && categoryId !== '') {
      const pCatId = String(prod.categoryId || prod.category_id || '').trim();
      const pCatName = String(prod.categoryName || prod.category_name || '').trim().toLowerCase();
      const filterCat = String(categoryId).trim();
      const filterCatLower = filterCat.toLowerCase();
      if (pCatId !== filterCat && pCatName !== filterCatLower) {
        return false;
      }
    }
    if (subCategoryId && subCategoryId !== 'all' && subCategoryId !== '') {
      const pSubCatId = String(prod.subCategoryId || prod.sub_category_id || '').trim();
      const pSubCatName = String(prod.subCategoryName || prod.sub_category_name || '').trim().toLowerCase();
      const filterSub = String(subCategoryId).trim();
      const filterSubLower = filterSub.toLowerCase();
      if (pSubCatId !== filterSub && pSubCatName !== filterSubLower) {
        return false;
      }
    }
    return true;
  }
```

---

### 2.3 Sales Reports Generators (`src/reports/reports-engine.js:73-304`)

#### 2.3.1 Bill-wise Sales Report (`reports-engine.js:73-137`)
```javascript
// src/reports/reports-engine.js lines 73-137
  function generateBillWiseSalesReport(sales, filters = {}) {
    const list = [];
    let totalGross = 0;
    let totalDiscount = 0;
    let totalNet = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalItemsCount = 0;

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;
      if (filters.paymentType && filters.paymentType !== 'All' && s.paymentType !== filters.paymentType) continue;
      if (filters.areaName && s.areaName && !s.areaName.toLowerCase().includes(filters.areaName.toLowerCase())) continue;

      const items = getItems(s);
      let itemCount = items.reduce((sum, it) => sum + toNum(it.totalQty || it.packQty || 1), 0);

      const gross = toNum(s.grossAmount);
      const disc = toNum(s.discount);
      const net = toNum(s.netAmount);
      const paid = toNum(s.paidAmount);
      const bal = toNum(s.balanceDue);

      totalGross += gross;
      totalDiscount += disc;
      totalNet += net;
      totalPaid += paid;
      totalBalance += bal;
      totalItemsCount += itemCount;

      list.push({
        id: s.id,
        date,
        voucherNo: s.voucherNo,
        manualNo: s.manualNo || '--',
        partyTitle: s.partyTitle || 'Walk-in Customer',
        phone: s.customerPhone || '--',
        areaName: s.areaName || '--',
        paymentType: s.paymentType || 'Cash',
        itemCount,
        gross,
        discount: disc,
        net,
        paid,
        balance: bal
      });
    }

    return {
      title: 'Bill-wise Sale Report',
      rows: list,
      totals: {
        records: list.length,
        itemsCount: totalItemsCount,
        gross: totalGross,
        discount: totalDiscount,
        net: totalNet,
        paid: totalPaid,
        balance: totalBalance
      }
    };
  }
```

#### 2.3.2 Party-wise Sales Report (`reports-engine.js:139-187`)
```javascript
// src/reports/reports-engine.js lines 139-187
  function generatePartyWiseSalesReport(sales, parties, filters = {}) {
    const partyMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;
      if (filters.paymentType && filters.paymentType !== 'All' && s.paymentType !== filters.paymentType) continue;

      const pId = s.partyId || 'walk-in';
      if (!partyMap[pId]) {
        const partyObj = (parties || []).find(p => p.id === pId) || {};
        partyMap[pId] = {
          partyId: pId,
          partyTitle: s.partyTitle || partyObj.name || 'Walk-in Customer',
          partyType: partyObj.partyTypeName || 'Customer',
          phone: s.customerPhone || partyObj.phone || '--',
          areaName: s.areaName || partyObj.areaName || partyObj.city || '--',
          billsCount: 0,
          gross: 0,
          discount: 0,
          net: 0,
          paid: 0,
          balance: 0
        };
      }

      partyMap[pId].billsCount += 1;
      partyMap[pId].gross += toNum(s.grossAmount);
      partyMap[pId].discount += toNum(s.discount);
      partyMap[pId].net += toNum(s.netAmount);
      partyMap[pId].paid += toNum(s.paidAmount);
      partyMap[pId].balance += toNum(s.balanceDue);
    }

    const rows = Object.values(partyMap).sort((a, b) => b.net - a.net);
    const totals = rows.reduce((acc, r) => {
      acc.billsCount += r.billsCount;
      acc.gross += r.gross;
      acc.discount += r.discount;
      acc.net += r.net;
      acc.paid += r.paid;
      acc.balance += r.balance;
      return acc;
    }, { records: rows.length, billsCount: 0, gross: 0, discount: 0, net: 0, paid: 0, balance: 0 });

    return { title: 'Party-wise Sale Report', rows, totals };
  }
```

#### 2.3.3 Item-wise Sales Report (`reports-engine.js:189-262`)
```javascript
// src/reports/reports-engine.js lines 189-262
  function generateItemWiseSalesReport(sales, products, filters = {}) {
    const itemMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;

      const items = getItems(s);
      for (const it of items) {
        const code = String(it.productCode || it.code || '').trim();
        const prod = (products || []).find(p => (code && String(p.code) === code) || (it.productId && String(p.id) === String(it.productId))) || {};

        if (!matchesCategoryAndSubCategory(prod, filters.categoryId, filters.subCategoryId)) continue;

        const key = code || it.productId || it.productTitle || 'item-unknown';
        if (!itemMap[key]) {
          itemMap[key] = {
            productCode: code || prod.code || '--',
            productTitle: it.productTitle || prod.titleEng || 'Unknown Product',
            categoryName: prod.categoryName || 'General',
            packSize: toNum(it.packSize || prod.packSize || 1),
            packQtySold: 0,
            unitQtySold: 0,
            totalQtySold: 0,
            purchaseCostTotal: 0,
            salesRevenueTotal: 0,
            discountTotal: 0,
            netRevenue: 0,
            totalProfit: 0
          };
        }

        const packQty = toNum(it.packQty);
        const unitQty = toNum(it.unitQty);
        const packSize = toNum(it.packSize || itemMap[key].packSize || 1);
        const totalQty = toNum(it.totalQty || (packQty * packSize + unitQty));
        const purchaseRate = toNum(it.purchasePrice || prod.purchasePrice || 0);
        const salePrice = toNum(it.salePrice || it.retailPrice || 0);
        const discAmount = toNum(it.discountAmount || 0);
        const netAmt = toNum(it.netAmount || (totalQty * salePrice - discAmount));
        const costAmt = totalQty * purchaseRate;
        const profit = netAmt - costAmt;

        itemMap[key].packQtySold += packQty;
        itemMap[key].unitQtySold += unitQty;
        itemMap[key].totalQtySold += totalQty;
        itemMap[key].purchaseCostTotal += costAmt;
        itemMap[key].salesRevenueTotal += (totalQty * salePrice);
        itemMap[key].discountTotal += discAmount;
        itemMap[key].netRevenue += netAmt;
        itemMap[key].totalProfit += profit;
      }
    }

    const rows = Object.values(itemMap).map(r => ({
      ...r,
      avgPrice: r.totalQtySold > 0 ? (r.netRevenue / r.totalQtySold) : 0,
      marginPercent: r.netRevenue > 0 ? ((r.totalProfit / r.netRevenue) * 100) : 0
    })).sort((a, b) => b.netRevenue - a.netRevenue);

    const totals = rows.reduce((acc, r) => {
      acc.totalQtySold += r.totalQtySold;
      acc.purchaseCostTotal += r.purchaseCostTotal;
      acc.netRevenue += r.netRevenue;
      acc.totalProfit += r.totalProfit;
      return acc;
    }, { records: rows.length, totalQtySold: 0, purchaseCostTotal: 0, netRevenue: 0, totalProfit: 0 });

    totals.overallMargin = totals.netRevenue > 0 ? ((totals.totalProfit / totals.netRevenue) * 100) : 0;

    return { title: 'Product-wise Sale Report', rows, totals };
  }
```

#### 2.3.4 Territory-wise Sales Report (`reports-engine.js:264-303`)
```javascript
// src/reports/reports-engine.js lines 264-303
  function generateTerritoryWiseSalesReport(sales, parties, areas, filters = {}) {
    const areaMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;

      const areaKey = String(s.areaName || 'Unspecified Territory').trim();
      if (!areaMap[areaKey]) {
        areaMap[areaKey] = {
          areaName: areaKey,
          billsCount: 0,
          gross: 0,
          discount: 0,
          net: 0,
          paid: 0,
          balance: 0
        };
      }

      areaMap[areaKey].billsCount += 1;
      areaMap[areaKey].gross += toNum(s.grossAmount);
      areaMap[areaKey].discount += toNum(s.discount);
      areaMap[areaKey].net += toNum(s.netAmount);
      areaMap[areaKey].paid += toNum(s.paidAmount);
      areaMap[areaKey].balance += toNum(s.balanceDue);
    }

    const rows = Object.values(areaMap).sort((a, b) => b.net - a.net);
    const totals = rows.reduce((acc, r) => {
      acc.billsCount += r.billsCount;
      acc.net += r.net;
      acc.paid += r.paid;
      acc.balance += r.balance;
      return acc;
    }, { records: rows.length, billsCount: 0, net: 0, paid: 0, balance: 0 });

    return { title: 'Territory / Area-wise Sale Report', rows, totals };
  }
```

---

### 2.4 Profit & Loss and Financial Generators

#### 2.4.1 Bill-wise Profit Report (`reports-engine.js:305-359`)
```javascript
// src/reports/reports-engine.js lines 305-359
  function generateBillWiseProfitReport(sales, filters = {}) {
    const list = [];
    let grandRevenue = 0;
    let grandCost = 0;
    let grandProfit = 0;

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;

      const items = getItems(s);
      let billCost = 0;

      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        const costRate = toNum(it.purchasePrice);
        billCost += (qty * costRate);
      }

      const billNet = toNum(s.netAmount);
      const profit = billNet - billCost;
      const margin = billNet > 0 ? ((profit / billNet) * 100) : 0;

      grandRevenue += billNet;
      grandCost += billCost;
      grandProfit += profit;

      list.push({
        id: s.id,
        date,
        voucherNo: s.voucherNo,
        partyTitle: s.partyTitle || 'Walk-in Customer',
        areaName: s.areaName || '--',
        itemCount: items.length,
        billNet,
        billCost,
        profit,
        margin
      });
    }

    list.sort((a, b) => b.profit - a.profit);

    const totals = {
      records: list.length,
      revenue: grandRevenue,
      cost: grandCost,
      profit: grandProfit,
      margin: grandRevenue > 0 ? ((grandProfit / grandRevenue) * 100) : 0
    };

    return { title: 'Bill-wise Profit Report', rows, totals };
  }
```

#### 2.4.2 Daily Cash Book Report (`reports-engine.js:915-983`)
```javascript
// src/reports/reports-engine.js lines 915-983
  function generateCashBookReport(vouchers, sales, purchases, filters = {}, expenses = []) {
    const dateMap = {};
    const expenseList = (Array.isArray(expenses) && expenses.length ? expenses : (Array.isArray(filters.expenses) ? filters.expenses : []));

    // 1. Process CRV (Cash In) & CPV (Cash Out)
    for (const v of (vouchers || [])) {
      const date = (v.entryDate || v.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const mode = String(v.paymentMode || 'Cash').toLowerCase();
      if (!dateMap[date]) dateMap[date] = { date, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0, cashExpenses: 0 };
      if (mode === 'cash') {
        if (v.voucherType === 'CRV') dateMap[date].crvReceived += toNum(v.amount);
        if (v.voucherType === 'CPV') dateMap[date].cpvPaid += toNum(v.amount);
      }
    }

    // 2. Process Cash collected on Sales
    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (s.billStatus === 'Estimated') continue;
      if (!dateMap[date]) dateMap[date] = { date, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0, cashExpenses: 0 };
      dateMap[date].cashSales += toNum(s.paidAmount);
    }

    // 3. Process Cash paid on Purchases
    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const cashPaid = toNum(p.paidAmount || (String(p.paymentType || '').toLowerCase() === 'cash' ? (p.grandTotal || p.totalAmount) : 0));
      if (cashPaid > 0) {
        if (!dateMap[date]) dateMap[date] = { date, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0, cashExpenses: 0 };
        dateMap[date].cashPurchases += cashPaid;
      }
    }

    // 4. Process Daily Operating Expenses
    for (const e of expenseList) {
      const date = (e.entryDate || e.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const mode = String(e.paymentMode || 'Cash').toLowerCase();
      if (mode === 'cash') {
        if (!dateMap[date]) dateMap[date] = { date, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0, cashExpenses: 0 };
        dateMap[date].cashExpenses += toNum(e.amount);
      }
    }

    const rows = Object.values(dateMap).map(d => {
      const totalIn = d.cashSales + d.crvReceived;
      const totalOut = d.cpvPaid + d.cashPurchases + d.cashExpenses;
      const netCash = totalIn - totalOut;
      return { ...d, totalIn, totalOut, netCash };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const totals = rows.reduce((acc, r) => {
      acc.cashSales += r.cashSales;
      acc.crvReceived += r.crvReceived;
      acc.cpvPaid += r.cpvPaid;
      acc.cashPurchases += r.cashPurchases;
      acc.cashExpenses += r.cashExpenses;
      acc.totalIn += r.totalIn;
      acc.totalOut += r.totalOut;
      acc.netCash += r.netCash;
      return acc;
    }, { records: rows.length, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0, cashExpenses: 0, totalIn: 0, totalOut: 0, netCash: 0 });

    return { title: 'Daily Cash Flow / Cash Book Report', rows, totals };
  }
```

#### 2.4.3 Profit & Loss Report (`reports-engine.js:985-1076`)
```javascript
// src/reports/reports-engine.js lines 985-1076
  function generateProfitAndLossReport(sales, purchases, vouchers, returns, filters = {}, expenses = []) {
    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalSalesDiscounts = 0;
    let totalRefunds = 0;
    let totalExpenses = 0;
    const expenseList = (Array.isArray(expenses) && expenses.length ? expenses : (Array.isArray(filters.expenses) ? filters.expenses : []));
    const expensesByCategory = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;

      totalSalesRevenue += toNum(s.grossAmount);
      totalSalesDiscounts += toNum(s.discount);

      const items = getItems(s);
      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        totalCostOfGoodsSold += (qty * toNum(it.purchasePrice));
      }
    }

    for (const r of (returns || [])) {
      const date = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      totalRefunds += toNum(r.totalAmount || r.netRefund || r.grandTotal);

      // Revert COGS for returned goods
      const items = getItems(r);
      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        totalCostOfGoodsSold -= (qty * toNum(it.purchasePrice || 0));
      }
    }

    // 1. Operating Expenses from Expenses table (grouped by account title)
    for (const e of expenseList) {
      const eDate = (e.entryDate || e.createdAt || '').slice(0, 10);
      if (!isDateInRange(eDate, filters.fromDate, filters.toDate)) continue;
      const title = (e.accountTitle || e.category || 'General Expenses').trim();
      const amt = toNum(e.amount);
      expensesByCategory[title] = (expensesByCategory[title] || 0) + amt;
      totalExpenses += amt;
    }

    // 2. Operating expenses from CPV vouchers (without double-counting items already in expenses table)
    for (const v of (vouchers || [])) {
      const vDate = (v.entryDate || v.date || v.createdAt || '').slice(0, 10);
      if (!isDateInRange(vDate, filters.fromDate, filters.toDate)) continue;
      if (v.voucherType === 'CPV' && (v.expenseCategory || (v.remarks && v.remarks.toLowerCase().includes('expense')))) {
        const isDuplicate = expenseList.some(e =>
          (e.voucherNo && (e.voucherNo === v.voucherNo || e.voucherNo === v.manualNo)) ||
          (e.entryDate === vDate && Math.abs(toNum(e.amount) - toNum(v.netAmount || v.amount)) < 0.01 && (e.paidTo === v.partyTitle || e.remarks === v.remarks))
        );
        if (!isDuplicate) {
          const title = (v.expenseCategory || 'General Expenses (CPV)').trim();
          const amt = toNum(v.netAmount || v.amount);
          expensesByCategory[title] = (expensesByCategory[title] || 0) + amt;
          totalExpenses += amt;
        }
      }
    }

    const netSales = Math.max(0, totalSalesRevenue - totalSalesDiscounts - totalRefunds);
    const grossProfit = (netSales - Math.max(0, totalCostOfGoodsSold));
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = netSales > 0 ? ((grossProfit / netSales) * 100) : 0;
    const netMargin = netSales > 0 ? ((netProfit / netSales) * 100) : 0;

    return {
      title: 'Profit & Loss Performance Statement',
      metrics: {
        grossSales: totalSalesRevenue,
        discountsGiven: totalSalesDiscounts,
        returnsRefunded: totalRefunds,
        netSales,
        cogs: Math.max(0, totalCostOfGoodsSold),
        grossProfit,
        profitMargin,
        operatingExpenses: totalExpenses,
        expensesByCategory,
        netProfit,
        netMargin
      }
    };
  }
```

---

### 2.5 Purchases & Stock Generators

#### 2.5.1 Item-wise Purchase Report with Critical Math Bug (`reports-engine.js:495-554`)
```javascript
// src/reports/reports-engine.js lines 495-554
  function generateItemWisePurchaseReport(purchases, products, filters = {}) {
    const itemMap = {};

    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && p.partyId !== filters.partyId) continue;

      const items = getItems(p);
      for (const it of items) {
        const code = String(it.productCode || it.code || '').trim();
        const prod = (products || []).find(x => (code && String(x.code) === code) || (it.productId && String(x.id) === String(it.productId))) || {};

        if (!matchesCategoryAndSubCategory(prod, filters.categoryId, filters.subCategoryId)) continue;

        const key = code || it.productId || it.productTitle || 'item-unknown';
        if (!itemMap[key]) {
          itemMap[key] = {
            productCode: code || prod.code || '--',
            productTitle: it.productTitle || prod.titleEng || 'Product',
            categoryName: prod.categoryName || 'General',
            totalPacksInward: 0,
            totalUnitsInward: 0,
            totalBonus: 0,
            totalQtyInward: 0,
            totalSpend: 0
          };
        }

        const packQty = toNum(it.packQty || it.pQty);
        const unitQty = toNum(it.unitQty || it.uQty);
        const bonus = toNum(it.bonus);
        const netAmt = toNum(it.netAmount || (toNum(it.tradePrice) * (packQty + unitQty)));

        itemMap[key].totalPacksInward += packQty;
        itemMap[key].totalUnitsInward += unitQty;
        itemMap[key].totalBonus += bonus;
        // BUG: Does not multiply packQty by packSize! Adds raw packs to raw units!
        itemMap[key].totalQtyInward += (packQty + unitQty + bonus);
        itemMap[key].totalSpend += netAmt;
      }
    }

    const rows = Object.values(itemMap).map(r => ({
      ...r,
      avgCost: r.totalQtyInward > 0 ? (r.totalSpend / r.totalQtyInward) : 0
    })).sort((a, b) => b.totalSpend - a.totalSpend);

    const totals = rows.reduce((acc, r) => {
      acc.totalQtyInward += r.totalQtyInward;
      acc.totalSpend += r.totalSpend;
      return acc;
    }, { records: rows.length, totalQtyInward: 0, totalSpend: 0 });

    return { title: 'Item-wise Purchase Report', rows, totals };
  }
```

#### 2.5.2 Stock Position Report (`reports-engine.js:556-618`)
```javascript
// src/reports/reports-engine.js lines 556-618
  function generateStockPositionReport(products, categories, filters = {}) {
    const list = [];
    let totalStockQty = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;

    const catLookup = {};
    const safeCategories = Array.isArray(categories) ? categories : [];
    for (const c of safeCategories) {
      if (c && c.id) catLookup[String(c.id)] = c.name;
    }

    for (const p of (products || [])) {
      if (!matchesCategoryAndSubCategory(p, filters.categoryId, filters.subCategoryId)) continue;

      const qty = toNum(p.stockQty);
      const purPrice = toNum(p.purchasePrice);
      const wsPrice = toNum(p.wholesalePrice);
      const retPrice = toNum(p.retailPrice);
      const costVal = qty * purPrice;
      const retVal = qty * retPrice;

      totalStockQty += qty;
      totalCostVal += costVal;
      totalRetailVal += retVal;

      const pCatId = String(p.categoryId || p.category_id || '');
      const catName = p.categoryName || catLookup[pCatId] || '--';

      list.push({
        id: p.id,
        code: p.code || '--',
        titleEng: p.titleEng || '--',
        categoryName: catName,
        subCategoryName: p.subCategoryName || p.sub_category_name || '--',
        unitName: p.unitName || p.packingType || 'Piece',
        packSize: toNum(p.packSize || 1),
        stockQty: qty,
        purchasePrice: purPrice,
        wholesalePrice: wsPrice,
        retailPrice: retPrice,
        stockCostValue: costVal,
        stockRetailValue: retVal,
        minStock: toNum(p.minStock),
        location: p.location || '--'
      });
    }

    list.sort((a, b) => b.stockCostValue - a.stockCostValue);

    return {
      title: 'Current Stock Position Report',
      rows: list,
      totals: {
        records: list.length,
        totalStockQty,
        totalCostVal,
        totalRetailVal,
        potentialProfit: (totalRetailVal - totalCostVal)
      }
    };
  }
```

---

### 2.6 Print and Export Code

#### 2.6.1 Print Handler (`src/reports/reports.js:1999-2040`)
```javascript
// src/reports/reports.js lines 1999-2040
  function handlePrintReport() {
    if (!state.currentReportData) {
      showToast('No report data to print', 'warning');
      return;
    }

    const res = state.currentReportData;
    const title = res.title || 'Business Report';
    const comp = state.masterData.companyInfo || { name: 'Shahzaib Traders', phone: '0300-1234567', address: 'Wah Cantt' };
    const dateRange = dom.fromDate.value ? `${dom.fromDate.value} to ${dom.toDate.value || 'Today'}` : 'All Recorded Period';

    // Full table HTML containing all rows, not just paginated page
    const fullTableHtml = generateFullTableHtml(res);

    dom.printArea.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px;">
          <h2 style="margin: 0; font-size: 20px;">${comp.name}</h2>
          <p style="margin: 2px 0; font-size: 13px;">${comp.address || 'Wah Cantt'} | Phone: ${comp.phone || '0300-1234567'}</p>
          <h3 style="margin: 8px 0 0; font-size: 16px; text-transform: uppercase;">${title}</h3>
          <p style="margin: 2px 0; font-size: 12px;">Report Period: ${dateRange} | Total Records: ${(res.rows || []).length} | Print Date: ${new Date().toLocaleString('en-PK')}</p>
        </div>

        <div style="margin-top: 10px;">
          ${state.activeReportId === 'profit-loss' ? dom.pnlCard.innerHTML : fullTableHtml}
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px;">
          <div>Generated By: Admin</div>
          <div>Audited & Verified By: ___________________</div>
        </div>
      </div>
    `;

    window.print();
  }
```

#### 2.6.2 Export Data Mapper Bug Examples (`src/reports/reports.js:2210-2276`)

```javascript
// src/reports/reports.js lines 2212-2226: Category Stock export uses wrong property names
    } else if (repId === 'category-stock') {
      isLandscape = true;
      headers = ['Sr #', 'Category Name', 'Unique Items', 'Total Stock Units', 'Total Cost Valuation', 'Total Retail Valuation', 'Potential Gross Margin', 'Margin %'];
      exportedRows = rows.map((r, i) => [
        i + 1, cleanText(r.categoryName, '-'), Number(r.productCount || 0), Number(r.stockQty || 0),
        Number(r.costValue || 0), Number(r.retailValue || 0), Number(r.margin || 0),
        Number((r.marginPct || 0).toFixed(1))
      ]);
      totalsRow = [
        'TOTALS', `${rows.length} Categories`, Number(t.productCount || 0), Number(t.totalQty || 0),
        Number(t.costValue || 0), Number(t.retailValue || 0), Number(t.margin || 0),
        Number((t.marginPct || 0).toFixed(1))
      ];

// src/reports/reports.js lines 2264-2276: P&L export cuts off operating expenses and net profit
    } else if (repId === 'profit-loss') {
      headers = ['Sr #', 'Statement Component', 'Accounting Basis', 'Amount (PKR)'];
      exportedRows = [
        [1, 'Gross Sales Revenue', 'Total Invoice Sales Value', Number(m.grossSales || 0)],
        [2, 'Less: Trade Discounts Allowed', 'Deductions on Invoices', -Number(m.discountsGiven || 0)],
        [3, 'Less: Sales Returns & Refunds', 'Returned Merchandise', -Number(m.returnsRefunded || 0)],
        [4, 'NET TRADING SALES REVENUE', 'Gross - Discounts - Returns', Number(m.netSales || 0)],
        [5, 'Less: Cost of Goods Sold (COGS)', 'Purchase Rate x Units Sold', -Number(m.cogs || 0)],
        [6, 'GROSS TRADING PROFIT', 'Net Sales - COGS', Number(m.grossProfit || 0)]
      ];
      totalsRow = ['GROSS PROFIT MARGIN RATIO', '', '', `${(m.profitMargin || 0).toFixed(2)}%`];
```

---

## PART 3: FIELD-BY-FIELD AUDIT & COMMON MISTAKES CHECK

### 3.1 Field Mapping Verification Table for Every Report Column

| Report Name | Column Shown on Screen | Source Property Read in `reports.js` | Origin Field in DB / Engine | Is Field Correct? | Analysis & Discrepancies |
|---|---|---|---|---|---|
| **Bill-wise Sales** | Date | `r.date` | `s.entryDate \|\| s.createdAt` | **Yes** | Standard date format `YYYY-MM-DD`. |
| | Bill # | `r.voucherNo` | `s.voucherNo` | **Yes** | Direct match. |
| | Customer Name | `r.partyTitle` | `s.partyTitle` | **Yes** | Fallback to 'Walk-in Customer'. |
| | Territory | `r.areaName` | `s.areaName` | **Yes** | Shows '--' if empty. |
| | Mode | `r.paymentType` | `s.paymentType` | **Yes** | 'Cash' or 'Credit'. |
| | Items | `r.itemCount` | `items.reduce(totalQty)` | **Partly** | Sums total pieces/packs. If `itemsJson` corrupted, defaults to 0. |
| | Gross | `r.gross` | `s.grossAmount` | **Yes** | Matches total invoice item price before discounts. |
| | Discount | `r.discount` | `s.discount` | **Yes** | Invoice-level trade discount. |
| | Net Total | `r.net` | `s.netAmount` | **Yes** | `gross - discount`. |
| | Paid | `r.paid` | `s.paidAmount` | **Yes** | Cash tender collected at time of sale. |
| | Balance | `r.balance` | `s.balanceDue` | **Yes** | Remaining credit debt on this specific invoice. |
| **Customer Sales** | Invoices | `r.billsCount` | `count(sales)` | **Yes** | Number of bills for customer. |
| | Gross Sales | `r.gross` | `sum(s.grossAmount)` | **Yes** | Total invoice value. |
| | Discount | `r.discount` | `sum(s.discount)` | **Yes** | Total discounts granted. |
| | Net Sales | `r.net` | `sum(s.netAmount)` | **Partly** | **Does not subtract customer's sales returns**. |
| | Cash Paid | `r.paid` | `sum(s.paidAmount)` | **Yes** | Total cash paid across sales. |
| | Balance Due | `r.balance` | `sum(s.balanceDue)` | **WRONG** | Sum of invoice `balanceDue` does NOT equal customer's actual live ledger debt if they paid through CRVs! |
| **Item-wise Sales** | Packs Sold | `r.packQtySold` | `it.packQty` | **Yes** | Inward pack quantity sold. |
| | Units Sold | `r.totalQtySold` | `it.totalQty` | **Yes** | Pack qty x pack size + unit qty. |
| | Purchase Cost | `r.purchaseCostTotal` | `totalQty * it.purchasePrice` | **Partly** | Uses line item `purchasePrice`. If 0, uses `prod.purchasePrice`. |
| | Net Revenue | `r.netRevenue` | `it.netAmount` | **WRONG** | Line item net revenue ignores invoice special bill discount! |
| | Gross Profit | `r.totalProfit` | `netAmt - costAmt` | **WRONG** | Gross profit ignores invoice special bill discount! |
| **Territory Sales** | Gross Sales | `r.gross` (Row) / `t.gross` (Foot) | `acc.gross` | **BROKEN** | Rows have gross, but **table footer displays Rs. 0.00** because `totals.gross` is never calculated. |
| | Discount | `r.discount` (Row) / `t.discount` (Foot) | `acc.discount` | **BROKEN** | Rows have discount, but **table footer displays Rs. 0.00** because `totals.discount` is never calculated. |
| **Bill-wise Profit** | Sale Net Value | `r.billNet` | `s.netAmount` | **Yes** | Net bill total after bill discount. |
| | Goods Cost | `r.billCost` | `sum(it.totalQty * it.purchasePrice)` | **Partly** | If `it.purchasePrice` was not stored or is 0, defaults to 0 (no fallback to `averageCost` or `prod.purchasePrice`). |
| | Gross Profit | `r.profit` | `billNet - billCost` | **Partly** | Does not subtract returns. Disagrees with Item-wise sales report. |
| **Item Purchases** | Total Packs | `r.totalPacksInward` | `it.packQty` | **Yes** | Packs inward. |
| | Total Units | `r.totalUnitsInward` | `it.unitQty` | **Yes** | Loose units inward. |
| | Bonus | `r.totalBonus` | `it.bonus` | **Yes** | Bonus pieces received free from supplier. |
| | Total Qty | `r.totalQtyInward` | `packQty + unitQty + bonus` | **BROKEN** | **Adds packs and loose pieces directly without multiplying `packQty * packSize`**! |
| | Total Spend | `r.totalSpend` | `it.netAmount` | **Yes** | Inward purchase spend. |
| | Avg Unit Cost | `r.avgCost` | `totalSpend / totalQtyInward` | **BROKEN** | Divided by the wrong quantity due to pack size omission! |
| **Stock Position** | Stock Qty | `r.stockQty` | `p.stockQty` | **Yes** | Reads on-hand balance directly from products table. |
| | Cost Value | `r.stockCostValue` | `qty * p.purchasePrice` | **Partly** | Uses latest purchase rate. Does not offer `averageCost` option. |
| | Retail Value | `r.stockRetailValue` | `qty * p.retailPrice` | **Yes** | Current retail catalog rate. |
| **Category Stock** | Unique Items | Screen: `r.itemsCount` / Export: `r.productCount` | Engine: `itemsCount` | **BROKEN IN EXPORT** | On screen shows count. **Excel & PDF export prints 0** because mapper looks for `r.productCount`. |
| | Total Units | Screen: `r.totalQty` / Export: `r.stockQty` | Engine: `totalQty` | **BROKEN IN EXPORT** | On screen shows units. **Excel & PDF export prints 0** because mapper looks for `r.stockQty`. |
| **Customer Receivables** | Receivable | `r.receivableAmount` | `p.currentBalance ?? p.openingBalance` | **Partly** | Reads live balance (Fixed in SEC-01). However, ignores negative balances (advance customer credits). |
| **Supplier Payables** | Payable | `r.payableAmount` | `Math.abs(p.currentBalance ?? p.openingBalance)` | **WRONG** | Uses `Math.abs`. If supplier has an advance debit balance, it is reported as an outstanding payable debt! |
| **Cash Book** | Net Day Cash | `r.netCash` | `totalIn - totalOut` | **WRONG** | **Does not subtract cash refunded on sales returns**! Shows more cash than was actually in the drawer. |
| **Profit & Loss** | Net Sales | `m.netSales` | `gross - discounts - returns` | **WRONG** | **Includes unconfirmed Estimated bills** because `reports.js` passes raw `sales` instead of `confirmedSales`. |
| | COGS | `m.cogs` | `sales_cogs - returns_cogs` | **WRONG** | `sale_return_items` has no `purchasePrice`, so returns COGS is never deducted. Gross profit is understated. |
| | Net Profit | `m.netProfit` | `grossProfit - totalExpenses` | **BROKEN IN EXPORT** | Displays on screen card, but **completely omitted from Excel and PDF exports**! |

---

### 3.2 Audit of 11 Specific Calculation & Logic Failure Categories

#### 1. `openingBalance` vs `currentBalance`
- In `generateCustomerReceivablesReport` ([`reports-engine.js:786`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L786)), `generateSupplierPayablesReport` ([`reports-engine.js:822`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L822)), and `generateSupplierWisePurchaseReport` ([`reports-engine.js:476`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L476)), `currentBalance` is now used with fallback to `openingBalance` (completed in Fix 1).
- **Remaining Defect on Hub Card**: In `src/reports/reports.js` line 495 (`updateHubCardStats`):
  ```javascript
  totalRec += Math.max(0, Number(p.currentBalance || p.openingBalance || 0));
  ```
  If a customer had an opening balance of Rs. 10,000 and paid off their entire debt so `p.currentBalance = 0`, JavaScript evaluates `0 || 10000` as `10000`! The Hub Card mistakenly reports that the customer still owes Rs. 10,000!

#### 2. `netAmount` vs `grossAmount` vs `paidAmount` vs `balanceDue`
- In `generatePartyWiseSalesReport` ([`reports-engine.js:170`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L170)), the report sums `s.balanceDue` as the customer's total unpaid debt:
  ```javascript
  partyMap[pId].balance += toNum(s.balanceDue);
  ```
  This is fundamentally flawed. `s.balanceDue` is the unpaid balance on that specific invoice at the moment it was issued. If the customer subsequently visited the shop and paid Rs. 50,000 via a Cash Receipt Voucher (CRV), the invoice `balanceDue` remains unchanged in the `sales` table! A customer who has paid in full will still be shown with massive unpaid balances in the Customer Sales Report.

#### 3. Discounts Double-Counted or Omitted
- **Omitted Special Bill Discount in Item-wise Sales**: In `generateItemWiseSalesReport` ([`reports-engine.js:223`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L223)):
  ```javascript
  const netAmt = toNum(it.netAmount || (totalQty * salePrice - discAmount));
  ```
  `it.netAmount` only accounts for item line discounts. If an invoice had an overall special discount (e.g. Rs. 500 off the bill entered in `sales.discount`), that discount is never allocated across the line items. Consequently, Item-wise Sales total net revenue exceeds Bill-wise Sales total net revenue by the entire amount of special discounts.
- **Omitted CRV/CPV Settlement Discounts in P&L**: In `generateProfitAndLossReport` ([`reports-engine.js:985`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L985)), settlement discounts allowed to customers on CRVs (`accounts_vouchers.discount`) are completely absent from operating expenses and financial charges.

#### 4. Estimated Bills (`billStatus = 'Estimated'`) Included Where Forbidden
- **Critical Flaw in P&L**: In `src/reports/reports.js` lines 844-848:
  ```javascript
  } else if (repId === 'profit-loss') {
    result = window.ReportsEngine.generateProfitAndLossReport(
      state.masterData.sales, ... // BUG: Passes raw sales containing Estimated bills!
    );
  }
  ```
  While `bill-wise-sales`, `party-wise-sales`, and `item-wise-sales` filter by `confirmedSales = allSales.filter(s => s.billStatus !== 'Estimated')`, `profit-loss` is passed raw `state.masterData.sales`. Inside `generateProfitAndLossReport` ([`reports-engine.js:995`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L995)), there is no condition for `billStatus`. **Kacha bills that were never confirmed inflate sales revenue and profit in the P&L statement.**

#### 5. Returns Subtraction and COGS Reversion Failure
- In `generateProfitAndLossReport` ([`reports-engine.js:1024`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1024)):
  ```javascript
  for (const it of items) {
    const qty = toNum(it.totalQty || ...);
    totalCostOfGoodsSold -= (qty * toNum(it.purchasePrice || 0));
  }
  ```
  In the SQLite database table `sale_return_items`, there is NO `purchasePrice` column (only `productId`, `productCode`, `returnRate`, `netAmount`). When items are parsed from `itemsJson`, `it.purchasePrice` is undefined. `toNum(it.purchasePrice || 0)` evaluates to `0`. **The cost of returned inventory is never subtracted from COGS, artificially understating gross trading profit by the cost value of every returned item.**
- In `generateBillWiseProfitReport` ([`reports-engine.js:305`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L305)), returns are completely ignored.

#### 6. Cost Basis Inconsistencies Across Reports
- `generateBillWiseProfitReport`: Uses line item `it.purchasePrice` only. If missing, defaults to 0 without falling back to catalog `purchasePrice` or `averageCost`.
- `generateItemWiseSalesReport`: Uses `it.purchasePrice || prod.purchasePrice || 0`.
- `generateStockPositionReport`: Uses `p.purchasePrice` only. Completely ignores `p.averageCost`.
- Because the three reports use different cost rules, their cost totals never agree.

#### 7. Expenses Handling
- In `generateTodayBusinessSummaryReport` ([`reports-engine.js:1088`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L1088)), daily operating expenses are completely omitted from the summary timeline and net day cash calculation.
- In `src/reports/reports.js` line 2264, the Excel and PDF exporter for Profit & Loss omits all operating expenses.

#### 8. Cash Inflow / Outflow Mixing and Omission of Return Refunds
- In `generateCashBookReport` ([`reports-engine.js:915`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L915)), cash sales, CRVs, cash purchases, and daily cash expenses are processed. However, **cash refunded to customers on sales returns (`sales_returns.refundMode = 'Cash'`) is never subtracted**. Cash Book net cash will always disagree with physical cash drawer and Day-End Closing whenever a cash return refund occurs.

#### 9. Inactive and Deleted Records
- `generateStockPositionReport` ([`reports-engine.js:567`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L567)) loops through all products without checking `p.inActive = 1`. Inactive and discontinued items inflate total inventory stock count and valuation.
- `generateCustomerReceivablesReport` ([`reports-engine.js:779`](file:///c:/Users/Huzaifa%20Ali/Desktop/shazy%20bhi/shahzaib-traders-app/src/reports/reports-engine.js#L779)) does not check `p.status = 'Active'`. Dormant or inactive parties are included.

#### 10. Stock Valuation Method
- The system stores two cost fields in `products`: `purchasePrice` and `averageCost` (weighted average cost). Every stock position and category stock report evaluates inventory purely as `stockQty * purchasePrice`. There is no option for weighted-average cost valuation.

#### 11. Customer and Supplier Separation
- In `src/reports/reports.js` line 494 (`updateHubCardStats`):
  ```javascript
  if (!p.partyType || p.partyType.toLowerCase().includes('customer'))
  ```
  Because the parties table column is `partyTypeName` (not `partyType`), `p.partyType` is undefined for every record. As a result, suppliers who have a positive balance are incorrectly added into Customer Receivables on the Hub Card.

