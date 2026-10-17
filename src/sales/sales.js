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
    salesList: [],
    slipCurrentPage: 1,
    slipPageSize: 9
  };

  // DOM Elements Cache
  const el = {};

  
  // POS Live Product Catalog State
  let posCatalogState = {
    searchQuery: '',
    selectedCategory: '',
    stockFilter: 'all', // 'all' | 'instock'
    defaultRateMode: 'retail', // 'retail' | 'wholesale'
    rowRates: {}, // productId -> 'retail' | 'wholesale'
    currentPage: 1,
    pageSize: 10
  };

  function renderCatalogPagination(containerId, currentPage, totalPages, totalItems, pageSize, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      return;
    }

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    let html = `
      <div class="pos-pagination-info">
        Showing <strong>${startIdx}–${endIdx}</strong> of <strong>${totalItems}</strong> products (Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>)
      </div>
      <div class="pos-pagination-controls">
        <button type="button" class="pos-page-btn pos-page-nav" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} title="Previous Page">
          ‹ Prev
        </button>
    `;

    pages.forEach(p => {
      if (p === '...') {
        html += `<span class="pos-page-ellipsis">…</span>`;
      } else {
        const isActive = p === currentPage;
        html += `
          <button type="button" class="pos-page-btn ${isActive ? 'active' : ''}" data-page="${p}" ${isActive ? 'disabled' : ''}>
            ${p}
          </button>
        `;
      }
    });

    html += `
        <button type="button" class="pos-page-btn pos-page-nav" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} title="Next Page">
          Next ›
        </button>
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = Number(btn.getAttribute('data-page'));
        if (targetPage && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
          onPageChange(targetPage);
        }
      });
    });
  }

  function getFilteredProducts() {
    const prods = window.appData?.products || [];
    const q = (posCatalogState.searchQuery || '').trim().toLowerCase();
    const cat = posCatalogState.selectedCategory;
    const stockOnly = posCatalogState.stockFilter === 'instock';

    return prods.filter(p => {
      if (stockOnly && Number(p.stockQty || 0) <= 0) return false;
      if (cat && String(p.categoryId) !== String(cat)) return false;
      if (q) {
        const code = (p.code || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const title = (p.titleEng || '').toLowerCase();
        const titleUrdu = (p.titleUrdu || '').toLowerCase();
        const catName = (p.categoryName || '').toLowerCase();
        if (!code.includes(q) && !barcode.includes(q) && !title.includes(q) && !titleUrdu.includes(q) && !catName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  function renderPosProductCatalog() {
    const tbody = document.getElementById('posProductsTableBody');
    const emptyEl = document.getElementById('posProductsEmpty');
    const countText = document.getElementById('posProductsCountText');
    if (!tbody) return;

    const filtered = getFilteredProducts();
    const totalCount = (window.appData?.products || []).length;

    if (countText) {
      if (filtered.length === totalCount) {
        countText.textContent = `Showing all ${totalCount} products`;
      } else {
        countText.textContent = `Filtered ${filtered.length} of ${totalCount} products`;
      }
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      const pag = document.getElementById('posCatalogPagination');
      if (pag) pag.innerHTML = '';
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const pageSize = posCatalogState.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (posCatalogState.currentPage > totalPages) {
      posCatalogState.currentPage = totalPages;
    }
    if (posCatalogState.currentPage < 1) {
      posCatalogState.currentPage = 1;
    }

    const startIdx = (posCatalogState.currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const displaySlice = filtered.slice(startIdx, endIdx);

    tbody.innerHTML = '';

    displaySlice.forEach(p => {
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
      const selectedMode = posCatalogState.rowRates[p.id] || posCatalogState.defaultRateMode;
      const inSlipItem = (saleState.items || []).find(it => String(it.productId) === String(p.id) || String(it.productCode) === String(p.code));
      const inSlipQty = inSlipItem ? Number(inSlipItem.totalQty || 0) : 0;
      const remainingStock = Math.max(0, stock - inSlipQty);
      const isOutOfStock = stock <= 0;
      const isMaxInCart = !isOutOfStock && remainingStock <= 0;

      const tr = document.createElement('tr');
      tr.id = `pos-row-${p.id}`;
      tr.innerHTML = `
        <td class="col-code font-num" style="text-align: center;">
          <span class="pos-code-clean">${window.escapeHtml(p.code || '')}</span>
        </td>
        <td class="col-name" style="text-align: left;">
          <div class="pos-prod-name">${window.escapeHtml(p.titleEng || 'Untitled')}</div>
          ${p.packSize > 1 ? `<div class="pos-prod-sub">Pack: ${p.packSize}</div>` : ''}
        </td>
        <td class="col-cat" style="text-align: left;">
          <span class="pos-cat-clean">${window.escapeHtml(p.categoryName || 'General')}</span>
        </td>
        <td class="col-stock" style="text-align: center;">
          <span class="pos-stock-clean ${stockClass}">${stockText}</span>
        </td>
        <td class="col-retail font-num" style="text-align: center;">
          <button type="button" class="pos-rate-btn-clean pos-rp-btn ${selectedMode === 'retail' ? 'selected' : ''}"
            onclick="window.SalesModule.setRowRate('${p.id}', 'retail')" title="Select Retail Rate">
            ${selectedMode === 'retail' ? '<span class="rate-dot">●</span> ' : ''}Rs ${rp.toLocaleString()}
          </button>
        </td>
        <td class="col-wholesale font-num" style="text-align: center;">
          <button type="button" class="pos-rate-btn-clean pos-wp-btn ${selectedMode === 'wholesale' ? 'selected' : ''}"
            onclick="window.SalesModule.setRowRate('${p.id}', 'wholesale')" title="Select Wholesale Rate">
            ${selectedMode === 'wholesale' ? '<span class="rate-dot">●</span> ' : ''}Rs ${wp.toLocaleString()}
          </button>
        </td>
        <td class="col-qty" style="text-align: center;">
          <div class="pos-qty-stepper-clean ${isOutOfStock || isMaxInCart ? 'is-disabled' : ''}">
            <button type="button" class="pos-qty-btn-clean" ${isOutOfStock || isMaxInCart ? 'disabled' : ''} onclick="window.SalesModule.stepInputQty('${p.id}', -1)" title="Decrease">−</button>
            <input type="number" id="pos-qty-${p.id}" class="pos-qty-input-clean font-num" min="${isOutOfStock || isMaxInCart ? 0 : 1}" max="${remainingStock}" step="1" value="${isOutOfStock || isMaxInCart ? 0 : 1}" ${isOutOfStock || isMaxInCart ? 'disabled' : ''}>
            <button type="button" class="pos-qty-btn-clean" ${isOutOfStock || isMaxInCart ? 'disabled' : ''} onclick="window.SalesModule.stepInputQty('${p.id}', 1)" title="Increase">+</button>
          </div>
        </td>
        <td class="col-action" style="text-align: center;">
          ${isOutOfStock ? `
            <button type="button" id="pos-btn-add-${p.id}" class="pos-btn-add-clean pos-btn-disabled" disabled title="Product is Out of Stock">
              Out of Stock
            </button>
          ` : isMaxInCart ? `
            <button type="button" id="pos-btn-add-${p.id}" class="pos-btn-add-clean pos-btn-disabled" disabled title="Max stock already added in slip (${inSlipQty})">
              In Slip (${inSlipQty})
            </button>
          ` : `
            <button type="button" id="pos-btn-add-${p.id}" class="pos-btn-add-clean"
              onclick="window.SalesModule.handleAddClick('${p.id}')" title="Add to Voucher Cart">
              + Add ${inSlipQty > 0 ? `(${inSlipQty})` : ''}
            </button>
          `}
        </td>
      `;

      if (!isOutOfStock && !isMaxInCart) {
        const qtyInput = tr.querySelector(`#pos-qty-${p.id}`);
        if (qtyInput) {
          qtyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              window.SalesModule.handleAddClick(p.id);
            }
          });
          qtyInput.addEventListener('change', () => {
            let val = Number(qtyInput.value) || 1;
            if (val < 1) val = 1;
            if (val > remainingStock) {
              if (window.showToast) window.showToast(`Only ${remainingStock} available in stock for "${p.titleEng}".`, 'warning');
              val = remainingStock;
            }
            qtyInput.value = val;
          });
        }
      }

      tbody.appendChild(tr);
    });

    renderCatalogPagination(
      'posCatalogPagination',
      posCatalogState.currentPage,
      totalPages,
      filtered.length,
      pageSize,
      (newPage) => {
        posCatalogState.currentPage = newPage;
        renderPosProductCatalog();
      }
    );
  }

  function addProductToCart(productId, quantity = 1, forcedRate = null) {
    const p = (window.appData?.products || []).find(pr => String(pr.id) === String(productId) || String(pr.code) === String(productId));
    if (!p) {
      if (window.showToast) window.showToast('Product not found', 'warning');
      return;
    }

    const stock = Number(p.stockQty || 0);
    if (stock <= 0) {
      if (window.showToast) window.showToast(`Cannot add: "${p.titleEng}" is Out of Stock (0 available).`, 'error');
      return;
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);
    const existingIdx = saleState.items.findIndex(it => String(it.productId) === String(p.id) || String(it.productCode) === String(p.code));
    const existingQty = existingIdx !== -1 ? Number(saleState.items[existingIdx].totalQty || 0) : 0;

    let qtyToAdd = requestedQty;
    if (existingQty + requestedQty > stock) {
      const canAdd = Math.max(0, stock - existingQty);
      if (canAdd <= 0) {
        if (window.showToast) {
          window.showToast(`Cannot add: "${p.titleEng}" is already at maximum available stock (${stock}) in slip.`, 'warning');
        }
        return;
      }
      qtyToAdd = canAdd;
      if (window.showToast) {
        window.showToast(`Only ${canAdd} more "${p.titleEng}" added (Stock: ${stock}, already in slip: ${existingQty}).`, 'warning');
      }
    }

    const costPrice = Number(p.purchasePrice || p.averageCost || 0);
    const wholesalePrice = Number(p.wholesalePrice || 0);
    const retailPrice = Number(p.retailPrice || 0);

    let rate = forcedRate;
    if (!rate) {
      const chosenMode = posCatalogState.rowRates[p.id] || posCatalogState.defaultRateMode;
      rate = chosenMode === 'wholesale' ? (wholesalePrice || retailPrice) : (retailPrice || wholesalePrice);
    }
    rate = Number(rate) || 0;

    const pageSize = saleState.slipPageSize || 9;
    if (existingIdx !== -1) {
      saleState.items[existingIdx].totalQty += qtyToAdd;
      saleState.items[existingIdx].packQty = Math.floor(saleState.items[existingIdx].totalQty / (p.packSize || 1));
      saleState.items[existingIdx].unitQty = saleState.items[existingIdx].totalQty % (p.packSize || 1);
      saleState.items[existingIdx].netAmount = saleState.items[existingIdx].totalQty * saleState.items[existingIdx].salePrice;
      saleState.slipCurrentPage = Math.floor(existingIdx / pageSize) + 1;
    } else {
      const grossLine = qtyToAdd * rate;
      saleState.items.push({
        id: `si-${Date.now()}-${saleState.items.length + 1}`,
        productId: p.id,
        productCode: p.code,
        productTitle: p.titleEng,
        packSize: p.packSize || 1,
        packQty: Math.floor(qtyToAdd / (p.packSize || 1)),
        unitQty: qtyToAdd % (p.packSize || 1),
        totalQty: qtyToAdd,
        purchasePrice: costPrice,
        wholesalePrice: wholesalePrice,
        retailPrice: retailPrice,
        salePrice: rate,
        discountPercent: 0,
        discountAmount: 0,
        netAmount: grossLine
      });
      saleState.slipCurrentPage = Math.ceil(saleState.items.length / pageSize);
    }

    renderItemsTable();
    updateVoucherTotals();
    updateSlipMeta();
    renderPosProductCatalog();

    const addBtn = document.getElementById(`pos-btn-add-${p.id}`);
    if (addBtn && !addBtn.disabled) {
      addBtn.classList.add('added-flash');
      const origHtml = addBtn.innerHTML;
      addBtn.innerHTML = '<span>✓ Added</span>';
      setTimeout(() => {
        addBtn.classList.remove('added-flash');
        addBtn.innerHTML = origHtml;
      }, 700);
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
    renderPosProductCatalog();
  }

  function updateSlipMeta() {
    const currentTypedName = el.customerName?.value?.trim();
    const chosenCustomer = saleState.selectedCustomer;
    const customerName = currentTypedName || (chosenCustomer ? (chosenCustomer.name || chosenCustomer.partyTitle) : 'Walk-in Cash Customer');
    
    const custDisplay = document.getElementById('posSlipCustomerDisplay');
    if (custDisplay) custDisplay.textContent = customerName;

    const voucherNoDisplay = document.getElementById('saleVoucherNoDisplay');
    const vNo = el.voucherNo?.value || saleState.voucherNo || '-';
    if (voucherNoDisplay) voucherNoDisplay.textContent = vNo;

    const barcodeMeta = document.getElementById('posSlipBarcodeMeta');
    if (barcodeMeta) barcodeMeta.textContent = `* ${vNo} *`;

    const dateDisplay = document.getElementById('posSlipDateDisplay');
    if (dateDisplay) {
      const rawDate = el.entryDate?.value;
      dateDisplay.textContent = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    }

    const payDisplay = document.getElementById('posSlipPaymentDisplay');
    if (payDisplay) {
      const mode = el.paymentType?.value || 'Cash';
      payDisplay.textContent = mode === 'Credit' ? 'Credit / Ledger' : (mode === 'Bank' ? 'Bank Transfer' : 'Cash Sale');
      payDisplay.style.color = mode === 'Credit' ? '#dc2626' : '#16a34a';
    }

    const prevBalRow = document.getElementById('posSlipPrevBalRow');
    const prevBalDisplay = document.getElementById('posSlipPrevBalDisplay');
    const rawPrevBal = Number(el.customerPrevBalance?.dataset?.rawBalance || 0);
    if (prevBalRow) {
      prevBalRow.style.display = rawPrevBal > 0 ? 'flex' : 'none';
      if (prevBalDisplay) prevBalDisplay.textContent = `Rs ${rawPrevBal.toLocaleString()}`;
    }

    const prevBalBox = document.getElementById('posPrevBalanceBox');
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
    const titleEl = document.getElementById('posSlipCompanyTitle');
    const subEl = document.getElementById('posSlipCompanySubtitle');
    const addrEl = document.getElementById('posSlipCompanyAddress');
    const phoneEl = document.getElementById('posSlipCompanyPhone');

    const comp = sharedCompanyInfo || {};
    if (titleEl && comp.companyName) titleEl.textContent = comp.companyName;
    if (subEl && comp.businessTagline) subEl.textContent = comp.businessTagline;
    if (addrEl && comp.address) addrEl.textContent = comp.address;
    if (phoneEl && comp.phone) phoneEl.textContent = `Ph: ${comp.phone}`;
  }

  function renderPosSlipItems() {
    const tbody = document.getElementById('posSlipItemsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!saleState.items || saleState.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px 0;">No items in voucher</td></tr>';
      return;
    }

    saleState.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: left; padding: 5px 2px; vertical-align: top;">
          <div style="font-weight: 700; color: #0f172a;">${window.escapeHtml(item.productTitle)}</div>
        </td>
        <td style="text-align: center; padding: 5px 2px; vertical-align: top; font-weight: 700;" class="font-num">
          ${item.totalQty}
        </td>
        <td style="text-align: right; padding: 5px 2px; vertical-align: top;" class="font-num">
          ${Number(item.salePrice || 0).toLocaleString()}
        </td>
        <td style="text-align: right; padding: 5px 2px; vertical-align: top; font-weight: 800;" class="font-num">
          ${Number(item.netAmount || 0).toLocaleString()}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function showPosRightView(view) {
    updateRightPanelVisibility();
    renderItemsTable();
    updateVoucherTotals();
  }

  function updateRightPanelVisibility() {
    const rightPanel = document.getElementById('posRightPanel');
    if (rightPanel) {
      rightPanel.classList.remove('hidden');
    }
  }

  function initPosCatalog() {
    updateRightPanelVisibility();
    const searchInput = document.getElementById('posProductSearch');
    const clearBtn = document.getElementById('posClearSearch');
    const catSelect = document.getElementById('posCategoryFilter');
    const stockSelect = document.getElementById('posStockFilter');
    const rateSelect = document.getElementById('posRateModeSelect');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        posCatalogState.searchQuery = e.target.value.trim().toLowerCase();
        posCatalogState.currentPage = 1;
        renderPosProductCatalog();
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const matching = getFilteredProducts();
          if (matching.length > 0) {
            addProductToCart(matching[0].id, 1);
            searchInput.select();
          }
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          posCatalogState.searchQuery = '';
          posCatalogState.currentPage = 1;
          renderPosProductCatalog();
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
        posCatalogState.selectedCategory = e.target.value;
        posCatalogState.currentPage = 1;
        renderPosProductCatalog();
      });
    }

    if (stockSelect) {
      stockSelect.value = posCatalogState.stockFilter || 'all';
      stockSelect.addEventListener('change', (e) => {
        posCatalogState.stockFilter = e.target.value;
        posCatalogState.currentPage = 1;
        renderPosProductCatalog();
      });
    }

    if (rateSelect) {
      rateSelect.value = posCatalogState.defaultRateMode || 'retail';
      rateSelect.addEventListener('change', (e) => {
        posCatalogState.defaultRateMode = e.target.value;
        renderPosProductCatalog();
      });
    }

    if (el.customerName) el.customerName.addEventListener('input', updateSlipMeta);
    if (el.customerSelect) el.customerSelect.addEventListener('change', updateSlipMeta);
    if (el.partyTypeSelect) el.partyTypeSelect.addEventListener('change', updateSlipMeta);
    if (el.paymentType) el.paymentType.addEventListener('change', updateSlipMeta);
    if (el.entryDate) el.entryDate.addEventListener('change', updateSlipMeta);

    window.addEventListener('keydown', (e) => {
      if (window.currentTab !== 'sale') return;
      if (e.key === 'F1') {
        e.preventDefault();
        const s = document.getElementById('posProductSearch');
        if (s) { s.focus(); s.select(); }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        resetVoucher();
      }
      if ((e.ctrlKey && e.key.toLowerCase() === 's') || e.key === 'F10') {
        e.preventDefault();
        saveSaleVoucher();
      }
    });

    renderPosProductCatalog();
    updateSlipMeta();
    updateSlipCompanyHeader();
    
    const btnDone = document.getElementById('btnPosDone');
    if (btnDone) {
      btnDone.addEventListener('click', () => showPosRightView('slip'));
    }

    const btnBackToCart = document.getElementById('btnPosBackToCart');
    if (btnBackToCart) {
      btnBackToCart.addEventListener('click', () => showPosRightView('cart'));
    }

    const btnClearCart = document.getElementById('btnPosClearCart');
    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        if (saleState.items.length === 0) return;
        if (confirm('Are you sure you want to clear all items from the cart?')) {
          saleState.items = [];
          renderItemsTable();
          showPosRightView('cart');
        }
      });
    }

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
  function selectProduct(p) {
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
      const pageSize = saleState.slipPageSize || 9;
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

    renderPosSlipItems();
    if (!el.itemsTableBody) return;
    el.itemsTableBody.innerHTML = '';

    const emptyState = document.getElementById('saleItemsEmptyState');
    const paginationBar = document.getElementById('posSlipPaginationBar');
    const btnSell = document.getElementById('btnSaleSave');

    if (saleState.items.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (paginationBar) paginationBar.style.display = 'none';
      if (btnSell) {
        btnSell.disabled = true;
        btnSell.style.opacity = '0.6';
        btnSell.style.cursor = 'not-allowed';
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (btnSell) {
      btnSell.disabled = false;
      btnSell.style.opacity = '1';
      btnSell.style.cursor = 'pointer';
    }

    const pageSize = saleState.slipPageSize || 9;
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

      const tr = document.createElement('tr');
      tr.className = 'pos-slip-row-item';
      tr.innerHTML = `
        <td class="pos-slip-col-item">
          <div class="pos-slip-item-title" title="${window.escapeHtml(item.productTitle)}">${window.escapeHtml(item.productTitle)}</div>
        </td>
        <td class="pos-slip-col-qty text-center">
          <div class="pos-slip-qty-stepper">
            <button type="button" class="pos-slip-qty-btn" onclick="window.SalesModule.adjustCartItemQty(${idx}, -1)" title="Decrease">−</button>
            <span class="pos-slip-qty-val font-num font-bold">${item.totalQty}</span>
            <button type="button" class="pos-slip-qty-btn ${isMaxReached ? 'disabled' : ''}" ${isMaxReached ? 'disabled' : ''} onclick="window.SalesModule.adjustCartItemQty(${idx}, 1)" title="${isMaxReached ? 'Maximum available stock reached' : 'Increase'}">+</button>
          </div>
        </td>
        <td class="pos-slip-col-rate text-right font-num">
          ${Number(item.salePrice || 0).toLocaleString()}
        </td>
        <td class="pos-slip-col-total text-right font-num font-bold">
          ${Number(item.netAmount || 0).toLocaleString()}
        </td>
        <td class="pos-slip-col-del text-center">
          <button type="button" class="pos-slip-del-btn" onclick="window.SalesModule.removeItem(${idx})" title="Remove item">✕</button>
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
  // SAVE SALE VOUCHER
  // ========================================================
  async function saveSaleVoucher() {
    // Party Type is optional - anyone can buy goods directly!

    if (saleState.items.length === 0) {
      if (window.showToast) window.showToast('Please add at least one product to the voucher', 'warning');
      return;
    }

    // Strict stock verification before saving sale
    const freshProducts = window.appData?.products || [];
    for (const item of saleState.items) {
      const prod = freshProducts.find(p => String(p.id) === String(item.productId) || String(p.code) === String(item.productCode));
      const availStock = prod ? Number(prod.stockQty || 0) : 0;
      if (Number(item.totalQty || 0) > availStock) {
        if (window.showToast) {
          window.showToast(`Cannot sell: "${item.productTitle}" requested quantity (${item.totalQty}) exceeds available stock (${availStock}).`, 'error');
        }
        return;
      }
      if (availStock <= 0) {
        if (window.showToast) {
          window.showToast(`Cannot sell: "${item.productTitle}" is out of stock (0 available).`, 'error');
        }
        return;
      }
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

      closeAddSaleModal();

      // Reload global store to reflect updated stock quantities
      if (window.reloadFromDatabase) {
        await window.reloadFromDatabase();
      }
      renderPosProductCatalog();

      await loadAndRenderSalesTable();

      // Open print bill confirmation dialog or auto print if checked
      const shouldPrint = el.chkSalePrintReceipt ? el.chkSalePrintReceipt.checked : true;
      if (shouldPrint) {
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
    saleState.slipCurrentPage = 1;

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
      return true;
    });

    renderSalesMasterTable(filtered);
  }

  function resetSalesFilters() {
    if (el.saleFilterSearch) el.saleFilterSearch.value = '';
    if (el.saleFilterDate) el.saleFilterDate.value = '';
    if (el.saleFilterMode) el.saleFilterMode.value = '';
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
              <td class="text-center">${modeBadge}</td>
              <td class="text-center">
                <div class="dots-wrapper">
                  <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
                    ⋮
                  </button>
                  <div id="${menuId}" class="action-menu hidden">
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
        <td class="text-center">${modeBadge}</td>
        <td class="text-center">
          <div class="dots-wrapper">
            <button type="button" class="btn-dots" onclick="window.toggleRowMenu(event, '${menuId}')" title="Actions">
              ⋮
            </button>
            <div id="${menuId}" class="action-menu hidden">
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
        </td>
      `;
      el.salesMasterTableBody.appendChild(tr);
    });
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

    if (el.partyTypeSelect) el.partyTypeSelect.value = sale.partyTypeId || '';
    selectSalePartyType(sale.partyTypeId || '');
    if (el.customerSelect) el.customerSelect.value = sale.partyId || '';
    if (el.customerName) el.customerName.value = sale.partyTitle || '';
    if (el.customerPhone) el.customerPhone.value = sale.customerPhone || '';
    if (el.customerArea) el.customerArea.value = sale.areaName || '';

    renderItemsTable();
    updateVoucherTotals();
    openAddSaleModal(sale);
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

    // Modal controls for Add Sale
    if (el.btnOpenAddSaleModal) el.btnOpenAddSaleModal.addEventListener('click', () => openAddSaleModal());
    if (el.btnCloseAddSaleModal) el.btnCloseAddSaleModal.addEventListener('click', closeAddSaleModal);
    if (el.btnCancelAddSaleModal) el.btnCancelAddSaleModal.addEventListener('click', closeAddSaleModal);

    // Filter controls for Sales Master Table
    if (el.saleFilterSearch) el.saleFilterSearch.addEventListener('input', applySalesFilter);
    if (el.saleFilterDate) el.saleFilterDate.addEventListener('change', applySalesFilter);
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
    slipPageSize: 9
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
    retEl.productSelect.innerHTML = '<option value="">Choose Product</option>';
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
    const pageSize = returnState.slipPageSize || 9;
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

  function removeReturnItem(idx) {
    if (idx >= 0 && idx < returnState.items.length) {
      returnState.items.splice(idx, 1);
      const pageSize = returnState.slipPageSize || 9;
      const totalPages = Math.ceil(returnState.items.length / pageSize) || 1;
      if (returnState.slipCurrentPage > totalPages) {
        returnState.slipCurrentPage = totalPages;
      }
      renderReturnItemsTable();
      updateReturnTotals();
    }
  }

  function renderReturnItemsTable() {
    updateReturnRightPanelVisibility();
    const cartTbody = document.getElementById('returnItemsTableBody');
    const slipTbody = document.getElementById('returnSlipItemsTableBody');
    const emptyState = document.getElementById('returnItemsEmptyState');
    const paginationBar = document.getElementById('returnPosSlipPaginationBar');
    const countBadge = document.getElementById('returnPosCartCountBadge');
    const btnReturn = document.getElementById('btnReturnSave');

    if (countBadge) countBadge.textContent = returnState.items.length;

    if (returnState.items.length === 0) {
      if (cartTbody) cartTbody.innerHTML = '';
      if (slipTbody) slipTbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (paginationBar) paginationBar.style.display = 'none';
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

    const pageSize = returnState.slipPageSize || 9;
    const totalPages = Math.ceil(returnState.items.length / pageSize) || 1;
    if (!returnState.slipCurrentPage || returnState.slipCurrentPage < 1) returnState.slipCurrentPage = 1;
    if (returnState.slipCurrentPage > totalPages) returnState.slipCurrentPage = totalPages;

    const currentPage = returnState.slipCurrentPage;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, returnState.items.length);
    const visibleItems = returnState.items.slice(startIdx, endIdx);

    if (cartTbody) {
      cartTbody.innerHTML = '';
      visibleItems.forEach((item, relIdx) => {
        const idx = startIdx + relIdx;
        const tr = document.createElement('tr');
        tr.className = 'pos-slip-row-item';
        tr.innerHTML = `
          <td class="pos-slip-col-item">
            <div class="pos-slip-item-title" title="${window.escapeHtml(item.productTitle)}">${window.escapeHtml(item.productTitle)}</div>
          </td>
          <td class="pos-slip-col-qty text-center">
            <div class="pos-slip-qty-stepper">
              <button type="button" class="pos-slip-qty-btn" onclick="window.SalesModule.adjustReturnCartItemQty(${idx}, -1)" title="Decrease">−</button>
              <span class="pos-slip-qty-val font-num font-bold">${item.totalQty}</span>
              <button type="button" class="pos-slip-qty-btn" onclick="window.SalesModule.adjustReturnCartItemQty(${idx}, 1)" title="Increase">+</button>
            </div>
          </td>
          <td class="pos-slip-col-rate text-right font-num">
            ${Number(item.returnRate || 0).toLocaleString()}
          </td>
          <td class="pos-slip-col-total text-right font-num font-bold" style="color: #dc2626;">
            ${Number(item.netAmount || 0).toLocaleString()}
          </td>
          <td class="pos-slip-col-del text-center">
            <button type="button" class="pos-slip-del-btn" onclick="window.SalesModule.removeReturnItem(${idx})" title="Remove item">✕</button>
          </td>
        `;
        cartTbody.appendChild(tr);
      });
    }

    if (paginationBar) {
      if (totalPages > 1) {
        paginationBar.style.display = 'flex';
        const pagInfo = document.getElementById('returnPosSlipPaginationInfo');
        const pagCur = document.getElementById('returnPosSlipPaginationCurrent');
        const btnPrev = document.getElementById('btnReturnSlipPrev');
        const btnNext = document.getElementById('btnReturnSlipNext');
        if (pagInfo) pagInfo.textContent = `Items ${startIdx + 1}–${endIdx} of ${returnState.items.length}`;
        if (pagCur) pagCur.textContent = `Page ${currentPage} of ${totalPages}`;
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;
      } else {
        paginationBar.style.display = 'none';
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
    const estNetEl = document.getElementById('returnEstimatedNet');

    if (totalItemsCount) totalItemsCount.textContent = totalItems;
    if (totalPiecesCount) totalPiecesCount.textContent = totalPieces;
    if (grossRefundEl) grossRefundEl.textContent = `Rs ${grossRefund.toLocaleString()}`;
    if (estNetEl) estNetEl.textContent = `Rs ${netRefund.toLocaleString()}`;

    const slipGross = document.getElementById('returnSlipGrossDisplay');
    const slipDisc = document.getElementById('returnSlipDiscDisplay');
    const slipDiscRow = document.getElementById('returnSlipDiscRow');
    const slipNet = document.getElementById('returnSlipNetDisplay');

    if (slipGross) slipGross.textContent = `Rs ${grossRefund.toLocaleString()}`;
    if (slipDiscRow) slipDiscRow.style.display = disc > 0 ? 'flex' : 'none';
    if (slipDisc) slipDisc.textContent = `- Rs ${disc.toLocaleString()}`;
    if (slipNet) slipNet.textContent = `Rs ${netRefund.toLocaleString()}`;

    updateReturnSlipMeta();
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

  function resetReturnForm() {
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

    if (custName) custName.value = '';
    if (custPhone) custPhone.value = '';
    if (custSelect) custSelect.value = '';
    if (refundMode) refundMode.value = 'Credit';
    if (entryDate) entryDate.value = new Date().toISOString().slice(0, 10);
    if (billRef) billRef.value = '';
    if (discInput) discInput.value = 0;

    posReturnCatalogState.searchQuery = '';
    const searchInp = document.getElementById('returnPosProductSearch');
    if (searchInp) searchInp.value = '';

    showReturnPosRightView('cart');
    renderReturnItemsTable();
    updateReturnTotals();
    loadNextReturnNo();
    renderReturnPosProductCatalog();
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
    if (retEl.description) retEl.description.value = ret.description || '';

    renderReturnItemsTable();
    updateReturnTotals();
    openAddReturnModal(ret);
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

    loadAndRenderReturnsTable();
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
      const pageSize = saleState.slipPageSize || 9;
      const totalPages = Math.ceil(saleState.items.length / pageSize) || 1;
      const newPage = (saleState.slipCurrentPage || 1) + delta;
      if (newPage >= 1 && newPage <= totalPages) {
        saleState.slipCurrentPage = newPage;
        renderItemsTable();
      }
    },
    changeReturnSlipPage: (delta) => {
      const pageSize = returnState.slipPageSize || 9;
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
    deleteSalePrompt: (id) => {
      if (!confirm('Are you sure you want to delete this sale voucher?\nItems stock will be restored back to inventory!')) return;
      window.salesAPI?.deleteSale(id).then(async () => {
        if (window.showToast) window.showToast('Sale deleted and stock restored', 'success');
        if (window.reloadFromDatabase) await window.reloadFromDatabase();
        await loadAndRenderSalesTable();
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
    }
  };

  // Auto initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.SalesModule.init();
  });

})();

