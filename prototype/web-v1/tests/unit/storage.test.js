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
