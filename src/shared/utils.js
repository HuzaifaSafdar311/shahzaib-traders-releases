// Shared Utilities for Inventory & Vendors

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const typeClass = type === 'error' ? 'toast-error' : (type === 'warning' ? 'toast-warning' : '');
  toast.className = `toast ${typeClass}`.trim();
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAdaptivePageSize(tabType = 'inventory') {
  let selector = '#inventoryView .table-container';
  if (tabType === 'vendors') selector = '#vendorView .table-container';

  let container = document.querySelector(selector);
  if (!container || container.clientHeight <= 0) {
    container = document.querySelector('.view-section.active .table-container') || document.querySelector('.table-container');
  }

  if (container && container.clientHeight > 140) {
    const thead = container.querySelector('thead');
    const headerHeight = thead && thead.offsetHeight > 0 ? thead.offsetHeight : 42;
    const availableHeight = container.clientHeight - headerHeight;
    const rowsThatFit = Math.floor(availableHeight / 43);
    return Math.max(rowsThatFit, 10);
  }

  if (window.innerHeight > 0) {
    const estimatedHeight = window.innerHeight - 250;
    const estimatedRows = Math.floor(estimatedHeight / 43);
    return Math.max(estimatedRows, 10);
  }

  return 12;
}

function renderPaginationNumbers(container, currentPage, totalPages, onPageClick) {
  if (!container) return;
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const createBtn = (p, text = p, isCurrent = false) => {
    const btn = document.createElement('button');
    btn.className = `btn-page ${isCurrent ? 'active' : ''}`.trim();
    btn.textContent = text;
    btn.disabled = isCurrent;
    btn.addEventListener('click', () => onPageClick(p));
    return btn;
  };

  const createEllipsis = () => {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '...';
    return span;
  };

  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) {
      container.appendChild(createBtn(p, p, p === currentPage));
    }
  } else {
    container.appendChild(createBtn(1, 1, currentPage === 1));

    if (currentPage > 3) container.appendChild(createEllipsis());

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let p = start; p <= end; p++) {
      container.appendChild(createBtn(p, p, p === currentPage));
    }

    if (currentPage < totalPages - 2) container.appendChild(createEllipsis());

    container.appendChild(createBtn(totalPages, totalPages, currentPage === totalPages));
  }
}

// Global 3-Dots Action Menu Helpers
window.toggleRowMenu = function(e, menuId) {
  e.stopPropagation();
  const targetMenu = document.getElementById(menuId);
  const isCurrentlyOpen = targetMenu && !targetMenu.classList.contains('hidden');

  closeAllActionMenus();

  if (targetMenu && !isCurrentlyOpen) {
    targetMenu.classList.remove('hidden');
    const wrapper = targetMenu.closest('.dots-wrapper');
    if (wrapper) {
      wrapper.classList.add('active');
      const row = wrapper.closest('tr');
      if (row) row.classList.add('menu-open');

      const rect = wrapper.getBoundingClientRect();
      const tableWrapper = wrapper.closest('.gi-table-wrapper, .table-container, .voucher-grid-container');
      const tableBounds = tableWrapper ? tableWrapper.getBoundingClientRect() : null;

      const spaceBelow = tableBounds 
        ? (tableBounds.bottom - rect.bottom) 
        : (window.innerHeight - rect.bottom);

      if (spaceBelow < 120) {
        wrapper.classList.add('drop-up');
      } else {
        wrapper.classList.remove('drop-up');
      }
    }
    const btn = targetMenu.previousElementSibling;
    if (btn) btn.classList.add('active');
  }
};

function closeAllActionMenus() {
  document.querySelectorAll('.action-menu').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.btn-dots').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.dots-wrapper').forEach(w => {
    w.classList.remove('drop-up');
    w.classList.remove('active');
  });
  document.querySelectorAll('tr.menu-open').forEach(r => r.classList.remove('menu-open'));
}

document.addEventListener('click', closeAllActionMenus);

// Expose on window for modular script access
window.showToast = showToast;
window.getTodayString = getTodayString;
window.escapeHtml = escapeHtml;
window.getAdaptivePageSize = getAdaptivePageSize;
window.renderPaginationNumbers = renderPaginationNumbers;
window.closeAllActionMenus = closeAllActionMenus;

/**
 * Universal Searchable Product Dropdown Component
 * Enables typing and real-time auto-suggestions for product titles across the entire application.
 */
function setupSearchableProductDropdown({
  inputEl,
  dropdownEl,
  codeEl,
  selectEl,
  getProducts,
  onSelect,
  onClear,
  nextFocusEl,
  compactRateOnly = false
}) {
  if (!inputEl || !dropdownEl) return null;

  let activeIndex = -1;
  let currentFiltered = [];

  function fetchProducts() {
    if (typeof getProducts === 'function') return getProducts() || [];
    return window.appData?.products || [];
  }

  function renderList(query = '') {
    const q = (query || '').trim().toLowerCase();
    const all = fetchProducts();

    if (!q) {
      currentFiltered = all.slice(0, 30);
    } else {
      currentFiltered = all.filter(p => {
        const titleEng = (p.titleEng || '').toLowerCase();
        const titleUrdu = (p.titleUrdu || '').toLowerCase();
        const code = String(p.code || '').toLowerCase();
        const barcode = String(p.barcode || '').toLowerCase();
        return titleEng.includes(q) || code.includes(q) || titleUrdu.includes(q) || barcode.includes(q);
      }).slice(0, 40);
    }

    if (currentFiltered.length === 0) {
      dropdownEl.innerHTML = `<div class="typeahead-no-results">No products matching "<strong>${escapeHtml(query)}</strong>"</div>`;
      dropdownEl.classList.remove('hidden');
      activeIndex = -1;
      return;
    }

    dropdownEl.innerHTML = currentFiltered.map((p, idx) => {
      const stock = Number(p.stockQty) || 0;
      const unit = p.unitName || 'Pcs';
      const tp = Number(p.purchasePrice || p.tradePrice || 0).toFixed(2);
      const rp = Number(p.retailPrice || 0).toFixed(2);

      if (compactRateOnly) {
        return `
          <div class="typeahead-item" data-index="${idx}" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div class="typeahead-item-main" style="flex: 1; min-width: 0; padding-right: 12px;">
              <div class="typeahead-item-title font-bold" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; color: #0f172a;" title="${escapeHtml(p.titleEng || 'Unnamed Product')}">
                ${escapeHtml(p.titleEng || 'Unnamed Product')}
              </div>
            </div>
            <div class="typeahead-item-rates" style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
              <span class="typeahead-rate-pill rate-tp">TP: Rs. ${tp}</span>
              <span class="typeahead-rate-pill rate-rp">RP: Rs. ${rp}</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="typeahead-item" data-index="${idx}">
          <div class="typeahead-item-main">
            <div class="typeahead-item-title">${escapeHtml(p.titleEng || 'Unnamed Product')}</div>
            <div class="typeahead-item-sub">
              <span class="typeahead-badge-code">Code: ${escapeHtml(p.code)}</span>
              <span class="typeahead-stock ${stock <= 0 ? 'text-danger' : 'text-success'}">Stock: ${stock} ${escapeHtml(unit)}</span>
            </div>
          </div>
          <div class="typeahead-item-rates">
            <span class="typeahead-rate-pill rate-tp">TP: Rs. ${tp}</span>
            <span class="typeahead-rate-pill rate-rp">RP: Rs. ${rp}</span>
          </div>
        </div>
      `;
    }).join('');

    dropdownEl.classList.remove('hidden');
    activeIndex = -1;

    // Attach click events
    const items = dropdownEl.querySelectorAll('.typeahead-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(item.dataset.index, 10);
        if (currentFiltered[idx]) {
          selectProduct(currentFiltered[idx]);
        }
      });
      item.addEventListener('mouseenter', () => {
        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        activeIndex = parseInt(item.dataset.index, 10);
      });
    });
  }

  function selectProduct(prod) {
    if (!prod) return;
    inputEl.value = prod.titleEng || prod.titleUrdu || '';
    if (codeEl) codeEl.value = prod.code || '';
    if (selectEl) {
      selectEl.value = prod.code || prod.id || '';
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeDropdown();

    if (typeof onSelect === 'function') {
      onSelect(prod);
    }

    if (nextFocusEl) {
      const target = typeof nextFocusEl === 'function' ? nextFocusEl() : nextFocusEl;
      if (target && typeof target.focus === 'function') {
        setTimeout(() => target.focus(), 50);
      }
    }
  }

  function closeDropdown() {
    dropdownEl.classList.add('hidden');
    dropdownEl.innerHTML = '';
    activeIndex = -1;
  }

  inputEl.addEventListener('input', () => {
    renderList(inputEl.value);
  });

  inputEl.addEventListener('click', (e) => {
    e.stopPropagation();
    renderList(inputEl.value);
  });

  inputEl.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  dropdownEl.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  dropdownEl.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (dropdownEl.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        renderList(inputEl.value);
        e.preventDefault();
      }
      return;
    }

    const items = dropdownEl.querySelectorAll('.typeahead-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && currentFiltered[activeIndex]) {
        selectProduct(currentFiltered[activeIndex]);
      } else if (currentFiltered.length > 0) {
        selectProduct(currentFiltered[0]);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  function updateHighlight(items) {
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      closeDropdown();
    }
  });

  return {
    setProduct: (prod) => {
      if (prod) {
        inputEl.value = prod.titleEng || prod.titleUrdu || '';
      } else {
        inputEl.value = '';
      }
    },
    clear: () => {
      inputEl.value = '';
      closeDropdown();
      if (typeof onClear === 'function') onClear();
    },
    close: closeDropdown,
    refresh: () => {
      if (!dropdownEl.classList.contains('hidden')) {
        renderList(inputEl.value);
      }
    }
  };
}
window.setupSearchableProductDropdown = setupSearchableProductDropdown;


/**
 * Universal Adaptive Table Pagination Controller
 * Manages slice rendering, auto page sizing, and footer controls.
 */
function createTablePagination({
  container,
  tbody,
  emptyStateEl,
  fixedPageSize,
  onRenderPage
}) {
  let allItems = [];
  let currentPage = 1;

  function getContainer() {
    return typeof container === 'string' ? document.querySelector(container) : container;
  }
  function getTbody() {
    return typeof tbody === 'string' ? document.querySelector(tbody) : tbody;
  }
  function getEmptyState() {
    return typeof emptyStateEl === 'string' ? document.querySelector(emptyStateEl) : emptyStateEl;
  }

  function ensureFooter() {
    const c = getContainer();
    if (!c) return null;
    let footer = c.querySelector('.table-footer.pagination-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'table-footer pagination-footer';
      footer.innerHTML = `
        <div class="pagination-info">Showing 0 of 0 entries</div>
        <div class="pagination-controls">
          <button type="button" class="btn-page btn-page-nav btn-prev" title="Previous Page">
            <svg class="page-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Prev
          </button>
          <div class="pagination-numbers"></div>
          <button type="button" class="btn-page btn-page-nav btn-next" title="Next Page">
            Next
            <svg class="page-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;
      c.appendChild(footer);

      const prevBtn = footer.querySelector('.btn-prev');
      const nextBtn = footer.querySelector('.btn-next');

      prevBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentPage > 1) {
          currentPage--;
          render();
        }
      };

      nextBtn.onclick = (e) => {
        e.stopPropagation();
        const pageSize = calculateSize();
        const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
        if (currentPage < totalPages) {
          currentPage++;
          render();
        }
      };
    }
    return footer;
  }

  function calculateSize() {
    if (typeof fixedPageSize === 'number' && fixedPageSize > 0) return fixedPageSize;
    if (typeof fixedPageSize === 'function') return fixedPageSize();
    const c = getContainer();
    let clientH = c ? c.clientHeight : 0;
    if (!clientH || clientH < 200) {
      const vh = window.innerHeight || 800;
      clientH = Math.max(300, vh - 280);
    }
    const thead = c ? c.querySelector('thead') : null;
    const headerH = thead && thead.offsetHeight > 0 ? thead.offsetHeight : 44;
    const footerH = 50;
    // 16px safety margin guarantees table rows NEVER cause vertical scroll
    const availableH = Math.max(100, clientH - headerH - footerH - 16);
    // Standard table row height with padding and borders is ~52px
    const rowH = 52;
    const rows = Math.floor(availableH / rowH);
    return Math.max(rows, 5);
  }

  function render() {
    const footer = ensureFooter();
    if (!footer) return;

    const infoEl = footer.querySelector('.pagination-info');
    const prevBtn = footer.querySelector('.btn-prev');
    const nextBtn = footer.querySelector('.btn-next');
    const numbersEl = footer.querySelector('.pagination-numbers');

    const total = allItems.length;
    const pageSize = calculateSize();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const tb = getTbody();
    const emp = getEmptyState();

    if (total === 0) {
      if (tb) tb.innerHTML = '';
      if (emp) emp.classList.remove('hidden');
      infoEl.textContent = 'Showing 0 of 0 entries';
      footer.style.display = 'none';
      return;
    }

    if (emp) emp.classList.add('hidden');
    footer.style.display = 'flex';

    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = allItems.slice(startIdx, startIdx + pageSize);

    if (onRenderPage) {
      onRenderPage(pageItems, startIdx, total);
    }

    const endIdx = Math.min(startIdx + pageSize, total);
    infoEl.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${total} entries`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    if (window.renderPaginationNumbers) {
      window.renderPaginationNumbers(numbersEl, currentPage, totalPages, (targetPage) => {
        currentPage = targetPage;
        render();
      });
    }
  }

  window.addEventListener('resize', () => {
    const c = getContainer();
    if (c && c.offsetParent !== null && allItems.length > 0) {
      render();
    }
  });

  return {
    setItems(items, resetPage = false) {
      allItems = Array.isArray(items) ? items : [];
      if (resetPage) currentPage = 1;
      render();
    },
    getCurrentPage() { return currentPage; },
    getPageSize() { return calculateSize(); },
    refresh() { render(); }
  };
}

window.createTablePagination = createTablePagination;
