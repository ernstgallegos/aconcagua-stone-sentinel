# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

SemVer versioning is enforced from `1.3.0` onward. Earlier milestones are documented retroactively from merged changes in the repository history.

## [Unreleased]

### Added

- Added a dual-prototype governance matrix in `docs/prototype-ownership-matrix.md`, a dedicated cross-surface gate script (`npm run test:contracts`), and parity enforcement tests in `prototype/web-v1/tests/parity/dual-prototype-contract.test.js` to lock active-vs-frozen prototype responsibilities and shared-state overlap checks.
- Added engine tuning guardrails in `prototype/web-v1/tests/engine/tuning-guardrails.test.js` covering EP scale constraints, fractional burn-rate floors, and deterministic summit-return viability checks.
- Added nationality parity coverage in `prototype/web-v1/tests/unit/carousel-narrative.test.js` to assert ISO fallback visibility on both Part 1 and Part 2 character-card rendering paths.
- Added `scripts/check-markdown-links.js` and `npm run validate:links` to validate internal markdown links across `README*`, `docs/`, and optional `temp/` scope (`--include-temp`) as a portable drift guard.
- Added `docs/concept-art-catalog.md`: complete visual analysis catalog for the 13 unique scenes across `art/concept-art/curated/ig/` and `art/cover/ig/` (26 images = 13 paired compositions), covering style, subject, mood, palette, design-principle alignment, and recommended use cases per scene. Documents the pairing convention: `art/cover/ig/` carries the "ACONCAGUA: STONE SENTINEL" title overlay (promotional/cover use); `art/concept-art/curated/ig/` contains the same illustrations without text (documentation, web, and flexible marketing use). Updated `art/README.md` to document the `ig/` subdirectories and link to the catalog.
- Integrated curated concept art illustrations into public-facing surfaces: upgraded landing page (`index.html`) hero to Scene 1 (`art/concept-art/curated/ig/1.png` — lone climber at dawn, recommended for landing primary visual); added three-scene atmospheric art strip (Scenes 3, 7, 13) between Vision and System sections; updated `README.md` and `README.es.md` visual-references sections to use the new cover plate (`art/cover/ig/2.png`) and a 4-scene concept art gallery (Scenes 1, 3, 7, 13). Added Section 12 (Visual assets) to `docs/design-system.md` with scene-role pairings, palette alignment notes, and a usage rule separating text-free vs. overlay variants.
- Fixed landing page illustration layout: hero image now fills the full height of the hero section (`align-items: stretch`, `height: 100%`, `object-fit: cover`, `object-position: center 72%`) so the climber is visible and no dead space appears above the card; art strip figures now use `aspect-ratio: 4/5` to respect the original portrait composition, replacing the previous `height: 160px` + `object-position: center top` crop that showed only sky.

### Changed

- Changed run-log mutation flow in `prototype/web-v1/ui/screens.js` to use the centralized telemetry helper `annotateRunLogOutcome()` from `prototype/web-v1/ui/helpers/run-log.js` instead of inline per-entry mapping in `endRun()`.
- Changed public-readiness checklists (`docs/en/public-readiness-checklist.md`, `docs/es/checklist-preparacion-publica.md`) to include `npm run test:contracts` and to standardize JSON validation through `npm run validate:json`.
- Changed `docs/technical-debt-register.md` by closing all five previously active debt items after landing their measurable exit criteria and moving them to the resolved table.
- Changed `docs/balance-calibration-notes.md` to close the previous active-flags TODO with an explicit canonical state, plus a post-`v1.4.7` documentation consolidation note dated 2026-04-08.
- Changed `docs/en/implementation-plan-v1.4.md` and `docs/es/plan-implementacion-v1.4.md` to reflect current Vercel routing reality (root landing at `/` + prototype-specific redirects), replacing outdated redirect wording.
- Changed `CONTRIBUTING.md` and public-readiness checklists to include `npm run validate:links` in documented quality gates/evidence expectations.

### Fixed

- Fixed an obsolete documentation debt entry in `docs/technical-debt-register.md`: removed the active “Narrative bank i18n parity” item after confirming `NARRATIVES` and `NARRATIVES_ES` key coverage is complete, and moved it to the resolved-debt table.
- Fixed release-version drift in `README.md`, `README.es.md`, and `docs/simulation_engine.md` by aligning all public status references to `v1.4.7` (matching `package.json`, `docs/repo-truth.md`, and UI version labels).
- Fixed parity-test coverage gap in `prototype/web-v1/tests/parity/repo-truth-parity.test.js` by extending the canonical version synchronization assertion to include `README.md`, `README.es.md`, and `docs/simulation_engine.md` with `v${package.version}` as the single source of truth.
- Fixed release smoke false failures in `scripts/release-smoke-vercel.js` by replacing the hardcoded UI marker (`Prototype · v1.4.6`) with a dynamic marker derived from `package.json` (`Prototype · v${package.version}`).
- Fixed run-log summary alias drift by removing legacy `lateSignalTriggered` fallback aggregation and keeping canonical `lateSignalActivation` as the only supported late-signal counter input in `prototype/web-v1/ui/helpers/run-log.js`.
- Fixed a broken relative markdown image link in `temp/AUDITORIA_ACONCAGUA_COMPLETA_2026-03-30.md` by resolving it from `temp/` to repository root assets (`../art/...`).

## [1.4.7] — 2026-04

### Added

- Extracted carousel rendering and navigation logic from `screens.js` into `ui/helpers/carousel.js`: card HTML builders (`buildCharacterCardHtml`, `buildRandomCharacterCardHtml`, `buildScenarioCardHtml`, `buildRandomScenarioCardHtml`, `buildRouteCardHtml`), dot renderer (`renderCarouselDots`), info-panel toggle (`toggleInfoPanel`, `hideInfoPanel`), character-image path resolution (`getCharacterImagePath`), and navigation index helper (`stepCarouselIndex`). Part 1 and Part 2 carousels now share the same builder functions.
- Extracted narrative text banks and dispatch logic from `screens.js` into `ui/helpers/narrative.js`: `NARRATIVES` (EN), `NARRATIVES_ES`, `pickNarrative` (pure bank selector with injectable RNG), and `resolveNarrativeText` (pure DOM-free flag-priority dispatcher). The same narrative resolution logic is now independently testable.
- Added `tests/unit/carousel-narrative.test.js` with 20 unit tests covering `getCharacterImagePath` mapping, `stepCarouselIndex` wrapping, `NARRATIVES` bank integrity, `pickNarrative` language selection and fallback, and `resolveNarrativeText` flag priority and decision dispatch.
- Added `tests/unit/telemetry-contract.test.js` with 10 contract tests guarding the per-turn telemetry entry shape, body/raw/pressure sub-key sets, summary shape, and export immutability.
- Added `NARRATIVES_ES` i18n parity item to `docs/technical-debt-register.md` for tracking incomplete Spanish narrative bank coverage.
- Updated `docs/repo-truth.md` source-of-truth ownership map to include `ui/helpers/carousel.js` and `ui/helpers/narrative.js`.
- Added bilingual markdown targets for landing/document-viewer critical docs: `meta/project-whitepaper.es.md`, `meta/public-roadmap.es.md`, and `docs/repo-truth.es.md`.

### Changed

- `screens.js`: replaced ~300 lines of inline carousel rendering, card HTML construction, narrative text banks, `pickNarrative`, and `renderNarrative` logic with thin wrapper delegations to `ui/helpers/carousel.js` and `ui/helpers/narrative.js`. The module now imports card builders, dot renderer, info-panel helpers, and narrative dispatch.
- Carousel navigation functions (`carouselPrev`, `carouselNext`, `part2CarouselPrev`, `part2CarouselNext`) now use `stepCarouselIndex` from the extracted module instead of inline modular arithmetic.
- Updated characterization tests in `new-mechanics.test.js` to reference extracted module sources (`carouselSource`, `narrativeSource`) for `part2-lock-pill` and narrative copy assertions.
- Updated landing markdown CTAs (`index.html`) to resolve per-language document targets dynamically via `data-doc-link`, ensuring EN/ES selection always opens the matching language document in `md-viewer`.
- Updated `md-viewer.html` bilingual routing so language toggles swap to the localized counterpart of the currently viewed document and keep the URL in sync.

### Fixed

- Fixed version drift in `docs/simulation_engine.md`: updated canonical status references from v1.4.5 to v1.4.6 to match the current public build.
- Updated `docs/technical-debt-register.md`: marked "Residual UI coupling in `screens.js`" as resolved (carousel/narrative extraction complete); added new debt item for NARRATIVES_ES i18n parity gap.
- Fixed web-v1 turn resource economy in `engine/turn-rules.js`: `calculateResourceBurnForMinutes()` now preserves fractional burn (two-decimal precision) instead of rounding half-hour burns to zero, so food/water decrease consistently across turns in low-burn stages and high-efficiency profiles.
- Fixed web-v1 resource HUD presentation in `ui/screens.js`: watch and mobile status counters now hide decimals while preserving non-zero visibility by displaying rounded-up whole units (`ceil`) until depletion reaches zero.

## [1.4.6] — 2026-04

### Added

- Added `docs/data-contracts-guide.md`: plain-language schema reference for `characters.json`, `character_events.json`, `context_events.json`, and `nodes.json`. Documents required fields, accepted values (including ISO 3166-1 alpha-2 format for `nationalityCode`), normalization transforms applied by `normalizeRouteData()`, and common validation error messages produced by `validateDataConfigShape`.
- Added full screen-ID table to `docs/deep-links-summary.md`: lists all 15 screen IDs (from `prototype/web-v1/index.html`), their descriptions, valid parameters, and gate requirements. Added valid character ID list and URL-encoded outcome value reference.
- Added `src/styles/public-tokens.css`: shared design tokens and base styles for public-facing surfaces (landing and md-viewer). Extracts the identical `:root` CSS custom property block (colors, surfaces, borders, typography stacks, spacing scale, radius, shadows), base reset (`*`, `html`, `body`, `body::before`, `a`), and `.lang-switch`/`.lang-btn` component CSS that were duplicated verbatim across `index.html` and `md-viewer.html`. Aligns with the modular CSS direction in `prototype/web-v1/css/`.
- Added `src/i18n/public-lang.js`: shared i18n bootstrap for public surfaces. Exposes `window.PublicLang` with `LANG_KEY` (the shared `aconcagua_language_v1` localStorage key), `detectInitialLang(translations)` (localStorage read + browser language fallback), and `wireLangButtons(applyFn)` (click listener wiring for `.lang-btn` elements). Removes the duplicated init machinery that was inline in both HTML files.
- Extracted `findTurningPoint`, `findPrimaryCause`, and `buildReflectionPrompts` from `prototype/web-v1/ui/screens.js` to `prototype/web-v1/ui/screens/debrief.js` as pure, testable functions with injected deps (`turnLog`, `POS_LABELS`, `finalOutcome`, `characterId`, `lang`). No gameplay behavior change.
- Added `prototype/web-v1/tests/unit/debrief-analysis.test.js`: 20 unit tests covering `findTurningPoint` flag priority order (irreversible > critical > weather-window > water-depleted > fallback), EN/ES localization, empty log fallback; `findPrimaryCause` for all 10 canonical outcomes, null/unknown fallback, EN/ES; `buildReflectionPrompts` static/dynamic structure, character-specific prompts, dynamic pool cap at 2.
- Added `prototype/web-v1/ui/game-loop.js`: extracted turn-resolution orchestration from `screens.js` into a new `createGameLoop(deps)` factory. The factory owns the full `handleDecision(decision)` pipeline — sleep-at-camp guard, `resolveTurn` call, acclimatization gain, state updates, log entry building, park-exit detection, run-end classification, and turn counter increment. Rendering callbacks (`renderWatch`, `renderNarrative`, `addLogEntry`, `setDecisionButtonsEnabled`, `onRunEnded`) are injected as deps, keeping the module independent of DOM specifics. `screens.js` now delegates `makeDecision` entirely to `_gameLoop.handleDecision`. No gameplay behavior change.
- Added `prototype/web-v1/tests/unit/game-loop.test.js`: 8 focused unit tests covering sleep rejection at non-camp positions, sleep proceeding at camp, turn counter increment, log entry building, terminal-outcome run-end path, park-exit outcome classification (`returnedToHorcones`), summit-success terminal path, and pressure history capping at 5 entries.
- Added `prototype/web-v1/ui/flow-controller.js`: extracted screen-flow orchestration from `screens.js`. New module owns `showScreen`, `dismissTransientUi`, all modal open/close pairs, bottom-sheet management, `advanceFromTitle`, `handleDeepLink`, and all Escape/backdrop event listeners. Initialized via `initFlowController(hooks)` with callbacks injected from `screens.js`. No behavior change.
- Added `prototype/web-v1/tests/unit/flow-controller.test.js`: 16 characterization tests covering the Part 2 access gate, hash-suppression semantics, `onEnterScreen` hook dispatch, `advanceFromTitle` model-ready guard, `handleDeepLink` routing, and bottom-sheet open/close state.
- Added `prototype/web-v1/ui/helpers/screen-utils.js`: pure utility functions extracted from `screens.js`. Exports: `formatMinutes`, `formatTrendArrow`, `confidenceTier`, `getTimeOfDayBucket`, `getPersistenceTier`, `OUTCOME_CLASS_MAP`, `getOutcomeClass`, and `resolveNavigationTarget` (Part 2 navigation gate).
- Added `prototype/web-v1/tests/unit/screen-utils.test.js`: 45 characterization tests covering time formatting, trend arrows, confidence tiers, time-of-day buckets, persistence tiers, outcome CSS class mapping, and the Part 2 access gate.
- Added `prototype/web-v1/tests/unit/screens-navigation-seams.test.js`: 21 characterization tests covering `syncScreenHash` contract, deep-link hash format for all key screen types, and hash round-trip integrity.
- Added CI cross-browser smoke coverage in `prototype/web-v1/tests/test_smoke_flow.py` and `.github/workflows/ci.yml` so canonical Playwright smoke now runs on Chromium, Firefox, and WebKit, plus a critical mobile (375x812) viewport path check.
- Added `prototype/web-v1/tests/parity/loader-ts-contract-parity.test.js`: parity test that loads real data files through the JS canonical loader (`loadDataConfigFiles` + `normalizeRouteData`) and verifies the output satisfies the TS-side contract invariants for `DataConfig`, `RouteNode`, `CharacterEvent`, `ContextEvent`, and `Character`.
- Added `api/run.test.js` smoke test (6 cases: OPTIONS preflight, missing params, invalid format, 404 unknown run, 200 valid response shape, security headers); wired via new `test:api` npm script included in the default `npm test` run.
- Added `prototype/web-v1/tests/unit/run-log.test.js`: 33 unit tests covering `buildTurnLogEntry`, `summarizeRunLog`, and `buildRunLogExport` shape, immutability, and edge cases.
- Added 37 new unit tests: 27 in `tests/unit/screen-utils.test.js` (body state and pressure label functions) and 10 in `tests/unit/journal.test.js` (journal data access, entry cap, and migration logic).
- Added `prototype/web-v1/ui/helpers/nationality.js` plus `prototype/web-v1/tests/unit/nationality.test.js` to lock nationality/flag rendering fallback behavior: ISO code remains visible when emoji parsing fails or is unavailable, with deterministic `NA` fallback.
- Added shape-validation regression tests in `prototype/web-v1/tests/smoke/model-ready.test.js` for malformed non-first entries in `outcomes` and `scenariosWebV1.predefinedScenarios`.
- Added `scripts/install-local-skill.sh` plus AI skills README guidance to reinstall repository-defined skills into `$CODEX_HOME/skills` for ephemeral web Codex sessions.
- Added `docs/ai/skills/prompting-for-frontend-aesthetics-skill.md` and registered it in the AI skills catalog/manifest.
- Added `scripts/release-smoke-vercel.sh` and `npm run smoke:release` to run a deterministic deploy smoke against the canonical Vercel URL.
- Added `meta/release-readiness-v1.4.5-final.md` as the final readiness closeout report with explicit gate-by-gate evidence and outcomes.
- Added shared text-based favicon asset `art/brand/favicon-aconcagua.svg` and wired it across all public HTML entry points.

### Changed

- Vibe-clarification pass — atmosphere, microcopy, and visual density (`prototype/web-v1`):
  - Debrief section titles: "Run Summary" → "Expedition record", "Key Lesson" → "What shifted", "Structured Debrief" → "Patterns" (ES mirrors updated).
  - Debrief structured-grid labels: "Primary systemic pressure:" → "Pressure axis:", "Primary decision pattern:" → "Decision pattern:", "Recommendation for next run:" → "Next attempt:".
  - `findPrimaryCause` in `ui/screens/debrief.js`: removed "Main cause:" and "Actionable next run:" prefixes from all 10 outcome entries and the fallback.
  - Separated `debrief-cause` (primary observation) from `debrief-next-run-recommendation` ("Next attempt:" field).
  - `classifyDifficultyResponsibility`: softened label phrasing ("Decision pattern dominated" → "Decision pattern shaped outcome", "Mixed responsibility" → "Mixed pressure and choice").
  - Suppressed emoji icon in debrief hero (`debrief-hero-icon`) via CSS `display: none` and JS clearing.
  - Added `.debrief-structured-grid` CSS: labels now render as small mono uppercase (`font-weight: 500`, `color: var(--text-dim)`).
  - Debrief action buttons: "Same scenario + seed" → "Replay this run", "Same scenario + new seed" → "Same scenario, new draw", "Review Turns" → "Review turns", "Copy Run Signature" → "Copy run signature", "View Expedition Journal" → "Expedition journal".
  - Part 2 `future_cta` nav: "Contact the creators to collaborate" → "Get in touch", "Back to title / replay" → "Play again".
  - Startup ready status: "Model ready. Click/tap to begin." → "Model ready." in `startup-ui.js` and `bilingualTextMap`.
  - Updated `debrief-analysis.test.js` and `startup-ui.test.js` to reflect new copy contracts.
- Hardened run-log / telemetry export layer in `prototype/web-v1/ui/helpers/run-log.js`: added JSDoc, pipeline-position comment block, `pressure.epScore` and `pressure.btScore` stable aliases, corrected deprecation-policy comment, and explicit `summarizeRunLog` JSDoc for dual-field `lateSignalTriggered`/`lateSignalActivation` support.
- Extracted `bodyValueClass`, `capacityLabel`, `fatigueLabel`, `exposureLabel`, `pressureDeltaLabel`, and `pressureBandLabel` from `prototype/web-v1/ui/screens.js` to `prototype/web-v1/ui/helpers/screen-utils.js` as pure, side-effect-free formatting helpers.
- Extracted expedition-journal responsibility from `prototype/web-v1/ui/screens.js` to `prototype/web-v1/ui/screens/journal.js`. The new module owns `JOURNAL_KEY`, `migrateJournalKey`, `loadJournal`, `saveJournalEntry`, `clearJournal`, and `renderJournal`.
- Aligned TypeScript contracts to runtime normalization layer: added `RawRouteNode` and `NormalizedRouteData` to `src/types/domain.ts`; changed `DataConfig.nodes` from `RouteNode[]` to `RawRouteNode[]`; expanded `CharacterEngine` with all runtime fields; tightened `ContextEvent` required fields; removed spurious `stage?: Stage[]` from `CharacterEventTrigger`; updated `assertDataConfig()` to validate raw shape; updated `docs/architecture.md` with canonical-layer table.
- Replaced shell-dependent validation entry points with portable Node scripts: `npm run test:webv1` calls `scripts/run-webv1-tests.js`, `npm run smoke:release` calls `scripts/release-smoke-vercel.js`, and `npm run validate:json` provides a cross-platform JSON parse gate.
- `prototype/web-v1/ui/game-loop.js`: imports formatting helpers directly from `screen-utils.js`. Removed 7 entries from the `createGameLoop` factory injection interface.
- `prototype/web-v1/ui/screens.js`: replaced inline journal code (~60 lines) with thin wrapper functions delegating to `ui/screens/journal.js`.
- Expanded `prototype/web-v1/ui/helpers/data-config.js` array-shape guards to validate all `outcomes` entries as strings and all `scenariosWebV1.predefinedScenarios[*].id` values as strings.
- Started screen-render extraction in `prototype/web-v1/ui/screens.js` by delegating title, game widget, debrief analytics, and Part 2 narrative rendering into dedicated modules under `prototype/web-v1/ui/screens/`.
- Refactored `prototype/web-v1/ui/screens.js` to import and delegate all navigation/modal/flow functions from `ui/flow-controller.js`. `screens.js` now calls `initFlowController(hooks)` with render callbacks at module init time. No behavior change.
- Hardened web-v1 UI wiring by replacing `prototype/web-v1/index.html` inline `onclick` handlers with delegated `data-action` dispatch through `prototype/web-v1/ui/event-registry.js`.
- Updated nationality display in web-v1 character cards/carousels to always include a readable ISO fallback label alongside emoji flags, and added optional `nationalityCode` format validation to `ui/helpers/data-config.js`.
- Consolidated `localStorage` write/remove safety through new `prototype/web-v1/ui/helpers/storage.js` and migrated all UI/flow write paths to non-throwing helpers.
- Rebuilt `CHANGELOG.md` into a clean canonical structure: removed exact-duplicate bullets, merged duplicate section headers within versions, consolidated `(release baseline)` and `#### Additional` subsections.
- Migrated `api/run.js` from CommonJS to native ESM (`import`/`export default`); replaced `fs.readFileSync`/`fs.existsSync` with async `fs/promises`; preserved all rate-limiting, CORS, and response-shape behavior.
- Hardened `validateDataConfigShape()` in `prototype/web-v1/ui/helpers/data-config.js` to validate every element of each supported array with indexed error messages (e.g. `$[2].limits`).
- Stabilized `test:webv1` script portability in `package.json` with Node-based recursive test-file discovery.
- Updated README EN/ES Part 2 status wording, onboarding CTA text, canonical prototype status sections, and Monte Carlo caveat notes.
- Added explicit Monte Carlo caveat notes in README EN/ES to prevent treating headless simulator win rates as human-balance ground truth.
- Updated `docs/repo-truth.md` last-updated date and expanded source-of-truth ownership map with new module entries.
- Updated `docs/technical-debt-register.md`: marked `screens.js` orchestration breadth as resolved; added telemetry centralization and residual UI coupling debt items.
- Updated `index.html` and `md-viewer.html` to load shared public CSS/i18n modules; removed duplicated inline CSS blocks.
- Updated `src/interfaces/contactInfo.js` from a comment-only stub to a real ES module export with `CONTACT_EMAIL`, `INSTAGRAM_URL`, `GITHUB_URL`, and structured `contactInfo`.
- Updated GitHub Actions CI gates to include `npm run typecheck`, expanded JSON validation, and `npm run smoke:release`.
- Refactored `prototype/web-v1/src/boot/loadDataConfig.ts` to a thin re-export adapter; updated `docs/architecture.md` with canonical loading path documentation.
- Published explicit alias deprecation policy in `prototype/web-v1/ui/helpers/run-log.js`: legacy `EP`/`BT` field names deprecated since v1.4.5; removal target v1.5.0.
- Rewrote high-visibility public copy across landing, README EN/ES, and in-game help guidance for clarity, tone, and bilingual consistency.
- Unified the language-selector visual component between landing/markdown viewer and `prototype/web-v1`.
- Refreshed typography with unified role system: `Playfair Display` for editorial hierarchy, `Montserrat` for UI body text, and `IBM Plex Mono` for telemetry/label semantics.
- Replaced all public entry-point favicons to use `art/brand/favicon-aconcagua.jpg`.

### Fixed

- Gated web-v1 runtime/state debug logging so diagnostics emit only on localhost or when `localStorage` debug flag `aconcagua_debug_mode=1` is set.
- Hardened web-v1 startup diagnostics by centralizing load-error categorization in `ui/helpers/runtime-diagnostics.js` and wiring standardized developer report formatting into startup/UI logging.
- Fixed brittle mobile smoke assertion in `prototype/web-v1/tests/test_smoke_flow.py` by validating visible post-onboarding action controls (`#btn-advance`) instead of legacy `#action-grid`.
- Fixed `scripts/release-smoke-vercel.sh` to use POSIX-available `grep -Fq` for marker checks instead of `rg`.
- Fixed i18n configuration drift in `prototype/web-v1/ui/screens.js` by removing unused legacy onboarding key copies (`understoodBegin`).

## [1.4.5] — 2026-03

### Added

- Added canonical AI documentation hub under `docs/ai/` with machine-readable manifest (`docs/ai/manifest.json`), skills infrastructure scaffolding, and three initial documented skills (`release-readiness-skill`, `web-v1-regression-skill`, `docs-sync-skill`).
- Added one-click social-share actions in the intro modal (`X`, `Facebook`, `LinkedIn`, `WhatsApp`, and copy-link) plus direct Instagram profile access so players can actively amplify project visibility from the web prototype entry flow.
- Added a dedicated `Follow on Instagram` CTA on the Part 2 final (`future_cta`) screen, linking directly to the canonical project profile so support/follow actions are available from the closing narrative step.
- Added `docs/deploy-routing.md` as the single canonical source for local preview routes, Vercel routing behavior, and API CORS deployment notes (EN/ES in one document).
- Added `prototype/mra-v0/viewer/index.html` as the archived legacy run-replay surface, relocating the former root viewer assets (`app.js`, `styles.css`) under the frozen Python prototype scope.
- Added repository governance baselines `SECURITY.md` and `CODE_OF_CONDUCT.md` to support public reporting/enforcement pathways before wider public scrutiny.
- Added public-readiness checklists in English/Spanish (`docs/en/public-readiness-checklist.md`, `docs/es/checklist-preparacion-publica.md`) with explicit pre-release quality gates and docs-coherence checks.
- Added `prototype/web-v1/tests/unit/startup-ui.test.js` to lock localized startup blocking-error summaries/details for known categories (`missing file`, `invalid json`) and unknown-category fallback behavior.
- Added deterministic outcome reachability coverage in `prototype/web-v1/tests/engine/outcome-reachability.test.js` to validate `Resource Exhaustion`, `Collapse (Exposure)`, and exposure-driven `Rescue` paths.
- Added `prototype/web-v1/tests/parity/i18n-static-coverage.test.js` to lock bilingual coverage hooks for static overlays, debrief labels, summit-success CTAs, onboarding action labels, and localized aria attributes.
- Added focused event hardening and parity suites: `character-events-coverage`, `event-nondominance`, and `repo-truth-guarantees` tests to enforce bounded effects, cooldown/max-per-run behavior, and documented-repo guarantees.
- Added canonical `data/context_events.json` and wired web-v1 to load environment-event archetypes from data contracts (with runtime fallback defaults) instead of hardcoded UI-adjacent constants.
- Added `prototype/web-v1/ui/helpers/startup-ui.js` and `prototype/web-v1/ui/helpers/routing.js` so startup blocking-error rendering and deep-link hash parsing/sync live outside the `screens.js` monolith.
- Added startup failure-classification smoke tests (`prototype/web-v1/tests/smoke/model-ready.test.js`) and routing parser unit coverage (`prototype/web-v1/tests/unit/routing.test.js`).
- Added a data-driven Part 2 contemplative narrative renderer in `prototype/web-v1/ui/screens.js` with paragraph-aware body layout, variable navigation button counts, titleless support, and action wiring for back/debrief/contact/replay flows.
- Added `prototype/web-v1/tests/unit/accessibility-modal.test.js` to pin modal lock/focus-return behavior for the shared accessibility helper and prevent regressions in dialog open/close state handling.
- Added `prototype/web-v1/engine/events-core.js` as the non-UI ownership layer for contextual event planning/application and character-event trigger/effect/limit resolution.
- Added stronger runtime data-contract assertions in `prototype/web-v1/src/types/data-contracts.ts` for route node shape, event category validation, and mandatory event limits/telemetry tags.
- Added explicit event-contract metadata fields in `data/character_events.json` (`conditions`, `visibleToPlayer`, `hiddenFromPlayer`, `oncePerRun`, `notes`) while keeping bounded systemic effects.

### Changed

- Updated `AGENTS.md`, `README.md`, `README.es.md`, and `CONTRIBUTING.md` to reference `docs/ai/README.md` as the canonical AI/agent operations hub while preserving compatibility with existing readiness checklist paths.
- Consolidated duplicated deploy/routing instructions out of `README.md` and `README.es.md`, leaving those files with concise route summaries that now point to the canonical deploy-routing reference.
- Changed repository root `index.html` to a direct web-v1 entry shell (meta/JS redirect + fallback links), making the active prototype the explicit default in static and deployed contexts.
- Changed EN/ES README route documentation to simplify onboarding around one canonical entry point (`/`) plus one explicit archived MRA v0 viewer route.
- Strengthened `AGENTS.md` with mandatory AI hard-gate policy requiring completion of the public-readiness checklist, changelog synchronization, and validation evidence before task finalization.
- Updated `CONTRIBUTING.md` public-readiness policy so AI-assisted/release-facing PRs must include explicit command evidence for readiness gates.
- Updated EN/ES public-readiness checklist documents to explicitly require command evidence in PR/final reports for completed gates.
- Updated root readmes to surface governance + readiness links (`CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, and localized readiness checklists) for contributor onboarding.
- Updated `CONTRIBUTING.md` to require the public-readiness checklist pass for release-hardening work and to include the `npm run typecheck` gate in the default validation flow.
- Enriched root documentation (`README.md`, `README.es.md`) with in-repo visual references (cover art, character portraits, and curated concept art) to improve onboarding and style alignment for contributors.
- Updated `meta/release-hardening-v1.4.5.md` with a consolidated release-hardening audit/checklist snapshot tied to the v1.4.5 stabilization baseline.
- Updated character portrait sourcing so Part 1 carousel keeps using `art/characters/*.png`, while Part 2 carousel now prefers `art/characters/part-2/*.png` with automatic fallback to Part 1 images when a Part 2 variant is missing.
- Documented portrait asset contracts and filename mapping in `art/characters/README.MD` and `art/characters/part-2/README.MD` for Part 1 vs Part 2 carousel usage.
- Updated the Monte Carlo harness to source canonical terminal outcomes from `data/outcomes.json` instead of a duplicated hardcoded list, preventing simulator/runtime taxonomy drift.
- Updated playtest evidence references from `v1.4.1` to `v1.4.5` in `docs/balance-calibration-notes.md`, `docs/en/implementation-plan-v1.4.md`, and `docs/es/plan-implementacion-v1.4.md`.
- Updated simulation-engine documentation to state that Monte Carlo outcome taxonomy is loaded from `data/outcomes.json`.
- Expanded static web-v1 localization pass in `prototype/web-v1/ui/screens.js` so previously hardcoded interface strings (fatal/startup copy, watch labels, debrief sections, tutorial/onboarding labels, summit-success CTAs, and key aria/title attributes) now re-render consistently in the selected language.
- Clarified module ownership by moving turn-review log-entry shaping into `prototype/web-v1/ui/helpers/run-log.js` and keeping `ui/screens.js` as orchestration/render wiring only.
- Strengthened event boundedness in `prototype/web-v1/engine/events-core.js` with explicit per-effect clamps for context/character events plus sanitized cooldown/max-per-run handling, preventing hidden authority drift from data misconfiguration.
- Expanded `docs/repo-truth.md` with a “Guaranteed by tests” section and tightened `docs/simulation_engine.md` legacy wording to explicitly scope remaining v1.3 compatibility contracts.
- Strengthened domain/data contracts to include context-event trigger/effect/limits typing, aliased `CharacterEventLimits`, and enforced `contextEvents` validation in both TS and UI data-load validators.
- Updated web-v1 event-plan bootstrapping so `buildEnvironmentEventPlan()` receives `DATA_CONFIG.contextEvents`, keeping event ownership in engine logic while preserving seed-based turn offsets.
- Expanded parity/contract/engine tests to cover context-event schema integrity and docs/runtime authority consistency.
- Improved title/startup UX with restrained loading state copy and model-readiness gating on the Begin CTA, keeping failure modes explicit without adding non-diegetic UI noise.
- Hardened modal accessibility helpers with focus-trap support and applied them to help, watch-detail, and field-log overlays so keyboard navigation stays inside dialogs until closed.
- Refined startup status microcopy to keep the loading/ready states calm and mountain-toned (`Preparing mountain model…`, `Model ready. Begin when prepared.`).
- Synchronized canonical character framing across runtime and docs by aligning `data/characters.json` role/bio/trait profiles with the v3 character bible (`docs/es/Personajes_v_3.md`).
- Rebased `data/character_events.json` narrative strings on canonical psychological arcs so contextual events reflect each character's defined dramatic tension.
- Rewrote `docs/en/characters_v_3_en.md` to match the six-character canonical cast and interaction map from the Spanish master bible.
- Replaced the legacy Part 2 bridge cards in `prototype/web-v1/index.html` with the canonical seven-screen pre-threshold Francisco sequence (`mendoza_room` → `future_cta`) and hooked subtle per-preset contemplative animation/visual treatments in `prototype/web-v1/css/screens.css`.
- Updated Part 2 gating/deep-link/smoke coverage and references to the new narrative screen IDs in `prototype/web-v1/ui/screens.js`, `prototype/web-v1/tests/test_smoke_flow.py`, and `docs/deep-links.web-v1.md`.
- Tightened Part 2 narrative pacing by rewriting the seven-screen Francisco text block to roughly half the previous reading length while preserving second-person voice, canonical logistics details, and pre-threshold scope.
- Hardened runtime bootstrap flow in `prototype/web-v1/ui/screens.js` so setup carousels/deep-link initialization only execute after successful required-data loading and failures are surfaced through blocking diagnostics instead of silent partial boot.
- Hardened global modal behavior in `prototype/web-v1/ui/helpers/accessibility.js` and `prototype/web-v1/ui/screens.js` by adding body scroll-lock state, overlay-dismiss wiring on backdrop clicks, and automatic transient overlay cleanup during screen transitions.
- Changed `prototype/web-v1/ui/helpers/events.js` to delegate systemic event mutations to `engine/events-core.js`, keeping UI helpers as thin orchestration wrappers.
- Expanded TypeScript domain contracts in `prototype/web-v1/src/types/domain.ts` with explicit interfaces for `ContextualAction`, `BodyToleranceResult`, event triggers/effects/limits, and richer run-log/context-event typing.
- Updated canonical public version references to `v1.4.5` across package metadata, UI labels, and status docs (`README*`, `docs/repo-truth.md`, `docs/architecture.md`, `docs/simulation_engine.md`, `prototype/web-v1/README.md`).

### Fixed

- Fixed terminal-outcome resolution in `prototype/web-v1/engine/turn-resolution.js` so `Collapse (Exposure)` and `Resource Exhaustion` are now reachable canonical outcomes with explicit precedence.
- Fixed the Part 2 `future_cta` collaboration action to reliably open the official project contact (`aconcaguastonesentinel@gmail.com`) via `mailto:` from the final screen CTA.
- Fixed startup/fatal diagnostics copy in `prototype/web-v1/ui/helpers/startup-ui.js` to emit localized English/Spanish messaging (including categorized blocking-error summaries and details) based on active language selection.
- Fixed GitHub Actions workflow YAML parsing by quoting the Python lint step name that contains a colon, resolving CI invalid-workflow failures at `.github/workflows/ci.yml` line 29.
- Fixed CI test discovery by replacing the quoted `**/*.test.js` Node test glob with a `find`-driven file list so `npm test` resolves web-v1 test files correctly on GitHub Actions shells.
- Fixed debrief turn-review readability by adding per-turn signal-interpretation hints (confidence/trend/conservative-play framing) without exposing raw EP/BT/delta internals.
- Fixed a contract hole where context events could omit `label` despite `ContextEvent.label` being required; both TS and JS validators now enforce a non-empty label and `data/context_events.json` now provides canonical labels.
- Fixed blocking startup diagnostics to distinguish missing file, HTTP failure, invalid JSON/shape, and post-load contract validation failures with per-file detail in the fatal screen.
- Fixed startup failure categorization to emit explicit `missing file`, `http failure`, and `invalid json` categories (instead of collapsing all non-shape errors into generic `load failure`).
- Fixed web-v1 docs data-source drift by adding `data/context_events.json` to architecture/README source-of-truth lists.
- Fixed a startup resilience defect where `loadDataConfig()` failures still allowed post-load UI bootstrap code to run, which could leave the app in a confusing partially initialized state after a blocking data error.
- Fixed overlay persistence regressions where help/watch/field-log panels could remain open across route/screen transitions and appear to freeze interaction.
- Fixed event/data drift risk by testing the expanded character-event contract fields in `prototype/web-v1/tests/contracts/data-contracts.test.js`.

### Security

- Added a dedicated `SECURITY.md` with private-reporting instructions, response targets, and coordinated-disclosure policy.

## [1.4.3] — 2026-03

### Added

- Added `prototype/web-v1/ui/helpers/carousel-media.js` plus unit coverage to standardize carousel portrait preload/skeleton/fallback states and reduce setup-card flicker on slow loads.
- Added a deterministic regression layer for web-v1 with golden scenario structural assertions and outcome-derivation tests covering park-exit outcomes, permit expiry, and summit-window closure (`prototype/web-v1/tests/engine/golden-scenarios.test.js`, `prototype/web-v1/tests/engine/outcome-derivation.test.js`).
- Added lightweight modular helpers under `prototype/web-v1/ui/helpers/` for help-overlay content, debrief/run-signature analysis, run-log serialization, accessibility focus handling, and seed-driven event logic.
- Added a seed-driven dynamic environment event layer (calm opening, rising wind, visibility drop, temporary clearing, summit-window tightening) integrated into the canonical resolver weather stage with subtle watch cues (`prototype/web-v1/ui/screens.js`, `prototype/web-v1/engine/turn-resolution.js`, `prototype/web-v1/ui/helpers/events.js`).
- Added one lightweight character-specific event per protagonist with bounded systemic effects and narrative cues, preserving mountain-first authority in `resolveTurn(state, action)`.
- Added structured debrief sections, run signature summary/copy action, and local turn-review controls to improve replay and post-run readability (`prototype/web-v1/index.html`, `prototype/web-v1/ui/screens.js`, `prototype/web-v1/css/components.css`).
- Added accessibility smoke coverage for modal focus helpers and run-log export contract coverage for `run_log.json` summary structure (`prototype/web-v1/tests/accessibility-smoke.test.js`, `prototype/web-v1/tests/model-contract.runlog.test.js`).
- Published reusable engine formula module `prototype/web-v1/engine/pressure-model.js` plus deterministic harness `prototype/web-v1/tests/harness/turn-harness.js` for turn-level regression checks.
- Added web-v1 engine unit tests for Environmental Pressure and Body Tolerance calculations and a resolve-turn pipeline ordering contract (`prototype/web-v1/tests/engine/pressure-calculations.test.js`, `prototype/web-v1/tests/engine/resolve-turn-pipeline.test.js`).
- Added in-game `Pressure & Trend Help` overlay with bilingual content and keyboard escape-close support (`prototype/web-v1/index.html`, `prototype/web-v1/ui/screens.js`, `prototype/web-v1/css/components.css`).
- Added systemic acceptance coverage for the EP→BT→Perception pipeline constraints, uncertainty guarantees, and conditional action optimality (`prototype/web-v1/tests/engine/systemic-acceptance.test.js`).

### Changed

- Expanded in-game help overlay content to explain pressure labels, trend categories, confidence semantics, retreat legitimacy, and "How to read this game" guidance without exposing raw system truth (`prototype/web-v1/ui/helpers/help-overlay-content.js`, `prototype/web-v1/ui/screens.js`).
- Enriched run-log turn entries with stage/node metadata, warning-state/context-event telemetry, and kept exports backward-compatible via additive fields.
- Improved keyboard/readability support with stronger focus-visible states, reduced-motion hardening, and reusable focus-return modal helpers (`prototype/web-v1/css/components.css`, `prototype/web-v1/ui/helpers/accessibility.js`).
- Added contributor-friendly validation scripts `test:webv1` and `test:full` in `package.json`.
- `prototype/web-v1/engine/turn-resolution.js` now exports a canonical `RESOLVE_TURN_PIPELINE` contract and `resolveTurnWithTrace()` so tests can enforce resolver stage ordering.
- `prototype/web-v1/ui/screens.js` now delegates EP/BT calculations to `engine/pressure-model.js`, keeping runtime math centralized and testable.
- Improved gameplay readability by increasing watch/status typography, strengthening text contrast for critical HUD labels, and applying consistent `:focus-visible` states to interactive controls (`prototype/web-v1/css/components.css`).
- Expanded web-v1 test discovery to include nested engine test suites via `package.json` `npm test` glob update.
- `resolveTurn()` now persists a structured per-turn telemetry snapshot (`lastTurnRecord`) including environment, pressure tuple, perception, action, and resulting state for deterministic auditability (`prototype/web-v1/engine/turn-resolution.js`).
- Updated engine documentation with the canonical resolver order and systemic acceptance contract (`docs/simulation_engine.md`).

### Fixed

- Fixed setup/Part-2 carousel portrait rendering to avoid blank-image flashes by reserving media space, using loading skeletons, fading in loaded assets, and showing localized fallback copy on image failure.
- Ensured context events are tracked in telemetry (`lastTurnRecord.contextEvent`) without introducing duplicate resolver branches.
- Locked resolver integration against pipeline drift with explicit ordered stage tracing in tests and harness runs, reducing risk of silent turn-order regressions.
- Fixed Monte Carlo simulator metadata/output drift by deriving report filename and engine version from `package.json` instead of the stale `v1.4.1` literal (`scripts/monte-carlo-web-v1.js`).
- Fixed `docs/simulation_engine.md` coherence drift so the public build status matches `v1.4.2` and the canonical outcomes list includes `Permit Expired`.
- Fixed a runtime blocker in web-v1 state telemetry by adding `lastTurnRecord` to `TELEMETRY_STATE_DEFAULTS`; without this, `recordTelemetry()` rejected turn writes with `Unknown telemetryState key: lastTurnRecord` during live gameplay (`prototype/web-v1/state/game-state.js`).
- Added a regression test that verifies `recordTelemetry()` accepts and persists `lastTurnRecord` through both `telemetryState` and the legacy facade (`prototype/web-v1/tests/state/game-state.test.js`).

### Security

- No security-impacting changes in this release.

## [1.4.2] — 2026-03

### Added

- Hash-based deep-link support for `prototype/web-v1`: every screen can now be opened directly via `index.html#<screenId>[&param=value…]`. Added `parseDeepLinkHash()`, `handleDeepLink()`, `bootstrapMockDebrief()`, and `buildMockTurnLog()` in `prototype/web-v1/ui/screens.js`. `showScreen()` now syncs the URL hash on each navigation, making every screen shareable. Part 2 screens accept `&force=1` to bypass the summit-achieved gate during evaluation.
- `docs/deep-links.web-v1.md`: bilingual (EN + ES) reference document listing all 14 screen deep-link URLs, supported parameters (`character`, `scenario`, `seed`, `outcome`, `force`), character/scenario IDs, outcome values, and a maintenance note for keeping the list in sync with `index.html`.
- README.md and README.es.md: added "Deep-link URLs" subsection with format description, copy-pasteable examples, and a link to the full reference document.
- Game screen redesign: new single-column layout replacing the two-column `game-layout-redesign` grid.
  - `.situation-bar`: persistent top bar with character portrait (32 px circle, border encodes body state), position+altitude, day/time, turn counter, and trend glyph.
  - `.mountain-view`: dominant zone with compact route strip (small dots only, no labels) + narrative area in serif italic font + "View field log" link.
  - `.watch-band`: compact 4-cell horizontal band (Body, Pressure, Supplies, Permit); tap/click opens the watch detail overlay.
  - `.signal-line`: single italic serif sentence of contextual alert text, replacing the 5-text-area context section.
  - Decision bar: simplified to action buttons + embedded decision-window timer; microcopy and cost pips removed from visible default view.
  - `#watch-detail-overlay`: progressive disclosure modal exposing full body metrics, environment, resources, permit, and risk chips on demand.
  - `#field-log-overlay`: slide-up overlay for the field log, accessible via "View field log" link.
  - `openWatchDetail()` / `closeWatchDetail()` / `openFieldLog()` / `closeFieldLog()` functions exposed on `window`.
  - `showScreen()` now hides `title-top-controls` during gameplay and restores them when leaving the game screen.
- CSS module system: extracted all inline CSS from `prototype/web-v1/index.html` into 8 separate files under `prototype/web-v1/css/`: `tokens.css`, `reset.css`, `layout.css`, `components.css`, `screens.css`, `animations.css`, `themes.css`, `responsive.css` (Decision 1).
- Plus Jakarta Sans added as UI/Headlines font via Google Fonts import; applied to all titles, buttons, labels, and navigation (Decision 8).
- Ken Burns animation (20 s, `animation-fill-mode: forwards`) on splash image; disabled when `prefers-reduced-motion` is set (Decision 4).
- Screen entry/exit transitions: `screen-enter` (0.3 s, 12 px up) and `screen-exit` (0.15 s, −8 px); Splash→Title crossfade at 0.6 s; reduced-motion users get a direct cut (Decision 14).
- 3-level micro-interaction system: primary buttons (BEGIN, CONFIRM) with glow + ripple; secondary (decisions) with border→ochre fill; tertiary (links) with animated underline; all respect `prefers-reduced-motion` (Decision 16).
- Difficulty pill-row: horizontal scrollable pill selector replaces card grid; selected pill shows description below; mobile-friendly with `scroll-snap-type` (Decision 11).
- **[EXPERIMENTAL]** Onboarding single-briefing layout already in place; tutorial pop-up already present (Decision 15, CSS structure support).
- **[EXPERIMENTAL]** Game screen mobile bottom-sheets: mini status bar, `[⌚ Watch]` and `[🏔 Route]` trigger buttons, swipe-dismiss bottom-sheets with backdrop (Decision 13).
- **[EXPERIMENTAL]** Debrief hero section: fullbleed `concept-curated-4.webp` background with outcome-specific CSS filter (warm/neutral/cold); headline + key-stats overlay; stats grid (2×3 cards); JS `updateDebriefHero()` populates all elements (Decision 18).
- `openBottomSheet` / `closeBottomSheet` window-exposed helpers for mobile game panels.
- `auto` added to `VALID_VISUAL_MODES` set in `screens.js`.
- Carousel component: reusable `.carousel-section` / `.carousel-track` / `.carousel-card` / `.carousel-arrow` / `.carousel-dots` CSS classes in `css/components.css`; supports left/right arrow navigation with wrapping and active-dot position indicators.
- **"Begin Expedition"** (`btn-primary`) and **"Quick Start"** (`btn-ghost`) action buttons on `screen-expedition-setup`; Quick Start randomizes character and scenario while respecting the player-selected difficulty.
- `[ℹ]` info expand button on character and scenario carousel cards, revealing a collapsible panel with full bio/traits or scenario intro text.
- `buildExpeditionSetupCarousels()`, `carouselPrev()`, `carouselNext()`, `renderCarousel()`, `toggleCarouselInfo()`, `beginExpedition()`, and `quickStart()` functions in `ui/screens.js`; all exposed on `window` for inline HTML handlers and tests.
- `CAROUSEL_STATE` global object exposed on `window` to allow test-time carousel position overrides.
- i18n keys for new screen in both `en` and `es` locales: `prepareExpedition`, `beginExpedition`, `quickStart`, `carouselDifficulty`, `carouselCharacter`, `carouselScenario`, and carousel arrow `aria-label` strings.
- `#screen-expedition-setup` background style in `css/screens.css` reusing `concept-curated-4.webp` blurred ambient layer (matches `screen-character` aesthetic). `.expedition-setup-shell` max-width centered container.
- Carousel mobile-compact overrides in `css/responsive.css` (base/`max-width:479px` breakpoint).
- Merged `screen-splash` and `screen-title` into a single unified welcome screen (`screen-title`) in `prototype/web-v1/index.html`: cover image (`cover-concept-1.png`) as fullbleed background with Ken Burns animation, overlay gradients for text legibility, and the existing BEGIN button. Reduces pre-game navigation steps from Splash → Title → Expedition Setup to Welcome → Expedition Setup.
- Added character portrait images to the carousel card in `screen-expedition-setup`: introduced `getCharacterImagePath()` utility in `prototype/web-v1/ui/screens.js` and rendered `<img class="carousel-card-portrait">` above the character name for each real character option.
- Added character photo to the permit widget in `screen-game`: updated markup in `prototype/web-v1/index.html` (`permit-widget-body`, `permit-photo`, `permit-info`) and updated `updatePermitWidget()` in `prototype/web-v1/ui/screens.js` to set the photo on each turn.
- Added `.carousel-card-portrait`, `.permit-widget-body`, `.permit-photo`, and `.permit-info` styles to `prototype/web-v1/css/components.css`.
- Added `difficultyModifiers` field to each predefined scenario and random archetype in `data/scenarios.web-v1.json`, embedding the difficulty configuration directly in the scenario data.
- Added `flag` emoji field to each character in `data/characters.json` representing their nationality.
- Added `deriveDifficultyFromScenario()` helper in `prototype/web-v1/ui/screens.js` that derives `CURRENT_DIFFICULTY_ID` from the active scenario's difficulty string for legacy compatibility.

### Changed

- Changed web-v1 modal orchestration to route intro/tutorial/onboarding through shared focus-trap helpers and one Escape/backdrop-close path, including consistent bottom-sheet scroll locking/unlocking.
- Changed mobile narrative presentation in `prototype/web-v1/css/components.css` and `prototype/web-v1/css/responsive.css` to reduce text density with tighter line-width limits, improved spacing, and gentler small-screen typography.
- Changed `prototype/web-v1/ui/screens.js` to delegate modal/backdrop wiring to `ui/helpers/modal-controller.js`, reducing monolithic UI responsibility without altering public flow.
- Public-facing prototype version was consolidated as `v1.4.2` across runtime metadata and intro/tutorial UI labels (`package.json`, `package-lock.json`, `prototype/web-v1/index.html`, `prototype/web-v1/ui/screens.js`).
- Tutorial flow text now reflects the active navigation (`title → expedition-setup`) and no longer claims title-level visual mode/difficulty selection (`prototype/web-v1/index.html`, `prototype/web-v1/ui/screens.js`).
- Readme status references now point to the current `1.4.2` release block instead of `[Unreleased]` to avoid mixed-state guidance (`README.md`, `README.es.md`).
- Onboarding screen converted to a popup modal overlay (`#onboarding-modal`) that appears on top of the game screen instead of as a separate full-screen step. `showOnboarding()` now calls `startGame()` first (activating `screen-game`) and then shows the modal over it. Players can open the full tutorial from within the modal or return to expedition setup via "Back to Setup" (`prototype/web-v1/index.html`, `prototype/web-v1/ui/screens.js`, `prototype/web-v1/css/components.css`, `prototype/web-v1/css/screens.css`).
- Onboarding modal primary action renamed from "Understood. Begin." to "Begin Expedition" (reuses existing `beginExpedition` i18n key, ES: "Iniciar expedición"). Button moved from the top-right header to a centered `btn-primary` CTA at the bottom of the modal, below the action reference and secondary links (`prototype/web-v1/index.html`, `prototype/web-v1/css/components.css`, `prototype/web-v1/ui/screens.js`).
- `#onboarding-modal` z-index set to 2400 (below general tutorial-modal at 2500) so the tutorial/FAQ modal can open on top of the onboarding modal without interception (`prototype/web-v1/css/components.css`).
- Removed `#screen-onboarding` section from `index.html` and its CSS rule from `screens.css`.
- Updated `applyStaticTranslations()` to use new `#onboarding-modal` selectors instead of removed `#screen-onboarding` selectors.
- Smoke tests updated to verify onboarding modal visibility over game screen instead of `screen-onboarding` activation (`prototype/web-v1/tests/test_smoke_flow.py`).
- `screen-part2-character` (Part 2 character and route selection) now uses the same carousel structure and visual treatment as `screen-expedition-setup`: blurred concept-art background (`concept-curated-4.webp`), carousel tracks with arrows and position dots, character portrait images, and collapsible info panel (`prototype/web-v1/index.html`, `prototype/web-v1/css/screens.css`, `prototype/web-v1/ui/screens.js`).
- Part 2 carousel starts at Francisco + Guided Ascent (the only unlocked pair), so the confirm button is immediately enabled — matching Part 1 expedition-setup behavior. Navigating to a locked character or route disables it.
- Locked Part 2 options render with dashed border and `🔒 LOCKED FOR NOW` / `🔒 Coming later` pill on the carousel card, same `.part2-lock-pill` style as before.
- CSS sync rule: `#screen-expedition-setup` and `#screen-part2-character` now share a single selector block for background, padding, and z-index stacking in `css/screens.css`. A comment mandates mirroring any background changes across both selectors.
- JS sync rule: `renderPart2Carousel()` in `ui/screens.js` carries an explicit code comment that it mirrors `renderCarousel()` for character cards. Any future change to the Part 1 card template (portrait, name/role/tag rows, info button) must also be applied to `renderPart2Carousel()`.
- Part 2 setup functions refactored: `buildPart2SetupScreen()` now initializes `CAROUSEL_STATE_PART2` and calls `renderPart2Carousel()`. Removed `PART2_SELECTION` object, `selectPart2Character()`, and `selectPart2Scenario()` (carousel index is now the canonical selection). Added `getPart2CarouselItems()`, `renderPart2Carousel()`, `togglePart2CarouselInfo()`, `part2CarouselPrev()`, `part2CarouselNext()`.
- Updated `test_smoke_flow.py` Part 2 assertions to use carousel-based navigation (arrow clicks, dot count) instead of grid card IDs.
- Updated `new-mechanics.test.js` Part 2 bridge test to check for `id="part2-carousel-card-character"` / `id="part2-carousel-card-route"` instead of the removed grid IDs.
- `css/layout.css`: replaced two-column game grid with single-column flex stack; `watch-status-layout` / `watch-core-column` / `watch-status-column` retained for watch detail overlay.
- `css/components.css`: added `.situation-portrait`, `.watch-band`, `.watch-cell`, `.watch-cell-bar`, `.signal-line`, `.watch-detail-overlay`, `.field-log-overlay` styles.
- `css/screens.css`: replaced old watch panel padding overrides with new game screen structure overrides.
- `css/responsive.css`: simplified game breakpoints (single-column needs fewer overrides); removed old mobile-collapsible and command-column rules.
- `renderWatch()` in `ui/screens.js`: now populates situation bar (portrait, position, datetime, turn, trend), watch band cells (body bar + state, pressure dots + trend, supplies, permit days), and keeps populating detail overlay elements.
- `renderContextWidget()`: populates `.signal-line` with a single-sentence alert based on the risk profile.
- `updatePermitWidget()`: also sets `situation-portrait` src, `wc-permit-days` watch band cell, and watch detail overlay character name/difficulty.
- Data reduction: default view shows ~12 data points (was ~36+); full detail available via watch overlay on demand.
- `prototype/web-v1/index.html`: replaced single `<style>` block (~1 200 lines) with 8 `<link>` tags pointing to CSS modules (Decision 1).
- `prototype/web-v1/index.html`: splash `<img>` keeps `splash-image` class; JS activates `ken-burns-active` class on load (Decision 4).
- `prototype/web-v1/index.html`: title screen inline `font-size: 0.8rem` removed from `.title-sub`; now uses CSS minimum 1 rem (Decision 9).
- `prototype/web-v1/index.html`: debrief screen restructured into hero + stats-grid + existing sections (Decision 18).
- `prototype/web-v1/index.html`: game screen adds mini status bar and bottom-sheet HTML (Decision 13).
- `prototype/web-v1/css/tokens.css`: new "Andean Modern" palette (`--bg: #0c1017`, `--surface: #151a22`, `--ochre: #c49a5c`, `--ice: #7fb3c8`, `--red: #b85450`, new `--safety: #6b9e5e`) (Decision 10).
- `prototype/web-v1/css/tokens.css`: base font-size 16 px in `reset.css`; minimum text 12 px enforced (Decision 9).
- `prototype/web-v1/css/responsive.css`: replaced dispersed 680/720/980 px breakpoints with 5 mobile-first tiers (480/768/1024/1280 px) (Decision 7).
- `prototype/web-v1/css/screens.css`: splash now uses `object-fit: cover` + `object-position: center top` (Decisions 2 & 3).
- `prototype/web-v1/css/screens.css`: title screen overlay gradient improved for text legibility (Decision 5).
- `prototype/web-v1/css/screens.css`: character-select and scenario-select screens use `concept-curated-4.webp` as ambient blurred background (Decision 6).
- `prototype/web-v1/ui/screens.js`: `renderDifficultySelector()` now renders pill-row with description (Decision 11).
- `prototype/web-v1/ui/screens.js`: `showScreen()` now triggers `screen-exit` animation on departing screen before activating target (Decision 14).
- `prototype/web-v1/ui/screens.js`: `initSplashScreen()` activates Ken Burns class on splash image (Decision 4).
- `screen-title` simplified: removed `title-difficulty-panel` div (difficulty grid + note); BEGIN button now navigates to `showScreen('expedition-setup')` instead of `showScreen('character')`.
- Version eyebrow on title screen standardized to `Prototype · v1.4.2` to match release metadata and docs.
- `showOnboarding()` back button now returns to `expedition-setup` instead of `scenario`.
- Debrief "Change character" action now navigates to `expedition-setup`.
- `goChooseScenario()` now navigates to `expedition-setup` instead of rebuilding the old scenario grid.
- `showScreen()` calls `buildExpeditionSetupCarousels()` when navigating to `expedition-setup`.
- `setLanguage()` rebuilds carousel labels/cards when the expedition-setup screen element exists.
- `buildCharacterGrid()` and `buildScenarioGrid()` guard against missing container elements (null-safe) since `screen-character` and `screen-scenario` are removed.
- `applyStaticTranslations()` cleaned up: removed entries for removed screen elements (`screen-character`, `screen-scenario`, `title-difficulty-label`).
- `new-mechanics.test.js` integration assertion updated: checks for `id="carousel-card-difficulty"` instead of `id="title-difficulty-grid"`.
- `test_smoke_flow.py` updated to reflect new flow: navigates through `screen-expedition-setup` using carousel arrows and `beginExpedition()`; `reach_game_with_character()` sets carousel index via `window.CAROUSEL_STATE` instead of clicking old character grid cards.
- Simplified the `prototype/web-v1/index.html` debrief so it now focuses on outcome, core run summary, and one actionable lesson instead of exposing the full turn log, analytics checklist, and reflection blocks by default.
- Refined `prototype/web-v1/css/screens.css` and `prototype/web-v1/css/responsive.css` debrief styling for a smaller summary-first layout and added compact mobile watch-sheet cards so handheld status panels surface the same key data as the main HUD.
- Simplified `prototype/web-v1/index.html` gameplay screen for mobile: watch, context, and field-note panels now collapse into compact accordions while the decision panel stays sticky and action buttons hide secondary microcopy/cost details on narrow viewports so primary actions remain visible.
- `prototype/web-v1/css/responsive.css` now prioritizes mobile playability on `screen-game`: reduced inter-panel spacing, sticky decision footer, fixed mobile utility bar, and compact typography/layout for status accordions.
- `prototype/web-v1/css/components.css` adds reusable `.mobile-collapsible*` helpers used by the gameplay status panels.
- Simplified `prototype/web-v1/index.html` welcome screen so the visible layout now keeps the cover image plus the primary advance CTA, while prototype description, version/status, and credits move into an optional modal opened from a compact info trigger.
- `prototype/web-v1/css/screens.css`: replaced per-screen `#screen-splash` block with `.splash-content` absolute-positioned background layer; `#screen-title` now uses cover image via `<img>` element instead of CSS `background-image`; combined overlay gradients into `#screen-title::before`; `.title-shell` z-index bumped to 2.
- `prototype/web-v1/ui/screens.js`: replaced `leaveSplash()` + `initSplashScreen()` with `initWelcomeScreen()` (applies Ken Burns to cover image in `#screen-title`); removed `SPLASH_EXIT_DURATION_MS` constant and special-case exit duration; removed `splashTap` i18n key and `#screen-splash .splash-cta` from `applyStaticTranslations()`.
- `prototype/web-v1/tests/test_smoke_flow.py`: updated test flow to start from `screen-title` as the active screen (removed `#screen-splash` click and intermediate wait); updated `reach_expedition_setup` docstring; simplified `reach_game_with_character` helper.
- Updated `prototype/web-v1/index.html` welcome screen so the primary BEGIN CTA stays centered and the prototype information button sits beside it, reducing top-corner scan on first load.
- Unified the gameplay `watch` and `status` content inside a single status panel in `prototype/web-v1/index.html` and tuned `prototype/web-v1/css/components.css` / `prototype/web-v1/css/responsive.css` so mobile players read one simplified stack instead of separate watch/status accordions.
- Added a collaboration/contact CTA to the Part 2 closure screen in `prototype/web-v1/index.html`, inviting feedback and ideas via `aconcaguastonesentinel@gmail.com`.
- Refined `prototype/web-v1/index.html` + `prototype/web-v1/css/screens.css` / `prototype/web-v1/css/responsive.css` welcome screen so the cover image no longer sits behind a heavy darkening layer, the info trigger moves below the primary BEGIN CTA, the info modal now includes repository/contact CTAs, portrait/mobile keeps the cover full-height without top/bottom gaps, and landscape shows the complete artwork with side margins when needed.
- Rebuilt the Part 2 entry selection in `prototype/web-v1/index.html` / `prototype/web-v1/ui/screens.js` with the same carousel-style setup language used in Part 1 while limiting the available choices to Francisco and the guided Normal Route group expedition.
- Simplified the `prototype/web-v1/index.html` welcome screen chrome by moving the info trigger to the top-left corner, compressing the language/theme controls into compact icon-led selectors at the top-right, and replacing the central BEGIN button with a bottom-center full-screen continuation hint.
- Clarified the expedition-setup secondary CTA in `prototype/web-v1/index.html` / `prototype/web-v1/ui/screens.js` so Quick Start explicitly advertises its random character/scenario behavior.
- Rebalanced `prototype/web-v1/index.html` + `prototype/web-v1/css/layout.css` / `prototype/web-v1/css/responsive.css` watch-status panel so desktop now presents the same watch, permit, decision-window, and risk data in a clear two-column status layout while mobile keeps the compact accordion flow.
- Removed emoji prefix from BEGIN EXPEDITION (🎯) and QUICK START (🎲) buttons in `prototype/web-v1/index.html` and matching i18n keys (`beginExpedition`, `quickStart`) in both `en` and `es` in `prototype/web-v1/ui/screens.js`.
- Removed the difficulty carousel from `prototype/web-v1/index.html` (`screen-expedition-setup` now has two carousels: character and scenario).
- Updated `getDifficultyModifiers()` in `prototype/web-v1/ui/screens.js` to read embedded `difficultyModifiers` from the active scenario when available, falling back to `DIFFICULTY_LEVELS` table.
- Updated `beginExpedition()` and `quickStart()` in `prototype/web-v1/ui/screens.js` to derive `CURRENT_DIFFICULTY_ID` from the selected scenario after scenario resolution.
- Replaced `carouselDifficulty` i18n key with `charDifficultyLabel` (`'Profile'` / `'Perfil'`) used in character cards in `prototype/web-v1/ui/screens.js`.
- Removed difficulty-carousel i18n keys (`difficulty`, `difficultyNote`, `carouselPrevDifficulty`, `carouselNextDifficulty`) from both `en` and `es` in `prototype/web-v1/ui/screens.js`.
- Updated `TUTORIAL_CONTENT` difficulty section in both languages to describe expedition scenario types instead of abstract difficulty levels.
- Updated `buildExpeditionSetupCarousels()` in `prototype/web-v1/ui/screens.js` to remove difficulty carousel sync and render calls.
- Updated character name rendering in carousel cards, character grid, and Part 2 setup screen: moved nationality flag emoji to the right of the name (after the name) and wrapped it in `<span class="char-flag">` to ensure correct emoji rendering regardless of heading font.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` to assert the difficulty carousel is absent from the HTML.

### Deprecated

- Visual-mode switching is officially deprecated for current public playtesting; sunset-only presentation is the active policy baseline.

### Removed

- Color scheme selector (theme switcher) removed from the welcome screen header. The game now uses the "sunset" palette exclusively — `prototype/web-v1/index.html`, `prototype/web-v1/ui/screens.js`, `prototype/web-v1/css/themes.css`.
- Light, auto, and dark override theme CSS rules removed from `themes.css`; only sunset palette rules remain.
- `screen-character` section from `prototype/web-v1/index.html` (character selection now handled by expedition-setup carousel).
- `screen-scenario` section from `prototype/web-v1/index.html` (scenario selection now handled by expedition-setup carousel).
- `title-difficulty-panel` div from `screen-title` (difficulty now in expedition-setup carousel).
- Removed the one-use `Focus pause` control from `prototype/web-v1/index.html` / `prototype/web-v1/ui/screens.js`, its telemetry defaults in `prototype/web-v1/state/game-state.js`, the unused `gracePauseMs` character data in `data/characters.json`, and the outdated mention in `prototype/web-v1/README.md`.

### Fixed

- Fixed architecture-doc route drift by aligning `docs/architecture.md` root-entry statement with the current landing-first repository behavior.
- Replaced the intro modal repository CTA URL in `prototype/web-v1/index.html` from a generic GitHub search query to the canonical repository link (`https://github.com/ernstgallegos/aconcagua-stone-sentinel`).
- **Critical bug:** restored missing `const mkEntry = (turn, decision, posIdx, trend, flags) => ({` line in `buildMockTurnLog()` in `prototype/web-v1/ui/screens.js`. The missing line caused a syntax error that prevented the ES module from loading entirely, so `window.advanceFromTitle` was never assigned and the welcome screen click/tap handler was broken on all devices.
- Removed "Click or tap anywhere to continue" legend (`#title-advance-hint` span) from the welcome screen in `prototype/web-v1/index.html`. Removed corresponding `titleAdvanceHint` i18n keys (EN/ES) from `screens.js` and cleaned up all references in `renderIntroContent()` and `applyStaticTranslations()`.
- Replaced personal email `ernestogallegos@gmail.com` with the official project contact address `aconcaguastonesentinel@gmail.com` across all interfaces, code, and documentation (`prototype/web-v1/index.html`, `LICENSE.md`, `README.md`, `README.es.md`, `CONTRIBUTING.md`).
- Random character card in expedition-setup carousel now displays the portrait image (`art/characters/random.png`). Added `random: 'random'` to `getCharacterImagePath()` nameMap and added `<img class="carousel-card-portrait">` to the `item._random` render block in `renderCarousel()` (`prototype/web-v1/ui/screens.js`).
- Fixed pre-existing bug in `prototype/web-v1/tests/test_smoke_flow.py`: `wait_for_selector` calls used default `state='visible'` which timed out on hidden screens; changed to `state='attached'`. Also fixed incorrect selectors `.title-info-trigger` (was scoped to `#screen-title`, now top-level) and `.title-screen-advance` (was `.btn-primary` inside title screen).
- Character portraits in carousel cards (`screen-expedition-setup`, `screen-part2-character`) were cropped on desktop because `max-height: 220px` with `object-fit: cover` cut the bottom of 1024×1024 images. Replaced with `aspect-ratio: 1 / 1` so the container stays square and the full image is visible on all viewport sizes (`prototype/web-v1/css/components.css`).
- Difficulty selector invisible after PR #104 redesign: removed `display: none` from `.title-difficulty-grid` in `css/components.css`; `renderDifficultySelector()` already generates the correct `.difficulty-pill-row`/`.difficulty-pill` markup inside that container (Bug 1).
- Character grid empty on first load: added `loadDataConfig()` call in the INIT section of `ui/screens.js`; the function was defined but never invoked, leaving `DATA_CONFIG.characters` as `[]` and the character/scenario grids unpopulated (Bug 2).
- `prototype/web-v1/css/screens.css`: corrected background-image relative paths from `../../art/` to `../../../art/` (resolves from `css/` directory, not `index.html` location) — fixes invisible background images on `#screen-title`, `#screen-character::before`, `#screen-scenario::before`, `#screen-expedition-setup::before`, and `.debrief-hero` on all platforms.
- Fixed `prototype/web-v1/ui/screens.js` debrief day counting so the summary now reads from the live run day counter (`G.day`) instead of the nonexistent `G.currentDay`, eliminating the always-`1` bug after multi-day runs.
- Fixed `prototype/web-v1/ui/screens.js` mobile WATCH/ROUTE bottom sheets so they mirror the current in-run watch and route data instead of stale placeholder content.
- Fixed `prototype/web-v1/index.html` + `prototype/web-v1/ui/screens.js` SLEEP action visibility so the button stays present in the decision deck at all times and toggles availability through the disabled state when the current position is not a camp.
- `prototype/web-v1/ui/screens.js`: corrected park-exit detection in `makeDecision()` so arriving at `horcones` after a summit no longer ends the run one turn early as `Strategic Retreat`; the expedition now only finishes on the explicit exit descend from Horcones, preserving `Summit and Safe Return` and the Part 2 unlock path.
- `prototype/web-v1/tests/test_smoke_flow.py`: added a browser smoke regression covering post-summit arrival at `horcones`, explicit park exit on the following descend, and the resulting `Summit and Safe Return` unlock.
- Removed the debrief action that exported `run_log.json` from `prototype/web-v1/ui/screens.js`, leaving replay and journal actions as the end-of-run choices.
- Adjusted `prototype/web-v1/css/responsive.css` mobile gameplay spacing/overflow so the Watch and status accordion can expand without clipping the lower telemetry/context content behind the sticky decision panel.
- Restored welcome-screen progression in `prototype/web-v1/index.html` / `prototype/web-v1/ui/screens.js` so tapping/clicking anywhere on the active cover now reliably advances to expedition setup, with an explicit `window.advanceFromTitle` facade preserving the inline fallback control.
- Fixed nationality flag emoji (`.char-flag`) not rendering correctly on desktop: added `display: none` inside `@media (min-width: 1024px)` in `prototype/web-v1/css/responsive.css` so flags are shown only on mobile/tablet where emoji rendering is reliable.
- Reworked the Part 2 `The Real Expedition` bridge in `prototype/web-v1/index.html` / `prototype/web-v1/ui/screens.js` so the screen now shows the full character roster plus a multi-route preview, keeps non-public branches visibly locked, and restores the `Continue to Mendoza` CTA once Francisco + the guided transfer are selected.
- Restored the Part 2 `The Real Expedition` selection flow in `prototype/web-v1/ui/screens.js` so entering `screen-part2-character` rebuilds the static Francisco + guided Normal Route cards, re-enables selection state, and lets the confirm CTA advance into the Mendoza bridge again.
- Corrected stale "five global difficulty tiers" reference in `README.md` — expedition-setup now uses two carousels (character + scenario) with difficulty embedded in each scenario rather than as an independent user-selectable carousel.
- Corrected stale difficulty reference ("cinco niveles globales de dificultad") in `README.es.md` to describe the scenario-embedded difficulty model.
- Updated stale flow reference in `AGENTS.md` from `splash → title → character → scenario → onboarding → game` to `welcome/title → expedition-setup → onboarding → game` to reflect the merged welcome screen and consolidated expedition-setup carousels.
- Updated stale flow reference in `meta/public-roadmap.md` Stage 6 evidence to match current merged-screen architecture.
- Updated stale flow reference in `docs/web-v1-playtesting-remediation-one-shot-prompt.md` to reflect current canonical flow.
- Added missing sections to `README.es.md` (Contact, Prototype canonical status, local preview instructions) for parity with English `README.md`.
- Consolidated duplicate section headers in `CHANGELOG.md` `[Unreleased]` block (10× Changed, 7× Fixed, 3× Added, 2× Removed → one each) per Keep a Changelog convention.

## [1.4.1] — 2026-03

### Fixed

- `prototype/web-v1/engine/turn-resolution.js`: `sleep` action no longer advances the player's position. `evaluateOutcome` now forces `outcome = 'Hold'` for sleep, matching the design intent that sleep is recovery-in-place at a camp (gameplay-fix-v4, Bug A1).
- `prototype/web-v1/engine/turn-resolution.js`: `collapseChance` multiplier reduced from `× 2` to `× 1.2`. The previous value caused 62% collapse probability on weather spikes (ws=3 at high altitude), making summit statistically impossible under normal mountain variability. At maximum effective pressure (eff=52), collapse chance is now 15.4% for advance — significant but survivable (gameplay-fix-v4, Bug A2).
- `prototype/web-v1/ui/screens.js`: Part 2 unlock now persists across sessions and difficulty levels via `SUMMIT_ACHIEVED_KEY` in localStorage. Previously, `G.finalOutcome` reset on each `startRun()` call, locking Part 2 after any replay or page reload (gameplay-fix-v4, Bug A4).
- `prototype/mra-v0/test_simulator.py`: resolved silently-reported failure for `accumulated-fatigue-trap seed=707/waiter` by capturing and asserting the mocked `run_all.py` failure output inside the test instead of leaking it into the suite output (gameplay-fix-v4, Bug minor-1).
- Fixed `prototype/web-v1/engine/turn-rules.js` park-exit classification so runs that had already reached `summit` still resolve as `Summit and Safe Return` when `hasSummited` is true even if `highestPosIdx` is stale during the final Horcones exit turn.
- Fixed `prototype/web-v1` summit handling so once the player reaches `summit`, further ascent actions are blocked in both the resolver and decision UI, the run explicitly redirects toward descent, and `Summit and Safe Return` still unlocks the Part 2 winning bridge only after a safe park exit.
- Fixed `prototype/web-v1/ui/screens.js` difficulty plumbing so title selection now affects runtime recovery, combined resource economy, and character-specific decision windows instead of only a subset of systems.
- Retuned the `Very Easy` profile in `prototype/web-v1/ui/screens.js` with extra permit/resource/body slack so first-ascent runs can realistically progress beyond Camp 3 when the player selects that tier.
- Added web-v1 regression coverage to lock the difficulty-runtime wiring between title selection and the underlying economy/timer subsystems.
- Removed the premature summit-node `High Point Return` in `prototype/web-v1/engine/turn-resolution.js` so summit arrivals continue into descent instead of terminating before safe park exit.
- Made `descend` deterministic in `prototype/web-v1/engine/turn-resolution.js`; non-collapse descent turns now always move one node down and no longer stall or reverse uphill.
- Reworked `prototype/web-v1/engine/turn-resolution.js` recovery handling so sleep/descend restoration no longer scales down under low pressure, `functional_capacity` recovery no longer degrades at altitude, and `hasSummited` is set on first summit arrival for descent-phase UI/logging.
- Exempted `descend` from `Expedition Window Closed` in `prototype/web-v1/engine/turn-rules.js`, preserving ascent-only cutoff behavior while allowing valid late descents from summit-day sectors.
- Fixed `prototype/web-v1/ui/screens.js` day rollover so non-sleep actions increment `G.day`/`G.permitDay` after midnight and removed the redundant bivouac day increment path.
- Corrected `prototype/web-v1/ui/screens.js` park-exit debrief wiring so all Horcones exits show the return message while `Summit and Safe Return` gets a distinct summit-success debrief line.
- Added targeted engine regression coverage for summit continuation, deterministic descent, fixed-pressure recovery, and descent-window exemption in `prototype/web-v1/tests/turn-behavior.test.js`.
- Added regression coverage for Daniela-only `Shoot Photo` access in both browser smoke validation and web-v1 contract tests, protecting the UI visibility and keyboard shortcut guard against future regressions.
- Corrected `prototype/web-v1` park-exit resolution so returning to `horcones` no longer auto-ends the run, `wait` on approach sectors cannot advance the player, and descending from `horcones` now closes the expedition as an explicit park exit.
- Added targeted `web-v1` regression coverage for approach wait movement, early retreat-to-Horcones continuity, and Horcones exit handling.
- Fixed missing `collapse` and `survival` fields in `data/action_modifiers.json`.
  The new probabilistic `evaluateOutcome` in `prototype/web-v1/engine/turn-resolution.js`
  uses these fields to compute `collapseChance` and `survivalChance`. Without them,
  both evaluate to `NaN`, causing `r < NaN` and `r > NaN` to always be `false` —
  making collapse and retreat outcomes impossible. Result was 100% Rescue/Fatality
  across all characters and scenarios. Added calibrated values targeting ~30%
  Summit and Safe Return rate.
- Fixed `descend` direction in `evaluateOutcome` (`prototype/web-v1/engine/turn-resolution.js`):
  the `step` calculation used a fixed `+1 / −1` sign regardless of `actionMod.progress`.
  For `descend` (progress = −20), `'Advance'` was moving the player **up** the route.
  Added `directionMultiplier` that flips step sign when `actionMod.progress < 0`.
- Fixed `functional_capacity` drain rate in `updateState`
  (`prototype/web-v1/engine/turn-resolution.js`): the formula
  `capacityDelta − pressureDelta × 0.18` had no upper bound on `pressureDelta`.
  With δ=130 (night EP), fc drained 23.4/turn causing Fatality in 3–5 turns.
  Replaced with `pressureFactor × 2` (clamped 0.5–2.5), matching the pre-refactor
  cap of 1–5 fc/turn.
- Expanded Spanish localization coverage in `prototype/web-v1/ui/screens.js` by translating remaining runtime strings (sleep/tooltips, ambient/tutor cues, debrief turning-point and cause messaging, reflection prompts, and narrative text selection) so Spanish sessions no longer surface mixed English copy in core gameplay/debrief flows.
- Fixed startup interactivity regressions in `prototype/web-v1/ui/screens.js` by escaping the English title-tagline apostrophes (preventing module parse failure) and restoring the `window.setVisualMode` facade required by the title-screen inline visual-mode selector.
- Fixed `prototype/web-v1/ui/screens.js` data bootstrapping to treat `data/environmental_pressure_config.json` as required, preventing silent startup with an incomplete pressure model that later crashed turn resolution.
- Fixed `prototype/web-v1/ui/screens.js` environmental-pressure calculations to use null-safe scale fallbacks (`altitudePressureByBand`, `terrainLoadScale`, `weatherSeverityScale`, `visibilityRiskScale`, `timeOfDayRiskScale`, `exposurePersistenceScale`) so partial/malformed config payloads no longer throw runtime type errors.
- Fixed critical web-v1 runtime blockers in `prototype/web-v1/ui/screens.js` by restoring a module-local `TUNING` fallback, persisting `G.finalOutcome`/`G.hasSummited` from resolved turn outcomes, wiring `acclimatizationGain` into turn execution, and persisting rolling `pressureHistory` samples for non-steady trend estimation.
- Fixed narrative/UI consistency in `prototype/web-v1/ui/screens.js` and `prototype/web-v1/index.html` by correcting high-altitude `wait` narrative gating, replacing unreachable trend key `improving` with `easing`, removing dead `valentina`/`diego` branches, fixing `makeDots()` off-by-one rendering, adding `shoot_photo` debrief labels, and updating title eyebrow version text to `Prototype · v1.4`.
- Fixed terminal outcome guard ordering in `prototype/web-v1/engine/turn-resolution.js` so `High Point Return` cannot overwrite `Summit and Safe Return` after canonical terminal derivation.
- Fixed `prototype/web-v1` character-selection progression by restoring required global button handlers (`confirmCharacter`, `confirmScenario`, `startGame`, etc.) for inline `onclick` wiring, unblocking the "This is my expedition." CTA.
- Fixed `prototype/web-v1/ui/screens.js` action resolution to always return numeric `fatigueDelta`/`exposureDelta`/`capacityDelta` defaults from `getActionModifier()`, preventing `NaN` body-state propagation that blocked effective movement decisions at expedition start.
- Fixed `prototype/web-v1/ui/screens.js` decision logging to use `turnResult.resolvedAction`, restoring consistent action-state synchronization for inline controls and keyboard command routing during active runs.
- Hardened `loadDataConfig()` validation in `prototype/web-v1/ui/screens.js` with required-file checks and runtime schema/contract assertions for `scenarios.web-v1.json` (predefined seeds and random archetype presence), failing fast via fatal screen on violations.
- Updated `prototype/web-v1/tests/model-contract.test.js` to read web initial-state overlap keys from `data/scenarios.web-v1.json` instead of parsing inline scenario literals from UI source.
- Annotated `prototype/mra-v0/test_simulator.py` import bootstrap with `# noqa: E402` so the new blocking `ruff` gate accepts the intentional `sys.path` setup used by simulator tests.
- Hardened `loadDataConfig()` in `prototype/web-v1/ui/screens.js` by treating `nodes`, `actionModifiers`, `stageModifiers`, `characters`, and `outcomes` as required assets with runtime schema checks. Any load/parse/schema failure now raises a blocking fatal screen in `prototype/web-v1/index.html`, includes filename + key-path diagnostics, and keeps `G.modelReady = false` to prevent game start with empty defaults.
- Structural balance bug: `altitudePressureByBand` and `terrainLoadScale` values in
  `data/environmental_pressure_config.json` made the upper mountain (band 3+) mathematically
  impassable. EP floor at band 3–4 nodes (159–215) permanently exceeded maximum achievable
  BT (90), producing 0% summit rate in Monte Carlo simulation of 36,000 runs. Fixed by
  reducing altitude and terrain pressure scales by ~50–70% at higher bands, reducing
  `timeOfDayRiskScale` and `exposurePersistenceScale` values, and adjusting `timeSensitivity`
  and `terrainLoad` for the four summit-day nodes in `data/nodes.json`.
- Fixed `Math.max(1, ...)` floor in `spendResourcesForMinutes` (`prototype/web-v1/index.html`):
  minimum water/food cost per action was clamped to 1 unit regardless of actual burn
  calculation. With calibrated burn rates and 45+ actions per expedition, this made
  the round trip consume 45+ water units against a 22–26 unit starting pool, making
  summit completion impossible through resource exhaustion. Changed to `Math.max(0, ...)`.
- Fixed `summitLateStart` in `data/environmental_pressure_config.json`: value of 750
  (12:30pm) caused the engine to force descent at La Canaleta (arrival ~14:15) even
  with one node remaining to summit. Updated to 960 (4pm), matching the actual 11-hour
  summit-day window from a 6am departure.
- Updated `resourceBurnPerHour` in `data/environmental_pressure_config.json` to
  calibrated values that make a full expedition viable within scenario starting
  resources (APPROACH: 0.14/0.10, HIGH_CAMP: 0.22/0.16, SUMMIT_DAY: 0.34/0.24).
- Fixed outcome classification order in `prototype/web-v1/index.html`: `Summit and
  Safe Return` was evaluated after `Expedition Window Closed`, causing players who
  returned to Horcones on the final turn to receive the wrong outcome. Swapped the
  two `else if` branches so summit completion takes priority.
- Fixed descent body-state accumulation in `data/action_modifiers.json`: `descend`
  now carries `fatigueRecovery: 1` and `exposureRecovery: 1`, activating the
  existing sign-flip logic in `evaluateOutcome()`. Descending now recovers fatigue
  and exposure instead of compounding them through stage multipliers. Added
  `pressureDeltaCap: 30` to prevent night-descent `pressureFactor` from reaching
  maximum (2.5), which was draining `functional_capacity` to fatal levels over 14
  descent turns. Implemented cap in `evaluateOutcome()` via a one-line guard.
- Fixed `max_turns` across all five predefined scenarios and the random scenario
  generator in `prototype/web-v1/index.html`. Previous values (30–34) were below
  the minimum of 35 turns required for ascent + descent with one recovery sleep.
  Updated to 46–50 for predefined scenarios and 46–54 for random mode.
- Fixed documentation drift between published readmes and prototype behavior by explicitly documenting the current playable flow and Part 2 gating constraints (`Summit and Safe Return` only).
- Named the Part 2 guides in `prototype/web-v1/index.html` with role-specific narrative copy for Agustina Villanueva and Alejandro Molina.
- Removed orphaned `screen-mode` CSS rules from `prototype/web-v1/index.html`, including the leftover mobile `.mode-grid` media-query declaration.
- Expanded Section 6.3 in `docs/en/consolidated-design-v1.4.md` with calibrated win-rate distribution and active configuration values.
- Expanded Section 6.3 in `docs/es/diseno-consolidado-v1.4.md` with calibrated win-rate distribution and active configuration values in Spanish.

### Changed

- `data/action_modifiers.json`: `advance.collapse` adjusted from `-45` to `-50`; `advance_slowly.collapse` from `-50` to `-55`. With the new `× 1.2` collapse multiplier, these values maintain meaningful collapse risk at extreme pressure while allowing normal expedition progress under standard conditions (gameplay-fix-v4, balance A3).
- `data/environmental_pressure_config.json`: `summitLateStart` changed from 1200 (20:00) to 1020 (17:00), restoring summit-day timing tension. A 06:00 departure from Cólera with standard advance reaches summit at 13:20 — within the window. Advance-slowly from 06:00 would exceed the cutoff, enforcing the real mountaineering rule of committing to pace on summit day (gameplay-fix-v4, Bug A5).
- `docs/en/consolidated-design-v1.4.md` §6.3: win-rate targets updated to post-recalibration values (Summit 20–35% for standard/real-mountain difficulty).
- `prototype/web-v1/DEV_NOTE.md`: time cost values updated; sleep position rule, gravity override, summit block, hasSummited, and timeSensitivity mechanics documented.
- `data/contracts/model-contract.json`: `turnSemantics` expanded to all six engine actions.
- `docs/simulation_engine.md`: added documentation for sleep position rule, gravity override, hasSummited, time-of-day amplification, and updated collapseChance formula.
- `AGENTS.md`: learning log updated with gameplay-fix-v4 findings.
- `scripts/check-lock-version.js`: converted the lockfile version guard to ESM-compatible imports so `node scripts/check-lock-version.js` works under the repository's `"type": "module"` configuration.
- Adjusted `prototype/web-v1` gameplay tuning so difficulty now changes environmental pressure, stage weather bias, body tolerance, initial resources/capacity, permit margin, and decision-window generosity.
- Updated web-v1 smoke/integration coverage and public readmes to reflect the new title difficulty step and pre-expedition tutorial flow.
- Clarified the web-v1 descend action copy so onboarding and the in-run Horcones button explain that descending again from Horcones exits the park and ends the expedition.
- Updated the Playwright smoke-test workflow guidance so local contributors get an explicit bootstrap path, while missing Playwright dependencies now produce a skip with actionable setup instructions instead of an import failure.
- Removed Brazilian Portuguese from the `prototype/web-v1` runtime language selector and language validation, leaving only English (`en`) and Spanish (`es`) as supported UI locales.
- Rebuilt the main `prototype/web-v1/index.html` gameplay interface with a new command-deck layout (route/log expedition column + telemetry/context/decision command column) while preserving canonical IDs, action controls, permit/watch/context systems, and turn-resolution wiring.
- Updated `data/characters.json` with canonical v1.4 engine values for Francisco, Laura, Erik, Daniela, Blake, and Irina (`perceptionBias`, `riskTolerance`, and related balancing fields) to realign roster identity and expected win-rate dispersion.
- Updated `.github/workflows/ci.yml` JSON validation coverage to include `data/scenarios.web-v1.json`.
- Updated `package.json` with `"type": "module"` to remove Node typeless-module warnings during test runs.
- Reworked `prototype/web-v1/index.html` gameplay-screen layout to use viewport-locked grid zones with internal panel scrolling and compact responsive breakpoints, preventing page-level scroll on desktop and mobile while preserving access to decisions and status widgets.
- Updated `prototype/web-v1/ui/screens.js` scenario selection so predefined cards no longer expose per-seed buttons; selecting a scenario now assigns one configured seed at random and keeps that seed hidden from the selection UI.
- Expanded predefined seed pools in `data/scenarios.web-v1.json` to at least 10 seeds per scenario so random assignment has meaningful run variety.
- Updated `prototype/web-v1/ui/screens.js` to load scenarios from `data/scenarios.web-v1.json`, replacing in-file `SCENARIOS` and random-archetype constants with data-driven configuration accessors.
- Updated `docs/model-contract.md` with explicit web-v1 scenario authority boundaries between data ownership (`data/scenarios.web-v1.json`) and runtime enforcement (`loadDataConfig()` in `screens.js`).
- Revised `meta/public-roadmap.md` to align current-stage messaging with the already integrated `prototype/web-v1` behavior, map each stage to objective repository evidence (modules/features/tests), and explicitly separate design-lock completion from implementation completion with a compact v1.4 status matrix linked to the implementation-plan real-progress snapshot.
- Updated canonical-status documentation across `docs/architecture.md`, `docs/simulation_engine.md`, `prototype/web-v1/README.md`, and `README.md` to reflect the v1.4 public in-progress state with explicit links to `CHANGELOG.md` `[1.4.2]` and implementation-plan snapshots.
- Clarified public/private code visibility scope across `README.md`, `README.es.md`, `prototype/web-v1/README.md`, and `meta/public-roadmap.md`: public prototype code is available in-repo, while production/commercial branch scope remains private.
- Added a documentation consistency checklist to `CONTRIBUTING.md` to prevent version-title drift between core docs and implementation reality.
- Updated `.github/workflows/ci.yml` to run the new Playwright smoke test on pull requests, including browser provisioning before executing `pytest prototype/web-v1/tests/test_smoke_flow.py -v`.
- Updated `requirements-dev.txt` and `CONTRIBUTING.md` to pin Playwright (`playwright==1.53.0`) and document the local smoke-test command path used by CI.
- Updated `prototype/web-v1/ui/screens.js` and `prototype/web-v1/engine/turn-resolution.js` to consume shared turn-rule helpers and delegate terminal-outcome precedence checks through an injectable `deriveTerminalOutcome` hook.
- Reduced `prototype/web-v1/tests/new-mechanics.test.js` string-contract coverage to critical integration hooks while shifting primary confidence to behavioral engine assertions.
- Pinned Python lint tooling in `requirements-dev.txt` by adding `ruff==0.4.10` so local and CI lint runs use the same versioned dependency.
- Updated `.github/workflows/ci.yml` to remove ad hoc lint installation and run `ruff` as a blocking gate (`E/F/W`, `E501` ignored) in the Python job for `main` and pull requests targeting `main`.
- Updated `CONTRIBUTING.md` with the CI lint gate policy and local lint command to match enforced CI behavior.
- Migrated `prototype/web-v1/index.html` to a lightweight ES-module shell that now loads `prototype/web-v1/ui/screens.js` and keeps temporary global facades (`window.makeDecision`, `window.showScreen`, and run controls) for backward-compatible button/test integration during refactor.
- Split gameplay code into modules: turn engine logic (`resolveTurn`, `evaluateOutcome`, `updateState`, RNG/clamp helpers) now lives in `prototype/web-v1/engine/turn-resolution.js`, and canonical game-state initialization now lives in `prototype/web-v1/state/game-state.js`.
- Refactored web-v1 runtime state into explicit slices (`runState`, `uiState`, `telemetryState`) in `prototype/web-v1/state/game-state.js`, added guarded helper APIs (`updateRunState`, `updateUIState`, `recordTelemetry`), and wired hot mutation paths (`showScreen`, `startGame`, `resolveTurn`, `endRun`) through these helpers with boundary assertions (`before resolveTurn`, `after updateState`) to catch state-shape drift early.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` to validate module-based loading and relocated engine/state contracts.
- Standardized `prototype/web-v1/index.html` `run_log.json` export payload with stable cross-run comparison aliases (`epScore`, `btScore`) while preserving legacy fields (`EP`, `BT`) for backwards compatibility.
- Updated `prototype/web-v1/index.html` with layered onboarding cues in the context widget (`essentials` early, `contextual` after early turns or critical risk), capped simultaneous secondary alerts, and enforced a single prioritized primary alert per turn to reduce alert fatigue.
- Expanded `prototype/web-v1/index.html` run-log export rows with `characterId`, `stage`, `decisionWindowExceeded`, `lateSignalTriggered`, and `specialActionUsed` to improve QA and balance instrumentation.
- Added per-run critical-event summary metadata (`runSummary`) to exported `run_log.json` in `prototype/web-v1/index.html` for faster QA/balance triage without removing existing per-turn records.
- Rebalanced expedition pacing and risk envelope across `data/action_modifiers.json`, `data/stage_modifiers.json`, and `data/environmental_pressure_config.json` to reduce collapse-only trajectories and recover strategic-retreat / permit-pressure space in canonical scenario batteries.
- Recalibrated character profiles in `data/characters.json` by prioritizing perception/risk/timing knobs (not opaque power buffs), reducing dominance risk (Laura/Irina) and improving viability for high-variance profiles (Erik/Daniela/Blake).
- Added `docs/balance-calibration-notes.md` with per-character target metric bands and post-tuning dispersion results from canonical scenario stress runs for balance traceability.
- Reworked right-panel hierarchy in `prototype/web-v1/index.html` by stacking watch, permit, and a new contextual status widget to improve at-a-glance risk scanning during turns.
- Updated critical-action microcopy in `prototype/web-v1/index.html` to describe immediate cost/benefit tradeoffs directly in action buttons without extending onboarding flow.
- Added staged risk indicators (`warning`/`critical`) in `prototype/web-v1/index.html` contextual chips using engine-aligned thresholds for body state, resources, permit days, and decision window pressure.
- Reinforced debrief output in `prototype/web-v1/index.html` with a primary actionable cause line paired with the existing turning-point section.
- Updated `prototype/web-v1/README.md` and root `README*.md` references to document contextual risk reading and playtest observation support.
- Extended `prototype/web-v1/index.html` Part 2 bridge into a navigable transition sequence (`part2-hotel` → `part2-intro` → `part2-guides` → `part2-transfer` → `part2-closure`) with connected back/forward controls and explicit safe exits to debrief/title.
- Replaced `confirmPart2Character()` placeholder alert in `prototype/web-v1/index.html` with real progression to the Part 2 narrative flow, guarded so unlock remains exclusive to `G.finalOutcome === "Summit and Safe Return"`.
- Updated Part 2 transition copy in `prototype/web-v1/index.html` to match v1.4 EN/ES design references (hotel, presentation, guides, transfer, closure).
- Updated `prototype/web-v1/index.html` turn input loop to track per-turn decision time, apply gradual over-window degradation (confidence/noise/action-cost drift), and avoid binary instant-failure penalties.
- Updated `prototype/web-v1/index.html` perception pipeline with stage/time/pressure-based late activation, fairness floors for early hints, progressive clarity ramping, watch uncertainty readability messaging, late-activation debrief notes, and `run_log.json` trace events (`lateSignalActivation`).
- Updated watch-panel UI in `prototype/web-v1/index.html` to render decision countdown/overage and partial-information microcopy aligned with existing diegetic uncertainty language.
- Expanded run logging in `prototype/web-v1/index.html` to persist decision timing telemetry (`decisionMs`, `decisionWindowExceeded`, `decisionWindowEffect`) per turn for debrief and export workflows.
- Updated `prototype/web-v1/README.md` to document the timed-degradation layer, character-stage timer config, and accessibility fallback behavior.
- Added per-character perception guardrails in `data/characters.json` (`engine.perceptionGuardrails`) to enforce minimum useful signal readability and cap timing/perception penalty accumulation.
- Added SUMMIT_DAY difficulty regression guardrails in `prototype/web-v1/index.html` to cap acclimatization/timing penalty spikes and flag guarded turns (`summit-difficulty-guard`) for telemetry.
- Updated `prototype/web-v1/index.html` debrief cause messaging with systemic-vs-decision attribution so players can distinguish model pressure from execution errors.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` with regression checks for guardrail fields and SUMMIT_DAY difficulty caps.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` to assert the new `effectiveDelta`/`pressureDeltaCap` path in `evaluateOutcome()` while preserving pressure-factor pipeline coverage.
- Updated `docs/balance-calibration-notes.md` with explicit rollback criteria when any character drifts outside accepted outcome bands.
- Expanded `AGENTS.md` into a living learning log with mandatory session-start read behavior and consolidated project/workflow learnings from v1.4 Phase 1 implementation.
- Root `AGENTS.md` was restructured in a convention-aligned format (scope, priority, and actionable repository instructions) while preserving existing documentation and changelog policies.
- Added a consolidated v1.4 design/planning documentation package (ES/EN) with game-structure, character, simulation-pipeline, and phase rollout references.
- Updated `README.md`, `README.es.md`, `docs/*`, and `meta/public-roadmap.md` to cross-reference the v1.4 documentation baseline and clarify planning-vs-implementation status.
- Updated turn resolution and game UI to render/resolve photo-based route-reading effects diegetically without exposing forbidden raw variables, while preserving canonical resolution order (Environment → EP → BT → pressureDelta → perception → action modifier → outcome).
- Updated `README.md` and `README.es.md` to reflect the observable web-v1 state (six characters, decision-window pressure, contextual action support, and gated Part 2 narrative bridge).
- Updated implementation-plan phase labels in `docs/en/implementation-plan-v1.4.md` and `docs/es/plan-implementacion-v1.4.md` from “next sprint” to “in progress” to match real execution status.

### Added

- `prototype/web-v1/tests/turn-behavior.test.js`: new test `sleep never advances or retreats the player position` verifying that sleep action forces Hold outcome in evaluateOutcome (gameplay-fix-v4, regression coverage for Bug A1).
- Timing pressure FAQ entry added to `prototype/web-v1` onboarding: explains that advancing after 15:00 at high altitude significantly increases environmental pressure and that planning around 06:00 departures from high camps is essential.
- Added a title-screen difficulty selector with five tiers (Very Easy to Very Hard) for `prototype/web-v1`, plus a full onboarding tutorial/FAQ modal before the expedition begins.
- Added multilingual runtime support in `prototype/web-v1` with a persistent language selector (`en`, `es`) and UI translation wiring for core navigation, decision controls, random cards, and journal prompts.
- Added a `Random Character` card in `prototype/web-v1` character selection so players can start a run with one of the six eligible profiles chosen automatically on confirm.
- Added `data/scenarios.web-v1.json` as the canonical web-v1 scenario catalog, including predefined scenarios and random-archetype generation ranges/configuration used by runtime scenario selection.
- Added `docs/technical-debt-register.md` with active debt ownership, risk, trigger symptoms, measurable exit criteria, and mandatory release-PR review guidance for architecture, data-contract, prototype-divergence, and balance-fragility hotspots.
- Added `prototype/web-v1/engine/turn-rules.js` with importable deterministic rule helpers for terminal outcome ordering, decision-window degradation caps, and resource-burn rounding floors.
- Added `prototype/web-v1/tests/turn-behavior.test.js` with fixture-based deterministic behavioral tests for `resolveTurn`, `evaluateOutcome`, and `updateState` using controlled RNG.
- Added `scripts/check-lock-version.js` and `npm run check:lock-version` to fail when `package.json.version` diverges from the lockfile root package version (`package-lock.json` → `packages[""].version`).
- Added a CI guard step in `.github/workflows/ci.yml` to execute `npm run check:lock-version` during the Node test job.
- Added version-bump and lockfile synchronization guidance to `CONTRIBUTING.md`, including regeneration and validation commands.
- Added `docs/model-contract.md` and `data/contracts/model-contract.json` to formalize cross-surface canonical concepts (outcomes, shared state metrics, turn semantics), authority ownership (`web-v1` active vs `mra-v0` historical), and intentional divergences.
- Added `prototype/web-v1/tests/model-contract.test.js` and expanded `npm test` coverage to enforce contract overlap checks between `prototype/web-v1` and `prototype/mra-v0`.
- Added `prototype/web-v1/tests/test_smoke_flow.py` as a headless browser smoke test that validates canonical screen wiring (`splash → title → character → scenario → onboarding → game`) and Part 2 unlock gating from `Summit and Safe Return`.
- Added a Phase 2 real-progress snapshot section in `docs/en/implementation-plan-v1.4.md` and `docs/es/plan-implementacion-v1.4.md` to track implemented vs pending scope item-by-item.
- Added `docs/es/guia-observacion-playtest.md` with a short field checklist for recurrent errors, confusion signals, and abandonment points in qualitative playtests.
- Added an in-debrief new-player comprehension checklist and confusion-notes textarea in `prototype/web-v1/index.html` to capture what users understood (decision goal, loss cause, and improvement path) and to drive microcopy iteration from observed confusion.
- Added character-level decision-window profiles in `data/characters.json` (`engine.decisionWindow`) with stage modifiers for `APPROACH`, `HIGH_CAMP`, and `SUMMIT_DAY` to differentiate timing pressure behavior across roster archetypes.
- Added a contextual one-use `Focus pause` fallback in `prototype/web-v1/index.html` to provide a limited accessible grace margin during high-pressure turns.
- Added perception-latency profiles in `data/characters.json` (`engine.perceptionLatency`) to support delayed signal activation tuning per character, including specialized thresholds for `erik` and `irina`.
- Added Daniela-only contextual action `shoot_photo` in `prototype/web-v1/index.html` and `data/action_modifiers.json`, including capped perception/confidence/trend benefits, finite resource/time cost, cooldown/session guards, and explicit run log instrumentation (`action: "shoot_photo"` with `photoEffectApplied`).

### Balance

- Recalibrated `prototype/web-v1` descent pacing and upper-mountain pressure after the post-audit regression pass: `descend.timeCost` now reflects ~60-minute descent nodes, recovery values are stronger, and visibility/persistence/bivouac pressure floors were reduced to restore survivable retreat arcs.
- Added a post-fix regression-validation note to `docs/balance-calibration-notes.md` covering the new summit/descent/pathing assertions and current validation status for the requested balance sweep.

## [1.4.0] — 2026-03

### Added

- Six fully differentiated characters replacing the previous three: Francisco Aguirre,
  Laura Kim, Erik Lundvall, Daniela De Rossi, Blake Harris, and Irina Orlova.
  Each has a complete biographical and mechanical profile in `data/characters.json`.
- `"Permit Expired"` outcome: 20-day park permit tracked via `G.permitDay` and
  `G.permitMaxDays`. Visualized as a persistent widget in the game panel.
- `screen-summit-success`: special screen shown exclusively on "Summit and Safe Return"
  outcome, explaining the simulation's scope and announcing Part 2.
- `screen-part2-character`: Part 2 character selection with 5 locked characters and
  Francisco Aguirre as the only active option.
- `difficultyLabel` rendered in character selection cards for all six characters.

### Changed

- Screen flow simplified: `screen-mode` removed. Flow is now
  splash → title → character → scenario → onboarding → game.
- `confirmCharacter()` now calls `buildScenarioGrid()` and navigates directly to scenario.
- Back button on scenario screen now returns to character selection.
- `endRun()` now branches to `screen-summit-success` on summit outcome instead of
  always showing the standard debrief.
- Debrief action buttons updated: "Change character" and "Same character, new scenario"
  replace the single "Choose scenario" button.
- Title screen eyebrow updated from "Prototype Web-v1.1" to "Prototype · v1.3".
- `package.json` version bumped to 1.4.0.

## [1.3.0] — 2026-03

### Added

- `devlog/005-prototype-architecture.md` as a formal decision record separating the frozen Python MRA (`prototype/mra-v0`) from the active web prototype (`prototype/web-v1`).
- `.env.example` documenting runtime environment variables for `api/run.js`.
- `docs/architecture.md` as the canonical architecture map for the active prototype.
- `data/characters.json` with three fully differentiated characters (`acclimatizationRate`, `resourceEfficiency`, `fatigueResistance`, `exposureResistance`, `confidenceStability`, `riskTolerance`, `perceptionBias`, `functionalCapacityBonus`).
- `data/outcomes.json` as canonical outcome taxonomy including `Rescue`.
- Character `difficultyLabel` rendered in the selection UI.
- Acclimatization-deficit penalties for HIGH_CAMP and SUMMIT_DAY in the web simulation engine.
- CI JSON validation coverage for `/data/*.json` and `/prototype/mra-v0/scenarios/*.json`.
- Informational Python linting step (ruff) in CI.

### Changed

- `README.md` and `prototype/mra-v0/README.md` to clearly separate canonical active prototype vs frozen reference artifact.
- `docs/simulation_engine.md` aligned to v1.3 behavior.
- Route model expanded to 15 named nodes in `data/nodes.json`.
- Balance tuned for a harsher summit profile through `data/environmental_pressure_config.json`, `data/stage_modifiers.json`, and `data/action_modifiers.json`.
- Scenario starting resources (water/food) reduced across base archetypes and scenarios.
- Character modifiers (`acclimatizationRate`, `resourceEfficiency`) applied directly in turn-state updates and resource consumption.
- `vercel.json` redirects changed to `308`.
- Root viewer styles (`styles.css`) aligned with web-v1 visual tokens.
- `package.json` version set to `1.3.0`.

### Fixed

- `prototype/mra-v0/simulator.py` now raises `ValueError` for invalid position updates (no silent fallback).
- Cautious-policy magic numbers replaced with named constants.
- API fallback allowlist path logs an explicit warning when `ALLOWED_ORIGINS` is not configured.

## [1.2.0] — 2026-02 (retroactive)

### Added

- Environmental Pressure / Body Tolerance / Pressure Delta turn pipeline in `prototype/web-v1/index.html`.
- `docs/simulation_engine.md` (initial engine spec publication for web prototype systemic rules).
- Data-driven simulation configuration in `/data` (`nodes`, pressure config, action modifiers, stage modifiers).
- Turn debrief export to `run_log.json` from the web prototype.

### Changed

- `prototype/web-v1/README.md` updated to describe runtime data sources and mechanics.
- Web-v1 contract tests expanded in `prototype/web-v1/tests/new-mechanics.test.js` for the new engine behavior.
- UX onboarding and control flow refined in the web prototype (begin flow, splash behavior, and instrumentation).

## [1.1.0] — 2026-01 (retroactive)

### Added

- Root `package.json` with Node 18+ test script (`npm test`).
- `requirements-dev.txt` for Python development/testing dependencies.
- Scenario JSON schema at `prototype/mra-v0/scenarios/scenario.schema.json`.
- Portable scenario validation script: `python3 prototype/mra-v0/validate_all_scenarios.py`.
- Additional bundled run artifacts (`late-push`, `weather-window`) and expanded Python test coverage.

### Changed

- `prototype/mra-v0/simulator.py` refactored (`apply_decision()` helper decomposition) without changing expected behavior.
- `prototype/mra-v0/run_all.py` now continues after per-run failures and exits non-zero when any run fails.
- JS tests migrated to Node built-in test runner.
- README and contributing docs aligned with deploy/runtime reality.
- CI pipeline improved with cache use and pinned actions.

### Security

- Unsafe `innerHTML` rendering removed from `app.js`.
- `api/run.js` hardened with strict CORS allowlist behavior, security headers, request size checks, and rate limiting.
