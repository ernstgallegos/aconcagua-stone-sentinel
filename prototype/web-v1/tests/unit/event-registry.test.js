import test from 'node:test';
import assert from 'node:assert/strict';

import { bindUiEventRegistry } from '../../ui/event-registry.js';

test('bindUiEventRegistry routes delegated click action and args', () => {
  const calls = [];
  const trigger = {
    dataset: { action: 'demo', actionArg: 'alpha|beta' },
  };

  global.document = {
    addEventListener(type, cb) {
      if (type !== 'click') return; /* only test the click path */
      const event = {
        target: {
          closest(selector) {
            assert.equal(selector, '[data-action]');
            return trigger;
          },
        },
      };
      cb(event);
    },
  };

  bindUiEventRegistry({
    resolve(action) {
      assert.equal(action, 'demo');
      return (_event, ...args) => calls.push(args);
    },
  });

  assert.deepEqual(calls, [['alpha', 'beta']]);
});
