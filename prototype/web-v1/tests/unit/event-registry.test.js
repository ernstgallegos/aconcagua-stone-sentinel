import test from 'node:test';
import assert from 'node:assert/strict';

import { bindUiEventRegistry } from '../../ui/event-registry.js';

test('bindUiEventRegistry routes delegated click action and args', () => {
  const calls = [];
  const trigger = {
    dataset: { action: 'demo', actionArg: 'alpha|beta' },
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

  // Simulate a click event
  assert.ok(listeners.click, 'click listener registered');
  listeners.click({
    target: {
      closest(selector) {
        if (selector === '[data-action]') return trigger;
        return null;
      },
    },
  });

  assert.deepEqual(calls, [['alpha', 'beta']]);
});

test('bindUiEventRegistry handles keydown on role=button elements', () => {
  const calls = [];
  const trigger = {
    dataset: { action: 'open-watch', actionArg: '' },
  };

  const listeners = {};
  global.document = {
    addEventListener(type, cb) {
      listeners[type] = cb;
    },
  };

  bindUiEventRegistry({
    resolve(action) {
      return (_event, ...args) => calls.push(action);
    },
  });

  assert.ok(listeners.keydown, 'keydown listener registered');
  const prevented = [];
  listeners.keydown({
    key: 'Enter',
    target: {
      closest(selector) {
        if (selector === '[data-action][role="button"]') return trigger;
        return null;
      },
    },
    preventDefault() { prevented.push(true); },
  });

  assert.deepEqual(calls, ['open-watch']);
  assert.equal(prevented.length, 1, 'preventDefault called');
});
