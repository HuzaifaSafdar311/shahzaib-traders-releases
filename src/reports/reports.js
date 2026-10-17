// ========================================================
// Shahzaib Traders - Reports Module Controller
// Orchestrates Sales, Purchases, Inventory, Accounts, and P&L Reports
// ========================================================

(function () {
  'use strict';

  // State Management
  const state = {
    activeCategory: 'sales', // 'sales' | 'purchases' | 'inventory' | 'accounts' | 'pnl'
    activeReportId: 'bill-wise-sales',
    datePreset: 'this-month', // 'today' | 'yesterday' | 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'all' | 'custom'
    fromDate: '',
    toDate: '',
    selectedPartyId: '',
    selectedCategoryId: '',
    selectedSubCategoryId: '',
    selectedAreaName: '',
    selectedPaymentType: 'All',
    searchQuery: '',

    // Master Cache
    masterData: {
      sales: [],
      purchases: [],
      products: [],
      parties: [],
      vouchers: [],
      returns: [],
      categories: [],
      subCategories: [],
      areas: [],
      companyInfo: null
    },

    currentReportData: null,
    pagination: {
      currentPage: 1,
      pageSize: 20
    }
  };

  // Sub-reports definition per category
  const reportCatalog = {
    today: [
      { id: 'today-register', label: "Today's Sales Register" },
      { id: 'today-summary', label: "Today's Full Day Register" }
    ],
    sales: [
      { id: 'today-register', label: "Today's Sales" },
      { id: 'bill-wise-sales', label: 'Bill-wise Sales' },
      { id: 'party-wise-sales', label: 'Customer / Party Sales' },
      { id: 'item-wise-sales', label: 'Item-wise Sales' },
      { id: 'territory-wise-sales', label: 'Territory Sales' },
      { id: 'bill-wise-profit', label: 'Bill-wise Profit & Margins' },
      { id: 'sales-returns', label: 'Sales Returns & Refunds' }
    ],
    inventory: [
      { id: 'stock-position', label: 'Current Stock Position & Valuation' },
      { id: 'low-stock', label: 'Low Stock Alerts' },
      { id: 'zero-stock', label: 'Out of Stock (Zero)' },
      { id: 'category-stock', label: 'Category Summary' }
    ],
    purchases: [
      { id: 'bill-wise-purchases', label: 'Bill-wise Purchases' },
      { id: 'supplier-wise-purchases', label: 'Supplier Purchases' },
      { id: 'item-wise-purchases', label: 'Item Purchases' }
    ],
    accounts: [
      { id: 'customer-receivables', label: 'Customer Receivables' },
      { id: 'supplier-payables', label: 'Supplier Payables' },
      { id: 'crv-report', label: 'Cash Receipts (CRV)' },
      { id: 'cpv-report', label: 'Cash Payments (CPV)' },
      { id: 'cash-book', label: 'Daily Cash Flow' }
    ],
    pnl: [
      { id: 'profit-loss', label: 'Profit & Loss Statement' }
    ]
  };

  // Helper currency format
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return 'Rs. ' + num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Toast Notification
  function showToast(message, type = 'success') {
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // Inject Markup into #reportsView
  // Category Metadata for Detail View Header
  const categoryMeta = {
    today: {
      title: "Today's Live Sales & Register",
      subtitle: "Live counter sales, cashier register, cash receipts & drawer balances for today",
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
      iconBg: 'bg-amber-soft text-amber'
    },
    sales: {
      title: "Sales & Revenue Reports",
      subtitle: "Bill-wise sales, customer sales, item sales, territory, margins & returns",
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
      iconBg: 'bg-blue-soft text-blue'
    },
    inventory: {
      title: "Stock & Inventory Reports",
      subtitle: "Current stock position, valuation, low stock shortage alerts & category summary",
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
      iconBg: 'bg-emerald-soft text-emerald'
    },
    purchases: {
      title: "Purchases & Vendor Reports",
      subtitle: "Inward purchase invoices, vendor purchase volume & item purchase history",
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
      iconBg: 'bg-purple-soft text-purple'
    },
    accounts: {
      title: "Accounts & Financial Reports",
      subtitle: "Customer balances, vendor payables, CRV receipts, CPV payments & daily cash flow",
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
      iconBg: 'bg-indigo-soft text-indigo'
    },
    pnl: {
      title: "Profit & Loss Performance Statement",
      subtitle: "Executive trading statement showing gross sales revenue, COGS, gross margins & net profit",
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
      iconBg: 'bg-rose-soft text-rose'
    }
  };

  // Inject Markup into #reportsView
  function renderReportsTemplate() {
    const container = document.getElementById('reportsView');
    if (!container) return;

    container.innerHTML = `
      <div class="reports-container">

        <!-- ======================================================== -->
        <!-- SCREEN 1: REPORT CATEGORY SELECTION HUB (CARDS ONLY)     -->
        <!-- ======================================================== -->
        <div id="repHubView" class="rep-hub-view">
          <header class="rep-hub-topbar">
            <div class="rep-hub-header-text">
              <h1>Business Reports</h1>
              <p>Reports select karein aur date filters ke sath live statements, print aur Excel export karein.</p>
            </div>
          </header>

          <div id="repHubCardsGrid" class="rep-hub-cards-grid">
            <!-- Card 1: Today's Report -->
            <div class="rep-hub-card" data-cat="today">
              <div class="rep-card-title">⚡ Today's Daily Register</div>
              <div class="rep-card-desc">Aaj ke din ki live counter sales, cash collection aur counter register report.</div>
              <div class="rep-card-action">Open Report →</div>
            </div>

            <!-- Card 2: Sales & Revenue -->
            <div class="rep-hub-card" data-cat="sales">
              <div class="rep-card-title">💳 Sales & Revenue Report</div>
              <div class="rep-card-desc">Bill-wise sale, customer sale, item-wise sale, margins aur sales return ki detail report.</div>
              <div class="rep-card-action">Open Report →</div>
            </div>

            <!-- Card 3: Stock & Inventory -->
            <div class="rep-hub-card" data-cat="inventory">
              <div class="rep-card-title">📦 Stock & Inventory Report</div>
              <div class="rep-card-desc">Current stock position, valuation (cost & retail) aur low stock shortage alerts.</div>
              <div class="rep-card-action">Open Report →</div>
            </div>

            <!-- Card 4: Purchases & Suppliers -->
            <div class="rep-hub-card" data-cat="purchases">
              <div class="rep-card-title">🛒 Purchases & Vendor Report</div>
              <div class="rep-card-desc">Inward purchase invoices, vendor-wise purchase volume aur item purchase rates.</div>
              <div class="rep-card-action">Open Report →</div>
            </div>

            <!-- Card 5: Accounts & Finance -->
            <div class="rep-hub-card" data-cat="accounts">
              <div class="rep-card-title">👥 Customer & Supplier Accounts</div>
              <div class="rep-card-desc">Customer receivables (bakaya ledger), supplier payables aur daily cash flow register.</div>
              <div class="rep-card-action">Open Report →</div>
            </div>

            <!-- Card 6: Profit & Loss Statement -->
            <div class="rep-hub-card" data-cat="pnl">
              <div class="rep-card-title">📊 Profit & Loss Statement</div>
              <div class="rep-card-desc">Business ka gross sales revenue, cost of goods (COGS) aur net profit/loss ki detail.</div>
              <div class="rep-card-action">Open Report →</div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- SCREEN 2: DETAILED REPORTING VIEW (SHOWN ONLY ON CARD SELECT) -->
        <!-- ======================================================== -->
        <div id="repDetailView" class="rep-detail-view hidden">
          <!-- Detail View Topbar with Back Button -->
          <header class="rep-detail-topbar">
            <div class="rep-detail-nav-left">
              <button id="btnBackToHub" class="rep-back-btn" title="Back to All Report Categories">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to Reports</span>
              </button>
              <div class="rep-detail-title-wrap">
                <div id="repDetailCatIcon" class="rep-detail-cat-icon"></div>
                <div>
                  <h1 id="repDetailCatTitle">Reports & Business Analytics</h1>
                  <p id="repDetailCatSubtitle">Showing detailed business reports and transactions</p>
                </div>
              </div>
            </div>

          </header>

          <!-- Sub-Report Selector Pills -->
          <div id="repSubPillsBar" class="rep-sub-pills-bar">
            <!-- Dynamically populated based on active category -->
          </div>

          <!-- Clean Professional Filters Bar (Live Auto-Update) -->
          <div class="rep-filter-panel">
            <div class="rep-filters-grid">
              <div class="rep-form-group">
                <label>From Date</label>
                <input type="date" id="repFromDate" class="rep-form-control">
              </div>
              <div class="rep-form-group">
                <label>To Date</label>
                <input type="date" id="repToDate" class="rep-form-control">
              </div>
              <div class="rep-form-group" id="repPartyFilterGroup">
                <label>Filter by Party</label>
                <select id="repPartySelect" class="rep-form-control">
                  <option value="">All Parties</option>
                </select>
              </div>
              <div class="rep-form-group" id="repCategoryFilterGroup">
                <label>Product Category</label>
                <select id="repCategorySelect" class="rep-form-control">
                  <option value="">All Categories</option>
                </select>
              </div>
              <div class="rep-form-group" id="repSubCategoryFilterGroup">
                <label>Sub Category</label>
                <select id="repSubCategorySelect" class="rep-form-control">
                  <option value="">All Sub Categories</option>
                </select>
              </div>
              <div class="rep-form-group" id="repAreaFilterGroup">
                <label>Territory / City</label>
                <select id="repAreaSelect" class="rep-form-control">
                  <option value="">All Territories</option>
                </select>
              </div>
              <div class="rep-form-group" id="repPaymentTypeGroup">
                <label>Payment Mode</label>
                <select id="repPaymentTypeSelect" class="rep-form-control">
                  <option value="All">All Modes</option>
                  <option value="Cash">Cash Only</option>
                  <option value="Credit">Credit Only</option>
                </select>
              </div>
            </div>
          </div>

          <!-- KPI Summary Cards Bar -->
          <div id="repKpiBar" class="rep-kpi-bar">
            <!-- Dynamically populated per report -->
          </div>

          <!-- Table Toolbar & Action Buttons -->
          <div class="rep-table-toolbar">
            <div class="rep-table-title-group">
              <h2 id="repCurrentReportTitle">Report Statement</h2>
              <p id="repCurrentReportSubtitle">Showing filtered transactions</p>
            </div>
            <div class="rep-actions-bar">
              <input type="text" id="repTableSearch" class="rep-form-control" placeholder="Quick search in table..." style="width: 220px;">
              
              <!-- Single Unified Export Dropdown (Excel or PDF) -->
              <div class="rep-export-dropdown-wrapper" id="repExportDropdownWrapper">
                <button type="button" id="btnRepExportMain" class="rep-action-btn export-btn" title="Export or Print Report">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Export</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left: 2px;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div class="rep-export-menu hidden" id="repExportMenu">
                  <button type="button" class="rep-export-item" id="btnExportExcelOpt">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#107c41" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="13"></line>
                      <line x1="8" y1="17" x2="16" y2="17"></line>
                    </svg>
                    <div>
                      <div class="rep-export-item-title">Excel Spreadsheet (.xlsx)</div>
                      <div class="rep-export-item-sub">Download formatted Excel sheet</div>
                    </div>
                  </button>
                  <button type="button" class="rep-export-item" id="btnExportPdfOpt">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <div>
                      <div class="rep-export-item-title">PDF / Print Document</div>
                      <div class="rep-export-item-sub">Save as PDF or Print statement</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Table Container -->
          <div class="rep-table-card">
            <div class="rep-table-scroll">
              <table id="repDataTable" class="rep-data-table">
                <thead id="repTableHead">
                  <!-- Dynamically populated -->
                </thead>
                <tbody id="repTableBody">
                  <!-- Dynamically populated -->
                </tbody>
                <tfoot id="repTableFoot">
                  <!-- Dynamically populated -->
                </tfoot>
              </table>
            </div>

            <!-- Table Pagination Bar -->
            <div class="rep-table-pagination" id="repTablePagination">
              <div class="rep-pag-info" id="repPagInfo">Showing 1 to 20 of 0 records</div>
              <div class="rep-pag-controls">
                <button type="button" class="rep-pag-btn" id="btnRepPagFirst" title="First Page">«</button>
                <button type="button" class="rep-pag-btn" id="btnRepPagPrev" title="Previous Page">‹ Prev</button>
                <span class="rep-pag-curr" id="repPagCurr">Page 1 of 1</span>
                <button type="button" class="rep-pag-btn" id="btnRepPagNext" title="Next Page">Next ›</button>
                <button type="button" class="rep-pag-btn" id="btnRepPagLast" title="Last Page">»</button>
              </div>
              <div class="rep-pag-size-wrapper">
                <span>Rows:</span>
                <select id="repPageSizeSelect" class="rep-pag-select" title="Rows per page">
                  <option value="15">15</option>
                  <option value="20" selected>20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Special Profit & Loss View (Hidden by default) -->
          <div id="repPnlCard" class="rep-pnl-card hidden">
            <!-- Dynamically populated -->
          </div>

          <!-- Hidden Print Area for High-Resolution Printing -->
          <div id="reportsPrintArea" class="rep-print-container"></div>
        </div>

      </div>
    `;
  }

  // Cache DOM References
  let dom = {};

  function cacheDom() {
    dom = {
      hubView: document.getElementById('repHubView'),
      detailView: document.getElementById('repDetailView'),
      btnBackToHub: document.getElementById('btnBackToHub'),
      detailCatIcon: document.getElementById('repDetailCatIcon'),
      detailCatTitle: document.getElementById('repDetailCatTitle'),
      detailCatSubtitle: document.getElementById('repDetailCatSubtitle'),

      catButtons: document.querySelectorAll('.rep-cat-btn'),
      hubCardsGrid: document.getElementById('repHubCardsGrid'),
      hubCards: document.querySelectorAll('.rep-hub-card'),
      subPillsBar: document.getElementById('repSubPillsBar'),
      presetButtons: document.querySelectorAll('.rep-date-preset-btn'),

      fromDate: document.getElementById('repFromDate'),
      toDate: document.getElementById('repToDate'),
      partySelect: document.getElementById('repPartySelect'),
      categorySelect: document.getElementById('repCategorySelect'),
      subCategorySelect: document.getElementById('repSubCategorySelect'),
      areaSelect: document.getElementById('repAreaSelect'),
      paymentTypeSelect: document.getElementById('repPaymentTypeSelect'),

      btnGenerate: document.getElementById('btnRepGenerate'),
      btnReset: document.getElementById('btnRepReset'),

      kpiBar: document.getElementById('repKpiBar'),
      currentReportTitle: document.getElementById('repCurrentReportTitle'),
      currentReportSubtitle: document.getElementById('repCurrentReportSubtitle'),
      tableSearch: document.getElementById('repTableSearch'),
      btnPrint: document.getElementById('btnRepPrint'),
      btnExcel: document.getElementById('btnRepExcel'),

      exportDropdownWrapper: document.getElementById('repExportDropdownWrapper'),
      btnExportMain: document.getElementById('btnRepExportMain'),
      exportMenu: document.getElementById('repExportMenu'),
      btnExportExcelOpt: document.getElementById('btnExportExcelOpt'),
      btnExportPdfOpt: document.getElementById('btnExportPdfOpt'),

      paginationBar: document.getElementById('repTablePagination'),
      pagInfo: document.getElementById('repPagInfo'),
      pagCurr: document.getElementById('repPagCurr'),
      btnPagFirst: document.getElementById('btnRepPagFirst'),
      btnPagPrev: document.getElementById('btnRepPagPrev'),
      btnPagNext: document.getElementById('btnRepPagNext'),
      btnPagLast: document.getElementById('btnRepPagLast'),
      pageSizeSelect: document.getElementById('repPageSizeSelect'),

      dataTable: document.getElementById('repDataTable'),
      tableHead: document.getElementById('repTableHead'),
      tableBody: document.getElementById('repTableBody'),
      tableFoot: document.getElementById('repTableFoot'),
      pnlCard: document.getElementById('repPnlCard'),
      printArea: document.getElementById('reportsPrintArea')
    };
  }

  // Update Dynamic Stats on the 6 Hub Cards
  function updateHubCardStats() {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const sales = state.masterData.sales || [];
      const purchases = state.masterData.purchases || [];
      const prods = state.masterData.products || [];
      const parties = state.masterData.parties || [];

      // 1. Today's Sales
      const todaySales = sales.filter(s => (s.entryDate || s.createdAt || '').slice(0, 10) === todayStr);
      const todayNet = todaySales.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
      const elToday = document.getElementById('statTodaySales');
      if (elToday) elToday.textContent = todaySales.length ? `${todaySales.length} Bills | ${formatMoney(todayNet)}` : '0 Bills Today';

      // 2. Total Sales
      const totalSalesNet = sales.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
      const elSales = document.getElementById('statSalesTotal');
      if (elSales) elSales.textContent = formatMoney(totalSalesNet);

      // 3. Stock Position
      let stockCostVal = 0;
      let totalQty = 0;
      prods.forEach(p => {
        const q = Number(p.stockQty || 0);
        totalQty += q;
        stockCostVal += (q * Number(p.purchasePrice || p.averageCost || 0));
      });
      const elInv = document.getElementById('statInventoryTotal');
      if (elInv) elInv.textContent = `${prods.length} Items | ${formatMoney(stockCostVal)}`;

      // 4. Purchases
      const totalPur = purchases.reduce((sum, p) => sum + Number(p.grandTotal || p.netAmount || 0), 0);
      const elPur = document.getElementById('statPurchaseTotal');
      if (elPur) elPur.textContent = `${purchases.length} Bills | ${formatMoney(totalPur)}`;

      // 5. Accounts
      let totalRec = 0;
      parties.forEach(p => {
        if (!p.partyType || p.partyType.toLowerCase().includes('customer')) {
          totalRec += Math.max(0, Number(p.currentBalance || p.openingBalance || 0));
        }
      });
      const elAcc = document.getElementById('statAccountsTotal');
      if (elAcc) elAcc.textContent = `Receivable: ${formatMoney(totalRec)}`;

      // 6. PnL
      const elPnl = document.getElementById('statPnlTotal');
      if (elPnl) {
        const margin = totalSalesNet > 0 ? (((totalSalesNet - stockCostVal) / totalSalesNet) * 100) : 0;
        elPnl.textContent = `${margin.toFixed(1)}% Est Margin`;
      }
    } catch (e) {
      console.warn('Could not compute hub card stats:', e);
    }
  }


  // Set Date Range by Preset
  function applyDatePreset(preset) {
    state.datePreset = preset;
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let from = '';
    let to = fmt(now);

    if (preset === 'today') {
      from = to;
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = fmt(y);
      to = from;
    } else if (preset === 'this-week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      from = fmt(d);
    } else if (preset === 'this-month') {
      from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    } else if (preset === 'last-month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      from = fmt(first);
      to = fmt(last);
    } else if (preset === 'this-year') {
      from = `${now.getFullYear()}-01-01`;
    } else if (preset === 'all') {
      from = '';
      to = '';
    }

    state.fromDate = from;
    state.toDate = to;
    if (dom.fromDate) dom.fromDate.value = from;
    if (dom.toDate) dom.toDate.value = to;

    dom.presetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
  }

  // Load Master Data into State
  async function loadMasterData() {
    try {
      // 1. Instant synchronous hydration from window.appData (if present)
      if (window.appData) {
        if (Array.isArray(window.appData.sales) && window.appData.sales.length) {
          state.masterData.sales = window.appData.sales;
        }
        if (Array.isArray(window.appData.purchases) && window.appData.purchases.length) {
          state.masterData.purchases = window.appData.purchases;
        }
        if (Array.isArray(window.appData.products) && window.appData.products.length) {
          state.masterData.products = window.appData.products;
        }
        if (Array.isArray(window.appData.sales_returns) && window.appData.sales_returns.length) {
          state.masterData.returns = window.appData.sales_returns;
        }
        if (Array.isArray(window.appData.product_categories) && window.appData.product_categories.length) {
          state.masterData.categories = window.appData.product_categories;
        }
        if (Array.isArray(window.appData.product_sub_categories) && window.appData.product_sub_categories.length) {
          state.masterData.subCategories = window.appData.product_sub_categories;
        }
      }

      // 2. Fetch fresh from Electron IPC APIs concurrently
      if (window.electronAPI) {
        const [sales, purchases, prods, ret, cats, subCats] = await Promise.all([
          window.electronAPI.getSales ? window.electronAPI.getSales() : [],
          window.electronAPI.getPurchases ? window.electronAPI.getPurchases() : [],
          window.electronAPI.getProducts ? window.electronAPI.getProducts() : [],
          window.electronAPI.getSaleReturns ? window.electronAPI.getSaleReturns() : [],
          window.electronAPI.getProductCategories ? window.electronAPI.getProductCategories() : [],
          window.electronAPI.getProductSubCategories ? window.electronAPI.getProductSubCategories() : []
        ]);
        if (sales && sales.length) state.masterData.sales = sales;
        if (purchases && purchases.length) state.masterData.purchases = purchases;
        if (prods && prods.length) state.masterData.products = prods;
        if (ret && ret.length) state.masterData.returns = ret;
        if (cats && cats.length) state.masterData.categories = cats;
        if (subCats && subCats.length) state.masterData.subCategories = subCats;
      }

      // 3. General Info (Parties, Areas, Company Info)
      if (window.generalInfoAPI) {
        const gi = await window.generalInfoAPI.getGeneralInfo?.();
        if (gi) {
          if (gi.parties && gi.parties.length) state.masterData.parties = gi.parties;
          if (gi.companyInfo) state.masterData.companyInfo = gi.companyInfo;
          if (gi.areas && gi.areas.length) state.masterData.areas = gi.areas;
        }
      } else {
        try {
          const cachedParties = JSON.parse(localStorage.getItem('st_parties') || '[]');
          if (cachedParties.length) state.masterData.parties = cachedParties;
          const cachedAreas = JSON.parse(localStorage.getItem('st_areas') || '[]');
          if (cachedAreas.length) state.masterData.areas = cachedAreas;
        } catch (_) {}
      }

      // 4. Accounts Vouchers (CRV, CPV)
      if (window.accountsAPI && window.accountsAPI.getAllVouchers) {
        state.masterData.vouchers = await window.accountsAPI.getAllVouchers() || [];
      } else {
        try {
          state.masterData.vouchers = JSON.parse(localStorage.getItem('st_accounts_vouchers') || '[]');
        } catch (_) {}
      }

      // 5. Enrich product categories & sub-categories if missing
      const catMap = {};
      for (const c of (state.masterData.categories || [])) {
        if (c && c.id) catMap[String(c.id)] = c.name;
      }
      const subCatMap = {};
      for (const sc of (state.masterData.subCategories || [])) {
        if (sc && sc.id) subCatMap[String(sc.id)] = sc.name;
      }
      state.masterData.products.forEach(p => {
        if (!p.categoryName && (p.categoryId || p.category_id)) {
          p.categoryName = catMap[String(p.categoryId || p.category_id)] || 'General';
        }
        if (!p.subCategoryName && (p.subCategoryId || p.sub_category_id)) {
          p.subCategoryName = subCatMap[String(p.subCategoryId || p.sub_category_id)] || '--';
        }
      });

      populateFilterDropdowns();
      updateHubCardStats();
    } catch (err) {
      console.warn('Error loading master data for reports:', err);
    }
  }

  // Populate Filter Dropdowns
  function populateFilterDropdowns() {
    // 1. Parties
    if (dom.partySelect) {
      const parties = state.masterData.parties || [];
      const curVal = dom.partySelect.value;
      dom.partySelect.innerHTML = '<option value="">All Parties</option>' +
        parties.map(p => `<option value="${p.id}">${p.name} (${p.partyTypeName || 'Party'})</option>`).join('');
      if (curVal) dom.partySelect.value = curVal;
    }

    // 2. Categories
    if (dom.categorySelect) {
      const cats = state.masterData.categories || [];
      const curVal = dom.categorySelect.value;
      dom.categorySelect.innerHTML = '<option value="">All Categories</option>' +
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (curVal) dom.categorySelect.value = curVal;
    }

    // 3. Sub-categories
    populateSubCategories();

    // 4. Areas
    if (dom.areaSelect) {
      const areas = state.masterData.areas || [];
      const curVal = dom.areaSelect.value;
      dom.areaSelect.innerHTML = '<option value="">All Territories</option>' +
        areas.map(a => `<option value="${a.name}">${a.name} (${a.city || 'Territory'})</option>`).join('');
      if (curVal) dom.areaSelect.value = curVal;
    }
  }

  function populateSubCategories() {
    if (!dom.subCategorySelect) return;
    const selectedCat = dom.categorySelect ? dom.categorySelect.value : '';
    const subCats = state.masterData.subCategories || [];
    const curVal = dom.subCategorySelect.value;

    const filteredSubs = selectedCat
      ? subCats.filter(sc => String(sc.categoryId) === String(selectedCat))
      : subCats;

    dom.subCategorySelect.innerHTML = '<option value="">All Sub Categories</option>' +
      filteredSubs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    if (curVal && filteredSubs.some(s => String(s.id) === String(curVal))) {
      dom.subCategorySelect.value = curVal;
    }
  }

  // Render Sub-report Pills Bar
  function renderSubPills() {
    const pills = reportCatalog[state.activeCategory] || [];
    dom.subPillsBar.innerHTML = pills.map(p => `
      <button class="rep-pill-btn ${p.id === state.activeReportId ? 'active' : ''}" data-report-id="${p.id}">
        ${p.label}
      </button>
    `).join('');

    dom.subPillsBar.querySelectorAll('.rep-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeReportId = btn.dataset.reportId;
        renderSubPills();
        generateActiveReport();
      });
    });
  }

  // Navigate to Cards Hub View (Level 1: Selection Cards Screen)
  function showCardsHubView() {
    if (dom.detailView) dom.detailView.classList.add('hidden');
    if (dom.hubView) dom.hubView.classList.remove('hidden');
    updateHubCardStats();
  }

  // Navigate to Category Detailed Reporting (Level 2: Reports & Filters Screen)
  function openCategoryReport(cat) {
    if (dom.hubView) dom.hubView.classList.add('hidden');
    if (dom.detailView) dom.detailView.classList.remove('hidden');
    switchCategory(cat);
  }

  // Switch Main Category
  function switchCategory(cat) {
    state.activeCategory = cat;
    const catalog = reportCatalog[cat] || [];
    state.activeReportId = catalog.length ? catalog[0].id : '';

    if (dom.catButtons) {
      dom.catButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.cat === cat);
      });
    }

    if (dom.hubCards) {
      dom.hubCards.forEach(c => {
        c.classList.toggle('active', c.dataset.cat === cat);
      });
    }

    const meta = categoryMeta[cat] || {
      title: 'Reports & Business Analytics',
      subtitle: 'Showing detailed business reports and transactions',
      icon: '',
      iconBg: 'bg-blue-soft text-blue'
    };

    if (dom.detailCatTitle) dom.detailCatTitle.textContent = meta.title;
    if (dom.detailCatSubtitle) dom.detailCatSubtitle.textContent = meta.subtitle;
    if (dom.detailCatIcon) {
      dom.detailCatIcon.className = `rep-detail-cat-icon ${meta.iconBg}`;
      dom.detailCatIcon.innerHTML = meta.icon;
    }

    if (cat === 'today') {
      applyDatePreset('today');
    }

    renderSubPills();
    generateActiveReport();
  }

  // ========================================================
  // REPORT EXECUTION & RENDERING
  // ========================================================
  function generateActiveReport() {
    const filters = {
      fromDate: dom.fromDate ? dom.fromDate.value : '',
      toDate: dom.toDate ? dom.toDate.value : '',
      partyId: dom.partySelect ? dom.partySelect.value : '',
      categoryId: dom.categorySelect ? dom.categorySelect.value : '',
      subCategoryId: dom.subCategorySelect ? dom.subCategorySelect.value : '',
      areaName: dom.areaSelect ? dom.areaSelect.value : '',
      paymentType: dom.paymentTypeSelect ? dom.paymentTypeSelect.value : 'All'
    };

    const repId = state.activeReportId;
    let result = null;

    if (repId === 'today-register') {
      result = window.ReportsEngine.generateTodaySalesRegisterReport(state.masterData.sales, filters);
    } else if (repId === 'today-summary') {
      result = window.ReportsEngine.generateTodayBusinessSummaryReport(state.masterData, filters);
    } else if (repId === 'bill-wise-sales') {
      result = window.ReportsEngine.generateBillWiseSalesReport(state.masterData.sales, filters);
    } else if (repId === 'party-wise-sales') {
      result = window.ReportsEngine.generatePartyWiseSalesReport(state.masterData.sales, state.masterData.parties, filters);
    } else if (repId === 'item-wise-sales') {
      result = window.ReportsEngine.generateItemWiseSalesReport(state.masterData.sales, state.masterData.products, filters);
    } else if (repId === 'territory-wise-sales') {
      result = window.ReportsEngine.generateTerritoryWiseSalesReport(state.masterData.sales, state.masterData.parties, state.masterData.areas, filters);
    } else if (repId === 'bill-wise-profit') {
      result = window.ReportsEngine.generateBillWiseProfitReport(state.masterData.sales, filters);
    } else if (repId === 'sales-returns') {
      result = window.ReportsEngine.generateSalesReturnReport(state.masterData.returns, filters);
    } else if (repId === 'bill-wise-purchases') {
      result = window.ReportsEngine.generateBillWisePurchaseReport(state.masterData.purchases, filters);
    } else if (repId === 'supplier-wise-purchases') {
      result = window.ReportsEngine.generateSupplierWisePurchaseReport(state.masterData.purchases, state.masterData.parties, filters);
    } else if (repId === 'item-wise-purchases') {
      result = window.ReportsEngine.generateItemWisePurchaseReport(state.masterData.purchases, state.masterData.products, filters);
    } else if (repId === 'stock-position') {
      result = window.ReportsEngine.generateStockPositionReport(state.masterData.products, state.masterData.categories, filters);
    } else if (repId === 'low-stock') {
      result = window.ReportsEngine.generateLowStockReport(state.masterData.products, state.masterData.categories, filters);
    } else if (repId === 'zero-stock') {
      result = window.ReportsEngine.generateOutOfStockReport(state.masterData.products, state.masterData.categories, filters);
    } else if (repId === 'category-stock') {
      result = window.ReportsEngine.generateCategoryStockReport(state.masterData.products, state.masterData.categories, filters);
    } else if (repId === 'customer-receivables') {
      result = window.ReportsEngine.generateCustomerReceivablesReport(state.masterData.parties, filters);
    } else if (repId === 'supplier-payables') {
      result = window.ReportsEngine.generateSupplierPayablesReport(state.masterData.parties, filters);
    } else if (repId === 'crv-report') {
      result = window.ReportsEngine.generateCRVReport(state.masterData.vouchers, filters);
    } else if (repId === 'cpv-report') {
      result = window.ReportsEngine.generateCPVReport(state.masterData.vouchers, filters);
    } else if (repId === 'cash-book') {
      result = window.ReportsEngine.generateCashBookReport(state.masterData.vouchers, state.masterData.sales, state.masterData.purchases, filters);
    } else if (repId === 'profit-loss') {
      result = window.ReportsEngine.generateProfitAndLossReport(state.masterData.sales, state.masterData.purchases, state.masterData.vouchers, state.masterData.returns, filters);
    }

    state.currentReportData = result;

    // Update Header Titles
    if (result) {
      dom.currentReportTitle.textContent = result.title;
      const count = result.rows ? result.rows.length : (result.metrics ? 1 : 0);
      dom.currentReportSubtitle.textContent = `Generated ${count} records based on selected parameters`;
    }

    // Toggle P&L Card vs Table
    if (repId === 'profit-loss') {
      dom.pnlCard.classList.remove('hidden');
      renderProfitAndLossView(result);
    } else {
      dom.pnlCard.classList.add('hidden');
    }

    renderReportTable(result);
    renderKpiCards(result);
  }

  // Render KPI Cards for all 19 reports
  function renderKpiCards(res) {
    if (!res) {
      dom.kpiBar.innerHTML = '';
      return;
    }

    const t = res.totals || {};
    let cards = [];
    const repId = state.activeReportId;

    if (repId === 'today-register') {
      cards = [
        { title: "Today's Bills", val: t.records || 0, color: 'blue' },
        { title: "Today's Gross Sales", val: formatMoney(t.gross), color: 'blue' },
        { title: "Discounts Given", val: formatMoney(t.discount), color: 'amber' },
        { title: "Net Revenue Today", val: formatMoney(t.net), color: 'green' },
        { title: "Cash Recovered", val: formatMoney(t.paid), color: 'green' },
        { title: "Credit Given (Due)", val: formatMoney(t.balance), color: 'red' }
      ];
    } else if (repId === 'today-summary') {
      const m = res.metrics || {};
      cards = [
        { title: `Today's Sales (${m.todaySalesCount || 0} Bills)`, val: formatMoney(m.todaySalesNet), color: 'blue' },
        { title: "Counter Cash In", val: formatMoney(m.todaySalesCash), color: 'green' },
        { title: "Purchases Paid", val: formatMoney(m.todayPurchasesPaid), color: 'amber' },
        { title: "Returns Refunded", val: formatMoney(m.todayReturnsAmount), color: 'red' },
        { title: "CRV Receipts", val: formatMoney(m.todayCrvInflow), color: 'green' },
        { title: "Net Cash In Drawer", val: formatMoney(m.netDayCash), color: (m.netDayCash >= 0 ? 'green' : 'red') }
      ];
    } else if (repId === 'bill-wise-sales') {
      cards = [
        { title: 'Total Bills', val: t.records || 0, color: 'blue' },
        { title: 'Gross Sales', val: formatMoney(t.gross), color: 'blue' },
        { title: 'Total Discounts', val: formatMoney(t.discount), color: 'amber' },
        { title: 'Net Sales Revenue', val: formatMoney(t.net), color: 'green' },
        { title: 'Cash Recovered', val: formatMoney(t.paid), color: 'green' },
        { title: 'Balance Due (Receivable)', val: formatMoney(t.balance), color: 'red' }
      ];
    } else if (repId === 'party-wise-sales') {
      cards = [
        { title: 'Active Parties', val: t.records || 0, color: 'blue' },
        { title: 'Total Invoices', val: t.billsCount || 0, color: 'blue' },
        { title: 'Net Sales Volume', val: formatMoney(t.net), color: 'green' },
        { title: 'Cash Recovered', val: formatMoney(t.paid), color: 'green' },
        { title: 'Outstanding Balance', val: formatMoney(t.balance), color: 'red' }
      ];
    } else if (repId === 'item-wise-sales') {
      cards = [
        { title: 'Unique Items Sold', val: t.records || 0, color: 'blue' },
        { title: 'Total Quantity Sold', val: (t.totalQtySold || 0).toLocaleString(), color: 'blue' },
        { title: 'Total Cost (COGS)', val: formatMoney(t.purchaseCostTotal), color: 'amber' },
        { title: 'Net Sales Revenue', val: formatMoney(t.netRevenue), color: 'green' },
        { title: 'Gross Profit', val: `${formatMoney(t.totalProfit)} (${(t.overallMargin || 0).toFixed(1)}%)`, color: 'green' }
      ];
    } else if (repId === 'territory-wise-sales') {
      cards = [
        { title: 'Territories Covered', val: t.records || 0, color: 'blue' },
        { title: 'Total Bills', val: (t.billsCount || 0).toLocaleString(), color: 'blue' },
        { title: 'Net Sales Volume', val: formatMoney(t.net), color: 'green' },
        { title: 'Cash Recovered', val: formatMoney(t.paid), color: 'green' },
        { title: 'Outstanding Balance', val: formatMoney(t.balance), color: 'red' }
      ];
    } else if (repId === 'bill-wise-profit') {
      cards = [
        { title: 'Total Bills Analyzed', val: t.records || 0, color: 'blue' },
        { title: 'Total Net Revenue', val: formatMoney(t.revenue), color: 'blue' },
        { title: 'Total Goods Cost', val: formatMoney(t.cost), color: 'amber' },
        { title: 'Net Trading Profit', val: formatMoney(t.profit), color: 'green' },
        { title: 'Average Margin', val: `${(t.margin || 0).toFixed(1)}%`, color: 'purple' }
      ];
    } else if (repId === 'sales-returns') {
      cards = [
        { title: 'Return Vouchers', val: t.records || 0, color: 'blue' },
        { title: 'Items Returned', val: (t.itemsCount || 0).toLocaleString(), color: 'amber' },
        { title: 'Total Refunds Paid', val: formatMoney(t.totalRefund), color: 'red' }
      ];
    } else if (repId === 'bill-wise-purchases') {
      cards = [
        { title: 'Purchase Bills', val: t.records || 0, color: 'blue' },
        { title: 'Total Freight Expn', val: formatMoney(t.freight), color: 'amber' },
        { title: 'Special Discounts', val: formatMoney(t.discount), color: 'green' },
        { title: 'Total Purchases Value', val: formatMoney(t.grandTotal), color: 'blue' }
      ];
    } else if (repId === 'supplier-wise-purchases') {
      cards = [
        { title: 'Suppliers / Vendors', val: t.records || 0, color: 'blue' },
        { title: 'Total Vouchers Count', val: (t.vouchersCount || 0).toLocaleString(), color: 'blue' },
        { title: 'Total Spend Volume', val: formatMoney(t.totalPurchases), color: 'green' }
      ];
    } else if (repId === 'item-wise-purchases') {
      cards = [
        { title: 'Items Purchased', val: t.records || 0, color: 'blue' },
        { title: 'Total Units Inward', val: (t.totalQtyInward || 0).toLocaleString(), color: 'blue' },
        { title: 'Total Spend Amount', val: formatMoney(t.totalSpend), color: 'green' }
      ];
    } else if (repId === 'stock-position') {
      cards = [
        { title: 'Total Product Items', val: t.records || 0, color: 'blue' },
        { title: 'Total Units in Stock', val: (t.totalStockQty || 0).toLocaleString(), color: 'blue' },
        { title: 'Total Stock Cost Value', val: formatMoney(t.totalCostVal), color: 'amber' },
        { title: 'Total Retail Value', val: formatMoney(t.totalRetailVal), color: 'green' },
        { title: 'Potential Margin Value', val: formatMoney(t.potentialProfit), color: 'purple' }
      ];
    } else if (repId === 'low-stock') {
      cards = [
        { title: 'Items Below Min Stock', val: t.records || 0, color: 'red' },
        { title: 'Total Shortage Pieces', val: (t.totalShortage || 0).toLocaleString(), color: 'red' },
        { title: 'Estimated Restock Cost', val: formatMoney(t.totalOrderEst), color: 'amber' }
      ];
    } else if (repId === 'zero-stock') {
      cards = [
        { title: 'Zero Stock Items', val: t.records || 0, color: 'red' },
        { title: 'Status', val: 'Reorder Needed', color: 'amber' }
      ];
    } else if (repId === 'category-stock') {
      cards = [
        { title: 'Categories Evaluated', val: t.records || 0, color: 'blue' },
        { title: 'Total Stock Units', val: (t.totalQty || 0).toLocaleString(), color: 'blue' },
        { title: 'Total Stock Cost Value', val: formatMoney(t.costValue), color: 'amber' },
        { title: 'Total Retail Valuation', val: formatMoney(t.retailValue), color: 'green' },
        { title: 'Total Gross Margin', val: `${formatMoney(t.margin)} (${(t.marginPct || 0).toFixed(1)}%)`, color: 'purple' }
      ];
    } else if (repId === 'customer-receivables') {
      cards = [
        { title: 'Customers with Due Balances', val: t.records || 0, color: 'red' },
        { title: 'Total Outstanding Receivables', val: formatMoney(t.totalReceivable), color: 'red' }
      ];
    } else if (repId === 'supplier-payables') {
      cards = [
        { title: 'Suppliers Payable', val: t.records || 0, color: 'amber' },
        { title: 'Total Outstanding Payables', val: formatMoney(t.totalPayable), color: 'amber' }
      ];
    } else if (repId === 'crv-report') {
      cards = [
        { title: 'Receipt Vouchers (CRV)', val: t.records || 0, color: 'blue' },
        { title: 'Discounts Allowed', val: formatMoney(t.discount), color: 'amber' },
        { title: 'Net Cash Recovered', val: formatMoney(t.amount), color: 'green' },
        { title: 'Total Credit Volume', val: formatMoney(t.netAmount), color: 'green' }
      ];
    } else if (repId === 'cpv-report') {
      cards = [
        { title: 'Payment Vouchers (CPV)', val: t.records || 0, color: 'blue' },
        { title: 'Discounts Received', val: formatMoney(t.discount), color: 'green' },
        { title: 'Cash Disbursed', val: formatMoney(t.amount), color: 'red' },
        { title: 'Total Debit Volume', val: formatMoney(t.netAmount), color: 'red' }
      ];
    } else if (repId === 'cash-book') {
      cards = [
        { title: 'Days Recorded', val: t.records || 0, color: 'blue' },
        { title: 'Total Cash Receipts (CRV)', val: formatMoney(t.crvReceived), color: 'green' },
        { title: 'Total Counter Cash Sales', val: formatMoney(t.cashSales), color: 'green' },
        { title: 'Total Cash Inflow', val: formatMoney(t.totalIn), color: 'green' },
        { title: 'Total Cash Outflow (CPV)', val: formatMoney(t.totalOut), color: 'red' },
        { title: 'Net Cash In Hand', val: formatMoney(t.netCash), color: t.netCash >= 0 ? 'green' : 'red' }
      ];
    } else if (repId === 'profit-loss') {
      const m = res.metrics || {};
      cards = [
        { title: 'Gross Trading Sales', val: formatMoney(m.grossSales), color: 'blue' },
        { title: 'Net Trading Revenue', val: formatMoney(m.netSales), color: 'blue' },
        { title: 'Cost of Goods (COGS)', val: formatMoney(m.cogs), color: 'amber' },
        { title: 'Gross Trading Profit', val: formatMoney(m.grossProfit), color: m.grossProfit >= 0 ? 'green' : 'red' },
        { title: 'Profit Margin', val: `${(m.profitMargin || 0).toFixed(2)}%`, color: 'purple' }
      ];
    } else {
      cards = [
        { title: 'Total Records', val: t.records || 0, color: 'blue' },
        { title: 'Total Volume', val: formatMoney(t.grandTotal || t.totalPurchases || t.netAmount || t.totalRefund || 0), color: 'green' }
      ];
    }

    dom.kpiBar.innerHTML = cards.map(c => `
      <div class="rep-kpi-card">
        <span class="rep-kpi-title">${c.title}</span>
        <span class="rep-kpi-val ${c.color}">${c.val}</span>
      </div>
    `).join('');
  }

  // Helper to build table headers, body rows, and footer totals
  function buildTableMarkup(res, rows, startIdx = 0) {
    if (!res) return { th: '', tb: '', tf: '' };
    const t = res.totals || {};
    const repId = state.activeReportId;

    let th = '';
    let tb = '';
    let tf = '';

    // 1.0 Today's Sales Register & Bill-wise Sales
    if (repId === 'today-register' || repId === 'bill-wise-sales') {
      th = `
        <tr>
          <th class="text-center" style="width: 90px;">Date</th>
          <th class="text-center" style="width: 100px;">Bill #</th>
          <th class="text-left">Customer Name</th>
          <th class="text-left" style="width: 110px;">Territory</th>
          <th class="text-center" style="width: 80px;">Mode</th>
          <th class="text-center" style="width: 70px;">Items</th>
          <th class="text-right" style="width: 110px;">Gross</th>
          <th class="text-right" style="width: 90px;">Discount</th>
          <th class="text-right" style="width: 120px;">Net Total</th>
          <th class="text-right" style="width: 110px;">Paid</th>
          <th class="text-right" style="width: 110px;">Balance</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center font-num">${r.date}</td>
          <td class="text-center font-num font-bold text-primary">${r.voucherNo}</td>
          <td class="text-left font-bold">${window.escapeHtml ? window.escapeHtml(r.partyTitle) : r.partyTitle}<div style="font-size: 0.725rem; color: #64748b;">${r.phone}</div></td>
          <td class="text-left">${window.escapeHtml ? window.escapeHtml(r.areaName) : r.areaName}</td>
          <td class="text-center"><span class="rep-badge ${r.paymentType === 'Cash' ? 'rep-badge-green' : 'rep-badge-amber'}">${r.paymentType}</span></td>
          <td class="text-center font-num font-bold">${r.itemCount}</td>
          <td class="text-right font-num">${formatMoney(r.gross)}</td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.discount)}</td>
          <td class="text-right font-num rep-amount-primary font-bold">${formatMoney(r.net)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.paid)}</td>
          <td class="text-right font-num ${r.balance > 0 ? 'rep-amount-danger' : 'rep-amount-muted'}"><strong>${formatMoney(r.balance)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTALS (${t.records || 0} Bills)</strong></td>
          <td class="text-center font-num"><strong>${t.itemsCount || 0}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.gross)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.discount)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.net)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.paid)}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.balance)}</strong></td>
        </tr>
      `;
    }

    // 1.0b Today's Day End Register Summary
    else if (repId === 'today-summary') {
      th = `
        <tr>
          <th class="text-center" style="width: 55px;">Sr #</th>
          <th class="text-center" style="width: 75px;">Time</th>
          <th class="text-center" style="width: 140px;">Activity Type</th>
          <th class="text-center" style="width: 110px;">Voucher / Bill #</th>
          <th class="text-left">Party / Account Title</th>
          <th class="text-left" style="width: 160px;">Details / Mode</th>
          <th class="text-right" style="width: 130px;">Cash Inflow (+)</th>
          <th class="text-right" style="width: 130px;">Cash Outflow (-)</th>
          <th class="text-right" style="width: 120px;">Credit Balance</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center font-num text-secondary">${i + 1}</td>
          <td class="text-center font-num">${r.time}</td>
          <td class="text-center"><span class="rep-badge ${r.type.includes('Sale') ? 'rep-badge-blue' : r.type.includes('Return') ? 'rep-badge-red' : r.type.includes('Purchase') ? 'rep-badge-amber' : 'rep-badge-green'}">${r.type}</span></td>
          <td class="text-center font-num font-bold text-primary">${r.refNo}</td>
          <td class="text-left font-bold">${window.escapeHtml ? window.escapeHtml(r.party) : r.party}</td>
          <td class="text-left" style="font-size: 0.775rem; color: #475569;">${r.details}</td>
          <td class="text-right font-num font-bold ${r.inflow > 0 ? 'rep-amount-success' : 'rep-amount-muted'}">${r.inflow > 0 ? `+ ${formatMoney(r.inflow)}` : '--'}</td>
          <td class="text-right font-num font-bold ${r.outflow > 0 ? 'rep-amount-danger' : 'rep-amount-muted'}">${r.outflow > 0 ? `- ${formatMoney(r.outflow)}` : '--'}</td>
          <td class="text-right font-num ${r.balance > 0 ? 'rep-amount-danger' : 'rep-amount-muted'}">${r.balance > 0 ? formatMoney(r.balance) : '--'}</td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="6" class="text-left"><strong>DAY REGISTER TOTALS (${t.records || 0} Transactions)</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>+ ${formatMoney(t.totalInflow)}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>- ${formatMoney(t.totalOutflow)}</strong></td>
          <td class="text-right font-num ${t.netDayCash >= 0 ? 'rep-amount-success' : 'rep-amount-danger'}"><strong>Net: ${formatMoney(t.netDayCash)}</strong></td>
        </tr>
      `;
    }

    // 1.2 Party-wise Sales
    else if (repId === 'party-wise-sales') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Customer Name</th>
          <th class="text-center" style="width: 120px;">Party Type</th>
          <th class="text-left" style="width: 140px;">Territory / City</th>
          <th class="text-center" style="width: 120px;">Phone</th>
          <th class="text-center" style="width: 90px;">Invoices</th>
          <th class="text-right" style="width: 120px;">Gross Sales</th>
          <th class="text-right" style="width: 100px;">Discount</th>
          <th class="text-right" style="width: 130px;">Net Sales</th>
          <th class="text-right" style="width: 120px;">Cash Paid</th>
          <th class="text-right" style="width: 130px;">Balance Due</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-center"><span class="rep-badge rep-badge-blue">${r.partyType}</span></td>
          <td class="text-left">${r.areaName}</td>
          <td class="text-center">${r.phone}</td>
          <td class="text-center font-num">${r.billsCount}</td>
          <td class="text-right font-num">${formatMoney(r.gross)}</td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.discount)}</td>
          <td class="text-right font-num rep-amount-primary">${formatMoney(r.net)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.paid)}</td>
          <td class="text-right font-num ${r.balance > 0 ? 'rep-amount-danger' : 'rep-amount-muted'}"><strong>${formatMoney(r.balance)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTALS (${t.records || 0} Parties)</strong></td>
          <td class="text-center font-num"><strong>${t.billsCount || 0}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.gross)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.discount)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.net)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.paid)}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.balance)}</strong></td>
        </tr>
      `;
    }

    // 1.3 Item-wise Sales
    else if (repId === 'item-wise-sales') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-center" style="width: 90px;">Code</th>
          <th class="text-left">Product Title</th>
          <th class="text-left" style="width: 130px;">Category</th>
          <th class="text-right" style="width: 90px;">Pack Qty</th>
          <th class="text-right" style="width: 100px;">Units Sold</th>
          <th class="text-right" style="width: 120px;">Cost (COGS)</th>
          <th class="text-right" style="width: 120px;">Net Revenue</th>
          <th class="text-right" style="width: 120px;">Profit (Rs.)</th>
          <th class="text-right" style="width: 90px;">Margin %</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-center"><strong>${r.productCode}</strong></td>
          <td class="text-left"><strong>${r.productTitle}</strong></td>
          <td class="text-left">${r.categoryName}</td>
          <td class="text-right font-num">${r.packQtySold.toLocaleString()}</td>
          <td class="text-right font-num rep-num-bold">${r.totalQtySold.toLocaleString()}</td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.purchaseCostTotal)}</td>
          <td class="text-right font-num rep-amount-primary">${formatMoney(r.netRevenue)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.totalProfit)}</td>
          <td class="text-right font-num"><span class="rep-badge rep-badge-green">${r.marginPercent.toFixed(1)}%</span></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTALS (${t.records || 0} Items)</strong></td>
          <td class="text-right font-num"><strong>${(t.totalQtySold || 0).toLocaleString()}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.purchaseCostTotal)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.netRevenue)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.totalProfit)}</strong></td>
          <td class="text-right font-num"><strong class="rep-badge rep-badge-green">${(t.overallMargin || 0).toFixed(1)}%</strong></td>
        </tr>
      `;
    }

    // 1.4 Territory-wise Sales
    else if (repId === 'territory-wise-sales') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Territory / Area Name</th>
          <th class="text-center" style="width: 100px;">Total Bills</th>
          <th class="text-right" style="width: 130px;">Gross Sales</th>
          <th class="text-right" style="width: 110px;">Discount</th>
          <th class="text-right" style="width: 140px;">Net Sales Revenue</th>
          <th class="text-right" style="width: 130px;">Cash Paid</th>
          <th class="text-right" style="width: 140px;">Balance Due</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-left"><strong>${r.areaName}</strong></td>
          <td class="text-center font-num">${r.billsCount}</td>
          <td class="text-right font-num">${formatMoney(r.gross)}</td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.discount)}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.net)}</strong></td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.paid)}</td>
          <td class="text-right font-num ${r.balance > 0 ? 'rep-amount-danger' : 'rep-amount-muted'}"><strong>${formatMoney(r.balance)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="2" class="text-left"><strong>TOTALS (${t.records || 0} Territories)</strong></td>
          <td class="text-center font-num"><strong>${t.billsCount || 0}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.gross || 0)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.discount || 0)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.net || 0)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.paid || 0)}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.balance || 0)}</strong></td>
        </tr>
      `;
    }

    // 1.5 Bill-wise Profit
    else if (repId === 'bill-wise-profit') {
      th = `
        <tr>
          <th class="text-center" style="width: 90px;">Date</th>
          <th class="text-center" style="width: 100px;">Bill #</th>
          <th class="text-left">Customer Name</th>
          <th class="text-left" style="width: 120px;">Territory</th>
          <th class="text-center" style="width: 80px;">Items</th>
          <th class="text-right" style="width: 130px;">Sale Net Value</th>
          <th class="text-right" style="width: 130px;">Goods Cost (COGS)</th>
          <th class="text-right" style="width: 130px;">Gross Profit</th>
          <th class="text-right" style="width: 100px;">Margin %</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center">${r.date}</td>
          <td class="text-center"><strong>${r.voucherNo}</strong></td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-left">${r.areaName}</td>
          <td class="text-center font-num">${r.itemCount}</td>
          <td class="text-right font-num rep-amount-primary">${formatMoney(r.billNet)}</td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.billCost)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.profit)}</td>
          <td class="text-right font-num"><span class="rep-badge rep-badge-green">${r.margin.toFixed(1)}%</span></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTALS (${t.records || 0} Bills)</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.revenue)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.cost)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.profit)}</strong></td>
          <td class="text-right font-num"><strong class="rep-badge rep-badge-green">${(t.margin || 0).toFixed(1)}%</strong></td>
        </tr>
      `;
    }

    // 1.6 Sales Returns
    else if (repId === 'sales-returns') {
      th = `
        <tr>
          <th class="text-center" style="width: 90px;">Date</th>
          <th class="text-center" style="width: 110px;">Return #</th>
          <th class="text-center" style="width: 110px;">Orig Bill #</th>
          <th class="text-left">Customer Name</th>
          <th class="text-center" style="width: 90px;">Items</th>
          <th class="text-right" style="width: 140px;">Net Refund Amount</th>
          <th class="text-left">Remarks / Reason</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center">${r.date}</td>
          <td class="text-center"><strong>${r.returnNo}</strong></td>
          <td class="text-center">${r.origVoucherNo}</td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-center font-num">${r.itemsCount}</td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(r.refundAmount)}</strong></td>
          <td class="text-left">${r.remarks}</td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="4" class="text-left"><strong>TOTAL RETURNS (${t.records || 0} Vouchers)</strong></td>
          <td class="text-center font-num"><strong>${t.itemsCount || 0}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.totalRefund || 0)}</strong></td>
          <td></td>
        </tr>
      `;
    }

    // 2.1 Bill-wise Purchases
    else if (repId === 'bill-wise-purchases') {
      th = `
        <tr>
          <th class="text-center" style="width: 95px;">Date</th>
          <th class="text-center" style="width: 110px;">Voucher #</th>
          <th class="text-center" style="width: 110px;">Manual Inv #</th>
          <th class="text-left">Supplier / Vendor Name</th>
          <th class="text-left" style="width: 130px;">Store</th>
          <th class="text-right" style="width: 110px;">Freight / Expn</th>
          <th class="text-right" style="width: 110px;">Discount</th>
          <th class="text-right" style="width: 140px;">Grand Total</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center">${r.date}</td>
          <td class="text-center"><strong>${r.voucherNo}</strong></td>
          <td class="text-center">${r.manualNo}</td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-left">${r.storeTitle}</td>
          <td class="text-right font-num">${formatMoney(r.freight)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.discount)}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.grandTotal)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTAL PURCHASES (${t.records || 0} Vouchers)</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.freight || 0)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.discount || 0)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.grandTotal || 0)}</strong></td>
        </tr>
      `;
    }

    // 2.2 Supplier-wise Purchases
    else if (repId === 'supplier-wise-purchases') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Supplier / Vendor Name</th>
          <th class="text-left" style="width: 150px;">Contact Person</th>
          <th class="text-center" style="width: 130px;">Phone</th>
          <th class="text-left" style="width: 130px;">City</th>
          <th class="text-center" style="width: 110px;">Vouchers</th>
          <th class="text-right" style="width: 160px;">Total Inward Purchases</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-left">${r.contactPerson}</td>
          <td class="text-center">${r.phone}</td>
          <td class="text-left">${r.city}</td>
          <td class="text-center font-num">${r.vouchersCount}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.totalPurchases)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTALS (${t.records || 0} Suppliers)</strong></td>
          <td class="text-center font-num"><strong>${t.vouchersCount || 0}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.totalPurchases || 0)}</strong></td>
        </tr>
      `;
    }

    // 2.3 Item-wise Purchases
    else if (repId === 'item-wise-purchases') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-center" style="width: 90px;">Code</th>
          <th class="text-left">Product Title</th>
          <th class="text-left" style="width: 130px;">Category</th>
          <th class="text-right" style="width: 90px;">Packs</th>
          <th class="text-right" style="width: 90px;">Units</th>
          <th class="text-right" style="width: 80px;">Bonus</th>
          <th class="text-right" style="width: 100px;">Total Qty</th>
          <th class="text-right" style="width: 130px;">Total Spend</th>
          <th class="text-right" style="width: 110px;">Avg Unit Cost</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-center"><strong>${r.productCode}</strong></td>
          <td class="text-left"><strong>${r.productTitle}</strong></td>
          <td class="text-left">${r.categoryName}</td>
          <td class="text-right font-num">${r.totalPacksInward.toLocaleString()}</td>
          <td class="text-right font-num">${r.totalUnitsInward.toLocaleString()}</td>
          <td class="text-right font-num rep-amount-muted">${r.totalBonus.toLocaleString()}</td>
          <td class="text-right font-num rep-num-bold">${r.totalQtyInward.toLocaleString()}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.totalSpend)}</strong></td>
          <td class="text-right font-num">${formatMoney(r.avgCost)}</td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="7" class="text-left"><strong>TOTALS (${t.records || 0} Items)</strong></td>
          <td class="text-right font-num"><strong>${(t.totalQtyInward || 0).toLocaleString()}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.totalSpend || 0)}</strong></td>
          <td></td>
        </tr>
      `;
    }

    // 3.1 Stock Position
    else if (repId === 'stock-position') {
      th = `
        <tr>
          <th class="text-center" style="width: 50px;">Sr #</th>
          <th class="text-center" style="width: 80px;">Code</th>
          <th class="text-left">Product Title</th>
          <th class="text-left" style="width: 120px;">Category</th>
          <th class="text-left" style="width: 120px;">Sub Category</th>
          <th class="text-center" style="width: 70px;">Unit</th>
          <th class="text-center" style="width: 70px;">Pack Size</th>
          <th class="text-right" style="width: 90px;">Stock Qty</th>
          <th class="text-right" style="width: 105px;">Purchase Rate</th>
          <th class="text-right" style="width: 105px;">Wholesale</th>
          <th class="text-right" style="width: 105px;">Retail Rate</th>
          <th class="text-right" style="width: 125px;">Stock Cost Val</th>
          <th class="text-right" style="width: 125px;">Stock Retail Val</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-center"><strong>${r.code}</strong></td>
          <td class="text-left"><strong>${r.titleEng}</strong></td>
          <td class="text-left">${r.categoryName}</td>
          <td class="text-left">${r.subCategoryName}</td>
          <td class="text-center">${r.unitName}</td>
          <td class="text-center font-num">${r.packSize}</td>
          <td class="text-right font-num ${r.stockQty <= r.minStock ? 'rep-amount-danger' : 'rep-amount-success'}"><strong>${r.stockQty.toLocaleString()}</strong></td>
          <td class="text-right font-num">${formatMoney(r.purchasePrice)}</td>
          <td class="text-right font-num">${formatMoney(r.wholesalePrice)}</td>
          <td class="text-right font-num">${formatMoney(r.retailPrice)}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.stockCostValue)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(r.stockRetailValue)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="7" class="text-left"><strong>TOTAL INVENTORY (${t.records || 0} Products)</strong></td>
          <td class="text-right font-num"><strong>${(t.totalStockQty || 0).toLocaleString()}</strong></td>
          <td colspan="3"></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.totalCostVal)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.totalRetailVal)}</strong></td>
        </tr>
      `;
    }

    // 3.2 Low Stock Alert
    else if (repId === 'low-stock') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-center" style="width: 90px;">Code</th>
          <th class="text-left">Product Title</th>
          <th class="text-left" style="width: 140px;">Category</th>
          <th class="text-right" style="width: 100px;">Current Stock</th>
          <th class="text-right" style="width: 100px;">Min Stock Level</th>
          <th class="text-right" style="width: 100px;">Shortage Units</th>
          <th class="text-right" style="width: 120px;">Purchase Rate</th>
          <th class="text-right" style="width: 140px;">Est. Reorder Cost</th>
          <th class="text-center" style="width: 100px;">Status</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-center"><strong>${r.code}</strong></td>
          <td class="text-left"><strong>${r.titleEng}</strong></td>
          <td class="text-left">${r.categoryName}</td>
          <td class="text-right font-num rep-amount-danger"><strong>${r.stockQty.toLocaleString()}</strong></td>
          <td class="text-right font-num">${r.minStock.toLocaleString()}</td>
          <td class="text-right font-num rep-num-bold" style="color: #b91c1c;">${r.shortageQty.toLocaleString()}</td>
          <td class="text-right font-num">${formatMoney(r.purchasePrice)}</td>
          <td class="text-right font-num rep-amount-warning"><strong>${formatMoney(r.estimatedOrderCost)}</strong></td>
          <td class="text-center"><span class="rep-badge rep-badge-red">Low Stock</span></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="6" class="text-left"><strong>TOTAL SHORTAGES (${t.records || 0} Items)</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${(t.totalShortage || 0).toLocaleString()}</strong></td>
          <td></td>
          <td class="text-right font-num rep-amount-warning"><strong>${formatMoney(t.totalOrderEst || 0)}</strong></td>
          <td></td>
        </tr>
      `;
    }

    // 3.3 Zero / Out of Stock
    else if (repId === 'zero-stock') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-center" style="width: 90px;">Code</th>
          <th class="text-left">Product Title</th>
          <th class="text-left" style="width: 140px;">Category</th>
          <th class="text-left" style="width: 140px;">Sub Category</th>
          <th class="text-center" style="width: 80px;">Unit</th>
          <th class="text-right" style="width: 120px;">Last Cost Rate</th>
          <th class="text-right" style="width: 120px;">Retail Rate</th>
          <th class="text-right" style="width: 110px;">Reorder Level</th>
          <th class="text-center" style="width: 110px;">Stock Status</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-center"><strong>${r.code}</strong></td>
          <td class="text-left"><strong>${r.titleEng}</strong></td>
          <td class="text-left">${r.categoryName}</td>
          <td class="text-left">${r.subCategoryName}</td>
          <td class="text-center">${r.unitName}</td>
          <td class="text-right font-num">${formatMoney(r.purchasePrice)}</td>
          <td class="text-right font-num">${formatMoney(r.retailPrice)}</td>
          <td class="text-right font-num">${r.reorderLevel}</td>
          <td class="text-center"><span class="rep-badge rep-badge-red">0 Units</span></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="10" class="text-left"><strong>TOTAL OUT OF STOCK: ${rows.length} Product Items</strong></td>
        </tr>
      `;
    }

    // 3.4 Category-wise Stock Summary
    else if (repId === 'category-stock') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Category Name</th>
          <th class="text-center" style="width: 110px;">Unique Items</th>
          <th class="text-right" style="width: 120px;">Total Stock Units</th>
          <th class="text-right" style="width: 150px;">Total Cost Valuation</th>
          <th class="text-right" style="width: 150px;">Total Retail Valuation</th>
          <th class="text-right" style="width: 150px;">Potential Gross Margin</th>
          <th class="text-right" style="width: 100px;">Margin %</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-left"><strong>${r.categoryName}</strong></td>
          <td class="text-center font-num">${r.itemsCount}</td>
          <td class="text-right font-num rep-num-bold">${r.totalQty.toLocaleString()}</td>
          <td class="text-right font-num rep-amount-primary">${formatMoney(r.costValue)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.retailValue)}</td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(r.margin)}</strong></td>
          <td class="text-right font-num"><span class="rep-badge rep-badge-green">${(r.marginPct || 0).toFixed(1)}%</span></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="2" class="text-left"><strong>TOTAL INVENTORY ACROSS CATEGORIES</strong></td>
          <td class="text-center font-num"><strong>${t.itemsCount || 0}</strong></td>
          <td class="text-right font-num"><strong>${(t.totalQty || 0).toLocaleString()}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.costValue || 0)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.retailValue || 0)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.margin || 0)}</strong></td>
          <td class="text-right font-num"><strong class="rep-badge rep-badge-green">${(t.marginPct || 0).toFixed(1)}%</strong></td>
        </tr>
      `;
    }

    // 4.1 Customer Receivables
    else if (repId === 'customer-receivables') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Customer Name</th>
          <th class="text-left" style="width: 130px;">Contact Person</th>
          <th class="text-center" style="width: 120px;">Phone</th>
          <th class="text-left" style="width: 140px;">Territory / Area</th>
          <th class="text-left" style="width: 120px;">City</th>
          <th class="text-right" style="width: 160px;">Receivable Balance (Dr)</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-left"><strong>${r.name}</strong></td>
          <td class="text-left">${r.contactPerson}</td>
          <td class="text-center">${r.phone}</td>
          <td class="text-left">${r.areaName}</td>
          <td class="text-left">${r.city}</td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(r.receivableAmount)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="6" class="text-left"><strong>TOTAL OUTSTANDING RECEIVABLES (${t.records || 0} Customers)</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.totalReceivable)}</strong></td>
        </tr>
      `;
    }

    // 4.2 Supplier Payables
    else if (repId === 'supplier-payables') {
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Supplier / Vendor Name</th>
          <th class="text-left" style="width: 140px;">Contact Person</th>
          <th class="text-center" style="width: 130px;">Phone</th>
          <th class="text-left" style="width: 140px;">City</th>
          <th class="text-right" style="width: 160px;">Payable Balance (Cr)</th>
        </tr>
      `;
      tb = rows.map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td class="text-left"><strong>${r.name}</strong></td>
          <td class="text-left">${r.contactPerson}</td>
          <td class="text-center">${r.phone}</td>
          <td class="text-left">${r.city}</td>
          <td class="text-right font-num rep-amount-warning"><strong>${formatMoney(r.payableAmount)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTAL OUTSTANDING PAYABLES (${t.records || 0} Suppliers)</strong></td>
          <td class="text-right font-num rep-amount-warning"><strong>${formatMoney(t.totalPayable)}</strong></td>
        </tr>
      `;
    }

    // 4.3 CRV Register
    else if (repId === 'crv-report') {
      th = `
        <tr>
          <th class="text-center" style="width: 95px;">Date</th>
          <th class="text-center" style="width: 110px;">Voucher #</th>
          <th class="text-left">Customer / Account Title</th>
          <th class="text-left" style="width: 120px;">Territory</th>
          <th class="text-center" style="width: 80px;">Mode</th>
          <th class="text-right" style="width: 130px;">Amount Received</th>
          <th class="text-right" style="width: 110px;">Discount Allowed</th>
          <th class="text-right" style="width: 140px;">Total Credit</th>
          <th class="text-left">Remarks / Details</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center">${r.date}</td>
          <td class="text-center"><strong>${r.voucherNo}</strong></td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-left">${r.areaName}</td>
          <td class="text-center"><span class="rep-badge rep-badge-green">${r.paymentMode}</span></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(r.amount)}</strong></td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.discount)}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.netAmount)}</strong></td>
          <td class="text-left">${r.remarks}</td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTAL CASH RECEIPTS (${t.records || 0} Vouchers)</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.amount || 0)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.discount || 0)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.netAmount || 0)}</strong></td>
          <td></td>
        </tr>
      `;
    }

    // 4.4 CPV Register
    else if (repId === 'cpv-report') {
      th = `
        <tr>
          <th class="text-center" style="width: 95px;">Date</th>
          <th class="text-center" style="width: 110px;">Voucher #</th>
          <th class="text-left">Supplier / Expense Account Title</th>
          <th class="text-left" style="width: 120px;">Territory</th>
          <th class="text-center" style="width: 80px;">Mode</th>
          <th class="text-right" style="width: 130px;">Amount Paid</th>
          <th class="text-right" style="width: 110px;">Discount Received</th>
          <th class="text-right" style="width: 140px;">Total Debit</th>
          <th class="text-left">Remarks / Details</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center">${r.date}</td>
          <td class="text-center"><strong>${r.voucherNo}</strong></td>
          <td class="text-left"><strong>${r.partyTitle}</strong></td>
          <td class="text-left">${r.areaName}</td>
          <td class="text-center"><span class="rep-badge rep-badge-amber">${r.paymentMode}</span></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(r.amount)}</strong></td>
          <td class="text-right font-num rep-amount-muted">${formatMoney(r.discount)}</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(r.netAmount)}</strong></td>
          <td class="text-left">${r.remarks}</td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td colspan="5" class="text-left"><strong>TOTAL PAYMENTS (${t.records || 0} Vouchers)</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.amount || 0)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.discount || 0)}</strong></td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(t.netAmount || 0)}</strong></td>
          <td></td>
        </tr>
      `;
    }

    // 4.5 Cash Book / Daily Cash Flow
    else if (repId === 'cash-book') {
      th = `
        <tr>
          <th class="text-center" style="width: 110px;">Date</th>
          <th class="text-right" style="width: 150px;">Counter Cash Sales</th>
          <th class="text-right" style="width: 150px;">CRV Recoveries</th>
          <th class="text-right" style="width: 160px;">Total Cash Inflow</th>
          <th class="text-right" style="width: 160px;">CPV Cash Outflow</th>
          <th class="text-right" style="width: 160px;">Net Day Cash Flow</th>
        </tr>
      `;
      tb = rows.map(r => `
        <tr>
          <td class="text-center"><strong>${r.date}</strong></td>
          <td class="text-right font-num rep-amount-primary">${formatMoney(r.cashSales)}</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(r.crvReceived)}</td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(r.totalIn)}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(r.totalOut)}</strong></td>
          <td class="text-right font-num ${r.netCash >= 0 ? 'rep-amount-success' : 'rep-amount-danger'}"><strong>${formatMoney(r.netCash)}</strong></td>
        </tr>
      `).join('');
      tf = `
        <tr>
          <td class="text-center"><strong>TOTALS (${t.records || 0} Days)</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.cashSales)}</strong></td>
          <td class="text-right font-num"><strong>${formatMoney(t.crvReceived)}</strong></td>
          <td class="text-right font-num rep-amount-success"><strong>${formatMoney(t.totalIn)}</strong></td>
          <td class="text-right font-num rep-amount-danger"><strong>${formatMoney(t.totalOut)}</strong></td>
          <td class="text-right font-num ${t.netCash >= 0 ? 'rep-amount-success' : 'rep-amount-danger'}"><strong>${formatMoney(t.netCash)}</strong></td>
        </tr>
      `;
    }

    // 5.1 Profit & Loss Table Summary
    else if (repId === 'profit-loss') {
      const m = res.metrics || {};
      th = `
        <tr>
          <th class="text-center" style="width: 60px;">Sr #</th>
          <th class="text-left">Statement Component</th>
          <th class="text-left" style="width: 250px;">Accounting Basis</th>
          <th class="text-right" style="width: 180px;">Amount (PKR)</th>
        </tr>
      `;
      tb = `
        <tr>
          <td class="text-center">1</td>
          <td class="text-left"><strong>Gross Sales Revenue</strong></td>
          <td class="text-left">Total Invoice Sales Value</td>
          <td class="text-right font-num rep-amount-primary"><strong>${formatMoney(m.grossSales)}</strong></td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td class="text-left">Less: Trade Discounts Allowed</td>
          <td class="text-left">Deductions on Invoices</td>
          <td class="text-right font-num rep-amount-muted">- ${formatMoney(m.discountsGiven)}</td>
        </tr>
        <tr>
          <td class="text-center">3</td>
          <td class="text-left">Less: Sales Returns & Refunds</td>
          <td class="text-left">Returned Merchandise</td>
          <td class="text-right font-num rep-amount-danger">- ${formatMoney(m.returnsRefunded)}</td>
        </tr>
        <tr style="font-weight: 700;">
          <td class="text-center">4</td>
          <td class="text-left" style="color: #15803d;">NET TRADING SALES REVENUE</td>
          <td class="text-left">Gross - Discounts - Returns</td>
          <td class="text-right font-num rep-amount-success">${formatMoney(m.netSales)}</td>
        </tr>
        <tr>
          <td class="text-center">5</td>
          <td class="text-left">Cost of Goods Sold (COGS)</td>
          <td class="text-left">Purchase Rate x Units Sold</td>
          <td class="text-right font-num rep-amount-muted">- ${formatMoney(m.cogs)}</td>
        </tr>
        <tr style="font-weight: 800; font-size: 0.95rem;">
          <td class="text-center">6</td>
          <td class="text-left" style="color: #0369a1;">GROSS TRADING PROFIT</td>
          <td class="text-left">Net Sales - COGS</td>
          <td class="text-right font-num ${m.grossProfit >= 0 ? 'rep-amount-success' : 'rep-amount-danger'}">${formatMoney(m.grossProfit)}</td>
        </tr>
      `;
      tf = `
        <tr>
          <td colspan="3" class="text-left"><strong>OVERALL PROFIT MARGIN RATIO</strong></td>
          <td class="text-right font-num"><strong class="rep-badge rep-badge-green">${(m.profitMargin || 0).toFixed(2)}%</strong></td>
        </tr>
      `;
    }

    // Default Fallback
    else {
      const keys = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : [];
      th = `<tr>${keys.map(k => `<th>${k.toUpperCase()}</th>`).join('')}</tr>`;
      tb = rows.map(r => `
        <tr>${keys.map(k => `<td>${typeof r[k] === 'number' ? r[k].toLocaleString() : (r[k] || '--')}</td>`).join('')}</tr>
      `).join('');
      tf = `<tr><td colspan="${keys.length}"><strong>Total Records: ${rows.length}</strong></td></tr>`;
    }

    return { th, tb, tf };
  }

  // Render Pagination Controls Bar
  function renderPaginationControls(totalRecords, startIdx, endIdx, curPage, totalPages) {
    if (!dom.paginationBar) return;
    if (state.activeReportId === 'profit-loss' || totalRecords === 0) {
      dom.paginationBar.style.display = 'none';
      return;
    }
    dom.paginationBar.style.display = 'flex';

    if (dom.pagInfo) {
      dom.pagInfo.textContent = totalRecords === 0
        ? 'No records found'
        : `Showing ${startIdx + 1}–${endIdx} of ${totalRecords} records`;
    }
    if (dom.pagCurr) {
      dom.pagCurr.textContent = `Page ${curPage} of ${totalPages}`;
    }
    if (dom.btnPagFirst) dom.btnPagFirst.disabled = curPage <= 1;
    if (dom.btnPagPrev) dom.btnPagPrev.disabled = curPage <= 1;
    if (dom.btnPagNext) dom.btnPagNext.disabled = curPage >= totalPages;
    if (dom.btnPagLast) dom.btnPagLast.disabled = curPage >= totalPages;
  }

  // Generate complete full-dataset table HTML for printing & PDF export
  function generateFullTableHtml(res) {
    if (!res) return '';
    const allRows = res.rows || [];
    const { th, tb, tf } = buildTableMarkup(res, allRows, 0);
    return `
      <table class="rep-data-table" style="width: 100%; border-collapse: collapse;">
        <thead>${th}</thead>
        <tbody>${tb}</tbody>
        <tfoot>${tf}</tfoot>
      </table>
    `;
  }

  // Render Report Table based on Report Type with Pagination & Live Filter
  function renderReportTable(res) {
    if (!res) {
      dom.tableHead.innerHTML = '';
      dom.tableBody.innerHTML = '<tr><td style="text-align: center; padding: 40px; color: #94a3b8;">No data available.</td></tr>';
      dom.tableFoot.innerHTML = '';
      if (dom.paginationBar) dom.paginationBar.style.display = 'none';
      return;
    }

    const allMatchingRows = res.rows || [];
    const repId = state.activeReportId;

    // Filter by tableSearch query across all rows
    const q = (dom.tableSearch && dom.tableSearch.value || '').trim().toLowerCase();
    const filteredRows = q
      ? allMatchingRows.filter(r => {
          return Object.values(r).some(val =>
            val !== null && val !== undefined && String(val).toLowerCase().includes(q)
          );
        })
      : allMatchingRows;

    const totalRecords = filteredRows.length;
    const pageSizeVal = state.pagination.pageSize;
    const pageSize = pageSizeVal === 'all' ? totalRecords : (Number(pageSizeVal) || 20);
    const totalPages = Math.max(1, Math.ceil(totalRecords / (pageSize || 1)));

    if (state.pagination.currentPage > totalPages) state.pagination.currentPage = totalPages;
    if (state.pagination.currentPage < 1) state.pagination.currentPage = 1;

    const curPage = state.pagination.currentPage;
    const startIdx = (curPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalRecords);
    const rows = pageSizeVal === 'all' ? filteredRows : filteredRows.slice(startIdx, endIdx);

    const { th, tb, tf } = buildTableMarkup(res, rows, startIdx);

    dom.tableHead.innerHTML = th;
    dom.tableBody.innerHTML = rows.length > 0 || repId === 'profit-loss'
      ? tb
      : '<tr><td colspan="15" style="text-align: center; padding: 40px; color: #94a3b8;">No transactions found matching your filter criteria.</td></tr>';
    dom.tableFoot.innerHTML = tf;

    renderPaginationControls(totalRecords, startIdx, endIdx, curPage, totalPages);
  }

  // Render Profit & Loss View
  function renderProfitAndLossView(res) {
    if (!res || !res.metrics) return;
    const m = res.metrics;

    dom.pnlCard.innerHTML = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; text-align: center;">
        <h2 style="margin: 0; font-size: 1.25rem;">SHAHZAIB TRADERS</h2>
        <p style="margin: 2px 0; color: #64748b; font-size: 0.85rem;">Trading Statement of Profit & Loss</p>
        <p style="margin: 2px 0; font-size: 0.8rem; font-weight: 600;">Period: ${dom.fromDate.value || 'Beginning'} to ${dom.toDate.value || 'Present'}</p>
      </div>

      <div class="rep-pnl-row">
        <span>Gross Trading Sales</span>
        <strong class="font-num">${formatMoney(m.grossSales)}</strong>
      </div>
      <div class="rep-pnl-row">
        <span>Less: Special Discounts Given</span>
        <span class="font-num" style="color: #dc2626;">- ${formatMoney(m.discountsGiven)}</span>
      </div>
      <div class="rep-pnl-row">
        <span>Less: Sales Returns & Customer Refunds</span>
        <span class="font-num" style="color: #dc2626;">- ${formatMoney(m.returnsRefunded)}</span>
      </div>
      <div class="rep-pnl-row subtotal">
        <span>NET TRADING SALES REVENUE</span>
        <strong class="font-num" style="color: #0284c7;">${formatMoney(m.netSales)}</strong>
      </div>

      <div class="rep-pnl-row" style="margin-top: 14px;">
        <span>Cost of Goods Sold (COGS - Purchase Cost Basis)</span>
        <span class="font-num" style="color: #dc2626;">- ${formatMoney(m.cogs)}</span>
      </div>

      <div class="rep-pnl-row grand">
        <span>GROSS TRADING PROFIT</span>
        <strong class="font-num" style="color: ${m.grossProfit >= 0 ? '#059669' : '#dc2626'};">${formatMoney(m.grossProfit)}</strong>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; font-size: 0.85rem; border: 1px solid #e2e8f0;">
        <span style="font-weight: 600;">Gross Profit Margin Ratio:</span>
        <strong class="font-num" style="color: #059669; font-size: 1rem;">${m.profitMargin.toFixed(2)}%</strong>
      </div>
    `;
  }

  // ========================================================
  // IN-TABLE SEARCH / LIVE FILTER
  // ========================================================
  function handleTableSearch() {
    state.pagination.currentPage = 1;
    renderReportTable(state.currentReportData);
  }

  // ========================================================
  // PRINT & EXPORT HANDLERS
  // ========================================================
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

  // Universal Perfect Excel (.xlsx) Exporter
  async function handleExportExcel() {
    if (!state.currentReportData) {
      showToast('No report data to export', 'warning');
      return;
    }

    const res = state.currentReportData;
    const rows = res.rows || [];
    if (rows.length === 0 && !res.metrics) {
      showToast('Report contains no records to export', 'warning');
      return;
    }

    const title = res.title || 'Business Report';
    const repId = state.activeReportId;
    const dateRange = dom.fromDate.value ? `${dom.fromDate.value} to ${dom.toDate.value || 'Today'}` : 'All Recorded Time';
    const filterSummary = [
      dom.partySelect?.value ? `Party: ${dom.partySelect.options[dom.partySelect.selectedIndex]?.text}` : '',
      dom.categorySelect?.value ? `Category: ${dom.categorySelect.options[dom.categorySelect.selectedIndex]?.text}` : '',
      dom.areaSelect?.value ? `Territory: ${dom.areaSelect.value}` : '',
      dom.paymentTypeSelect?.value !== 'All' ? `Payment: ${dom.paymentTypeSelect.value}` : ''
    ].filter(Boolean).join(' | ');

    // Extract headers from DOM table head
    const thEls = Array.from(dom.tableHead.querySelectorAll('th'));
    const headers = thEls.length ? thEls.map(th => th.textContent.trim()) : (rows[0] ? Object.keys(rows[0]).filter(k => k !== 'id') : ['Details']);

    // Extract structured row values tailored to the report type
    const t = res.totals || {};
    let exportedRows = [];
    let totalsRow = [];

    if (repId === 'today-register' || repId === 'bill-wise-sales') {
      exportedRows = rows.map(r => [
        r.date, r.voucherNo, r.partyTitle, r.areaName, r.paymentType,
        Number(r.itemCount || 0), Number(r.gross || 0), Number(r.discount || 0),
        Number(r.net || 0), Number(r.paid || 0), Number(r.balance || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Bills`, '', '', '',
        Number(t.itemsCount || 0), Number(t.gross || 0), Number(t.discount || 0),
        Number(t.net || 0), Number(t.paid || 0), Number(t.balance || 0)
      ];
    } else if (repId === 'today-summary') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.time, r.type, r.refNo, r.party, r.details,
        Number(r.inflow || 0), Number(r.outflow || 0), Number(r.balance || 0)
      ]);
      totalsRow = [
        'DAY TOTALS', `${t.records || 0} Transactions`, '', '', '', '',
        Number(t.totalInflow || 0), Number(t.totalOutflow || 0), Number(t.netDayCash || 0)
      ];
    } else if (repId === 'party-wise-sales') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.partyTitle, r.partyType, r.areaName, r.phone,
        Number(r.billsCount || 0), Number(r.gross || 0), Number(r.discount || 0),
        Number(r.net || 0), Number(r.paid || 0), Number(r.balance || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Parties`, '', '', '',
        Number(t.billsCount || 0), Number(t.gross || 0), Number(t.discount || 0),
        Number(t.net || 0), Number(t.paid || 0), Number(t.balance || 0)
      ];
    } else if (repId === 'item-wise-sales') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.productCode, r.productTitle, r.categoryName,
        Number(r.packQtySold || 0), Number(r.totalQtySold || 0),
        Number(r.purchaseCostTotal || 0), Number(r.netRevenue || 0),
        Number(r.totalProfit || 0), Number((r.marginPercent || 0).toFixed(1))
      ]);
      totalsRow = [
        'TOTALS', '', `${t.records || 0} Items`, '', '',
        Number(t.totalQtySold || 0), Number(t.purchaseCostTotal || 0),
        Number(t.netRevenue || 0), Number(t.totalProfit || 0),
        Number((t.overallMargin || 0).toFixed(1))
      ];
    } else if (repId === 'territory-wise-sales') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.areaName, r.cityName, Number(r.billsCount || 0),
        Number(r.gross || 0), Number(r.discount || 0),
        Number(r.net || 0), Number(r.paid || 0), Number(r.balance || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Territories`, '', Number(t.billsCount || 0),
        Number(t.gross || 0), Number(t.discount || 0),
        Number(t.net || 0), Number(t.paid || 0), Number(t.balance || 0)
      ];
    } else if (repId === 'bill-wise-profit') {
      exportedRows = rows.map(r => [
        r.date, r.voucherNo, r.partyTitle, Number(r.itemCount || 0),
        Number(r.revenue || 0), Number(r.cost || 0),
        Number(r.profit || 0), Number((r.margin || 0).toFixed(1))
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Bills`, '', Number(t.itemsCount || 0),
        Number(t.revenue || 0), Number(t.cost || 0),
        Number(t.profit || 0), Number((t.margin || 0).toFixed(1))
      ];
    } else if (repId === 'sales-returns') {
      exportedRows = rows.map(r => [
        r.date, r.returnNo, r.saleVoucherRef, r.partyTitle,
        r.areaName, r.refundMode, Number(r.itemCount || 0), Number(r.totalRefund || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Returns`, '', '', '', '',
        Number(t.itemsCount || 0), Number(t.totalRefund || 0)
      ];
    } else if (repId === 'bill-wise-purchases') {
      exportedRows = rows.map(r => [
        r.date, r.purchaseNo, r.supplierName, r.paymentType,
        Number(r.itemCount || 0), Number(r.grossAmount || 0), Number(r.discount || 0),
        Number(r.freight || 0), Number(r.grandTotal || 0), Number(r.paid || 0), Number(r.balance || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Bills`, '', '', Number(t.itemsCount || 0),
        Number(t.grossAmount || 0), Number(t.discount || 0), Number(r.freight || 0),
        Number(t.grandTotal || 0), Number(t.paid || 0), Number(t.balance || 0)
      ];
    } else if (repId === 'supplier-wise-purchases') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.supplierName, r.phone, Number(r.vouchersCount || 0),
        Number(r.totalPurchases || 0), Number(r.paidAmount || 0), Number(r.balanceDue || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Suppliers`, '', Number(t.vouchersCount || 0),
        Number(t.totalPurchases || 0), Number(t.paidAmount || 0), Number(t.balanceDue || 0)
      ];
    } else if (repId === 'item-wise-purchases') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.productCode, r.productTitle, r.categoryName,
        Number(r.packQtyInward || 0), Number(r.totalQtyInward || 0), Number(r.totalSpend || 0)
      ]);
      totalsRow = [
        'TOTALS', '', `${t.records || 0} Items`, '', '',
        Number(t.totalQtyInward || 0), Number(t.totalSpend || 0)
      ];
    } else if (repId === 'stock-position') {
      exportedRows = rows.map(r => [
        r.code, r.titleEng, r.categoryName, r.subCategoryName, r.unitName,
        Number(r.stockQty || 0), Number(r.purchasePrice || 0), Number(r.wholesalePrice || 0),
        Number(r.retailPrice || 0), Number(r.costValue || 0), Number(r.retailValue || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Products`, '', '', '',
        Number(t.totalStockQty || 0), '', '', '',
        Number(t.totalCostVal || 0), Number(t.totalRetailVal || 0)
      ];
    } else if (repId === 'low-stock') {
      exportedRows = rows.map(r => [
        r.code, r.titleEng, r.categoryName, Number(r.stockQty || 0),
        Number(r.minLevel || 0), Number(r.shortage || 0), Number(r.orderCostEstimate || 0)
      ]);
      totalsRow = [
        'TOTALS', `${t.records || 0} Low Stock Items`, '', '', '',
        Number(t.totalShortage || 0), Number(t.totalOrderEst || 0)
      ];
    } else if (repId === 'zero-stock') {
      exportedRows = rows.map(r => [
        r.code, r.titleEng, r.categoryName, r.unitName,
        Number(r.purchasePrice || 0), Number(r.retailPrice || 0), 'Out of Stock'
      ]);
      totalsRow = ['TOTALS', `${t.records || 0} Zero Stock Items`, '', '', '', '', ''];
    } else if (repId === 'category-stock') {
      exportedRows = rows.map(r => [
        r.categoryName, Number(r.productCount || 0), Number(r.stockQty || 0),
        Number(r.costValue || 0), Number(r.retailValue || 0), Number(r.margin || 0),
        Number((r.marginPct || 0).toFixed(1))
      ]);
      totalsRow = [
        'TOTALS', Number(t.productCount || 0), Number(t.totalQty || 0),
        Number(t.costValue || 0), Number(t.retailValue || 0), Number(t.margin || 0),
        Number((t.marginPct || 0).toFixed(1))
      ];
    } else if (repId === 'customer-receivables') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.name, r.phone, r.areaName, Number(r.currentBalance || 0)
      ]);
      totalsRow = ['TOTALS', `${t.records || 0} Customers`, '', '', Number(t.totalReceivable || 0)];
    } else if (repId === 'supplier-payables') {
      exportedRows = rows.map((r, i) => [
        i + 1, r.name, r.phone, r.areaName, Number(r.currentBalance || 0)
      ]);
      totalsRow = ['TOTALS', `${t.records || 0} Suppliers`, '', '', Number(t.totalPayable || 0)];
    } else if (repId === 'crv-report') {
      exportedRows = rows.map(r => [
        r.date, r.voucherNo, r.partyName, r.paymentMode,
        r.narration, Number(r.discount || 0), Number(r.amount || 0), Number(r.netAmount || 0)
      ]);
      totalsRow = ['TOTALS', `${t.records || 0} CRV Vouchers`, '', '', '', Number(t.discount || 0), Number(t.amount || 0), Number(t.netAmount || 0)];
    } else if (repId === 'cpv-report') {
      exportedRows = rows.map(r => [
        r.date, r.voucherNo, r.partyName, r.paymentMode,
        r.narration, Number(r.discount || 0), Number(r.amount || 0), Number(r.netAmount || 0)
      ]);
      totalsRow = ['TOTALS', `${t.records || 0} CPV Vouchers`, '', '', '', Number(t.discount || 0), Number(t.amount || 0), Number(t.netAmount || 0)];
    } else if (repId === 'cash-book') {
      exportedRows = rows.map(r => [
        r.date, Number(r.crvReceived || 0), Number(r.cashSales || 0), Number(r.totalIn || 0),
        Number(r.cpvPaid || 0), Number(r.purchaseCash || 0), Number(r.totalOut || 0), Number(r.netCash || 0)
      ]);
      totalsRow = [
        'TOTALS', Number(t.crvReceived || 0), Number(t.cashSales || 0), Number(t.totalIn || 0),
        Number(t.cpvPaid || 0), Number(r.purchaseCash || 0), Number(t.totalOut || 0), Number(t.netCash || 0)
      ];
    } else if (repId === 'profit-loss') {
      const m = res.metrics || {};
      headers.length = 0;
      headers.push('Financial Metric', 'Amount (PKR)');
      exportedRows = [
        ['Gross Sales Trading Revenue', Number(m.grossSales || 0)],
        ['Less: Customer Discounts Allowed', Number(m.discountsGiven || 0)],
        ['Less: Sales Returns & Refunds', Number(m.returnsRefunded || 0)],
        ['Net Sales Revenue', Number(m.netSales || 0)],
        ['Less: Cost of Goods Sold (COGS)', Number(m.cogs || 0)],
        ['Gross Trading Profit', Number(m.grossProfit || 0)],
        ['Gross Profit Margin (%)', Number((m.profitMargin || 0).toFixed(2))]
      ];
      totalsRow = ['NET TRADING RESULT', Number(m.grossProfit || 0)];
    } else {
      exportedRows = rows.map(r => Object.values(r).filter(v => typeof v !== 'object'));
    }

    // Extract Summary KPI Cards from DOM
    const summaryCards = Array.from(dom.kpiBar.querySelectorAll('.rep-kpi-card')).map(c => ({
      label: c.querySelector('.rep-kpi-title')?.textContent?.trim() || '',
      value: c.querySelector('.rep-kpi-val')?.textContent?.trim() || ''
    }));

    const filename = `Shahzaib_Traders_${repId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    try {
      if (window.electronAPI?.exportExcel) {
        const result = await window.electronAPI.exportExcel({
          title,
          subtitle: 'Shahzaib Traders - Enterprise Business Reports',
          dateRange: `Period: ${dateRange}`,
          filterSummary,
          headers,
          rows: exportedRows,
          totals: totalsRow,
          summaryCards,
          filename
        });

        if (result && result.success) {
          showToast(`Report exported successfully as Excel! (${result.filePath})`, 'success');
          return;
        }
        if (result && result.cancelled) return;
      }
    } catch (err) {
      console.warn('Native Excel export failed, falling back to browser download:', err);
    }

    // High quality CSV fallback with UTF-8 BOM
    let csvContent = '\uFEFF';
    csvContent += `"${title}"\n`;
    csvContent += `"Period: ${dateRange}"\n`;
    if (filterSummary) csvContent += `"Filters: ${filterSummary}"\n`;
    csvContent += '\n';

    csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';
    exportedRows.forEach(r => {
      csvContent += r.map(v => typeof v === 'number' ? v : `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    if (totalsRow.length) {
      csvContent += totalsRow.map(v => typeof v === 'number' ? v : `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.xlsx$/, '.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Report exported as formatted Excel CSV!', 'success');
  }

  // ========================================================
  // BIND EVENTS
  // ========================================================
  function bindEvents() {
    // Hub cards click -> Opens detailed reporting for that category!
    if (dom.hubCards) {
      dom.hubCards.forEach(card => {
        card.addEventListener('click', () => {
          openCategoryReport(card.dataset.cat);
        });
      });
    }

    // Back to Reports Cards Hub
    if (dom.btnBackToHub) {
      dom.btnBackToHub.addEventListener('click', () => {
        showCardsHubView();
      });
    }

    // Category tabs (in detail view)
    dom.catButtons.forEach(btn => {
      btn.addEventListener('click', () => switchCategory(btn.dataset.cat));
    });

    // Category tabs (if any exist)
    if (dom.catButtons) {
      dom.catButtons.forEach(btn => {
        btn.addEventListener('click', () => switchCategory(btn.dataset.cat));
      });
    }

    // Date Presets (if any exist)
    if (dom.presetButtons) {
      dom.presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          applyDatePreset(btn.dataset.preset);
          state.pagination.currentPage = 1;
          generateActiveReport();
        });
      });
    }

    // Filter controls: LIVE AUTO-UPDATE ON CHANGE
    if (dom.categorySelect) {
      dom.categorySelect.addEventListener('change', () => {
        state.pagination.currentPage = 1;
        populateSubCategories();
        generateActiveReport();
      });
    }
    if (dom.subCategorySelect) {
      dom.subCategorySelect.addEventListener('change', () => {
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }
    if (dom.partySelect) {
      dom.partySelect.addEventListener('change', () => {
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }
    if (dom.areaSelect) {
      dom.areaSelect.addEventListener('change', () => {
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }
    if (dom.paymentTypeSelect) {
      dom.paymentTypeSelect.addEventListener('change', () => {
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }
    if (dom.fromDate) {
      dom.fromDate.addEventListener('change', () => {
        state.datePreset = 'custom';
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }
    if (dom.toDate) {
      dom.toDate.addEventListener('change', () => {
        state.datePreset = 'custom';
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }

    // Safe fallback for explicit buttons
    if (dom.btnGenerate) {
      dom.btnGenerate.addEventListener('click', () => {
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }
    if (dom.btnReset) {
      dom.btnReset.addEventListener('click', () => {
        applyDatePreset('this-month');
        if (dom.partySelect) dom.partySelect.value = '';
        if (dom.categorySelect) dom.categorySelect.value = '';
        if (dom.subCategorySelect) {
          populateSubCategories();
          dom.subCategorySelect.value = '';
        }
        if (dom.areaSelect) dom.areaSelect.value = '';
        if (dom.paymentTypeSelect) dom.paymentTypeSelect.value = 'All';
        if (dom.tableSearch) dom.tableSearch.value = '';
        state.pagination.currentPage = 1;
        generateActiveReport();
      });
    }

    // In-table search live input
    if (dom.tableSearch) {
      dom.tableSearch.addEventListener('input', handleTableSearch);
    }

    // Unified Export Dropdown & Options
    if (dom.btnExportMain && dom.exportMenu) {
      dom.btnExportMain.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.exportMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (dom.exportMenu && !dom.exportMenu.classList.contains('hidden')) {
          if (!dom.exportDropdownWrapper || !dom.exportDropdownWrapper.contains(e.target)) {
            dom.exportMenu.classList.add('hidden');
          }
        }
      });
    }

    if (dom.btnExportExcelOpt) {
      dom.btnExportExcelOpt.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dom.exportMenu) dom.exportMenu.classList.add('hidden');
        handleExportExcel();
      });
    }

    if (dom.btnExportPdfOpt) {
      dom.btnExportPdfOpt.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dom.exportMenu) dom.exportMenu.classList.add('hidden');
        handlePrintReport();
      });
    }

    if (dom.btnPrint) dom.btnPrint.addEventListener('click', handlePrintReport);
    if (dom.btnExcel) dom.btnExcel.addEventListener('click', handleExportExcel);

    // Table Pagination Controls
    if (dom.btnPagFirst) {
      dom.btnPagFirst.addEventListener('click', () => {
        if (state.pagination.currentPage > 1) {
          state.pagination.currentPage = 1;
          renderReportTable(state.currentReportData);
        }
      });
    }
    if (dom.btnPagPrev) {
      dom.btnPagPrev.addEventListener('click', () => {
        if (state.pagination.currentPage > 1) {
          state.pagination.currentPage--;
          renderReportTable(state.currentReportData);
        }
      });
    }
    if (dom.btnPagNext) {
      dom.btnPagNext.addEventListener('click', () => {
        state.pagination.currentPage++;
        renderReportTable(state.currentReportData);
      });
    }
    if (dom.btnPagLast) {
      dom.btnPagLast.addEventListener('click', () => {
        state.pagination.currentPage = 999999;
        renderReportTable(state.currentReportData);
      });
    }
    if (dom.pageSizeSelect) {
      dom.pageSizeSelect.addEventListener('change', (e) => {
        state.pagination.pageSize = e.target.value;
        state.pagination.currentPage = 1;
        renderReportTable(state.currentReportData);
      });
    }
  }

  // ========================================================
  // INITIALIZATION
  // ========================================================
  async function init() {
    renderReportsTemplate();
    cacheDom();
    bindEvents();
    applyDatePreset('this-month');
    await loadMasterData();
    showCardsHubView(); // Show ONLY the cards view on initial entry!
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Hook into sidebar Reports button click: always returns to clean Cards Hub
  const navBtn = document.getElementById('navReportsMainBtn');
  if (navBtn) {
    navBtn.addEventListener('click', async () => {
      await loadMasterData();
      showCardsHubView();
    });
  }

  // Global export
  window.ReportsModule = {
    onActivate: async () => {
      await loadMasterData();
      showCardsHubView();
    },
    showCardsHubView,
    openCategoryReport,
    switchCategory,
    generateReport: generateActiveReport
  };

})();
