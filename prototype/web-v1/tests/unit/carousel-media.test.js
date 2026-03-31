import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManagedPortrait, hydrateManagedPortraits } from '../../ui/helpers/carousel-media.js';

test('buildManagedPortrait renders skeleton + fallback contract', () => {
  const html = buildManagedPortrait({
    src: '../../art/characters/francisco-aguirre.png',
    alt: 'Francisco',
    fallbackSrc: '../../art/characters/random.png',
    eager: true,
    fallbackLabel: 'Portrait unavailable',
  });

  assert.match(html, /carousel-media/);
  assert.match(html, /carousel-media-skeleton/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /data-fallback-src="\.\.\/\.\.\/art\/characters\/random\.png"/);
  assert.match(html, /carousel-media-fallback/);
});

test('hydrateManagedPortraits swaps to fallback only once and marks error state', () => {
  const listeners = {};
  const wrapper = {
    state: new Set(['is-loading']),
    classList: {
      add: (...names) => names.forEach((name) => wrapper.state.add(name)),
      remove: (...names) => names.forEach((name) => wrapper.state.delete(name)),
      contains: (name) => wrapper.state.has(name),
    },
  };
  const img = {
    dataset: { fallbackSrc: 'fallback.png' },
    src: 'primary.png',
    currentSrc: 'primary.png',
    complete: false,
    naturalWidth: 0,
    getAttribute(name) {
      if (name === 'src') return this.src;
      return '';
    },
    set src(value) {
      this._src = value;
    },
    get src() {
      return this._src;
    },
    addEventListener(event, handler) {
      listeners[event] = handler;
    },
  };
  wrapper.querySelector = () => img;

  const root = {
    querySelectorAll: () => [wrapper],
  };

  hydrateManagedPortraits(root);
  listeners.error();
  assert.equal(img.dataset.fallbackApplied, '1');
  assert.equal(img.src, 'fallback.png');
  listeners.error();
  assert.equal(wrapper.state.has('is-error'), true);
});
