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
    el.partyTypeSelect = document.getElementById('salePartyTypeSelect');
    el.paymentType = document.getElementById('salePaymentType');

    // Secondary bar (Dynamic Customer / Party selection)
    el.partySelectLabel = document.getElementById('salePartySelectLabel');
    el.customerSelect = document.getElementById('saleCustomerSelect');
    el.customerNameLabel = document.getElementById('saleCustomerNameLabel');
    el.customerName = document.getElementById('saleCustomerName');
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
    await loadPartyTypes();
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

  // ========================================================
  // ========================================================
  // PARTY TYPES INTEGRATION (DYNAMIC FROM GENERAL INFO)
  // ========================================================
  let sharedPartyTypes = [];
  let sharedAllParties = [];
  let sharedCompanyInfo = null;

  function getPartyEntityLabel(typeName) {
    if (!typeName) return 'Customer Name';
    const lower = typeName.toLowerCase().trim();
    if (lower.includes('vendor') || lower.includes('supplier')) return 'Vendor Name';
    if (lower.includes('wholesaler')) return 'Wholesaler Name';
    if (lower.includes('retailer')) return 'Retailer Name';
    if (lower.includes('distributor')) return 'Distributor Name';
    if (lower.includes('customer')) return 'Customer Name';
    return `${typeName} Name`;
  }

  async function loadCompanyInfo() {
    try {
      if (window.generalInfoAPI?.getGeneralInfo) {
        const gi = await window.generalInfoAPI.getGeneralInfo();
        if (gi?.companyInfo) sharedCompanyInfo = gi.companyInfo;
      }
    } catch (e) {
      console.warn('Could not load company info for sales receipts:', e);
    }
  }

  async function loadAllParties() {
    try {
      if (window.generalInfoAPI?.getParties) {
        sharedAllParties = (await window.generalInfoAPI.getParties()) || [];
      }
    } catch (e) {
      console.warn('Could not load parties from generalInfoAPI:', e);
      sharedAllParties = [];
    }
  }

  async function loadPartyTypes() {
    await loadCompanyInfo();
    await loadAllParties();
    try {
      if (window.generalInfoAPI?.getPartyTypes) {
        sharedPartyTypes = await window.generalInfoAPI.getPartyTypes();
      }
    } catch (e) {
      console.warn('Could not load party types from generalInfoAPI:', e);
    }

    if (!sharedPartyTypes || sharedPartyTypes.length === 0) {
      sharedPartyTypes = [
        { id: 'pt-1', name: 'Customer', code: 'CUST', description: 'Standard purchasing client or buyer' },
        { id: 'pt-2', name: 'Vendor / Supplier', code: 'VEND', description: 'Goods supplier and manufacturer' },
        { id: 'pt-3', name: 'Wholesaler', code: 'WHL', description: 'Bulk quantity trade partner' },
        { id: 'pt-4', name: 'Retailer', code: 'RET', description: 'Small to mid volume store merchant' },
        { id: 'pt-5', name: 'Distributor', code: 'DIST', description: 'Regional authorized distributor' }
      ];
    }

    populatePartyTypeDropdowns();
    populateCustomerDropdown();
  }

  function populatePartyTypeDropdowns() {
    const list = sharedPartyTypes || [];
    [el.partyTypeSelect, retEl.partyTypeSelect].forEach(selectEl => {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      selectEl.innerHTML = '<option value="">-- Select Party Type --</option>';
      list.forEach(pt => {
        const opt = document.createElement('option');
        opt.value = pt.id;
        opt.textContent = `${pt.name}${pt.code ? ` (${pt.code})` : ''}`;
        opt.dataset.partyType = JSON.stringify(pt);
        selectEl.appendChild(opt);
      });
      if (currentVal) selectEl.value = currentVal;
    });
  }

  function populateCustomerDropdown(pt) {
    if (!el.customerSelect) return;
    const typeTitle = pt ? (pt.name.includes('/') ? pt.name.split('/')[0].trim() : pt.name) : 'Customer';
    el.customerSelect.innerHTML = `<option value="">-- Walk-in / Cash ${typeTitle} --</option>`;

    let list = sharedAllParties || [];
    if (pt) {
      const ptIdStr = String(pt.id || '').toLowerCase();
      const ptNameLower = (pt.name || '').toLowerCase().trim();
      const filtered = list.filter(p => {
        if (p.partyTypeId && String(p.partyTypeId).toLowerCase() === ptIdStr) return true;
        const pType = (p.partyTypeName || p.partyType || '').toLowerCase().trim();
        return pType && (pType === ptNameLower || ptNameLower.includes(pType) || pType.includes(ptNameLower));
      });
      if (filtered.length > 0) {
        list = filtered;
      }
    }

    list.forEach(p => {
      const pName = p.name || p.partyTitle || 'Party';
      const pDetail = [p.city || p.areaName, p.phone].filter(Boolean).join(' • ');
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = pDetail ? `${pName} (${pDetail})` : pName;
      opt.dataset.party = JSON.stringify(p);
      el.customerSelect.appendChild(opt);
    });
  }

  function populateCustomers() {
    populateCustomerDropdown(saleState.selectedPartyType);
  }

  function selectSalePartyType(partyTypeId) {
    if (!partyTypeId) {
      saleState.selectedPartyType = null;
      saleState.selectedCustomer = null;
      if (el.partySelectLabel) el.partySelectLabel.textContent = 'Party / Account';
      if (el.customerNameLabel) el.customerNameLabel.textContent = 'Customer Name';
      populateCustomerDropdown(null);
      if (el.customerPhone) el.customerPhone.value = '';
      if (el.customerArea) el.customerArea.value = '';
      if (el.customerPrevBalance) {
        el.customerPrevBalance.value = 'Rs 0.00';
        el.customerPrevBalance.dataset.rawBalance = 0;
      }
      updateVoucherTotals();
      return;
    }

    const pt = sharedPartyTypes.find(t => String(t.id) === String(partyTypeId) || t.name === partyTypeId);
    if (pt) {
      saleState.selectedPartyType = pt;
      saleState.selectedCustomer = null;

      // Dynamically update the labels
      if (el.partySelectLabel) {
        el.partySelectLabel.textContent = `${pt.name} Account`;
      }
      if (el.customerNameLabel) {
        el.customerNameLabel.textContent = getPartyEntityLabel(pt.name);
      }

      // Repopulate customer dropdown matching this Party Type
      populateCustomerDropdown(pt);

      const ptLower = (pt.name || '').toLowerCase();
      const ptCodeLower = (pt.code || '').toLowerCase();
      if (ptLower.includes('wholesale') || ptLower.includes('distributor') || ptCodeLower.includes('whl') || ptCodeLower.includes('dist')) {
        saleState.rateMode = 'wholesale';
      } else {
        saleState.rateMode = 'retail';
      }
      if (saleState.selectedProduct) {
        applyRateChoice(saleState.rateMode);
      }

      if (el.customerPhone) el.customerPhone.value = '';
      if (el.customerArea) el.customerArea.value = '';
      if (el.customerPrevBalance) {
        el.customerPrevBalance.value = 'Rs 0.00';
        el.customerPrevBalance.dataset.rawBalance = 0;
      }
    }
    updateVoucherTotals();
  }

  async function selectCustomerEntity(partyId) {
    if (!partyId) {
      // Walk-in / Cash Customer fallback
      saleState.selectedCustomer = null;
      if (el.customerPhone) el.customerPhone.value = '';
      if (el.customerArea) el.customerArea.value = '';
      if (el.customerPrevBalance) {
        el.customerPrevBalance.value = 'Rs 0.00';
        el.customerPrevBalance.dataset.rawBalance = 0;
      }
      updateVoucherTotals();
      return;
    }

    const party = (sharedAllParties || []).find(p => String(p.id) === String(partyId));
    if (!party) return;

    saleState.selectedCustomer = party;
    const pName = party.name || party.partyTitle || '';
    if (el.customerName) el.customerName.value = pName;
    if (el.customerPhone) el.customerPhone.value = party.phone || party.altPhone || '';
    if (el.customerArea) el.customerArea.value = party.areaName || party.city || party.provinceName || party.address || '';

    // Fetch up-to-date ledger closing balance
    let balance = Number(party.openingBalance || 0);
    try {
      if (window.accountsAPI?.getPartyLedger) {
        const ledger = await window.accountsAPI.getPartyLedger(party.id);
        if (ledger && typeof ledger.closingBalance === 'number') {
          balance = ledger.closingBalance;
        }
      }
    } catch (e) {
      console.warn('Could not fetch ledger closing balance, using openingBalance:', e);
    }

    if (el.customerPrevBalance) {
      el.customerPrevBalance.value = window.formatPKR ? window.formatPKR(balance) : `Rs ${balance.toFixed(2)}`;
      el.customerPrevBalance.dataset.rawBalance = balance;
      if (balance > 0) {
        el.customerPrevBalance.className = 'form-control form-control-sm font-num sale-customer-prev-balance text-danger font-bold';
      } else if (balance < 0) {
        el.customerPrevBalance.className = 'form-control form-control-sm font-num sale-customer-prev-balance text-success font-bold';
      } else {
        el.customerPrevBalance.className = 'form-control form-control-sm font-num sale-customer-prev-balance text-secondary';
      }
    }

    updateVoucherTotals();
  }

  function selectReturnPartyType(partyTypeId) {
    if (!partyTypeId) {
      returnState.selectedPartyType = null;
      returnState.selectedCustomer = null;
      if (retEl.customerPhone) retEl.customerPhone.textContent = '-';
      if (retEl.customerArea) retEl.customerArea.textContent = '-';
      if (retEl.customerPrevBalance) retEl.customerPrevBalance.textContent = 'Rs 0.00';
      updateReturnTotals();
      return;
    }

    const pt = sharedPartyTypes.find(t => t.id === partyTypeId || t.name === partyTypeId);
    if (pt) {
      returnState.selectedPartyType = pt;
      returnState.selectedCustomer = {
        id: pt.id,
        partyTypeId: pt.id,
        partyTypeName: pt.name,
        partyTitle: pt.name,
        title: pt.name,
        name: pt.name,
        code: pt.code || ''
      };
      if (retEl.customerPhone) retEl.customerPhone.textContent = pt.code || pt.name;
      if (retEl.customerArea) retEl.customerArea.textContent = pt.description || pt.name;
    }
    updateReturnTotals();
  }

  function populateProductDropdown() {
    if (!el.productSelect) return;
    const currentVal = el.productSelect.value;
    el.productSelect.innerHTML = '<option value="">-- Select Product Title --</option>';
    const prods = window.appData?.products || [];
    prods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.code} - ${p.titleEng} (Stock: ${p.stockQty || 0} ${p.unitName || ''})`;
      el.productSelect.appendChild(opt);
    });
    if (currentVal) el.productSelect.value = currentVal;
  }

  // ========================================================
  // PRODUCT SELECTION & LIVE RATES COMPARISON (CORE FEATURE)
  // ========================================================
  function selectProduct(p) {
    if (!p) return;
    // Always resolve against fresh window.appData.products for live stock and rates
    const fresh = (window.appData?.products || []).find(pr => String(pr.id) === String(p.id) || String(pr.code) === String(p.code)) || p;
    saleState.selectedProduct = fresh;

    if (el.itemCode) el.itemCode.value = fresh.code || '';
    if (el.productSelect) el.productSelect.value = fresh.id || '';
    if (el.packSize) el.packSize.value = Number(fresh.packSize) || 1;
    if (el.availableStock) {
      el.availableStock.textContent = `${fresh.stockQty || 0} ${fresh.unitName || ''}`;
      el.availableStock.className = (Number(fresh.stockQty) > 0) ? 'badge-price-pill bg-green-pill font-num' : 'badge-price-pill bg-danger-pill font-num';
    }

    // Populate the three distinct rates
    const cost = Number(fresh.purchasePrice || fresh.averageCost || 0);
    const wholesale = Number(fresh.wholesalePrice || 0);
    const retail = Number(fresh.retailPrice || 0);

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

    // Dynamic rate choice according to selected Party Type
    const ptLower = (saleState.selectedPartyType?.name || '').toLowerCase();
    const ptCodeLower = (saleState.selectedPartyType?.code || '').toLowerCase();
    const isWholesaleParty = ptLower.includes('wholesale') || ptLower.includes('distributor') || ptCodeLower.includes('whl') || ptCodeLower.includes('dist');
    const autoMode = isWholesaleParty ? 'wholesale' : (saleState.rateMode || 'retail');
    applyRateChoice(autoMode);

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
      const wp = Number(p.wholesalePrice || 0);
      const rateToUse = wp > 0 ? wp : Number(p.retailPrice || 0);
      if (el.salePrice) el.salePrice.value = rateToUse.toFixed(2);
      if (el.wholesalePill) el.wholesalePill.classList.add('active-choice');
      if (el.retailPill) el.retailPill.classList.remove('active-choice');
    } else if (mode === 'retail') {
      const rp = Number(p.retailPrice || 0);
      const rateToUse = rp > 0 ? rp : Number(p.wholesalePrice || 0);
      if (el.salePrice) el.salePrice.value = rateToUse.toFixed(2);
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

    // Stock availability verification
    const currentStock = Number(p.stockQty || 0);
    if (currentStock <= 0) {
      const allowOut = confirm(`Stock Alert: "${p.titleEng}" has 0 stock available (Current: ${currentStock}).\nDo you want to proceed with negative stock sale?`);
      if (!allowOut) return;
    } else if (totalQty > currentStock) {
      const allowExcess = confirm(`Stock Alert: Requested quantity (${totalQty}) exceeds available inventory (${currentStock}).\nDo you want to proceed anyway?`);
      if (!allowExcess) return;
    }

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
    if (!el.partyTypeSelect?.value) {
      if (window.showToast) window.showToast('Please select a Party Type for this sale voucher', 'warning');
      el.partyTypeSelect?.focus();
      return;
    }

    if (saleState.items.length === 0) {
      if (window.showToast) window.showToast('Please add at least one product to the voucher', 'warning');
      return;
    }

    const selectedPtObj = saleState.selectedPartyType || sharedPartyTypes.find(t => String(t.id) === String(el.partyTypeSelect?.value)) || {};
    const ptTitle = selectedPtObj.name || el.partyTypeSelect?.options[el.partyTypeSelect?.selectedIndex]?.text || 'General Party';

    const isSpecificCustomer = Boolean(saleState.selectedCustomer);
    const chosenPartyId = isSpecificCustomer ? saleState.selectedCustomer.id : (selectedPtObj.id || 'walk-in');
    const enteredCustomerName = el.customerName?.value?.trim();
    const chosenPartyTitle = enteredCustomerName || (isSpecificCustomer
      ? (saleState.selectedCustomer.name || saleState.selectedCustomer.partyTitle)
      : `Walk-in (${ptTitle})`);
    const chosenCustomerPhone = el.customerPhone?.value?.trim() || (isSpecificCustomer ? (saleState.selectedCustomer.phone || '') : '') || '';
    const chosenCustomerArea = el.customerArea?.value?.trim() || (isSpecificCustomer ? (saleState.selectedCustomer.areaName || saleState.selectedCustomer.city || '') : '') || '';

    const gross = saleState.items.reduce((s, it) => s + Number(it.netAmount || 0), 0);
    const specialDisc = Number(el.specialDiscount?.value) || 0;
    const net = Math.max(0, gross - specialDisc);
    const paid = Number(el.paidAmount?.value) || 0;
    const balanceDue = Math.max(0, net - paid);
    const prevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);

    const saleRecord = {
      id: saleState.saleId || undefined,
      voucherNo: el.voucherNo?.value || saleState.voucherNo,
      manualNo: el.manualNo?.value?.trim() || '',
      entryDate: el.entryDate?.value || new Date().toISOString().split('T')[0],
      partyId: chosenPartyId,
      partyTitle: chosenPartyTitle,
      partyTypeId: selectedPtObj.id || el.partyTypeSelect.value,
      partyTypeName: ptTitle,
      customerPhone: chosenCustomerPhone,
      areaName: chosenCustomerArea,
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

      await resetVoucher();
    } catch (err) {
      console.error('Failed to save sale voucher:', err);
      if (window.showToast) window.showToast(`Save failed: ${err.message}`, 'error');
    }
  }

  async function resetVoucher() {
    saleState.saleId = null;
    saleState.items = [];
    saleState.selectedProduct = null;
    saleState.selectedPartyType = null;
    saleState.selectedCustomer = null;

    if (el.entryDate) el.entryDate.value = new Date().toISOString().split('T')[0];
    if (el.manualNo) el.manualNo.value = '';
    if (el.partyTypeSelect) el.partyTypeSelect.value = '';
    if (el.customerSelect) el.customerSelect.value = '';
    if (el.customerName) el.customerName.value = '';
    if (el.partySelectLabel) el.partySelectLabel.textContent = 'Party / Account';
    if (el.customerNameLabel) el.customerNameLabel.textContent = 'Customer Name';
    populateCustomerDropdown(null);
    if (el.customerPhone) el.customerPhone.value = '';
    if (el.customerArea) el.customerArea.value = '';
    if (el.customerPrevBalance) {
      el.customerPrevBalance.value = 'Rs 0.00';
      el.customerPrevBalance.dataset.rawBalance = 0;
      el.customerPrevBalance.className = 'form-control form-control-sm font-num sale-customer-prev-balance text-secondary';
    }
    if (el.description) el.description.value = '';
    if (el.specialDiscount) el.specialDiscount.value = 0;
    if (el.paidAmount) el.paidAmount.value = 0;

    clearEntryFields();
    renderItemsTable();
    updateVoucherTotals();
    await loadNextVoucherNo();
  }

  // ========================================================
  // RECEIPT BILL PRINT PREVIEW (CLEAN BLACK & WHITE SALE INVOICE)
  // ========================================================
  function openReceiptModal(saleObj) {
    if (!el.modalReceipt || !el.receiptArea) return;
    const currentTypedName = el.customerName?.value?.trim();
    const s = saleObj || {
      voucherNo: el.voucherNo?.value || '',
      entryDate: el.entryDate?.value || '',
      partyTitle: currentTypedName || (saleState.selectedCustomer
        ? (saleState.selectedCustomer.name || saleState.selectedCustomer.partyTitle)
        : (saleState.selectedPartyType?.name || el.partyTypeSelect?.options[el.partyTypeSelect?.selectedIndex]?.text || 'Walk-in Cash Customer')),
      partyTypeName: saleState.selectedPartyType?.name || '',
      paymentType: el.paymentType?.value || 'Cash',
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
    let totalPiecesCount = 0;
    (s.items || []).forEach((it, idx) => {
      const lineQty = Number(it.totalQty || 0);
      totalPiecesCount += lineQty;
      const rate = Number(it.salePrice || 0);
      const disc = Number(it.discountPercent || 0);
      const net = Number(it.netAmount || 0);

      itemsRows += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>
            <strong>${window.escapeHtml(it.productTitle)}</strong>
            ${it.productCode ? `<div style="font-size: 10px;">Code: ${window.escapeHtml(it.productCode)}${it.packSize > 1 ? ` (Pack ${it.packSize})` : ''}</div>` : ''}
          </td>
          <td style="text-align: center;">${lineQty}</td>
          <td style="text-align: right;">${rate.toFixed(2)}</td>
          <td style="text-align: center;">${disc > 0 ? `${disc}%` : '-'}</td>
          <td style="text-align: right; font-weight: bold;">${net.toFixed(2)}</td>
        </tr>
      `;
    });

    const comp = sharedCompanyInfo || {
      name: 'SHAHZAIB TRADERS',
      tagline: 'Wholesale & Retail Trading Solutions',
      address: 'Wah Cantt, Punjab, Pakistan',
      phone: '0300-1234567',
      altPhone: '',
      email: 'shahzaibtraders@gmail.com',
      ntn: '',
      strn: ''
    };

    const finalOutstanding = Number(s.previousBalance || 0) + Number(s.balanceDue || 0);

    el.receiptArea.innerHTML = `
      <div class="thermal-receipt-paper bw-sale-invoice">
        <!-- Header -->
        <div class="bw-header">
          <div class="bw-company-name">${window.escapeHtml(comp.name || 'SHAHZAIB TRADERS')}</div>
          ${comp.tagline ? `<div class="bw-tagline">${window.escapeHtml(comp.tagline)}</div>` : ''}
          <div class="bw-meta-line">${window.escapeHtml(comp.address || 'Wah Cantt, Pakistan')}</div>
          <div class="bw-meta-line">Tel: ${window.escapeHtml(comp.phone || '0300-1234567')}${comp.altPhone ? ` / ${window.escapeHtml(comp.altPhone)}` : ''}</div>
          ${comp.ntn ? `<div class="bw-meta-line">NTN: ${window.escapeHtml(comp.ntn)}${comp.strn ? ` | STRN: ${window.escapeHtml(comp.strn)}` : ''}</div>` : ''}
        </div>

        <div class="bw-divider-dashed"></div>

        <div class="bw-title-banner">
          CASH INVOICE / SALE MEMO
        </div>

        <div class="bw-divider-dashed"></div>

        <!-- Metadata -->
        <div class="bw-meta-section">
          <div class="bw-meta-row">
            <div><strong>Bill #:</strong> ${window.escapeHtml(s.voucherNo)}</div>
            <div><strong>Date:</strong> ${s.entryDate}</div>
          </div>
          <div class="bw-meta-row">
            <div><strong>Time:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Mode:</strong> ${window.escapeHtml(s.paymentType || 'Cash')}</div>
          </div>
          <div class="bw-meta-row" style="margin-top: 3px;">
            <div><strong>Customer:</strong> <u>${window.escapeHtml(s.partyTitle || 'Walk-in Customer')}</u></div>
          </div>
          ${(s.customerPhone || s.areaName) ? `
          <div class="bw-meta-row">
            ${s.customerPhone ? `<div><strong>Phone:</strong> ${window.escapeHtml(s.customerPhone)}</div>` : ''}
            ${s.areaName ? `<div><strong>City/Area:</strong> ${window.escapeHtml(s.areaName)}</div>` : ''}
          </div>` : ''}
        </div>

        <div class="bw-divider-solid"></div>

        <!-- Items Table -->
        <table class="bw-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="text-align: left;">Item Description</th>
              <th style="width: 45px; text-align: center;">Qty</th>
              <th style="width: 65px; text-align: right;">Rate</th>
              <th style="width: 45px; text-align: center;">Disc</th>
              <th style="width: 75px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="bw-divider-solid"></div>

        <!-- Totals Breakdown -->
        <div class="bw-totals">
          <div class="bw-total-row">
            <span>Items: <strong>${(s.items || []).length}</strong> (Pcs: <strong>${totalPiecesCount}</strong>)</span>
            <span>Gross Total: <strong>Rs ${Number(s.grossAmount || 0).toFixed(2)}</strong></span>
          </div>
          ${Number(s.discount) > 0 ? `
            <div class="bw-total-row">
              <span>Special Discount:</span>
              <span>- Rs ${Number(s.discount).toFixed(2)}</span>
            </div>` : ''}
          <div class="bw-total-row bw-net-row">
            <span>NET AMOUNT PAYABLE:</span>
            <span>Rs ${Number(s.netAmount || 0).toFixed(2)}</span>
          </div>
          <div class="bw-total-row">
            <span>Amount Received:</span>
            <span>Rs ${Number(s.paidAmount || 0).toFixed(2)}</span>
          </div>
          <div class="bw-total-row">
            <span>Current Balance Due:</span>
            <span>Rs ${Number(s.balanceDue || 0).toFixed(2)}</span>
          </div>
          ${Number(s.paidAmount) > Number(s.netAmount) ? `
            <div class="bw-total-row">
              <span>Change Return:</span>
              <span>Rs ${(Number(s.paidAmount) - Number(s.netAmount)).toFixed(2)}</span>
            </div>` : ''}
          ${Number(s.previousBalance) !== 0 ? `
            <div class="bw-total-row bw-prev-row">
              <span>Previous Ledger Balance:</span>
              <span>Rs ${Number(s.previousBalance).toFixed(2)}</span>
            </div>
            <div class="bw-total-row bw-closing-row">
              <span>TOTAL OUTSTANDING BALANCE:</span>
              <span>Rs ${finalOutstanding.toFixed(2)}</span>
            </div>` : ''}
        </div>

        <div class="bw-divider-dashed"></div>

        <!-- Policy -->
        <div class="bw-policy">
          <div>* Computerized receipt generated by Shahzaib Traders.</div>
          <div>* Please check goods and count before leaving counter.</div>
          <div>* Goods once sold can be exchanged within 7 days with bill.</div>
        </div>

        <!-- Signatures -->
        <div class="bw-signatures">
          <div>
            <div class="bw-signatures-line"></div>
            Prepared By
          </div>
          <div>
            <div class="bw-signatures-line"></div>
            Customer Sign
          </div>
          <div>
            <div class="bw-signatures-line"></div>
            Authorized Sign
          </div>
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

    // Party Type Select
    if (el.partyTypeSelect) {
      el.partyTypeSelect.addEventListener('change', (e) => {
        selectSalePartyType(e.target.value);
      });
    }

    // Customer / Party Entity Select
    if (el.customerSelect) {
      el.customerSelect.addEventListener('change', (e) => {
        selectCustomerEntity(e.target.value);
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
          if (currentSaleSubTab === 'return') {
            selectReturnProduct(product);
          } else {
            selectProduct(product);
          }
        }
      });
    }
  }

  // ========================================================
  // SUB-TAB NAVIGATION (SALE VOUCHER vs SALE RETURN)
  // ========================================================
  let currentSaleSubTab = 'voucher';
  const navTabs = {};

  function initSubTabs() {
    navTabs.btnVoucher = document.getElementById('saleSubTabBtnVoucher');
    navTabs.btnReturn = document.getElementById('saleSubTabBtnReturn');
    navTabs.panelVoucher = document.getElementById('subviewSaleVoucher');
    navTabs.panelReturn = document.getElementById('subviewSaleReturn');

    if (navTabs.btnVoucher) {
      navTabs.btnVoucher.addEventListener('click', () => switchSaleSubTab('voucher'));
    }
    if (navTabs.btnReturn) {
      navTabs.btnReturn.addEventListener('click', () => switchSaleSubTab('return'));
    }
  }

  function switchSaleSubTab(tab) {
    currentSaleSubTab = tab;
    if (navTabs.btnVoucher) navTabs.btnVoucher.classList.toggle('active', tab === 'voucher');
    if (navTabs.btnReturn) navTabs.btnReturn.classList.toggle('active', tab === 'return');

    if (navTabs.panelVoucher) {
      if (tab === 'voucher') {
        navTabs.panelVoucher.classList.remove('hidden');
        navTabs.panelVoucher.classList.add('active');
        populateCustomers();
        populateProductDropdown();
        if (!saleState.voucherNo) loadNextVoucherNo();
      } else {
        navTabs.panelVoucher.classList.add('hidden');
        navTabs.panelVoucher.classList.remove('active');
      }
    }

    if (navTabs.panelReturn) {
      if (tab === 'return') {
        navTabs.panelReturn.classList.remove('hidden');
        navTabs.panelReturn.classList.add('active');
        onActivateReturn();
      } else {
        navTabs.panelReturn.classList.add('hidden');
        navTabs.panelReturn.classList.remove('active');
      }
    }
  }

  // ========================================================
  // SALE RETURN MODULE (RETURN VOUCHER & STOCK RESTORATION)
  // ========================================================
  let returnState = {
    returnId: null,
    returnNo: '',
    items: [],
    selectedProduct: null,
    selectedCustomer: null,
    returnsList: []
  };

  const retEl = {};

  function initReturnElements() {
    retEl.btnNew = document.getElementById('btnReturnNew');
    retEl.btnSave = document.getElementById('btnReturnSave');
    retEl.btnPrint = document.getElementById('btnReturnPrint');
    retEl.btnHistory = document.getElementById('btnReturnHistory');

    retEl.entryDate = document.getElementById('returnEntryDate');
    retEl.voucherNo = document.getElementById('returnVoucherNo');
    retEl.originalBillRef = document.getElementById('returnOriginalBillRef');
    retEl.partyTypeSelect = document.getElementById('returnPartyTypeSelect');
    retEl.customerSelect = document.getElementById('returnCustomerSelect');
    retEl.refundMode = document.getElementById('returnRefundMode');

    retEl.customerPhone = document.getElementById('returnCustomerPhone');
    retEl.customerArea = document.getElementById('returnCustomerArea');
    retEl.customerPrevBalance = document.getElementById('returnCustomerPrevBalance');
    retEl.returnReason = document.getElementById('returnReason');
    retEl.description = document.getElementById('returnDescription');

    retEl.itemCode = document.getElementById('returnItemCode');
    retEl.btnFindProduct = document.getElementById('btnReturnFindProduct');
    retEl.productSelect = document.getElementById('returnProductSelect');
    retEl.packSize = document.getElementById('returnPackSize');
    retEl.packQty = document.getElementById('returnPackQty');
    retEl.unitQty = document.getElementById('returnUnitQty');
    retEl.totalQty = document.getElementById('returnTotalQty');
    retEl.availableStock = document.getElementById('returnAvailableStock');
    retEl.itemCondition = document.getElementById('returnItemCondition');

    retEl.costPill = document.getElementById('returnCostPill');
    retEl.wholesalePill = document.getElementById('returnWholesalePill');
    retEl.retailPill = document.getElementById('returnRetailPill');
    retEl.rateInput = document.getElementById('returnRateInput');
    retEl.lineAmount = document.getElementById('returnLineAmount');
    retEl.btnAddItem = document.getElementById('btnReturnAddItem');

    retEl.itemsTableBody = document.getElementById('returnItemsTableBody');
    retEl.emptyTableState = document.getElementById('returnItemsEmptyState');

    retEl.totalItemsCount = document.getElementById('returnTotalItemsCount');
    retEl.totalPiecesCount = document.getElementById('returnTotalPiecesCount');
    retEl.grossRefund = document.getElementById('returnGrossRefund');
    retEl.summaryPrevBal = document.getElementById('returnSummaryPrevBal');
    retEl.summaryDeduction = document.getElementById('returnSummaryDeduction');
    retEl.summaryNewBal = document.getElementById('returnSummaryNewBal');

    retEl.modalReceipt = document.getElementById('modalReturnReceipt');
    retEl.receiptArea = document.getElementById('thermalReturnReceiptPrintArea');
    retEl.btnCloseReceipt = document.getElementById('btnCloseReturnReceipt');
    retEl.btnDoPrintReceipt = document.getElementById('btnDoPrintReturnReceipt');

    retEl.modalHistory = document.getElementById('modalReturnHistory');
    retEl.historyTableBody = document.getElementById('returnHistoryTableBody');
    retEl.btnCloseHistory = document.getElementById('btnCloseReturnHistory');
    retEl.historySearchInput = document.getElementById('returnHistorySearchInput');
  }

  async function loadNextReturnNo() {
    try {
      if (window.salesReturnAPI?.getNextReturnNo) {
        const no = await window.salesReturnAPI.getNextReturnNo();
        if (no && retEl.voucherNo) {
          retEl.voucherNo.value = no;
          returnState.returnNo = no;
        }
      }
    } catch (err) {
      console.warn('Failed to load next return no:', err);
    }
  }

  async function populateReturnCustomers() {
    if (!retEl.customerSelect) return;
    try {
      let parties = [];
      if (window.generalInfoAPI?.getParties) {
        parties = await window.generalInfoAPI.getParties();
      }
      const customers = (parties || []).filter(p => !p.partyType || p.partyType.toLowerCase().includes('customer'));

      retEl.customerSelect.innerHTML = '<option value="">-- Select Customer --</option>';
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.partyTitle} (${c.areaName || 'General'})`;
        opt.dataset.party = JSON.stringify(c);
        retEl.customerSelect.appendChild(opt);
      });
    } catch (e) {
      console.error('Failed to populate return customers:', e);
    }
  }

  function selectReturnCustomer(partyId) {
    if (!partyId) {
      returnState.selectedCustomer = null;
      if (retEl.customerPhone) retEl.customerPhone.textContent = '-';
      if (retEl.customerArea) retEl.customerArea.textContent = '-';
      if (retEl.customerPrevBalance) retEl.customerPrevBalance.textContent = 'Rs 0.00';
      updateReturnTotals();
      return;
    }

    const opt = retEl.customerSelect?.querySelector(`option[value="${partyId}"]`);
    if (opt && opt.dataset.party) {
      try {
        const c = JSON.parse(opt.dataset.party);
        returnState.selectedCustomer = c;

        // Auto-select corresponding Party Type if set
        if (retEl.partyTypeSelect && c.partyTypeId) {
          retEl.partyTypeSelect.value = c.partyTypeId;
        }

        if (retEl.customerPhone) retEl.customerPhone.textContent = c.phone || '-';
        if (retEl.customerArea) retEl.customerArea.textContent = c.areaName || c.city || '-';
        const bal = Number(c.openingBalance || c.currentBalance || 0);
        if (retEl.customerPrevBalance) retEl.customerPrevBalance.textContent = `Rs ${bal.toFixed(2)}`;
        updateReturnTotals();
      } catch (err) {
        console.error('Error parsing party data:', err);
      }
    }
  }

  function populateReturnProducts() {
    if (!retEl.productSelect) return;
    const prods = window.appData?.products || [];
    retEl.productSelect.innerHTML = '<option value="">-- Choose Product --</option>';
    prods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id || p.code;
      opt.textContent = `${p.code} - ${p.titleEng} (Stock: ${p.stockQty || 0})`;
      opt.dataset.product = JSON.stringify(p);
      retEl.productSelect.appendChild(opt);
    });
  }

  function selectReturnProduct(product) {
    if (!product) return;
    returnState.selectedProduct = product;

    if (retEl.itemCode) retEl.itemCode.value = product.code || '';
    if (retEl.productSelect) {
      retEl.productSelect.value = product.id || product.code;
    }
    if (retEl.packSize) retEl.packSize.value = product.packSize || 1;
    if (retEl.packQty) retEl.packQty.value = 0;
    if (retEl.unitQty) retEl.unitQty.value = 1;

    // Rate reference pills
    if (retEl.costPill) retEl.costPill.textContent = `Cost: Rs ${Number(product.purchasePrice || 0).toFixed(2)}`;
    if (retEl.wholesalePill) retEl.wholesalePill.textContent = `Wholesale: Rs ${Number(product.wholesalePrice || 0).toFixed(2)}`;
    if (retEl.retailPill) retEl.retailPill.textContent = `Retail: Rs ${Number(product.retailPrice || 0).toFixed(2)}`;

    // Default return rate to retail or wholesale
    const defaultRate = Number(product.retailPrice || product.wholesalePrice || 0);
    if (retEl.rateInput) retEl.rateInput.value = defaultRate.toFixed(2);

    // Current in-stock
    if (retEl.availableStock) {
      retEl.availableStock.textContent = `${product.stockQty || 0} pcs`;
    }

    updateReturnLineCalculations();
    setTimeout(() => retEl.unitQty?.focus(), 50);
  }

  function updateReturnLineCalculations() {
    const packSize = Number(retEl.packSize?.value) || 1;
    const pQty = Number(retEl.packQty?.value) || 0;
    const uQty = Number(retEl.unitQty?.value) || 0;
    const totalQty = (pQty * packSize) + uQty;

    if (retEl.totalQty) retEl.totalQty.value = totalQty;

    const rate = Number(retEl.rateInput?.value) || 0;
    const lineAmt = totalQty * rate;

    if (retEl.lineAmount) retEl.lineAmount.value = lineAmt.toFixed(2);
  }

  function addCurrentReturnItem() {
    const p = returnState.selectedProduct;
    if (!p) {
      if (window.showToast) window.showToast('Please select a product first', 'warning');
      return;
    }

    const packSize = Number(retEl.packSize?.value) || 1;
    const packQty = Number(retEl.packQty?.value) || 0;
    const unitQty = Number(retEl.unitQty?.value) || 0;
    const totalQty = (packQty * packSize) + unitQty;

    if (totalQty <= 0) {
      if (window.showToast) window.showToast('Return quantity must be greater than 0', 'warning');
      return;
    }

    const returnRate = Number(retEl.rateInput?.value) || 0;
    const lineAmt = totalQty * returnRate;
    const condition = retEl.itemCondition?.value || 'Good';

    // Check if item already exists in return list
    const existingIdx = returnState.items.findIndex(it => it.productCode === p.code);
    if (existingIdx !== -1) {
      returnState.items[existingIdx].packQty += packQty;
      returnState.items[existingIdx].unitQty += unitQty;
      returnState.items[existingIdx].totalQty += totalQty;
      returnState.items[existingIdx].returnRate = returnRate;
      returnState.items[existingIdx].netAmount += lineAmt;
      returnState.items[existingIdx].condition = condition;
    } else {
      returnState.items.push({
        productId: p.id || '',
        productCode: p.code,
        productTitle: p.titleEng,
        condition,
        packSize,
        packQty,
        unitQty,
        totalQty,
        returnRate,
        netAmount: lineAmt
      });
    }

    renderReturnItemsTable();
    updateReturnTotals();

    // Reset item entry fields
    returnState.selectedProduct = null;
    if (retEl.itemCode) retEl.itemCode.value = '';
    if (retEl.productSelect) retEl.productSelect.value = '';
    if (retEl.packQty) retEl.packQty.value = 0;
    if (retEl.unitQty) retEl.unitQty.value = 0;
    if (retEl.totalQty) retEl.totalQty.value = 0;
    if (retEl.rateInput) retEl.rateInput.value = '0.00';
    if (retEl.lineAmount) retEl.lineAmount.value = '0.00';
    if (retEl.availableStock) retEl.availableStock.textContent = '0 pcs';

    setTimeout(() => retEl.itemCode?.focus(), 50);
  }

  function removeReturnItem(idx) {
    if (idx >= 0 && idx < returnState.items.length) {
      returnState.items.splice(idx, 1);
      renderReturnItemsTable();
      updateReturnTotals();
    }
  }

  function renderReturnItemsTable() {
    if (!retEl.itemsTableBody) return;
    retEl.itemsTableBody.innerHTML = '';

    if (returnState.items.length === 0) {
      if (retEl.emptyTableState) retEl.emptyTableState.style.display = 'flex';
      return;
    }

    if (retEl.emptyTableState) retEl.emptyTableState.style.display = 'none';

    returnState.items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      const condBadge = item.condition === 'Good'
        ? '<span class="badge-condition-good">Good</span>'
        : '<span class="badge-condition-damaged">Damaged</span>';

      tr.innerHTML = `
        <td class="text-center font-num">${idx + 1}</td>
        <td class="font-num font-bold">${window.escapeHtml(item.productCode)}</td>
        <td class="font-bold">${window.escapeHtml(item.productTitle)}</td>
        <td class="text-center">${condBadge}</td>
        <td class="font-num text-center">${item.packSize}</td>
        <td class="font-num text-center">${item.packQty}</td>
        <td class="font-num text-center">${item.unitQty}</td>
        <td class="font-num text-center font-bold text-danger">${item.totalQty}</td>
        <td class="font-num text-right">${Number(item.returnRate).toFixed(2)}</td>
        <td class="font-num text-right font-bold text-danger">${Number(item.netAmount).toFixed(2)}</td>
        <td class="text-center">
          <button type="button" class="btn-icon text-danger" title="Remove Item" onclick="window.SalesModule.removeReturnItem(${idx})">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      `;
      retEl.itemsTableBody.appendChild(tr);
    });
  }

  function updateReturnTotals() {
    const totalItems = returnState.items.length;
    let totalPieces = 0;
    let grossRefund = 0;

    returnState.items.forEach(it => {
      totalPieces += Number(it.totalQty || 0);
      grossRefund += Number(it.netAmount || 0);
    });

    if (retEl.totalItemsCount) retEl.totalItemsCount.textContent = totalItems;
    if (retEl.totalPiecesCount) retEl.totalPiecesCount.textContent = totalPieces;
    if (retEl.grossRefund) retEl.grossRefund.textContent = `Rs ${grossRefund.toFixed(2)}`;

    const prevBal = returnState.selectedCustomer ? Number(returnState.selectedCustomer.currentBalance || returnState.selectedCustomer.openingBalance || 0) : 0;
    if (retEl.summaryPrevBal) retEl.summaryPrevBal.textContent = `Rs ${prevBal.toFixed(2)}`;
    if (retEl.summaryDeduction) retEl.summaryDeduction.textContent = `- Rs ${grossRefund.toFixed(2)}`;

    const isCredit = (retEl.refundMode?.value === 'Credit');
    const newBal = isCredit ? (prevBal - grossRefund) : prevBal;
    if (retEl.summaryNewBal) retEl.summaryNewBal.textContent = `Rs ${newBal.toFixed(2)}`;
  }

  async function saveSaleReturn() {
    if (!retEl.partyTypeSelect?.value) {
      alert('Please select a Party Type before saving the return voucher.');
      retEl.partyTypeSelect?.focus();
      return;
    }

    if (returnState.items.length === 0) {
      alert('Please add at least one returned item to save.');
      return;
    }

    let totalPieces = 0;
    let grossRefund = 0;
    returnState.items.forEach(it => {
      totalPieces += Number(it.totalQty || 0);
      grossRefund += Number(it.netAmount || 0);
    });

    const selectedPtObj = returnState.selectedPartyType || sharedPartyTypes.find(t => t.id === retEl.partyTypeSelect?.value) || {};
    const ptTitle = selectedPtObj.name || retEl.partyTypeSelect?.options[retEl.partyTypeSelect?.selectedIndex]?.text || 'General Party';

    const returnData = {
      id: returnState.returnId || undefined,
      returnNo: retEl.voucherNo?.value || '',
      saleVoucherRef: retEl.originalBillRef?.value.trim() || '',
      entryDate: retEl.entryDate?.value || new Date().toISOString().slice(0, 10),
      partyId: String(selectedPtObj.id || retEl.partyTypeSelect?.value || ''),
      partyTitle: ptTitle,
      partyTypeId: selectedPtObj.id || retEl.partyTypeSelect?.value || '',
      partyTypeName: ptTitle,
      customerPhone: retEl.customerPhone?.textContent !== '-' ? retEl.customerPhone?.textContent : (selectedPtObj.code || ''),
      areaName: retEl.customerArea?.textContent !== '-' ? retEl.customerArea?.textContent : (selectedPtObj.description || ''),
      description: retEl.description?.value.trim() || '',
      refundMode: retEl.refundMode?.value || 'Credit',
      totalItems: returnState.items.length,
      totalPieces,
      totalAmount: grossRefund,
      paidRefund: retEl.refundMode?.value === 'Cash' ? grossRefund : 0
    };

    try {
      if (retEl.btnSave) retEl.btnSave.disabled = true;
      if (window.salesReturnAPI?.saveReturn) {
        const res = await window.salesReturnAPI.saveReturn(returnData, returnState.items);
        if (res && res.success) {
          if (window.showToast) window.showToast(`Sale Return ${res.returnNo} saved! Stock added back to inventory.`, 'success');
          if (window.reloadFromDatabase) await window.reloadFromDatabase();
          openReturnReceiptModal({ ...returnData, returnNo: res.returnNo, items: returnState.items });
          resetReturnForm();
        }
      }
    } catch (err) {
      alert('Error saving return: ' + err.message);
    } finally {
      if (retEl.btnSave) retEl.btnSave.disabled = false;
    }
  }

  function resetReturnForm() {
    returnState.returnId = null;
    returnState.items = [];
    returnState.selectedProduct = null;
    returnState.selectedPartyType = null;
    returnState.selectedCustomer = null;

    if (retEl.entryDate) retEl.entryDate.value = new Date().toISOString().slice(0, 10);
    if (retEl.originalBillRef) retEl.originalBillRef.value = '';
    if (retEl.partyTypeSelect) retEl.partyTypeSelect.value = '';
    if (retEl.refundMode) retEl.refundMode.value = 'Credit';
    if (retEl.customerPhone) retEl.customerPhone.textContent = '-';
    if (retEl.customerArea) retEl.customerArea.textContent = '-';
    if (retEl.customerPrevBalance) retEl.customerPrevBalance.textContent = 'Rs 0.00';
    if (retEl.returnReason) retEl.returnReason.value = 'Customer Return';
    if (retEl.description) retEl.description.value = '';

    renderReturnItemsTable();
    updateReturnTotals();
    loadNextReturnNo();
  }

  function openReturnReceiptModal(data) {
    if (!retEl.modalReceipt || !retEl.receiptArea) return;
    const items = data.items || [];
    const dateStr = data.entryDate || new Date().toISOString().slice(0, 10);

    let rowsHtml = '';
    items.forEach((it, i) => {
      rowsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td>${window.escapeHtml(it.productTitle || it.productCode)}</td>
          <td style="text-align: center;">${it.totalQty}</td>
          <td style="text-align: right;">${Number(it.returnRate || 0).toFixed(2)}</td>
          <td style="text-align: right;">${Number(it.netAmount || 0).toFixed(2)}</td>
        </tr>
      `;
    });

    const comp = sharedCompanyInfo || {
      name: 'SHAHZAIB TRADERS',
      address: 'Wah Cantt, Pakistan',
      phone: '0300-1234567'
    };

    retEl.receiptArea.innerHTML = `
      <div class="thermal-receipt-paper" style="border: 1px dashed #dc2626;">
        <div class="receipt-header">
          <h2>${window.escapeHtml(comp.name || 'SHAHZAIB TRADERS')}</h2>
          <p>${window.escapeHtml(comp.address || 'Wah Cantt, Pakistan')}</p>
          <p>Phone: ${window.escapeHtml(comp.phone || '0300-1234567')}</p>
          <div class="receipt-title-badge" style="background: #fee2e2; color: #b91c1c; border-color: #fca5a5;">
            SALE RETURN / CREDIT MEMO
          </div>
        </div>

        <div class="receipt-meta">
          <div><span>Return #:</span><strong>${data.returnNo}</strong></div>
          <div><span>Date:</span><strong>${dateStr}</strong></div>
          <div><span>Customer:</span><strong>${window.escapeHtml(data.partyTitle || 'Customer')}</strong></div>
          <div><span>Orig Bill Ref:</span><strong>${data.saleVoucherRef || '-'}</strong></div>
          <div><span>Refund Mode:</span><strong>${data.refundMode || 'Credit'}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 20px;">#</th>
              <th>Description</th>
              <th style="text-align: center; width: 35px;">Pcs</th>
              <th style="text-align: right; width: 55px;">Rate</th>
              <th style="text-align: right; width: 60px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="receipt-totals">
          <div class="receipt-calc-row">
            <span>Total Items:</span>
            <strong>${items.length} (${data.totalPieces || 0} pcs)</strong>
          </div>
          <div class="receipt-calc-row" style="font-size: 13px; font-weight: bold; color: #b91c1c;">
            <span>Total Refund Rs:</span>
            <span>Rs ${Number(data.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-calc-row">
            <span>Stock Status:</span>
            <span style="color: #059669; font-weight: bold;">Items Restocked (+)</span>
          </div>
        </div>

        <div class="receipt-footer">
          <p>*** Stock added back to inventory ***</p>
          <p>Thank you for your business!</p>
        </div>
      </div>
    `;

    retEl.modalReceipt.classList.remove('hidden');
  }

  async function openReturnHistoryModal() {
    if (!retEl.modalHistory) return;
    try {
      let list = [];
      if (window.salesReturnAPI?.getReturns) {
        list = await window.salesReturnAPI.getReturns();
      }
      returnState.returnsList = list || [];
      renderReturnHistoryList(returnState.returnsList);
      retEl.modalHistory.classList.remove('hidden');
    } catch (err) {
      console.error('Failed to load return history:', err);
    }
  }

  function renderReturnHistoryList(list) {
    if (!retEl.historyTableBody) return;
    retEl.historyTableBody.innerHTML = '';

    if (!list || list.length === 0) {
      retEl.historyTableBody.innerHTML = `
        <tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-secondary);">No sales returns recorded yet.</td></tr>
      `;
      return;
    }

    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-num font-bold text-danger">${r.returnNo}</td>
        <td class="font-num">${r.entryDate || '-'}</td>
        <td class="font-bold">${window.escapeHtml(r.partyTitle || 'Customer')}</td>
        <td class="font-num text-center">${r.saleVoucherRef || '-'}</td>
        <td class="font-num text-center">${r.totalItems || 1}</td>
        <td class="font-num text-right font-bold text-danger">Rs ${Number(r.totalAmount || 0).toFixed(2)}</td>
        <td class="text-center">
          <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="window.SalesModule.reprintReturn('${r.id}')" title="Reprint Memo">🖨️ Memo</button>
          <button type="button" class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 11px; margin-left: 4px;" onclick="window.SalesModule.deleteReturnPrompt('${r.id}')" title="Delete Return">🗑️</button>
        </td>
      `;
      retEl.historyTableBody.appendChild(tr);
    });
  }

  function onActivateReturn() {
    populateReturnCustomers();
    populateReturnProducts();
    if (!returnState.returnNo) loadNextReturnNo();
  }

  function initReturnModule() {
    initReturnElements();
    initSubTabs();

    if (retEl.entryDate) retEl.entryDate.value = new Date().toISOString().slice(0, 10);

    // Buttons
    if (retEl.btnNew) retEl.btnNew.addEventListener('click', resetReturnForm);
    if (retEl.btnSave) retEl.btnSave.addEventListener('click', saveSaleReturn);
    if (retEl.btnHistory) retEl.btnHistory.addEventListener('click', openReturnHistoryModal);
    if (retEl.btnPrint) {
      retEl.btnPrint.addEventListener('click', () => {
        if (returnState.items.length === 0) {
          alert('Add returned items before printing.');
          return;
        }
        let totalPieces = 0;
        let grossRefund = 0;
        returnState.items.forEach(it => {
          totalPieces += Number(it.totalQty || 0);
          grossRefund += Number(it.netAmount || 0);
        });
        openReturnReceiptModal({
          returnNo: retEl.voucherNo?.value || 'SR-0001',
          entryDate: retEl.entryDate?.value || new Date().toISOString().slice(0, 10),
          partyTitle: returnState.selectedCustomer?.partyTitle || 'Customer',
          saleVoucherRef: retEl.originalBillRef?.value || '',
          refundMode: retEl.refundMode?.value || 'Credit',
          totalPieces,
          totalAmount: grossRefund,
          items: returnState.items
        });
      });
    }

    // Party Type Selection
    if (retEl.partyTypeSelect) {
      retEl.partyTypeSelect.addEventListener('change', (e) => {
        selectReturnPartyType(e.target.value);
      });
    }

    // Refund Mode Selection
    if (retEl.refundMode) {
      retEl.refundMode.addEventListener('change', updateReturnTotals);
    }

    // Product Selection dropdown
    if (retEl.productSelect) {
      retEl.productSelect.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        if (opt && opt.dataset.product) {
          try {
            selectReturnProduct(JSON.parse(opt.dataset.product));
          } catch (err) {}
        }
      });
    }

    // Product Code input
    if (retEl.itemCode) {
      retEl.itemCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const code = retEl.itemCode.value.trim().toLowerCase();
          const p = (window.appData?.products || []).find(x => String(x.code).toLowerCase() === code);
          if (p) selectReturnProduct(p);
        }
      });
    }

    // Search button (F1)
    if (retEl.btnFindProduct) {
      retEl.btnFindProduct.addEventListener('click', () => {
        if (window.findProductAPI?.openWindow) {
          window.findProductAPI.openWindow();
        } else if (window.openProductSearchModal) {
          window.openProductSearchModal();
        }
      });
    }

    // Rate pills (Wholesale & Retail)
    if (retEl.wholesalePill) {
      retEl.wholesalePill.addEventListener('click', () => {
        if (returnState.selectedProduct) {
          if (retEl.rateInput) retEl.rateInput.value = Number(returnState.selectedProduct.wholesalePrice || 0).toFixed(2);
          updateReturnLineCalculations();
        }
      });
    }
    if (retEl.retailPill) {
      retEl.retailPill.addEventListener('click', () => {
        if (returnState.selectedProduct) {
          if (retEl.rateInput) retEl.rateInput.value = Number(returnState.selectedProduct.retailPrice || 0).toFixed(2);
          updateReturnLineCalculations();
        }
      });
    }

    // Quantity & Rate inputs
    if (retEl.packQty) retEl.packQty.addEventListener('input', updateReturnLineCalculations);
    if (retEl.unitQty) retEl.unitQty.addEventListener('input', updateReturnLineCalculations);
    if (retEl.rateInput) retEl.rateInput.addEventListener('input', updateReturnLineCalculations);

    // Add Item button & Enter
    if (retEl.btnAddItem) retEl.btnAddItem.addEventListener('click', addCurrentReturnItem);
    if (retEl.rateInput) {
      retEl.rateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCurrentReturnItem();
        }
      });
    }

    // Receipt Modal Close & Print
    if (retEl.btnCloseReceipt) {
      retEl.btnCloseReceipt.addEventListener('click', () => {
        if (retEl.modalReceipt) retEl.modalReceipt.classList.add('hidden');
      });
    }
    if (retEl.btnDoPrintReceipt) {
      retEl.btnDoPrintReceipt.addEventListener('click', () => window.print());
    }

    // History Modal Close & Search
    if (retEl.btnCloseHistory) {
      retEl.btnCloseHistory.addEventListener('click', () => {
        if (retEl.modalHistory) retEl.modalHistory.classList.add('hidden');
      });
    }
    if (retEl.historySearchInput) {
      retEl.historySearchInput.addEventListener('input', () => {
        const q = retEl.historySearchInput.value.trim().toLowerCase();
        const filtered = returnState.returnsList.filter(r =>
          (r.returnNo || '').toLowerCase().includes(q) ||
          (r.partyTitle || '').toLowerCase().includes(q) ||
          (r.saleVoucherRef || '').toLowerCase().includes(q)
        );
        renderReturnHistoryList(filtered);
      });
    }
  }

  // ========================================================
  // PUBLIC EXPORTS
  // ========================================================
  window.SalesModule = {
    init: () => {
      initSalesModule();
      initReturnModule();
    },
    switchSubTab: switchSaleSubTab,
    onActivate: async () => {
      await loadPartyTypes();
      if (currentSaleSubTab === 'return') {
        onActivateReturn();
      } else {
        populateProductDropdown();
        if (!saleState.voucherNo) await loadNextVoucherNo();
      }
    },
    refresh: () => {
      populateProductDropdown();
      loadPartyTypes();
      populateReturnProducts();
      if (saleState.selectedProduct) {
        const fresh = (window.appData?.products || []).find(p => p.id === saleState.selectedProduct.id || p.code === saleState.selectedProduct.code);
        if (fresh) {
          saleState.selectedProduct = fresh;
          if (el.availableStock) {
            el.availableStock.textContent = `${fresh.stockQty || 0} ${fresh.unitName || ''}`;
            el.availableStock.className = (Number(fresh.stockQty) > 0) ? 'badge-price-pill bg-green-pill font-num' : 'badge-price-pill bg-danger-pill font-num';
          }
        }
      }
    },
    selectProduct: (p) => {
      if (currentSaleSubTab === 'return') {
        selectReturnProduct(p);
      } else {
        selectProduct(p);
      }
    },
    selectReturnProduct,
    removeItem: removeSaleItem,
    removeReturnItem,
    reprintSale: (id) => {
      const s = saleState.salesList.find(x => x.id === id);
      if (s) {
        let items = [];
        try { items = JSON.parse(s.itemsJson || '[]'); } catch (e) {}
        openReceiptModal({ ...s, items });
      }
    },
    reprintReturn: (id) => {
      const r = returnState.returnsList.find(x => x.id === id);
      if (r) {
        let items = [];
        try { items = JSON.parse(r.itemsJson || '[]'); } catch (e) {}
        openReturnReceiptModal({ ...r, items });
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
    },
    deleteReturnPrompt: (id) => {
      if (!confirm('Are you sure you want to delete this sale return voucher?\nNote: Returned items stock will be deducted back from inventory!')) return;
      window.salesReturnAPI?.deleteReturn(id).then(async () => {
        if (window.showToast) window.showToast('Sale return deleted and stock deducted', 'success');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
        openReturnHistoryModal();
      }).catch(err => {
        alert('Delete failed: ' + err.message);
      });
    }
  };

  // Auto initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.SalesModule.init();
  });

})();

