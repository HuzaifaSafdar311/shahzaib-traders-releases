# Graph Report - shahzaib-traders-releases  (2026-11-09)

## Corpus Check
- 39 files · ~131,552 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 10, (none) 3, .example 1)

## Summary
- 687 nodes · 1488 edges · 49 communities (36 shown, 13 thin omitted)
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 295 edges (avg confidence: 0.85)
- Token cost: 1,250 input · 850 output

## Community Hubs (Navigation)
- Database & SQLite Storage Layer
- General Information & Parties Setup
- Inventory Price Adjustment Modal
- Reports Engine & Analytics Calculations
- Sales Voucher & Billing Management
- Accounts UI & Ledger Management
- Trade Estimates & Claims Workflow
- Parties & Geographic Areas Database
- Reporting UI & Table Markup
- Product Lookup & Search Modal
- Shared Utilities & DOM Helpers
- Export & File System Operations
- Purchase Bill Calculation & Line Items
- Cart Item Pricing & Discounts
- Trade Features & Claims Database
- Sales Return Cart & Transactions
- Electron Builder Configuration
- Sales History & Filter Controls
- Project Metadata & Core Dependencies
- Main Electron Process & Window Lifecycle
- Purchase Returns Workflow & Tables
- Application Settings & Database Stats
- Renderer Root & Auto-Updater UI
- Product Selection & Rate Choice Modal
- Thermal Invoice Printing & Formatting
- Accounts & Financial Vouchers Database
- User Authentication & PIN Pad Login
- Category & Subcategory Management
- Product Table Rendering & Dialogs
- Purchase Product Search & Line Math
- Product Master Form & Info Loading
- Development & Build Tooling
- ERP Navigation & Tab Layout Views
- NPM Build & Execution Scripts
- Repository VCS Configuration
- Authentication & App Shell Views
- Hero Background Asset
- Login Background Artwork
- Logo Mark Graphic Asset
- Logo Typography Graphic Asset
- Release Packaging Script Config
- Circle Brand Logo Badge
- Full Brand Logo Badge
- General Hero Background Graphic
- Login Background Graphic
- Logo Brand Icon Graphic
- Logo Text Graphic
- Analytics & Reporting Dashboard View

## God Nodes (most connected - your core abstractions)
1. `bindEvents()` - 30 edges
2. `saveJsonData()` - 24 edges
3. `setupEventListeners()` - 23 edges
4. `initPosCatalog()` - 23 edges
5. `updateVoucherTotals()` - 23 edges
6. `checkpoint()` - 22 edges
7. `toNum()` - 22 edges
8. `renderItemsTable()` - 22 edges
9. `initReturnModule()` - 22 edges
10. `bindEvents()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Login View & Authentication Form` --references--> `ERP Main Application Shell & Navbar`  [EXTRACTED]
  src/auth/login.html → src/index.html
- `Purchase Management UI View` --references--> `Find Product Lookup Modal Dialog`  [EXTRACTED]
  src/index.html → src/find-product/find-product.html
- `Sales Management UI View` --references--> `Find Product Lookup Modal Dialog`  [EXTRACTED]
  src/index.html → src/find-product/find-product.html
- `ERP Main Application Shell & Navbar` --references--> `Startup Splash Screen`  [EXTRACTED]
  src/index.html → src/splash/splash.html
- `Sales Management UI View` --references--> `Invoice & Receipt Print Layout Template`  [EXTRACTED]
  src/index.html → src/sales/invoice-template.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core ERP Business Transaction & Ledger Accounting Flow** — src_index_sales_section, src_index_purchase_section, src_index_inventory_section, src_index_accounts_section [INFERRED 0.95]

## Communities (49 total, 13 thin omitted)

### Community 0 - "Database & SQLite Storage Layer"
Cohesion: 0.08
Nodes (51): backupDatabase(), checkpoint(), clearAllLedgers(), closeDatabase(), DEFAULT_APP_SETTINGS, deleteProduct(), deleteProductCategory(), deleteProductSubCategory() (+43 more)

### Community 1 - "General Information & Parties Setup"
Cohesion: 0.13
Nodes (37): closeAreaModal(), closeEditCompanyModal(), closePartyModal(), closePartyTypeModal(), closeProvinceModal(), confirmDeleteArea(), confirmDeleteParty(), confirmDeletePartyType() (+29 more)

### Community 2 - "Inventory Price Adjustment Modal"
Cohesion: 0.08
Nodes (23): btnApplyChangePriceModal, btnCancelChangePriceModal, btnCloseChangePriceModal, btnOpenChangePriceModal, btnPurClearDate, btnToggleAddItem, btnToggleVoucherList, calcMarginFromRetail() (+15 more)

### Community 3 - "Reports Engine & Analytics Calculations"
Cohesion: 0.19
Nodes (27): buildProductMaps(), generateBillWiseProfitReport(), generateBillWisePurchaseReport(), generateBillWiseSalesReport(), generateCashBookReport(), generateCategoryStockReport(), generateCPVReport(), generateCRVReport() (+19 more)

### Community 4 - "Sales Voucher & Billing Management"
Cohesion: 0.13
Nodes (25): changeItemDisc(), clearEntryFields(), filterAndRenderModalHistory(), initElements(), initSalesModule(), initSubTabs(), loadAllParties(), loadCompanyInfo() (+17 more)

### Community 5 - "Accounts UI & Ledger Management"
Cohesion: 0.22
Nodes (28): bindEvents(), cacheDom(), closePartyHelpModal(), closePrintModal(), executeLedgerPrint(), filterAndRenderHelpParties(), handleDeleteVoucher(), handlePrintLedger() (+20 more)

### Community 6 - "Trade Estimates & Claims Workflow"
Cohesion: 0.15
Nodes (26): addEstimateItem(), closeModal(), convertEstimateToSale(), formatMoney(), init(), initClaimsModule(), initClosingModule(), calcDifference() (+18 more)

### Community 7 - "Parties & Geographic Areas Database"
Cohesion: 0.11
Nodes (12): getAllGeneralInfo(), getAreas(), getCompanyInfo(), getDefaultAreas(), getDefaultCompanyInfo(), getDefaultParties(), getDefaultPartyTypes(), getDefaultProvinces() (+4 more)

### Community 8 - "Reporting UI & Table Markup"
Cohesion: 0.19
Nodes (26): applyDatePreset(), bindEvents(), buildTableMarkup(), cacheDom(), generateActiveReport(), generateFullTableHtml(), getReportExportData(), handleExportExcel() (+18 more)

### Community 9 - "Product Lookup & Search Modal"
Cohesion: 0.12
Nodes (23): addedCounts, allProducts, applyFilters(), btnClearSearch, btnCloseWindow, btnResetFilters, escapeHtml(), f1CategoryFilter (+15 more)

### Community 10 - "Shared Utilities & DOM Helpers"
Cohesion: 0.12
Nodes (13): createTablePagination(), calculateSize(), ensureFooter(), getContainer(), getEmptyState(), getTbody(), render(), escapeHtml() (+5 more)

### Community 11 - "Export & File System Operations"
Cohesion: 0.16
Nodes (18): { app, BrowserWindow, dialog, shell }, cleanText(), escapeHtml(), ExcelJS, exportCatalogPDF(), exportCSV(), exportExcel(), exportGenericReportCSV() (+10 more)

### Community 12 - "Purchase Bill Calculation & Line Items"
Cohesion: 0.16
Nodes (22): addPurchaseLineItem(), applyChangeSubstancePrice(), applyPurchaseDateFilter(), autoSaveCurrentPurchase(), calculatePurchaseBill(), changePurchaseSlipPage(), closeAddPurchaseModal(), closeChangeSubstancePriceModal() (+14 more)

### Community 13 - "Cart Item Pricing & Discounts"
Cohesion: 0.20
Nodes (21): addCurrentItem(), adjustCartItemQty(), applyDiscountPercentToAll(), changeItemDiscAmt(), changeItemQty(), changeItemRate(), clearBillCart(), convertEstimateToPaid() (+13 more)

### Community 14 - "Trade Features & Claims Database"
Cohesion: 0.12
Nodes (6): getNextClaimNo(), getNextEstimateNo(), getNextExpenseVoucherNo(), saveClaim(), saveEstimate(), saveExpense()

### Community 15 - "Sales Return Cart & Transactions"
Cohesion: 0.20
Nodes (19): addCurrentReturnItem(), addReturnProductToCart(), adjustReturnCartItemQty(), editReturn(), getFilteredReturnProducts(), initReturnPosCatalog(), removeReturnItem(), renderCatalogPagination() (+11 more)

### Community 16 - "Electron Builder Configuration"
Cohesion: 0.11
Nodes (18): build, appId, copyright, directories, extraResources, files, nsis, productName (+10 more)

### Community 17 - "Sales History & Filter Controls"
Cohesion: 0.20
Nodes (18): applyRateChoice(), applySalesFilter(), bindEvents(), changeSalesHistoryPage(), closeAddSaleModal(), closeBillStatusModal(), executeSaveSale(), getPartyEntityLabel() (+10 more)

### Community 18 - "Project Metadata & Core Dependencies"
Cohesion: 0.15
Nodes (16): author, dependencies, dotenv@^18.0.7, electron-log@^5.4.4, electron-updater@^6.8.11, exceljs@^4.4.0, description, keywords (+8 more)

### Community 19 - "Main Electron Process & Window Lifecycle"
Cohesion: 0.14
Nodes (13): { app, BrowserWindow, ipcMain, dialog, shell }, { autoUpdater }, checkPinMatch(), createWindow(), crypto, dotenv, fs, getDbFilePath() (+5 more)

### Community 20 - "Purchase Returns Workflow & Tables"
Cohesion: 0.20
Nodes (17): applyReturnsFilter(), closeAddReturnModal(), initReturnElements(), initReturnModule(), loadAndRenderReturnsTable(), loadNextReturnNo(), openAddReturnModal(), openReturnHistoryModal() (+9 more)

### Community 21 - "Application Settings & Database Stats"
Cohesion: 0.33
Nodes (14): init(), initElements(), loadAllSettings(), loadDatabaseStats(), loadSystemInfo(), onActivate(), setupActionButtons(), setupLivePreviewListeners() (+6 more)

### Community 22 - "Renderer Root & Auto-Updater UI"
Cohesion: 0.24
Nodes (7): appEl, init(), initAutoUpdaterUI(), mainTabs, reloadFromDatabase(), switchTab(), updateBadges()

### Community 23 - "Product Selection & Rate Choice Modal"
Cohesion: 0.27
Nodes (12): addProductToCart(), closeProductLookupModal(), closeRateChoiceModal(), confirmRateChoice(), filterF1ModalProducts(), initPosCatalog(), openProductLookupModal(), openRateChoiceModal() (+4 more)

### Community 24 - "Thermal Invoice Printing & Formatting"
Cohesion: 0.23
Nodes (12): cleanInvoiceEmoji(), doPrintSaleBill(), formatThermalDate(), formatThermalPrintDateTime(), getSalePrintStudioValues(), openReceiptModal(), renderA4SaleBill(), renderA5SaleBill() (+4 more)

### Community 25 - "Accounts & Financial Vouchers Database"
Cohesion: 0.33
Nodes (6): deleteVoucher(), getNextVoucherNo(), getPartyLedger(), getVoucherBalanceDelta(), isSupplierParty(), saveVoucher()

### Community 26 - "User Authentication & PIN Pad Login"
Cohesion: 0.42
Nodes (8): appendDigit(), clearError(), clearPin(), deleteDigit(), focusInput(), handlePinSubmit(), showError(), updatePinBoxes()

### Community 27 - "Category & Subcategory Management"
Cohesion: 0.29
Nodes (10): closeCategoryModal(), closeSubCategoryModal(), confirmDeleteCategory(), confirmDeleteSubCategory(), handleSaveCategory(), handleSaveSubCategory(), initProductInfoView(), renderProductCategories() (+2 more)

### Community 28 - "Product Table Rendering & Dialogs"
Cohesion: 0.29
Nodes (8): closeAddProductModal(), confirmDeleteProduct(), openAddSubCategory(), openChangeSubstancePriceModal(), renderProductsTable(), saveProductRecord(), showAlert(), updateCspMarginBadge()

### Community 29 - "Purchase Product Search & Line Math"
Cohesion: 0.29
Nodes (8): closeProductSearchModal(), initPurPricingModeEvents(), openProductSearchModal(), recalculatePurLineListMath(), renderF1ProductSearch(), selectProductForPurchase(), setPurLinePricingMode(), updateLineNetPreview()

### Community 30 - "Product Master Form & Info Loading"
Cohesion: 0.36
Nodes (8): loadProductRecord(), openAddProductModal(), openEditProductModal(), populateProductInfoDropdowns(), resetProductInfoForm(), updateProductPricingModeUI(), updateProductSubCategoryDropdown(), updateProductTopSubCategoryFilter()

### Community 31 - "Development & Build Tooling"
Cohesion: 0.29
Nodes (6): devDependencies, electron@^44.7.0, electron-builder@^26.15.3, electron, electron-builder, { contextBridge, ipcRenderer, webFrame }

### Community 32 - "ERP Navigation & Tab Layout Views"
Cohesion: 0.47
Nodes (6): Find Product Lookup Modal Dialog, Ledger & Accounts Management UI View, Inventory & Stock Tracking UI View, Purchase Management UI View, Sales Management UI View, Invoice & Receipt Print Layout Template

### Community 33 - "NPM Build & Execution Scripts"
Cohesion: 0.40
Nodes (5): scripts, dist, pack, start, test

### Community 34 - "Repository VCS Configuration"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 35 - "Authentication & App Shell Views"
Cohesion: 0.67
Nodes (3): Login View & Authentication Form, ERP Main Application Shell & Navbar, Startup Splash Screen

## Knowledge Gaps
- **15 isolated node(s):** `Release Build & GitHub Token Config`, `Login View & Authentication Form`, `Analytics & Reporting Dashboard UI View`, `Invoice & Receipt Print Layout Template`, `Startup Splash Screen` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 167 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `build` connect `Electron Builder Configuration` to `Project Metadata & Core Dependencies`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `bindEvents()` (e.g. with `addCurrentItem()` and `closeAddSaleModal()`) actually correct?**
  _`bindEvents()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Release Build & GitHub Token Config`, `Login View & Authentication Form`, `Analytics & Reporting Dashboard UI View` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database & SQLite Storage Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.07562136435748282 - nodes in this community are weakly interconnected._
- **Why does `electron` connect `Development & Build Tooling` to `Main Electron Process & Window Lifecycle`, `Project Metadata & Core Dependencies`, `Export & File System Operations`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `setupEventListeners()` (e.g. with `closeAreaModal()` and `closeEditCompanyModal()`) actually correct?**
  _`setupEventListeners()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Should `General Information & Parties Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.13356562137049943 - nodes in this community are weakly interconnected._