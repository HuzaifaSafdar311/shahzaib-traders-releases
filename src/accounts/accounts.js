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
    // Universal shared formatters
  const formatMoney = (val, incl) => (window.formatMoney ? window.formatMoney(val, incl) : ('Rs. ' + (Number(val) || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })));
  const formatNumber = (val, dec) => (window.formatNumber ? window.formatNumber(val, dec) : (Number(val) || 0).toLocaleString('en-PK'));
  const cleanText = (val, fb) => (window.cleanText ? window.cleanText(val, fb) : (val ?? '-'));
  const formatDate = (val, fb) => (window.formatDate ? window.formatDate(val, fb) : (val ?? '-'));

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
              <input type="text" id="accChequeRef" class="acc-form-control" placeholder="Enter cheque / bank slip ref">
            </div>
            <div class="acc-form-group">
              <label>Narration / Description / Remarks</label>
              <input type="text" id="accRemarks" class="acc-form-control" placeholder="Enter voucher remarks / narration">
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

      <!-- ============================================== -->
      <!-- LEDGER PRINT TEMPLATE SELECTOR MODAL           -->
      <!-- User chooses A4 or Thermal Receipt (80/58mm)   -->
      <!-- ============================================== -->
      <div id="accLedgerPrintModal" class="acc-modal-overlay hidden">
        <div class="acc-modal-box acc-modal-print-template">
          <div class="acc-modal-header" style="background: #0f172a; padding: 14px 18px; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              <span style="font-weight: 700; font-size: 1.05rem; color: #ffffff;">Print Ledger Statement</span>
            </div>
            <button type="button" id="btnAccClosePrintModal" class="acc-modal-close-btn">&times;</button>
          </div>

          <div style="padding: 16px 20px;">
            <div id="accPrintPartySub" style="margin-bottom: 14px; font-size: 0.85rem; color: #475569; font-weight: 500;">
              Select print template and paper format
            </div>

            <!-- Template Choice Cards -->
            <div class="acc-print-template-options">
              <label class="acc-template-card" id="cardTplA4">
                <input type="radio" name="accLedgerTemplateRadio" value="a4" checked>
                <div class="acc-template-card-content">
                  <div class="acc-template-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div>
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">A4 Statement (Full Page)</div>
                    <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                      Full page with Date, Voucher #, Description, Debit, Credit, and Balance.
                    </div>
                  </div>
                </div>
              </label>

              <label class="acc-template-card" id="cardTplThermal">
                <input type="radio" name="accLedgerTemplateRadio" value="thermal">
                <div class="acc-template-card-content">
                  <div class="acc-template-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  </div>
                  <div>
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">Thermal Receipt (Narrow Roll)</div>
                    <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                      Continuous roll for shop bills with wrapped descriptions so nothing is cut off.
                    </div>
                  </div>
                </div>
              </label>
            </div>

            <!-- Thermal Paper Width (80mm vs 58mm) -->
            <div id="accThermalWidthOptions" class="acc-thermal-width-box" style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; display: none;">
              <div style="font-size: 0.825rem; font-weight: 600; color: #334155; margin-bottom: 8px;">
                Paper Roll Width:
              </div>
              <div style="display: flex; gap: 20px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer;">
                  <input type="radio" name="accThermalPaperWidth" value="80mm" checked>
                  <span><strong>80mm</strong> (Standard POS Roll)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer;">
                  <input type="radio" name="accThermalPaperWidth" value="58mm">
                  <span><strong>58mm</strong> (Compact Roll)</span>
                </label>
              </div>
            </div>
          </div>

          <div style="padding: 12px 20px; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
            <button type="button" id="btnAccCancelPrintModal" class="acc-btn" style="background: #e2e8f0; color: #334155;">Cancel</button>
            <button type="button" id="btnAccConfirmPrintLedger" class="acc-btn acc-btn-print" style="background: #0284c7; color: #ffffff;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print
            </button>
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

      // Print Elements
      printArea: document.getElementById('accountsPrintArea'),
      printModal: document.getElementById('accLedgerPrintModal'),
      btnClosePrintModal: document.getElementById('btnAccClosePrintModal'),
      btnCancelPrintModal: document.getElementById('btnAccCancelPrintModal'),
      btnConfirmPrintLedger: document.getElementById('btnAccConfirmPrintLedger'),
      cardTplA4: document.getElementById('cardTplA4'),
      cardTplThermal: document.getElementById('cardTplThermal'),
      thermalWidthOptions: document.getElementById('accThermalWidthOptions'),
      printPartySub: document.getElementById('accPrintPartySub')
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

  // Helper: Check if party is Supplier / Vendor
  function isSupplierParty(party) {
    if (!party) return false;
    if (typeof party === 'string') {
      const s = party.toLowerCase();
      return s.includes('vendor') || s.includes('supplier') || s === 'pt-2';
    }
    const pType = String(party.partyTypeName || party.partyType || '').toLowerCase();
    const pId = String(party.partyTypeId || party.id || '').toLowerCase();
    return pType.includes('vendor') || pType.includes('supplier') || pId === 'pt-2';
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

    const isSupp = isSupplierParty(party);
    const prevBal = Number(party.currentBalance !== undefined ? party.currentBalance : party.openingBalance) || 0;
    dom.bannerPartyTitle.textContent = party.name || '--';
    dom.bannerPartyType.textContent = `${party.partyTypeName || (isSupp ? 'Vendor / Supplier' : 'Customer')} | Contact: ${party.contactPerson || 'N/A'}`;
    dom.bannerAreaCity.textContent = `${party.areaName || ''}${party.city ? `, ${party.city}` : ''}` || '--';
    dom.bannerPhone.textContent = party.phone || '--';

    const balFormatted = formatMoney(Math.abs(prevBal));
    let balTag = 'Rs. 0.00 (Nil)';
    let balClass = '';
    if (prevBal !== 0) {
      if (isSupp) {
        balTag = prevBal > 0 ? `${balFormatted} (Cr / Payable)` : `${balFormatted} (Dr / Advance Paid)`;
        balClass = prevBal > 0 ? 'cr' : 'dr';
      } else {
        balTag = prevBal > 0 ? `${balFormatted} (Dr / Receivable)` : `${balFormatted} (Cr / Advance Received)`;
        balClass = prevBal > 0 ? 'dr' : 'cr';
      }
    }
    dom.bannerPrevBalance.textContent = balTag;
    dom.bannerPrevBalance.className = `acc-banner-val ${balClass}`;
    dom.calcPrevBalDisplay.textContent = balTag;
  }

  // Recalculate Voucher Amounts
  function recalculateAmounts() {
    const isSupp = isSupplierParty(state.selectedParty);
    const prevBal = state.selectedParty ? (Number(state.selectedParty.currentBalance !== undefined ? state.selectedParty.currentBalance : state.selectedParty.openingBalance) || 0) : 0;
    const amount = Number(dom.amountInput?.value) || 0;
    const discount = Number(dom.discountInput?.value) || 0;
    const netSettlement = amount + discount;

    dom.netSettlementDisplay.textContent = formatMoney(netSettlement);

    // Remaining Balance Calculation:
    // Party     | CRV (Cash Receipt)          | CPV (Cash Payment)
    // Customer  | Balance decreases (credit)  | Balance increases (debit)
    // Supplier  | Balance increases (credit)  | Balance decreases (debit)
    const voucherType = state.activeTab === 'cpv' ? 'CPV' : 'CRV';
    let newBal = prevBal;
    if (isSupp) {
      newBal = voucherType === 'CRV' ? (prevBal + netSettlement) : (prevBal - netSettlement);
    } else {
      newBal = voucherType === 'CRV' ? (prevBal - netSettlement) : (prevBal + netSettlement);
    }

    const newBalFormatted = formatMoney(Math.abs(newBal));
    let newBalTag = 'Rs. 0.00';
    let newBalClass = '';
    if (newBal !== 0) {
      if (isSupp) {
        newBalTag = newBal > 0 ? `${newBalFormatted} (Cr / Payable)` : `${newBalFormatted} (Dr / Advance Paid)`;
        newBalClass = newBal > 0 ? 'negative' : 'positive';
      } else {
        newBalTag = newBal > 0 ? `${newBalFormatted} (Dr / Receivable)` : `${newBalFormatted} (Cr / Advance)`;
        newBalClass = newBal > 0 ? 'negative' : 'positive';
      }
    }
    dom.newBalanceDisplay.textContent = newBalTag;
    dom.newBalanceDisplay.className = `acc-calc-val-large ${newBalClass}`;
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
      const isSupp = isSupplierParty(p);
      const bal = Number(p.currentBalance !== undefined ? p.currentBalance : p.openingBalance) || 0;
      let balStr = formatMoney(Math.abs(bal));
      let balClass = '';
      if (bal !== 0) {
        if (isSupp) {
          balStr += bal > 0 ? ' (Cr / Payable)' : ' (Dr / Adv)';
          balClass = bal > 0 ? 'acc-badge-cr' : 'acc-badge-dr';
        } else {
          balStr += bal > 0 ? ' (Dr / Rec)' : ' (Cr / Adv)';
          balClass = bal > 0 ? 'acc-badge-dr' : 'acc-badge-cr';
        }
      }

      return `
        <tr class="${isSelected ? 'selected' : ''}" data-index="${idx}">
          <td style="color: #64748b;">${idx + 1}</td>
          <td>
            <strong>${p.name || ''}</strong>
            ${p.contactPerson ? `<div style="font-size: 0.75rem; color: #64748b;">Contact: ${p.contactPerson}</div>` : ''}
          </td>
          <td><span class="acc-badge-pill" style="font-size: 0.7rem; padding: 2px 8px; background: #f1f5f9; color: #334155;">${p.partyTypeName || (isSupp ? 'Vendor / Supplier' : 'Customer')}</span></td>
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
      if (dom.amountInput) dom.amountInput.focus();
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
    const isSupp = isSupplierParty(state.selectedParty);
    const prevBal = Number(state.selectedParty.currentBalance !== undefined ? state.selectedParty.currentBalance : state.selectedParty.openingBalance) || 0;
    let newBal = prevBal;
    if (isSupp) {
      newBal = voucherType === 'CRV' ? (prevBal + netAmount) : (prevBal - netAmount);
    } else {
      newBal = voucherType === 'CRV' ? (prevBal - netAmount) : (prevBal + netAmount);
    }

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
        state.selectedParty.currentBalance = newBal;
        const inList = (state.partiesList || []).find(p => p.id === state.selectedParty.id);
        if (inList) inList.currentBalance = newBal;
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

      state.partiesList = await api.getParties();
      const inList = (state.partiesList || []).find(p => p.id === state.selectedParty?.id);
      if (inList) {
        state.selectedParty = inList;
        updatePartyBanner(inList);
      }
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

    const isSupp = isSupplierParty(state.selectedParty);
    const prevBal = Number(state.selectedParty.currentBalance !== undefined ? state.selectedParty.currentBalance : state.selectedParty.openingBalance) || 0;
    let newBal = prevBal;
    if (isSupp) {
      newBal = voucherType === 'CRV' ? (prevBal + net) : (prevBal - net);
    } else {
      newBal = voucherType === 'CRV' ? (prevBal - net) : (prevBal + net);
    }

    setPrintPageStyle('80mm auto');
    dom.printArea.className = 'acc-print-container acc-print-thermal-80mm';

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

    const isSupp = isSupplierParty(state.selectedParty);

    // Update KPI summary cards
    dom.kpiOpening.textContent = formatMoney(ledger.openingBalance);
    dom.kpiDebit.textContent = formatMoney(ledger.totalDebit);
    dom.kpiCredit.textContent = formatMoney(ledger.totalCredit);

    const closeFormatted = formatMoney(Math.abs(ledger.closingBalance));
    let closingTag = 'Rs. 0.00';
    if (ledger.closingBalance !== 0) {
      if (isSupp) {
        closingTag = `${closeFormatted} ${ledger.closingBalance > 0 ? '(Cr / Payable)' : '(Dr / Advance)'}`;
      } else {
        closingTag = `${closeFormatted} ${ledger.closingBalance > 0 ? '(Dr / Receivable)' : '(Cr / Advance)'}`;
      }
    }
    dom.kpiClosing.textContent = closingTag;
    dom.kpiClosing.className = `acc-kpi-val ${ledger.closingBalance !== 0 ? 'red' : 'green'}`;

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
      let balStr = formatMoney(Math.abs(e.balance));
      if (e.balance !== 0) {
        if (isSupp) {
          balStr += (e.balance > 0 ? ' (Cr)' : ' (Dr)');
        } else {
          balStr += (e.balance > 0 ? ' (Dr)' : ' (Cr)');
        }
      }
      const isPayable = isSupp ? (e.balance > 0) : (e.balance < 0);
      const balClass = isPayable ? 'acc-badge-cr' : 'acc-badge-dr';

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

  // Helper to inject/update print page style tag
  function setPrintPageStyle(sizeRule) {
    let styleEl = document.getElementById('accDynamicPrintStyle');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'accDynamicPrintStyle';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${sizeRule}; margin: ${sizeRule.includes('mm') ? '2.5mm' : '8mm'}; }`;
  }

  // Open Ledger Print Modal
  function handlePrintLedger() {
    if (!state.currentLedgerData || !state.selectedParty) {
      showToast('Select party and generate ledger first', 'warning');
      return;
    }

    const party = state.selectedParty;
    const fromDate = dom.ledgerFromDate.value || 'Beginning';
    const toDate = dom.ledgerToDate.value || 'Today';

    if (dom.printPartySub) {
      dom.printPartySub.textContent = `Statement for ${party.name} (${fromDate} to ${toDate})`;
    }

    // Retrieve last used preferences from localStorage
    const lastTemplate = localStorage.getItem('acc_ledger_last_template') || 'a4';
    const lastWidth = localStorage.getItem('acc_ledger_paper_width') || '80mm';

    const radioTpl = dom.printModal.querySelector(`input[name="accLedgerTemplateRadio"][value="${lastTemplate}"]`);
    if (radioTpl) radioTpl.checked = true;

    const radioWidth = dom.printModal.querySelector(`input[name="accThermalPaperWidth"][value="${lastWidth}"]`);
    if (radioWidth) radioWidth.checked = true;

    updatePrintModalUI();
    dom.printModal.classList.remove('hidden');
  }

  function closePrintModal() {
    if (dom.printModal) dom.printModal.classList.add('hidden');
  }

  function updatePrintModalUI() {
    const selectedTpl = dom.printModal.querySelector('input[name="accLedgerTemplateRadio"]:checked')?.value || 'a4';
    if (dom.cardTplA4) dom.cardTplA4.classList.toggle('active', selectedTpl === 'a4');
    if (dom.cardTplThermal) dom.cardTplThermal.classList.toggle('active', selectedTpl === 'thermal');
    if (dom.thermalWidthOptions) {
      dom.thermalWidthOptions.style.display = (selectedTpl === 'thermal') ? 'block' : 'none';
    }
  }

  function executeLedgerPrint() {
    const selectedTpl = dom.printModal.querySelector('input[name="accLedgerTemplateRadio"]:checked')?.value || 'a4';
    const selectedWidth = dom.printModal.querySelector('input[name="accThermalPaperWidth"]:checked')?.value || '80mm';

    // Remember user choice in localStorage
    localStorage.setItem('acc_ledger_last_template', selectedTpl);
    localStorage.setItem('acc_ledger_paper_width', selectedWidth);

    closePrintModal();

    if (selectedTpl === 'thermal') {
      renderThermalLedger(selectedWidth);
    } else {
      renderA4Ledger();
    }
  }

  // Render A4 Full Page Ledger Template
  function renderA4Ledger() {
    const ledger = state.currentLedgerData;
    const party = state.selectedParty;
    const fromDate = dom.ledgerFromDate.value || 'Beginning';
    const toDate = dom.ledgerToDate.value || 'Today';
    const isSupp = isSupplierParty(party);

    setPrintPageStyle('A4 portrait');
    dom.printArea.className = 'acc-print-container acc-print-a4';

    const opBalFormatted = formatMoney(Math.abs(ledger.openingBalance));
    const opBalTag = ledger.openingBalance !== 0
      ? `${opBalFormatted} ${ledger.openingBalance > 0 ? (isSupp ? '(Cr / Payable)' : '(Dr / Receivable)') : (isSupp ? '(Dr / Advance)' : '(Cr / Advance)')}`
      : 'Rs. 0.00';

    const closeFormatted = formatMoney(Math.abs(ledger.closingBalance));
    const closeTag = ledger.closingBalance !== 0
      ? `${closeFormatted} ${ledger.closingBalance > 0 ? (isSupp ? '(Cr / Payable)' : '(Dr / Receivable)') : (isSupp ? '(Dr / Advance)' : '(Cr / Advance)')}`
      : 'Rs. 0.00';

    dom.printArea.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #000; width: 100%;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.05em;">SHAHZAIB TRADERS</h2>
          <p style="margin: 3px 0; font-size: 13px;">Wholesale & Retail Commercial Market, Wah Cantt</p>
          <p style="margin: 2px 0; font-size: 12px;">Phone: 0300-1234567 / Email: info@shahzaibtraders.com</p>
          <h3 style="margin: 8px 0 0; font-size: 16px; text-decoration: underline;">PARTY ACCOUNT LEDGER STATEMENT</h3>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Period:</strong> ${fromDate} to ${toDate}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12.5px; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px;">
          <div>
            <div><strong>Party Name:</strong> ${party.name}</div>
            <div><strong>Party Type:</strong> ${party.partyTypeName || (isSupp ? 'Vendor / Supplier' : 'Customer')}</div>
            <div><strong>Contact Person:</strong> ${party.contactPerson || '--'}</div>
            <div><strong>City / Area:</strong> ${party.areaName || ''} ${party.city ? `, ${party.city}` : ''}</div>
            <div><strong>Phone / Mobile:</strong> ${party.phone || '--'}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Opening Balance:</strong> ${opBalTag}</div>
            <div><strong>Total Debits (Dr):</strong> ${formatMoney(ledger.totalDebit)}</div>
            <div><strong>Total Credits (Cr):</strong> ${formatMoney(ledger.totalCredit)}</div>
            <div style="margin-top: 4px; font-size: 14px;"><strong>Closing Balance:</strong> <strong style="color: #0f172a;">${closeTag}</strong></div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 10px;" border="1" cellpadding="5">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="width: 75px; text-align: left;">Date</th>
              <th style="width: 90px; text-align: left;">Voucher #</th>
              <th style="width: 110px; text-align: left;">Type</th>
              <th style="text-align: left;">Description</th>
              <th style="width: 95px; text-align: right;">Debit (Dr)</th>
              <th style="width: 95px; text-align: right;">Credit (Cr)</th>
              <th style="width: 115px; text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="4" style="font-weight: bold; background: #f1f5f9;">Opening Balance</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right; font-weight: bold;">${opBalTag}</td>
            </tr>
            ${(ledger.entries || []).map(e => {
              let balStr = formatMoney(Math.abs(e.balance));
              if (e.balance !== 0) {
                balStr += e.balance > 0 ? (isSupp ? ' Cr' : ' Dr') : (isSupp ? ' Dr' : ' Cr');
              }
              return `
                <tr>
                  <td>${e.date || '--'}</td>
                  <td><strong>${e.voucherNo || '--'}</strong></td>
                  <td>${e.type || '--'}</td>
                  <td style="word-break: break-word;">${e.description || '--'}</td>
                  <td style="text-align: right;">${e.debit > 0 ? e.debit.toLocaleString() : '-'}</td>
                  <td style="text-align: right;">${e.credit > 0 ? e.credit.toLocaleString() : '-'}</td>
                  <td style="text-align: right; font-weight: bold;">${balStr}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #e2e8f0; font-weight: bold;">
              <td colspan="4" style="text-align: right;">PERIOD TOTALS:</td>
              <td style="text-align: right;">${formatMoney(ledger.totalDebit)}</td>
              <td style="text-align: right;">${formatMoney(ledger.totalCredit)}</td>
              <td style="text-align: right; font-weight: 800;">${closeTag}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; padding-top: 10px;">
          <div>
            <div style="border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 4px;">
              Prepared By
            </div>
          </div>
          <div>
            <div style="border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 4px;">
              Authorized Signature
            </div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 25px; font-size: 10px; color: #64748b;">
          Generated from Shahzaib Traders Inventory & Accounts System on ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    window.print();
  }

  // Render Thermal Receipt Ledger Template (80mm / 58mm roll)
  function renderThermalLedger(paperWidth = '80mm') {
    const ledger = state.currentLedgerData;
    const party = state.selectedParty;
    const fromDate = dom.ledgerFromDate.value || 'Beginning';
    const toDate = dom.ledgerToDate.value || 'Today';
    const isSupp = isSupplierParty(party);

    const is58 = (paperWidth === '58mm');
    setPrintPageStyle(is58 ? '58mm auto' : '80mm auto');
    dom.printArea.className = `acc-print-container ${is58 ? 'acc-print-thermal-58mm' : 'acc-print-thermal-80mm'}`;

    const opBalFormatted = formatMoney(Math.abs(ledger.openingBalance));
    const opBalTag = ledger.openingBalance !== 0
      ? `${opBalFormatted} ${ledger.openingBalance > 0 ? (isSupp ? 'Cr' : 'Dr') : (isSupp ? 'Dr' : 'Cr')}`
      : 'Rs. 0';

    const closeFormatted = formatMoney(Math.abs(ledger.closingBalance));
    const closeTag = ledger.closingBalance !== 0
      ? `${closeFormatted} ${ledger.closingBalance > 0 ? (isSupp ? 'Cr / Payable' : 'Dr / Receivable') : (isSupp ? 'Dr / Advance' : 'Cr / Advance')}`
      : 'Rs. 0.00';

    dom.printArea.innerHTML = `
      <div class="acc-thermal-slip">
        <div class="acc-thermal-header">
          <div class="acc-thermal-title">SHAHZAIB TRADERS</div>
          <div style="font-size: 0.85em;">Wholesale & Retail Trading - Wah Cantt</div>
          <div style="font-size: 0.8em;">Phone: 0300-1234567</div>
          <div style="margin-top: 4px; font-weight: bold; font-size: 1.05em;">*** PARTY LEDGER ***</div>
        </div>

        <div class="acc-thermal-row">
          <span>Party:</span>
          <strong>${party.name}</strong>
        </div>
        <div class="acc-thermal-row">
          <span>Type:</span>
          <span>${party.partyTypeName || (isSupp ? 'Supplier' : 'Customer')}</span>
        </div>
        ${party.phone ? `
        <div class="acc-thermal-row">
          <span>Phone:</span>
          <span>${party.phone}</span>
        </div>` : ''}
        <div class="acc-thermal-row">
          <span>Period:</span>
          <span>${fromDate} to ${toDate}</span>
        </div>

        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0; margin: 4px 0;">
          <div class="acc-thermal-row" style="font-weight: bold;">
            <span>Opening Balance:</span>
            <span>${opBalTag}</span>
          </div>
        </div>

        <table class="acc-thermal-table">
          <thead>
            <tr>
              <th style="width: 20%;">Date</th>
              <th style="width: 32%;">Description</th>
              <th style="width: 16%; text-align: right;">Dr</th>
              <th style="width: 16%; text-align: right;">Cr</th>
              <th style="width: 16%; text-align: right;">Bal</th>
            </tr>
          </thead>
          <tbody>
            ${(ledger.entries || []).map(e => {
              let balStr = Math.abs(e.balance).toLocaleString();
              if (e.balance !== 0) {
                balStr += e.balance > 0 ? (isSupp ? 'C' : 'D') : (isSupp ? 'D' : 'C');
              }
              const desc = (e.description || e.type || '--').replace(/^(Cash Received|Paid Cash) via Cash\s*/i, '').trim() || e.type;
              return `
                <tr>
                  <td>${e.date ? e.date.slice(5) : '--'}</td>
                  <td class="acc-thermal-desc">${desc}</td>
                  <td style="text-align: right;">${e.debit > 0 ? e.debit.toLocaleString() : '-'}</td>
                  <td style="text-align: right;">${e.credit > 0 ? e.credit.toLocaleString() : '-'}</td>
                  <td style="text-align: right; font-weight: bold;">${balStr}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="acc-thermal-total">
          <div class="acc-thermal-row">
            <span>Total Debits (Dr):</span>
            <span>Rs. ${ledger.totalDebit.toLocaleString()}</span>
          </div>
          <div class="acc-thermal-row">
            <span>Total Credits (Cr):</span>
            <span>Rs. ${ledger.totalCredit.toLocaleString()}</span>
          </div>
        </div>

        <div class="acc-thermal-closing">
          <span>CLOSING BALANCE:</span>
          <span>${closeTag}</span>
        </div>

        <div style="text-align: center; margin-top: 8px; font-size: 0.8em; border-top: 1px dashed #000; padding-top: 4px;">
          Printed: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>
          *** Shahzaib Traders ***
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

    // Ledger Print Modal Events
    if (dom.btnClosePrintModal) dom.btnClosePrintModal.addEventListener('click', closePrintModal);
    if (dom.btnCancelPrintModal) dom.btnCancelPrintModal.addEventListener('click', closePrintModal);
    if (dom.btnConfirmPrintLedger) dom.btnConfirmPrintLedger.addEventListener('click', executeLedgerPrint);

    if (dom.cardTplA4) {
      dom.cardTplA4.addEventListener('click', () => {
        const r = dom.printModal.querySelector('input[name="accLedgerTemplateRadio"][value="a4"]');
        if (r) r.checked = true;
        updatePrintModalUI();
      });
    }
    if (dom.cardTplThermal) {
      dom.cardTplThermal.addEventListener('click', () => {
        const r = dom.printModal.querySelector('input[name="accLedgerTemplateRadio"][value="thermal"]');
        if (r) r.checked = true;
        updatePrintModalUI();
      });
    }

    if (dom.printModal) {
      dom.printModal.querySelectorAll('input[name="accLedgerTemplateRadio"]').forEach(r => {
        r.addEventListener('change', updatePrintModalUI);
      });

      dom.printModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeLedgerPrint();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePrintModal();
        }
      });
    }

    // Party inputs Enter triggers F1 help modal
    if (dom.partyInput) {
      dom.partyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          openPartyHelpModal();
        }
      });
    }
    if (dom.ledgerPartyInput) {
      dom.ledgerPartyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          openPartyHelpModal();
        }
      });
    }

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
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (dom.helpModal.classList.contains('hidden')) {
            openPartyHelpModal();
          } else {
            closePartyHelpModal();
          }
        }
      } else if (e.key === 'Escape') {
        if (dom.printModal && !dom.printModal.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          closePrintModal();
        } else if (dom.helpModal && !dom.helpModal.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
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
    }, true);
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
