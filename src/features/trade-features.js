// ========================================================
// Shahzaib Traders - Enterprise Trade Features Controller
// Features: 
// 1. Electrician Quotations / Estimate (Kacha Bill) [MODAL POPUP]
// 2. Day-End Cash Closing & Counter Handover [MODAL POPUP]
// 3. Warranty & Defective Item Claims [MODAL POPUP]
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

  // Modal Open / Close Helpers
  function openModal(modalId, initFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    if (initFn) initFn();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  // ========================================================
  // 1. WIRE UP POPUP MODAL BUTTONS & EVENTS
  // ========================================================
  function setupTradeFeatureModals() {
    // 1. Kacha Bill / Estimate Modal Triggers
    const btnOpenEstTop = document.getElementById('btnTopEstimateModal');
    const btnOpenEst1 = document.getElementById('btnOpenEstimateModal');
    const btnOpenEst2 = document.getElementById('btnReturnOpenEstimateModal');
    const btnCloseEst = document.getElementById('btnCloseEstimateModal');

    [btnOpenEstTop, btnOpenEst1, btnOpenEst2].forEach(btn => {
      if (btn) btn.onclick = () => openModal('modalEstimate', initEstimateModule);
    });
    if (btnCloseEst) btnCloseEst.onclick = () => closeModal('modalEstimate');

    // 2. Day-End Closing Modal Triggers
    const btnOpenCloseTop = document.getElementById('btnTopClosingModal');
    const btnOpenClose1 = document.getElementById('btnOpenClosingModal');
    const btnOpenClose2 = document.getElementById('btnReturnOpenClosingModal');
    const btnCloseClose = document.getElementById('btnCloseClosingModal');

    [btnOpenCloseTop, btnOpenClose1, btnOpenClose2].forEach(btn => {
      if (btn) btn.onclick = () => openModal('modalClosing', initClosingModule);
    });
    if (btnCloseClose) btnCloseClose.onclick = () => closeModal('modalClosing');

    // 3. Warranty Claims Modal Triggers
    const btnOpenClmTop = document.getElementById('btnTopClaimsModal');
    const btnOpenClm1 = document.getElementById('btnOpenClaimsModal');
    const btnOpenClm2 = document.getElementById('btnReturnOpenClaimsModal');
    const btnCloseClm = document.getElementById('btnCloseClaimsModal');

    [btnOpenClmTop, btnOpenClm1, btnOpenClm2].forEach(btn => {
      if (btn) btn.onclick = () => openModal('modalClaims', initClaimsModule);
    });
    if (btnCloseClm) btnCloseClm.onclick = () => closeModal('modalClaims');

    // 4. Daily Expenses Modal Triggers
    const btnOpenExpTop = document.getElementById('btnTopExpensesModal');
    const btnCloseExp = document.getElementById('btnCloseExpensesModal');
    if (btnOpenExpTop) btnOpenExpTop.onclick = () => openModal('modalExpenses', initExpensesModule);
    if (btnCloseExp) btnCloseExp.onclick = () => closeModal('modalExpenses');

    const btnExpSave = document.getElementById('btnExpenseSave');
    if (btnExpSave) btnExpSave.onclick = saveExpenseRecord;

    const btnExpNew = document.getElementById('btnExpenseNew');
    if (btnExpNew) btnExpNew.onclick = resetExpenseForm;

    // Close on backdrop click
    ['modalEstimate', 'modalClosing', 'modalClaims', 'modalExpenses'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(id);
        });
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['modalEstimate', 'modalClosing', 'modalClaims', 'modalExpenses'].forEach(id => closeModal(id));
      }
    });
  }

  // ========================================================
  // 2. ESTIMATE / KACHA BILL LOGIC
  // ========================================================
  async function initEstimateModule() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('estDate');
    if (dateInput && !dateInput.value) dateInput.value = today;

    const numInput = document.getElementById('estNumber');
    if (numInput && api.getNextEstimateNo) {
      numInput.value = await api.getNextEstimateNo();
    }

    populateEstimateProducts();

    const qtyInput = document.getElementById('estQty');
    const rateInput = document.getElementById('estRate');
    const lineAmount = document.getElementById('estLineAmount');

    function calcLine() {
      const q = Number(qtyInput.value) || 0;
      const r = Number(rateInput.value) || 0;
      lineAmount.value = formatMoney(q * r);
    }
    if (qtyInput) qtyInput.oninput = calcLine;
    if (rateInput) rateInput.oninput = calcLine;

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

    const btnNew = document.getElementById('btnEstimateNew');
    if (btnNew) btnNew.onclick = resetEstimateForm;
  }

  async function resetEstimateForm() {
    state.estimateItems = [];
    renderEstimateTable();
    const cust = document.getElementById('estCustomerName');
    if (cust) cust.value = '';
    const phone = document.getElementById('estPhone');
    if (phone) phone.value = '';
    const numInput = document.getElementById('estNumber');
    if (numInput && api.getNextEstimateNo) {
      numInput.value = await api.getNextEstimateNo();
    }
  }

  async function populateEstimateProducts() {
    const sel = document.getElementById('estProductSelect');
    if (!sel || sel.options.length > 1) return;

    try {
      if (window.electronAPI && window.electronAPI.getProducts) {
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
      }
    } catch (e) {
      console.warn('Could not load products for estimate select:', e);
    }
  }

  function addEstimateItem() {
    const code = document.getElementById('estItemCode').value.trim();
    const sel = document.getElementById('estProductSelect');
    const opt = sel ? sel.selectedOptions[0] : null;
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
    if (sel) sel.value = '';
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

    const totalItemsEl = document.getElementById('estTotalItems');
    if (totalItemsEl) totalItemsEl.textContent = state.estimateItems.length;
    const grandTotalEl = document.getElementById('estGrandTotal');
    if (grandTotalEl) grandTotalEl.textContent = formatMoney(grandTotal);
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
    const customer = (document.getElementById('estCustomerName')?.value || '').trim() || 'Walk-in Customer';
    const phone = (document.getElementById('estPhone')?.value || '').trim();
    const items = [...state.estimateItems];

    // Close modal
    closeModal('modalEstimate');

    // Switch view to Sales module
    const salesNavBtn = document.getElementById('navSalesMainBtn');
    if (salesNavBtn) {
      salesNavBtn.click();
    }

    // Load items into sales bill
    if (window.SalesModule && typeof window.SalesModule.loadEstimateIntoBill === 'function') {
      window.SalesModule.loadEstimateIntoBill(customer, phone, items);
      notify(`Estimate with ${items.length} item(s) converted to Sale Bill!`);
    } else {
      notify('Sales module is not ready to receive estimate items', 'error');
    }
  }

  // ========================================================
  // 3. DAY-END CASH CLOSING LOGIC
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
      if (diffEl) {
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
      }

      const nextDayEl = document.getElementById('closingNextDayCash');
      if (nextDayEl) nextDayEl.value = formatMoney(nextDay);
    }

    if (inputCounted) inputCounted.oninput = calcDifference;
    if (inputManager) inputManager.oninput = calcDifference;
  }

  async function loadClosingSummary(date) {
    if (!api.getDailyClosingSummary) return;
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
  // 4. WARRANTY CLAIMS LOGIC
  // ========================================================
  async function initClaimsModule() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('claimDate');
    if (dateInput && !dateInput.value) dateInput.value = today;

    const numInput = document.getElementById('claimNo');
    if (numInput && api.getNextClaimNo) {
      numInput.value = await api.getNextClaimNo();
    }

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
    if (api.getNextClaimNo) {
      document.getElementById('claimNo').value = await api.getNextClaimNo();
    }
  }

  async function loadClaimsList() {
    const tbody = document.getElementById('claimsTableBody');
    if (!tbody || !api.getClaims) return;
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
  // 4. DAILY EXPENSES (DUKAN KHARCHAY) LOGIC
  // ========================================================
  async function initExpensesModule() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('expDate');
    if (dateInput && !dateInput.value) dateInput.value = today;

    const vNoInput = document.getElementById('expVoucherNo');
    if (vNoInput && api.getNextExpenseVoucherNo) {
      vNoInput.value = await api.getNextExpenseVoucherNo();
    }

    const catSelect = document.getElementById('expCategorySelect');
    if (catSelect && api.getChartOfAccounts) {
      const coaList = await api.getChartOfAccounts();
      catSelect.innerHTML = (coaList || []).map(c => `<option value="${c.code}" data-title="${c.title}">${c.title} (${c.code})</option>`).join('');
    }

    loadExpensesList();
  }

  async function loadExpensesList() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody || !api.getExpenses) return;
    tbody.innerHTML = '';
    const list = await api.getExpenses();
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted, #94a3b8);">No shop expenses recorded yet.</td></tr>';
      return;
    }
    list.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-bold font-num">${e.voucherNo || '-'}</td>
        <td class="font-num">${e.entryDate || '-'}</td>
        <td class="font-bold">${e.accountTitle || e.category || '-'}</td>
        <td>${e.paidTo || '-'}</td>
        <td><span class="tf-badge ${e.paymentMode === 'Cash' ? 'status-received' : 'status-factory'}">${e.paymentMode || 'Cash'}</span></td>
        <td class="text-right font-num font-bold text-danger">Rs. ${Number(e.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="font-size: 12px; color: var(--text-muted, #64748b);">${e.remarks || '-'}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action action-danger" onclick="window.deleteTradeExpense('${e.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function saveExpenseRecord() {
    const amount = Number(document.getElementById('expAmount').value) || 0;
    if (amount <= 0) {
      notify('Please enter a valid expense amount greater than 0', 'error');
      return;
    }

    const catSelect = document.getElementById('expCategorySelect');
    const selectedOpt = catSelect ? catSelect.options[catSelect.selectedIndex] : null;
    const accountTitle = selectedOpt ? selectedOpt.getAttribute('data-title') || selectedOpt.text : 'General Expense';
    const accountCode = catSelect ? catSelect.value : '';

    const payload = {
      voucherNo: document.getElementById('expVoucherNo').value,
      entryDate: document.getElementById('expDate').value,
      accountCode,
      accountTitle,
      category: accountTitle,
      amount,
      paymentMode: document.getElementById('expPaymentMode').value,
      paidTo: document.getElementById('expPaidTo').value,
      remarks: document.getElementById('expRemarks').value
    };

    const res = await api.saveExpense(payload);
    if (res && res.success) {
      notify(`Expense [${res.voucherNo}] recorded successfully!`);
      resetExpenseForm();
      loadExpensesList();
    }
  }

  window.deleteTradeExpense = async function(id) {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    const res = await api.deleteExpense(id);
    if (res && res.success) {
      notify('Expense deleted successfully');
      loadExpensesList();
    }
  };

  async function resetExpenseForm() {
    const amt = document.getElementById('expAmount');
    if (amt) amt.value = '';
    const pt = document.getElementById('expPaidTo');
    if (pt) pt.value = '';
    const rem = document.getElementById('expRemarks');
    if (rem) rem.value = '';
    if (api.getNextExpenseVoucherNo) {
      const vNo = document.getElementById('expVoucherNo');
      if (vNo) vNo.value = await api.getNextExpenseVoucherNo();
    }
  }

  // ========================================================
  // INITIALIZATION ON DOM READY
  // ========================================================
  function init() {
    setupTradeFeatureModals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
