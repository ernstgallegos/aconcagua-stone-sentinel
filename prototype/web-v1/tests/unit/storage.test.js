import test from 'node:test';
import assert from 'node:assert/strict';

import { safeGetStorage, safeSetStorage, safeRemoveStorage } from '../../ui/helpers/storage.js';

test('safeSetStorage returns true when write succeeds', () => {
  const store = {};
  global.localStorage = {
    setItem(key, value) { store[key] = String(value); },
    getItem(key) { return store[key] ?? null; },
    removeItem(key) { delete store[key]; },
  };

  assert.equal(safeSetStorage('k', 'v'), true);
  assert.equal(store.k, 'v');
});

test('safeGetStorage returns stored string when read succeeds', () => {
  global.localStorage = {
    setItem() {},
    getItem() { return 'stored'; },
    removeItem() {},
  };

  assert.equal(safeGetStorage('k'), 'stored');
});

test('safeGetStorage returns null for non-string storage values', () => {
  global.localStorage = {
    setItem() {},
    getItem() { return 42; },
    removeItem() {},
  };

  assert.equal(safeGetStorage('k'), null);
});

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

test('safeRemoveStorage returns true when remove succeeds', () => {
  global.localStorage = {
    setItem() {},
    getItem() { return null; },
    removeItem() {},
  };

  assert.equal(safeRemoveStorage('k'), true);
});
