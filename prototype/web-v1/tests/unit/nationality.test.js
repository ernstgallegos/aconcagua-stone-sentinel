import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveIsoFromFlag, getNationalityBadge } from '../../ui/helpers/nationality.js';

test('deriveIsoFromFlag converts regional-indicator flag emoji to ISO alpha-2', () => {
  assert.equal(deriveIsoFromFlag('🇦🇷'), 'AR');
});

test('deriveIsoFromFlag returns empty string for malformed flag values', () => {
  assert.equal(deriveIsoFromFlag('A'), '');
  assert.equal(deriveIsoFromFlag(''), '');
});

test('getNationalityBadge keeps ISO fallback visible when emoji flag is unavailable', () => {
  const badge = getNationalityBadge({ nationalityCode: 'CL' });
  assert.match(badge, /char-iso">\((CL)\)<\/span>/);
});

test('getNationalityBadge falls back to explicit nationalityCode when flag cannot be parsed', () => {
  const badge = getNationalityBadge({ flag: 'not-a-flag', nationalityCode: 'US' });
  assert.match(badge, /char-iso">\((US)\)<\/span>/);
});

test('getNationalityBadge falls back to NA when both emoji and ISO are unavailable', () => {
  const badge = getNationalityBadge({});
  assert.match(badge, /char-iso">\((NA)\)<\/span>/);
});
