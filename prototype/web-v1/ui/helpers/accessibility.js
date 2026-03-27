const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(root) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
}

function attachFocusTrap(overlay, dialog) {
  if (!overlay || !dialog) return;
  const onKeydown = (event) => {
    if (event.key !== 'Tab') return;
    const focusables = getFocusableElements(dialog);
    if (!focusables.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  overlay.__modalKeydownHandler = onKeydown;
  overlay.addEventListener?.('keydown', onKeydown);
}

function detachFocusTrap(overlay) {
  if (!overlay?.__modalKeydownHandler) return;
  overlay.removeEventListener?.('keydown', overlay.__modalKeydownHandler);
  delete overlay.__modalKeydownHandler;
}

export function openModalWithFocus({ overlay, dialog, trigger, openClass = 'open' }) {
  if (!overlay) return;
  overlay.dataset.lastTriggerId = trigger?.id || '';
  overlay.classList.add(openClass);
  overlay.setAttribute('aria-hidden', 'false');
  attachFocusTrap(overlay, dialog);
  dialog?.focus();
}

export function closeModalWithFocusReturn({ overlay, fallbackTriggerId, openClass = 'open' }) {
  if (!overlay) return;
  detachFocusTrap(overlay);
  overlay.classList.remove(openClass);
  overlay.setAttribute('aria-hidden', 'true');
  const targetId = overlay.dataset.lastTriggerId || fallbackTriggerId;
  if (targetId) document.getElementById(targetId)?.focus();
}
