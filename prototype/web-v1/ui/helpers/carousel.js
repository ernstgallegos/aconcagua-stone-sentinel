// ui/helpers/carousel.js
//
// Carousel rendering and navigation logic extracted from screens.js.
// Owns: card HTML generation, dot rendering, info-panel toggle,
// character-image path resolution, and navigation index management.
//
// Both Part 1 (expedition-setup) and Part 2 (part2-character) share
// the same rendering functions; Part 2 adds lock-pill decoration and
// fallback image sourcing.

import { buildManagedPortrait, hydrateManagedPortraits } from './carousel-media.js';
import { getNationalityBadge } from './nationality.js';

// ────────────────────────────────────────────────
// Character image path mapping
// ────────────────────────────────────────────────

const CHARACTER_FILENAME_MAP = {
  francisco: 'francisco-aguirre',
  laura: 'laura-kim',
  erik: 'erik-lundvall',
  daniela: 'daniela-de-rossi',
  blake: 'blake-harris',
  irina: 'irina-orlova',
  random: 'random',
};

/**
 * Resolve the relative image path for a character portrait.
 * @param {string} charId - Character identifier.
 * @param {{ part2?: boolean }} [opts]
 * @returns {string|null}
 */
export function getCharacterImagePath(charId, { part2 = false } = {}) {
  const filename = CHARACTER_FILENAME_MAP[charId];
  if (!filename) return null;
  return part2
    ? `../../art/characters/part-2/${filename}.png`
    : `../../art/characters/${filename}.png`;
}

// ────────────────────────────────────────────────
// Dot rendering (shared)
// ────────────────────────────────────────────────

/**
 * Render navigation dots into a container element.
 * @param {HTMLElement|null} dotsEl
 * @param {number} count - Total items.
 * @param {number} activeIdx - Currently active index.
 */
export function renderCarouselDots(dotsEl, count, activeIdx) {
  if (!dotsEl) return;
  dotsEl.innerHTML = Array.from({ length: count }, (_, i) =>
    `<span class="carousel-dot${i === activeIdx ? ' active' : ''}"></span>`
  ).join('');
}

// ────────────────────────────────────────────────
// Card HTML builders
// ────────────────────────────────────────────────

/**
 * Build HTML for a character card (shared between Part 1 and Part 2).
 *
 * @param {object} params
 * @param {object} params.character - Localized character object.
 * @param {string} params.imgPath - Resolved image path.
 * @param {boolean} params.eager - Whether to load image eagerly.
 * @param {string} params.difficultyLabel - Profile label text.
 * @param {string} params.portraitFallback - Fallback text when portrait missing.
 * @param {string} params.infoAriaLabel - Aria label for info button.
 * @param {{ locked?: boolean, lockText?: string, fallbackSrc?: string }} [params.part2]
 * @returns {string} HTML string.
 */
export function buildCharacterCardHtml({
  character,
  imgPath,
  eager,
  difficultyLabel,
  portraitFallback,
  infoAriaLabel,
  part2 = {},
}) {
  const portraitOpts = {
    src: imgPath,
    alt: character.name,
    eager,
    fallbackLabel: portraitFallback,
  };
  if (part2.fallbackSrc) portraitOpts.fallbackSrc = part2.fallbackSrc;
  const imgHtml = imgPath ? buildManagedPortrait(portraitOpts) : '';

  const lockPill = part2.locked
    ? `<div class="part2-lock-pill">🔒 ${part2.lockText || ''}</div>`
    : '';

  return `
    ${imgHtml}
    <div class="carousel-card-name">${character.name}${getNationalityBadge(character)}</div>
    <div class="carousel-card-role">${character.role}</div>
    <div class="carousel-card-tag">${difficultyLabel}: ${character.difficultyLabel}</div>
    ${lockPill}
    <button class="carousel-info-btn" aria-label="${infoAriaLabel}">ℹ</button>
  `;
}

/**
 * Build HTML for a random-character placeholder card.
 */
export function buildRandomCharacterCardHtml({ imgPath, name, role, difficultyLabel, portraitFallback }) {
  return `
    ${buildManagedPortrait({
      src: imgPath,
      alt: name,
      eager: false,
      fallbackLabel: portraitFallback,
    })}
    <div class="carousel-card-name">${name}</div>
    <div class="carousel-card-role">${role}</div>
    <div class="carousel-card-tag">${difficultyLabel}: Variable</div>
  `;
}

/**
 * Build HTML for a scenario card.
 */
export function buildScenarioCardHtml({ scenario, infoAriaLabel }) {
  return `
    <div class="carousel-card-num">SCENARIO ${scenario.num} · ${scenario.difficulty}</div>
    <div class="carousel-card-name">${scenario.name}</div>
    <div class="carousel-card-role">${scenario.desc}</div>
    <button class="carousel-info-btn" aria-label="${infoAriaLabel}">ℹ</button>
  `;
}

/**
 * Build HTML for a random-scenario placeholder card.
 */
export function buildRandomScenarioCardHtml({ tag, name, desc }) {
  return `
    <div class="carousel-card-num">${tag}</div>
    <div class="carousel-card-name">${name}</div>
    <div class="carousel-card-role">${desc}</div>
  `;
}

/**
 * Build HTML for a Part 2 route card.
 */
export function buildRouteCardHtml({ route, infoAriaLabel, locked, lockText }) {
  const lockPill = locked
    ? `<div class="part2-lock-pill">🔒 ${lockText || ''}</div>`
    : '';
  return `
    <div class="carousel-card-num">${route.tag}</div>
    <div class="carousel-card-name">${route.name}</div>
    <div class="carousel-card-role">${route.desc}</div>
    ${lockPill}
    <button class="carousel-info-btn" aria-label="${infoAriaLabel}">ℹ</button>
  `;
}

// ────────────────────────────────────────────────
// Info-panel toggle (shared logic)
// ────────────────────────────────────────────────

/**
 * Toggle an info panel for a carousel item. Handles show/hide state
 * and delegates content generation to the caller-provided builder.
 *
 * @param {object} params
 * @param {string} params.panelId - DOM id of the info panel element.
 * @param {number} params.idx - Current carousel index.
 * @param {function} params.buildContent - (item) => HTML string, or null to skip.
 * @param {object} params.item - The carousel item to render info for.
 */
export function toggleInfoPanel({ panelId, idx, buildContent, item }) {
  const infoEl = document.getElementById(panelId);
  if (!infoEl) return;

  // Toggle: if already shown for this index, hide it
  if (infoEl.dataset.shownFor === String(idx) && infoEl.classList.contains('visible')) {
    infoEl.classList.remove('visible');
    delete infoEl.dataset.shownFor;
    return;
  }

  const html = buildContent(item);
  if (html == null) return;

  infoEl.innerHTML = html;
  infoEl.dataset.shownFor = String(idx);
  infoEl.classList.add('visible');
}

/**
 * Hide an info panel by id (used when carousel card changes).
 */
export function hideInfoPanel(panelId) {
  const infoEl = document.getElementById(panelId);
  if (!infoEl) return;
  infoEl.classList.remove('visible');
  delete infoEl.dataset.shownFor;
}

// ────────────────────────────────────────────────
// Navigation helpers
// ────────────────────────────────────────────────

/**
 * Move carousel index forward or backward and return the new index.
 * @param {number} currentIdx
 * @param {number} count - Total items.
 * @param {'prev'|'next'} direction
 * @returns {number}
 */
export function stepCarouselIndex(currentIdx, count, direction) {
  if (count === 0) return 0;
  if (direction === 'prev') return (currentIdx - 1 + count) % count;
  return (currentIdx + 1) % count;
}
