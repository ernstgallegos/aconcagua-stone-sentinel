import test from 'node:test';
import assert from 'node:assert/strict';

import { mulberry32 } from '../../engine/turn-resolution.js';

test('mulberry32 produces stable values for numeric seeds', () => {
  const rngA = mulberry32(12345);
  const rngB = mulberry32(12345);
  assert.equal(rngA(), rngB());
  assert.equal(rngA(), rngB());
});

test('mulberry32 sanitizes invalid seeds without NaN output', () => {
  const rng = mulberry32('seed-from-url');
  for (let i = 0; i < 5; i += 1) {
    const value = rng();
    assert.equal(Number.isFinite(value), true);
    assert.equal(value >= 0 && value < 1, true);
  }
});
