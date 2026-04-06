import test from 'node:test';
import assert from 'node:assert/strict';

import { renderDifficultySelector } from '../../ui/screens/title.js';
import { renderPositionList } from '../../ui/screens/game.js';
import { classifyOutcome } from '../../ui/screens/debrief.js';
import { localizePart2NavLabel } from '../../ui/screens/part2.js';

test('title renderer builds difficulty pills and description', () => {
  const grid = {
    innerHTML: '',
    children: [],
    appendChild(node) { this.children.push(node); },
  };
  const note = { textContent: '' };

  global.document = {
    getElementById(id) {
      if (id === 'title-difficulty-grid') return grid;
      if (id === 'title-difficulty-note') return note;
      return null;
    },
    createElement(tag) {
      return {
        tag,
        className: '',
        children: [],
        attrs: {},
        textContent: '',
        id: '',
        type: '',
        setAttribute(name, value) { this.attrs[name] = value; },
        appendChild(node) { this.children.push(node); },
        onclick: null,
      };
    },
  };

  renderDifficultySelector({
    DIFFICULTY_LEVELS: [
      { id: 'easy', label: { en: 'Easy' }, blurb: { en: 'Gentle' } },
      { id: 'hard', label: { en: 'Hard' }, blurb: { en: 'Harsh' } },
    ],
    CURRENT_DIFFICULTY_ID: 'hard',
    CURRENT_LANGUAGE: 'en',
    setDifficulty: () => {},
    t: () => 'Difficulty note',
  });

  assert.equal(grid.children.length, 2);
  assert.equal(note.textContent, 'Difficulty note');
});

test('game renderer builds reversed position list', () => {
  const list = { innerHTML: '', children: [], appendChild(node) { this.children.push(node); } };
  const mobile = { innerHTML: '' };

  global.document = {
    getElementById(id) {
      if (id === 'position-list') return list;
      if (id === 'bs-position-list') return mobile;
      return null;
    },
    createElement() {
      return {
        className: '',
        attrs: {},
        innerHTML: '',
        setAttribute(name, value) { this.attrs[name] = value; },
      };
    },
  };

  renderPositionList({
    G: { state: { position: 'base' }, highestPosIdx: 1 },
    POSITIONS: ['horcones', 'base', 'summit'],
    POS_BAND: { horcones: 'approach', base: 'base', summit: 'high' },
    POS_LABELS: { horcones: 'Horcones', base: 'Base', summit: 'Summit' },
    POS_ALT: { horcones: '2900m', base: '4300m', summit: '6961m' },
  });

  assert.equal(list.children.length, 3);
  assert.equal(typeof mobile.innerHTML, 'string');
});

test('debrief classifyOutcome delegates class mapping', () => {
  const out = classifyOutcome({
    G: { finalOutcome: 'Summit and Safe Return' },
    getOutcomeClass: (label) => (label.includes('Summit') ? 'outcome-success' : 'other'),
  });
  assert.deepEqual(out, { label: 'Summit and Safe Return', cls: 'outcome-success' });
});

test('part2 nav localization maps known label', () => {
  const text = localizePart2NavLabel({
    uiText: (_en, es) => es,
    label: 'Back',
  });
  assert.equal(text, 'Atrás');
});
