document.addEventListener('DOMContentLoaded', () => {
  // Auto-apply saved font scale if present
  try {
    const savedScale = localStorage.getItem('app_font_scale_percent');
    if (savedScale) {
      const factor = Number(savedScale) / 100;
      if (window.displayAPI) window.displayAPI.setZoomFactor(factor);
      document.documentElement.style.zoom = factor;
    }
  } catch (_) {}

  const loginContainer = document.getElementById('loginContainer');
  const pinDisplay = document.getElementById('pinDisplay');
  const pinBoxes = document.querySelectorAll('.pin-box');
  const hiddenInput = document.getElementById('hiddenPinInput');
  const errorMsg = document.getElementById('errorMsg');
  const numButtons = document.querySelectorAll('.num-btn');

  const MAX_PIN_LENGTH = 4;
  let currentPin = '';
  let isSubmitting = false;

  // Keep hidden input focused for immediate keyboard access
  function focusInput() {
    if (hiddenInput && !isSubmitting) {
      hiddenInput.focus();
    }
  }

  // Refocus on window click
  document.addEventListener('click', (e) => {
    // Avoid stealing focus if user clicked directly on a numpad button
    if (!e.target.closest('.num-btn')) {
      focusInput();
    }
  });

  // Update visually masked PIN boxes
  function updatePinBoxes() {
    pinBoxes.forEach((box, index) => {
      box.classList.remove('error', 'success');

      if (index < currentPin.length) {
        box.classList.add('filled');
        box.classList.remove('focused');
      } else {
        box.classList.remove('filled');
        if (index === currentPin.length && !isSubmitting) {
          box.classList.add('focused');
        } else {
          box.classList.remove('focused');
        }
      }
    });

    if (hiddenInput) {
      hiddenInput.value = currentPin;
    }
  }

  // Clear any existing error state
  function clearError() {
    if (errorMsg.classList.contains('visible')) {
      errorMsg.classList.remove('visible');
    }
    pinDisplay.classList.remove('shake');
    pinBoxes.forEach(box => box.classList.remove('error'));
  }

  // Append a numeric digit
  function appendDigit(digit) {
    if (isSubmitting || currentPin.length >= MAX_PIN_LENGTH) return;

    clearError();
    currentPin += digit;
    updatePinBoxes();

    // Auto-submit when exactly 4 digits entered
    if (currentPin.length === MAX_PIN_LENGTH) {
      handlePinSubmit();
    }
  }

  // Delete last entered digit
  function deleteDigit() {
    if (isSubmitting || currentPin.length === 0) return;

    clearError();
    currentPin = currentPin.slice(0, -1);
    updatePinBoxes();
  }

  // Clear all digits
  function clearPin() {
    if (isSubmitting) return;

    clearError();
    currentPin = '';
    updatePinBoxes();
  }

  // Submit and verify PIN through IPC to main process
  async function handlePinSubmit() {
    if (isSubmitting || currentPin.length !== MAX_PIN_LENGTH) return;

    isSubmitting = true;

    try {
      let isValid = false;
      let errorText = 'Wrong PIN';
      let isLocked = false;

      if (window.authAPI && typeof window.authAPI.verifyPin === 'function') {
        const res = await window.authAPI.verifyPin(currentPin);
        if (typeof res === 'object' && res !== null) {
          isValid = !!res.success;
          if (res.message) errorText = res.message;
          if (res.locked) isLocked = true;
        } else {
          isValid = !!res;
        }
      } else {
        console.warn('authAPI IPC not detected');
        isValid = false;
        errorText = 'Access denied: Standalone mode';
      }

      if (isValid) {
        // Correct PIN
        pinBoxes.forEach(box => {
          box.classList.remove('focused', 'error');
          box.classList.add('success');
        });

        // Smooth short fade-out, then load main dashboard
        setTimeout(() => {
          loginContainer.classList.add('fade-out');
          setTimeout(() => {
            if (window.authAPI && typeof window.authAPI.loginSuccess === 'function') {
              window.authAPI.loginSuccess();
            } else {
              window.location.href = 'index.html';
            }
          }, 350);
        }, 200);
      } else {
        // Wrong PIN
        showError(errorText, isLocked);
      }
    } catch (err) {
      console.error('Error during PIN verification:', err);
      showError('System error verifying PIN', false);
    }
  }

  // Display error shake animation and reset
  function showError(message, locked) {
    pinBoxes.forEach(box => {
      box.classList.remove('focused', 'success');
      box.classList.add('error');
    });

    pinDisplay.classList.add('shake');
    if (errorMsg) {
      errorMsg.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${message || 'Wrong PIN'}</span>
      `;
      errorMsg.classList.add('visible');
    }

    // Reset after delay
    const resetDelay = locked ? 1200 : 450;
    setTimeout(() => {
      pinDisplay.classList.remove('shake');
      currentPin = '';
      isSubmitting = false;
      updatePinBoxes();
      focusInput();
    }, resetDelay);
  }

  // Handle Physical Keyboard Events
  document.addEventListener('keydown', (e) => {
    if (isSubmitting) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      appendDigit(e.key);
      highlightKeypadButton(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      deleteDigit();
      highlightKeypadButton('backspace');
    } else if (e.key === 'Delete' || e.key === 'Escape' || e.key.toLowerCase() === 'c') {
      e.preventDefault();
      clearPin();
      highlightKeypadButton('clear');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentPin.length === MAX_PIN_LENGTH) {
        handlePinSubmit();
      }
    }
  });

  // Handle Hidden Input Events (for IME / virtual keyboard / paste)
  if (hiddenInput) {
    hiddenInput.addEventListener('input', (e) => {
      const val = hiddenInput.value.replace(/\D/g, '').slice(0, MAX_PIN_LENGTH);
      currentPin = val;
      updatePinBoxes();
      if (currentPin.length === MAX_PIN_LENGTH) {
        handlePinSubmit();
      }
    });
  }

  // Visual button press animation on keyboard interaction
  function highlightKeypadButton(keyName) {
    const btn = Array.from(numButtons).find(b => b.dataset.key === keyName);
    if (btn) {
      btn.classList.add('btn-pressed');
      setTimeout(() => btn.classList.remove('btn-pressed'), 120);
    }
  }

  // Handle On-Screen Numpad Click Events
  numButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      btn.classList.add('btn-pressed');
      setTimeout(() => btn.classList.remove('btn-pressed'), 120);

      if (key === 'clear') {
        clearPin();
      } else if (key === 'backspace') {
        deleteDigit();
      } else if (key >= '0' && key <= '9') {
        appendDigit(key);
      }
    });
  });

  // Initialize display state
  updatePinBoxes();
  focusInput();
});
