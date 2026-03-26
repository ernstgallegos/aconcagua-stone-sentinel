export function openModalWithFocus({ overlay, dialog, trigger, openClass = 'open' }) {
  if (!overlay) return;
  overlay.dataset.lastTriggerId = trigger?.id || '';
  overlay.classList.add(openClass);
  overlay.setAttribute('aria-hidden', 'false');
  dialog?.focus();
}

export function closeModalWithFocusReturn({ overlay, fallbackTriggerId, openClass = 'open' }) {
  if (!overlay) return;
  overlay.classList.remove(openClass);
  overlay.setAttribute('aria-hidden', 'true');
  const targetId = overlay.dataset.lastTriggerId || fallbackTriggerId;
  if (targetId) document.getElementById(targetId)?.focus();
}
