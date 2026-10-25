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
    rateMode: 'retail', // 'retail' | 'wholesale'
    pendingAddProduct: null,
    salesList: [],
    slipCurrentPage: 1,
    slipPageSize: 5
  };

  // DOM Elements Cache
  const el = {};

  // F1 Product Catalog Lookup Modal State
  let f1ModalState = {
    selectedIndex: 0,
    filteredProducts: [],
    searchQuery: '',
    selectedCategory: '',
    stockFilter: 'all'
  };

  // ========================================================
  // DUAL PRICING MODE MANAGEMENT (RETAIL vs WHOLESALE)
  // ========================================================
  function setBillPricingMode(mode, convertExisting = false) {
    saleState.rateMode = mode;
    const btnRetail = document.getElementById('btnModeRetail');
    const btnWholesale = document.getElementById('btnModeWholesale');
    const btnEntryRetail = document.getElementById('btnEntryRateRetail');
    const btnEntryWholesale = document.getElementById('btnEntryRateWholesale');
    const lblActive = document.getElementById('posActiveRateModeLabel');
    const posRateSelect = document.getElementById('posRateModeSelect');

    if (btnRetail) btnRetail.classList.toggle('active', mode === 'retail');
    if (btnWholesale) btnWholesale.classList.toggle('active', mode === 'wholesale');
    if (btnEntryRetail) btnEntryRetail.classList.toggle('active', mode === 'retail');
    if (btnEntryWholesale) btnEntryWholesale.classList.toggle('active', mode === 'wholesale');

    if (lblActive) {
      lblActive.textContent = mode === 'wholesale' ? 'Wholesale Rate' : 'Retail Rate';
      lblActive.className = mode === 'wholesale' ? 'text-purple font-bold' : 'text-accent font-bold';
    }
    if (posRateSelect) posRateSelect.value = mode;

    if (convertExisting && saleState.items.length > 0) {
      saleState.items.forEach(it => {
        const prod = (window.appData?.products || []).find(pr => String(pr.id) === String(it.productId) || String(pr.code) === String(it.productCode));
        if (prod) {
          const wp = Number(prod.wholesalePrice || 0);
          const rp = Number(prod.retailPrice || 0);
          const newRate = mode === 'wholesale' ? (wp || rp) : (rp || wp);
          it.rateType = mode;
          it.salePrice = newRate;
          const discAmt = (newRate * it.totalQty) * ((it.discountPercent || 0) / 100);
          it.discountAmount = discAmt;
          it.netAmount = (newRate * it.totalQty) - discAmt;
        }
      });
      renderItemsTable();
      updateVoucherTotals();
      if (window.showToast) window.showToast(`Converted all items in bill to ${mode === 'wholesale' ? 'Wholesale' : 'Retail'} rates.`, 'info');
    }
  }

  // ========================================================
  // RATE SELECTION ON ITEM ADD (RETAILER vs WHOLESALE DIALOG)
  // ========================================================
  function openRateChoiceModal(product, quantity = 1) {
    if (!product) return;
    const fresh = (window.appData?.products || []).find(p => String(p.id) === String(product.id) || String(p.code) === String(product.code)) || product;
    saleState.pendingAddProduct = { product: fresh, quantity };

    const modal = document.getElementById('modalSelectRateOnAdd');
    if (!modal) return;

    const codeEl = document.getElementById('rateChoiceProductCode');
    const titleEl = document.getElementById('rateChoiceProductTitle');
    const urduEl = document.getElementById('rateChoiceProductUrdu');
    const stockEl = document.getElementById('rateChoiceStockBadge');
    const rpEl = document.getElementById('rateChoiceRetailPrice');
    const wpEl = document.getElementById('rateChoiceWholesalePrice');
    const qtyInp = document.getElementById('rateChoiceQtyInput');

    const stock = Number(fresh.stockQty || 0);
    const rp = Number(fresh.retailPrice || 0);
    const wp = Number(fresh.wholesalePrice || 0);

    if (codeEl) codeEl.textContent = fresh.code || '-';
    if (titleEl) titleEl.textContent = fresh.titleEng || 'Product';
    if (urduEl) urduEl.textContent = fresh.titleUrdu || '';
    if (stockEl) {
      stockEl.textContent = stock;
      stockEl.className = `pos-stock-badge ${stock <= 0 ? 'badge-out' : (stock <= 5 ? 'badge-low' : 'badge-in')} font-num font-bold`;
    }
    if (rpEl) rpEl.textContent = `Rs ${rp.toLocaleString()}`;
    if (wpEl) wpEl.textContent = `Rs ${wp.toLocaleString()}`;
    if (qtyInp) {
      qtyInp.value = Math.max(1, Number(quantity) || 1);
      qtyInp.max = stock > 0 ? stock : 999999;
    }

    modal.classList.remove('hidden');

    setTimeout(() => {
      const preferredCard = saleState.rateMode === 'wholesale' 
        ? document.getElementById('cardChoiceWholesale') 
        : document.getElementById('cardChoiceRetail');
      if (preferredCard) preferredCard.focus();
    }, 50);
  }

  function closeRateChoiceModal() {
    const modal = document.getElementById('modalSelectRateOnAdd');
    if (modal) modal.classList.add('hidden');
    saleState.pendingAddProduct = null;
    const barcodeInput = document.getElementById('posBarcodeInput');
    if (barcodeInput) barcodeInput.focus();
  }

  function confirmRateChoice(chosenMode) {
    if (!saleState.pendingAddProduct) {
      closeRateChoiceModal();
      return;
    }
    const { product } = saleState.pendingAddProduct;
    const qtyInp = document.getElementById('rateChoiceQtyInput');
    const qty = Math.max(1, Number(qtyInp?.value) || 1);

    const chkApplyEntire = document.getElementById('chkRateApplyToEntireBill');
    const shouldApplyEntire = chkApplyEntire ? chkApplyEntire.checked : true;

    if (shouldApplyEntire) {
      setBillPricingMode(chosenMode, saleState.items.length > 0);
    }

    // Add item with chosen mode (bypasses modal)
    addProductToCart(product.id, qty, chosenMode, true);
    closeRateChoiceModal();
  }

  // Row-level rate toggling (e.g. user wants wholesale rate on a specific line item)
  function toggleItemRate(idx, targetMode) {
    const it = saleState.items[idx];
    if (!it) return;
    const prod = (window.appData?.products || []).find(pr => String(pr.id) === String(it.productId) || String(pr.code) === String(it.productCode));
    if (!prod) return;

    const mode = targetMode || (it.rateType === 'wholesale' ? 'retail' : 'wholesale');
    it.rateType = mode;
    const wp = Number(prod.wholesalePrice || 0);
    const rp = Number(prod.retailPrice || 0);
    const newRate = mode === 'wholesale' ? (wp || rp) : (rp || wp);

    it.salePrice = newRate;
    const discAmt = (newRate * it.totalQty) * ((it.discountPercent || 0) / 100);
    it.discountAmount = discAmt;
    it.netAmount = (newRate * it.totalQty) - discAmt;

    renderItemsTable();
    updateVoucherTotals();
  }

  function changeItemRate(idx, newRate) {
    const it = saleState.items[idx];
    if (!it) return;
    const rate = Math.max(0, Number(newRate) || 0);
    it.salePrice = rate;
    const discAmt = (rate * it.totalQty) * ((it.discountPercent || 0) / 100);
    it.discountAmount = discAmt;
    it.netAmount = (rate * it.totalQty) - discAmt;

    renderItemsTable();
    updateVoucherTotals();
  }

  function changeItemQty(idx, newQty) {
    const it = saleState.items[idx];
    if (!it) return;
    const prod = (window.appData?.products || []).find(pr => String(pr.id) === String(it.productId) || String(pr.code) === String(it.productCode));
    const stock = prod ? Number(prod.stockQty || 0) : 999999;

    let qty = Number(newQty) || 1;
    if (qty <= 0) {
      removeSaleItem(idx);
      return;
    }
    if (qty > stock) {
      if (window.showToast) window.showToast(`Only ${stock} available in stock for "${it.productTitle}".`, 'warning');
      qty = stock;
    }

    it.totalQty = qty;
    const packSize = it.packSize || 1;
    it.packQty = Math.floor(qty / packSize);
    it.unitQty = qty % packSize;

    const discAmt = (it.salePrice * qty) * ((it.discountPercent || 0) / 100);
    it.discountAmount = discAmt;
    it.netAmount = (it.salePrice * qty) - discAmt;

    renderItemsTable();
    updateVoucherTotals();
  }

  function changeItemDisc(idx, discPct) {
    const it = saleState.items[idx];
    if (!it) return;
    const pct = Math.max(0, Math.min(100, Number(discPct) || 0));
    it.discountPercent = pct;
    const gross = it.salePrice * it.totalQty;
    const discAmt = gross * (pct / 100);
    it.discountAmount = discAmt;
    it.netAmount = gross - discAmt;

    renderItemsTable();
    updateVoucherTotals();
  }

  // ========================================================
  // F1 PRODUCT LOOKUP MODAL (HIGH-SPEED DUAL-PRICE BROWSER)
  // ========================================================
  async function openProductLookupModal() {
    // Always open dedicated Find Product separate screen (never show in-page popup)
    if (window.findProductAPI?.openWindow) {
      const modal = document.getElementById('modalProductLookupF1');
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
      window.findProductAPI.openWindow(currentSaleSubTab === 'return' ? 'sale-return' : 'sale');
      return;
    }

    const modal = document.getElementById('modalProductLookupF1');
    if (!modal) return;
    modal.classList.remove('hidden');

    if ((!window.appData?.products || window.appData.products.length === 0) && window.electronAPI?.getAllData) {
      try {
        window.appData = await window.electronAPI.getAllData();
      } catch (err) {}
    }

    // Populate Category dropdown
    const catSelect = document.getElementById('f1ModalCategoryFilter');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">All Categories</option>';
      (window.appData?.product_categories || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.categoryName || c.name;
        catSelect.appendChild(opt);
      });
    }

    f1ModalState.selectedIndex = 0;
    filterF1ModalProducts();

    const searchInp = document.getElementById('f1ModalSearchInput');
    if (searchInp) {
      setTimeout(() => {
        searchInp.focus();
        searchInp.select();
      }, 50);
    }
  }

  function closeProductLookupModal() {
    const modal = document.getElementById('modalProductLookupF1');
    if (modal) modal.classList.add('hidden');
    const itemCode = document.getElementById(currentSaleSubTab === 'return' ? 'returnItemCode' : 'saleItemCode');
    if (itemCode) itemCode.focus();
  }

  function filterF1ModalProducts() {
    const all = window.appData?.products || [];
    const q = (f1ModalState.searchQuery || '').trim().toLowerCase();
    const cat = f1ModalState.selectedCategory;
    const stockOnly = f1ModalState.stockFilter === 'instock';

    f1ModalState.filteredProducts = all.filter(p => {
      if (stockOnly && Number(p.stockQty || 0) <= 0) return false;
      if (cat && String(p.categoryId) !== String(cat)) return false;
      if (q) {
        const code = String(p.code || '').toLowerCase();
        const barcode = String(p.barcode || '').toLowerCase();
        const titleEng = String(p.titleEng || '').toLowerCase();
        const titleUrdu = String(p.titleUrdu || '').toLowerCase();
        const catName = String(p.categoryName || '').toLowerCase();
        const loc = String(p.location || '').toLowerCase();
        if (!code.includes(q) && !barcode.includes(q) && !titleEng.includes(q) && !titleUrdu.includes(q) && !catName.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });

    if (f1ModalState.selectedIndex >= f1ModalState.filteredProducts.length) {
      f1ModalState.selectedIndex = Math.max(0, f1ModalState.filteredProducts.length - 1);
    }

    renderF1ModalProducts();
  }

  function renderF1ModalProducts() {
    const tbody = document.getElementById('f1ModalTableBody');
    const emptyEl = document.getElementById('f1ModalEmptyState');
    const countBadge = document.getElementById('f1ModalProductCountBadge');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = f1ModalState.filteredProducts || [];
    const totalCount = (window.appData?.products || []).length;
    if (countBadge) {
      countBadge.textContent = `${list.length} of ${totalCount} Products`;
    }

    if (list.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    list.forEach((p, idx) => {
      const stock = Number(p.stockQty || 0);
      const isReturnMode = currentSaleSubTab === 'return';
      const isOut = !isReturnMode && stock <= 0;
      const isLow = stock > 0 && stock <= 5;
      const stockBadge = isOut 
        ? `<span class="pos-stock-pill stock-out">0 (Out)</span>`
        : (isLow ? `<span class="pos-stock-pill stock-low">${stock}</span>` : `<span class="pos-stock-pill stock-in">${stock}</span>`);

      const rp = Number(p.retailPrice || 0);
      const wp = Number(p.wholesalePrice || 0);

      const inBillItem = isReturnMode
        ? (returnState.items || []).find(it => String(it.productId) === String(p.id) || String(it.productCode) === String(p.code))
        : (saleState.items || []).find(it => String(it.productId) === String(p.id) || String(it.productCode) === String(p.code));
      const inBillQty = inBillItem ? Number(inBillItem.totalQty || 0) : 0;

      const isSelected = idx === f1ModalState.selectedIndex;

      const tr = document.createElement('tr');
      tr.className = `f1-m-row ${isSelected ? 'selected-row' : ''}`;
      tr.dataset.index = idx;
      tr.innerHTML = `
        <td class="font-num font-bold" style="text-align: center;">
          <span class="f1-code-badge">${window.escapeHtml(p.code || '')}</span>
        </td>
        <td style="text-align: left; padding-left: 14px;">
          <div class="f1-prod-title">${window.escapeHtml(p.titleEng || 'Untitled')}</div>
          <div class="f1-prod-sub">
            ${p.packSize > 1 ? `<span class="pack-sub">Pack of ${p.packSize}</span>` : ''}
            ${inBillQty > 0 ? `<span class="in-bill-tag">${isReturnMode ? '✓ In Return' : '✓ In Bill'} (${inBillQty})</span>` : ''}
          </div>
        </td>
        <td style="text-align: left; padding-left: 10px;">
          <span class="f1-cat-tag">${window.escapeHtml(p.categoryName || 'General')}</span>
        </td>
        <td style="text-align: center;">
          ${stockBadge}
        </td>
        <td class="font-num" style="text-align: center;">
          <div class="f1-price-cell f1-price-retail">
            <span class="price-val">Rs ${rp.toLocaleString()}</span>
            <span class="price-lbl">Retail</span>
          </div>
        </td>
        <td class="font-num" style="text-align: center;">
          <div class="f1-price-cell f1-price-wholesale">
            <span class="price-val">Rs ${wp.toLocaleString()}</span>
            <span class="price-lbl">Wholesale</span>
          </div>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-f1-add ${isOut ? 'disabled' : ''}" ${isOut ? 'disabled' : ''}
            onclick="event.stopPropagation(); window.SalesModule.selectF1Product(${idx})"
            title="${isReturnMode ? 'Add to Return Voucher' : 'Add to Bill'}">
            + Add
          </button>
        </td>
      `;

      tr.addEventListener('click', () => {
        setF1SelectedIndex(idx);
      });

      tr.addEventListener('dblclick', () => {
        selectF1Product(idx, saleState.rateMode || 'retail');
      });

      tbody.appendChild(tr);
    });

    scrollF1SelectedIntoView();
  }

  function setF1SelectedIndex(idx) {
    if (idx < 0 || idx >= f1ModalState.filteredProducts.length) return;
    f1ModalState.selectedIndex = idx;

    const rows = document.querySelectorAll('#f1ModalTableBody tr');
    rows.forEach((r, i) => {
      r.classList.toggle('selected-row', i === idx);
    });

    scrollF1SelectedIntoView();
  }

  function scrollF1SelectedIntoView() {
    const row = document.querySelector(`#f1ModalTableBody tr[data-index="${f1ModalState.selectedIndex}"]`);
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  function selectF1Product(idx, forcedRateMode = null) {
    const p = f1ModalState.filteredProducts[idx];
    if (!p) return;
    if (currentSaleSubTab === 'return') {
      addReturnProductToCart(p.id, 1);
      selectReturnProduct(p, false);
    } else {
      const mode = forcedRateMode || saleState.rateMode || 'retail';
      addProductToCart(p.id, 1, mode, true);
      selectProduct(p, false);
    }
    renderF1ModalProducts();
  }

  // ========================================================
  // ADD PRODUCT TO BILL / CART
  // ========================================================
  function addProductToCart(productId, quantity = 1, forcedRate = null, bypassModal = false) {
    const p = (window.appData?.products || []).find(pr => String(pr.id) === String(productId) || String(pr.code) === String(productId) || String(pr.barcode) === String(productId));
    if (!p) {
      if (window.showToast) window.showToast('Product not found in inventory', 'warning');
      return;
    }

    const stock = Number(p.stockQty || 0);
    if (stock <= 0) {
      if (window.showToast) window.showToast(`Cannot add: "${p.titleEng}" is Out of Stock (0 available).`, 'error');
      return;
    }

    // Prompt user to select Retailer or Wholesale rate if not bypassed and not explicitly forced
    const chkAsk = document.getElementById('chkRateModalAlwaysAsk');
    const alwaysAsk = chkAsk ? chkAsk.checked : true;
    if (!bypassModal && !forcedRate && alwaysAsk) {
      openRateChoiceModal(p, quantity);
      return;
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);
    const existingIdx = saleState.items.findIndex(it => String(it.productId) === String(p.id) || String(it.productCode) === String(p.code));
    const existingQty = existingIdx !== -1 ? Number(saleState.items[existingIdx].totalQty || 0) : 0;

    let qtyToAdd = requestedQty;
    if (existingQty + requestedQty > stock) {
      const canAdd = Math.max(0, stock - existingQty);
      if (canAdd <= 0) {
        if (window.showToast) window.showToast(`Cannot add: "${p.titleEng}" is already at maximum available stock (${stock}) in bill.`, 'warning');
        return;
      }
      qtyToAdd = canAdd;
      if (window.showToast) window.showToast(`Only ${canAdd} more "${p.titleEng}" added (Stock: ${stock}, In bill: ${existingQty}).`, 'warning');
    }

    const costPrice = Number(p.purchasePrice || p.averageCost || 0);
    const wholesalePrice = Number(p.wholesalePrice || 0);
    const retailPrice = Number(p.retailPrice || 0);

    let rateType = 'retail';
    let rate = 0;
    if (forcedRate === 'wholesale' || forcedRate === 'retail') {
      rateType = forcedRate;
      rate = forcedRate === 'wholesale' ? (wholesalePrice || retailPrice) : (retailPrice || wholesalePrice);
    } else if (typeof forcedRate === 'number' && forcedRate > 0) {
      rate = forcedRate;
      rateType = (rate === wholesalePrice) ? 'wholesale' : 'retail';
    } else {
      rateType = saleState.rateMode || 'retail';
      rate = rateType === 'wholesale' ? (wholesalePrice || retailPrice) : (retailPrice || wholesalePrice);
    }

    if (existingIdx !== -1) {
      saleState.items[existingIdx].totalQty += qtyToAdd;
      const packSize = p.packSize || 1;
      saleState.items[existingIdx].packQty = Math.floor(saleState.items[existingIdx].totalQty / packSize);
      saleState.items[existingIdx].unitQty = saleState.items[existingIdx].totalQty % packSize;
      const lineGross = saleState.items[existingIdx].totalQty * saleState.items[existingIdx].salePrice;
      const discAmt = lineGross * ((saleState.items[existingIdx].discountPercent || 0) / 100);
      saleState.items[existingIdx].discountAmount = discAmt;
      saleState.items[existingIdx].netAmount = lineGross - discAmt;
      const pageSize = saleState.slipPageSize || 5;
      saleState.slipCurrentPage = Math.floor(existingIdx / pageSize) + 1;
    } else {
      const grossLine = qtyToAdd * rate;
      saleState.items.push({
        id: `si-${Date.now()}-${saleState.items.length + 1}`,
        productId: p.id,
        productCode: p.code,
        productTitle: p.titleEng,
        titleUrdu: p.titleUrdu || '',
        packSize: p.packSize || 1,
        packQty: Math.floor(qtyToAdd / (p.packSize || 1)),
        unitQty: qtyToAdd % (p.packSize || 1),
        totalQty: qtyToAdd,
        purchasePrice: costPrice,
        wholesalePrice: wholesalePrice,
        retailPrice: retailPrice,
        salePrice: rate,
        rateType: rateType,
        discountPercent: 0,
        discountAmount: 0,
        netAmount: grossLine
      });
      const pageSize = saleState.slipPageSize || 5;
      saleState.slipCurrentPage = Math.ceil(saleState.items.length / pageSize);
    }

    renderItemsTable();
    updateVoucherTotals();
    updateSlipMeta();

    if (window.showToast) {
      window.showToast(`Added: ${p.titleEng} (${rateType === 'wholesale' ? 'Wholesale' : 'Retail'} Rs ${rate})`, 'success');
    }
  }

  function adjustCartItemQty(idx, delta) {
    if (!saleState.items[idx]) return;
    const it = saleState.items[idx];
    const p = (window.appData?.products || []).find(pr => String(pr.id) === String(it.productId) || String(pr.code) === String(it.productCode));
    const stock = p ? Number(p.stockQty || 0) : 999999;

    const newQty = it.totalQty + delta;
    if (newQty <= 0) {
      removeSaleItem(idx);
      return;
    }

    if (delta > 0 && newQty > stock) {
      if (window.showToast) {
        window.showToast(`Cannot increase: Available stock for "${it.productTitle}" is ${stock}.`, 'warning');
      }
      return;
    }

    it.totalQty = newQty;
    const packSize = it.packSize || 1;
    it.packQty = Math.floor(newQty / packSize);
    it.unitQty = newQty % packSize;
    const discAmt = (it.salePrice * newQty) * ((it.discountPercent || 0) / 100);
    it.netAmount = (it.salePrice * newQty) - discAmt;

    renderItemsTable();
    updateVoucherTotals();
  }

  function updateSlipMeta() {
    const currentTypedName = el.customerName?.value?.trim();
    const chosenCustomer = saleState.selectedCustomer;
    const customerName = currentTypedName || (chosenCustomer ? (chosenCustomer.name || chosenCustomer.partyTitle) : 'Walk-in Cash Customer');
    
    const vNo = el.voucherNo?.value || saleState.voucherNo || '-';
    const vDisplay = document.getElementById('saleVoucherNoDisplay');
    if (vDisplay) vDisplay.textContent = vNo;

    const prevBalBox = document.getElementById('posPrevBalanceBox');
    const rawPrevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);
    if (prevBalBox && el.customerPrevBalance) {
      el.customerPrevBalance.textContent = `Rs ${rawPrevBal.toLocaleString()}`;
      if (rawPrevBal > 0) {
        prevBalBox.style.borderColor = '#ef4444';
        prevBalBox.style.backgroundColor = '#fef2f2';
        el.customerPrevBalance.style.color = '#dc2626';
      } else {
        prevBalBox.style.borderColor = '#cbd5e1';
        prevBalBox.style.backgroundColor = '#f8fafc';
        el.customerPrevBalance.style.color = '#0369a1';
      }
    }
  }

  function updateSlipCompanyHeader() {
    // Keep header data synchronized
  }

  function showPosRightView() {}
  function updateRightPanelVisibility() {}
  function renderPosSlipItems() {}
  function renderCatalogPagination() {}
  function renderPosProductCatalog() {
    const f1Modal = document.getElementById('modalProductLookupF1');
    if (f1Modal && !f1Modal.classList.contains('hidden')) {
      renderF1ModalProducts();
    }
  }

  // ========================================================
  // INITIALIZE POS CONTROLS & LISTENERS
  // ========================================================
  function initPosCatalog() {
    // 1. Dual Pricing Mode Segmented Controls (Header & Entry Bar)
    const btnRetail = document.getElementById('btnModeRetail');
    const btnWholesale = document.getElementById('btnModeWholesale');
    const btnEntryRetail = document.getElementById('btnEntryRateRetail');
    const btnEntryWholesale = document.getElementById('btnEntryRateWholesale');

    const handleRetailSwitch = () => {
      setBillPricingMode('retail', saleState.items.length > 0 && confirm('Convert existing items in bill to Retail Rates as well?'));
    };
    const handleWholesaleSwitch = () => {
      setBillPricingMode('wholesale', saleState.items.length > 0 && confirm('Convert existing items in bill to Wholesale Rates as well?'));
    };

    if (btnRetail) btnRetail.addEventListener('click', handleRetailSwitch);
    if (btnWholesale) btnWholesale.addEventListener('click', handleWholesaleSwitch);
    if (btnEntryRetail) btnEntryRetail.addEventListener('click', handleRetailSwitch);
    if (btnEntryWholesale) btnEntryWholesale.addEventListener('click', handleWholesaleSwitch);

    // Toggle collapsible product entry drawer (matches Inventory #btnToggleAddItem)
    const btnToggleSale = document.getElementById('btnToggleAddItemSale');
    const drawerSale = document.getElementById('saleItemEntryDrawer');
    if (btnToggleSale && drawerSale) {
      btnToggleSale.addEventListener('click', () => {
        const isCollapsed = drawerSale.classList.toggle('collapsed');
        btnToggleSale.classList.toggle('active', !isCollapsed);
      });
    }

    // Rate Choice Modal on Item Add listeners
    const cardRetail = document.getElementById('cardChoiceRetail');
    const cardWholesale = document.getElementById('cardChoiceWholesale');
    const btnCloseRateChoice = document.getElementById('btnCloseRateChoiceModal');
    const btnQtyMinus = document.getElementById('btnRateChoiceQtyMinus');
    const btnQtyPlus = document.getElementById('btnRateChoiceQtyPlus');
    const inpQty = document.getElementById('rateChoiceQtyInput');

    if (cardRetail) cardRetail.addEventListener('click', () => confirmRateChoice('retail'));
    if (cardWholesale) cardWholesale.addEventListener('click', () => confirmRateChoice('wholesale'));
    if (btnCloseRateChoice) btnCloseRateChoice.addEventListener('click', closeRateChoiceModal);

    if (btnQtyMinus && inpQty) {
      btnQtyMinus.addEventListener('click', () => {
        const v = Math.max(1, (Number(inpQty.value) || 1) - 1);
        inpQty.value = v;
      });
    }
    if (btnQtyPlus && inpQty) {
      btnQtyPlus.addEventListener('click', () => {
        const v = (Number(inpQty.value) || 1) + 1;
        inpQty.value = v;
      });
    }

    // 2. F1 Product Catalog Modal Triggers
    const btnF1Main = document.getElementById('btnF1ProductLookup');
    const btnF1Browse = document.getElementById('btnPosOpenCatalogModal');
    const btnCloseF1 = document.getElementById('btnCloseProductLookupF1');
    const btnPopoutF1 = document.getElementById('btnF1PopoutWindow');

    if (btnF1Main) btnF1Main.addEventListener('click', openProductLookupModal);
    if (btnF1Browse) btnF1Browse.addEventListener('click', openProductLookupModal);
    if (btnCloseF1) btnCloseF1.addEventListener('click', closeProductLookupModal);
    if (btnPopoutF1) {
      btnPopoutF1.addEventListener('click', () => {
        if (window.findProductAPI?.openWindow) {
          window.findProductAPI.openWindow();
          closeProductLookupModal();
        }
      });
    }

    // 3. F1 Modal Search & Filter Listeners
    const f1Search = document.getElementById('f1ModalSearchInput');
    const f1Clear = document.getElementById('btnF1ModalClearSearch');
    const f1Cat = document.getElementById('f1ModalCategoryFilter');
    const f1Stock = document.getElementById('f1ModalStockFilter');
    const f1Reset = document.getElementById('btnF1ModalReset');

    if (f1Search) {
      f1Search.addEventListener('input', () => {
        f1ModalState.searchQuery = f1Search.value;
        if (f1Clear) f1Clear.classList.toggle('hidden', !f1Search.value);
        f1ModalState.selectedIndex = 0;
        filterF1ModalProducts();
      });

      f1Search.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (f1ModalState.selectedIndex < f1ModalState.filteredProducts.length - 1) {
            setF1SelectedIndex(f1ModalState.selectedIndex + 1);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (f1ModalState.selectedIndex > 0) {
            setF1SelectedIndex(f1ModalState.selectedIndex - 1);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (f1ModalState.filteredProducts[f1ModalState.selectedIndex]) {
            const mode = e.shiftKey ? 'wholesale' : (saleState.rateMode || 'retail');
            selectF1Product(f1ModalState.selectedIndex, mode);
            // Keep panel open so user can continuously add multiple items without closing
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeProductLookupModal();
        }
      });
    }

    if (f1Clear) {
      f1Clear.addEventListener('click', () => {
        if (f1Search) {
          f1Search.value = '';
          f1ModalState.searchQuery = '';
          f1Clear.classList.add('hidden');
          f1ModalState.selectedIndex = 0;
          filterF1ModalProducts();
          f1Search.focus();
        }
      });
    }

    if (f1Cat) {
      f1Cat.addEventListener('change', () => {
        f1ModalState.selectedCategory = f1Cat.value;
        f1ModalState.selectedIndex = 0;
        filterF1ModalProducts();
      });
    }

    if (f1Stock) {
      f1Stock.addEventListener('change', () => {
        f1ModalState.stockFilter = f1Stock.value;
        f1ModalState.selectedIndex = 0;
        filterF1ModalProducts();
      });
    }

    if (f1Reset) {
      f1Reset.addEventListener('click', () => {
        if (f1Search) f1Search.value = '';
        if (f1Cat) f1Cat.value = '';
        if (f1Stock) f1Stock.value = 'all';
        if (f1Clear) f1Clear.classList.add('hidden');
        f1ModalState.searchQuery = '';
        f1ModalState.selectedCategory = '';
        f1ModalState.stockFilter = 'all';
        f1ModalState.selectedIndex = 0;
        filterF1ModalProducts();
      });
    }

    // 4. Barcode / Fast Code Scanner Input
    const barcodeInput = document.getElementById('posBarcodeInput');
    if (barcodeInput) {
      barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const codeVal = barcodeInput.value.trim().toLowerCase();
          if (!codeVal) return;

          const match = (window.appData?.products || []).find(p => 
            String(p.code || '').toLowerCase() === codeVal ||
            String(p.barcode || '').toLowerCase() === codeVal ||
            String(p.shortCode || '').toLowerCase() === codeVal ||
            String(p.additionalCode || '').toLowerCase() === codeVal
          );

          if (match) {
            const qtyInput = document.getElementById('posFastQty');
            const qty = Math.max(1, Number(qtyInput?.value) || 1);
            addProductToCart(match.id, qty, saleState.rateMode);
            barcodeInput.value = '';
            if (qtyInput) qtyInput.value = 1;
            barcodeInput.focus();
          } else {
            if (window.showToast) window.showToast(`No product found with code or barcode "${barcodeInput.value}"`, 'warning');
          }
        }
      });
    }

    // 5. Live Product Search Dropdown Autocomplete
    const liveSearchInput = document.getElementById('posProductSearch');
    const liveDropdown = document.getElementById('posLiveSearchDropdown');
    const liveClearBtn = document.getElementById('posClearSearch');

    if (liveSearchInput && liveDropdown) {
      liveSearchInput.addEventListener('input', () => {
        const q = liveSearchInput.value.trim().toLowerCase();
        if (liveClearBtn) liveClearBtn.classList.toggle('hidden', q.length === 0);

        if (!q) {
          liveDropdown.classList.add('hidden');
          liveDropdown.innerHTML = '';
          return;
        }

        const prods = (window.appData?.products || []).filter(p => {
          return String(p.code || '').toLowerCase().includes(q) ||
            String(p.titleEng || '').toLowerCase().includes(q) ||
            String(p.titleUrdu || '').toLowerCase().includes(q) ||
            String(p.categoryName || '').toLowerCase().includes(q);
        }).slice(0, 10);

        if (prods.length === 0) {
          liveDropdown.innerHTML = '<div class="pos-dropdown-empty">No matching products found</div>';
          liveDropdown.classList.remove('hidden');
          return;
        }

        let html = '';
        prods.forEach(p => {
          const rp = Number(p.retailPrice || 0);
          const wp = Number(p.wholesalePrice || 0);
          const stock = Number(p.stockQty || 0);
          html += `
            <div class="pos-dropdown-item" data-id="${p.id}">
              <div class="dd-left">
                <span class="dd-code">${window.escapeHtml(p.code)}</span>
                <span class="dd-title font-bold">${window.escapeHtml(p.titleEng)}</span>
                ${p.titleUrdu ? `<span class="dd-urdu font-urdu text-muted">(${window.escapeHtml(p.titleUrdu)})</span>` : ''}
                <span class="dd-stock font-num ${stock <= 0 ? 'text-danger' : 'text-success'}">Stock: ${stock}</span>
              </div>
              <div class="dd-actions" onclick="event.stopPropagation()">
                <button type="button" class="btn-dd-add-rate btn-dd-retail" data-id="${p.id}" data-mode="retail" title="Add as Retailer Price">
                  🏷️ + Retail Rs ${rp.toLocaleString()}
                </button>
                <button type="button" class="btn-dd-add-rate btn-dd-wholesale" data-id="${p.id}" data-mode="wholesale" title="Add as Wholesale Price">
                  📦 + Wholesale Rs ${wp.toLocaleString()}
                </button>
              </div>
            </div>
          `;
        });

        liveDropdown.innerHTML = html;
        liveDropdown.classList.remove('hidden');

        // Direct action button clicks
        liveDropdown.querySelectorAll('.btn-dd-add-rate').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pId = btn.getAttribute('data-id');
            const mode = btn.getAttribute('data-mode');
            const qtyInput = document.getElementById('posFastQty');
            const qty = Math.max(1, Number(qtyInput?.value) || 1);
            addProductToCart(pId, qty, mode, true);
            liveSearchInput.value = '';
            liveDropdown.classList.add('hidden');
            if (qtyInput) qtyInput.value = 1;
            liveSearchInput.focus();
          });
        });

        // Row clicks
        liveDropdown.querySelectorAll('.pos-dropdown-item').forEach(itemEl => {
          itemEl.addEventListener('click', () => {
            const pId = itemEl.getAttribute('data-id');
            const qtyInput = document.getElementById('posFastQty');
            const qty = Math.max(1, Number(qtyInput?.value) || 1);
            addProductToCart(pId, qty);
            liveSearchInput.value = '';
            liveDropdown.classList.add('hidden');
            if (qtyInput) qtyInput.value = 1;
            liveSearchInput.focus();
          });
        });
      });

      if (liveClearBtn) {
        liveClearBtn.addEventListener('click', () => {
          liveSearchInput.value = '';
          liveDropdown.classList.add('hidden');
          liveClearBtn.classList.add('hidden');
          liveSearchInput.focus();
        });
      }

      document.addEventListener('click', (e) => {
        if (!liveSearchInput.contains(e.target) && !liveDropdown.contains(e.target)) {
          liveDropdown.classList.add('hidden');
        }
      });
    }

    // 6. Quick Walk-In Button
    const btnQuickWalkIn = document.getElementById('btnQuickWalkIn');
    if (btnQuickWalkIn) {
      btnQuickWalkIn.addEventListener('click', () => {
        if (el.customerSelect) el.customerSelect.value = '';
        if (el.customerName) el.customerName.value = 'Walk-in Cash Customer';
        if (el.customerPhone) el.customerPhone.value = '';
        if (el.paymentType) el.paymentType.value = 'Cash';
        if (el.customerPrevBalance) {
          el.customerPrevBalance.textContent = 'Rs 0.00';
          el.customerPrevBalance.dataset.rawBalance = 0;
        }
        saleState.selectedCustomer = null;
        updateSlipMeta();
        updateVoucherTotals();
      });
    }

    // 7. Clear Bill Button
    const btnClearCart = document.getElementById('btnPosClearCart');
    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        if (saleState.items.length === 0) return;
        if (confirm('Are you sure you want to clear all items from the current bill?')) {
          saleState.items = [];
          renderItemsTable();
          updateVoucherTotals();
        }
      });
    }

    // 8. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (window.currentTab !== 'sale') return;

      const rateModal = document.getElementById('modalSelectRateOnAdd');
      const isRateModalOpen = rateModal && !rateModal.classList.contains('hidden');

      if (isRateModalOpen) {
        if (e.key === '1' || e.key.toLowerCase() === 'r') {
          e.preventDefault();
          confirmRateChoice('retail');
          return;
        }
        if (e.key === '2' || e.key.toLowerCase() === 'w') {
          e.preventDefault();
          confirmRateChoice('wholesale');
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeRateChoiceModal();
          return;
        }
      }

      // Quick Bill Mode Switchers
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setBillPricingMode('retail', saleState.items.length > 0 && confirm('Convert all items in bill to Retail Rates?'));
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setBillPricingMode('wholesale', saleState.items.length > 0 && confirm('Convert all items in bill to Wholesale Rates?'));
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        openProductLookupModal();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        if (currentSaleSubTab === 'return') {
          resetReturnForm();
        } else {
          resetVoucher();
        }
      }
      if ((e.ctrlKey && e.key.toLowerCase() === 's') || e.key === 'F10') {
        e.preventDefault();
        if (currentSaleSubTab === 'return') {
          saveSaleReturn();
        } else {
          saveSaleVoucher();
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (el.modalReceipt && !el.modalReceipt.classList.contains('hidden')) {
          doPrintSaleBill();
        } else if (currentSaleSubTab === 'return') {
          if (retEl.btnPrint) retEl.btnPrint.click();
        } else {
          openReceiptModal();
        }
      }
      if (e.key === 'Escape') {
        closeProductLookupModal();
        closeRateChoiceModal();
        closeBillStatusModal();
        if (el.modalReceipt) el.modalReceipt.classList.add('hidden');
        if (el.modalHistory) el.modalHistory.classList.add('hidden');
        if (retEl.modalReceipt) retEl.modalReceipt.classList.add('hidden');
        if (retEl.modalHistory) retEl.modalHistory.classList.add('hidden');
      }
    });

    if (el.customerName) el.customerName.addEventListener('input', updateSlipMeta);
    if (el.customerSelect) el.customerSelect.addEventListener('change', updateSlipMeta);
    if (el.paymentType) el.paymentType.addEventListener('change', updateSlipMeta);
    if (el.entryDate) el.entryDate.addEventListener('change', updateSlipMeta);

    renderItemsTable();
    updateSlipMeta();
  }

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
    el.productSearchInput = document.getElementById('saleProductSearchInput');
    el.productDropdownList = document.getElementById('saleProductDropdownList');
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

    // Receipt Modal & Print Studio
    el.modalReceipt = document.getElementById('modalSaleReceipt');
    el.receiptArea = document.getElementById('thermalReceiptPrintArea');
    el.btnCloseReceipt = document.getElementById('btnCloseSaleReceipt');
    el.btnDoPrintReceipt = document.getElementById('btnDoPrintSaleReceipt');
    el.printStudioBadge = document.getElementById('printStudioVoucherBadge');
    el.tplButtons = document.querySelectorAll('.sale-tpl-btn');
    el.thermalWidthBox = document.getElementById('saleThermalWidthBox');
    el.thermalWidthSelect = document.getElementById('saleThermalWidthSelect');
    el.chkIncludePrevBill = document.getElementById('chkSaleIncludePrevBill');
    el.prevBillInputWrap = document.getElementById('salePrevBillInputWrap');
    el.inpPrevBillAmount = document.getElementById('inpSalePrevBillAmount');

    // History Modal
    el.modalHistory = document.getElementById('modalSaleHistory');
    el.historyTableBody = document.getElementById('saleHistoryTableBody');
    el.btnCloseHistory = document.getElementById('btnCloseSaleHistory');
    el.historySearchInput = document.getElementById('saleHistorySearchInput');

    // Modal: Add Sale Voucher (Clean Form Popup)
    el.modalAddSale = document.getElementById('modalAddSale');
    el.btnOpenAddSaleModal = document.getElementById('btnOpenAddSaleModal');
    el.btnCloseAddSaleModal = document.getElementById('btnCloseAddSaleModal');
    el.btnCancelAddSaleModal = document.getElementById('btnCancelAddSaleModal');
    el.modalSaleVoucherNoDisplay = document.getElementById('modalSaleVoucherNoDisplay');
    el.chkSalePrintReceipt = document.getElementById('chkSalePrintReceipt');

    // Sales Master Table & Filter Elements
    el.saleFilterSearch = document.getElementById('saleFilterSearch');
    el.saleFilterDate = document.getElementById('saleFilterDate');
    el.btnSaleFilterToday = document.getElementById('btnSaleFilterToday');
    el.btnSaleFilterAll = document.getElementById('btnSaleFilterAll');
    el.saleFilterMode = document.getElementById('saleFilterMode');
    el.btnSaleResetFilters = document.getElementById('btnSaleResetFilters');
    el.saleResultsCounter = document.getElementById('saleResultsCounter');
    el.salesMasterTableBody = document.getElementById('salesMasterTableBody');
    el.salesEmptyState = document.getElementById('salesEmptyState');

    // Quick Status Switcher Tabs (All, Paid, Estimated)
    el.btnSaleTabFilterAll = document.getElementById('btnSaleTabFilterAll');
    el.btnSaleTabFilterPaid = document.getElementById('btnSaleTabFilterPaid');
    el.btnSaleTabFilterEstimated = document.getElementById('btnSaleTabFilterEstimated');
    el.badgeCountAllSales = document.getElementById('badgeCountAllSales');
    el.badgeCountPaidSales = document.getElementById('badgeCountPaidSales');
    el.badgeCountEstimatedSales = document.getElementById('badgeCountEstimatedSales');

    // Modal History Quick Filters
    el.btnModalHistFilterAll = document.getElementById('btnModalHistFilterAll');
    el.btnModalHistFilterPaid = document.getElementById('btnModalHistFilterPaid');
    el.btnModalHistFilterEstimated = document.getElementById('btnModalHistFilterEstimated');

    // Bill Status Elements (Paid Bill vs Estimated Bill)
    el.saleBillStatus = document.getElementById('saleBillStatus');
    el.modalBillStatusChoice = document.getElementById('modalSaleBillStatusChoice');
    el.btnChoosePaidBill = document.getElementById('btnChoosePaidBill');
    el.btnChooseEstimatedBill = document.getElementById('btnChooseEstimatedBill');
    el.btnCloseSaleBillStatusModal = document.getElementById('btnCloseSaleBillStatusModal');
    el.btnCancelSaleBillStatusModal = document.getElementById('btnCancelSaleBillStatusModal');
    el.saleFilterStatus = document.getElementById('saleFilterStatus');
  }

  // ========================================================
  // INITIALIZATION & CUSTOMER POPULATION
  // ========================================================
  async function initSalesModule() {
    initElements();
    if (!el.view) return;

    if (window.setupSearchableProductDropdown && el.productSearchInput && el.productDropdownList) {
      window.setupSearchableProductDropdown({
        inputEl: el.productSearchInput,
        dropdownEl: el.productDropdownList,
        codeEl: el.itemCode,
        selectEl: el.productSelect,
        onSelect: (prod) => selectProduct(prod),
        nextFocusEl: () => el.packQty
      });
    }

    bindEvents();
    await loadNextVoucherNo();
    await loadPartyTypes();
    populateProductDropdown();
    resetVoucher();
    await loadAndRenderSalesTable();
    initPosCatalog();
  }

  async function loadNextVoucherNo() {
    try {
      if (window.salesAPI?.getNextVoucherNo) {
        saleState.voucherNo = await window.salesAPI.getNextVoucherNo();
      } else {
        saleState.voucherNo = 'SV-' + String(Date.now()).slice(-4);
      }
      if (el.voucherNo) el.voucherNo.value = saleState.voucherNo;
      if (el.modalSaleVoucherNoDisplay) el.modalSaleVoucherNoDisplay.textContent = saleState.voucherNo;
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
      selectEl.innerHTML = '<option value="">Select Party Type</option>';
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
    el.customerSelect.innerHTML = `<option value="">Select Staff / Customer</option>`;

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
      opt.textContent = pDetail ? `${pName} — ${pDetail}` : pName;
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
      if (el.partySelectLabel) el.partySelectLabel.textContent = 'Registered Staff';
      if (el.customerNameLabel) el.customerNameLabel.textContent = 'Customer Name';
      populateCustomerDropdown(null);
      if (el.customerPhone) el.customerPhone.value = '';
      if (el.customerArea) el.customerArea.value = '';
      if (el.customerPrevBalance) {
        if ('value' in el.customerPrevBalance) el.customerPrevBalance.value = 'Rs 0.00';
        el.customerPrevBalance.textContent = 'Rs 0.00';
        el.customerPrevBalance.dataset.rawBalance = 0;
        el.customerPrevBalance.className = 'pos-bal-val font-num text-secondary';
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
        if ('value' in el.customerPrevBalance) el.customerPrevBalance.value = 'Rs 0.00';
        el.customerPrevBalance.textContent = 'Rs 0.00';
        el.customerPrevBalance.dataset.rawBalance = 0;
        el.customerPrevBalance.className = 'pos-bal-val font-num text-secondary';
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
        if ('value' in el.customerPrevBalance) el.customerPrevBalance.value = 'Rs 0.00';
        el.customerPrevBalance.textContent = 'Rs 0.00';
        el.customerPrevBalance.dataset.rawBalance = 0;
        el.customerPrevBalance.className = 'pos-bal-val font-num text-secondary';
      }
      updateSlipMeta();
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
      const formatted = window.formatPKR ? window.formatPKR(balance) : `Rs ${balance.toFixed(2)}`;
      if ('value' in el.customerPrevBalance) el.customerPrevBalance.value = formatted;
      el.customerPrevBalance.textContent = formatted;
      el.customerPrevBalance.dataset.rawBalance = balance;
      if (balance > 0) {
        el.customerPrevBalance.className = 'pos-bal-val font-num text-danger font-bold';
      } else if (balance < 0) {
        el.customerPrevBalance.className = 'pos-bal-val font-num text-success font-bold';
      } else {
        el.customerPrevBalance.className = 'pos-bal-val font-num text-secondary';
      }
    }

    updateSlipMeta();
    updateVoucherTotals();
  }

  function selectReturnPartyType(partyTypeId) {
    if (!partyTypeId) {
      returnState.selectedPartyType = null;
      returnState.selectedCustomer = null;
      if (retEl.customerPhone) retEl.customerPhone.value = '';
      if (retEl.customerArea) retEl.customerArea.value = '';
      if (retEl.customerPrevBalance) {
        if ('value' in retEl.customerPrevBalance) retEl.customerPrevBalance.value = 'Rs 0.00';
        retEl.customerPrevBalance.textContent = 'Rs 0.00';
        retEl.customerPrevBalance.dataset.rawBalance = 0;
      }
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
      if (retEl.customerPhone) retEl.customerPhone.value = pt.code || pt.name;
      if (retEl.customerArea) retEl.customerArea.value = pt.description || pt.name;
    }
    updateReturnTotals();
  }

  function populateProductDropdown() {
    if (!el.productSelect) return;
    const currentVal = el.productSelect.value;
    el.productSelect.innerHTML = '<option value="">Select Product Title</option>';
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
  function selectProduct(p, shouldFocus = true) {
    if (!p) return;
    // Always resolve against fresh window.appData.products for live stock and rates
    const fresh = (window.appData?.products || []).find(pr => String(pr.id) === String(p.id) || String(pr.code) === String(p.code)) || p;
    saleState.selectedProduct = fresh;

    if (el.itemCode) el.itemCode.value = fresh.code || '';
    if (el.productSelect) el.productSelect.value = fresh.id || '';
    if (el.productSearchInput) el.productSearchInput.value = fresh.titleEng || '';
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

    // Focus pack quantity for rapid POS operation (only when manual selection, not from F1 catalog)
    if (shouldFocus && el.packQty) el.packQty.focus();
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
      if (window.showToast) window.showToast(`Cannot add: "${p.titleEng}" is Out of Stock (0 available).`, 'error');
      return;
    }
    const existingIdx = saleState.items.findIndex(it => it.productId === p.id || it.productCode === p.code);
    const existingQty = existingIdx !== -1 ? Number(saleState.items[existingIdx].totalQty || 0) : 0;
    if (existingQty + totalQty > currentStock) {
      const remaining = Math.max(0, currentStock - existingQty);
      if (remaining <= 0) {
        if (window.showToast) window.showToast(`Cannot add: "${p.titleEng}" is already at maximum available stock (${currentStock}) in slip.`, 'warning');
      } else {
        if (window.showToast) window.showToast(`Stock limit: Only ${remaining} more available for "${p.titleEng}" (Stock: ${currentStock}, In Slip: ${existingQty}).`, 'warning');
      }
      return;
    }

    // Warning if selling below purchase cost!
    if (costPrice > 0 && rate < costPrice) {
      const confirmBelowCost = confirm(`Warning: Sale rate (Rs ${rate}) is lower than purchase cost (Rs ${costPrice})!\nDo you still want to add this item?`);
      if (!confirmBelowCost) return;
    }

    // If item already exists in voucher, update it; otherwise push new line item
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
    renderPosProductCatalog();

    // Re-focus Code for rapid next entry
    if (el.itemCode) el.itemCode.focus();
  }

  function clearEntryFields() {
    saleState.selectedProduct = null;
    if (el.itemCode) el.itemCode.value = '';
    if (el.productSelect) el.productSelect.value = '';
    if (el.productSearchInput) el.productSearchInput.value = '';
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
    if (idx >= 0 && idx < saleState.items.length) {
      saleState.items.splice(idx, 1);
      const pageSize = saleState.slipPageSize || 5;
      const totalPages = Math.ceil(saleState.items.length / pageSize) || 1;
      if (saleState.slipCurrentPage > totalPages) {
        saleState.slipCurrentPage = totalPages;
      }
      renderItemsTable();
      updateVoucherTotals();
      renderPosProductCatalog();
    }
  }

  // ========================================================
  // RENDER LINE ITEMS & TOTALS (Fixed-Height Paginated Slip)
  // ========================================================
  function renderItemsTable() {
    updateRightPanelVisibility();
    const countBadge = document.getElementById('posCartCountBadge');
    if (countBadge) countBadge.textContent = saleState.items.length;
    if (el.totalItemsCount) el.totalItemsCount.textContent = saleState.items.length;
    const billBadge = document.getElementById('posBillItemCountBadge');
    if (billBadge) billBadge.textContent = `${saleState.items.length} ${saleState.items.length === 1 ? 'Item' : 'Items'}`;
    const srNoEl = document.getElementById('pieSaleSrNo');
    if (srNoEl) srNoEl.value = saleState.items.length + 1;

    const modeLabel = document.getElementById('posActiveRateModeLabel');
    if (modeLabel) {
      if (saleState.rateMode === 'wholesale') {
        modeLabel.textContent = 'Wholesale Rate';
        modeLabel.style.color = '#7c3aed';
      } else {
        modeLabel.textContent = 'Retail Rate';
        modeLabel.style.color = '#0284c7';
      }
    }

    if (!el.itemsTableBody) {
      el.itemsTableBody = document.getElementById('saleItemsTableBody');
    }
    if (!el.itemsTableBody) return;
    el.itemsTableBody.innerHTML = '';

    const emptyState = document.getElementById('saleItemsEmptyState');
    const paginationBar = document.getElementById('posSlipPaginationBar');
    const btnSell = document.getElementById('btnSaleSave');

    if (saleState.items.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (paginationBar) paginationBar.style.display = 'none';
      if (btnSell) {
        btnSell.disabled = false;
        btnSell.style.opacity = '0.7';
        btnSell.style.cursor = 'pointer';
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (btnSell) {
      btnSell.disabled = false;
      btnSell.style.opacity = '1';
      btnSell.style.cursor = 'pointer';
    }

    const pageSize = saleState.slipPageSize || 5;
    const totalPages = Math.ceil(saleState.items.length / pageSize) || 1;
    if (!saleState.slipCurrentPage || saleState.slipCurrentPage < 1) saleState.slipCurrentPage = 1;
    if (saleState.slipCurrentPage > totalPages) saleState.slipCurrentPage = totalPages;

    const currentPage = saleState.slipCurrentPage;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, saleState.items.length);
    const visibleItems = saleState.items.slice(startIdx, endIdx);

    visibleItems.forEach((item, relIdx) => {
      const idx = startIdx + relIdx;
      const prod = (window.appData?.products || []).find(pr => String(pr.id) === String(item.productId) || String(pr.code) === String(item.productCode));
      const availStock = prod ? Number(prod.stockQty || 0) : 999999;
      const isMaxReached = item.totalQty >= availStock;
      const isWholesale = item.rateType === 'wholesale';
      const rp = Number(item.retailPrice || (prod ? prod.retailPrice : 0) || 0);
      const wp = Number(item.wholesalePrice || (prod ? prod.wholesalePrice : 0) || 0);

      const rateToggleBtn = `
        <div class="pos-row-rate-group" role="group" aria-label="Rate Selection">
          <button type="button" class="btn-rate-seg btn-seg-retail ${!isWholesale ? 'active' : ''}" 
            onclick="window.SalesModule.toggleItemRate(${idx}, 'retail')" title="Retail Price: Rs ${rp.toLocaleString()} (Click to select)">
            🏷️ Retail
          </button>
          <button type="button" class="btn-rate-seg btn-seg-wholesale ${isWholesale ? 'active' : ''}" 
            onclick="window.SalesModule.toggleItemRate(${idx}, 'wholesale')" title="Wholesale Price: Rs ${wp.toLocaleString()} (Click to select)">
            📦 Wholesale
          </button>
        </div>
      `;

      const tr = document.createElement('tr');
      tr.className = 'pos-bill-row';
      tr.innerHTML = `
        <td class="pos-cell-sr text-center font-num text-muted" style="text-align: center; vertical-align: middle;">${idx + 1}</td>
        <td class="pos-cell-code font-num font-bold text-center" style="text-align: center; vertical-align: middle;">${window.escapeHtml(item.productCode || '-')}</td>
        <td class="pos-cell-title" style="text-align: left; padding-left: 14px; vertical-align: middle;" title="${window.escapeHtml(item.productTitle || '')}">
          <div class="pos-bill-title font-bold" style="color: #0f172a; font-size: 13px;">${window.escapeHtml(item.productTitle || '')}</div>
        </td>
        <td class="pos-cell-stock text-center" style="text-align: center; vertical-align: middle;">
          <span class="pos-stock-badge ${availStock <= 0 ? 'badge-out' : (availStock <= 5 ? 'badge-low' : 'badge-in')} font-num font-bold">
            ${availStock}
          </span>
        </td>
        <td class="pos-cell-ratetype text-center" style="text-align: center; vertical-align: middle;">
          ${rateToggleBtn}
        </td>
        <td class="pos-cell-rate text-center" style="text-align: center; vertical-align: middle;">
          <div class="pos-inline-input-wrap rate-input-wrap" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; margin: 0 auto;">
            <span class="cur-sym" style="font-size: 11px; font-weight: 700; color: #64748b;">Rs</span>
            <input type="number" class="pos-inline-inp font-num font-bold text-center" 
              style="width: 78px; height: 28px; padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 13px;"
              value="${Number(item.salePrice || 0)}" min="0" step="1"
              onchange="window.SalesModule.changeItemRate(${idx}, this.value)"
              onfocus="this.select()"
              title="Edit unit sale rate">
          </div>
        </td>
        <td class="pos-cell-qty text-center" style="text-align: center; vertical-align: middle;">
          <div class="pos-row-qty-stepper" style="display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
            <button type="button" class="pos-qty-btn-step" onclick="window.SalesModule.adjustCartItemQty(${idx}, -1)" title="Decrease quantity">−</button>
            <input type="number" class="pos-qty-input-step font-num font-bold text-center" 
              style="width: 44px; height: 26px; border: none; background: transparent; text-align: center;"
              value="${item.totalQty}" min="1" max="${availStock}"
              onchange="window.SalesModule.changeItemQty(${idx}, this.value)"
              onfocus="this.select()"
              title="Quantity">
            <button type="button" class="pos-qty-btn-step ${isMaxReached ? 'disabled' : ''}" ${isMaxReached ? 'disabled' : ''} onclick="window.SalesModule.adjustCartItemQty(${idx}, 1)" title="${isMaxReached ? 'Stock limit reached' : 'Increase quantity'}">+</button>
          </div>
        </td>
        <td class="pos-cell-disc text-center" style="text-align: center; vertical-align: middle;">
          <div class="pos-inline-input-wrap disc-input-wrap" style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; margin: 0 auto;">
            <input type="number" class="pos-inline-inp font-num text-center" 
              style="width: 46px; height: 28px; padding: 2px 4px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 13px;"
              value="${item.discountPercent || 0}" min="0" max="100" step="0.5"
              onchange="window.SalesModule.changeItemDisc(${idx}, this.value)"
              onfocus="this.select()"
              title="Discount percent"><span style="font-size: 11px; font-weight: 700; color: #64748b;">%</span>
          </div>
        </td>
        <td class="pos-cell-total font-num font-bold text-success" style="text-align: right; padding-right: 16px; font-size: 13.5px; white-space: nowrap; vertical-align: middle;">
          Rs ${Number(item.netAmount || 0).toLocaleString()}
        </td>
        <td class="pos-cell-del text-center" style="text-align: center; vertical-align: middle;">
          <button type="button" class="pos-item-del-btn" onclick="window.SalesModule.removeItem(${idx})" title="Remove item from bill" style="display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
            ✕
          </button>
        </td>
      `;
      el.itemsTableBody.appendChild(tr);
    });

    if (paginationBar) {
      if (totalPages > 1) {
        paginationBar.style.display = 'flex';
        const pagInfo = document.getElementById('posSlipPaginationInfo');
        const pagCur = document.getElementById('posSlipPaginationCurrent');
        const btnPrev = document.getElementById('btnPosSlipPrev');
        const btnNext = document.getElementById('btnPosSlipNext');
        if (pagInfo) pagInfo.textContent = `Items ${startIdx + 1}–${endIdx} of ${saleState.items.length}`;
        if (pagCur) pagCur.textContent = `Page ${currentPage} of ${totalPages}`;
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;
      } else {
        paginationBar.style.display = 'none';
      }
    }
  }

  function clearBillCart() {
    if (saleState.items.length === 0) return;
    if (confirm('Are you sure you want to clear all items from the current bill?')) {
      saleState.items = [];
      renderItemsTable();
      updateVoucherTotals();
      if (window.showToast) window.showToast('Bill cleared', 'info');
    }
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

    // Auto-fill Cash Received with Net Total if Cash sale and not manually modified
    const isCash = (el.paymentType?.value || 'Cash') === 'Cash';
    if (isCash && el.paidAmount && el.paidAmount.dataset.userEdited !== 'true') {
      el.paidAmount.value = netTotal > 0 ? netTotal : 0;
    }

    const paid = Number(el.paidAmount?.value) || 0;
    const balanceDue = Math.max(0, netTotal - paid);
    const returnChange = Math.max(0, paid - netTotal);

    const prevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);
    const newCustomerBalance = prevBal + (netTotal - paid);

    if (el.totalItemsCount) el.totalItemsCount.textContent = saleState.items.length;
    if (el.totalPiecesCount) el.totalPiecesCount.textContent = totalPieces;
    const cartCountBadge = document.getElementById('posCartCountBadge');
    if (cartCountBadge) cartCountBadge.textContent = saleState.items.length;
    if (el.totalProfitPreview) el.totalProfitPreview.textContent = window.formatPKR ? window.formatPKR(estProfit) : `Rs ${estProfit.toFixed(2)}`;
    if (el.grossTotal) el.grossTotal.textContent = window.formatPKR ? window.formatPKR(gross) : `Rs ${gross.toFixed(2)}`;
    if (el.netTotal) el.netTotal.textContent = window.formatPKR ? window.formatPKR(netTotal) : `Rs ${netTotal.toFixed(2)}`;
    
    const slipGross = document.getElementById('posSlipGrossDisplay');
    const slipDiscount = document.getElementById('posSlipDiscountDisplay');
    const estNetEl = document.getElementById('posCartEstimatedNet');
    if (slipGross) slipGross.textContent = `Rs ${gross.toLocaleString()}`;
    if (slipDiscount) slipDiscount.textContent = `- Rs ${specialDisc.toLocaleString()}`;
    if (estNetEl) estNetEl.textContent = `Rs ${netTotal.toLocaleString()}`;

    if (el.balanceDue) el.balanceDue.textContent = window.formatPKR ? window.formatPKR(balanceDue) : `Rs ${balanceDue.toFixed(2)}`;
    if (el.returnChange) el.returnChange.textContent = window.formatPKR ? window.formatPKR(returnChange) : `Rs ${returnChange.toFixed(2)}`;
    const changeRow = document.getElementById('posChangeRow');
    const balanceRow = document.getElementById('posBalanceRow');
    if (changeRow && balanceRow) {
      if (paid > netTotal) {
        changeRow.style.display = 'flex';
        balanceRow.style.display = 'none';
      } else if (paid < netTotal) {
        changeRow.style.display = 'none';
        balanceRow.style.display = 'flex';
        if (el.balanceDue) el.balanceDue.style.color = '#dc2626';
      } else {
        changeRow.style.display = 'none';
        balanceRow.style.display = 'flex';
        if (el.balanceDue) {
          el.balanceDue.textContent = 'Rs 0.00';
          el.balanceDue.style.color = '#16a34a';
        }
      }
    }
    updateSlipMeta();

    if (el.finalCustomerBalance) {
      el.finalCustomerBalance.textContent = window.formatPKR ? window.formatPKR(newCustomerBalance) : `Rs ${newCustomerBalance.toFixed(2)}`;
      el.finalCustomerBalance.className = newCustomerBalance > 0 ? 'calc-val text-danger' : 'calc-val text-success';
    }
  }

  // ========================================================
  // SAVE SALE VOUCHER & BILL STATUS SELECTION
  // ========================================================
  function saveSaleVoucher() {
    if (saleState.isSaving) return;

    if (!saleState.items || saleState.items.length === 0) {
      const emptyMsg = 'Please add at least one product to the bill before confirming sale.';
      if (window.showToast) window.showToast(emptyMsg, 'warning');
      alert(emptyMsg);
      return;
    }

    openBillStatusModal();
  }

  function openBillStatusModal() {
    if (!el.modalBillStatusChoice) {
      const status = el.saleBillStatus?.value || 'Paid';
      return executeSaveSale(status);
    }

    const currentStatus = el.saleBillStatus?.value || saleState.billStatus || 'Paid';
    if (el.btnChoosePaidBill) {
      el.btnChoosePaidBill.classList.toggle('active-choice', currentStatus === 'Paid');
    }
    if (el.btnChooseEstimatedBill) {
      el.btnChooseEstimatedBill.classList.toggle('active-choice', currentStatus === 'Estimated');
    }

    el.modalBillStatusChoice.classList.remove('hidden');
    window.addEventListener('keydown', handleBillStatusKeydown, true);
  }

  function closeBillStatusModal() {
    if (el.modalBillStatusChoice) {
      el.modalBillStatusChoice.classList.add('hidden');
    }
    window.removeEventListener('keydown', handleBillStatusKeydown, true);
  }

  function handleBillStatusKeydown(e) {
    if (!el.modalBillStatusChoice || el.modalBillStatusChoice.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeBillStatusModal();
    } else if (e.key === '1' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      closeBillStatusModal();
      executeSaveSale('Paid');
    } else if (e.key === '2' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      e.stopPropagation();
      closeBillStatusModal();
      executeSaveSale('Estimated');
    }
  }

  function updateBillStatusSelectStyle(status) {
    if (!el.saleBillStatus) return;
    if (status === 'Estimated') {
      el.saleBillStatus.style.background = '#fffbeb';
      el.saleBillStatus.style.color = '#b45309';
      el.saleBillStatus.style.borderColor = '#fcd34d';
    } else {
      el.saleBillStatus.style.background = '#f0fdf4';
      el.saleBillStatus.style.color = '#166534';
      el.saleBillStatus.style.borderColor = '#86efac';
    }
  }

  async function executeSaveSale(chosenStatus = 'Paid') {
    closeBillStatusModal();
    if (saleState.isSaving) return;
    const saveBtn = document.getElementById('btnSaleSave') || el.btnSave;

    if (!saleState.items || saleState.items.length === 0) {
      const emptyMsg = 'Please add at least one product to the bill before confirming sale.';
      if (window.showToast) window.showToast(emptyMsg, 'warning');
      alert(emptyMsg);
      return;
    }

    const isEstimated = (chosenStatus === 'Estimated');
    if (el.saleBillStatus) {
      el.saleBillStatus.value = chosenStatus;
      updateBillStatusSelectStyle(chosenStatus);
    }
    saleState.billStatus = chosenStatus;

    saleState.isSaving = true;
    const itemsSnapshot = (saleState.items || []).map(it => ({ ...it }));

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
          <span style="display:inline-block; width:13px; height:13px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span>
          <span>${isEstimated ? 'Saving Estimated Bill...' : 'Saving Sale...'}</span>
        `;
      }

      // Live stock verification check (only for Paid bills, non-blocking for existing edits)
      if (!isEstimated) {
        const freshProducts = window.appData?.products || [];
        if (freshProducts.length > 0 && !saleState.saleId) {
          for (const item of itemsSnapshot) {
            const prod = freshProducts.find(p => String(p.id) === String(item.productId) || String(p.code) === String(item.productCode));
            if (prod) {
              const availStock = Number(prod.stockQty || 0);
              if (Number(item.totalQty || 0) > availStock && availStock >= 0) {
                const msg = `Cannot confirm paid sale: "${item.productTitle}" requested quantity (${item.totalQty}) exceeds available stock (${availStock}).`;
                if (window.showToast) window.showToast(msg, 'error');
                alert(msg);
                return;
              }
            }
          }
        }
      }

      const gross = itemsSnapshot.reduce((s, it) => s + Number(it.netAmount || 0), 0);
      const specialDiscInput = document.getElementById('saleSpecialDiscount') || el.specialDiscount;
      const specialDisc = Number(specialDiscInput?.value) || 0;
      const net = Math.max(0, gross - specialDisc);
      const paidInput = document.getElementById('salePaidAmount') || el.paidAmount;
      const paid = Number(paidInput?.value) || 0;
      const balanceDue = Math.max(0, net - paid);

      const prevBalEl = document.getElementById('saleCustomerPrevBalance') || el.customerPrevBalance;
      const prevBal = Number(prevBalEl?.dataset?.rawBalance || 0);

      const voucherNoInput = document.getElementById('saleVoucherNo') || el.voucherNo;
      const voucherNoVal = voucherNoInput?.value?.trim() || saleState.voucherNo || ('SV-' + String(Date.now()).slice(-4));

      const entryDateInput = document.getElementById('saleEntryDate') || el.entryDate;
      const entryDateVal = entryDateInput?.value || new Date().toISOString().split('T')[0];

      const customerNameInput = document.getElementById('saleCustomerName') || el.customerName;
      const customerPhoneInput = document.getElementById('saleCustomerPhone') || el.customerPhone;
      const customerAreaInput = document.getElementById('saleCustomerArea') || el.customerArea;
      const paymentTypeSelect = document.getElementById('salePaymentType') || el.paymentType;
      const paymentTypeVal = paymentTypeSelect?.value || 'Cash';

      const selectedPtObj = saleState.selectedPartyType || sharedPartyTypes.find(t => String(t.id) === String(el.partyTypeSelect?.value)) || {};
      const ptTitle = selectedPtObj.name || 'General Party';

      const isSpecificCustomer = Boolean(saleState.selectedCustomer);
      const chosenPartyId = isSpecificCustomer ? saleState.selectedCustomer.id : (selectedPtObj.id || 'walk-in');
      const enteredCustomerName = customerNameInput?.value?.trim();
      const chosenPartyTitle = enteredCustomerName || (isSpecificCustomer
        ? (saleState.selectedCustomer.name || saleState.selectedCustomer.partyTitle)
        : `Walk-in (${ptTitle})`);
      const chosenCustomerPhone = customerPhoneInput?.value?.trim() || (isSpecificCustomer ? (saleState.selectedCustomer.phone || '') : '') || '';
      const chosenCustomerArea = customerAreaInput?.value?.trim() || (isSpecificCustomer ? (saleState.selectedCustomer.areaName || saleState.selectedCustomer.city || '') : '') || '';

      const saleRecord = {
        id: saleState.saleId || undefined,
        voucherNo: voucherNoVal,
        manualNo: el.manualNo?.value?.trim() || '',
        entryDate: entryDateVal,
        partyId: String(chosenPartyId),
        partyTitle: chosenPartyTitle,
        partyTypeId: selectedPtObj.id || el.partyTypeSelect?.value || 'general',
        partyTypeName: ptTitle,
        customerPhone: chosenCustomerPhone,
        areaName: chosenCustomerArea,
        description: el.description?.value || '',
        storeTitle: el.storeTitle?.value || 'Main Store',
        paymentType: paymentTypeVal,
        previousBalance: prevBal,
        grossAmount: gross,
        discount: specialDisc,
        netAmount: net,
        paidAmount: paid,
        balanceDue: balanceDue,
        billStatus: chosenStatus
      };

      let res;
      if (window.salesAPI?.saveSale) {
        res = await window.salesAPI.saveSale(saleRecord, itemsSnapshot);
      } else if (window.api?.saveSale) {
        res = await window.api.saveSale(saleRecord, itemsSnapshot);
      } else if (window.electronAPI?.saveSale) {
        res = await window.electronAPI.saveSale(saleRecord, itemsSnapshot);
      } else {
        throw new Error('Sales saving service is not available.');
      }

      if (res && res.error) {
        throw new Error(res.error);
      }

      if (window.showToast) {
        if (isEstimated) {
          window.showToast(`Estimated Bill ${saleRecord.voucherNo} saved! (No inventory deducted)`, 'info');
        } else {
          window.showToast(`Sale Voucher ${saleRecord.voucherNo} confirmed and saved!`, 'success');
        }
      }

      closeAddSaleModal();

      // Reload global store to reflect updated stock quantities
      if (window.reloadFromDatabase) {
        await window.reloadFromDatabase();
      }
      renderPosProductCatalog();

      await loadAndRenderSalesTable();

      // Open print bill confirmation dialog or auto print if checked
      const chkPrint = document.getElementById('chkSalePrintReceipt') || el.chkSalePrintReceipt;
      const shouldPrint = chkPrint ? chkPrint.checked : true;
      if (shouldPrint) {
        await openReceiptModal({
          ...saleRecord,
          voucherNo: res?.voucherNo || saleRecord.voucherNo,
          items: itemsSnapshot,
          billStatus: chosenStatus
        });
      }

      await resetVoucher();
    } catch (err) {
      console.error('Failed to save sale voucher:', err);
      if (window.showToast) window.showToast(`Save failed: ${err.message}`, 'error');
      alert(`Could not confirm sale: ${err.message}`);
    } finally {
      saleState.isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <span style="font-size: 15px;">✓</span>
          <span>Confirm Sale</span>
        `;
      }
    }
  }

  async function resetVoucher() {
    saleState.saleId = null;
    saleState.items = [];
    saleState.selectedProduct = null;
    saleState.selectedPartyType = null;
    saleState.selectedCustomer = null;
    saleState.slipCurrentPage = 1;
    saleState.billStatus = 'Paid';
    if (el.saleBillStatus) {
      el.saleBillStatus.value = 'Paid';
      updateBillStatusSelectStyle('Paid');
    }

    if (el.entryDate) el.entryDate.value = new Date().toISOString().split('T')[0];
    if (el.manualNo) el.manualNo.value = '';
    if (el.partyTypeSelect) el.partyTypeSelect.value = '';
    if (el.customerSelect) el.customerSelect.value = '';
    if (el.customerName) el.customerName.value = '';
    if (el.partySelectLabel) el.partySelectLabel.textContent = 'Registered Staff';
    if (el.customerNameLabel) el.customerNameLabel.textContent = 'Customer Name';
    populateCustomerDropdown(null);
    if (el.customerPhone) el.customerPhone.value = '';
    if (el.customerArea) el.customerArea.value = '';
    if (el.customerPrevBalance) {
      if ('value' in el.customerPrevBalance) el.customerPrevBalance.value = 'Rs 0.00';
      el.customerPrevBalance.textContent = 'Rs 0.00';
      el.customerPrevBalance.dataset.rawBalance = 0;
      el.customerPrevBalance.className = 'font-num font-bold text-accent';
    }
    if (el.description) el.description.value = '';
    if (el.specialDiscount) el.specialDiscount.value = 0;
    if (el.paidAmount) {
      el.paidAmount.value = 0;
      delete el.paidAmount.dataset.userEdited;
    }

    clearEntryFields();
    if (typeof showPosRightView === 'function') showPosRightView('cart');
    renderItemsTable();
    updateVoucherTotals();
    await loadNextVoucherNo();
    updateSlipMeta();
    switchSaleSubTab('voucher');
  }

  // ========================================================
  // SALE BILL PRINT STUDIO & MULTI-TEMPLATE ENGINE
  // ========================================================
  const salePrintStudioState = {
    s: null,
    items: [],
    cfg: null,
    template: 'thermal',
    paperWidth: '80mm',
    includePrevBill: false,
    prevBillAmount: 0
  };

  function setSalePrintTemplate(tpl) {
    if (!tpl) return;
    salePrintStudioState.template = tpl;
    try {
      localStorage.setItem('sale_bill_template', tpl);
    } catch (_) {}

    if (el.tplButtons) {
      el.tplButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tpl === tpl);
      });
    }

    if (el.thermalWidthBox) {
      el.thermalWidthBox.style.display = (tpl === 'thermal') ? 'inline-flex' : 'none';
    }

    renderSalePrintStudioPreview();
  }

  let isPrintingLocked = false;

  function printIsolatedHtml(htmlContent, options = {}) {
    const { template = 'thermal', paperWidth = '80mm' } = options;
    const isA4 = (template === 'a4');
    const is58 = (paperWidth === '58mm' || template === '58mm');
    const paperW = isA4 ? '210mm' : (is58 ? '58mm' : '80mm');

    let iframe = document.getElementById('salesIsolatedPrintFrame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'salesIsolatedPrintFrame';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = isA4 ? '210mm' : paperW;
      iframe.style.height = isA4 ? '297mm' : '100%';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);
    } else {
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = isA4 ? '210mm' : paperW;
      iframe.style.height = isA4 ? '297mm' : '100%';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-99999';
    }

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();

    let pageRule = '';
    let containerStyles = '';

    if (isA4) {
      pageRule = `@page { size: A4 portrait; margin: 0; }`;
      containerStyles = `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          background: #ffffff !important;
          color: #0f172a !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .invoice-container.invoice-a4 {
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          min-height: 297mm !important;
          padding: 10mm 14mm 8mm 14mm !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          overflow: hidden !important;
        }
      `;
    } else {
      // Clean continuous thermal paper roll: NEVER enforce fixed page height or fake offsets
      pageRule = `@page { size: auto; margin: 0mm; }`;
      containerStyles = `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #ffffff !important;
          color: #000000 !important;
          visibility: visible !important;
          opacity: 1 !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * {
          visibility: visible !important;
          opacity: 1 !important;
        }
        .sale-doc-thermal, .thermal-slip-paper {
          width: ${is58 ? '48mm' : '72mm'} !important;
          max-width: ${is58 ? '48mm' : '72mm'} !important;
          min-width: ${is58 ? '48mm' : '72mm'} !important;
          margin: 0 auto !important;
          padding: 2mm 1mm 4mm 1mm !important;
          box-shadow: none !important;
          box-sizing: border-box !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          visibility: visible !important;
          opacity: 1 !important;
          overflow: visible !important;
          font-size: ${is58 ? '9px' : '10.5px'} !important;
        }
        .sale-doc-thermal * {
          visibility: visible !important;
          opacity: 1 !important;
        }
      `;
    }

    const baseTag = document.baseURI ? `<base href="${document.baseURI}">` : '';

    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${baseTag}
  <title>Shahzaib Traders Invoice</title>
  <link rel="stylesheet" href="shared/styles.css">
  <link rel="stylesheet" href="sales/sales.css">
  <style>
    ${pageRule}
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      html, body {
        visibility: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
        opacity: 1 !important;
      }
      body, body * {
        visibility: visible !important;
        opacity: 1 !important;
      }
    }
    @media screen {
      html, body, body * {
        visibility: visible !important;
      }
    }
    ${containerStyles}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`);
    iframeDoc.close();

    let hasTriggered = false;
    const triggerPrint = () => {
      if (hasTriggered) return;
      hasTriggered = true;

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error('Isolated print failed, falling back to window.print():', err);
          window.print();
        }
      }, 120);
    };

    // If there are images, wait for them to load once before printing
    const imgs = iframeDoc.querySelectorAll('img');
    if (imgs.length > 0) {
      let loaded = 0;
      const onDone = () => {
        loaded++;
        if (loaded >= imgs.length) {
          triggerPrint();
        }
      };
      imgs.forEach(img => {
        if (img.complete) {
          loaded++;
        } else {
          img.addEventListener('load', onDone, { once: true });
          img.addEventListener('error', onDone, { once: true });
        }
      });
      if (loaded >= imgs.length) {
        triggerPrint();
      } else {
        setTimeout(triggerPrint, 350);
      }
    } else {
      setTimeout(triggerPrint, 120);
    }
  }

  function doPrintSaleBill() {
    if (isPrintingLocked) return;
    isPrintingLocked = true;
    setTimeout(() => { isPrintingLocked = false; }, 1800);

    let printStyle = document.getElementById('saleDynamicPrintStyle');
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = 'saleDynamicPrintStyle';
      document.head.appendChild(printStyle);
    }

    const tpl = salePrintStudioState.template;
    const width = salePrintStudioState.paperWidth || '80mm';

    if (tpl === 'a4') {
      printStyle.innerHTML = `@page { size: A4 portrait; margin: 0; }`;
    } else {
      printStyle.innerHTML = `@page { size: auto; margin: 0; }`;
    }

    let contentHtml = el.receiptArea ? el.receiptArea.innerHTML : '';
    if (!contentHtml || !contentHtml.trim()) {
      const data = getSalePrintStudioValues();
      if (tpl === 'a4') contentHtml = renderA4SaleBill(data);
      else contentHtml = renderThermalSaleBill(data);
    }

    document.body.classList.add('printing-sale-bill');

    printIsolatedHtml(contentHtml, { template: tpl, paperWidth: width });

    const cleanup = () => {
      document.body.classList.remove('printing-sale-bill');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500);
  }

  function getSalePrintStudioValues() {
    const s = salePrintStudioState.s || {};
    const items = salePrintStudioState.items || [];
    const cfg = salePrintStudioState.cfg || {};

    let formattedDate = '';
    try {
      const d = s.entryDate ? new Date(s.entryDate) : new Date();
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        formattedDate = s.entryDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch (_) {
      formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const voucherNo = s.voucherNo || ('ST-SV-' + Math.floor(1000 + Math.random() * 9000));
    const customerTitle = s.partyTitle || 'Walk-in Cash Customer';
    const saleMode = (s.paymentType && s.paymentType.toLowerCase().includes('credit')) ? 'Credit' : 'Cash';
    const isEstimatedBill = (s.billStatus === 'Estimated');

    const calculatedGross = items.reduce((sum, it) => {
      const qty = Number(it.totalQty ?? it.quantity ?? it.qty ?? 1);
      const rate = Number(it.salePrice ?? it.rate ?? it.unitPrice ?? it.retailPrice ?? it.wholesalePrice ?? 0);
      return sum + Number(it.netAmount ?? (qty * rate) ?? 0);
    }, 0);

    const grossVal = Number(s.grossAmount || calculatedGross || 0);
    const discVal = Number(s.discount ?? 0);
    const netVal = Number(s.netAmount || (grossVal - discVal) || calculatedGross || 0);
    const prevBillVal = salePrintStudioState.includePrevBill ? Number(salePrintStudioState.prevBillAmount || 0) : 0;
    const grandPayableVal = netVal + prevBillVal;
    const paidVal = Number(s.paidAmount ?? 0);
    const balanceVal = Math.max(0, grandPayableVal - paidVal);

    return {
      s,
      items,
      cfg,
      formattedDate,
      formattedTime,
      voucherNo,
      customerTitle,
      customerPhone: s.customerPhone || '',
      areaName: s.areaName || '',
      saleMode,
      isEstimatedBill,
      grossVal,
      discVal,
      netVal,
      prevBillVal,
      grandPayableVal,
      paidVal,
      balanceVal,
      includePrevBill: salePrintStudioState.includePrevBill,
      paperWidth: salePrintStudioState.paperWidth || '80mm'
    };
  }

  function cleanInvoiceEmoji(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}\u{200D}]/gu, '')
      .replace(/[📍📞📄⚠️📋💳🛒✓✔✕✖•★☆●■]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function renderCorporateSaleBill(data) {
    const {
      cfg, formattedDate, formattedTime, voucherNo, customerTitle, customerPhone,
      areaName, saleMode, isEstimatedBill, items, grossVal, discVal, netVal,
      prevBillVal, grandPayableVal, paidVal, balanceVal, includePrevBill, s
    } = data;

    const currentSaleObj = s || {};
    const companyTitle = cleanInvoiceEmoji(cfg.title || 'Shahzaib Traders');
    const subtitle = cleanInvoiceEmoji(cfg.subtitle || 'Dealers in Electrical Goods & Accessories');
    const address = cleanInvoiceEmoji(cfg.address || 'Main Bazar, Electrical Market, Lahore');
    const phone = cleanInvoiceEmoji(cfg.phone || '0300-1234567');
    const taxNumber = cleanInvoiceEmoji(cfg.taxNumber || cfg.ntn || '');
    const email = cleanInvoiceEmoji(cfg.contactEmail || cfg.email || 'info@shahzaibtraders.com');
    const checksNote = cleanInvoiceEmoji(cfg.checksPayableNote || ('Make all checks payable to ' + companyTitle));
    const enquiriesNote = cleanInvoiceEmoji(cfg.enquiriesNote || ('Should you have any enquiries concerning this invoice, please contact ' + phone));
    const cleanCustomer = cleanInvoiceEmoji(customerTitle || currentSaleObj.partyTitle || 'Walk-in Cash Customer');
    const cleanCustPhone = cleanInvoiceEmoji(customerPhone || currentSaleObj.customerPhone || '');
    const cleanCustArea = cleanInvoiceEmoji(areaName || currentSaleObj.areaName || '');
    const cleanVoucher = cleanInvoiceEmoji(voucherNo || currentSaleObj.voucherNo || 'ST-SV-0042');
    const bigTitleText = isEstimatedBill ? 'Estimate' : (cleanInvoiceEmoji(cfg.invoiceHeading) || 'Invoice');
    const terms = cleanInvoiceEmoji(cfg.invoiceTerms || cfg.footer || '1. Please inspect all goods upon receipt.\n2. In case of claim or return, original bill must be presented within 7 days.\n3. Burnt, broken, or short-circuited electrical goods carry no warranty.');
    const prevLabel = cleanInvoiceEmoji(cfg.previousBillLabel || 'Previous Bill / Balance');

    let itemsRows = '';
    const realCount = (items || []).length;
    (items || []).forEach((it, idx) => {
      const name = cleanInvoiceEmoji(it.productTitle || it.title || it.name || it.productCode || 'Item');
      const code = cleanInvoiceEmoji(it.productCode || it.code || String(112233 + idx));
      const totalQty = Number(it.totalQty ?? it.quantity ?? it.qty ?? 1);
      const rate = Number(it.salePrice ?? it.rate ?? it.unitPrice ?? it.retailPrice ?? it.wholesalePrice ?? 0);
      const lineTotal = Number(it.netAmount ?? it.totalAmount ?? (totalQty * rate) ?? 0);
      const rowClass = (idx % 2 === 0) ? 'item-row-odd' : 'item-row-even';

      itemsRows += `
        <tr class="${rowClass}">
          <td class="col-item-no">${window.escapeHtml(code)}</td>
          <td class="col-item-desc">${window.escapeHtml(name)}</td>
          <td class="col-item-qty">${totalQty}</td>
          <td class="col-item-price">${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="col-item-total">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    // Fill down table rows exactly like the template image (12 rows total, centered '-' in Line Total)
    const targetRows = 12;
    const fillerNeeded = Math.max(0, targetRows - realCount);
    for (let f = 0; f < fillerNeeded; f++) {
      const fillerClass = ((realCount + f) % 2 === 0) ? 'item-row-odd' : 'item-row-even';
      itemsRows += `
        <tr class="filler-row ${fillerClass}">
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td style="text-align: center; color: #64748b;">-</td>
        </tr>
      `;
    }

    const customerId = cleanInvoiceEmoji(currentSaleObj.partyCode || currentSaleObj.partyId || (currentSaleObj.partyTitle ? 'CUST-' + String(Math.abs(currentSaleObj.partyTitle.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0))).slice(0,5) : 'CUST-0042'));
    const poNumber = cleanInvoiceEmoji(currentSaleObj.saleVoucherRef || cleanVoucher.replace(/[^0-9]/g, '') || '12345678');
    const paymentDue = isEstimatedBill ? 'Estimate Only' : (saleMode === 'Cash' ? 'Due on Receipt' : formattedDate);

    return `
      <div class="invoice-container invoice-a4">
        <!-- Top Section -->
        <div>
          <div class="a4-header-row">
            <div>
              <h1 class="a4-company-name">${window.escapeHtml(companyTitle)}</h1>
              <div class="a4-company-slogan">${window.escapeHtml(subtitle)}</div>
              <div class="a4-logo-box">
                <img src="assets/full-logo.png" alt="${window.escapeHtml(companyTitle)}" class="a4-logo-img" onerror="this.onerror=null; this.src='assets/circle-logo.png'; this.onerror=()=>{ this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='block'; };">
                <span class="a4-insert-logo-text" style="display: none;">Insert Your Logo</span>
              </div>
            </div>
            <div>
              <div class="a4-invoice-big-title">${window.escapeHtml(bigTitleText)}</div>
              <table class="a4-meta-table">
                <tr>
                  <td class="a4-meta-lbl">Date:</td>
                  <td class="a4-meta-val">${formattedDate}</td>
                </tr>
                <tr>
                  <td class="a4-meta-lbl">Invoice #:</td>
                  <td class="a4-meta-val font-bold">${window.escapeHtml(cleanVoucher)}</td>
                </tr>
                <tr>
                  <td class="a4-meta-lbl">Customer ID:</td>
                  <td class="a4-meta-val">${window.escapeHtml(customerId)}</td>
                </tr>
                <tr>
                  <td class="a4-meta-lbl">Purchase Order #:</td>
                  <td class="a4-meta-val">${window.escapeHtml(poNumber)}</td>
                </tr>
                <tr>
                  <td class="a4-meta-lbl">Payment Due by:</td>
                  <td class="a4-meta-val">${window.escapeHtml(paymentDue)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Bill To / Ship To Row -->
          <div class="a4-parties-row">
            <div class="a4-party-box">
              <div class="navy-bar-header">Bill To:</div>
              <div class="a4-party-content">
                <div class="a4-party-name">${window.escapeHtml(cleanCustomer)}</div>
                <div>${window.escapeHtml(currentSaleObj.companyName || cleanCustomer)}</div>
                <div>${window.escapeHtml(cleanCustArea || 'Main Market')}</div>
                <div>${window.escapeHtml(currentSaleObj.cityName || currentSaleObj.territory || 'Wah Cantt, Punjab')}</div>
                <div>${cleanCustPhone ? ('Phone: ' + window.escapeHtml(cleanCustPhone)) : ''}</div>
              </div>
            </div>
            <div class="a4-party-box">
              <div class="navy-bar-header">Ship To (If Different):</div>
              <div class="a4-party-content">
                <div class="a4-party-name">${window.escapeHtml(cleanCustomer)}</div>
                <div>${window.escapeHtml(cleanCustArea || address)}</div>
                <div>${window.escapeHtml(currentSaleObj.town || currentSaleObj.cityName || 'Counter Dispatch')}</div>
                <div>${cleanCustPhone ? ('Phone: ' + window.escapeHtml(cleanCustPhone)) : ''}</div>
                <div>${saleMode} Sale</div>
              </div>
            </div>
          </div>

          <!-- Metadata Strip -->
          <table class="a4-meta-strip-table">
            <thead>
              <tr>
                <th style="width: 17%;">Salesperson</th>
                <th style="width: 17%;">Shipping Method</th>
                <th style="width: 17%;">Shipping Terms</th>
                <th style="width: 17%;">Payment Terms</th>
                <th style="width: 16%;">Due Date</th>
                <th style="width: 16%;">Delivery Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${window.escapeHtml(currentSaleObj.bookedBy || currentSaleObj.salesman || 'Shahzaib')}</td>
                <td>Direct Counter</td>
                <td>Ex-Store / Godown</td>
                <td>${saleMode}</td>
                <td>${formattedDate}</td>
                <td>${formattedDate}</td>
              </tr>
            </tbody>
          </table>

          <!-- Items Table -->
          <div class="a4-table-wrapper">
            <table class="a4-items-table">
              <thead>
                <tr>
                  <th style="width: 14%;">Item #</th>
                  <th style="width: 48%;">Description</th>
                  <th style="width: 10%; text-align: center;">Qty</th>
                  <th style="width: 14%; text-align: right;">Unit Price</th>
                  <th style="width: 14%; text-align: right;">Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Bottom Split: Notes & Totals -->
          <div class="a4-bottom-split-row">
            <div class="a4-notes-box-wrapper">
              <div class="navy-bar-header">Special Notes and Instructions</div>
              <div class="a4-notes-box-content">
                ${window.escapeHtml(terms)}
                ${includePrevBill ? `<div style="margin-top: 6px; font-weight: 700; color: #003d6b;">* Includes Previous Bill / Balance: Rs ${prevBillVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
              </div>
            </div>
            <div class="a4-totals-wrapper">
              <table class="a4-totals-table">
                <tr>
                  <td class="a4-tot-lbl">Subtotal</td>
                  <td class="a4-tot-curr">Rs</td>
                  <td class="a4-tot-val">${grossVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="a4-tot-lbl">Discount</td>
                  <td class="a4-tot-curr">Rs</td>
                  <td class="a4-tot-val">${discVal > 0 ? ('-' + discVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '-'}</td>
                </tr>
                ${includePrevBill ? `
                <tr>
                  <td class="a4-tot-lbl">${window.escapeHtml(prevLabel)}</td>
                  <td class="a4-tot-curr">Rs</td>
                  <td class="a4-tot-val">+${prevBillVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>` : ''}
                <tr class="total-highlight-row">
                  <td class="a4-tot-lbl">Total</td>
                  <td class="a4-tot-curr">Rs</td>
                  <td class="a4-tot-val">${grandPayableVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${paidVal > 0 ? `
                <tr>
                  <td class="a4-tot-lbl">Amount Paid</td>
                  <td class="a4-tot-curr">Rs</td>
                  <td class="a4-tot-val">${paidVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>` : ''}
                <tr class="balance-highlight-row">
                  <td class="a4-tot-lbl">Balance Due</td>
                  <td class="a4-tot-curr">Rs</td>
                  <td class="a4-tot-val">${balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <!-- Pinned Bottom Footer -->
        <footer class="a4-footer">
          <div class="a4-checks-payable">${window.escapeHtml(checksNote)}</div>
          <div class="a4-thank-you">Thank you for your business!</div>
          <div class="a4-enquiries">${window.escapeHtml(enquiriesNote)}</div>
          <div class="a4-footer-divider"></div>
          <div class="a4-footer-address">${window.escapeHtml(address)}</div>
          <div class="a4-footer-contacts">Tel: ${window.escapeHtml(phone)}${taxNumber ? ' • NTN: ' + window.escapeHtml(taxNumber) : ''}${email ? ' • Email: ' + window.escapeHtml(email) : ''}</div>
        </footer>
      </div>
    `;
  }

  function renderA4SaleBill(data) {
    return renderCorporateSaleBill(data, 'a4');
  }

  function renderA5SaleBill(data) {
    return renderCorporateSaleBill(data, 'a4');
  }

  function formatThermalDate(dStr) {
    try {
      const d = dStr ? new Date(dStr) : new Date();
      if (isNaN(d.getTime())) return dStr || '';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      return `${day} ${mon} ${yr}`;
    } catch (_) {
      return dStr || '';
    }
  }

  function formatThermalPrintDateTime() {
    try {
      const d = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(d.getDate()).padStart(2, '0');
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day}-${mon}-${yr} ${time}`;
    } catch (_) {
      return new Date().toLocaleDateString('en-GB');
    }
  }

  function renderThermalSaleBill(data) {
    const {
      cfg, formattedDate, voucherNo, customerTitle, customerPhone, areaName, saleMode,
      isEstimatedBill, items, grossVal, discVal, netVal, prevBillVal,
      grandPayableVal, paidVal, balanceVal, includePrevBill, paperWidth, s
    } = data;

    const currentSaleObj = s || {};
    const selectedCust = (typeof saleState !== 'undefined' && saleState.selectedCustomer) ? saleState.selectedCustomer : {};

    const companyTitle = cleanInvoiceEmoji(cfg.title || 'Shahzaib Traders');
    const companyPhone = cleanInvoiceEmoji(cfg.phone || '0305 6838804');
    const companyAddress = cleanInvoiceEmoji(cfg.address || 'Wah Cantt');

    const region = cleanInvoiceEmoji(currentSaleObj.region || selectedCust.provinceName || 'Punjab');
    const territory = cleanInvoiceEmoji(currentSaleObj.territory || selectedCust.cityName || selectedCust.provinceName || 'Punjab');
    const town = cleanInvoiceEmoji(currentSaleObj.town || selectedCust.cityName || areaName || currentSaleObj.areaName || 'Wah cantt');
    const sector = cleanInvoiceEmoji(currentSaleObj.sector || areaName || currentSaleObj.areaName || selectedCust.areaName || selectedCust.address || 'wah cantt');

    const cleanCustomer = cleanInvoiceEmoji(customerTitle || currentSaleObj.partyTitle || selectedCust.name || 'Rajpoot markiting');
    const cleanCustPhone = cleanInvoiceEmoji(customerPhone || currentSaleObj.customerPhone || selectedCust.phone || '');

    // Extract clean bill number for the inverted badge (e.g. 835)
    const rawVoucher = cleanInvoiceEmoji(voucherNo || currentSaleObj.voucherNo || '');
    let billBadgeText = rawVoucher;
    const matchNum = rawVoucher.match(/(?:ST-SV-|SV-)?0*([1-9]\d*|\d+)/i);
    if (matchNum && matchNum[1]) {
      billBadgeText = matchNum[1];
    } else if (!billBadgeText) {
      billBadgeText = '835';
    }

    const docTitle = isEstimatedBill ? 'Estimate Information' : 'Sale Information';
    const thermalDate = formatThermalDate(currentSaleObj.entryDate || formattedDate);
    const printDateTime = formatThermalPrintDateTime();

    let itemsRows = '';
    (items || []).forEach(it => {
      const name = cleanInvoiceEmoji(it.productTitle || it.title || it.name || it.productCode || 'Item');
      const qty = Number(it.totalQty ?? it.quantity ?? it.qty ?? 1);
      const rate = Number(it.salePrice ?? it.rate ?? it.unitPrice ?? it.retailPrice ?? it.wholesalePrice ?? 0);
      const disc = Number(it.discountAmount ?? it.discAmount ?? it.discount ?? 0);
      const lineTotal = Number(it.netAmount ?? it.totalAmount ?? (qty * rate - disc) ?? 0);

      itemsRows += `
        <tr>
          <td class="col-td-prod">${window.escapeHtml(name)}</td>
          <td class="col-td-pack">${qty}</td>
          <td class="col-td-price">${rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
          <td class="col-td-disc">${disc > 0 ? disc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}</td>
          <td class="col-td-amt">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    if (!itemsRows) {
      itemsRows = `<tr><td colspan="5" style="text-align:center; padding: 6px;">No items</td></tr>`;
    }

    const itemsCount = (items || []).length;
    const effectivePrev = (includePrevBill || prevBillVal > 0) ? Number(prevBillVal || 0) : 0;
    const effectivePaid = Number(paidVal || 0);
    const remainingVal = Math.max(0, (netVal + effectivePrev) - effectivePaid);

    const footerText = cleanInvoiceEmoji(cfg.footer || 'Shahzaib Traders Management System');

    return `
      <div class="sale-doc-thermal" data-paper-size="${paperWidth || '80mm'}">
        <!-- Store Header -->
        <div class="thermal-receipt-header">
          <div class="thermal-company-name">${window.escapeHtml(companyTitle)}</div>
          <div class="thermal-company-phone">${window.escapeHtml(companyPhone)}</div>
          <div class="thermal-company-address">${window.escapeHtml(companyAddress)}</div>
        </div>

        <div class="thermal-divider-line"></div>
        <div class="thermal-doc-title">${window.escapeHtml(docTitle)}</div>
        <div class="thermal-divider-line"></div>

        <!-- Customer & Bill Metadata Grid -->
        <div class="thermal-meta-grid">
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Region:</span>
            <span class="thermal-meta-val">${window.escapeHtml(region)}</span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Territory:</span>
            <span class="thermal-meta-val">${window.escapeHtml(territory)}</span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Town:</span>
            <span class="thermal-meta-val">${window.escapeHtml(town)}</span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Sector:</span>
            <span class="thermal-meta-val">${window.escapeHtml(sector)}</span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Customer:</span>
            <span class="thermal-meta-val thermal-val-bold">${window.escapeHtml(cleanCustomer)}</span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Phone:</span>
            <span class="thermal-meta-val">${window.escapeHtml(cleanCustPhone || '-')}</span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Bill No.</span>
            <span class="thermal-meta-val">
              <span class="thermal-bill-badge">${window.escapeHtml(billBadgeText)}</span>
            </span>
          </div>
          <div class="thermal-meta-row">
            <span class="thermal-meta-lbl">Date:</span>
            <span class="thermal-meta-val">${window.escapeHtml(thermalDate)}</span>
          </div>
        </div>

        <!-- Items Table -->
        <table class="thermal-items-table">
          <thead>
            <tr>
              <th class="col-th-prod">Product</th>
              <th class="col-th-pack">Pack</th>
              <th class="col-th-price">Price</th>
              <th class="col-th-disc">Disc</th>
              <th class="col-th-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Boxed Summary Container -->
        <div class="thermal-totals-box">
          <div class="thermal-items-count">No. of Items: ${itemsCount}</div>
          <div class="thermal-totals-list">
            <div class="thermal-total-line">
              <span class="total-lbl">TOTAL:</span>
              <span class="total-val">${netVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
            </div>
            ${effectivePrev > 0 ? `
            <div class="thermal-total-line">
              <span class="total-lbl">Previous Balance:</span>
              <span class="total-val">${effectivePrev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
            </div>` : ''}
            ${effectivePaid > 0 ? `
            <div class="thermal-total-line">
              <span class="total-lbl">Paid:</span>
              <span class="total-val">${effectivePaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
            </div>` : ''}
            <div class="thermal-total-line thermal-remaining-line">
              <span class="total-lbl">Remaining:</span>
              <span class="total-val">${remainingVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- Signatures & Footer -->
        <div class="thermal-signature-row">
          <span>Signature: __________________</span>
        </div>

        <div class="thermal-thanks">THANKS FOR VISIT HERE</div>

        <div class="thermal-print-datetime">
          Print Datetime: ${window.escapeHtml(printDateTime)}
        </div>

        ${footerText ? `
        <div class="thermal-website-footer">
          ${window.escapeHtml(footerText)}
        </div>` : ''}
      </div>
    `;
  }

  function renderSalePrintStudioPreview() {
    if (!el.receiptArea) return;
    const data = getSalePrintStudioValues();
    const tpl = salePrintStudioState.template;

    if (tpl === 'a4') {
      el.receiptArea.innerHTML = renderA4SaleBill(data);
    } else {
      el.receiptArea.innerHTML = renderThermalSaleBill(data);
    }
  }

  async function openReceiptModal(saleObj) {
    if (!el.modalReceipt || !el.receiptArea) return;

    // Resolve items with bulletproof multi-tier fallback
    let items = [];
    if (saleObj && Array.isArray(saleObj.items) && saleObj.items.length > 0) {
      items = saleObj.items;
    } else if (saleObj && saleObj.itemsJson) {
      try {
        items = typeof saleObj.itemsJson === 'string' ? JSON.parse(saleObj.itemsJson) : saleObj.itemsJson;
      } catch (_) {}
    } else if (Array.isArray(saleState.items) && saleState.items.length > 0) {
      items = [...saleState.items];
    } else if (saleObj && (saleObj.voucherNo || saleObj.id)) {
      const match = (saleState.salesList || []).find(x => x.voucherNo === saleObj.voucherNo || x.id === saleObj.id);
      if (match?.itemsJson) {
        try {
          items = typeof match.itemsJson === 'string' ? JSON.parse(match.itemsJson) : match.itemsJson;
        } catch (_) {}
      }
    } else if (!saleObj && saleState.salesList && saleState.salesList.length > 0 && (!saleState.items || saleState.items.length === 0)) {
      const latestSale = saleState.salesList[0];
      if (latestSale) {
        return openReceiptModal(latestSale);
      }
    }

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
      billStatus: el.saleBillStatus?.value || saleState.billStatus || 'Paid',
      items: items
    };

    // Load Live Settings
    let cfg = {
      title: 'SHAHZAIB TRADERS',
      subtitle: 'Dealers in Electrical Goods & Accessories',
      address: 'Main Bazar, Electrical Market, Lahore',
      phone: '0300-1234567',
      taxNumber: '',
      invoiceHeading: 'Sale Tax Invoice',
      invoiceHeadingA5: 'Sale Memo',
      estimateHeading: 'Estimate / Quotation',
      previousBillLabel: 'Previous Bill / Balance',
      netPayableLabel: 'TOTAL NET PAYABLE',
      footer: 'Thank you for your business!\nGoods once sold cannot be returned without bill.\nNo warranty on burnt or short-circuit electrical items.',
      invoiceTerms: '1. Please inspect all items upon receipt.\n2. In case of return, original sale slip is required within 7 days.',
      signatureLabel1: 'Prepared By',
      signatureLabel2: 'Checked By',
      signatureLabel3: 'Customer Signature',
      paperSize: '80mm',
      autoPrint: false
    };

    try {
      let set = null;
      if (window.settingsAPI?.getSettings) {
        set = await window.settingsAPI.getSettings();
      } else if (window.appData?.settings) {
        set = window.appData.settings;
      }
      if (set) {
        if (set.receiptHeaderTitle || set.storeName) cfg.title = set.receiptHeaderTitle || set.storeName;
        if (set.receiptSubtitle) cfg.subtitle = set.receiptSubtitle;
        if (set.address) cfg.address = set.address;
        if (set.contactPhone) cfg.phone = set.contactPhone;
        if (set.taxNumber || set.ntn || set.strn) cfg.taxNumber = set.taxNumber || set.ntn || set.strn;
        if (set.invoiceHeading) cfg.invoiceHeading = set.invoiceHeading;
        if (set.invoiceHeadingA5) cfg.invoiceHeadingA5 = set.invoiceHeadingA5;
        if (set.estimateHeading) cfg.estimateHeading = set.estimateHeading;
        if (set.previousBillLabel) cfg.previousBillLabel = set.previousBillLabel;
        if (set.netPayableLabel) cfg.netPayableLabel = set.netPayableLabel;
        if (set.receiptFooterNote) cfg.footer = set.receiptFooterNote;
        if (set.invoiceTerms) cfg.invoiceTerms = set.invoiceTerms;
        if (set.signatureLabel1) cfg.signatureLabel1 = set.signatureLabel1;
        if (set.signatureLabel2) cfg.signatureLabel2 = set.signatureLabel2;
        if (set.signatureLabel3) cfg.signatureLabel3 = set.signatureLabel3;
        if (set.paperSize) cfg.paperSize = set.paperSize;
        if (set.autoPrintVoucher === 'true') cfg.autoPrint = true;
      }
    } catch (err) {
      console.warn('Could not load settings for receipt:', err);
    }

    // Configure Studio State
    salePrintStudioState.s = s;
    salePrintStudioState.items = items;
    salePrintStudioState.cfg = cfg;

    // Restore saved template & roll width (defaults to thermal receipt roll for POS)
    try {
      const savedTpl = localStorage.getItem('sale_bill_template');
      if (savedTpl && ['a4', 'thermal'].includes(savedTpl)) {
        salePrintStudioState.template = savedTpl;
      } else if (cfg.paperSize === 'A4') {
        salePrintStudioState.template = 'a4';
      } else {
        salePrintStudioState.template = 'thermal';
      }
      const savedWidth = localStorage.getItem('sale_thermal_width') || (cfg.paperSize === '58mm' ? '58mm' : '80mm');
      if (savedWidth && ['80mm', '58mm'].includes(savedWidth)) {
        salePrintStudioState.paperWidth = savedWidth;
        if (el.thermalWidthSelect) el.thermalWidthSelect.value = savedWidth;
      }
    } catch (_) {}

    // Initialize Previous Bill Option:
    // If customer has a positive ledger balance, populate & enable previous bill option
    const rawPrevBal = Number(s.previousBalance ?? (el.customerPrevBalance?.dataset?.rawBalance || 0));
    if (rawPrevBal > 0) {
      salePrintStudioState.includePrevBill = true;
      salePrintStudioState.prevBillAmount = rawPrevBal;
      if (el.chkIncludePrevBill) el.chkIncludePrevBill.checked = true;
      if (el.prevBillInputWrap) el.prevBillInputWrap.style.display = 'inline-flex';
      if (el.inpPrevBillAmount) el.inpPrevBillAmount.value = rawPrevBal;
    } else {
      salePrintStudioState.includePrevBill = false;
      salePrintStudioState.prevBillAmount = 0;
      if (el.chkIncludePrevBill) el.chkIncludePrevBill.checked = false;
      if (el.prevBillInputWrap) el.prevBillInputWrap.style.display = 'none';
      if (el.inpPrevBillAmount) el.inpPrevBillAmount.value = '';
    }

    // Update Toolbar Controls
    if (el.tplButtons) {
      el.tplButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tpl === salePrintStudioState.template);
      });
    }
    if (el.thermalWidthBox) {
      el.thermalWidthBox.style.display = (salePrintStudioState.template === 'thermal') ? 'inline-flex' : 'none';
    }
    if (el.thermalWidthSelect) {
      el.thermalWidthSelect.value = salePrintStudioState.paperWidth;
    }
    if (el.printStudioBadge) {
      const vNo = s.voucherNo || 'SV';
      const cName = s.partyTitle || 'Customer';
      el.printStudioBadge.textContent = `${s.billStatus === 'Estimated' ? 'Estimate' : 'Invoice'}: ${vNo} • ${cName}`;
    }

    // Render Preview
    renderSalePrintStudioPreview();

    // Show Studio Modal
    el.modalReceipt.classList.remove('hidden');

    if (cfg.autoPrint) {
      setTimeout(() => {
        doPrintSaleBill();
      }, 350);
    }
  }

  // ========================================================
  // RECENT SALES HISTORY POPUP MODAL (WITH ESTIMATE SUPPORT)
  // ========================================================
  let modalHistFilterStatus = 'all';

  async function openSaleHistoryPopupModal(filter = 'all') {
    modalHistFilterStatus = filter;
    if (!el.modalHistory || !el.historyTableBody) return;
    el.historyTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Loading sales history...</td></tr>';
    el.modalHistory.classList.remove('hidden');

    updateModalHistFilterButtons();

    try {
      let sales = [];
      if (window.salesAPI?.getSales) {
        sales = await window.salesAPI.getSales();
      } else {
        sales = window.appData?.sales || [];
      }
      saleState.salesList = Array.isArray(sales) ? sales : [];
      filterAndRenderModalHistory();
    } catch (e) {
      console.error('Failed to load sales history:', e);
      el.historyTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Failed to load sales</td></tr>';
    }
  }

  function updateModalHistFilterButtons() {
    if (el.btnModalHistFilterAll) el.btnModalHistFilterAll.classList.toggle('active', modalHistFilterStatus === 'all');
    if (el.btnModalHistFilterPaid) el.btnModalHistFilterPaid.classList.toggle('active', modalHistFilterStatus === 'paid');
    if (el.btnModalHistFilterEstimated) el.btnModalHistFilterEstimated.classList.toggle('active', modalHistFilterStatus === 'estimated');
  }

  function filterAndRenderModalHistory() {
    const q = (el.historySearchInput?.value || '').trim().toLowerCase();
    const sales = saleState.salesList || [];
    const filtered = sales.filter(s => {
      const isEst = (s.billStatus === 'Estimated');
      if (modalHistFilterStatus === 'paid' && isEst) return false;
      if (modalHistFilterStatus === 'estimated' && !isEst) return false;
      if (q) {
        const vNo = (s.voucherNo || '').toLowerCase();
        const pTitle = (s.partyTitle || '').toLowerCase();
        const phone = (s.customerPhone || '').toLowerCase();
        if (!vNo.includes(q) && !pTitle.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
    renderHistoryList(filtered);
  }

  function renderHistoryList(sales) {
    if (!el.historyTableBody) return;
    el.historyTableBody.innerHTML = '';

    if (!sales || sales.length === 0) {
      el.historyTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No matching sales records found</td></tr>';
      return;
    }

    sales.forEach(s => {
      let itemsCount = 0;
      try {
        const parsed = typeof s.itemsJson === 'string' ? JSON.parse(s.itemsJson) : (s.items || []);
        itemsCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {}

      const isEst = (s.billStatus === 'Estimated');
      const statusBadge = isEst
        ? '<span class="badge-status-estimate" title="Estimated Bill (No Stock Deducted)">📋 Estimate</span>'
        : '<span class="badge-status-paid" title="Paid Bill (Stock Deducted)">✓ Paid</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-num font-bold text-primary text-center">${window.escapeHtml(s.voucherNo || '-')}</td>
        <td class="text-center">${(s.entryDate || '').slice(0, 10)}</td>
        <td class="font-bold">${window.escapeHtml(s.partyTitle || 'Walk-in Customer')}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center font-num font-bold">${itemsCount}</td>
        <td class="text-right font-num font-bold text-accent">Rs ${Number(s.netAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-right font-num text-success">${Number(s.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-center">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
            ${isEst ? `
              <button type="button" class="btn-convert-estimate" onclick="window.SalesModule.convertEstimateToPaid('${s.id}')" title="Convert this Estimate into a Paid Bill">
                <span>🛒</span><span>Convert</span>
              </button>
            ` : ''}
            <button type="button" class="btn btn-sm btn-secondary" onclick="window.SalesModule.reprintSale('${s.id}')" title="Print Bill">🖨️</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="window.SalesModule.deleteSalePrompt('${s.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      `;
      el.historyTableBody.appendChild(tr);
    });
  }

  // ========================================================
  // SALES MASTER TABLE & ADD SALE MODAL CONTROLS
  // ========================================================
  async function openAddSaleModal(saleToEdit = null) {
    if (!saleToEdit) {
      await resetVoucher();
    }
    if (el.modalSaleVoucherNoDisplay) {
      el.modalSaleVoucherNoDisplay.textContent = el.voucherNo?.value || saleState.voucherNo || 'SV-0001';
    }
    if (el.modalAddSale) {
      el.modalAddSale.classList.remove('hidden');
      setTimeout(() => el.productSearchInput?.focus(), 100);
    }
  }

  function closeAddSaleModal() {
    if (el.modalAddSale) el.modalAddSale.classList.add('hidden');
  }

  async function loadAndRenderSalesTable() {
    try {
      let sales = [];
      if (window.salesAPI?.getSales) {
        sales = await window.salesAPI.getSales();
      } else {
        sales = window.appData?.sales || [];
      }
      saleState.salesList = Array.isArray(sales) ? sales : [];
      applySalesFilter();
    } catch (err) {
      console.error('Failed to load sales list:', err);
    }
  }

  function applySalesFilter() {
    if (!el.salesMasterTableBody) return;
    const q = (el.saleFilterSearch?.value || '').trim().toLowerCase();
    const dateVal = el.saleFilterDate?.value || '';
    const modeVal = el.saleFilterMode?.value || '';
    const statusVal = el.saleFilterStatus?.value || '';

    // Update count badges
    const totalAll = (saleState.salesList || []).length;
    const totalPaid = (saleState.salesList || []).filter(s => s.billStatus !== 'Estimated').length;
    const totalEst = (saleState.salesList || []).filter(s => s.billStatus === 'Estimated').length;
    if (el.badgeCountAllSales) el.badgeCountAllSales.textContent = totalAll;
    if (el.badgeCountPaidSales) el.badgeCountPaidSales.textContent = totalPaid;
    if (el.badgeCountEstimatedSales) el.badgeCountEstimatedSales.textContent = totalEst;

    if (el.btnSaleTabFilterAll) el.btnSaleTabFilterAll.classList.toggle('active', !statusVal);
    if (el.btnSaleTabFilterPaid) el.btnSaleTabFilterPaid.classList.toggle('active', statusVal === 'Paid');
    if (el.btnSaleTabFilterEstimated) el.btnSaleTabFilterEstimated.classList.toggle('active', statusVal === 'Estimated');

    const filtered = (saleState.salesList || []).filter(s => {
      if (q) {
        const vNo = (s.voucherNo || '').toLowerCase();
        const mNo = (s.manualNo || '').toLowerCase();
        const party = (s.partyTitle || '').toLowerCase();
        const phone = (s.customerPhone || '').toLowerCase();
        const area = (s.areaName || '').toLowerCase();
        if (!vNo.includes(q) && !mNo.includes(q) && !party.includes(q) && !phone.includes(q) && !area.includes(q)) {
          return false;
        }
      }
      if (dateVal) {
        const sDate = (s.entryDate || '').slice(0, 10);
        if (sDate !== dateVal) return false;
      }
      if (modeVal) {
        const pMode = (s.paymentType || '').toLowerCase();
        if (pMode !== modeVal.toLowerCase()) return false;
      }
      if (statusVal) {
        const bStatus = s.billStatus === 'Estimated' ? 'Estimated' : 'Paid';
        if (bStatus !== statusVal) return false;
      }
      return true;
    });

    renderSalesMasterTable(filtered);
  }

  function resetSalesFilters() {
    if (el.saleFilterSearch) el.saleFilterSearch.value = '';
    if (el.saleFilterDate) el.saleFilterDate.value = '';
    if (el.saleFilterMode) el.saleFilterMode.value = '';
    if (el.saleFilterStatus) el.saleFilterStatus.value = '';
    applySalesFilter();
  }

  function renderSalesMasterTable(list) {
    if (!el.salesMasterTableBody) return;
    el.salesMasterTableBody.innerHTML = '';

    if (el.saleResultsCounter) {
      el.saleResultsCounter.textContent = `${list.length} Invoice${list.length === 1 ? '' : 's'}`;
    }

    if (!window.salesPagination && window.createTablePagination) {
      window.salesPagination = window.createTablePagination({
        container: '#salesView .table-container',
        tbody: el.salesMasterTableBody,
        emptyStateEl: el.salesEmptyState,
        onRenderPage: (slice, startIdx) => {
          el.salesMasterTableBody.innerHTML = '';
          slice.forEach((s, idx) => {
            const globalSr = startIdx + idx + 1;
            let itemsCount = 0;
            try {
              const parsed = typeof s.itemsJson === 'string' ? JSON.parse(s.itemsJson) : (s.items || []);
              itemsCount = Array.isArray(parsed) ? parsed.length : 0;
            } catch (e) {}

            const contactStr = [s.customerPhone, s.areaName].filter(Boolean).join(' • ') || '-';
            const isEst = (s.billStatus === 'Estimated');
            const statusBadge = isEst
              ? '<span class="badge-status-estimate" title="Estimated Bill (No Stock Deducted)">📋 Estimate</span>'
              : '<span class="badge-status-paid" title="Paid Bill (Stock Deducted)">✓ Paid</span>';

            const modeBadge = (s.paymentType === 'Cash')
              ? '<span class="badge-condition-good" style="background: #dcfce7; color: #166534;">Cash</span>'
              : (s.paymentType === 'Credit')
                ? '<span class="badge-condition-damaged" style="background: #fee2e2; color: #991b1b;">Credit</span>'
                : `<span class="badge-price-pill" style="font-size: 11px;">${window.escapeHtml(s.paymentType || 'Cash')}</span>`;

            const menuId = `saleMenu_${s.id || globalSr}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td class="text-center font-num text-secondary">${globalSr}</td>
              <td class="text-center font-num font-bold text-primary">${window.escapeHtml(s.voucherNo || '-')}</td>
              <td class="text-center font-num">${s.entryDate || '-'}</td>
              <td class="font-bold text-ellipsis" title="${window.escapeHtml(s.partyTitle || '-')}">${window.escapeHtml(s.partyTitle || 'Walk-in Customer')}</td>
              <td class="text-secondary text-ellipsis" style="font-size: 12px;" title="${window.escapeHtml(contactStr)}">${window.escapeHtml(contactStr)}</td>
              <td class="text-center font-num font-bold">${itemsCount}</td>
              <td class="text-right font-num">${Number(s.grossAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right font-num text-secondary">${Number(s.discount || 0) > 0 ? Number(s.discount).toFixed(2) : '-'}</td>
              <td class="text-right font-num font-bold text-accent" style="font-size: 13.5px;">Rs ${Number(s.netAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right font-num font-bold text-success">${Number(s.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-center" style="white-space: nowrap; min-width: 145px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: nowrap;">${statusBadge} ${modeBadge}</div>
              </td>
              <td class="text-center" style="white-space: nowrap; min-width: 130px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                  ${isEst ? `
                    <button type="button" class="btn-convert-estimate" onclick="window.SalesModule.convertEstimateToPaid('${s.id}')" title="Convert this Estimate into a confirmed Paid Bill">
                      <span>🛒</span><span>Convert</span>
                    </button>
                  ` : ''}
                  <div class="dots-wrapper">
                    <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
                      ⋮
                    </button>
                    <div id="${menuId}" class="action-menu hidden">
                      ${isEst ? `
                        <button type="button" class="action-item" onclick="window.SalesModule.convertEstimateToPaid('${s.id}')" style="color: #16a34a; font-weight: 700;">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Convert to Paid Bill</span>
                        </button>
                      ` : ''}
                      <button type="button" class="action-item" onclick="window.SalesModule.reprintSale('${s.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 6 2 18 2 18 9"></polyline>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                          <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        <span>Print Bill / Receipt</span>
                      </button>
                      <button type="button" class="action-item" onclick="window.SalesModule.editSale('${s.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit Voucher</span>
                      </button>
                      <button type="button" class="action-item action-danger" onclick="window.SalesModule.deleteSalePrompt('${s.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Delete Voucher</span>
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            `;
            el.salesMasterTableBody.appendChild(tr);
          });
        }
      });
    }

    if (window.salesPagination) {
      window.salesPagination.setItems(list, false);
      return;
    }

    if (list.length === 0) {
      if (el.salesEmptyState) el.salesEmptyState.style.display = 'flex';
      return;
    }

    if (el.salesEmptyState) el.salesEmptyState.style.display = 'none';

    list.forEach((s, idx) => {
      let itemsCount = 0;
      try {
        const parsed = typeof s.itemsJson === 'string' ? JSON.parse(s.itemsJson) : (s.items || []);
        itemsCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {}

      const contactStr = [s.customerPhone, s.areaName].filter(Boolean).join(' • ') || '-';
      const isEst = (s.billStatus === 'Estimated');
      const statusBadge = isEst
        ? '<span class="badge-status-estimate" title="Estimated Bill (No Stock Deducted)">📋 Estimate</span>'
        : '<span class="badge-status-paid" title="Paid Bill (Stock Deducted)">✓ Paid</span>';

      const modeBadge = (s.paymentType === 'Cash')
        ? '<span class="badge-condition-good" style="background: #dcfce7; color: #166534;">Cash</span>'
        : (s.paymentType === 'Credit')
          ? '<span class="badge-condition-damaged" style="background: #fee2e2; color: #991b1b;">Credit</span>'
          : `<span class="badge-price-pill" style="font-size: 11px;">${window.escapeHtml(s.paymentType || 'Cash')}</span>`;

      const menuId = `saleMenu_${s.id || idx}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-num text-secondary">${idx + 1}</td>
        <td class="text-center font-num font-bold text-primary">${window.escapeHtml(s.voucherNo || '-')}</td>
        <td class="text-center font-num">${s.entryDate || '-'}</td>
        <td class="font-bold text-ellipsis" title="${window.escapeHtml(s.partyTitle || '-')}">${window.escapeHtml(s.partyTitle || 'Walk-in Customer')}</td>
        <td class="text-secondary text-ellipsis" style="font-size: 12px;" title="${window.escapeHtml(contactStr)}">${window.escapeHtml(contactStr)}</td>
        <td class="text-center font-num font-bold">${itemsCount}</td>
        <td class="text-right font-num">${Number(s.grossAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-right font-num text-secondary">${Number(s.discount || 0) > 0 ? Number(s.discount).toFixed(2) : '-'}</td>
        <td class="text-right font-num font-bold text-accent" style="font-size: 13.5px;">Rs ${Number(s.netAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-right font-num font-bold text-success">${Number(s.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-center" style="white-space: nowrap; min-width: 145px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: nowrap;">${statusBadge} ${modeBadge}</div>
        </td>
        <td class="text-center" style="white-space: nowrap; min-width: 130px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${isEst ? `
              <button type="button" class="btn-convert-estimate" onclick="window.SalesModule.convertEstimateToPaid('${s.id}')" title="Convert this Estimate into a confirmed Paid Bill">
                <span>🛒</span><span>Convert</span>
              </button>
            ` : ''}
            <div class="dots-wrapper">
              <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
                ⋮
              </button>
              <div id="${menuId}" class="action-menu hidden">
                ${isEst ? `
                  <button type="button" class="action-item" onclick="window.SalesModule.convertEstimateToPaid('${s.id}')" style="color: #16a34a; font-weight: 700;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Convert to Paid Bill</span>
                  </button>
                ` : ''}
                <button type="button" class="action-item" onclick="window.SalesModule.reprintSale('${s.id}')">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span>Print Bill / Receipt</span>
                </button>
                <button type="button" class="action-item" onclick="window.SalesModule.editSale('${s.id}')">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit Voucher</span>
                </button>
                <button type="button" class="action-item action-danger" onclick="window.SalesModule.deleteSalePrompt('${s.id}')">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Delete Voucher</span>
                </button>
              </div>
            </div>
          </div>
        </td>
      `;
      el.salesMasterTableBody.appendChild(tr);
    });
  }

  function openHistoryModal() {
    switchSaleSubTab('history');
  }

  // ========================================================
  // CONVERT ESTIMATED BILL TO CONFIRMED PAID SALE
  // ========================================================
  async function convertEstimateToPaid(id) {
    let sale = (saleState.salesList || []).find(s => String(s.id) === String(id));
    if (!sale && window.salesAPI?.getSales) {
      try {
        const all = await window.salesAPI.getSales();
        saleState.salesList = all || [];
        sale = saleState.salesList.find(s => String(s.id) === String(id));
      } catch (_) {}
    }

    if (!sale) {
      if (window.showToast) window.showToast('Sale estimate not found', 'error');
      alert('Estimate voucher not found.');
      return;
    }

    // Set existing ID and voucherNo so saving updates this voucher to 'Paid' and deducts stock
    saleState.saleId = sale.id;
    saleState.voucherNo = sale.voucherNo;
    let items = [];
    try {
      items = typeof sale.itemsJson === 'string' ? JSON.parse(sale.itemsJson) : (sale.items || []);
    } catch (e) {
      items = [];
    }
    saleState.items = Array.isArray(items) ? [...items] : [];

    if (el.voucherNo) el.voucherNo.value = sale.voucherNo || '';
    if (el.entryDate) el.entryDate.value = new Date().toISOString().split('T')[0];
    if (el.paymentType) el.paymentType.value = sale.paymentType || 'Cash';
    if (el.storeTitle) el.storeTitle.value = sale.storeTitle || 'Main Store';
    if (el.description) el.description.value = sale.description || '';
    if (el.specialDiscount) el.specialDiscount.value = Number(sale.discount || 0);

    // Set paid amount by default to net amount so Cash sale is ready to confirm
    const net = Number(sale.netAmount || 0);
    if (el.paidAmount) el.paidAmount.value = net;

    // CRITICAL: Explicitly convert status to 'Paid'
    saleState.billStatus = 'Paid';
    if (el.saleBillStatus) {
      el.saleBillStatus.value = 'Paid';
      updateBillStatusSelectStyle('Paid');
    }

    // Customer / Party mapping
    if (el.partyTypeSelect) el.partyTypeSelect.value = sale.partyTypeId || '';
    selectSalePartyType(sale.partyTypeId || '');
    if (el.customerSelect) el.customerSelect.value = sale.partyId || '';
    if (el.customerName) el.customerName.value = sale.partyTitle || '';
    if (el.customerPhone) el.customerPhone.value = sale.customerPhone || '';
    if (el.customerArea) el.customerArea.value = sale.areaName || '';

    renderItemsTable();
    updateVoucherTotals();

    // Close history modal if open and switch to Sale Voucher subview
    if (el.modalHistory) el.modalHistory.classList.add('hidden');
    switchSaleSubTab('voucher');

    const entryPage = document.getElementById('saleEntryPage');
    if (entryPage) entryPage.scrollTop = 0;

    const noticeMsg = `📋 Estimated Bill [${sale.voucherNo}] loaded as Paid Bill! Click 'Confirm Sale' to deduct stock & finalize.`;
    if (window.showToast) window.showToast(noticeMsg, 'success');
  }

  async function editSale(id) {
    const sale = (saleState.salesList || []).find(s => String(s.id) === String(id));
    if (!sale) {
      if (window.showToast) window.showToast('Sale voucher not found', 'error');
      return;
    }
    saleState.saleId = sale.id;
    saleState.voucherNo = sale.voucherNo;
    let items = [];
    try {
      items = typeof sale.itemsJson === 'string' ? JSON.parse(sale.itemsJson) : (sale.items || []);
    } catch (e) {
      items = [];
    }
    saleState.items = Array.isArray(items) ? [...items] : [];

    if (el.voucherNo) el.voucherNo.value = sale.voucherNo || '';
    if (el.entryDate) el.entryDate.value = (sale.entryDate || '').slice(0, 10);
    if (el.paymentType) el.paymentType.value = sale.paymentType || 'Cash';
    if (el.storeTitle) el.storeTitle.value = sale.storeTitle || 'Main Store';
    if (el.description) el.description.value = sale.description || '';
    if (el.specialDiscount) el.specialDiscount.value = Number(sale.discount || 0);
    if (el.paidAmount) el.paidAmount.value = Number(sale.paidAmount || 0);

    saleState.billStatus = sale.billStatus || 'Paid';
    if (el.saleBillStatus) {
      el.saleBillStatus.value = saleState.billStatus;
      updateBillStatusSelectStyle(saleState.billStatus);
    }

    if (el.partyTypeSelect) el.partyTypeSelect.value = sale.partyTypeId || '';
    selectSalePartyType(sale.partyTypeId || '');
    if (el.customerSelect) el.customerSelect.value = sale.partyId || '';
    if (el.customerName) el.customerName.value = sale.partyTitle || '';
    if (el.customerPhone) el.customerPhone.value = sale.customerPhone || '';
    if (el.customerArea) el.customerArea.value = sale.areaName || '';

    renderItemsTable();
    updateVoucherTotals();

    // Close history modal if open and switch to Sale Voucher subview
    if (el.modalHistory) el.modalHistory.classList.add('hidden');
    switchSaleSubTab('voucher');
    const entryPage = document.getElementById('saleEntryPage');
    if (entryPage) entryPage.scrollTop = 0;
    if (window.showToast) window.showToast(`Sale Voucher ${sale.voucherNo} loaded for editing`, 'info');
  }

  // ========================================================
  // EVENT BINDINGS
  // ========================================================
  function bindEvents() {
    // Header buttons
    if (el.btnNew) el.btnNew.addEventListener('click', resetVoucher);
    if (el.btnSave) el.btnSave.addEventListener('click', saveSaleVoucher);
    if (el.btnPrint) {
      el.btnPrint.addEventListener('click', async () => {
        // If there are unsaved items in cart, ensure the voucher is saved first!
        if (saleState.items && saleState.items.length > 0 && !saleState.saleId) {
          const currentStatus = el.saleBillStatus?.value || saleState.billStatus || 'Paid';
          if (currentStatus === 'Estimated') {
            // Save estimated bill first so it is recorded in history with voucher number, then print preview opens!
            await executeSaveSale('Estimated');
            return;
          } else {
            // Paid bill confirmation modal
            saveSaleVoucher();
            return;
          }
        }
        openReceiptModal();
      });
    }
    if (el.btnHistory) el.btnHistory.addEventListener('click', openHistoryModal);

    // Quick Status Switcher Tabs for Sales History
    if (el.btnSaleTabFilterAll) {
      el.btnSaleTabFilterAll.addEventListener('click', () => {
        if (el.saleFilterStatus) el.saleFilterStatus.value = '';
        applySalesFilter();
      });
    }
    if (el.btnSaleTabFilterPaid) {
      el.btnSaleTabFilterPaid.addEventListener('click', () => {
        if (el.saleFilterStatus) el.saleFilterStatus.value = 'Paid';
        applySalesFilter();
      });
    }
    if (el.btnSaleTabFilterEstimated) {
      el.btnSaleTabFilterEstimated.addEventListener('click', () => {
        if (el.saleFilterStatus) el.saleFilterStatus.value = 'Estimated';
        applySalesFilter();
      });
    }

    // Quick Filter Buttons for Modal History
    if (el.btnModalHistFilterAll) {
      el.btnModalHistFilterAll.addEventListener('click', () => {
        modalHistFilterStatus = 'all';
        updateModalHistFilterButtons();
        filterAndRenderModalHistory();
      });
    }
    if (el.btnModalHistFilterPaid) {
      el.btnModalHistFilterPaid.addEventListener('click', () => {
        modalHistFilterStatus = 'paid';
        updateModalHistFilterButtons();
        filterAndRenderModalHistory();
      });
    }
    if (el.btnModalHistFilterEstimated) {
      el.btnModalHistFilterEstimated.addEventListener('click', () => {
        modalHistFilterStatus = 'estimated';
        updateModalHistFilterButtons();
        filterAndRenderModalHistory();
      });
    }

    // Modal controls for Add Sale
    if (el.btnOpenAddSaleModal) el.btnOpenAddSaleModal.addEventListener('click', () => openAddSaleModal());
    if (el.btnCloseAddSaleModal) el.btnCloseAddSaleModal.addEventListener('click', closeAddSaleModal);
    if (el.btnCancelAddSaleModal) el.btnCancelAddSaleModal.addEventListener('click', closeAddSaleModal);

    // Filter controls for Sales Master Table
    if (el.saleFilterSearch) el.saleFilterSearch.addEventListener('input', applySalesFilter);
    if (el.saleFilterDate) el.saleFilterDate.addEventListener('change', applySalesFilter);
    if (el.saleFilterStatus) el.saleFilterStatus.addEventListener('change', applySalesFilter);

    // Bill Status selector change
    if (el.saleBillStatus) {
      el.saleBillStatus.addEventListener('change', (e) => {
        saleState.billStatus = e.target.value;
        updateBillStatusSelectStyle(e.target.value);
      });
    }

    // Bill Status Choice Modal Actions
    if (el.btnChoosePaidBill) {
      el.btnChoosePaidBill.addEventListener('click', () => executeSaveSale('Paid'));
    }
    if (el.btnChooseEstimatedBill) {
      el.btnChooseEstimatedBill.addEventListener('click', () => executeSaveSale('Estimated'));
    }
    if (el.btnCloseSaleBillStatusModal) {
      el.btnCloseSaleBillStatusModal.addEventListener('click', closeBillStatusModal);
    }
    if (el.btnCancelSaleBillStatusModal) {
      el.btnCancelSaleBillStatusModal.addEventListener('click', closeBillStatusModal);
    }
    if (el.btnSaleFilterToday) {
      el.btnSaleFilterToday.addEventListener('click', () => {
        if (el.saleFilterDate) {
          el.saleFilterDate.value = new Date().toISOString().split('T')[0];
          applySalesFilter();
        }
      });
    }
    if (el.btnSaleFilterAll) {
      el.btnSaleFilterAll.addEventListener('click', () => {
        if (el.saleFilterDate) {
          el.saleFilterDate.value = '';
          applySalesFilter();
        }
      });
    }
    if (el.saleFilterMode) el.saleFilterMode.addEventListener('change', applySalesFilter);
    if (el.btnSaleResetFilters) el.btnSaleResetFilters.addEventListener('click', resetSalesFilters);

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
    if (el.paidAmount) {
      el.paidAmount.addEventListener('input', () => {
        el.paidAmount.dataset.userEdited = 'true';
        updateVoucherTotals();
      });
      el.paidAmount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveSaleVoucher();
        }
      });
    }

    // Receipt Modal Close & Print Studio Events
    if (el.btnCloseReceipt) {
      el.btnCloseReceipt.addEventListener('click', () => {
        if (el.modalReceipt) el.modalReceipt.classList.add('hidden');
      });
    }
    if (el.btnDoPrintReceipt) {
      el.btnDoPrintReceipt.addEventListener('click', () => {
        doPrintSaleBill();
      });
    }
    if (el.tplButtons && el.tplButtons.length > 0) {
      el.tplButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tpl = btn.dataset.tpl;
          setSalePrintTemplate(tpl);
        });
      });
    }
    if (el.thermalWidthSelect) {
      el.thermalWidthSelect.addEventListener('change', (e) => {
        salePrintStudioState.paperWidth = e.target.value;
        try {
          localStorage.setItem('sale_thermal_width', e.target.value);
        } catch (_) {}
        renderSalePrintStudioPreview();
      });
    }
    if (el.chkIncludePrevBill) {
      el.chkIncludePrevBill.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        salePrintStudioState.includePrevBill = isChecked;
        if (el.prevBillInputWrap) {
          el.prevBillInputWrap.style.display = isChecked ? 'inline-flex' : 'none';
        }
        if (isChecked && el.inpPrevBillAmount) {
          if (!Number(el.inpPrevBillAmount.value) && salePrintStudioState.prevBillAmount > 0) {
            el.inpPrevBillAmount.value = salePrintStudioState.prevBillAmount;
          } else {
            salePrintStudioState.prevBillAmount = Number(el.inpPrevBillAmount.value || 0);
          }
          el.inpPrevBillAmount.focus();
        }
        renderSalePrintStudioPreview();
      });
    }
    if (el.inpPrevBillAmount) {
      el.inpPrevBillAmount.addEventListener('input', (e) => {
        salePrintStudioState.prevBillAmount = Number(e.target.value || 0);
        renderSalePrintStudioPreview();
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
        filterAndRenderModalHistory();
      });
    }

    // Connect with Find Product Window callback
    if (window.findProductAPI?.onProductSelected) {
      window.findProductAPI.onProductSelected((product) => {
        const isSaleActive = window.currentTab === 'sale' ||
          (document.getElementById('salesView') && !document.getElementById('salesView').classList.contains('hidden'));

        if (isSaleActive) {
          if (currentSaleSubTab === 'return') {
            addReturnProductToCart(product.id || product.code, 1);
            selectReturnProduct(product, false);
          } else {
            const rateMode = product._chosenRateType || saleState.rateMode || 'retail';
            addProductToCart(product.id || product.code, 1, rateMode, true);
            selectProduct(product, false);
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
    navTabs.btnHistory = document.getElementById('saleSubTabBtnHistory');
    navTabs.panelVoucher = document.getElementById('subviewSaleVoucher');
    navTabs.panelReturn = document.getElementById('subviewSaleReturn');
    navTabs.panelHistory = document.getElementById('subviewSaleHistory');

    if (navTabs.btnVoucher) {
      navTabs.btnVoucher.addEventListener('click', () => switchSaleSubTab('voucher'));
    }
    if (navTabs.btnReturn) {
      navTabs.btnReturn.addEventListener('click', () => switchSaleSubTab('return'));
    }
    if (navTabs.btnHistory) {
      navTabs.btnHistory.addEventListener('click', () => switchSaleSubTab('history'));
    }
  }

  function switchSaleSubTab(tab) {
    currentSaleSubTab = tab;
    if (navTabs.btnVoucher) navTabs.btnVoucher.classList.toggle('active', tab === 'voucher');
    if (navTabs.btnReturn) navTabs.btnReturn.classList.toggle('active', tab === 'return');
    if (navTabs.btnHistory) navTabs.btnHistory.classList.toggle('active', tab === 'history');

    if (navTabs.panelVoucher) {
      if (tab === 'voucher') {
        navTabs.panelVoucher.classList.remove('hidden');
        navTabs.panelVoucher.classList.add('active');
        populateCustomers();
        populateProductDropdown();
        if (!saleState.voucherNo) loadNextVoucherNo();
        loadAndRenderSalesTable();
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
        loadAndRenderReturnsTable();
      } else {
        navTabs.panelReturn.classList.add('hidden');
        navTabs.panelReturn.classList.remove('active');
      }
    }

    if (navTabs.panelHistory) {
      if (tab === 'history') {
        navTabs.panelHistory.classList.remove('hidden');
        navTabs.panelHistory.classList.add('active');
        loadAndRenderSalesTable();
      } else {
        navTabs.panelHistory.classList.add('hidden');
        navTabs.panelHistory.classList.remove('active');
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
    returnsList: [],
    slipCurrentPage: 1,
    slipPageSize: 5
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
    retEl.productSearchInput = document.getElementById('returnProductSearchInput');
    retEl.productDropdownList = document.getElementById('returnProductDropdownList');
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

    // Modal: Add Sale Return (Clean Form Popup)
    retEl.modalAddReturn = document.getElementById('modalAddSaleReturn');
    retEl.btnOpenAddReturnModal = document.getElementById('btnOpenAddReturnModal');
    retEl.btnCloseAddReturnModal = document.getElementById('btnCloseAddReturnModal');
    retEl.btnCancelAddReturnModal = document.getElementById('btnCancelAddReturnModal');
    retEl.modalReturnVoucherNoDisplay = document.getElementById('modalReturnVoucherNoDisplay');

    // Return Master Table & Filter Elements
    retEl.returnFilterSearch = document.getElementById('returnFilterSearch');
    retEl.returnFilterDate = document.getElementById('returnFilterDate');
    retEl.btnReturnFilterToday = document.getElementById('btnReturnFilterToday');
    retEl.btnReturnFilterAll = document.getElementById('btnReturnFilterAll');
    retEl.returnFilterMode = document.getElementById('returnFilterMode');
    retEl.btnReturnResetFilters = document.getElementById('btnReturnResetFilters');
    retEl.returnResultsCounter = document.getElementById('returnResultsCounter');
    retEl.returnsMasterTableBody = document.getElementById('returnsMasterTableBody');
    retEl.returnsEmptyState = document.getElementById('returnsEmptyState');

    if (window.setupSearchableProductDropdown && retEl.productSearchInput && retEl.productDropdownList) {
      window.setupSearchableProductDropdown({
        inputEl: retEl.productSearchInput,
        dropdownEl: retEl.productDropdownList,
        codeEl: retEl.itemCode,
        selectEl: retEl.productSelect,
        onSelect: (prod) => selectReturnProduct(prod),
        nextFocusEl: () => retEl.unitQty
      });
    }
  }

  async function loadNextReturnNo() {
    try {
      if (window.salesReturnAPI?.getNextReturnNo) {
        const no = await window.salesReturnAPI.getNextReturnNo();
        if (no && retEl.voucherNo) {
          retEl.voucherNo.value = no;
          returnState.returnNo = no;
        }
        if (no && retEl.modalReturnVoucherNoDisplay) {
          retEl.modalReturnVoucherNoDisplay.textContent = no;
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

      retEl.customerSelect.innerHTML = '<option value="">Select Customer</option>';
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
    const custName = document.getElementById('returnCustomerName');
    const custPhone = document.getElementById('returnCustomerPhone');
    const custArea = document.getElementById('returnCustomerArea');
    const prevBal = document.getElementById('returnCustomerPrevBalance');

    if (!partyId) {
      returnState.selectedCustomer = null;
      if (custName) custName.value = 'Walk-in Customer';
      if (custPhone) { custPhone.value = ''; custPhone.textContent = '-'; }
      if (custArea) { custArea.value = ''; custArea.textContent = '-'; }
      if (prevBal) {
        prevBal.textContent = 'Rs 0.00';
        prevBal.dataset.rawBalance = 0;
      }
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

        if (custName) custName.value = c.partyTitle || c.name || '';
        if (custPhone) { custPhone.value = c.phone || ''; custPhone.textContent = c.phone || ''; }
        if (custArea) { custArea.value = c.areaName || c.city || ''; custArea.textContent = c.areaName || c.city || ''; }
        const bal = Number(c.openingBalance || c.currentBalance || 0);
        if (prevBal) {
          prevBal.textContent = `Rs ${bal.toFixed(2)}`;
          prevBal.dataset.rawBalance = bal;
        }
        updateReturnTotals();
      } catch (err) {
        console.error('Error parsing party data:', err);
      }
    }
  }

  function populateReturnProducts() {
    if (!retEl.productSelect) return;
    const prods = window.appData?.products || [];
    retEl.productSelect.innerHTML = '<option value="">Choose Product</option>';
    prods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id || p.code;
      opt.textContent = `${p.code} - ${p.titleEng} (Stock: ${p.stockQty || 0})`;
      opt.dataset.product = JSON.stringify(p);
      retEl.productSelect.appendChild(opt);
    });
  }

  function selectReturnProduct(product, shouldFocus = true) {
    if (!product) return;
    returnState.selectedProduct = product;

    if (retEl.itemCode) retEl.itemCode.value = product.code || '';
    if (retEl.productSelect) {
      retEl.productSelect.value = product.id || product.code;
    }
    if (retEl.productSearchInput) {
      retEl.productSearchInput.value = product.titleEng || '';
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
    if (shouldFocus) {
      setTimeout(() => retEl.unitQty?.focus(), 50);
    }
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
    if (retEl.productSearchInput) retEl.productSearchInput.value = '';
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

  // ========================================================
  // RETURN POS CATALOG & SLIP WORKFLOW (IDENTICAL TO SALE VOUCHER)
  // ========================================================
  const posReturnCatalogState = {
    searchQuery: '',
    selectedCategory: '',
    stockFilter: 'all',
    defaultRateMode: 'retail',
    rowRates: {},
    rowQtys: {},
    currentPage: 1,
    pageSize: 10
  };

  function getFilteredReturnProducts() {
    let prods = window.appData?.products || [];
    if (posReturnCatalogState.selectedCategory) {
      prods = prods.filter(p => String(p.categoryId) === String(posReturnCatalogState.selectedCategory));
    }
    if (posReturnCatalogState.stockFilter === 'instock') {
      prods = prods.filter(p => Number(p.stockQty) > 0);
    }
    if (posReturnCatalogState.searchQuery) {
      const q = posReturnCatalogState.searchQuery;
      prods = prods.filter(p => {
        const title = (p.titleEng || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        return title.includes(q) || code.includes(q) || barcode.includes(q);
      });
    }
    return prods;
  }

  function renderReturnPosProductCatalog() {
    const tbody = document.getElementById('returnPosProductsTableBody');
    const emptyEl = document.getElementById('returnPosProductsEmpty');
    const countText = document.getElementById('returnPosProductsCountText');
    if (!tbody) return;

    const prods = getFilteredReturnProducts();
    const totalCount = (window.appData?.products || []).length;

    if (countText) {
      if (prods.length === totalCount) {
        countText.textContent = `Showing all ${totalCount} products`;
      } else {
        countText.textContent = `Filtered ${prods.length} of ${totalCount} products`;
      }
    }

    if (prods.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      const pag = document.getElementById('returnPosCatalogPagination');
      if (pag) pag.innerHTML = '';
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const pageSize = posReturnCatalogState.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(prods.length / pageSize));
    if (posReturnCatalogState.currentPage > totalPages) {
      posReturnCatalogState.currentPage = totalPages;
    }
    if (posReturnCatalogState.currentPage < 1) {
      posReturnCatalogState.currentPage = 1;
    }

    const startIdx = (posReturnCatalogState.currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const displaySlice = prods.slice(startIdx, endIdx);

    const catMap = {};
    (window.appData?.product_categories || []).forEach(c => {
      catMap[c.id] = c.categoryName || c.name;
    });

    let html = '';
    displaySlice.forEach(p => {
      const pId = p.id;
      const stock = Number(p.stockQty || 0);
      const unit = p.unitName || 'pcs';
      let stockClass = 'stock-in';
      let stockText = `${stock} ${unit}`;
      if (stock <= 0) {
        stockClass = 'stock-out';
        stockText = `0 ${unit}`;
      } else if (stock <= 10) {
        stockClass = 'stock-low';
        stockText = `${stock} ${unit}`;
      }

      const rp = Number(p.retailPrice || 0);
      const wp = Number(p.wholesalePrice || 0);

      const chosenMode = posReturnCatalogState.rowRates[pId] || posReturnCatalogState.defaultRateMode || 'retail';
      const isRetail = chosenMode === 'retail';
      const isWholesale = chosenMode === 'wholesale';

      const currentQty = posReturnCatalogState.rowQtys[pId] || 1;
      const catName = p.categoryName || catMap[p.categoryId] || 'General';

      html += `
        <tr class="pos-catalog-row" data-product-id="${pId}">
          <td class="col-code font-num" style="text-align: center;">
            <span class="pos-code-clean">${window.escapeHtml(p.code || '-')}</span>
          </td>
          <td class="col-name" style="text-align: left;">
            <div class="pos-prod-name" title="${window.escapeHtml(p.titleEng || '')}">${window.escapeHtml(p.titleEng || '')}</div>
          </td>
          <td class="col-cat" style="text-align: left;">
            <span class="pos-cat-clean">${window.escapeHtml(catName)}</span>
          </td>
          <td class="col-stock" style="text-align: center;">
            <span class="pos-stock-clean ${stockClass}">${stockText}</span>
          </td>
          <td class="col-retail font-num" style="text-align: center;">
            <button type="button" class="pos-rate-btn-clean pos-rp-btn ${isRetail ? 'selected return-selected' : ''}"
              onclick="window.SalesModule.setReturnRowRate('${pId}', 'retail')"
              title="Select Retail Rate">
              ${isRetail ? '<span class="rate-dot">●</span> ' : ''}Rs ${rp.toLocaleString()}
            </button>
          </td>
          <td class="col-wholesale font-num" style="text-align: center;">
            <button type="button" class="pos-rate-btn-clean pos-wp-btn ${isWholesale ? 'selected return-selected' : ''}"
              onclick="window.SalesModule.setReturnRowRate('${pId}', 'wholesale')"
              title="Select Wholesale Rate">
              ${isWholesale ? '<span class="rate-dot">●</span> ' : ''}Rs ${wp.toLocaleString()}
            </button>
          </td>
          <td class="col-qty" style="text-align: center;">
            <div class="pos-qty-stepper-clean">
              <button type="button" class="pos-qty-btn-clean" onclick="window.SalesModule.stepReturnInputQty('${pId}', -1)">−</button>
              <input type="number" id="return-pos-qty-${pId}" class="pos-qty-input-clean font-num font-bold" min="1" value="${currentQty}">
              <button type="button" class="pos-qty-btn-clean" onclick="window.SalesModule.stepReturnInputQty('${pId}', 1)">+</button>
            </div>
          </td>
          <td class="col-action" style="text-align: center;">
            <button type="button" class="pos-btn-return-clean" onclick="window.SalesModule.handleReturnAddClick('${pId}')" title="Add to Return Slip">
              + Return
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    renderCatalogPagination(
      'returnPosCatalogPagination',
      posReturnCatalogState.currentPage,
      totalPages,
      prods.length,
      pageSize,
      (newPage) => {
        posReturnCatalogState.currentPage = newPage;
        renderReturnPosProductCatalog();
      }
    );
  }

  function addReturnProductToCart(productId, qtyToAdd = 1) {
    const products = window.appData?.products || [];
    const p = products.find(item => String(item.id) === String(productId));
    if (!p) return;

    const rateMode = posReturnCatalogState.rowRates[productId] || posReturnCatalogState.defaultRateMode || 'retail';
    const rate = rateMode === 'wholesale'
      ? (Number(p.wholesalePrice) || Number(p.retailPrice) || 0)
      : (Number(p.retailPrice) || Number(p.wholesalePrice) || 0);

    const qty = Math.max(1, Number(qtyToAdd) || 1);

    const existingIdx = returnState.items.findIndex(it => String(it.productId) === String(p.id) || it.productCode === p.code);
    const pageSize = returnState.slipPageSize || 5;
    if (existingIdx !== -1) {
      returnState.items[existingIdx].totalQty += qty;
      returnState.items[existingIdx].returnRate = rate;
      returnState.items[existingIdx].netAmount = returnState.items[existingIdx].totalQty * rate;
      returnState.slipCurrentPage = Math.floor(existingIdx / pageSize) + 1;
    } else {
      returnState.items.push({
        productId: p.id,
        productCode: p.code,
        productTitle: p.titleEng,
        packSize: p.packSize || 1,
        packQty: 0,
        unitQty: qty,
        totalQty: qty,
        returnRate: rate,
        netAmount: qty * rate,
        condition: 'Good'
      });
      returnState.slipCurrentPage = Math.ceil(returnState.items.length / pageSize);
    }

    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
    if (row) {
      const btn = row.querySelector('.pos-btn-return-cart');
      if (btn) {
        btn.classList.add('added-flash');
        setTimeout(() => btn.classList.remove('added-flash'), 250);
      }
    }

    renderReturnItemsTable();
    updateReturnTotals();
    updateReturnSlipMeta();
  }

  function adjustReturnCartItemQty(idx, delta) {
    if (!returnState.items[idx]) return;
    const current = Number(returnState.items[idx].totalQty) || 1;
    const next = current + delta;
    if (next <= 0) {
      removeReturnItem(idx);
    } else {
      returnState.items[idx].totalQty = next;
      returnState.items[idx].netAmount = next * Number(returnState.items[idx].returnRate || 0);
      renderReturnItemsTable();
      updateReturnTotals();
      updateReturnSlipMeta();
    }
  }

  function showReturnPosRightView(view) {
    updateReturnRightPanelVisibility();
    renderReturnItemsTable();
    updateReturnTotals();
  }

  function updateReturnRightPanelVisibility() {
    const rightPanel = document.getElementById('returnPosRightPanel');
    if (rightPanel) {
      rightPanel.classList.remove('hidden');
    }
  }

  function updateReturnSlipMeta() {
    const custInput = document.getElementById('returnCustomerName');
    const typedName = custInput?.value?.trim();
    const cust = returnState.selectedCustomer;
    const displayName = typedName || (cust ? (cust.partyTitle || cust.name) : 'Walk-in Customer');

    const slipCust = document.getElementById('returnSlipCustomerDisplay');
    if (slipCust) slipCust.textContent = displayName;

    const vNo = retEl.voucherNo?.value || returnState.returnNo || 'SR-0001';
    const slipVoucherNo = document.getElementById('returnSlipVoucherNoDisplay');
    if (slipVoucherNo) slipVoucherNo.textContent = vNo;

    const barcodeMeta = document.getElementById('returnSlipBarcodeMeta');
    if (barcodeMeta) barcodeMeta.textContent = `* ${vNo} *`;

    const dateInput = document.getElementById('returnEntryDate');
    const dateDisplay = document.getElementById('returnSlipDateDisplay');
    if (dateDisplay) {
      const raw = dateInput?.value;
      dateDisplay.textContent = raw ? new Date(raw).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    }

    const modeSelect = document.getElementById('returnRefundMode');
    const modeDisplay = document.getElementById('returnSlipModeDisplay');
    if (modeDisplay) {
      const mode = modeSelect?.value || 'Credit';
      modeDisplay.textContent = mode === 'Cash' ? 'Cash Refund' : 'Credit Ledger';
      modeDisplay.style.color = mode === 'Cash' ? '#16a34a' : '#dc2626';
    }

    const refInput = document.getElementById('returnOriginalBillRef');
    const refDisplay = document.getElementById('returnSlipOrigBillDisplay');
    if (refDisplay) {
      refDisplay.textContent = refInput?.value?.trim() || '-';
    }
  }

  function updateReturnSlipCompanyHeader() {
    const titleEl = document.getElementById('returnSlipCompanyTitle');
    const subEl = document.getElementById('returnSlipCompanySubtitle');
    const addrEl = document.getElementById('returnSlipCompanyAddress');
    const phoneEl = document.getElementById('returnSlipCompanyPhone');

    const comp = sharedCompanyInfo || {};
    if (titleEl && comp.companyName) titleEl.textContent = comp.companyName;
    if (subEl && comp.businessTagline) subEl.textContent = comp.businessTagline;
    if (addrEl && comp.address) addrEl.textContent = comp.address;
    if (phoneEl && comp.phone) phoneEl.textContent = `Ph: ${comp.phone}`;
  }

  function setReturnItemCondition(idx, condition) {
    if (returnState.items[idx]) {
      returnState.items[idx].condition = condition;
    }
  }

  function updateReturnItemRate(idx, rateVal) {
    if (returnState.items[idx]) {
      const r = Math.max(0, Number(rateVal) || 0);
      returnState.items[idx].returnRate = r;
      returnState.items[idx].netAmount = returnState.items[idx].totalQty * r;
      renderReturnItemsTable();
      updateReturnTotals();
    }
  }

  function setReturnItemQty(idx, qtyVal) {
    if (returnState.items[idx]) {
      const q = Math.max(1, Number(qtyVal) || 1);
      returnState.items[idx].totalQty = q;
      returnState.items[idx].netAmount = q * Number(returnState.items[idx].returnRate || 0);
      renderReturnItemsTable();
      updateReturnTotals();
    }
  }

  function removeReturnItem(idx) {
    if (idx >= 0 && idx < returnState.items.length) {
      returnState.items.splice(idx, 1);
      const pageSize = returnState.slipPageSize || 5;
      const totalPages = Math.ceil(returnState.items.length / pageSize) || 1;
      if (returnState.slipCurrentPage > totalPages) {
        returnState.slipCurrentPage = totalPages;
      }
      renderReturnItemsTable();
      updateReturnTotals();
    }
  }

  function renderReturnItemsTable() {
    const tbody = document.getElementById('returnItemsTableBody');
    const emptyState = document.getElementById('returnItemsEmptyState');
    const countBadge = document.getElementById('returnBillItemCountBadge');
    const btnReturn = document.getElementById('btnReturnSave');

    if (countBadge) countBadge.textContent = `${returnState.items.length} Items`;

    if (returnState.items.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (btnReturn) {
        btnReturn.disabled = true;
        btnReturn.style.opacity = '0.6';
        btnReturn.style.cursor = 'not-allowed';
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (btnReturn) {
      btnReturn.disabled = false;
      btnReturn.style.opacity = '1';
      btnReturn.style.cursor = 'pointer';
    }

    if (tbody) {
      tbody.innerHTML = '';
      const pageSize = returnState.slipPageSize || 5;
      const totalPages = Math.ceil(returnState.items.length / pageSize) || 1;
      if (!returnState.slipCurrentPage || returnState.slipCurrentPage < 1) returnState.slipCurrentPage = 1;
      if (returnState.slipCurrentPage > totalPages) returnState.slipCurrentPage = totalPages;

      const currentPage = returnState.slipCurrentPage;
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, returnState.items.length);
      const visibleItems = returnState.items.slice(startIdx, endIdx);

      visibleItems.forEach((item, relIdx) => {
        const idx = startIdx + relIdx;
        const prod = (window.appData?.products || []).find(p => String(p.id) === String(item.productId) || String(p.code) === String(item.productCode)) || {};
        const stockQty = Number(prod.stockQty || 0);
        const cond = item.condition || 'Good';

        const tr = document.createElement('tr');
        tr.className = 'pos-bill-row';
        tr.innerHTML = `
          <td class="pos-cell-sr text-center font-num text-muted" style="text-align: center; vertical-align: middle;">${idx + 1}</td>
          <td class="pos-cell-code font-num font-bold text-center" style="text-align: center; vertical-align: middle; color: #b91c1c;">${window.escapeHtml(item.productCode || '-')}</td>
          <td class="pos-cell-title" style="text-align: left; padding-left: 14px; vertical-align: middle;" title="${window.escapeHtml(item.productTitle || 'Untitled')}">
            <div class="pos-bill-title font-bold" style="color: #0f172a; font-size: 13px;">${window.escapeHtml(item.productTitle || 'Untitled')}</div>
            ${item.packSize > 1 ? `<span style="font-size: 11px; color: #64748b;">Pack size: ${item.packSize}</span>` : ''}
          </td>
          <td class="pos-cell-stock text-center" style="text-align: center; vertical-align: middle;">
            <span class="pos-stock-badge ${stockQty <= 0 ? 'badge-out' : (stockQty <= 5 ? 'badge-low' : 'badge-in')} font-num font-bold">
              ${stockQty}
            </span>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <select class="form-control form-control-sm font-bold" style="width: 110px; height: 28px; font-size: 12px; display: inline-block; padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 6px; margin: 0 auto;" onchange="window.SalesModule.setReturnItemCondition(${idx}, this.value)">
              <option value="Good" ${cond === 'Good' ? 'selected' : ''}>Good</option>
              <option value="Defective" ${cond === 'Defective' ? 'selected' : ''}>Defective</option>
              <option value="Damaged" ${cond === 'Damaged' ? 'selected' : ''}>Damaged</option>
            </select>
          </td>
          <td class="pos-cell-rate text-center" style="text-align: center; vertical-align: middle;">
            <div class="pos-inline-input-wrap rate-input-wrap" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; margin: 0 auto;">
              <span class="cur-sym" style="font-size: 11px; font-weight: 700; color: #64748b;">Rs</span>
              <input type="number" class="pos-inline-inp font-num font-bold text-center" style="width: 78px; height: 28px; padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 13px;" min="0" step="1" value="${Number(item.returnRate || 0)}" onchange="window.SalesModule.updateReturnItemRate(${idx}, this.value)">
            </div>
          </td>
          <td class="pos-cell-qty text-center" style="text-align: center; vertical-align: middle;">
            <div class="pos-row-qty-stepper" style="display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
              <button type="button" class="pos-qty-btn-step" onclick="window.SalesModule.adjustReturnCartItemQty(${idx}, -1)" title="Decrease quantity">−</button>
              <input type="number" class="pos-qty-input-step font-num font-bold text-center" style="width: 44px; height: 26px; border: none; background: transparent; text-align: center;" min="1" value="${item.totalQty}" onchange="window.SalesModule.setReturnItemQty(${idx}, this.value)">
              <button type="button" class="pos-qty-btn-step" onclick="window.SalesModule.adjustReturnCartItemQty(${idx}, 1)" title="Increase quantity">+</button>
            </div>
          </td>
          <td class="pos-cell-total font-num font-bold text-right" style="text-align: right; padding-right: 16px; color: #dc2626; font-size: 13.5px; white-space: nowrap; vertical-align: middle;">
            Rs ${Number(item.netAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td class="pos-cell-del text-center" style="text-align: center; vertical-align: middle;">
            <button type="button" class="pos-item-del-btn" style="display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;" onclick="window.SalesModule.removeReturnItem(${idx})" title="Remove item">✕</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      const returnPaginationBar = document.getElementById('returnPosSlipPaginationBar');
      if (returnPaginationBar) {
        if (totalPages > 1) {
          returnPaginationBar.style.display = 'flex';
          const pagInfo = document.getElementById('returnPosSlipPaginationInfo');
          const pagCur = document.getElementById('returnPosSlipPaginationCurrent');
          const btnPrev = document.getElementById('btnReturnSlipPrev');
          const btnNext = document.getElementById('btnReturnSlipNext');
          if (pagInfo) pagInfo.textContent = `Items ${startIdx + 1}–${endIdx} of ${returnState.items.length}`;
          if (pagCur) pagCur.textContent = `Page ${currentPage} of ${totalPages}`;
          if (btnPrev) btnPrev.disabled = currentPage <= 1;
          if (btnNext) btnNext.disabled = currentPage >= totalPages;
        } else {
          returnPaginationBar.style.display = 'none';
        }
      }
    }
  }

  function updateReturnTotals() {
    const totalItems = returnState.items.length;
    let totalPieces = 0;
    let grossRefund = 0;

    returnState.items.forEach(it => {
      totalPieces += Number(it.totalQty || 0);
      grossRefund += Number(it.netAmount || 0);
    });

    const discInput = document.getElementById('returnSpecialDeduction');
    const disc = Number(discInput?.value) || 0;
    const netRefund = Math.max(0, grossRefund - disc);

    const totalItemsCount = document.getElementById('returnTotalItemsCount');
    const totalPiecesCount = document.getElementById('returnTotalPiecesCount');
    const grossRefundEl = document.getElementById('returnGrossRefund');
    const netTotalEl = document.getElementById('returnNetTotal');
    const countBadge = document.getElementById('returnBillItemCountBadge');

    if (totalItemsCount) totalItemsCount.textContent = totalItems;
    if (totalPiecesCount) totalPiecesCount.textContent = totalPieces;
    if (countBadge) countBadge.textContent = `${totalItems} Items`;
    if (grossRefundEl) grossRefundEl.textContent = `Rs ${grossRefund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (netTotalEl) netTotalEl.textContent = `Rs ${netRefund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const refundMode = document.getElementById('returnRefundMode')?.value || 'Credit';
    const modeBadge = document.getElementById('returnSettlementModeBadge');
    if (modeBadge) {
      if (refundMode === 'Cash') {
        modeBadge.textContent = 'Cash Refund';
        modeBadge.style.background = '#dcfce7';
        modeBadge.style.color = '#166534';
      } else {
        modeBadge.textContent = 'Credit Ledger';
        modeBadge.style.background = '#e0f2fe';
        modeBadge.style.color = '#0369a1';
      }
    }
    const prevBalEl = document.getElementById('returnCustomerPrevBalance');
    const rawBal = Number(prevBalEl?.dataset?.rawBalance) || 0;

    const khataPreview = document.getElementById('returnKhataAdjustPreview');
    if (khataPreview) {
      if (refundMode === 'Cash') {
        khataPreview.textContent = 'Immediate Cash Payment';
        khataPreview.className = 'font-num font-bold text-warning';
      } else {
        const newBal = rawBal - netRefund;
        khataPreview.textContent = `Deduct from Due (New Bal: Rs ${newBal.toFixed(2)})`;
        khataPreview.className = 'font-num font-bold text-success';
      }
    }
  }

  function initReturnPosCatalog() {
    updateReturnRightPanelVisibility();
    const searchInput = document.getElementById('returnPosProductSearch');
    const clearBtn = document.getElementById('returnPosClearSearch');
    const catSelect = document.getElementById('returnPosCategoryFilter');
    const stockSelect = document.getElementById('returnPosStockFilter');
    const rateSelect = document.getElementById('returnPosRateModeSelect');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        posReturnCatalogState.searchQuery = e.target.value.trim().toLowerCase();
        posReturnCatalogState.currentPage = 1;
        renderReturnPosProductCatalog();
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const matching = getFilteredReturnProducts();
          if (matching.length > 0) {
            addReturnProductToCart(matching[0].id, 1);
            searchInput.select();
          }
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          posReturnCatalogState.searchQuery = '';
          posReturnCatalogState.currentPage = 1;
          renderReturnPosProductCatalog();
          searchInput.focus();
        }
      });
    }

    if (catSelect) {
      catSelect.innerHTML = '<option value="">All Categories</option>';
      const categories = window.appData?.product_categories || [];
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.categoryName || c.name;
        catSelect.appendChild(opt);
      });
      catSelect.addEventListener('change', (e) => {
        posReturnCatalogState.selectedCategory = e.target.value;
        posReturnCatalogState.currentPage = 1;
        renderReturnPosProductCatalog();
      });
    }

    if (stockSelect) {
      stockSelect.value = posReturnCatalogState.stockFilter || 'all';
      stockSelect.addEventListener('change', (e) => {
        posReturnCatalogState.stockFilter = e.target.value;
        posReturnCatalogState.currentPage = 1;
        renderReturnPosProductCatalog();
      });
    }

    if (rateSelect) {
      rateSelect.value = posReturnCatalogState.defaultRateMode || 'retail';
      rateSelect.addEventListener('change', (e) => {
        posReturnCatalogState.defaultRateMode = e.target.value;
        renderReturnPosProductCatalog();
      });
    }

    const custName = document.getElementById('returnCustomerName');
    const custPhone = document.getElementById('returnCustomerPhone');
    const custSelect = document.getElementById('returnCustomerSelect');
    const refundMode = document.getElementById('returnRefundMode');
    const entryDate = document.getElementById('returnEntryDate');
    const billRef = document.getElementById('returnOriginalBillRef');
    const discInput = document.getElementById('returnSpecialDeduction');

    if (custName) custName.addEventListener('input', updateReturnSlipMeta);
    if (custPhone) custPhone.addEventListener('input', updateReturnSlipMeta);
    if (refundMode) refundMode.addEventListener('change', updateReturnSlipMeta);
    if (entryDate) entryDate.addEventListener('change', updateReturnSlipMeta);
    if (billRef) billRef.addEventListener('input', updateReturnSlipMeta);
    if (discInput) discInput.addEventListener('input', updateReturnTotals);

    if (custSelect) {
      custSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) {
          returnState.selectedCustomer = null;
        } else {
          let parties = [];
          if (window.appData?.parties) parties = window.appData.parties;
          returnState.selectedCustomer = parties.find(p => String(p.id) === String(val)) || null;
          if (returnState.selectedCustomer) {
            if (custName) custName.value = returnState.selectedCustomer.partyTitle || '';
            if (custPhone) custPhone.value = returnState.selectedCustomer.phone || '';
          }
        }
        updateReturnSlipMeta();
      });
    }

    const btnDone = document.getElementById('btnReturnPosDone');
    if (btnDone) {
      btnDone.addEventListener('click', () => showReturnPosRightView('slip'));
    }

    const btnBackToCart = document.getElementById('btnReturnPosBackToCart');
    if (btnBackToCart) {
      btnBackToCart.addEventListener('click', () => showReturnPosRightView('cart'));
    }

    const btnClearCart = document.getElementById('btnReturnPosClearCart');
    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        if (returnState.items.length === 0) return;
        if (confirm('Are you sure you want to clear all items from the return slip?')) {
          returnState.items = [];
          renderReturnItemsTable();
          updateReturnTotals();
          showReturnPosRightView('cart');
        }
      });
    }

    renderReturnPosProductCatalog();
    updateReturnSlipMeta();
    updateReturnSlipCompanyHeader();
  }

  async function saveSaleReturn() {
    if (returnState.items.length === 0) {
      if (window.showToast) window.showToast('Please add at least one returned item to save.', 'warning');
      return;
    }

    let totalPieces = 0;
    let grossRefund = 0;
    returnState.items.forEach(it => {
      totalPieces += Number(it.totalQty || 0);
      grossRefund += Number(it.netAmount || 0);
    });

    const discInput = document.getElementById('returnSpecialDeduction');
    const disc = Number(discInput?.value) || 0;
    const netRefund = Math.max(0, grossRefund - disc);

    const custNameInput = document.getElementById('returnCustomerName');
    const custPhoneInput = document.getElementById('returnCustomerPhone');
    const refundModeSelect = document.getElementById('returnRefundMode');
    const entryDateInput = document.getElementById('returnEntryDate');
    const billRefInput = document.getElementById('returnOriginalBillRef');

    const enteredName = custNameInput?.value?.trim();
    const isSpecific = Boolean(returnState.selectedCustomer);
    const chosenTitle = enteredName || (isSpecific ? (returnState.selectedCustomer.partyTitle || returnState.selectedCustomer.name) : 'Walk-in Customer');
    const chosenPhone = custPhoneInput?.value?.trim() || (isSpecific ? (returnState.selectedCustomer.phone || '') : '') || '';
    const chosenPartyId = isSpecific ? returnState.selectedCustomer.id : 'walk-in';

    const returnData = {
      id: returnState.returnId || undefined,
      returnNo: retEl.voucherNo?.value || returnState.returnNo || 'SR-0001',
      saleVoucherRef: billRefInput?.value?.trim() || retEl.originalBillRef?.value?.trim() || '',
      entryDate: entryDateInput?.value || retEl.entryDate?.value || new Date().toISOString().slice(0, 10),
      partyId: String(chosenPartyId),
      partyTitle: chosenTitle,
      partyTypeId: 'general',
      partyTypeName: 'General Party',
      customerPhone: chosenPhone,
      areaName: isSpecific ? (returnState.selectedCustomer.areaName || '') : '',
      description: retEl.description?.value?.trim() || '',
      refundMode: refundModeSelect?.value || retEl.refundMode?.value || 'Credit',
      totalItems: returnState.items.length,
      totalPieces,
      totalAmount: netRefund,
      paidRefund: (refundModeSelect?.value === 'Cash' || retEl.refundMode?.value === 'Cash') ? netRefund : 0
    };

    try {
      if (retEl.btnSave) retEl.btnSave.disabled = true;
      const saveBtn = document.getElementById('btnReturnSave');
      if (saveBtn) saveBtn.disabled = true;

      if (window.salesReturnAPI?.saveReturn) {
        const res = await window.salesReturnAPI.saveReturn(returnData, returnState.items);
        if (res && res.success) {
          if (window.showToast) window.showToast(`Sale Return ${res.returnNo} saved! Stock added back to inventory.`, 'success');
          
          if (window.reloadFromDatabase) await window.reloadFromDatabase();
          await loadAndRenderReturnsTable();

          const chkPrint = document.getElementById('chkReturnPrintReceipt');
          const shouldPrint = chkPrint ? chkPrint.checked : true;
          if (shouldPrint) {
            openReturnReceiptModal({ ...returnData, returnNo: res.returnNo, items: [...returnState.items] });
          }

          resetReturnForm();
        }
      }
    } catch (err) {
      alert('Error saving return: ' + err.message);
    } finally {
      if (retEl.btnSave) retEl.btnSave.disabled = false;
      const saveBtn = document.getElementById('btnReturnSave');
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function resetReturnForm() {
    returnState.returnId = null;
    returnState.items = [];
    returnState.selectedProduct = null;
    returnState.selectedCustomer = null;
    returnState.slipCurrentPage = 1;

    const custName = document.getElementById('returnCustomerName');
    const custPhone = document.getElementById('returnCustomerPhone');
    const custSelect = document.getElementById('returnCustomerSelect');
    const refundMode = document.getElementById('returnRefundMode');
    const entryDate = document.getElementById('returnEntryDate');
    const billRef = document.getElementById('returnOriginalBillRef');
    const discInput = document.getElementById('returnSpecialDeduction');
    const remInput = document.getElementById('returnRemarksInput');
    const prevBal = document.getElementById('returnCustomerPrevBalance');

    if (custName) custName.value = 'Walk-in Customer';
    if (custPhone) custPhone.value = '';
    if (custSelect) custSelect.value = '';
    if (refundMode) refundMode.value = 'Credit';
    if (entryDate) entryDate.value = new Date().toISOString().slice(0, 10);
    if (billRef) billRef.value = '';
    if (discInput) discInput.value = 0;
    if (remInput) remInput.value = '';
    if (prevBal) {
      prevBal.textContent = 'Rs 0.00';
      prevBal.dataset.rawBalance = 0;
    }

    renderReturnItemsTable();
    updateReturnTotals();
    await loadNextReturnNo();
    switchSaleSubTab('return');
  }

  async function openReturnReceiptModal(data) {
    if (!retEl.modalReceipt || !retEl.receiptArea) return;
    const items = data.items || [];
    let formattedDate = '';
    try {
      const d = data.entryDate ? new Date(data.entryDate) : new Date();
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-GB');
      } else {
        formattedDate = data.entryDate || new Date().toLocaleDateString('en-GB');
      }
    } catch (_) {
      formattedDate = new Date().toLocaleDateString('en-GB');
    }
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // Load Live Settings configured in Settings
    let cfg = {
      title: 'SHAHZAIB TRADERS',
      subtitle: 'Dealers in Electrical Goods & Accessories',
      address: 'Main Bazar, Electrical Market, Lahore',
      phone: '0300-1234567',
      footer: 'Thank you for your business!\nGoods once sold cannot be returned without bill.\nNo warranty on burnt or short-circuit electrical items.',
      paperSize: '80mm',
      autoPrint: false
    };

    try {
      let set = null;
      if (window.settingsAPI?.getSettings) {
        set = await window.settingsAPI.getSettings();
      } else if (window.appData?.settings) {
        set = window.appData.settings;
      }
      if (set) {
        if (set.receiptHeaderTitle || set.storeName) cfg.title = set.receiptHeaderTitle || set.storeName;
        if (set.receiptSubtitle) cfg.subtitle = set.receiptSubtitle;
        if (set.address) cfg.address = set.address;
        if (set.contactPhone) cfg.phone = set.contactPhone;
        if (set.taxNumber || set.ntn || set.strn) cfg.taxNumber = set.taxNumber || set.ntn || set.strn;
        if (set.receiptFooterNote) cfg.footer = set.receiptFooterNote;
        if (set.paperSize) cfg.paperSize = set.paperSize;
        if (set.autoPrintVoucher === 'true') cfg.autoPrint = true;
      }
    } catch (err) {
      console.warn('Could not load settings for return receipt:', err);
    }

    let rowsHtml = '';
    items.forEach((it) => {
      const name = it.productTitle || it.title || it.name || it.productCode || 'Item';
      const qty = Number(it.totalQty ?? it.quantity ?? it.qty ?? 1);
      const rate = Number(it.returnRate ?? it.rate ?? 0);
      const lineTotal = Number(it.netAmount ?? (qty * rate) ?? 0);

      rowsHtml += `
        <tr>
          <td>${window.escapeHtml(name)}</td>
          <td style="text-align: center;">${qty}</td>
          <td style="text-align: right;">${rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    const returnNo = data.returnNo || 'SR-0001';
    const totalRefund = Number(data.totalAmount || 0);

    retEl.receiptArea.innerHTML = `
      <div class="thermal-slip-preview-container" style="background: #f1f5f9; padding: 20px; display: flex; justify-content: center; align-items: flex-start; max-height: 72vh; overflow-y: auto;">
        <div class="thermal-slip-paper" data-paper-size="${cfg.paperSize}">
          <div class="thermal-slip-header">
            <div class="thermal-slip-title">${window.escapeHtml(cfg.title)}</div>
            ${cfg.subtitle ? `<div class="thermal-slip-meta">${window.escapeHtml(cfg.subtitle)}</div>` : ''}
            ${cfg.address ? `<div class="thermal-slip-meta">${window.escapeHtml(cfg.address)}</div>` : ''}
            ${cfg.phone ? `<div class="thermal-slip-meta">Ph: ${window.escapeHtml(cfg.phone)}</div>` : ''}
            ${cfg.taxNumber ? `<div class="thermal-slip-meta">${window.escapeHtml(cfg.taxNumber)}</div>` : ''}
          </div>

          <div class="thermal-slip-row">
            <span>Return Slip: <strong>${window.escapeHtml(returnNo)}</strong></span>
            <span>${formattedDate} ${formattedTime}</span>
          </div>
          <div class="thermal-slip-row">
            <span>Customer: <strong>${window.escapeHtml(data.partyTitle || 'Customer')}</strong></span>
            <span>${window.escapeHtml(data.refundMode || 'Cash')} Return</span>
          </div>
          ${data.saleVoucherRef ? `
          <div class="thermal-slip-row">
            <span>Orig Invoice Ref:</span>
            <strong>${window.escapeHtml(data.saleVoucherRef)}</strong>
          </div>` : ''}

          <table class="thermal-slip-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 8px;">No returned items</td></tr>'}
            </tbody>
          </table>

          <div class="thermal-slip-totals">
            <div class="thermal-slip-row">
              <span>Items Returned:</span>
              <span><strong>${items.length}</strong> (${data.totalPieces || 0} pcs)</span>
            </div>
            <div class="thermal-slip-grandtotal" style="color: #b91c1c;">
              <span>TOTAL REFUND:</span>
              <span>Rs ${totalRefund.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="thermal-slip-barcode">||||| | |||| ||| |||||</div>
          <div class="thermal-slip-meta" style="text-align: center;">* ${window.escapeHtml(returnNo)} *</div>

          <div class="thermal-slip-footer">
            *** Stock returned to inventory ***
${window.escapeHtml(cfg.footer)}
          </div>
        </div>
      </div>
    `;

    retEl.modalReceipt.classList.remove('hidden');

    if (cfg.autoPrint) {
      setTimeout(() => {
        printIsolatedHtml(retEl.receiptArea ? retEl.receiptArea.innerHTML : '', { template: 'thermal', paperWidth: '80mm' });
      }, 350);
    }
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
        <td class="text-center" style="white-space: nowrap;">
          <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="window.SalesModule.reprintReturn('${r.id}')" title="Reprint Memo">🖨️ Memo</button>
          <button type="button" class="btn btn-primary btn-sm" style="padding: 2px 8px; font-size: 11px; margin-left: 4px; background: #dc2626; border-color: #dc2626;" onclick="window.SalesModule.editReturn('${r.id}')" title="Edit Return">✏️ Edit</button>
          <button type="button" class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 11px; margin-left: 4px;" onclick="window.SalesModule.deleteReturnPrompt('${r.id}')" title="Delete Return">🗑️</button>
        </td>
      `;
      retEl.historyTableBody.appendChild(tr);
    });
  }

  // ========================================================
  // SALE RETURN MASTER TABLE & MODAL CONTROLS
  // ========================================================
  async function openAddReturnModal(returnToEdit = null) {
    if (!returnToEdit) {
      resetReturnForm();
      await loadNextReturnNo();
    }
    if (retEl.modalReturnVoucherNoDisplay) {
      retEl.modalReturnVoucherNoDisplay.textContent = retEl.voucherNo?.value || returnState.returnNo || 'SR-0001';
    }
    if (retEl.modalAddReturn) {
      retEl.modalAddReturn.classList.remove('hidden');
      setTimeout(() => retEl.productSearchInput?.focus(), 100);
    }
  }

  function closeAddReturnModal() {
    if (retEl.modalAddReturn) retEl.modalAddReturn.classList.add('hidden');
  }

  async function loadAndRenderReturnsTable() {
    try {
      let returns = [];
      if (window.salesReturnAPI?.getReturns) {
        returns = await window.salesReturnAPI.getReturns();
      } else {
        returns = window.appData?.sales_returns || [];
      }
      returnState.returnsList = Array.isArray(returns) ? returns : [];
      applyReturnsFilter();
    } catch (err) {
      console.error('Failed to load returns list:', err);
    }
  }

  function applyReturnsFilter() {
    if (!retEl.returnsMasterTableBody) return;
    const q = (retEl.returnFilterSearch?.value || '').trim().toLowerCase();
    const dateVal = retEl.returnFilterDate?.value || '';
    const modeVal = retEl.returnFilterMode?.value || '';

    const filtered = (returnState.returnsList || []).filter(r => {
      if (q) {
        const rNo = (r.returnNo || '').toLowerCase();
        const ref = (r.saleVoucherRef || '').toLowerCase();
        const party = (r.partyTitle || '').toLowerCase();
        if (!rNo.includes(q) && !ref.includes(q) && !party.includes(q)) return false;
      }
      if (dateVal) {
        const rDate = (r.entryDate || '').slice(0, 10);
        if (rDate !== dateVal) return false;
      }
      if (modeVal) {
        const rMode = (r.refundMode || '').toLowerCase();
        if (rMode !== modeVal.toLowerCase()) return false;
      }
      return true;
    });

    renderReturnsMasterTable(filtered);
  }

  function resetReturnsFilters() {
    if (retEl.returnFilterSearch) retEl.returnFilterSearch.value = '';
    if (retEl.returnFilterDate) retEl.returnFilterDate.value = '';
    if (retEl.returnFilterMode) retEl.returnFilterMode.value = '';
    applyReturnsFilter();
  }

  function renderReturnsMasterTable(list) {
    if (!retEl.returnsMasterTableBody) return;
    retEl.returnsMasterTableBody.innerHTML = '';

    if (retEl.returnResultsCounter) {
      retEl.returnResultsCounter.textContent = `${list.length} Return${list.length === 1 ? '' : 's'}`;
    }

    if (!window.salesReturnPagination && window.createTablePagination) {
      window.salesReturnPagination = window.createTablePagination({
        container: '#salesReturnView .return-grid-container',
        tbody: retEl.returnsMasterTableBody,
        emptyStateEl: retEl.returnsEmptyState,
        onRenderPage: (slice, startIdx) => {
          retEl.returnsMasterTableBody.innerHTML = '';
          slice.forEach((r, idx) => {
            const globalSr = startIdx + idx + 1;
            const modeBadge = (r.refundMode === 'Cash')
              ? '<span class="badge-condition-good" style="background: #dcfce7; color: #166534;">Cash</span>'
              : '<span class="badge-price-pill" style="font-size: 11px; background: #e0f2fe; color: #0369a1;">Credit</span>';

            const menuId = `retMenu_${r.id || globalSr}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td class="text-center font-num text-secondary">${globalSr}</td>
              <td class="text-center font-num font-bold text-danger">${window.escapeHtml(r.returnNo || '-')}</td>
              <td class="text-center font-num">${r.entryDate || '-'}</td>
              <td class="text-center font-num font-bold text-primary">${window.escapeHtml(r.saleVoucherRef || '-')}</td>
              <td class="font-bold text-ellipsis" title="${window.escapeHtml(r.partyTitle || '-')}">${window.escapeHtml(r.partyTitle || 'Customer')}</td>
              <td class="text-center font-num font-bold">${r.totalItems || 1}</td>
              <td class="text-right font-num font-bold text-danger">Rs ${Number(r.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-center">${modeBadge}</td>
              <td class="text-center">
                <div class="dots-wrapper">
                  <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
                    ⋮
                  </button>
                  <div id="${menuId}" class="action-menu hidden">
                    <button type="button" class="action-item" onclick="window.SalesModule.reprintReturn('${r.id}')">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                      </svg>
                      <span>Print Return Memo</span>
                    </button>
                    <button type="button" class="action-item" onclick="window.SalesModule.editReturn('${r.id}')">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Edit Return</span>
                    </button>
                    <button type="button" class="action-item action-danger" onclick="window.SalesModule.deleteReturnPrompt('${r.id}')">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Delete Return</span>
                    </button>
                  </div>
                </div>
              </td>
            `;
            retEl.returnsMasterTableBody.appendChild(tr);
          });
        }
      });
    }

    if (window.salesReturnPagination) {
      window.salesReturnPagination.setItems(list, false);
      return;
    }

    if (list.length === 0) {
      if (retEl.returnsEmptyState) retEl.returnsEmptyState.style.display = 'flex';
      return;
    }

    if (retEl.returnsEmptyState) retEl.returnsEmptyState.style.display = 'none';

    list.forEach((r, idx) => {
      const modeBadge = (r.refundMode === 'Cash')
        ? '<span class="badge-condition-good" style="background: #dcfce7; color: #166534;">Cash</span>'
        : '<span class="badge-price-pill" style="font-size: 11px; background: #e0f2fe; color: #0369a1;">Credit</span>';

      const menuId = `retMenu_${r.id || idx}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-num text-secondary">${idx + 1}</td>
        <td class="text-center font-num font-bold text-danger">${window.escapeHtml(r.returnNo || '-')}</td>
        <td class="text-center font-num">${r.entryDate || '-'}</td>
        <td class="text-center font-num font-bold text-primary">${window.escapeHtml(r.saleVoucherRef || '-')}</td>
        <td class="font-bold text-ellipsis" title="${window.escapeHtml(r.partyTitle || '-')}">${window.escapeHtml(r.partyTitle || 'Customer')}</td>
        <td class="text-center font-num font-bold">${r.totalItems || 1}</td>
        <td class="text-right font-num font-bold text-danger">Rs ${Number(r.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-center">${modeBadge}</td>
        <td class="text-center">
          <div class="dots-wrapper">
            <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
              ⋮
            </button>
            <div id="${menuId}" class="action-menu hidden">
              <button type="button" class="action-item" onclick="window.SalesModule.reprintReturn('${r.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Return Memo</span>
              </button>
              <button type="button" class="action-item" onclick="window.SalesModule.editReturn('${r.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Return</span>
              </button>
              <button type="button" class="action-item action-danger" onclick="window.SalesModule.deleteReturnPrompt('${r.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete Return</span>
              </button>
            </div>
          </div>
        </td>
      `;
      retEl.returnsMasterTableBody.appendChild(tr);
    });
  }

  async function editReturn(id) {
    const ret = (returnState.returnsList || []).find(r => String(r.id) === String(id));
    if (!ret) {
      if (window.showToast) window.showToast('Return record not found', 'error');
      return;
    }
    returnState.returnId = ret.id;
    returnState.returnNo = ret.returnNo;
    let items = [];
    try {
      items = typeof ret.itemsJson === 'string' ? JSON.parse(ret.itemsJson) : (ret.items || []);
    } catch (e) {
      items = [];
    }
    returnState.items = Array.isArray(items) ? [...items] : [];

    if (retEl.voucherNo) retEl.voucherNo.value = ret.returnNo || '';
    if (retEl.entryDate) retEl.entryDate.value = (ret.entryDate || '').slice(0, 10);
    if (retEl.originalBillRef) retEl.originalBillRef.value = ret.saleVoucherRef || '';
    if (retEl.refundMode) retEl.refundMode.value = ret.refundMode || 'Credit';
    if (retEl.partyTypeSelect) retEl.partyTypeSelect.value = ret.partyTypeId || '';
    selectReturnPartyType(ret.partyTypeId || '');
    if (retEl.customerSelect) retEl.customerSelect.value = ret.partyId || '';
    const custName = document.getElementById('returnCustomerName');
    if (custName) custName.value = ret.partyTitle || '';
    const custPhone = document.getElementById('returnCustomerPhone');
    if (custPhone) custPhone.value = ret.customerPhone || '';
    const remInput = document.getElementById('returnRemarksInput');
    if (remInput) remInput.value = ret.description || '';
    const discInput = document.getElementById('returnSpecialDeduction');
    if (discInput) discInput.value = Number(ret.discount || 0);

    renderReturnItemsTable();
    updateReturnTotals();

    // Close Return History modal if open and switch to Return subview
    if (retEl.modalHistory) retEl.modalHistory.classList.add('hidden');
    switchSaleSubTab('return');
    const returnPage = document.getElementById('returnEntryPage');
    if (returnPage) returnPage.scrollTop = 0;
    if (window.showToast) window.showToast(`Return Voucher ${ret.returnNo} loaded for editing`, 'info');
  }

  function onActivateReturn() {
    populateReturnCustomers();
    initReturnPosCatalog();
    if (!returnState.returnNo) loadNextReturnNo();
  }

  function initReturnModule() {
    initReturnElements();
    initSubTabs();

    if (retEl.entryDate) retEl.entryDate.value = new Date().toISOString().slice(0, 10);

    // Modal controls for Add Sale Return
    if (retEl.btnOpenAddReturnModal) retEl.btnOpenAddReturnModal.addEventListener('click', () => openAddReturnModal());
    if (retEl.btnCloseAddReturnModal) retEl.btnCloseAddReturnModal.addEventListener('click', closeAddReturnModal);
    if (retEl.btnCancelAddReturnModal) retEl.btnCancelAddReturnModal.addEventListener('click', closeAddReturnModal);

    // Filter controls for Returns Master Table
    if (retEl.returnFilterSearch) retEl.returnFilterSearch.addEventListener('input', applyReturnsFilter);
    if (retEl.returnFilterDate) retEl.returnFilterDate.addEventListener('change', applyReturnsFilter);
    if (retEl.btnReturnFilterToday) {
      retEl.btnReturnFilterToday.addEventListener('click', () => {
        if (retEl.returnFilterDate) {
          retEl.returnFilterDate.value = new Date().toISOString().split('T')[0];
          applyReturnsFilter();
        }
      });
    }
    if (retEl.btnReturnFilterAll) {
      retEl.btnReturnFilterAll.addEventListener('click', () => {
        if (retEl.returnFilterDate) {
          retEl.returnFilterDate.value = '';
          applyReturnsFilter();
        }
      });
    }
    if (retEl.returnFilterMode) retEl.returnFilterMode.addEventListener('change', applyReturnsFilter);
    if (retEl.btnReturnResetFilters) retEl.btnReturnResetFilters.addEventListener('click', resetReturnsFilters);

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

    // Customer Selection & Quick Walk-In
    if (retEl.customerSelect) {
      retEl.customerSelect.addEventListener('change', (e) => {
        selectReturnCustomer(e.target.value);
      });
    }
    const btnQuickWalkIn = document.getElementById('btnReturnQuickWalkIn');
    if (btnQuickWalkIn) {
      btnQuickWalkIn.addEventListener('click', () => {
        if (retEl.customerSelect) retEl.customerSelect.value = '';
        selectReturnCustomer('');
      });
    }

    // Clear Return Slip
    const btnClearCart = document.getElementById('btnReturnClearCart');
    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        if (returnState.items.length === 0) return;
        if (confirm('Are you sure you want to clear all returned items?')) {
          returnState.items = [];
          renderReturnItemsTable();
          updateReturnTotals();
          if (window.showToast) window.showToast('Return slip cleared', 'info');
        }
      });
    }

    // Product Lookup (F1) buttons
    const btnReturnF1 = document.getElementById('btnReturnF1ProductLookup');
    if (btnReturnF1) {
      btnReturnF1.addEventListener('click', () => openProductLookupModal());
    }

    // Special Deduction Input
    const deductionInput = document.getElementById('returnSpecialDeduction');
    if (deductionInput) {
      deductionInput.addEventListener('input', updateReturnTotals);
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
      retEl.btnDoPrintReceipt.addEventListener('click', () => {
        printIsolatedHtml(retEl.receiptArea ? retEl.receiptArea.innerHTML : '', { template: 'thermal', paperWidth: '80mm' });
      });
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

    loadAndRenderReturnsTable();
  }

  function loadEstimateIntoBill(customerName, customerPhone, items = []) {
    switchSaleSubTab('sale');

    if (el.customerName) el.customerName.value = customerName || 'Walk-in Customer';
    if (el.customerPhone) el.customerPhone.value = customerPhone || '';

    saleState.items = [];

    const products = window.appData?.products || [];
    for (const item of items) {
      const p = products.find(prod => prod.id === item.productId || prod.code === item.productCode) || {
        id: item.productId || '',
        code: item.productCode || '',
        titleEng: item.productTitle || '',
        purchasePrice: 0,
        wholesalePrice: item.rate || 0,
        retailPrice: item.rate || 0,
        packSize: 1
      };

      const packSize = Number(p.packSize) || 1;
      const totalQty = Number(item.qty || item.totalQty || 1);
      const pQty = Math.floor(totalQty / packSize);
      const uQty = totalQty % packSize;
      const rate = Number(item.rate || item.salePrice || 0);
      const netAmount = totalQty * rate;

      saleState.items.push({
        id: `si-${Date.now()}-${saleState.items.length + 1}`,
        productId: p.id,
        productCode: p.code,
        productTitle: p.titleEng,
        packSize,
        packQty: pQty > 0 ? pQty : (packSize > 1 ? 0 : totalQty),
        unitQty: pQty > 0 ? uQty : (packSize > 1 ? totalQty : 0),
        totalQty,
        purchasePrice: Number(p.purchasePrice || 0),
        wholesalePrice: Number(p.wholesalePrice || 0),
        retailPrice: Number(p.retailPrice || 0),
        salePrice: rate,
        discountPercent: 0,
        discountAmount: 0,
        netAmount
      });
    }

    renderItemsTable();
    updateVoucherTotals();
    renderPosProductCatalog();
    updateSlipMeta();
    updateRightPanelVisibility();
    const countBadge = document.getElementById('posCartCountBadge');
    if (countBadge) countBadge.textContent = saleState.items.length;
  }

  // ========================================================
  // PUBLIC EXPORTS
  // ========================================================
  window.SalesModule = {
    init: () => {
      initSalesModule();
      initReturnModule();
    },
    loadEstimateIntoBill,
    renderA4SaleBill,
    renderThermalSaleBill,
    switchSubTab: switchSaleSubTab,
    openAddSaleModal,
    closeAddSaleModal,
    openAddReturnModal,
    closeAddReturnModal,
    loadAndRenderSalesTable,
    loadAndRenderReturnsTable,
    editSale,
    editReturn,
    onActivate: async () => {
      await loadPartyTypes();
      if (currentSaleSubTab === 'return') {
        onActivateReturn();
        await loadAndRenderReturnsTable();
      } else {
        populateProductDropdown();
        if (!saleState.voucherNo) await loadNextVoucherNo();
        await loadAndRenderSalesTable();
        renderPosProductCatalog();
        updateSlipMeta();
        updateRightPanelVisibility();
        const countBadge = document.getElementById('posCartCountBadge');
        if (countBadge) countBadge.textContent = saleState.items ? saleState.items.length : 0;
      }
    },
    refresh: () => {
      populateProductDropdown();
      loadPartyTypes();
      populateReturnProducts();
      loadAndRenderSalesTable();
      loadAndRenderReturnsTable();
      renderPosProductCatalog();
      updateSlipMeta();
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
    openRateChoiceModal,
    closeRateChoiceModal,
    confirmRateChoice,
    openProductLookupModal,
    closeProductLookupModal,
    selectF1Product,
    setBillPricingMode,
    toggleItemRate,
    changeItemRate,
    changeItemQty,
    changeItemDisc,
    clearBillCart,
    resetVoucher,
    saveSaleVoucher,
    openReceiptModal,
    adjustCartItemQty,
    addProductToCart,
    stepInputQty: (productId, delta) => {
      const p = (window.appData?.products || []).find(pr => String(pr.id) === String(productId) || String(pr.code) === String(productId));
      const stock = p ? Number(p.stockQty || 0) : 0;
      const inSlipItem = (saleState.items || []).find(it => String(it.productId) === String(productId) || (p && String(it.productCode) === String(p.code)));
      const inSlipQty = inSlipItem ? Number(inSlipItem.totalQty || 0) : 0;
      const remainingStock = Math.max(0, stock - inSlipQty);

      if (remainingStock <= 0) return;

      const inp = document.getElementById(`pos-qty-${productId}`);
      if (inp) {
        let val = Number(inp.value) || 1;
        val = val + delta;
        if (val < 1) val = 1;
        if (val > remainingStock) {
          val = remainingStock;
          if (window.showToast) window.showToast(`Maximum available stock reached (${remainingStock}).`, 'warning');
        }
        inp.value = val;
      }
    },
    handleAddClick: (productId) => {
      const inp = document.getElementById(`pos-qty-${productId}`);
      const qty = inp ? (Number(inp.value) || 1) : 1;
      addProductToCart(productId, qty);
    },
    setRowRate: (productId, mode) => {
      posCatalogState.rowRates[productId] = mode;
      const cartItem = (saleState.items || []).find(it => String(it.productId) === String(productId));
      if (cartItem) {
        const p = (window.appData?.products || []).find(pr => String(pr.id) === String(productId));
        if (p) {
          const rp = Number(p.retailPrice || 0);
          const wp = Number(p.wholesalePrice || 0);
          cartItem.salePrice = mode === 'wholesale' ? (wp || rp) : (rp || wp);
          cartItem.netAmount = cartItem.totalQty * cartItem.salePrice;
          renderItemsTable();
          updateVoucherTotals();
          updateSlipMeta();
        }
      }
      renderPosProductCatalog();
    },
    showPosRightView,
    changeSlipPage: (delta) => {
      const pageSize = saleState.slipPageSize || 5;
      const totalPages = Math.ceil(saleState.items.length / pageSize) || 1;
      const newPage = (saleState.slipCurrentPage || 1) + delta;
      if (newPage >= 1 && newPage <= totalPages) {
        saleState.slipCurrentPage = newPage;
        renderItemsTable();
      }
    },
    changeReturnSlipPage: (delta) => {
      const pageSize = returnState.slipPageSize || 5;
      const totalPages = Math.ceil(returnState.items.length / pageSize) || 1;
      const newPage = (returnState.slipCurrentPage || 1) + delta;
      if (newPage >= 1 && newPage <= totalPages) {
        returnState.slipCurrentPage = newPage;
        renderReturnItemsTable();
      }
    },
    removeItem: removeSaleItem,
    removeReturnItem,
    adjustReturnCartItemQty,
    setReturnItemCondition,
    updateReturnItemRate,
    setReturnItemQty,
    openReturnHistoryModal,
    openHistoryModal,
    resetReturnForm,
    saveSaleReturn,
    showReturnPosRightView,
    handleReturnAddClick: (productId) => {
      const inp = document.getElementById(`return-pos-qty-${productId}`);
      const qty = inp ? (Number(inp.value) || 1) : 1;
      addReturnProductToCart(productId, qty);
    },
    stepReturnInputQty: (productId, delta) => {
      const inp = document.getElementById(`return-pos-qty-${productId}`);
      if (inp) {
        let val = Number(inp.value) || 1;
        val = Math.max(1, val + delta);
        inp.value = val;
      }
    },
    setReturnRowRate: (productId, mode) => {
      posReturnCatalogState.rowRates[productId] = mode;
      const cartItem = (returnState.items || []).find(it => String(it.productId) === String(productId));
      if (cartItem) {
        const p = (window.appData?.products || []).find(pr => String(pr.id) === String(productId));
        if (p) {
          const rp = Number(p.retailPrice || 0);
          const wp = Number(p.wholesalePrice || 0);
          cartItem.returnRate = mode === 'wholesale' ? (wp || rp) : (rp || wp);
          cartItem.netAmount = cartItem.totalQty * cartItem.returnRate;
          renderReturnItemsTable();
          updateReturnTotals();
          updateReturnSlipMeta();
        }
      }
      renderReturnPosProductCatalog();
    },
    reprintSale: (id) => {
      const s = saleState.salesList.find(x => String(x.id) === String(id));
      if (s) {
        let items = [];
        try { items = typeof s.itemsJson === 'string' ? JSON.parse(s.itemsJson) : (s.items || []); } catch (e) {}
        openReceiptModal({ ...s, items });
      }
    },
    reprintReturn: (id) => {
      const r = returnState.returnsList.find(x => String(x.id) === String(id));
      if (r) {
        let items = [];
        try { items = typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : (r.items || []); } catch (e) {}
        openReturnReceiptModal({ ...r, items });
      }
    },
    convertEstimateToPaid,
    openSaleHistoryPopupModal,
    deleteSalePrompt: (id) => {
      const s = (saleState.salesList || []).find(x => String(x.id) === String(id));
      const isEst = (s && s.billStatus === 'Estimated');
      const msg = isEst
        ? `Are you sure you want to delete Estimated Bill ${s?.voucherNo || ''}?\n(No inventory was deducted for this estimate.)`
        : 'Are you sure you want to delete this sale voucher?\nItems stock will be restored back to inventory!';

      if (!confirm(msg)) return;
      window.salesAPI?.deleteSale(id).then(async () => {
        if (window.showToast) window.showToast(isEst ? 'Estimated bill deleted' : 'Sale deleted and stock restored', 'success');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
        await loadAndRenderSalesTable();
        if (el.modalHistory && !el.modalHistory.classList.contains('hidden')) {
          filterAndRenderModalHistory();
        }
      }).catch(err => {
        alert('Delete failed: ' + err.message);
      });
    },
    deleteReturnPrompt: (id) => {
      if (!confirm('Are you sure you want to delete this sale return voucher?\nNote: Returned items stock will be deducted back from inventory!')) return;
      window.salesReturnAPI?.deleteReturn(id).then(async () => {
        if (window.showToast) window.showToast('Sale return deleted and stock deducted', 'success');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
        await loadAndRenderReturnsTable();
      }).catch(err => {
        alert('Delete failed: ' + err.message);
      });
    },
    renderA4SaleBill,
    renderThermalSaleBill
  };

  // Auto initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.SalesModule.init();
  });

})();

