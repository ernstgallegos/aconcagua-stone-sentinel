import test from 'node:test';
import assert from 'node:assert/strict';

import { bindUiEventRegistry } from '../../ui/event-registry.js';

test('bindUiEventRegistry routes delegated click action and args', () => {
  const calls = [];
  const trigger = {
    dataset: { action: 'demo', actionArg: 'alpha|beta' },
    tagName: 'DIV',
  };

  const listeners = {};
  global.document = {
    addEventListener(type, cb) {
      listeners[type] = cb;
    },
  };

  bindUiEventRegistry({
    resolve(action) {
      assert.equal(action, 'demo');
      return (_event, ...args) => calls.push(args);
    },
  });

  // Verify both click and keydown listeners were registered.
  assert.ok(listeners.click, 'click listener registered');
  assert.ok(listeners.keydown, 'keydown listener registered');

  // Simulate a click event.
  const clickEvent = {
    target: {
      closest(selector) {
        assert.equal(selector, '[data-action]');
        return trigger;
      },
    },
  };
  listeners.click(clickEvent);

  assert.deepEqual(calls, [['alpha', 'beta']]);
});
