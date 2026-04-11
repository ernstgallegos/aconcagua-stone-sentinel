import test from 'node:test';
import assert from 'node:assert/strict';

import { bindUiEventRegistry } from '../../ui/event-registry.js';

function makeDoc(triggersByType) {
  return {
    addEventListener(type, cb) {
      if (triggersByType[type]) cb(triggersByType[type]);
    },
  };
}

test('bindUiEventRegistry routes delegated click action and args', () => {
  const calls = [];
  const trigger = {
    tagName: 'DIV',
    dataset: { action: 'demo', actionArg: 'alpha|beta' },
  };
  const clickEvent = {
    target: { closest: () => trigger },
  };

  global.document = makeDoc({ click: clickEvent });

  bindUiEventRegistry({
    resolve(action) {
      assert.equal(action, 'demo');
      return (_event, ...args) => calls.push(args);
    },
  });

  assert.deepEqual(calls, [['alpha', 'beta']]);
});

test('bindUiEventRegistry handles keyboard Enter on role=button element', () => {
  const calls = [];
  const trigger = {
    tagName: 'DIV',
    dataset: { action: 'open-watch-detail', actionArg: '' },
  };
  const keyboardEvent = {
    key: 'Enter',
    target: { closest: () => trigger },
    preventDefault: () => {},
  };

  const listeners = {};
  global.document = {
    addEventListener(type, cb) { listeners[type] = cb; },
  };

  bindUiEventRegistry({
    resolve(action) {
      assert.equal(action, 'open-watch-detail');
      return (_event) => calls.push('called');
    },
  });

  // Trigger keyboard listener
  listeners['keydown'](keyboardEvent);
  assert.deepEqual(calls, ['called']);
});

test('bindUiEventRegistry skips keyboard activation for native button elements', () => {
  const calls = [];
  const trigger = {
    tagName: 'BUTTON',
    dataset: { action: 'demo' },
  };
  const keyboardEvent = {
    key: 'Enter',
    target: { closest: () => trigger },
    preventDefault: () => {},
  };

  const listeners = {};
  global.document = {
    addEventListener(type, cb) { listeners[type] = cb; },
  };

  bindUiEventRegistry({ resolve: () => () => calls.push('called') });

  listeners['keydown'](keyboardEvent);
  // Native buttons already fire click on Enter — the keydown handler must NOT fire again
  assert.deepEqual(calls, []);
});

test('bindUiEventRegistry registers both click and keydown listeners', () => {
  const registered = [];
  global.document = {
    addEventListener(type) { registered.push(type); },
  };

  bindUiEventRegistry({ resolve: () => null });
  assert.ok(registered.includes('click'), 'should register click');
  assert.ok(registered.includes('keydown'), 'should register keydown');
});
