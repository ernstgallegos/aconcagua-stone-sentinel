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

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const action = trigger.dataset.action;
    const handler = resolve(action, trigger);
    if (typeof handler !== 'function') return;

    const args = parseActionArgs(trigger);
    handler(event, ...args);
  });
}
