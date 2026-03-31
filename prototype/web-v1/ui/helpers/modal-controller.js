import { openModalWithFocus, closeModalWithFocusReturn } from './accessibility.js';

export function openTutorialStyleModal({ modalId, triggerId, dialogSelector = '.tutorial-dialog' }) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  const dialog = overlay.querySelector(dialogSelector);
  const trigger = triggerId ? document.getElementById(triggerId) : null;
  openModalWithFocus({ overlay, dialog, trigger, openClass: 'visible' });
}

export function closeTutorialStyleModal({ modalId, fallbackTriggerId, openClass = 'visible' }) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  closeModalWithFocusReturn({ overlay, fallbackTriggerId, openClass });
}

export function bindBackdropClose({ modalId, close }) {
  const overlay = document.getElementById(modalId);
  if (!overlay || typeof close !== 'function') return;
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
}
