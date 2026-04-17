/**
 * Carousel state — extracted from screens.js
 *
 * Owns: mutable carousel index state for expedition-setup and Part 2 screens.
 * Both objects are mutated in-place by carousel navigation functions in screens.js.
 */

export const CAROUSEL_STATE = {
  character: { index: 0 },
  scenario: { index: 0 },
};

// NOTE: CAROUSEL_STATE_PART2 mirrors CAROUSEL_STATE for screen-part2-character.
// It is kept separate to avoid interfering with Part 1 expedition-setup navigation.
// The Part 2 carousels are rendered by renderPart2Carousel(), which intentionally
// mirrors renderCarousel() — keep both in sync when changing card templates.
export const CAROUSEL_STATE_PART2 = {
  character: { index: 0 },
  route: { index: 0 },
};
