import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../../engine/turn-resolution.js';

test('mulberry32 accepts finite numeric seeds', () => {
  const rng = mulberry32(1234);
  const value = rng();
  assert.equal(Number.isFinite(value), true);
  assert.equal(value >= 0 && value < 1, true);
});

test('mulberry32 rejects non-finite seed values', () => {
  assert.throws(() => mulberry32(Number.NaN), /finite numeric seed/i);
  assert.throws(() => mulberry32(undefined), /finite numeric seed/i);
  assert.throws(() => mulberry32(null), /finite numeric seed/i);
});
