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
