/**
 * Centralized click delegation for static UI controls.
 * Also handles Enter and Space keyboard activation on [data-action]
 * elements with role="button" for full keyboard accessibility.
 *
 * Usage:
 *   bindUiEventRegistry({
 *     resolve(action, target) { return handlerFnOrNull; },
 *   });
 */

function parseActionArgs(target) {
  const raw = target.dataset.actionArg;
  if (!raw) return [];
  return raw.split('|').map((part) => part.trim()).filter(Boolean);
}

function dispatchAction(event, resolve) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;

  const action = trigger.dataset.action;
  const handler = resolve(action, trigger);
  if (typeof handler !== 'function') return;

  const args = parseActionArgs(trigger);
  handler(event, ...args);
}

export function bindUiEventRegistry({ resolve }) {
  if (typeof resolve !== 'function') {
    throw new Error('bindUiEventRegistry requires a resolve(action, target) function');
  }

  document.addEventListener('click', (event) => {
    dispatchAction(event, resolve);
  });

  // Keyboard activation for [data-action] elements with role="button".
  // This replaces inline onkeydown handlers and ensures CSP-safe,
  // consistent keyboard accessibility across all data-action controls.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    // Only handle keyboard on elements that act as buttons
    // (real <button> elements handle Enter/Space natively;
    // <a> with href handles Enter natively).
    const tag = trigger.tagName;
    if (tag === 'BUTTON') return;
    if (tag === 'A' && trigger.hasAttribute('href')) return;
    event.preventDefault();
    dispatchAction(event, resolve);
  });
}
