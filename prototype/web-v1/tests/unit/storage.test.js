import test from 'node:test';
import assert from 'node:assert/strict';

import { safeGetStorage, safeSetStorage, safeRemoveStorage } from '../../ui/helpers/storage.js';

test('safeSetStorage returns false instead of throwing when storage write fails', () => {
  global.localStorage = {
    setItem() { throw new Error('quota exceeded'); },
    getItem() { return null; },
    removeItem() {},
  };

  assert.equal(safeSetStorage('k', 'v'), false);
});

test('safeGetStorage returns null instead of throwing when storage read fails', () => {
  global.localStorage = {
    setItem() {},
    getItem() { throw new Error('blocked'); },
    removeItem() {},
  };

  assert.equal(safeGetStorage('k'), null);
});

test('safeRemoveStorage returns false instead of throwing when storage remove fails', () => {
  global.localStorage = {
    setItem() {},
    getItem() { return null; },
    removeItem() { throw new Error('blocked'); },
  };

  assert.equal(safeRemoveStorage('k'), false);
});

// ── Additional resilience tests ───────────────────────────────────────────────

test('safeGetStorage returns stored string value on success', () => {
  const store = { myKey: 'hello' };
  global.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: () => {},
    removeItem: () => {},
  };

  assert.equal(safeGetStorage('myKey'), 'hello');
});

test('safeGetStorage returns null when key is absent (no throw)', () => {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  assert.equal(safeGetStorage('missing'), null);
});

test('safeSetStorage returns true on successful write', () => {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  assert.equal(safeSetStorage('x', '1'), true);
  assert.equal(store['x'], '1');
});

test('safeRemoveStorage returns true on successful remove', () => {
  const store = { y: 'exists' };
  global.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  assert.equal(safeRemoveStorage('y'), true);
  assert.equal(store['y'], undefined);
});

test('safeGetStorage returns null (not non-string) even when storage returns non-string', () => {
  // A spec-violating storage that returns a number should be treated as missing.
  global.localStorage = {
    getItem: () => 42,
    setItem: () => {},
    removeItem: () => {},
  };

  assert.equal(safeGetStorage('k'), null);
});

test('safeSetStorage handles storage that throws on every operation gracefully', () => {
  global.localStorage = {
    setItem() { throw new Error('SecurityError'); },
    getItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
  };

  assert.equal(safeSetStorage('k', 'v'), false);
  assert.equal(safeGetStorage('k'), null);
  assert.equal(safeRemoveStorage('k'), false);
});
