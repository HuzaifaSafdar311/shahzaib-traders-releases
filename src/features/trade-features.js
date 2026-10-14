// ========================================================
// Shahzaib Traders - Enterprise Trade Features Controller
// Clean Layout (Standard App Styling - No Extra Detailing)
// Features: 
// 1. Electrician Quotations / Estimate (Kacha Bill)
// 2. Day-End Cash Closing & Counter Handover
// 3. Warranty & Defective Item Claims
// 4. Daily Shop Expenses (Dukan Kharchay)
// ========================================================

(function () {
  'use strict';

  const api = window.tradeFeaturesAPI;
  if (!api) {
    console.warn('tradeFeaturesAPI not found in window object');
    return;
  }

  // State Management
  const state = {
    estimateItems: [],
    currentEstimateId: null,
    expensesList: [],
    claimsList: [],
    closingData: null
  };

  // Helper: Format Money
  function formatMoney(amount) {
    const n = Number(amount) || 0;
    return 'Rs. ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Toast Helper
  function notify(msg, type = 'success') {
    if (window.showToast) window.showToast(msg, type);
    else alert(msg);
  }

  // ========================================================
  // 1. INJECT SALES SUB-TABS & SECTIONS
  // ========================================================
  function injectSalesFeatures() {
    const salesHeaderNav = document.querySelector('#salesView .gi-sub-tabs');
    const salesView = document.getElementById('salesView');
    if (!salesHeaderNav || !salesView) return;

    if (document.getElementById('saleSubTabBtnEstimate')) return;

    // 1. Append Sub-Tab Buttons to Sales Navigation
    const btnEstimate = document.createElement('button');
    btnEstimate.type = 'button';
    btnEstimate.className = 'gi-tab-btn';
    btnEstimate.id = 'saleSubTabBtnEstimate';
    btnEstimate.innerHTML = `
      <svg class="gi-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>
      <span>Kacha Bill / Estimate</span>
    `;

    const btnClosing = document.createElement('button');
    btnClosing.type = 'button';
    btnClosing.className = 'gi-tab-btn';
    btnClosing.id = 'saleSubTabBtnClosing';
    btnClosing.innerHTML = `
      <svg class="gi-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
      <span>Day-End Closing</span>
    `;

    const btnClaims = document.createElement('button');
    btnClaims.type = 'button';
    btnClaims.className = 'gi-tab-btn';
    btnClaims.id = 'saleSubTabBtnClaims';
    btnClaims.innerHTML = `
      <svg class="gi-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Warranty Claims</span>
    `;

    salesHeaderNav.appendChild(btnEstimate);
    salesHeaderNav.appendChild(btnClosing);
    salesHeaderNav.appendChild(btnClaims);

    // 2. Append Panel: Estimate / Kacha Bill
    const panelEstimate = document.createElement('div');
    panelEstimate.id = 'subviewSaleEstimate';
    panelEstimate.className = 'sales-subview-panel trade-feature-panel';
    panelEstimate.innerHTML = `
      <!-- Top Action & Meta Header -->
      <header class="sale-voucher-header">
        <div class="sale-header-actions-row">
          <div class="sale-title-wrap">
            <h1>Kacha Bill / Estimate</h1>
          </div>
          <div class="sale-header-btn-group">
            <button type="button" id="btnEstimateNew" class="btn btn-secondary">
              <span>+ New</span>
            </button>
            <button type="button" id="btnEstimateConvertSale" class="btn btn-secondary">
              <span>Convert to Sale</span>
            </button>
            <button type="button" id="btnEstimatePrint" class="btn btn-secondary">
              <span>Print Bill</span>
            </button>
            <button type="button" id="btnEstimateSave" class="btn btn-primary">
              <span>Save Estimate</span>
            </button>
          </div>
        </div>

        <div class="sale-meta-row" style="grid-template-columns: 140px 140px 1.5fr 160px;">
          <div class="form-group">
            <label>Estimate No</label>
            <input type="text" id="estNumber" class="form-control form-control-sm font-num font-bold" readonly value="EST-0001">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="estDate" class="form-control form-control-sm">
          </div>
          <div class="form-group">
            <label>Customer / Electrician Name</label>
            <input type="text" id="estCustomerName" class="form-control form-control-sm font-bold" placeholder="Customer name">
          </div>
          <div class="form-group">
            <label>Contact Phone</label>
            <input type="text" id="estPhone" class="form-control form-control-sm" placeholder="03xx-xxxxxxx">
          </div>
        </div>
      </header>

      <!-- Item Entry Card -->
      <div class="sale-item-entry-card">
        <div style="display: grid; grid-template-columns: 130px 1fr 90px 120px 130px 100px; gap: 10px; align-items: end;">
          <div class="form-group">
            <label>Item Code (F1)</label>
            <div style="display: flex; gap: 4px;">
              <input type="text" id="estItemCode" class="form-control form-control-sm font-bold" placeholder="Code">
              <button type="button" id="btnEstFindProduct" class="btn btn-secondary" style="height: 32px; padding: 0 8px;">Find</button>
            </div>
          </div>
          <div class="form-group">
            <label>Product Description</label>
            <select id="estProductSelect" class="form-control form-control-sm">
              <option value="">-- Select Product --</option>
            </select>
          </div>
          <div class="form-group">
            <label>Qty</label>
            <input type="number" id="estQty" class="form-control form-control-sm text-center" min="1" value="1">
          </div>
          <div class="form-group">
            <label>Quoted Rate (Rs)</label>
            <input type="number" id="estRate" class="form-control form-control-sm text-right" min="0" value="0.00">
          </div>
          <div class="form-group">
            <label>Amount (Rs)</label>
            <input type="text" id="estLineAmount" class="form-control form-control-sm text-right font-bold" readonly value="Rs. 0.00">
          </div>
          <div>
            <button type="button" id="btnEstAddItem" class="btn btn-primary" style="width: 100%; height: 32px;">+ Add</button>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="sale-items-table-container">
        <table class="sale-items-table">
          <thead>
            <tr>
              <th style="width: 48px; text-align: center;">Sr #</th>
              <th style="width: 110px;">Item Code</th>
              <th>Product Description</th>
              <th style="width: 80px; text-align: center;">Qty</th>
              <th style="width: 120px; text-align: right;">Rate (Rs)</th>
              <th style="width: 130px; text-align: right;">Amount (Rs)</th>
              <th style="width: 60px; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody id="estTableBody"></tbody>
        </table>
      </div>

      <!-- Footer Bar -->
      <div class="sale-secondary-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px;">
        <div style="font-size: 13px; color: var(--text-secondary);">
          Total Items: <strong id="estTotalItems" style="color: var(--text-primary);">0</strong>
        </div>
        <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary);">
          Estimate Total: <span id="estGrandTotal" style="font-weight: 700; margin-left: 8px;">Rs. 0.00</span>
        </div>
      </div>
    `;

    // 3. Append Panel: Day-End Cash Closing
    const panelClosing = document.createElement('div');
    panelClosing.id = 'subviewSaleClosing';
    panelClosing.className = 'sales-subview-panel trade-feature-panel';
    panelClosing.innerHTML = `
      <header class="sale-voucher-header">
        <div class="sale-header-actions-row">
          <div class="sale-title-wrap">
            <h1>Day-End Cash Closing</h1>
          </div>
          <div class="sale-header-btn-group">
            <button type="button" id="btnRefreshClosing" class="btn btn-secondary">
              <span>Recalculate</span>
            </button>
            <button type="button" id="btnPrintClosing" class="btn btn-secondary">
              <span>Print Slip</span>
            </button>
            <button type="button" id="btnSaveClosing" class="btn btn-primary">
              <span>Save Closing</span>
            </button>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
          <div class="form-group" style="width: 180px;">
            <label>Closing Date</label>
            <input type="date" id="closingDatePicker" class="form-control form-control-sm">
          </div>
        </div>
      </header>

      <!-- 4 Clean Summary Stat Cells -->
      <div class="closing-summary-row">
        <div class="closing-stat">
          <span class="closing-stat-label">Opening Cash</span>
          <span id="statOpeningCash" class="closing-stat-val">Rs. 0.00</span>
        </div>
        <div class="closing-stat">
          <span class="closing-stat-label">Today Cash Inflow (+)</span>
          <span id="statCashInflow" class="closing-stat-val">Rs. 0.00</span>
        </div>
        <div class="closing-stat">
          <span class="closing-stat-label">Today Cash Outflow (-)</span>
          <span id="statCashOutflow" class="closing-stat-val">Rs. 0.00</span>
        </div>
        <div class="closing-stat">
          <span class="closing-stat-label">Expected Drawer Cash (=)</span>
          <span id="statExpectedCash" class="closing-stat-val">Rs. 0.00</span>
        </div>
      </div>

      <!-- Physical Count & Handover Input Section -->
      <div class="sale-item-entry-card">
        <div class="tf-grid-3">
          <div class="form-group">
            <label>Physical Cash Counted (Rs)</label>
            <input type="number" id="closingCountedCash" class="form-control form-control-sm font-bold" placeholder="0">
          </div>
          <div class="form-group">
            <label>Difference</label>
            <input type="text" id="closingDifference" class="form-control form-control-sm font-bold text-center" readonly value="Exact Balance (Rs. 0)">
          </div>
          <div class="form-group">
            <label>Cash Delivered to Owner (Rs)</label>
            <input type="number" id="closingHandoverManager" class="form-control form-control-sm font-bold" placeholder="0">
          </div>
        </div>
        <div class="tf-grid-3" style="margin-top: 10px;">
          <div class="form-group">
            <label>Closing Drawer Balance (Next Day)</label>
            <input type="text" id="closingNextDayCash" class="form-control form-control-sm font-bold" readonly value="Rs. 0.00">
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label>Notes / Handover Remarks</label>
            <input type="text" id="closingNotes" class="form-control form-control-sm" placeholder="Handover details or remarks">
          </div>
        </div>
      </div>
    `;

    // 4. Append Panel: Warranty Claims
    const panelClaims = document.createElement('div');
    panelClaims.id = 'subviewSaleClaims';
    panelClaims.className = 'sales-subview-panel trade-feature-panel';
    panelClaims.innerHTML = `
      <header class="sale-voucher-header">
        <div class="sale-header-actions-row">
          <div class="sale-title-wrap">
            <h1>Warranty Claims (Kharab Samaan)</h1>
          </div>
          <div class="sale-header-btn-group">
            <button type="button" id="btnClaimNew" class="btn btn-secondary">
              <span>+ New</span>
            </button>
            <button type="button" id="btnClaimSave" class="btn btn-primary">
              <span>Save Claim</span>
            </button>
          </div>
        </div>

        <div class="sale-meta-row" style="grid-template-columns: 140px 140px 1.4fr 160px;">
          <div class="form-group">
            <label>Claim No</label>
            <input type="text" id="claimNo" class="form-control form-control-sm font-bold" readonly value="CLM-0001">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="claimDate" class="form-control form-control-sm">
          </div>
          <div class="form-group">
            <label>Customer Name</label>
            <input type="text" id="claimCustomer" class="form-control form-control-sm" placeholder="Customer name">
          </div>
          <div class="form-group">
            <label>Contact Phone</label>
            <input type="text" id="claimPhone" class="form-control form-control-sm" placeholder="03xx-xxxxxxx">
          </div>
        </div>
      </header>

      <!-- Item Details Entry Card -->
      <div class="sale-item-entry-card">
        <div class="tf-grid-4">
          <div class="form-group">
            <label>Product Item</label>
            <input type="text" id="claimProductTitle" class="form-control form-control-sm" placeholder="Product name / model">
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" id="claimQty" class="form-control form-control-sm text-center" min="1" value="1">
          </div>
          <div class="form-group">
            <label>Supplier / Factory</label>
            <input type="text" id="claimSupplier" class="form-control form-control-sm" placeholder="Supplier / Factory name">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="claimStatus" class="form-control form-control-sm font-bold">
              <option value="Received">Received from Customer</option>
              <option value="SentToFactory">Sent to Factory</option>
              <option value="Replaced">Replacement Received</option>
              <option value="Delivered">Delivered to Customer</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <label>Fault / Defect Description</label>
          <input type="text" id="claimFault" class="form-control form-control-sm" placeholder="Description of fault...">
        </div>
      </div>

      <!-- Claims Table -->
      <div class="sale-items-table-container">
        <table class="sale-items-table">
          <thead>
            <tr>
              <th style="width: 100px;">Claim No</th>
              <th style="width: 95px;">Date</th>
              <th>Customer Name</th>
              <th>Product Description</th>
              <th style="width: 65px; text-align: center;">Qty</th>
              <th>Supplier</th>
              <th style="width: 140px;">Status</th>
              <th style="width: 75px; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody id="claimsTableBody"></tbody>
        </table>
      </div>
    `;

    salesView.appendChild(panelEstimate);
    salesView.appendChild(panelClosing);
    salesView.appendChild(panelClaims);

    // Setup Sub-Tab Switching Logic
    setupSalesSubTabSwitching(btnEstimate, btnClosing, btnClaims, panelEstimate, panelClosing, panelClaims);
  }

  function setupSalesSubTabSwitching(btnEst, btnClose, btnClm, panelEst, panelClose, panelClm) {
    const btnVoucher = document.getElementById('saleSubTabBtnVoucher');
    const btnReturn = document.getElementById('saleSubTabBtnReturn');
    const panelVoucher = document.getElementById('subviewSaleVoucher');
    const panelReturn = document.getElementById('subviewSaleReturn');

    const allBtns = [btnVoucher, btnReturn, btnEst, btnClose, btnClm].filter(Boolean);
    const allPanels = [panelVoucher, panelReturn, panelEst, panelClose, panelClm].filter(Boolean);

    function activateTab(btn, panel, onOpen) {
      allBtns.forEach(b => b.classList.remove('active'));
      allPanels.forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
      });

      btn.classList.add('active');
      panel.classList.remove('hidden');
      panel.classList.add('active');
      if (onOpen) onOpen();
    }

    if (btnEst) {
      btnEst.addEventListener('click', () => {
        activateTab(btnEst, panelEst, initEstimateModule);
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        activateTab(btnClose, panelClose, initClosingModule);
      });
    }

    if (btnClm) {
      btnClm.addEventListener('click', () => {
        activateTab(btnClm, panelClm, initClaimsModule);
      });
    }

    if (btnVoucher) {
      btnVoucher.addEventListener('click', () => activateTab(btnVoucher, panelVoucher));
    }
    if (btnReturn) {
      btnReturn.addEventListener('click', () => activateTab(btnReturn, panelReturn));
    }
  }

  // ========================================================
  // 2. INJECT ACCOUNTS DAILY EXPENSES TAB
  // ========================================================
  function injectAccountsExpenses() {
    const accNavTabs = document.querySelector('#accountsView .acc-nav-tabs');
    const accContainer = document.querySelector('#accountsView .accounts-container');
    if (!accNavTabs || !accContainer) return;

    if (document.getElementById('btnTabExpenses')) return;

    // 1. Add Expenses Tab Button
    const btnExp = document.createElement('button');
    btnExp.id = 'btnTabExpenses';
    btnExp.className = 'acc-tab-btn';
    btnExp.dataset.tab = 'expenses';
    btnExp.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>Daily Expenses</span>
    `;
    accNavTabs.appendChild(btnExp);

    // 2. Add Expenses View Section
    const expSection = document.createElement('div');
    expSection.id = 'accExpenseSection';
    expSection.className = 'acc-card hidden';
    expSection.innerHTML = `
      <div class="acc-card-header">
        <div class="acc-title-group">
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary);">Daily Expenses (Dukan Kharchay)</h2>
        </div>
        <div class="acc-action-bar">
          <button type="button" id="btnExpNew" class="acc-btn acc-btn-new">+ New</button>
          <button type="button" id="btnExpSave" class="acc-btn acc-btn-save">Save Expense</button>
        </div>
      </div>

      <div class="acc-grid-header">
        <div class="acc-form-group">
          <label>Voucher No</label>
          <input type="text" id="expVoucherNo" class="acc-form-control" readonly value="EXP-0001">
        </div>
        <div class="acc-form-group">
          <label>Date</label>
          <input type="date" id="expDate" class="acc-form-control">
        </div>
        <div class="acc-form-group">
          <label>Expense Category / Head</label>
          <select id="expCategorySelect" class="acc-form-control font-bold">
            <option value="Entertainment & Food">Entertainment & Food (Chai / Khana)</option>
            <option value="Petrol & Fuel">Petrol & Fuel</option>
            <option value="Transport & Freight">Transport & Freight (Gari Kiraya)</option>
            <option value="Electricity & Bills">Electricity & Utility Bills</option>
            <option value="Shop Rent">Shop & Godown Rent</option>
            <option value="Staff Salaries">Staff Salaries & Worker Advance</option>
            <option value="General Supplies">Shop Supplies & Maintenance</option>
          </select>
        </div>
        <div class="acc-form-group">
          <label>Payment Mode</label>
          <select id="expPaymentMode" class="acc-form-control">
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </select>
        </div>
      </div>

      <div class="acc-grid-header" style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px;">
        <div class="acc-form-group">
          <label>Amount (Rs) *</label>
          <input type="number" id="expAmount" class="acc-form-control font-bold" placeholder="0.00" min="1">
        </div>
        <div class="acc-form-group">
          <label>Paid To / Recipient</label>
          <input type="text" id="expPaidTo" class="acc-form-control" placeholder="Recipient name">
        </div>
        <div class="acc-form-group" style="grid-column: span 2;">
          <label>Remarks</label>
          <input type="text" id="expRemarks" class="acc-form-control" placeholder="Details of expense...">
        </div>
      </div>

      <!-- Recent Expenses Table -->
      <div class="table-container" style="margin-top: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border-color);">
          <strong style="font-size: 13px;">Expense Register</strong>
          <span style="font-size: 13px; font-weight: 600;">Total: <strong id="expTotalSum" style="margin-left: 6px;">Rs. 0.00</strong></span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 100px;">Voucher No</th>
              <th style="width: 95px;">Date</th>
              <th>Category / Head</th>
              <th>Paid To</th>
              <th>Remarks</th>
              <th style="width: 120px; text-align: right;">Amount (Rs)</th>
              <th style="width: 60px; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody id="expTableBody"></tbody>
        </table>
      </div>
    `;

    accContainer.appendChild(expSection);

    // Tab Switching for Accounts
    btnExp.addEventListener('click', () => {
      document.querySelectorAll('#accountsView .acc-tab-btn').forEach(b => b.classList.remove('active'));
      btnExp.classList.add('active');

      const vSec = document.getElementById('accVoucherSection');
      const lSec = document.getElementById('accLedgerSection');
      const hSec = document.getElementById('accHistorySection');
      [vSec, lSec, hSec].forEach(s => s && s.classList.add('hidden'));

      expSection.classList.remove('hidden');
      initExpensesModule();
    });

    // When clicking other accounts tabs, hide expense section
    ['btnTabCRV', 'btnTabCPV', 'btnTabLedger', 'btnTabHistory'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', () => expSection.classList.add('hidden'));
    });
  }

  // ========================================================
  // 3. LOGIC: ESTIMATE / KACHA BILL
  // ========================================================
  async function initEstimateModule() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('estDate');
    if (dateInput && !dateInput.value) dateInput.value = today;

    const numInput = document.getElementById('estNumber');
    if (numInput) numInput.value = await api.getNextEstimateNo();

    populateEstimateProducts();

    const qtyInput = document.getElementById('estQty');
    const rateInput = document.getElementById('estRate');
    const lineAmount = document.getElementById('estLineAmount');

    function calcLine() {
      const q = Number(qtyInput.value) || 0;
      const r = Number(rateInput.value) || 0;
      lineAmount.value = formatMoney(q * r);
    }
    qtyInput.oninput = calcLine;
    rateInput.oninput = calcLine;

    const btnFind = document.getElementById('btnEstFindProduct');
    if (btnFind) {
      btnFind.onclick = () => {
        if (window.findProductAPI) window.findProductAPI.openWindow('estimate');
      };
    }

    const btnAdd = document.getElementById('btnEstAddItem');
    if (btnAdd) btnAdd.onclick = addEstimateItem;

    const btnSave = document.getElementById('btnEstimateSave');
    if (btnSave) btnSave.onclick = saveCurrentEstimate;

    const btnPrint = document.getElementById('btnEstimatePrint');
    if (btnPrint) btnPrint.onclick = printEstimate;

    const btnConvert = document.getElementById('btnEstimateConvertSale');
    if (btnConvert) btnConvert.onclick = convertEstimateToSale;
  }

  async function populateEstimateProducts() {
    const sel = document.getElementById('estProductSelect');
    if (!sel || sel.options.length > 1) return;

    try {
      const prods = await window.electronAPI.getProducts();
      prods.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.code;
        opt.textContent = `${p.code} - ${p.titleEng} (Rs. ${p.retailPrice})`;
        opt.dataset.product = JSON.stringify(p);
        sel.appendChild(opt);
      });

      sel.onchange = () => {
        const opt = sel.selectedOptions[0];
        if (!opt || !opt.dataset.product) return;
        const p = JSON.parse(opt.dataset.product);
        document.getElementById('estItemCode').value = p.code;
        document.getElementById('estRate').value = p.retailPrice || p.wholesalePrice || 0;
        document.getElementById('estQty').value = 1;
        document.getElementById('estLineAmount').value = formatMoney(p.retailPrice || p.wholesalePrice || 0);
      };
    } catch (e) {
      console.warn('Could not load products for estimate select:', e);
    }
  }

  function addEstimateItem() {
    const code = document.getElementById('estItemCode').value.trim();
    const sel = document.getElementById('estProductSelect');
    const opt = sel.selectedOptions[0];
    const title = opt ? opt.textContent.split('(')[0].trim() : code;
    const qty = Number(document.getElementById('estQty').value) || 1;
    const rate = Number(document.getElementById('estRate').value) || 0;

    if (!code && !title) {
      notify('Select a product first', 'error');
      return;
    }

    state.estimateItems.push({
      productCode: code,
      productTitle: title,
      qty,
      rate,
      netAmount: qty * rate
    });

    renderEstimateTable();

    document.getElementById('estItemCode').value = '';
    sel.value = '';
    document.getElementById('estQty').value = 1;
    document.getElementById('estRate').value = 0;
    document.getElementById('estLineAmount').value = 'Rs. 0.00';
  }

  function renderEstimateTable() {
    const tbody = document.getElementById('estTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let grandTotal = 0;
    state.estimateItems.forEach((item, idx) => {
      grandTotal += item.netAmount;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;">${idx + 1}</td>
        <td><strong>${item.productCode}</strong></td>
        <td>${item.productTitle}</td>
        <td style="text-align: center; font-weight: bold;">${item.qty}</td>
        <td style="text-align: right;">${formatMoney(item.rate)}</td>
        <td style="text-align: right; font-weight: bold;">${formatMoney(item.netAmount)}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action btn-table-del" onclick="window.removeEstItem(${idx})">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('estTotalItems').textContent = state.estimateItems.length;
    document.getElementById('estGrandTotal').textContent = formatMoney(grandTotal);
  }

  window.removeEstItem = function(idx) {
    state.estimateItems.splice(idx, 1);
    renderEstimateTable();
  };

  async function saveCurrentEstimate() {
    if (!state.estimateItems.length) {
      notify('Please add items to estimate first', 'error');
      return;
    }
    const customer = document.getElementById('estCustomerName').value.trim() || 'Walk-in Customer';
    const total = state.estimateItems.reduce((acc, x) => acc + x.netAmount, 0);

    const payload = {
      estimateNo: document.getElementById('estNumber').value,
      entryDate: document.getElementById('estDate').value,
      partyName: customer,
      customerPhone: document.getElementById('estPhone').value,
      grossAmount: total,
      netAmount: total,
      status: 'Pending'
    };

    const res = await api.saveEstimate(payload, state.estimateItems);
    if (res && res.success) {
      notify(`Estimate [${res.estimateNo}] saved successfully!`);
    }
  }

  function printEstimate() {
    window.print();
  }

  function convertEstimateToSale() {
    if (!state.estimateItems.length) {
      notify('No items in estimate to convert', 'error');
      return;
    }
    const btnVoucher = document.getElementById('saleSubTabBtnVoucher');
    if (btnVoucher) btnVoucher.click();

    const custInput = document.getElementById('saleCustomerName');
    if (custInput) custInput.value = document.getElementById('estCustomerName').value;

    notify('Estimate ready for final sale billing');
  }

  // ========================================================
  // 4. LOGIC: DAY-END CASH CLOSING
  // ========================================================
  async function initClosingModule() {
    const today = new Date().toISOString().split('T')[0];
    const picker = document.getElementById('closingDatePicker');
    if (picker && !picker.value) picker.value = today;

    loadClosingSummary(picker ? picker.value : today);

    if (picker) {
      picker.onchange = () => loadClosingSummary(picker.value);
    }

    const btnRefresh = document.getElementById('btnRefreshClosing');
    if (btnRefresh) btnRefresh.onclick = () => loadClosingSummary(picker.value);

    const btnSave = document.getElementById('btnSaveClosing');
    if (btnSave) btnSave.onclick = saveClosingRecord;

    const btnPrint = document.getElementById('btnPrintClosing');
    if (btnPrint) btnPrint.onclick = () => window.print();

    const inputCounted = document.getElementById('closingCountedCash');
    const inputManager = document.getElementById('closingHandoverManager');

    function calcDifference() {
      const counted = Number(inputCounted.value) || 0;
      const expected = state.closingData ? state.closingData.expectedDrawerCash : 0;
      const diff = counted - expected;
      const handover = Number(inputManager.value) || 0;
      const nextDay = Math.max(0, counted - handover);

      const diffEl = document.getElementById('closingDifference');
      if (diff === 0) {
        diffEl.value = 'Exact Balance (Rs. 0)';
        diffEl.style.color = '#15803d';
      } else if (diff > 0) {
        diffEl.value = `Surplus (+ ${formatMoney(diff)})`;
        diffEl.style.color = '#15803d';
      } else {
        diffEl.value = `Short (- ${formatMoney(Math.abs(diff))})`;
        diffEl.style.color = '#b91c1c';
      }

      document.getElementById('closingNextDayCash').value = formatMoney(nextDay);
    }

    if (inputCounted) inputCounted.oninput = calcDifference;
    if (inputManager) inputManager.oninput = calcDifference;
  }

  async function loadClosingSummary(date) {
    const summary = await api.getDailyClosingSummary(date);
    if (!summary) return;
    state.closingData = summary;

    document.getElementById('statOpeningCash').textContent = formatMoney(summary.openingDrawerCash);
    document.getElementById('statCashInflow').textContent = formatMoney(summary.totalCashSales + summary.totalCrvReceived);
    document.getElementById('statCashOutflow').textContent = formatMoney(summary.totalCpvPaid + summary.totalExpensesPaid);
    document.getElementById('statExpectedCash').textContent = formatMoney(summary.expectedDrawerCash);

    if (summary.existingClosing) {
      document.getElementById('closingCountedCash').value = summary.existingClosing.actualCountedCash;
      document.getElementById('closingHandoverManager').value = summary.existingClosing.cashDeliveredToManager;
      document.getElementById('closingNotes').value = summary.existingClosing.notes || '';
    }
  }

  async function saveClosingRecord() {
    const date = document.getElementById('closingDatePicker').value;
    const counted = Number(document.getElementById('closingCountedCash').value) || 0;
    const handover = Number(document.getElementById('closingHandoverManager').value) || 0;
    const notes = document.getElementById('closingNotes').value;
    const exp = state.closingData ? state.closingData.expectedDrawerCash : 0;

    const payload = {
      closingDate: date,
      openingDrawerCash: state.closingData ? state.closingData.openingDrawerCash : 0,
      totalCashSales: state.closingData ? state.closingData.totalCashSales : 0,
      totalCrvReceived: state.closingData ? state.closingData.totalCrvReceived : 0,
      totalCpvPaid: state.closingData ? state.closingData.totalCpvPaid : 0,
      totalExpensesPaid: state.closingData ? state.closingData.totalExpensesPaid : 0,
      expectedDrawerCash: exp,
      actualCountedCash: counted,
      cashDifference: counted - exp,
      cashDeliveredToManager: handover,
      closingDrawerBalance: Math.max(0, counted - handover),
      notes
    };

    const res = await api.saveDayEndClosing(payload);
    if (res && res.success) {
      notify(`Day-End Closing for [${date}] saved successfully!`);
    }
  }

  // ========================================================
  // 5. LOGIC: WARRANTY CLAIMS
  // ========================================================
  async function initClaimsModule() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('claimDate');
    if (dateInput && !dateInput.value) dateInput.value = today;

    const numInput = document.getElementById('claimNo');
    if (numInput) numInput.value = await api.getNextClaimNo();

    loadClaimsList();

    const btnSave = document.getElementById('btnClaimSave');
    if (btnSave) btnSave.onclick = saveClaimRecord;

    const btnNew = document.getElementById('btnClaimNew');
    if (btnNew) btnNew.onclick = resetClaimForm;
  }

  async function resetClaimForm() {
    document.getElementById('claimCustomer').value = '';
    document.getElementById('claimPhone').value = '';
    document.getElementById('claimProductTitle').value = '';
    document.getElementById('claimQty').value = 1;
    document.getElementById('claimSupplier').value = '';
    document.getElementById('claimFault').value = '';
    document.getElementById('claimStatus').value = 'Received';
    document.getElementById('claimNo').value = await api.getNextClaimNo();
  }

  async function loadClaimsList() {
    const tbody = document.getElementById('claimsTableBody');
    if (!tbody) return;
    const claims = await api.getClaims();
    tbody.innerHTML = '';

    claims.forEach(c => {
      const tr = document.createElement('tr');
      const badgeCls = c.status === 'Received' ? 'status-received' : (c.status === 'SentToFactory' ? 'status-factory' : 'status-delivered');
      tr.innerHTML = `
        <td><strong>${c.claimNo}</strong></td>
        <td>${c.entryDate}</td>
        <td><strong>${c.customerName}</strong><br><small style="color: var(--text-secondary);">${c.customerPhone || ''}</small></td>
        <td>${c.productTitle}</td>
        <td style="text-align: center; font-weight: bold;">${c.quantity}</td>
        <td>${c.supplierName || 'Factory'}</td>
        <td><span class="tf-badge ${badgeCls}">${c.status}</span></td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action" onclick="window.updateClaimNextStatus('${c.id}', '${c.status}')">Next &rarr;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.updateClaimNextStatus = async function(id, currStatus) {
    let nextStatus = 'SentToFactory';
    if (currStatus === 'Received') nextStatus = 'SentToFactory';
    else if (currStatus === 'SentToFactory') nextStatus = 'Replaced';
    else if (currStatus === 'Replaced') nextStatus = 'Delivered';

    const claim = (await api.getClaims()).find(x => x.id === id);
    if (claim) {
      claim.status = nextStatus;
      await api.saveClaim(claim);
      notify(`Status: ${nextStatus}`);
      loadClaimsList();
    }
  };

  async function saveClaimRecord() {
    const cust = document.getElementById('claimCustomer').value.trim();
    const prod = document.getElementById('claimProductTitle').value.trim();
    if (!cust || !prod) {
      notify('Enter Customer Name and Product Description', 'error');
      return;
    }

    const payload = {
      claimNo: document.getElementById('claimNo').value,
      entryDate: document.getElementById('claimDate').value,
      customerName: cust,
      customerPhone: document.getElementById('claimPhone').value,
      supplierName: document.getElementById('claimSupplier').value,
      productTitle: prod,
      quantity: Number(document.getElementById('claimQty').value) || 1,
      faultReason: document.getElementById('claimFault').value,
      status: document.getElementById('claimStatus').value
    };

    const res = await api.saveClaim(payload);
    if (res && res.success) {
      notify(`Claim [${res.claimNo}] saved successfully!`);
      resetClaimForm();
      loadClaimsList();
    }
  }

  // ========================================================
  // 6. LOGIC: DAILY SHOP EXPENSES (DUKAN KHARCHAY)
  // ========================================================
  async function initExpensesModule() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('expDate');
    if (dateInput && !dateInput.value) dateInput.value = today;

    const numInput = document.getElementById('expVoucherNo');
    if (numInput) numInput.value = await api.getNextExpenseVoucherNo();

    loadExpensesList();

    const btnSave = document.getElementById('btnExpSave');
    if (btnSave) btnSave.onclick = saveExpenseRecord;

    const btnNew = document.getElementById('btnExpNew');
    if (btnNew) btnNew.onclick = resetExpenseForm;
  }

  async function resetExpenseForm() {
    document.getElementById('expAmount').value = '';
    document.getElementById('expPaidTo').value = '';
    document.getElementById('expRemarks').value = '';
    document.getElementById('expVoucherNo').value = await api.getNextExpenseVoucherNo();
  }

  async function loadExpensesList() {
    const tbody = document.getElementById('expTableBody');
    if (!tbody) return;
    const expenses = await api.getExpenses();
    tbody.innerHTML = '';

    let total = 0;
    expenses.forEach(e => {
      total += Number(e.amount) || 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${e.voucherNo}</strong></td>
        <td>${e.entryDate}</td>
        <td><span class="tf-badge">${e.category}</span></td>
        <td>${e.paidTo || '-'}</td>
        <td>${e.remarks || '-'}</td>
        <td style="text-align: right; font-weight: bold;">${formatMoney(e.amount)}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action btn-table-del" onclick="window.deleteExpRecord('${e.id}')">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('expTotalSum').textContent = formatMoney(total);
  }

  window.deleteExpRecord = async function(id) {
    if (confirm('Delete this expense voucher?')) {
      await api.deleteExpense(id);
      notify('Expense voucher deleted');
      loadExpensesList();
    }
  };

  async function saveExpenseRecord() {
    const amount = Number(document.getElementById('expAmount').value) || 0;
    if (amount <= 0) {
      notify('Enter a valid expense amount', 'error');
      return;
    }

    const payload = {
      voucherNo: document.getElementById('expVoucherNo').value,
      entryDate: document.getElementById('expDate').value,
      category: document.getElementById('expCategorySelect').value,
      accountTitle: document.getElementById('expCategorySelect').value,
      paymentMode: document.getElementById('expPaymentMode').value,
      amount,
      paidTo: document.getElementById('expPaidTo').value,
      remarks: document.getElementById('expRemarks').value
    };

    const res = await api.saveExpense(payload);
    if (res && res.success) {
      notify(`Expense [${res.voucherNo}] saved!`);
      resetExpenseForm();
      loadExpensesList();
    }
  }

  // ========================================================
  // INITIALIZATION ON DOM READY
  // ========================================================
  function init() {
    injectSalesFeatures();
    injectAccountsExpenses();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
