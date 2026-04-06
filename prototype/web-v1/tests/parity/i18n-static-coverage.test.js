import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('static UI overlays include bilingual translation hooks for key hardcoded areas', async () => {
  const src = await readFile('prototype/web-v1/ui/screens.js', 'utf8');
  const part2Src = await readFile('prototype/web-v1/ui/screens/part2.js', 'utf8');

  const requiredSelectors = [
    "['#blocking-error-title'",
    "['#blocking-error-summary'",
    "['#field-log-overlay .field-log-title'",
    "['#watch-band #wc-body .watch-cell-label'",
    "['#screen-debrief .debrief-section:nth-of-type(1) .debrief-section-title'",
    "['#screen-debrief .debrief-structured-grid > div:nth-child(1) strong'",
    "['#screen-summit-success .btn-primary'",
    "['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(1) .decision-key'",
    "['#tutorial-modal .screen-kicker'",
    'const PART2_NARRATIVE_ES = {',
  ];

  for (const selectorSnippet of requiredSelectors) {
    assert.equal(src.includes(selectorSnippet), true, `Missing static bilingual hook: ${selectorSnippet}`);
  }

  // localizePart2Narrative moved to ui/screens/part2.js after extraction
  assert.equal(
    part2Src.includes('function localizePart2Narrative(screen)'),
    true,
    'Missing static bilingual hook: function localizePart2Narrative(screen)'
  );

  // Critical aria-label updates should also be localized.
  const requiredAriaHooks = [
    "['#field-log-trigger', 'aria-label'",
    "['#game-help-trigger', 'aria-label'",
    "['#watch-band', 'aria-label'",
    "['#bottom-sheet-route', 'aria-label'",
  ];
  for (const ariaSnippet of requiredAriaHooks) {
    assert.equal(src.includes(ariaSnippet), true, `Missing aria i18n hook: ${ariaSnippet}`);
  }
});
