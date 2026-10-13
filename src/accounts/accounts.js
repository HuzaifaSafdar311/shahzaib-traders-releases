// ========================================================
// Shahzaib Traders - Accounts Module Controller
// Cash Receipt Voucher (CRV), Cash Payment Voucher (CPV),
// F1 Party Help Search Window, and Party Account Ledger
// ========================================================

(function () {
  'use strict';

  // State Management
  const state = {
    activeTab: 'crv', // 'crv' | 'cpv' | 'ledger' | 'history'
    voucherId: null,
    voucherNo: '',
    selectedParty: null,
    partiesList: [],
    vouchersList: [],
    searchSelectedIndex: 0,
    searchFilteredParties: [],
    activeModalFilter: 'all', // 'all' | 'Customer' | 'Vendor'
    currentLedgerData: null
  };

  // Safe API Bridge
  const api = {
    getParties: async () => {
      try {
        if (window.generalInfoAPI?.getParties) {
          return await window.generalInfoAPI.getParties();
        }
      } catch (e) {
        console.warn('Could not fetch parties from generalInfoAPI:', e);
      }
      return [];
    },
    getNextVoucherNo: async (type) => {
      try {
        if (window.accountsAPI?.getNextVoucherNo) {
          return await window.accountsAPI.getNextVoucherNo(type);
        }
      } catch (e) {
        console.warn('Could not fetch next voucher no from accountsAPI:', e);
      }
      return `${type}-${String(Date.now()).slice(-4)}`;
    },
    saveVoucher: async (data) => {
      try {
        if (window.accountsAPI?.saveVoucher) {
          return await window.accountsAPI.saveVoucher(data);
        }
      } catch (e) {
        console.error('Error saving voucher via accountsAPI:', e);
        throw e;
      }
      // Fallback: save to localStorage
      const local = JSON.parse(localStorage.getItem('st_accounts_vouchers') || '[]');
      const id = data.id || `acc-${Date.now()}`;
      const rec = { ...data, id, createdAt: new Date().toISOString() };
      const idx = local.findIndex(x => x.id === id || x.voucherNo === data.voucherNo);
      if (idx >= 0) local[idx] = rec;
      else local.unshift(rec);
      localStorage.setItem('st_accounts_vouchers', JSON.stringify(local));

      // Update party balance if generalInfoAPI is available
      if (window.generalInfoAPI?.updateParty && data.partyId) {
        const parties = await api.getParties();
        const p = parties.find(x => x.id === data.partyId);
        if (p) {
          p.openingBalance = (Number(p.openingBalance) || 0) - (Number(data.netAmount) || 0);
          await window.generalInfoAPI.updateParty(p);
        }
      }
      return { success: true, id, voucherNo: data.voucherNo };
    },
    getAllVouchers: async (filter = {}) => {
      try {
        if (window.accountsAPI?.getAllVouchers) {
          return await window.accountsAPI.getAllVouchers(filter);
        }
      } catch (e) {
        console.warn('Could not fetch vouchers from accountsAPI:', e);
      }
      const local = JSON.parse(localStorage.getItem('st_accounts_vouchers') || '[]');
      if (filter.type) return local.filter(x => x.voucherType === filter.type);
      return local;
    },
    deleteVoucher: async (id) => {
      try {
        if (window.accountsAPI?.deleteVoucher) {
          return await window.accountsAPI.deleteVoucher(id);
        }
      } catch (e) {
        console.error('Error deleting voucher via accountsAPI:', e);
        throw e;
      }
      let local = JSON.parse(localStorage.getItem('st_accounts_vouchers') || '[]');
      local = local.filter(x => x.id !== id && x.voucherNo !== id);
      localStorage.setItem('st_accounts_vouchers', JSON.stringify(local));
      return { success: true };
    },
    getPartyLedger: async (partyId, fromDate, toDate) => {
      try {
        if (window.accountsAPI?.getPartyLedger) {
          return await window.accountsAPI.getPartyLedger(partyId, fromDate, toDate);
        }
      } catch (e) {
        console.warn('Could not fetch party ledger from accountsAPI:', e);
      }
      return null;
    }
  };

  // Toast notification helper
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

  // Format Pakistani Rupee currency
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return 'Rs. ' + num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Inject Template into #accountsView
  function renderAccountsTemplate() {
    const container = document.getElementById('accountsView');
    if (!container) return;

    container.innerHTML = `
      <div class="accounts-container">
        <!-- Topbar Navigation -->
        <header class="acc-topbar">
          <div class="acc-title-group">
            <svg class="acc-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
              <path d="M12 14v2m-3-2v2m6-2v2"></path>
            </svg>
            <div class="acc-title-text">
              <h1 id="accHeaderTitle">Cash Receipt Voucher (CRV)</h1>
              <p>Shahzaib Traders - Financial Accounts & Party Ledgers Management</p>
            </div>
          </div>

          <!-- Nav Tabs -->
          <div class="acc-nav-tabs">
            <button id="btnTabCRV" class="acc-tab-btn active crv" data-tab="crv">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Cash Receipt (CRV)
            </button>
            <button id="btnTabCPV" class="acc-tab-btn" data-tab="cpv">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12H2M15 5l7 7-7 7"></path></svg>
              Cash Payment (CPV)
            </button>
            <button id="btnTabLedger" class="acc-tab-btn" data-tab="ledger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              Party Ledger
            </button>
            <button id="btnTabHistory" class="acc-tab-btn" data-tab="history">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Vouchers Register
            </button>
          </div>

          <!-- Actions Toolbar -->
          <div class="acc-action-bar">
            <button id="btnAccNew" class="acc-btn acc-btn-new" title="New Voucher (Ctrl+N)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New
            </button>
            <button id="btnAccSave" class="acc-btn acc-btn-save crv" title="Save Voucher (Ctrl+S)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save Voucher
            </button>
            <button id="btnAccPrint" class="acc-btn acc-btn-print" title="Print Receipt Slip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Slip
            </button>
            <button id="btnAccDelete" class="acc-btn acc-btn-delete hidden" title="Delete Voucher">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>
          </div>
        </header>

        <!-- ============================================== -->
        <!-- VIEW SECTION 1: VOUCHER FORM (CRV & CPV)      -->
        <!-- ============================================== -->
        <div id="accVoucherSection" class="acc-card">
          <div class="acc-card-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="accVoucherPill" class="acc-badge-pill crv">Cash Receipt</span>
              <span style="font-size: 0.85rem; color: #64748b;">Press <strong>F1</strong> anywhere to search party ledger</span>
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #475569;">
              Status: <span id="accVoucherStatus" style="color: #059669;">Ready for Entry</span>
            </div>
          </div>

          <!-- Header Form Grid -->
          <div class="acc-grid-header">
            <div class="acc-form-group">
              <label>Voucher No</label>
              <input type="text" id="accVoucherNo" class="acc-form-control" readonly>
            </div>
            <div class="acc-form-group">
              <label>Entry Date</label>
              <input type="date" id="accEntryDate" class="acc-form-control">
            </div>
            <div class="acc-form-group">
              <label>Manual / Ref No</label>
              <input type="text" id="accManualNo" class="acc-form-control" placeholder="Optional manual book ref #">
            </div>
            <div class="acc-form-group" style="grid-column: span 2;">
              <label>
                <span>Party Account Selection</span>
                <span style="color: #0284c7; cursor: pointer;" id="accTriggerF1Help">Press [F1] Search Window</span>
              </label>
              <div class="acc-party-search-wrap">
                <input type="text" id="accPartyInput" class="acc-form-control acc-party-input" placeholder="Type name or press F1 to search party..." autocomplete="off">
                <button type="button" id="btnAccOpenF1Search" class="acc-btn-f1-shortcut" title="Open Party Help Search Window (F1)">
                  <span class="acc-f1-badge">F1</span>
                  <span>Search</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Selected Party Profile Banner -->
          <div id="accPartyBanner" class="acc-party-banner">
            <div class="acc-party-banner-item">
              <span class="acc-banner-label">Selected Party Title</span>
              <span id="accBannerPartyTitle" class="acc-banner-val">No Party Selected</span>
              <span id="accBannerPartyType" style="font-size: 0.75rem; color: #64748b;">Select customer or supplier</span>
            </div>
            <div class="acc-party-banner-item">
              <span class="acc-banner-label">City / Territory</span>
              <span id="accBannerAreaCity" class="acc-banner-val">--</span>
            </div>
            <div class="acc-party-banner-item">
              <span class="acc-banner-label">Phone Contact</span>
              <span id="accBannerPhone" class="acc-banner-val">--</span>
            </div>
            <div class="acc-party-banner-item">
              <span class="acc-banner-label">Current Ledger Balance</span>
              <span id="accBannerPrevBalance" class="acc-banner-val dr">Rs. 0.00</span>
            </div>
          </div>

          <!-- Big Calculation & Transaction Section -->
          <div class="acc-calc-box">
            <div class="acc-calc-card">
              <span class="acc-calc-label">Previous Balance</span>
              <span id="accCalcPrevBalDisplay" class="acc-calc-val-large">Rs. 0.00</span>
            </div>
            <div class="acc-calc-card highlight">
              <span id="accAmountLabel" class="acc-calc-label">Cash Received Amount (Rs.)</span>
              <input type="number" id="accAmountInput" class="acc-calc-input" placeholder="0.00" min="0" step="any">
            </div>
            <div class="acc-calc-card">
              <span class="acc-calc-label">Discount / Concession (Rs.)</span>
              <input type="number" id="accDiscountInput" class="acc-calc-input" placeholder="0.00" min="0" step="any">
            </div>
            <div class="acc-calc-card">
              <span class="acc-calc-label">Net Settlement Amount</span>
              <span id="accNetSettlementDisplay" class="acc-calc-val-large positive">Rs. 0.00</span>
            </div>
            <div class="acc-calc-card">
              <span class="acc-calc-label">New Remaining Balance</span>
              <span id="accNewBalanceDisplay" class="acc-calc-val-large">Rs. 0.00</span>
            </div>
          </div>

          <!-- Secondary Details Row -->
          <div class="acc-secondary-grid">
            <div class="acc-form-group">
              <label>Payment Mode</label>
              <select id="accPaymentMode" class="acc-form-control">
                <option value="Cash">Cash Account</option>
                <option value="Bank / Cheque">Bank / Cheque</option>
                <option value="Online / Transfer">Online / Slip Transfer</option>
              </select>
            </div>
            <div class="acc-form-group">
              <label>Cheque / Transaction Ref #</label>
              <input type="text" id="accChequeRef" class="acc-form-control" placeholder="e.g. Chq# 87654 or Bank slip #">
            </div>
            <div class="acc-form-group">
              <label>Narration / Description / Remarks</label>
              <input type="text" id="accRemarks" class="acc-form-control" placeholder="e.g. Received cash against bill payment...">
            </div>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- VIEW SECTION 2: PARTY LEDGER STATEMENT        -->
        <!-- ============================================== -->
        <div id="accLedgerSection" class="acc-card hidden">
          <div class="acc-ledger-filters">
            <div class="acc-form-group" style="min-width: 280px; flex: 1;">
              <label>Select Party Account</label>
              <div class="acc-party-search-wrap">
                <input type="text" id="accLedgerPartyInput" class="acc-form-control" placeholder="Search party or press F1..." readonly style="cursor: pointer;">
                <button type="button" id="btnAccLedgerF1" class="acc-btn-f1-shortcut"><span class="acc-f1-badge">F1</span> Select</button>
              </div>
            </div>
            <div class="acc-form-group">
              <label>From Date</label>
              <input type="date" id="accLedgerFromDate" class="acc-form-control">
            </div>
            <div class="acc-form-group">
              <label>To Date</label>
              <input type="date" id="accLedgerToDate" class="acc-form-control">
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btnLedgerFilterThisMonth" class="acc-btn acc-btn-new">This Month</button>
              <button id="btnLedgerFilterAllTime" class="acc-btn acc-btn-new">All Time</button>
              <button id="btnLedgerPrintStatement" class="acc-btn acc-btn-print">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Ledger
              </button>
            </div>
          </div>

          <!-- KPI Summary Cards -->
          <div class="acc-kpi-bar">
            <div class="acc-kpi-card">
              <span class="acc-kpi-title">Opening Balance</span>
              <span id="accKpiOpening" class="acc-kpi-val">Rs. 0.00</span>
            </div>
            <div class="acc-kpi-card">
              <span class="acc-kpi-title">Total Debits (Dr)</span>
              <span id="accKpiDebit" class="acc-kpi-val blue">Rs. 0.00</span>
            </div>
            <div class="acc-kpi-card">
              <span class="acc-kpi-title">Total Credits (Cr)</span>
              <span id="accKpiCredit" class="acc-kpi-val green">Rs. 0.00</span>
            </div>
            <div class="acc-kpi-card">
              <span class="acc-kpi-title">Closing Ledger Balance</span>
              <span id="accKpiClosing" class="acc-kpi-val red">Rs. 0.00</span>
            </div>
          </div>

          <!-- Detailed Ledger Table -->
          <div class="acc-ledger-table-wrap">
            <table class="acc-data-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Date</th>
                  <th style="width: 110px;">Voucher #</th>
                  <th style="width: 130px;">Type</th>
                  <th>Narration / Details</th>
                  <th style="width: 120px; text-align: right;">Debit (Dr)</th>
                  <th style="width: 120px; text-align: right;">Credit (Cr)</th>
                  <th style="width: 130px; text-align: right;">Running Balance</th>
                </tr>
              </thead>
              <tbody id="accLedgerTableBody">
                <tr>
                  <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                    Please select a party account using F1 or the search box to view ledger.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- VIEW SECTION 3: VOUCHERS REGISTER (HISTORY)   -->
        <!-- ============================================== -->
        <div id="accHistorySection" class="acc-card hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px; width: 60%;">
              <input type="text" id="accHistorySearch" class="acc-form-control" placeholder="Search by Voucher #, Party Name, Phone or Ref #...">
              <select id="accHistoryTypeFilter" class="acc-form-control" style="width: 160px;">
                <option value="">All Vouchers</option>
                <option value="CRV">Cash Receipts (CRV)</option>
                <option value="CPV">Cash Payments (CPV)</option>
              </select>
            </div>
            <span id="accHistoryCount" style="font-size: 0.825rem; font-weight: 600; color: #64748b;">Showing 0 vouchers</span>
          </div>

          <div class="acc-ledger-table-wrap" style="max-height: 520px; overflow-y: auto;">
            <table class="acc-data-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Date</th>
                  <th style="width: 110px;">Voucher #</th>
                  <th style="width: 80px;">Type</th>
                  <th>Party Name</th>
                  <th style="width: 100px;">Area / City</th>
                  <th style="width: 110px; text-align: right;">Amount</th>
                  <th style="width: 90px; text-align: right;">Discount</th>
                  <th style="width: 110px; text-align: right;">Net Amount</th>
                  <th style="width: 90px;">Mode</th>
                  <th style="width: 110px; text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody id="accHistoryTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- PARTY HELP SEARCH WINDOW (F1 SHORTCUT MODAL)   -->
      <!-- Resolves legacy move010 crash cleanly!        -->
      <!-- ============================================== -->
      <div id="accPartyHelpModal" class="acc-modal-overlay hidden">
        <div class="acc-modal-box">
          <div class="acc-modal-header">
            <div class="acc-modal-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Party Account Help Search Window</span>
              <span class="acc-modal-title-badge">F1 KEY ACTIVE</span>
            </div>
            <button type="button" id="btnClosePartyHelpModal" class="acc-modal-close-btn">&times;</button>
          </div>

          <div class="acc-modal-search-bar">
            <input type="text" id="accModalSearchInput" class="acc-modal-search-input" placeholder="Type party title, phone, city or territory to filter..." autocomplete="off">
            <div class="acc-modal-filter-pills">
              <button type="button" class="acc-filter-pill active" data-filter="all">All</button>
              <button type="button" class="acc-filter-pill" data-filter="Customer">Customers</button>
              <button type="button" class="acc-filter-pill" data-filter="Vendor">Suppliers</button>
            </div>
          </div>

          <div class="acc-modal-table-wrap">
            <table class="acc-data-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Sr #</th>
                  <th>Party Title / Company</th>
                  <th style="width: 120px;">Party Type</th>
                  <th style="width: 130px;">Area / City</th>
                  <th style="width: 120px;">Phone</th>
                  <th style="width: 130px; text-align: right;">Ledger Balance</th>
                </tr>
              </thead>
              <tbody id="accModalPartiesTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>

          <div class="acc-modal-footer">
            <div class="acc-keyboard-hints">
              <span><span class="acc-kbd">↑</span> <span class="acc-kbd">↓</span> Navigate</span>
              <span><span class="acc-kbd">Enter</span> Select & Load</span>
              <span><span class="acc-kbd">Esc</span> Close</span>
            </div>
            <span id="accModalResultsCount">Found 0 parties</span>
          </div>
        </div>
      </div>

      <!-- Hidden Printable Thermal Receipt & Voucher Container -->
      <div id="accountsPrintArea" class="acc-print-container"></div>
    `;
  }

  // ========================================================
  // CORE LOGIC & EVENT LISTENERS
  // ========================================================
  let dom = {};

  function cacheDom() {
    dom = {
      headerTitle: document.getElementById('accHeaderTitle'),
      btnTabCRV: document.getElementById('btnTabCRV'),
      btnTabCPV: document.getElementById('btnTabCPV'),
      btnTabLedger: document.getElementById('btnTabLedger'),
      btnTabHistory: document.getElementById('btnTabHistory'),

      btnAccNew: document.getElementById('btnAccNew'),
      btnAccSave: document.getElementById('btnAccSave'),
      btnAccPrint: document.getElementById('btnAccPrint'),
      btnAccDelete: document.getElementById('btnAccDelete'),

      voucherSection: document.getElementById('accVoucherSection'),
      ledgerSection: document.getElementById('accLedgerSection'),
      historySection: document.getElementById('accHistorySection'),

      voucherPill: document.getElementById('accVoucherPill'),
      voucherStatus: document.getElementById('accVoucherStatus'),
      voucherNo: document.getElementById('accVoucherNo'),
      entryDate: document.getElementById('accEntryDate'),
      manualNo: document.getElementById('accManualNo'),
      partyInput: document.getElementById('accPartyInput'),
      btnOpenF1Search: document.getElementById('btnAccOpenF1Search'),
      triggerF1Help: document.getElementById('accTriggerF1Help'),

      // Banner
      bannerPartyTitle: document.getElementById('accBannerPartyTitle'),
      bannerPartyType: document.getElementById('accBannerPartyType'),
      bannerAreaCity: document.getElementById('accBannerAreaCity'),
      bannerPhone: document.getElementById('accBannerPhone'),
      bannerPrevBalance: document.getElementById('accBannerPrevBalance'),

      // Calculation
      calcPrevBalDisplay: document.getElementById('accCalcPrevBalDisplay'),
      amountLabel: document.getElementById('accAmountLabel'),
      amountInput: document.getElementById('accAmountInput'),
      discountInput: document.getElementById('accDiscountInput'),
      netSettlementDisplay: document.getElementById('accNetSettlementDisplay'),
      newBalanceDisplay: document.getElementById('accNewBalanceDisplay'),

      // Secondary
      paymentMode: document.getElementById('accPaymentMode'),
      chequeRef: document.getElementById('accChequeRef'),
      remarks: document.getElementById('accRemarks'),

      // Help Search Modal
      helpModal: document.getElementById('accPartyHelpModal'),
      modalSearchInput: document.getElementById('accModalSearchInput'),
      modalPartiesTableBody: document.getElementById('accModalPartiesTableBody'),
      btnClosePartyHelpModal: document.getElementById('btnClosePartyHelpModal'),
      modalResultsCount: document.getElementById('accModalResultsCount'),

      // Ledger View Elements
      ledgerPartyInput: document.getElementById('accLedgerPartyInput'),
      btnAccLedgerF1: document.getElementById('btnAccLedgerF1'),
      ledgerFromDate: document.getElementById('accLedgerFromDate'),
      ledgerToDate: document.getElementById('accLedgerToDate'),
      btnLedgerFilterThisMonth: document.getElementById('btnLedgerFilterThisMonth'),
      btnLedgerFilterAllTime: document.getElementById('btnLedgerFilterAllTime'),
      btnLedgerPrintStatement: document.getElementById('btnLedgerPrintStatement'),
      kpiOpening: document.getElementById('accKpiOpening'),
      kpiDebit: document.getElementById('accKpiDebit'),
      kpiCredit: document.getElementById('accKpiCredit'),
      kpiClosing: document.getElementById('accKpiClosing'),
      ledgerTableBody: document.getElementById('accLedgerTableBody'),

      // History View Elements
      historySearch: document.getElementById('accHistorySearch'),
      historyTypeFilter: document.getElementById('accHistoryTypeFilter'),
      historyTableBody: document.getElementById('accHistoryTableBody'),
      historyCount: document.getElementById('accHistoryCount'),

      // Print Area
      printArea: document.getElementById('accountsPrintArea')
    };
  }

  // Switch Sub-tabs (CRV, CPV, Ledger, History)
  async function switchAccountsTab(tabKey) {
    state.activeTab = tabKey;

    // Update buttons
    [dom.btnTabCRV, dom.btnTabCPV, dom.btnTabLedger, dom.btnTabHistory].forEach(b => {
      if (!b) return;
      b.classList.remove('active', 'crv', 'cpv');
      if (b.dataset.tab === tabKey) {
        b.classList.add('active');
        if (tabKey === 'crv') b.classList.add('crv');
        if (tabKey === 'cpv') b.classList.add('cpv');
      }
    });

    // Visibility of sections
    dom.voucherSection.classList.toggle('hidden', tabKey === 'ledger' || tabKey === 'history');
    dom.ledgerSection.classList.toggle('hidden', tabKey !== 'ledger');
    dom.historySection.classList.toggle('hidden', tabKey !== 'history');

    // Action button visibility
    dom.btnAccSave.classList.toggle('hidden', tabKey === 'ledger' || tabKey === 'history');
    dom.btnAccNew.classList.toggle('hidden', tabKey === 'ledger' || tabKey === 'history');
    dom.btnAccPrint.classList.toggle('hidden', tabKey === 'ledger' || tabKey === 'history');

    if (tabKey === 'crv') {
      dom.headerTitle.textContent = 'Cash Receipt Voucher (CRV)';
      dom.voucherPill.textContent = 'Cash Receipt';
      dom.voucherPill.className = 'acc-badge-pill crv';
      dom.btnAccSave.className = 'acc-btn acc-btn-save crv';
      dom.amountLabel.textContent = 'Cash Received Amount (Rs.)';
      await resetVoucher('CRV');
    } else if (tabKey === 'cpv') {
      dom.headerTitle.textContent = 'Cash Payment Voucher (CPV)';
      dom.voucherPill.textContent = 'Cash Payment';
      dom.voucherPill.className = 'acc-badge-pill cpv';
      dom.btnAccSave.className = 'acc-btn acc-btn-save cpv';
      dom.amountLabel.textContent = 'Cash Paid Amount (Rs.)';
      await resetVoucher('CPV');
    } else if (tabKey === 'ledger') {
      dom.headerTitle.textContent = 'Party Account Ledger Statement';
      if (state.selectedParty) {
        loadPartyLedger(state.selectedParty.id);
      }
    } else if (tabKey === 'history') {
      dom.headerTitle.textContent = 'Accounts Vouchers Register & History';
      loadVouchersHistory();
    }
  }

  // Reset Voucher Form
  async function resetVoucher(voucherType = (state.activeTab === 'cpv' ? 'CPV' : 'CRV')) {
    state.voucherId = null;
    state.selectedParty = null;

    const today = new Date().toISOString().slice(0, 10);
    if (dom.entryDate) dom.entryDate.value = today;
    if (dom.manualNo) dom.manualNo.value = '';
    if (dom.partyInput) dom.partyInput.value = '';
    if (dom.amountInput) dom.amountInput.value = '';
    if (dom.discountInput) dom.discountInput.value = '';
    if (dom.chequeRef) dom.chequeRef.value = '';
    if (dom.remarks) dom.remarks.value = '';
    if (dom.paymentMode) dom.paymentMode.value = 'Cash';

    // Fetch next voucher number
    state.voucherNo = await api.getNextVoucherNo(voucherType);
    if (dom.voucherNo) dom.voucherNo.value = state.voucherNo;

    // Reset Banner
    updatePartyBanner(null);
    recalculateAmounts();

    if (dom.btnAccDelete) dom.btnAccDelete.classList.add('hidden');
    if (dom.voucherStatus) {
      dom.voucherStatus.textContent = 'New Entry';
      dom.voucherStatus.style.color = '#059669';
    }
  }

  // Update Party Banner
  function updatePartyBanner(party) {
    if (!party) {
      dom.bannerPartyTitle.textContent = 'No Party Selected';
      dom.bannerPartyType.textContent = 'Select customer or supplier (Press F1)';
      dom.bannerAreaCity.textContent = '--';
      dom.bannerPhone.textContent = '--';
      dom.bannerPrevBalance.textContent = 'Rs. 0.00';
      dom.bannerPrevBalance.className = 'acc-banner-val';
      dom.calcPrevBalDisplay.textContent = 'Rs. 0.00';
      return;
    }

    const prevBal = Number(party.openingBalance) || 0;
    dom.bannerPartyTitle.textContent = party.name || '--';
    dom.bannerPartyType.textContent = `${party.partyTypeName || 'Party'} | Contact: ${party.contactPerson || 'N/A'}`;
    dom.bannerAreaCity.textContent = `${party.areaName || ''}${party.city ? `, ${party.city}` : ''}` || '--';
    dom.bannerPhone.textContent = party.phone || '--';

    const balFormatted = formatMoney(Math.abs(prevBal));
    const balTag = prevBal > 0 ? `${balFormatted} (Dr / Receivable)` : prevBal < 0 ? `${balFormatted} (Cr / Payable)` : 'Rs. 0.00 (Nil)';
    dom.bannerPrevBalance.textContent = balTag;
    dom.bannerPrevBalance.className = `acc-banner-val ${prevBal > 0 ? 'dr' : prevBal < 0 ? 'cr' : ''}`;
    dom.calcPrevBalDisplay.textContent = balTag;
  }

  // Recalculate Voucher Amounts
  function recalculateAmounts() {
    const prevBal = state.selectedParty ? (Number(state.selectedParty.openingBalance) || 0) : 0;
    const amount = Number(dom.amountInput?.value) || 0;
    const discount = Number(dom.discountInput?.value) || 0;
    const netSettlement = amount + discount;

    dom.netSettlementDisplay.textContent = formatMoney(netSettlement);

    // New Remaining Balance Calculation:
    // For CRV (Cash received from customer): Reduces receivable
    // For CPV (Cash paid to supplier): Reduces payable
    let newBal = prevBal - netSettlement;

    const newBalFormatted = formatMoney(Math.abs(newBal));
    const newBalTag = newBal > 0 ? `${newBalFormatted} (Dr)` : newBal < 0 ? `${newBalFormatted} (Cr)` : 'Rs. 0.00';
    dom.newBalanceDisplay.textContent = newBalTag;
    dom.newBalanceDisplay.className = `acc-calc-val-large ${newBal > 0 ? 'negative' : newBal < 0 ? 'positive' : ''}`;
  }

  // ========================================================
  // PARTY HELP SEARCH WINDOW (F1 MODAL IMPLEMENTATION)
  // ========================================================
  async function openPartyHelpModal() {
    // Refresh parties list
    state.partiesList = await api.getParties();
    state.activeModalFilter = 'all';
    state.searchSelectedIndex = 0;

    // Reset pills
    const pills = dom.helpModal.querySelectorAll('.acc-filter-pill');
    pills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));

    dom.modalSearchInput.value = '';
    filterAndRenderHelpParties();

    dom.helpModal.classList.remove('hidden');
    dom.modalSearchInput.focus();
  }

  function closePartyHelpModal() {
    dom.helpModal.classList.add('hidden');
    if (state.activeTab === 'ledger') {
      dom.ledgerPartyInput.focus();
    } else {
      dom.amountInput.focus();
    }
  }

  function filterAndRenderHelpParties() {
    const q = (dom.modalSearchInput.value || '').trim().toLowerCase();
    const filter = state.activeModalFilter;

    state.searchFilteredParties = state.partiesList.filter(p => {
      // Type filter
      if (filter === 'Customer' && p.partyTypeName && !p.partyTypeName.toLowerCase().includes('customer') && !p.partyTypeName.toLowerCase().includes('wholesaler') && !p.partyTypeName.toLowerCase().includes('retailer')) {
        return false;
      }
      if (filter === 'Vendor' && p.partyTypeName && !p.partyTypeName.toLowerCase().includes('vendor') && !p.partyTypeName.toLowerCase().includes('supplier')) {
        return false;
      }

      // Query filter
      if (!q) return true;
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.areaName && p.areaName.toLowerCase().includes(q)) ||
        (p.partyTypeName && p.partyTypeName.toLowerCase().includes(q)) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(q))
      );
    });

    if (state.searchSelectedIndex >= state.searchFilteredParties.length) {
      state.searchSelectedIndex = Math.max(0, state.searchFilteredParties.length - 1);
    }

    renderHelpPartiesTable();
  }

  function renderHelpPartiesTable() {
    dom.modalResultsCount.textContent = `Found ${state.searchFilteredParties.length} parties`;

    if (state.searchFilteredParties.length === 0) {
      dom.modalPartiesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
            No parties match your search. Create new party in General Info.
          </td>
        </tr>
      `;
      return;
    }

    dom.modalPartiesTableBody.innerHTML = state.searchFilteredParties.map((p, idx) => {
      const isSelected = idx === state.searchSelectedIndex;
      const bal = Number(p.openingBalance) || 0;
      const balStr = formatMoney(Math.abs(bal)) + (bal > 0 ? ' (Dr)' : bal < 0 ? ' (Cr)' : '');
      const balClass = bal > 0 ? 'acc-badge-dr' : bal < 0 ? 'acc-badge-cr' : '';

      return `
        <tr class="${isSelected ? 'selected' : ''}" data-index="${idx}">
          <td style="color: #64748b;">${idx + 1}</td>
          <td>
            <strong>${p.name || ''}</strong>
            ${p.contactPerson ? `<div style="font-size: 0.75rem; color: #64748b;">Contact: ${p.contactPerson}</div>` : ''}
          </td>
          <td><span class="acc-badge-pill" style="font-size: 0.7rem; padding: 2px 8px; background: #f1f5f9; color: #334155;">${p.partyTypeName || 'Party'}</span></td>
          <td>${p.areaName || ''}${p.city ? `, ${p.city}` : ''}</td>
          <td>${p.phone || '--'}</td>
          <td style="text-align: right;" class="${balClass}"><strong>${balStr}</strong></td>
        </tr>
      `;
    }).join('');

    // Ensure selected row is scrolled into view
    const selectedEl = dom.modalPartiesTableBody.querySelector('tr.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectHelpParty(party) {
    if (!party) return;
    state.selectedParty = party;

    if (state.activeTab === 'ledger') {
      dom.ledgerPartyInput.value = `${party.name} (${party.partyTypeName || 'Party'})`;
      loadPartyLedger(party.id);
    } else {
      dom.partyInput.value = party.name;
      updatePartyBanner(party);
      recalculateAmounts();
    }

    closePartyHelpModal();
  }

  // ========================================================
  // SAVE VOUCHER ACTION
  // ========================================================
  async function handleSaveVoucher() {
    if (!state.selectedParty) {
      showToast('Please select a Party Account first (Press F1)', 'warning');
      dom.partyInput.focus();
      return;
    }

    const amount = Number(dom.amountInput.value) || 0;
    const discount = Number(dom.discountInput.value) || 0;
    const netAmount = amount + discount;

    if (netAmount <= 0) {
      showToast('Please enter received/paid cash amount', 'warning');
      dom.amountInput.focus();
      return;
    }

    const voucherType = state.activeTab === 'cpv' ? 'CPV' : 'CRV';
    const prevBal = Number(state.selectedParty.openingBalance) || 0;
    const newBal = prevBal - netAmount;

    const voucherData = {
      id: state.voucherId,
      voucherType,
      voucherNo: state.voucherNo || dom.voucherNo.value,
      manualNo: dom.manualNo.value.trim(),
      entryDate: dom.entryDate.value || new Date().toISOString().slice(0, 10),
      partyId: state.selectedParty.id,
      partyTitle: state.selectedParty.name,
      partyType: state.selectedParty.partyTypeName || '',
      phone: state.selectedParty.phone || '',
      areaName: state.selectedParty.areaName || '',
      city: state.selectedParty.city || '',
      previousBalance: prevBal,
      amount,
      discount,
      netAmount,
      newBalance: newBal,
      paymentMode: dom.paymentMode.value,
      chequeOrRefNo: dom.chequeRef.value.trim(),
      remarks: dom.remarks.value.trim()
    };

    try {
      dom.btnAccSave.disabled = true;
      dom.btnAccSave.textContent = 'Saving...';

      const res = await api.saveVoucher(voucherData);
      if (res && res.success) {
        showToast(`${voucherType} #${res.voucherNo} saved successfully! Ledger balance updated.`, 'success');
        state.voucherId = res.id;
        state.voucherNo = res.voucherNo;

        // Update local party object's balance
        state.selectedParty.openingBalance = newBal;
        updatePartyBanner(state.selectedParty);

        if (dom.btnAccDelete) dom.btnAccDelete.classList.remove('hidden');
        if (dom.voucherStatus) {
          dom.voucherStatus.textContent = 'Saved';
          dom.voucherStatus.style.color = '#0284c7';
        }
      }
    } catch (err) {
      console.error('Failed to save accounts voucher:', err);
      showToast('Error saving voucher: ' + err.message, 'error');
    } finally {
      dom.btnAccSave.disabled = false;
      dom.btnAccSave.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Save Voucher
      `;
    }
  }

  // ========================================================
  // DELETE VOUCHER ACTION
  // ========================================================
  async function handleDeleteVoucher() {
    if (!state.voucherId) return;

    const proceed = confirm(`Are you sure you want to delete Voucher #${state.voucherNo}? This will revert the party's ledger balance.`);
    if (!proceed) return;

    try {
      await api.deleteVoucher(state.voucherId);
      showToast(`Voucher #${state.voucherNo} deleted. Balance reverted.`, 'success');
      await resetVoucher();
    } catch (err) {
      console.error('Error deleting voucher:', err);
      showToast('Failed to delete voucher: ' + err.message, 'error');
    }
  }

  // ========================================================
  // PRINT THERMAL / VOUCHER RECEIPT
  // ========================================================
  function handlePrintSlip() {
    if (!state.selectedParty) {
      showToast('Select party and save voucher before printing', 'warning');
      return;
    }

    const voucherType = state.activeTab === 'cpv' ? 'CPV' : 'CRV';
    const typeLabel = voucherType === 'CPV' ? 'CASH PAYMENT VOUCHER' : 'CASH RECEIPT VOUCHER';
    const vNo = state.voucherNo || dom.voucherNo.value;
    const date = dom.entryDate.value || new Date().toISOString().slice(0, 10);
    const amount = Number(dom.amountInput.value) || 0;
    const discount = Number(dom.discountInput.value) || 0;
    const net = amount + discount;
    const prevBal = Number(state.selectedParty.openingBalance) || 0;
    const newBal = prevBal - net;

    dom.printArea.innerHTML = `
      <div class="acc-thermal-slip">
        <div class="acc-thermal-header">
          <div class="acc-thermal-title">SHAHZAIB TRADERS</div>
          <div>Wholesale & Retail Commercial Market</div>
          <div>Phone: 0300-1234567 / Wah Cantt</div>
          <div style="margin-top: 4px; font-weight: bold;">*** ${typeLabel} ***</div>
        </div>

        <div class="acc-thermal-row">
          <span>Voucher #:</span>
          <strong>${vNo}</strong>
        </div>
        <div class="acc-thermal-row">
          <span>Date:</span>
          <span>${date}</span>
        </div>
        <div class="acc-thermal-row">
          <span>Party:</span>
          <strong>${state.selectedParty.name}</strong>
        </div>
        <div class="acc-thermal-row">
          <span>Area / City:</span>
          <span>${state.selectedParty.areaName || ''} ${state.selectedParty.city || ''}</span>
        </div>
        <div class="acc-thermal-row">
          <span>Phone:</span>
          <span>${state.selectedParty.phone || '--'}</span>
        </div>
        <div class="acc-thermal-row">
          <span>Mode:</span>
          <span>${dom.paymentMode.value} ${dom.chequeRef.value ? `(${dom.chequeRef.value})` : ''}</span>
        </div>

        <div class="acc-thermal-total">
          <div class="acc-thermal-row">
            <span>Previous Balance:</span>
            <span>Rs. ${prevBal.toLocaleString()}</span>
          </div>
          <div class="acc-thermal-row">
            <span>Amount Received/Paid:</span>
            <span>Rs. ${amount.toLocaleString()}</span>
          </div>
          ${discount > 0 ? `
          <div class="acc-thermal-row">
            <span>Discount / Rebate:</span>
            <span>Rs. ${discount.toLocaleString()}</span>
          </div>` : ''}
          <div class="acc-thermal-row" style="font-size: 14px; margin-top: 4px;">
            <span>NET SETTLEMENT:</span>
            <strong>Rs. ${net.toLocaleString()}</strong>
          </div>
          <div class="acc-thermal-row">
            <span>Remaining Balance:</span>
            <strong>Rs. ${newBal.toLocaleString()}</strong>
          </div>
        </div>

        ${dom.remarks.value ? `
        <div style="margin: 6px 0; font-size: 11px;">
          <em>Remarks: ${dom.remarks.value}</em>
        </div>` : ''}

        <div style="text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px dashed #000; padding-top: 6px;">
          Thank you for your business!<br>
          Software by Shahzaib Traders
        </div>
      </div>
    `;

    window.print();
  }

  // ========================================================
  // PARTY ACCOUNT LEDGER
  // ========================================================
  async function loadPartyLedger(partyId) {
    if (!partyId) return;

    dom.ledgerTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
          Loading chronological ledger transactions...
        </td>
      </tr>
    `;

    const fromDate = dom.ledgerFromDate.value;
    const toDate = dom.ledgerToDate.value;

    const ledger = await api.getPartyLedger(partyId, fromDate, toDate);
    state.currentLedgerData = ledger;

    if (!ledger) {
      dom.ledgerTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
            No transactions found for this party.
          </td>
        </tr>
      `;
      return;
    }

    // Update KPI summary cards
    dom.kpiOpening.textContent = formatMoney(ledger.openingBalance);
    dom.kpiDebit.textContent = formatMoney(ledger.totalDebit);
    dom.kpiCredit.textContent = formatMoney(ledger.totalCredit);

    const closeFormatted = formatMoney(Math.abs(ledger.closingBalance));
    dom.kpiClosing.textContent = `${closeFormatted} ${ledger.closingBalance > 0 ? '(Dr)' : ledger.closingBalance < 0 ? '(Cr)' : ''}`;
    dom.kpiClosing.className = `acc-kpi-val ${ledger.closingBalance > 0 ? 'red' : 'green'}`;

    if (!ledger.entries || ledger.entries.length === 0) {
      dom.ledgerTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: #64748b;">
            Opening Balance: <strong>${formatMoney(ledger.openingBalance)}</strong>. No transactions in this date range.
          </td>
        </tr>
      `;
      return;
    }

    // Render Rows
    dom.ledgerTableBody.innerHTML = ledger.entries.map((e, idx) => {
      const balStr = formatMoney(Math.abs(e.balance)) + (e.balance > 0 ? ' (Dr)' : e.balance < 0 ? ' (Cr)' : '');
      const balClass = e.balance > 0 ? 'acc-badge-dr' : e.balance < 0 ? 'acc-badge-cr' : '';

      return `
        <tr>
          <td>${e.date || '--'}</td>
          <td><strong>${e.voucherNo || '--'}</strong></td>
          <td><span class="acc-badge-pill" style="font-size: 0.725rem; padding: 2px 6px;">${e.type}</span></td>
          <td>${e.description || '--'}</td>
          <td style="text-align: right; color: #0284c7;">${e.debit > 0 ? formatMoney(e.debit) : '-'}</td>
          <td style="text-align: right; color: #059669;">${e.credit > 0 ? formatMoney(e.credit) : '-'}</td>
          <td style="text-align: right;" class="${balClass}"><strong>${balStr}</strong></td>
        </tr>
      `;
    }).join('');
  }

  // Print Complete Ledger Statement
  function handlePrintLedger() {
    if (!state.currentLedgerData || !state.selectedParty) {
      showToast('Select party and generate ledger first', 'warning');
      return;
    }

    const ledger = state.currentLedgerData;
    const party = state.selectedParty;
    const fromDate = dom.ledgerFromDate.value || 'Beginning';
    const toDate = dom.ledgerToDate.value || 'Today';

    dom.printArea.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px;">
          <h2 style="margin: 0; font-size: 20px;">SHAHZAIB TRADERS</h2>
          <p style="margin: 2px 0; font-size: 13px;">Wholesale & Retail Trading Solutions - Wah Cantt</p>
          <h3 style="margin: 8px 0 0; font-size: 16px;">PARTY ACCOUNT LEDGER STATEMENT</h3>
          <p style="margin: 2px 0; font-size: 12px;">Period: ${fromDate} to ${toDate}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px;">
          <div>
            <strong>Party:</strong> ${party.name}<br>
            <strong>Type:</strong> ${party.partyTypeName || 'Party'} | <strong>Contact:</strong> ${party.contactPerson || '--'}<br>
            <strong>City/Area:</strong> ${party.areaName || ''} ${party.city || ''} | <strong>Phone:</strong> ${party.phone || '--'}
          </div>
          <div style="text-align: right;">
            <strong>Opening Balance:</strong> ${formatMoney(ledger.openingBalance)}<br>
            <strong>Total Debits (Dr):</strong> ${formatMoney(ledger.totalDebit)}<br>
            <strong>Total Credits (Cr):</strong> ${formatMoney(ledger.totalCredit)}<br>
            <strong>Closing Balance:</strong> <strong>${formatMoney(ledger.closingBalance)}</strong>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;" border="1">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 6px;">Date</th>
              <th style="padding: 6px;">Voucher #</th>
              <th style="padding: 6px;">Type</th>
              <th style="padding: 6px;">Description</th>
              <th style="padding: 6px; text-align: right;">Debit (Dr)</th>
              <th style="padding: 6px; text-align: right;">Credit (Cr)</th>
              <th style="padding: 6px; text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${(ledger.entries || []).map(e => `
              <tr>
                <td style="padding: 5px;">${e.date || '--'}</td>
                <td style="padding: 5px;">${e.voucherNo || '--'}</td>
                <td style="padding: 5px;">${e.type || '--'}</td>
                <td style="padding: 5px;">${e.description || '--'}</td>
                <td style="padding: 5px; text-align: right;">${e.debit > 0 ? e.debit.toLocaleString() : '-'}</td>
                <td style="padding: 5px; text-align: right;">${e.credit > 0 ? e.credit.toLocaleString() : '-'}</td>
                <td style="padding: 5px; text-align: right; font-weight: bold;">${Math.abs(e.balance).toLocaleString()} ${e.balance >= 0 ? 'Dr' : 'Cr'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px;">
          <div>Prepared By: ___________________</div>
          <div>Authorized Signature: ___________________</div>
        </div>
      </div>
    `;

    window.print();
  }

  // ========================================================
  // VOUCHERS REGISTER (HISTORY TAB)
  // ========================================================
  async function loadVouchersHistory() {
    const filter = {
      type: dom.historyTypeFilter.value,
      search: dom.historySearch.value
    };

    const list = await api.getAllVouchers(filter);
    state.vouchersList = list || [];

    dom.historyCount.textContent = `Showing ${state.vouchersList.length} vouchers`;

    if (state.vouchersList.length === 0) {
      dom.historyTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: #94a3b8;">
            No vouchers recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    dom.historyTableBody.innerHTML = state.vouchersList.map(v => {
      const isCRV = (v.voucherType === 'CRV');
      const badgeClass = isCRV ? 'crv' : 'cpv';

      return `
        <tr data-id="${v.id}">
          <td>${v.entryDate || '--'}</td>
          <td><strong>${v.voucherNo}</strong></td>
          <td><span class="acc-badge-pill ${badgeClass}" style="font-size: 0.675rem; padding: 2px 6px;">${v.voucherType}</span></td>
          <td>${v.partyTitle || '--'}</td>
          <td>${v.areaName || ''}${v.city ? `, ${v.city}` : ''}</td>
          <td style="text-align: right;">Rs. ${(v.amount || 0).toLocaleString()}</td>
          <td style="text-align: right; color: #64748b;">Rs. ${(v.discount || 0).toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; color: ${isCRV ? '#059669' : '#dc2626'};">Rs. ${(v.netAmount || 0).toLocaleString()}</td>
          <td><span style="font-size: 0.75rem; color: #64748b;">${v.paymentMode || 'Cash'}</span></td>
          <td style="text-align: center;">
            <button class="acc-btn acc-btn-new btn-history-load" data-id="${v.id}" style="padding: 3px 8px; font-size: 0.725rem;">Load</button>
            <button class="acc-btn acc-btn-delete btn-history-del" data-id="${v.id}" style="padding: 3px 8px; font-size: 0.725rem;">&times;</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    dom.historyTableBody.querySelectorAll('.btn-history-load').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const v = state.vouchersList.find(x => x.id === id);
        if (v) loadVoucherIntoForm(v);
      });
    });

    dom.historyTableBody.querySelectorAll('.btn-history-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this voucher and revert party balance?')) {
          await api.deleteVoucher(id);
          showToast('Voucher deleted', 'success');
          loadVouchersHistory();
        }
      });
    });
  }

  // Load Past Voucher Into Form for Editing/Reprinting
  function loadVoucherIntoForm(v) {
    state.voucherId = v.id;
    state.voucherNo = v.voucherNo;

    // Find party from parties list
    const party = state.partiesList.find(p => p.id === v.partyId) || {
      id: v.partyId,
      name: v.partyTitle,
      partyTypeName: v.partyType,
      phone: v.phone,
      areaName: v.areaName,
      city: v.city,
      openingBalance: v.previousBalance
    };
    state.selectedParty = party;

    switchAccountsTab(v.voucherType === 'CPV' ? 'cpv' : 'crv');

    dom.voucherNo.value = v.voucherNo;
    dom.entryDate.value = v.entryDate || '';
    dom.manualNo.value = v.manualNo || '';
    dom.partyInput.value = v.partyTitle || '';
    dom.amountInput.value = v.amount || '';
    dom.discountInput.value = v.discount || '';
    dom.paymentMode.value = v.paymentMode || 'Cash';
    dom.chequeRef.value = v.chequeOrRefNo || '';
    dom.remarks.value = v.remarks || '';

    updatePartyBanner(party);
    recalculateAmounts();

    dom.btnAccDelete.classList.remove('hidden');
    dom.voucherStatus.textContent = 'Existing Voucher Loaded';
    dom.voucherStatus.style.color = '#0284c7';
    showToast(`Loaded ${v.voucherNo}`, 'success');
  }

  // ========================================================
  // BIND ALL EVENTS & SHORTCUTS
  // ========================================================
  function bindEvents() {
    // Nav Tabs
    dom.btnTabCRV.addEventListener('click', () => switchAccountsTab('crv'));
    dom.btnTabCPV.addEventListener('click', () => switchAccountsTab('cpv'));
    dom.btnTabLedger.addEventListener('click', () => switchAccountsTab('ledger'));
    dom.btnTabHistory.addEventListener('click', () => switchAccountsTab('history'));

    // Actions
    dom.btnAccNew.addEventListener('click', () => resetVoucher());
    dom.btnAccSave.addEventListener('click', handleSaveVoucher);
    dom.btnAccPrint.addEventListener('click', handlePrintSlip);
    dom.btnAccDelete.addEventListener('click', handleDeleteVoucher);

    // Amounts calculation triggers
    dom.amountInput.addEventListener('input', recalculateAmounts);
    dom.discountInput.addEventListener('input', recalculateAmounts);

    // F1 Help Search Modal Triggers
    dom.btnOpenF1Search.addEventListener('click', openPartyHelpModal);
    dom.triggerF1Help.addEventListener('click', openPartyHelpModal);
    dom.partyInput.addEventListener('click', openPartyHelpModal);
    dom.btnAccLedgerF1.addEventListener('click', openPartyHelpModal);
    dom.ledgerPartyInput.addEventListener('click', openPartyHelpModal);
    dom.btnClosePartyHelpModal.addEventListener('click', closePartyHelpModal);

    // Modal Search Filtering
    dom.modalSearchInput.addEventListener('input', filterAndRenderHelpParties);

    // Modal Filter Pills
    dom.helpModal.querySelectorAll('.acc-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        dom.helpModal.querySelectorAll('.acc-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.activeModalFilter = pill.dataset.filter;
        filterAndRenderHelpParties();
      });
    });

    // Modal Table Row Clicks
    dom.modalPartiesTableBody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row || !row.dataset.index) return;
      const idx = parseInt(row.dataset.index, 10);
      const party = state.searchFilteredParties[idx];
      if (party) selectHelpParty(party);
    });

    // Modal Keyboard Navigation
    dom.modalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.searchSelectedIndex = Math.min(state.searchFilteredParties.length - 1, state.searchSelectedIndex + 1);
        renderHelpPartiesTable();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.searchSelectedIndex = Math.max(0, state.searchSelectedIndex - 1);
        renderHelpPartiesTable();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const party = state.searchFilteredParties[state.searchSelectedIndex];
        if (party) selectHelpParty(party);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePartyHelpModal();
      }
    });

    // Ledger View Controls
    dom.ledgerFromDate.addEventListener('change', () => {
      if (state.selectedParty) loadPartyLedger(state.selectedParty.id);
    });
    dom.ledgerToDate.addEventListener('change', () => {
      if (state.selectedParty) loadPartyLedger(state.selectedParty.id);
    });
    dom.btnLedgerFilterThisMonth.addEventListener('click', () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      dom.ledgerFromDate.value = firstDay;
      dom.ledgerToDate.value = now.toISOString().slice(0, 10);
      if (state.selectedParty) loadPartyLedger(state.selectedParty.id);
    });
    dom.btnLedgerFilterAllTime.addEventListener('click', () => {
      dom.ledgerFromDate.value = '';
      dom.ledgerToDate.value = '';
      if (state.selectedParty) loadPartyLedger(state.selectedParty.id);
    });
    dom.btnLedgerPrintStatement.addEventListener('click', handlePrintLedger);

    // History View Controls
    dom.historySearch.addEventListener('input', loadVouchersHistory);
    dom.historyTypeFilter.addEventListener('change', loadVouchersHistory);

    // GLOBAL F1 KEYBOARD SHORTCUT (When Accounts Tab is Active)
    window.addEventListener('keydown', (e) => {
      // Check if accounts view is currently active or focused
      const accountsView = document.getElementById('accountsView');
      const isAccountsActive = accountsView && accountsView.classList.contains('active');

      if (e.key === 'F1') {
        if (isAccountsActive) {
          e.preventDefault();
          if (dom.helpModal.classList.contains('hidden')) {
            openPartyHelpModal();
          } else {
            closePartyHelpModal();
          }
        }
      } else if (e.key === 'Escape') {
        if (!dom.helpModal.classList.contains('hidden')) {
          e.preventDefault();
          closePartyHelpModal();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (isAccountsActive && (state.activeTab === 'crv' || state.activeTab === 'cpv')) {
          e.preventDefault();
          handleSaveVoucher();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        if (isAccountsActive && (state.activeTab === 'crv' || state.activeTab === 'cpv')) {
          e.preventDefault();
          resetVoucher();
        }
      }
    });
  }

  // ========================================================
  // INITIALIZATION ON TAB ACTIVATION
  // ========================================================
  async function init() {
    renderAccountsTemplate();
    cacheDom();
    bindEvents();
    state.partiesList = await api.getParties();
    await switchAccountsTab('crv');
  }

  // Initialize once DOM is loaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Hook into tab activation
  const accountsNavBtn = document.getElementById('navAccountsMainBtn');
  if (accountsNavBtn) {
    accountsNavBtn.addEventListener('click', async () => {
      state.partiesList = await api.getParties();
      if (!state.voucherNo) {
        state.voucherNo = await api.getNextVoucherNo(state.activeTab === 'cpv' ? 'CPV' : 'CRV');
        if (dom.voucherNo) dom.voucherNo.value = state.voucherNo;
      }
    });
  }

  // Export module globally
  window.AccountsModule = {
    onActivate: async () => {
      state.partiesList = await api.getParties();
      if (state.activeTab === 'ledger' && state.selectedParty) {
        loadPartyLedger(state.selectedParty.id);
      } else if (state.activeTab === 'history') {
        loadVouchersHistory();
      }
    },
    openPartySearch: openPartyHelpModal,
    switchTab: switchAccountsTab
  };

})();
