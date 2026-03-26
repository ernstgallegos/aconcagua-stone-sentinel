import test from 'node:test';
import assert from 'node:assert/strict';
import { openModalWithFocus, closeModalWithFocusReturn } from '../ui/helpers/accessibility.js';

test('modal accessibility helpers toggle aria-hidden and restore focus target', () => {
  global.document = {
    getElementById: (id) => (id === 'trigger-btn' ? { focus: () => { global.__focused = 'trigger-btn'; } } : null),
  };
  global.__focused = null;

  const overlay = {
    dataset: {},
    classList: { add: () => {}, remove: () => {} },
    setAttribute: (_k, _v) => {},
  };
  const dialog = { focus: () => { global.__focused = 'dialog'; } };
  const trigger = { id: 'trigger-btn' };

  openModalWithFocus({ overlay, dialog, trigger });
  assert.equal(global.__focused, 'dialog');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: 'trigger-btn' });
  assert.equal(global.__focused, 'trigger-btn');
});
