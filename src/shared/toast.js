// Toast Notification Helper
function showToast(message, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function' && window.showToast !== showToast) {
    return window.showToast(message, type);
  }
  const container = typeof document !== 'undefined' ? document.getElementById('toastContainer') : null;
  if (!container) return;
  const toast = document.createElement('div');
  const typeClass = type === 'error' ? 'toast-error' : (type === 'warning' ? 'toast-warning' : '');
  toast.className = `toast ${typeClass}`.trim();
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

if (typeof window !== 'undefined') {
  if (!window.showToast) {
    window.showToast = showToast;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast };
}
