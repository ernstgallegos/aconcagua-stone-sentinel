import test from 'node:test';
import assert from 'node:assert/strict';
import { openModalWithFocus, closeModalWithFocusReturn } from '../../ui/helpers/accessibility.js';

function makeClassList() {
  const set = new Set();
  return {
    add: (...names) => names.forEach((n) => set.add(n)),
    remove: (...names) => names.forEach((n) => set.delete(n)),
    contains: (name) => set.has(name),
  };
}

function createDocStub(focusTarget) {
  return {
    body: {
      dataset: {},
      classList: makeClassList(),
    },
    getElementById(id) {
      if (id === focusTarget.id) return focusTarget;
      return null;
    },
    activeElement: null,
  };
}

test('openModalWithFocus toggles accessibility state and modal lock', () => {
  const trigger = { id: 'help-trigger' };
  const dialog = { focused: false, focus() { this.focused = true; } };
  const overlay = {
    dataset: {},
    classList: makeClassList(),
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener() {},
    removeEventListener() {},
  };

  global.document = createDocStub({ id: 'noop', focus() {} });

  openModalWithFocus({ overlay, dialog, trigger });

  assert.equal(overlay.classList.contains('open'), true);
  assert.equal(overlay.attrs['aria-hidden'], 'false');
  assert.equal(overlay.dataset.lastTriggerId, 'help-trigger');
  assert.equal(dialog.focused, true);
  assert.equal(document.body.dataset.modalCount, '1');
  assert.equal(document.body.classList.contains('modal-open'), true);
});

test('closeModalWithFocusReturn restores focus and unlocks body when last modal closes', () => {
  const focusTarget = { id: 'field-log-trigger', focused: false, focus() { this.focused = true; } };
  global.document = createDocStub(focusTarget);
  document.body.dataset.modalCount = '1';
  document.body.classList.add('modal-open');

  const overlay = {
    dataset: { lastTriggerId: 'field-log-trigger' },
    classList: makeClassList(),
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener() {},
    removeEventListener() {},
  };
  overlay.classList.add('open');

  closeModalWithFocusReturn({ overlay, fallbackTriggerId: null });

  assert.equal(overlay.classList.contains('open'), false);
  assert.equal(overlay.attrs['aria-hidden'], 'true');
  assert.equal(focusTarget.focused, true);
  assert.equal(document.body.dataset.modalCount, '0');
  assert.equal(document.body.classList.contains('modal-open'), false);
});
