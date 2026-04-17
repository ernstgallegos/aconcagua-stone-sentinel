/**
 * Centralized click delegation for static UI controls.
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

export function bindUiEventRegistry({ resolve }) {
  if (typeof resolve !== 'function') {
    throw new Error('bindUiEventRegistry requires a resolve(action, target) function');
  }

  function dispatch(event, trigger) {
    const action = trigger.dataset.action;
    const handler = resolve(action, trigger);
    if (typeof handler !== 'function') return;
    const args = parseActionArgs(trigger);
    handler(event, ...args);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    dispatch(event, trigger);
  });

  /* Keyboard activation for data-action elements with role="button" or tabindex */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    /* Only activate on elements that expect keyboard interaction (role=button, tabindex, or button-like) */
    const tag = trigger.tagName;
    if (tag === 'BUTTON' || tag === 'A') return; /* browsers handle these natively */
    event.preventDefault();
    dispatch(event, trigger);
  });
}
