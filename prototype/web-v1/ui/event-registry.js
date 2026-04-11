/**
 * Centralized event delegation for static UI controls.
 *
 * Handles both click and keyboard activation (Enter/Space) for elements
 * with a [data-action] attribute. Keyboard activation is applied to
 * non-native-button elements that carry role="button" and tabindex, so
 * interactive custom controls are fully keyboard-accessible without
 * requiring inline event handlers.
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

function dispatchAction(event, trigger, resolve) {
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
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    dispatchAction(event, trigger, resolve);
  });

  // Keyboard activation for non-button elements with role="button" and data-action.
  // Native <button> elements already fire click on Enter/Space; this handler
  // covers custom interactive elements (e.g. div/span role="button") so that
  // no inline onkeydown handlers are needed anywhere in the HTML.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    // Skip native buttons and links — browser already triggers click for them.
    const tag = trigger.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT') return;
    event.preventDefault();
    dispatchAction(event, trigger, resolve);
  });
}
