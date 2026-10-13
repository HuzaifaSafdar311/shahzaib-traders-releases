// ========================================================
// Shahzaib Traders - Sale Module (Sales Information Voucher)
// Featuring Multi-Rate Visibility (Purchase, Wholesale, Retail)
// ========================================================

(function () {
  'use strict';

  // Sale Module State
  let saleState = {
    saleId: null,
    voucherNo: '',
    items: [],
    selectedProduct: null,
    selectedCustomer: null,
    rateMode: 'retail', // 'retail' | 'wholesale' | 'custom'
    salesList: []
  };

  // DOM Elements Cache
  const el = {};

  function initElements() {
    el.view = document.getElementById('salesView');
    if (!el.view) return;

    // Header buttons
    el.btnNew = document.getElementById('btnSaleNew');
    el.btnSave = document.getElementById('btnSaleSave');
    el.btnPrint = document.getElementById('btnSalePrint');
    el.btnHistory = document.getElementById('btnSaleHistory');
    el.btnDelete = document.getElementById('btnSaleDelete');

    // Meta inputs
    el.entryDate = document.getElementById('saleEntryDate');
    el.voucherNo = document.getElementById('saleVoucherNo');
    el.manualNo = document.getElementById('saleManualNo');
    el.customerSelect = document.getElementById('saleCustomerSelect');
    el.paymentType = document.getElementById('salePaymentType');

    // Secondary bar
    el.customerPhone = document.getElementById('saleCustomerPhone');
    el.customerArea = document.getElementById('saleCustomerArea');
    el.customerPrevBalance = document.getElementById('saleCustomerPrevBalance');
    el.storeTitle = document.getElementById('saleStoreTitle');
    el.description = document.getElementById('saleDescription');

    // Item Entry Row
    el.itemCode = document.getElementById('saleItemCode');
    el.btnFindProduct = document.getElementById('btnSaleFindProduct');
    el.productSelect = document.getElementById('saleProductSelect');
    el.packSize = document.getElementById('salePackSize');
    el.packQty = document.getElementById('salePackQty');
    el.unitQty = document.getElementById('saleUnitQty');
    el.totalQty = document.getElementById('saleTotalQty');
    el.availableStock = document.getElementById('saleAvailableStock');

    // Multi-Rate Visibility Elements (CORE FEATURE)
    el.costPill = document.getElementById('salePurchasePricePill');
    el.wholesalePill = document.getElementById('saleWholesalePricePill');
    el.retailPill = document.getElementById('saleRetailPricePill');
    el.salePrice = document.getElementById('saleSalePriceInput');
    el.discountPercent = document.getElementById('saleDiscountPercent');
    el.lineAmount = document.getElementById('saleLineAmount');
    el.btnAddItem = document.getElementById('btnSaleAddItem');

    // Items Table
    el.itemsTableBody = document.getElementById('saleItemsTableBody');
    el.emptyTableState = document.getElementById('saleItemsEmptyState');

    // Totals & Footer
    el.totalItemsCount = document.getElementById('saleTotalItemsCount');
    el.totalPiecesCount = document.getElementById('saleTotalPiecesCount');
    el.totalProfitPreview = document.getElementById('saleTotalProfitPreview');
    el.grossTotal = document.getElementById('saleGrossTotal');
    el.specialDiscount = document.getElementById('saleSpecialDiscount');
    el.netTotal = document.getElementById('saleNetTotal');
    el.paidAmount = document.getElementById('salePaidAmount');
    el.balanceDue = document.getElementById('saleBalanceDue');
    el.returnChange = document.getElementById('saleReturnChange');
    el.finalCustomerBalance = document.getElementById('saleFinalCustomerBalance');

    // Receipt Modal
    el.modalReceipt = document.getElementById('modalSaleReceipt');
    el.receiptArea = document.getElementById('thermalReceiptPrintArea');
    el.btnCloseReceipt = document.getElementById('btnCloseSaleReceipt');
    el.btnDoPrintReceipt = document.getElementById('btnDoPrintSaleReceipt');

    // History Modal
    el.modalHistory = document.getElementById('modalSaleHistory');
    el.historyTableBody = document.getElementById('saleHistoryTableBody');
    el.btnCloseHistory = document.getElementById('btnCloseSaleHistory');
    el.historySearchInput = document.getElementById('saleHistorySearchInput');
  }

  // ========================================================
  // INITIALIZATION & CUSTOMER POPULATION
  // ========================================================
  async function initSalesModule() {
    initElements();
    if (!el.view) return;

    bindEvents();
    await loadNextVoucherNo();
    await populateCustomers();
    populateProductDropdown();
    resetVoucher();
  }

  async function loadNextVoucherNo() {
    try {
      if (window.salesAPI?.getNextVoucherNo) {
        saleState.voucherNo = await window.salesAPI.getNextVoucherNo();
      } else {
        saleState.voucherNo = 'SV-' + String(Date.now()).slice(-4);
      }
      if (el.voucherNo) el.voucherNo.value = saleState.voucherNo;
    } catch (e) {
      console.error('Failed to get next voucher no:', e);
    }
  }

  async function populateCustomers() {
    if (!el.customerSelect) return;
    el.customerSelect.innerHTML = '<option value="">-- Select Customer / Party --</option>';

    let parties = [];
    try {
      if (window.generalInfoAPI?.getParties) {
        parties = await window.generalInfoAPI.getParties();
      }
    } catch (e) {
      console.warn('Could not load parties from generalInfoAPI:', e);
    }

    if (!parties || parties.length === 0) {
      parties = window.appData?.parties || [];
    }

    // Sort parties alphabetically
    parties.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    parties.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title}${p.urduTitle ? ` (${p.urduTitle})` : ''} - ${p.areaName || p.phone || 'General'}`;
      opt.dataset.party = JSON.stringify(p);
      el.customerSelect.appendChild(opt);
    });
  }

  function populateProductDropdown() {
    if (!el.productSelect) return;
    el.productSelect.innerHTML = '<option value="">-- Select Product Title --</option>';
    const prods = window.appData?.products || [];
    prods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.code} - ${p.titleEng} (Stock: ${p.stockQty || 0})`;
      el.productSelect.appendChild(opt);
    });
  }

  // ========================================================
  // PRODUCT SELECTION & LIVE RATES COMPARISON (CORE FEATURE)
  // ========================================================
  function selectProduct(p) {
    if (!p) return;
    saleState.selectedProduct = p;

    if (el.itemCode) el.itemCode.value = p.code || '';
    if (el.productSelect) el.productSelect.value = p.id || '';
    if (el.packSize) el.packSize.value = Number(p.packSize) || 1;
    if (el.availableStock) {
      el.availableStock.textContent = `${p.stockQty || 0} ${p.unitName || ''}`;
      el.availableStock.className = (Number(p.stockQty) > 0) ? 'badge-price-pill bg-green-pill font-num' : 'badge-price-pill bg-danger-pill font-num';
    }

    // Populate the three distinct rates
    const cost = Number(p.purchasePrice || p.averageCost || 0);
    const wholesale = Number(p.wholesalePrice || 0);
    const retail = Number(p.retailPrice || 0);

    // 1. Purchase Price (Cost baseline for staff reference)
    if (el.costPill) {
      el.costPill.textContent = `Rs ${cost.toFixed(2)}`;
      el.costPill.title = 'Purchase Cost Rate (Internal reference)';
    }

    // 2. Wholesale Price (Selectable rate button)
    if (el.wholesalePill) {
      el.wholesalePill.textContent = `Rs ${wholesale.toFixed(2)}`;
      el.wholesalePill.title = 'Click to apply Wholesale Price';
    }

    // 3. Retail Sale Price (Selectable rate button)
    if (el.retailPill) {
      el.retailPill.textContent = `Rs ${retail.toFixed(2)}`;
      el.retailPill.title = 'Click to apply Retail Price';
    }

    // Default rate selection (Retail by default, or Wholesale if set)
    applyRateChoice(saleState.rateMode === 'wholesale' ? 'wholesale' : 'retail');

    // Default quantities
    if (el.packQty) el.packQty.value = 1;
    if (el.unitQty) el.unitQty.value = 0;
    updateLineCalculations();

    // Focus pack quantity for rapid POS operation
    if (el.packQty) el.packQty.focus();
  }

  function applyRateChoice(mode) {
    if (!saleState.selectedProduct) return;
    saleState.rateMode = mode;
    const p = saleState.selectedProduct;

    if (mode === 'wholesale') {
      const wp = Number(p.wholesalePrice || p.retailPrice || 0);
      if (el.salePrice) el.salePrice.value = wp.toFixed(2);
      if (el.wholesalePill) el.wholesalePill.classList.add('active-choice');
      if (el.retailPill) el.retailPill.classList.remove('active-choice');
    } else if (mode === 'retail') {
      const rp = Number(p.retailPrice || p.wholesalePrice || 0);
      if (el.salePrice) el.salePrice.value = rp.toFixed(2);
      if (el.retailPill) el.retailPill.classList.add('active-choice');
      if (el.wholesalePill) el.wholesalePill.classList.remove('active-choice');
    }

    updateLineCalculations();
  }

  function updateLineCalculations() {
    const packSize = Number(el.packSize?.value) || 1;
    const pQty = Number(el.packQty?.value) || 0;
    const uQty = Number(el.unitQty?.value) || 0;
    const totalQty = (pQty * packSize) + uQty;

    if (el.totalQty) el.totalQty.value = totalQty;

    const rate = Number(el.salePrice?.value) || 0;
    const discPct = Number(el.discountPercent?.value) || 0;
    const grossLine = totalQty * rate;
    const discAmt = grossLine * (discPct / 100);
    const netLine = Math.max(0, grossLine - discAmt);

    if (el.lineAmount) el.lineAmount.value = netLine.toFixed(2);
  }

  // ========================================================
  // LINE ITEM ADD & REMOVE
  // ========================================================
  function addCurrentItem() {
    const p = saleState.selectedProduct;
    if (!p) {
      if (window.showToast) window.showToast('Please select a product first', 'warning');
      return;
    }

    const packSize = Number(el.packSize?.value) || 1;
    const pQty = Number(el.packQty?.value) || 0;
    const uQty = Number(el.unitQty?.value) || 0;
    const totalQty = (pQty * packSize) + uQty;

    if (totalQty <= 0) {
      if (window.showToast) window.showToast('Quantity must be greater than 0', 'warning');
      return;
    }

    const rate = Number(el.salePrice?.value) || 0;
    if (rate <= 0) {
      if (window.showToast) window.showToast('Please enter a valid sale price', 'warning');
      return;
    }

    const costPrice = Number(p.purchasePrice || p.averageCost || 0);
    const wholesalePrice = Number(p.wholesalePrice || 0);
    const retailPrice = Number(p.retailPrice || 0);
    const discPct = Number(el.discountPercent?.value) || 0;
    const grossLine = totalQty * rate;
    const discAmt = grossLine * (discPct / 100);
    const netLine = Math.max(0, grossLine - discAmt);

    // Warning if selling below purchase cost!
    if (costPrice > 0 && rate < costPrice) {
      const confirmBelowCost = confirm(`Warning: Sale rate (Rs ${rate}) is lower than purchase cost (Rs ${costPrice})!\nDo you still want to add this item?`);
      if (!confirmBelowCost) return;
    }

    // Check if item already exists in voucher
    const existingIdx = saleState.items.findIndex(it => it.productId === p.id || it.productCode === p.code);
    if (existingIdx !== -1) {
      saleState.items[existingIdx].packQty += pQty;
      saleState.items[existingIdx].unitQty += uQty;
      saleState.items[existingIdx].totalQty += totalQty;
      saleState.items[existingIdx].salePrice = rate;
      saleState.items[existingIdx].discountPercent = discPct;
      saleState.items[existingIdx].discountAmount += discAmt;
      saleState.items[existingIdx].netAmount += netLine;
    } else {
      saleState.items.push({
        id: `si-${Date.now()}-${saleState.items.length + 1}`,
        productId: p.id,
        productCode: p.code,
        productTitle: p.titleEng,
        packSize,
        packQty: pQty,
        unitQty: uQty,
        totalQty,
        purchasePrice: costPrice,
        wholesalePrice,
        retailPrice,
        salePrice: rate,
        discountPercent: discPct,
        discountAmount: discAmt,
        netAmount: netLine
      });
    }

    clearEntryFields();
    renderItemsTable();
    updateVoucherTotals();

    // Re-focus Code for rapid next entry
    if (el.itemCode) el.itemCode.focus();
  }

  function clearEntryFields() {
    saleState.selectedProduct = null;
    if (el.itemCode) el.itemCode.value = '';
    if (el.productSelect) el.productSelect.value = '';
    if (el.packSize) el.packSize.value = 1;
    if (el.packQty) el.packQty.value = 1;
    if (el.unitQty) el.unitQty.value = 0;
    if (el.totalQty) el.totalQty.value = 0;
    if (el.availableStock) el.availableStock.textContent = '-';
    if (el.costPill) el.costPill.textContent = '0.00';
    if (el.wholesalePill) el.wholesalePill.textContent = '0.00';
    if (el.retailPill) el.retailPill.textContent = '0.00';
    if (el.salePrice) el.salePrice.value = '0.00';
    if (el.discountPercent) el.discountPercent.value = '0.0';
    if (el.lineAmount) el.lineAmount.value = '0.00';
  }

  function removeSaleItem(idx) {
    saleState.items.splice(idx, 1);
    renderItemsTable();
    updateVoucherTotals();
  }

  // ========================================================
  // RENDER LINE ITEMS & TOTALS
  // ========================================================
  function renderItemsTable() {
    if (!el.itemsTableBody) return;
    el.itemsTableBody.innerHTML = '';

    if (saleState.items.length === 0) {
      if (el.emptyTableState) el.emptyTableState.classList.remove('hidden');
      return;
    }
    if (el.emptyTableState) el.emptyTableState.classList.add('hidden');

    saleState.items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-num text-center">${idx + 1}</td>
        <td class="font-bold text-accent font-num">${window.escapeHtml(item.productCode)}</td>
        <td class="font-bold">${window.escapeHtml(item.productTitle)}</td>
        <td class="text-center font-num">${item.packSize}</td>
        <td class="text-center font-num">${item.packQty} / ${item.unitQty}</td>
        <td class="text-center font-bold font-num text-primary">${item.totalQty}</td>
        <td class="text-center font-num text-secondary" title="Purchase Cost">${Number(item.purchasePrice || 0).toFixed(2)}</td>
        <td class="text-center font-num text-success font-bold">${Number(item.wholesalePrice || 0).toFixed(2)}</td>
        <td class="text-center font-num text-warning font-bold">${Number(item.retailPrice || 0).toFixed(2)}</td>
        <td class="text-right font-num font-bold text-primary">${Number(item.salePrice || 0).toFixed(2)}</td>
        <td class="text-center font-num text-secondary">${item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
        <td class="text-right font-num font-bold text-success">${Number(item.netAmount || 0).toFixed(2)}</td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-icon text-danger" onclick="window.SalesModule.removeItem(${idx})" title="Remove item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      `;
      el.itemsTableBody.appendChild(tr);
    });
  }

  function updateVoucherTotals() {
    let gross = 0;
    let totalPieces = 0;
    let totalCost = 0;

    saleState.items.forEach(it => {
      gross += Number(it.netAmount || 0);
      totalPieces += Number(it.totalQty || 0);
      totalCost += (Number(it.purchasePrice || 0) * Number(it.totalQty || 0));
    });

    const specialDisc = Number(el.specialDiscount?.value) || 0;
    const netTotal = Math.max(0, gross - specialDisc);
    const estProfit = Math.max(0, netTotal - totalCost);

    const paid = Number(el.paidAmount?.value) || 0;
    const balanceDue = Math.max(0, netTotal - paid);
    const returnChange = Math.max(0, paid - netTotal);

    const prevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);
    const newCustomerBalance = prevBal + (netTotal - paid);

    if (el.totalItemsCount) el.totalItemsCount.textContent = saleState.items.length;
    if (el.totalPiecesCount) el.totalPiecesCount.textContent = totalPieces;
    if (el.totalProfitPreview) el.totalProfitPreview.textContent = window.formatPKR ? window.formatPKR(estProfit) : `Rs ${estProfit.toFixed(2)}`;
    if (el.grossTotal) el.grossTotal.textContent = window.formatPKR ? window.formatPKR(gross) : `Rs ${gross.toFixed(2)}`;
    if (el.netTotal) el.netTotal.textContent = window.formatPKR ? window.formatPKR(netTotal) : `Rs ${netTotal.toFixed(2)}`;
    if (el.balanceDue) el.balanceDue.textContent = window.formatPKR ? window.formatPKR(balanceDue) : `Rs ${balanceDue.toFixed(2)}`;
    if (el.returnChange) el.returnChange.textContent = window.formatPKR ? window.formatPKR(returnChange) : `Rs ${returnChange.toFixed(2)}`;
    if (el.finalCustomerBalance) {
      el.finalCustomerBalance.textContent = window.formatPKR ? window.formatPKR(newCustomerBalance) : `Rs ${newCustomerBalance.toFixed(2)}`;
      el.finalCustomerBalance.className = newCustomerBalance > 0 ? 'calc-val text-danger' : 'calc-val text-success';
    }
  }

  // ========================================================
  // SAVE SALE VOUCHER
  // ========================================================
  async function saveSaleVoucher() {
    if (!el.customerSelect?.value) {
      if (window.showToast) window.showToast('Please select a customer for this sale voucher', 'warning');
      el.customerSelect?.focus();
      return;
    }

    if (saleState.items.length === 0) {
      if (window.showToast) window.showToast('Please add at least one product to the voucher', 'warning');
      return;
    }

    const selectedPartyObj = saleState.selectedCustomer || {};
    const gross = saleState.items.reduce((s, it) => s + Number(it.netAmount || 0), 0);
    const specialDisc = Number(el.specialDiscount?.value) || 0;
    const net = Math.max(0, gross - specialDisc);
    const paid = Number(el.paidAmount?.value) || 0;
    const balanceDue = Math.max(0, net - paid);
    const prevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);

    const saleRecord = {
      id: saleState.saleId || undefined,
      voucherNo: el.voucherNo?.value || saleState.voucherNo,
      manualNo: el.manualNo?.value.trim() || '',
      entryDate: el.entryDate?.value || new Date().toISOString().split('T')[0],
      partyId: el.customerSelect.value,
      partyTitle: selectedPartyObj.title || el.customerSelect.options[el.customerSelect.selectedIndex]?.text || 'Cash Customer',
      customerPhone: el.customerPhone?.value || '',
      areaName: el.customerArea?.value || '',
      description: el.description?.value || '',
      storeTitle: el.storeTitle?.value || 'Main Store',
      paymentType: el.paymentType?.value || 'Cash',
      previousBalance: prevBal,
      grossAmount: gross,
      discount: specialDisc,
      netAmount: net,
      paidAmount: paid,
      balanceDue: balanceDue
    };

    try {
      let res;
      if (window.salesAPI?.saveSale) {
        res = await window.salesAPI.saveSale(saleRecord, saleState.items);
      } else if (window.api?.saveSale) {
        res = await window.api.saveSale(saleRecord, saleState.items);
      }

      if (window.showToast) {
        window.showToast(`Sale Voucher ${saleRecord.voucherNo} saved successfully!`, 'success');
      }

      // Reload global store to reflect updated stock quantities
      if (window.reloadFromDatabase) {
        await window.reloadFromDatabase();
      }

      // Open print bill confirmation dialog
      const askPrint = confirm(`Sale Voucher ${saleRecord.voucherNo} saved!\nDo you want to print the receipt bill?`);
      if (askPrint) {
        openReceiptModal({ ...saleRecord, items: [...saleState.items] });
      }

      resetVoucher();
    } catch (err) {
      console.error('Failed to save sale voucher:', err);
      if (window.showToast) window.showToast(`Save failed: ${err.message}`, 'error');
    }
  }

  function resetVoucher() {
    saleState.saleId = null;
    saleState.items = [];
    saleState.selectedProduct = null;
    saleState.selectedCustomer = null;

    if (el.entryDate) el.entryDate.value = new Date().toISOString().split('T')[0];
    if (el.manualNo) el.manualNo.value = '';
    if (el.customerSelect) el.customerSelect.value = '';
    if (el.customerPhone) el.customerPhone.value = '';
    if (el.customerArea) el.customerArea.value = '';
    if (el.customerPrevBalance) {
      el.customerPrevBalance.value = 'Rs 0.00';
      el.customerPrevBalance.dataset.rawBalance = 0;
    }
    if (el.description) el.description.value = '';
    if (el.specialDiscount) el.specialDiscount.value = 0;
    if (el.paidAmount) el.paidAmount.value = 0;

    clearEntryFields();
    renderItemsTable();
    updateVoucherTotals();
    loadNextVoucherNo();
  }

  // ========================================================
  // RECEIPT BILL PRINT PREVIEW (THERMAL POS / INVOICE)
  // ========================================================
  function openReceiptModal(saleObj) {
    if (!el.modalReceipt || !el.receiptArea) return;
    const s = saleObj || {
      voucherNo: el.voucherNo?.value || '',
      entryDate: el.entryDate?.value || '',
      partyTitle: el.customerSelect?.options[el.customerSelect?.selectedIndex]?.text || 'Cash Customer',
      customerPhone: el.customerPhone?.value || '',
      areaName: el.customerArea?.value || '',
      grossAmount: Number(el.grossTotal?.textContent.replace(/[^0-9.]/g, '') || 0),
      discount: Number(el.specialDiscount?.value || 0),
      netAmount: Number(el.netTotal?.textContent.replace(/[^0-9.]/g, '') || 0),
      paidAmount: Number(el.paidAmount?.value || 0),
      balanceDue: Number(el.balanceDue?.textContent.replace(/[^0-9.]/g, '') || 0),
      previousBalance: Number(el.customerPrevBalance?.dataset?.rawBalance || 0),
      items: saleState.items
    };

    let itemsRows = '';
    (s.items || []).forEach((it, idx) => {
      itemsRows += `
        <tr>
          <td>${idx + 1}. ${window.escapeHtml(it.productTitle)}</td>
          <td style="text-align: center;">${it.totalQty}</td>
          <td style="text-align: right;">${Number(it.salePrice).toFixed(2)}</td>
          <td style="text-align: right;">${Number(it.netAmount).toFixed(2)}</td>
        </tr>
      `;
    });

    el.receiptArea.innerHTML = `
      <div class="thermal-receipt-paper">
        <div class="receipt-header">
          <div class="receipt-title">SHAHZAIB TRADERS</div>
          <div class="receipt-meta">Main Market, Wah Cantt, Punjab</div>
          <div class="receipt-meta">Phone: 0300-1234567 | 051-4567890</div>
          <div class="receipt-meta"><strong>SALE INVOICE</strong></div>
        </div>

        <div style="font-size: 11px; margin-bottom: 8px;">
          <div><strong>Bill #:</strong> ${window.escapeHtml(s.voucherNo)}</div>
          <div><strong>Date:</strong> ${s.entryDate} &nbsp; <strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
          <div><strong>Customer:</strong> ${window.escapeHtml(s.partyTitle)}</div>
          ${s.customerPhone ? `<div><strong>Phone:</strong> ${window.escapeHtml(s.customerPhone)}</div>` : ''}
          ${s.areaName ? `<div><strong>City/Area:</strong> ${window.escapeHtml(s.areaName)}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 48%;">Item</th>
              <th style="width: 14%; text-align: center;">Qty</th>
              <th style="width: 18%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="receipt-totals" style="font-size: 12px; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between;">
            <span>Gross Total:</span>
            <span>Rs ${Number(s.grossAmount || 0).toFixed(2)}</span>
          </div>
          ${Number(s.discount) > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Discount:</span>
            <span>- Rs ${Number(s.discount).toFixed(2)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
            <span>Net Payable:</span>
            <span>Rs ${Number(s.netAmount || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Cash Received:</span>
            <span>Rs ${Number(s.paidAmount || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Bill Balance:</span>
            <span>Rs ${Number(s.balanceDue || 0).toFixed(2)}</span>
          </div>
          ${Number(s.previousBalance) > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #4b5563; font-size: 11px; margin-top: 4px; border-top: 1px dotted #9ca3af;">
            <span>Previous Ledger Bal:</span>
            <span>Rs ${Number(s.previousBalance).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
            <span>Total Outstanding:</span>
            <span>Rs ${(Number(s.previousBalance) + Number(s.balanceDue)).toFixed(2)}</span>
          </div>` : ''}
        </div>

        <div class="receipt-footer">
          <div>Thank you for your business!</div>
          <div style="font-size: 10px; margin-top: 4px;">Software by Shahzaib Traders Systems</div>
        </div>
      </div>
    `;

    el.modalReceipt.classList.remove('hidden');
  }

  // ========================================================
  // RECENT SALES HISTORY
  // ========================================================
  async function openHistoryModal() {
    if (!el.modalHistory || !el.historyTableBody) return;
    el.historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading sales history...</td></tr>';
    el.modalHistory.classList.remove('hidden');

    try {
      let sales = [];
      if (window.salesAPI?.getSales) {
        sales = await window.salesAPI.getSales();
      } else {
        sales = window.appData?.sales || [];
      }
      saleState.salesList = sales;
      renderHistoryList(sales);
    } catch (e) {
      console.error('Failed to load sales history:', e);
      el.historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Failed to load sales</td></tr>';
    }
  }

  function renderHistoryList(sales) {
    if (!el.historyTableBody) return;
    el.historyTableBody.innerHTML = '';

    if (!sales || sales.length === 0) {
      el.historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-secondary">No sales recorded yet</td></tr>';
      return;
    }

    sales.forEach(s => {
      let itemsCount = 0;
      try {
        const parsed = JSON.parse(s.itemsJson || '[]');
        itemsCount = parsed.length;
      } catch (e) {}

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-num font-bold text-primary">${window.escapeHtml(s.voucherNo)}</td>
        <td>${s.entryDate || '-'}</td>
        <td class="font-bold">${window.escapeHtml(s.partyTitle || '-')}</td>
        <td class="text-center font-num">${itemsCount}</td>
        <td class="text-right font-num font-bold text-success">Rs ${Number(s.netAmount || 0).toFixed(2)}</td>
        <td class="text-right font-num">${Number(s.paidAmount || 0).toFixed(2)}</td>
        <td class="text-center">
          <div class="flex items-center justify-center gap-2">
            <button type="button" class="btn btn-sm btn-secondary" onclick="window.SalesModule.reprintSale('${s.id}')" title="Print Bill">🖨️ Print</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="window.SalesModule.deleteSalePrompt('${s.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      `;
      el.historyTableBody.appendChild(tr);
    });
  }

  // ========================================================
  // EVENT BINDINGS
  // ========================================================
  function bindEvents() {
    // Header buttons
    if (el.btnNew) el.btnNew.addEventListener('click', resetVoucher);
    if (el.btnSave) el.btnSave.addEventListener('click', saveSaleVoucher);
    if (el.btnPrint) el.btnPrint.addEventListener('click', () => openReceiptModal());
    if (el.btnHistory) el.btnHistory.addEventListener('click', openHistoryModal);

    // Customer Select
    if (el.customerSelect) {
      el.customerSelect.addEventListener('change', () => {
        const opt = el.customerSelect.options[el.customerSelect.selectedIndex];
        if (opt && opt.dataset.party) {
          const p = JSON.parse(opt.dataset.party);
          saleState.selectedCustomer = p;
          if (el.customerPhone) el.customerPhone.value = p.phone || '';
          if (el.customerArea) el.customerArea.value = p.areaName || '';
          const bal = Number(p.openingBalance || p.currentBalance || 0);
          if (el.customerPrevBalance) {
            el.customerPrevBalance.value = window.formatPKR ? window.formatPKR(bal) : `Rs ${bal.toFixed(2)}`;
            el.customerPrevBalance.dataset.rawBalance = bal;
          }
        } else {
          saleState.selectedCustomer = null;
          if (el.customerPhone) el.customerPhone.value = '';
          if (el.customerArea) el.customerArea.value = '';
          if (el.customerPrevBalance) {
            el.customerPrevBalance.value = 'Rs 0.00';
            el.customerPrevBalance.dataset.rawBalance = 0;
          }
        }
        updateVoucherTotals();
      });
    }

    // Product Code input change / enter
    if (el.itemCode) {
      el.itemCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const code = el.itemCode.value.trim().toLowerCase();
          const p = (window.appData?.products || []).find(pr => (pr.code || '').toLowerCase() === code);
          if (p) selectProduct(p);
          else if (window.showToast) window.showToast(`Product code "${code}" not found`, 'warning');
        }
      });
    }

    // Product Dropdown
    if (el.productSelect) {
      el.productSelect.addEventListener('change', () => {
        const id = el.productSelect.value;
        const p = (window.appData?.products || []).find(pr => pr.id === id);
        if (p) selectProduct(p);
      });
    }

    // Find Product Button (F1)
    if (el.btnFindProduct) {
      el.btnFindProduct.addEventListener('click', () => {
        if (window.findProductAPI?.openWindow) {
          window.findProductAPI.openWindow();
        } else if (window.openProductSearchModal) {
          window.openProductSearchModal();
        }
      });
    }

    // Clickable Rate Pills (Wholesale vs Retail Switcher)
    if (el.wholesalePill) {
      el.wholesalePill.addEventListener('click', () => applyRateChoice('wholesale'));
    }
    if (el.retailPill) {
      el.retailPill.addEventListener('click', () => applyRateChoice('retail'));
    }

    // Quantity & Pricing Input Listeners
    if (el.packQty) el.packQty.addEventListener('input', updateLineCalculations);
    if (el.unitQty) el.unitQty.addEventListener('input', updateLineCalculations);
    if (el.packSize) el.packSize.addEventListener('input', updateLineCalculations);
    if (el.salePrice) el.salePrice.addEventListener('input', updateLineCalculations);
    if (el.discountPercent) el.discountPercent.addEventListener('input', updateLineCalculations);

    // Add Item button & Enter key
    if (el.btnAddItem) el.btnAddItem.addEventListener('click', addCurrentItem);
    if (el.salePrice) {
      el.salePrice.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCurrentItem();
        }
      });
    }

    // Voucher Discount & Paid amount
    if (el.specialDiscount) el.specialDiscount.addEventListener('input', updateVoucherTotals);
    if (el.paidAmount) el.paidAmount.addEventListener('input', updateVoucherTotals);

    // Receipt Modal Close & Print
    if (el.btnCloseReceipt) {
      el.btnCloseReceipt.addEventListener('click', () => {
        if (el.modalReceipt) el.modalReceipt.classList.add('hidden');
      });
    }
    if (el.btnDoPrintReceipt) {
      el.btnDoPrintReceipt.addEventListener('click', () => {
        window.print();
      });
    }

    // History Modal Close & Search
    if (el.btnCloseHistory) {
      el.btnCloseHistory.addEventListener('click', () => {
        if (el.modalHistory) el.modalHistory.classList.add('hidden');
      });
    }
    if (el.historySearchInput) {
      el.historySearchInput.addEventListener('input', () => {
        const q = el.historySearchInput.value.trim().toLowerCase();
        const filtered = saleState.salesList.filter(s =>
          (s.voucherNo || '').toLowerCase().includes(q) ||
          (s.partyTitle || '').toLowerCase().includes(q) ||
          (s.manualNo || '').toLowerCase().includes(q)
        );
        renderHistoryList(filtered);
      });
    }

    // Connect with Find Product Window callback
    if (window.findProductAPI?.onProductSelected) {
      window.findProductAPI.onProductSelected((product) => {
        if (window.currentTab === 'sale') {
          selectProduct(product);
        }
      });
    }
  }

  // ========================================================
  // PUBLIC EXPORTS
  // ========================================================
  window.SalesModule = {
    init: initSalesModule,
    onActivate: () => {
      populateCustomers();
      populateProductDropdown();
      if (!saleState.voucherNo) loadNextVoucherNo();
    },
    refresh: () => {
      populateProductDropdown();
      populateCustomers();
    },
    selectProduct,
    removeItem: removeSaleItem,
    reprintSale: (id) => {
      const s = saleState.salesList.find(x => x.id === id);
      if (s) {
        let items = [];
        try { items = JSON.parse(s.itemsJson || '[]'); } catch (e) {}
        openReceiptModal({ ...s, items });
      }
    },
    deleteSalePrompt: (id) => {
      if (!confirm('Are you sure you want to delete this sale voucher?\nItems stock will be restored back to inventory!')) return;
      window.salesAPI?.deleteSale(id).then(async () => {
        if (window.showToast) window.showToast('Sale deleted and stock restored', 'success');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
        openHistoryModal();
      }).catch(err => {
        alert('Delete failed: ' + err.message);
      });
    }
  };

  // Auto initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initSalesModule();
  });

})();
