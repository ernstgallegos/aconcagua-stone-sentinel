# Architecture — Prototype Web v1.5 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[1.5.0]`](../CHANGELOG.md#150--2026-04).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (and Spanish mirror: `docs/es/plan-implementacion-v1.4.md`). v1.5.0 delivery documented in [`docs/en/implementation-plan-v1.5.md`](./en/implementation-plan-v1.5.md).
> - Current public build is **v1.5.0** with phased rollout contracts preserved.

Prototype Web v1.5 (public branch state) is the canonical active prototype in this repository, building on completed v1.4 phase plan items with v1.5.0 additions (Canvas2D visualization, character visual identity, decision-position fix).

Canonical repo status is centralized in [`docs/repo-truth.md`](./repo-truth.md).

## Canonical engine flow

Every turn is resolved by a single authority:

`resolveTurn(state, action)`

Pipeline:

`Environment → Environmental Pressure (EP) → Body Tolerance (BT) → Pressure Delta → Perception → Action Modifier → Outcome`

No parallel outcome/progression logic should bypass this flow.

## Source of truth

All simulation tuning is loaded from `/data`:

- `data/nodes.json`
- `data/environmental_pressure_config.json`
- `data/action_modifiers.json`
- `data/stage_modifiers.json`
- `data/characters.json`
- `data/character_events.json`
- `data/context_events.json`
- `data/outcomes.json`
- `data/scenarios.web-v1.json`

## Canonical config-loading module

**`prototype/web-v1/ui/helpers/data-config.js`** is the single authoritative source for loading and normalizing all data config files.

Two-phase pipeline:

1. **`loadDataConfigFiles({ fetchImpl, onError })`** — fetches each JSON file, validates the raw shape via `validateDataConfigShape`, and classifies blocking failures (missing file / HTTP failure / invalid JSON / invalid shape).
2. **`normalizeRouteData(config)`** — transforms raw route-node objects (`nodeId`, `stageHint`, …) into the canonical `RouteNode` shape (`id`, `stage`, `routeIndex`, …) consumed by the engine and UI.

No other module should duplicate either the file-path list or the normalization transform.

**TypeScript side:** `src/types/data-contracts.ts` declares the `DataConfig` interface and `assertDataConfig()`. `src/boot/loadDataConfig.ts` is a thin re-export adapter; it does not contain loading logic.

**Canonical contract decision — runtime normalization is authoritative, TS mirrors it:**

| Layer | Shape | Authoritative source |
|---|---|---|
| Raw JSON | `RawRouteNode` (`nodeId`, `stageHint`, …) | `data/nodes.json` |
| Loaded config | `DataConfig` (`nodes: RawRouteNode[]`, all other files) | `loadDataConfigFiles()` in `data-config.js` |
| Normalized route | `NormalizedRouteData` (`routeNodes`, `positions`, `labels`, …) | `normalizeRouteData()` in `data-config.js` |
| TS contract | `DataConfig` + sub-types in `src/types/domain.ts` | mirror of runtime; validated by `assertDataConfig()` |

`DataConfig.nodes` is typed as `RawRouteNode[]` (pre-normalization). Pass the loaded config to `normalizeRouteData()` to obtain the `NormalizedRouteData` shape (`RouteNode[]`, `positions`, etc.) used by the engine and UI.

**Parity test:** `tests/parity/loader-ts-contract-parity.test.js` verifies that both the raw loader output and the normalized output satisfy every invariant that the TS contracts declare, catching drift between the two sources.

## Repository prototype status

- `prototype/web-v1/`: **active canonical prototype** (v1.4 public state, phased progress).
- `prototype/mra-v0/`: **frozen historical validation artifact**.
- `index.html` at repo root: canonical public landing page with primary CTA to `prototype/web-v1/index.html`.


## v1.4.8 additions (governance matrix, concept art integration, artwork layout, quality gate hardening)

- Added dual-prototype governance matrix (`docs/prototype-ownership-matrix.md`), cross-surface contract gate (`npm run test:contracts`), and enforcement tests in `tests/parity/dual-prototype-contract.test.js` to lock active-vs-frozen prototype responsibilities.
- Added engine tuning guardrails in `tests/engine/tuning-guardrails.test.js` covering EP scale constraints, fractional burn-rate floors, and deterministic summit-return viability checks.
- Added `scripts/check-markdown-links.js` and `npm run validate:links` for portable internal markdown link drift detection across `README*`, `docs/`, and `temp/`.
- Added `docs/concept-art-catalog.md`: visual analysis catalog for all 13 scenes across `art/concept-art/curated/ig/` and `art/cover/ig/`, documenting the overlay/no-overlay pairing convention, palette alignment, and recommended use cases.
- Integrated curated concept art into public surfaces: landing page hero (Scene 1), atmospheric art strip (Scenes 3, 7, 13), README gallery (Scenes 1, 3, 7, 13 + cover plate 2). Updated `docs/design-system.md` with Visual assets section (§12).
- Fixed landing page illustration layout: hero now fills full height with `object-fit: cover`; art strip uses `aspect-ratio: 4/5` to respect portrait compositions.
- Centralized run-log outcome annotation: `endRun()` now uses `annotateRunLogOutcome()` from `ui/helpers/run-log.js`; removed inline per-entry mapping.
- Fixed run-log summary alias drift: removed legacy `lateSignalTriggered` fallback; canonical `lateSignalActivation` is the only supported counter.
- Promoted all five active tech-debt items to resolved; no active debt items remain.

## v1.4.7 additions (carousel/narrative extraction, resource economy fix, NARRATIVES_ES parity)

- Extracted carousel rendering and navigation logic from `ui/screens.js` into `ui/helpers/carousel.js`: card HTML builders (`buildCharacterCardHtml`, `buildRandomCharacterCardHtml`, `buildScenarioCardHtml`, `buildRandomScenarioCardHtml`, `buildRouteCardHtml`), dot renderer (`renderCarouselDots`), info-panel helpers (`toggleInfoPanel`, `hideInfoPanel`), character-image path resolver (`getCharacterImagePath`), and navigation index helper (`stepCarouselIndex`). Part 1 and Part 2 carousels share the same builder functions.
- Extracted narrative text banks and dispatch logic from `ui/screens.js` into `ui/helpers/narrative.js`: `NARRATIVES` (EN, 27 keys), `NARRATIVES_ES` (ES, now fully parity-complete at 27/27 keys), `pickNarrative` (pure bank selector with injectable RNG), and `resolveNarrativeText` (pure DOM-free flag-priority dispatcher). The same narrative resolution logic is independently testable without a browser environment.
- Fixed `engine/turn-rules.js` resource economy: `calculateResourceBurnForMinutes()` now preserves fractional burn (two-decimal precision) instead of rounding half-hour burns to zero, so food/water decrease consistently across turns in low-burn stages and high-efficiency profiles.
- Fixed resource HUD presentation in `ui/screens.js`: watch and mobile status counters now display rounded-up whole units (`ceil`) until depletion reaches zero, hiding decimals without false-zero flicker.
- Fixed `summitLateStart` and `summitOptimalEnd` defensive fallback values in `screens.js` to match `environmental_pressure_config.json` (1020 and 630 respectively); prior fallbacks of 780/660 would have produced incorrect summit timing if the config failed to load past the fatal-error gate.
- Added 30 new unit tests: 20 in `tests/unit/carousel-narrative.test.js` (carousel helpers, narrative bank integrity, pickNarrative language/fallback, resolveNarrativeText flag priority), 10 in `tests/unit/telemetry-contract.test.js` (per-turn telemetry entry shape and export immutability).

## v1.4.6 additions (second-pass UI modularization)

- Moved 6 pure body-state and pressure label functions from `ui/screens.js` to `ui/helpers/screen-utils.js`:
  `bodyValueClass`, `capacityLabel`, `fatigueLabel`, `exposureLabel`, `pressureDeltaLabel`, `pressureBandLabel`.
  These functions have zero side-effects and no dependencies; they are the canonical label sources for the watch
  panel, turn log, and debrief analytics.
- `ui/game-loop.js` now imports these 6 functions (+ `formatMinutes`) directly from `screen-utils.js` instead of
  receiving them as injected constructor parameters. This removes 7 entries from the `createGameLoop` factory API,
  making the dep-injection surface smaller and the module easier to test.
- Extracted expedition-journal responsibility from `ui/screens.js` to `ui/screens/journal.js`.  The new module
  owns: `JOURNAL_KEY`, `migrateJournalKey`, `loadJournal`, `saveJournalEntry`, `clearJournal`, `renderJournal`.
  It imports storage helpers directly; `t()` (i18n) is passed as a parameter so the data-access functions
  (`loadJournal`, `saveJournalEntry`, `migrateJournalKey`) are exercisable in Node without a browser environment.
  `screens.js` keeps thin wrapper functions that supply `t` and the DOM container.
- 37 new unit tests: 27 in `screen-utils.test.js` (covering the 6 label functions) and 10 in `journal.test.js`
  (covering data-access and migration logic).



- Extracted debrief analysis functions `findTurningPoint`, `findPrimaryCause`, and `buildReflectionPrompts` from `ui/screens.js` to `ui/screens/debrief.js`. All three are now pure functions that receive deps via a parameter object (`turnLog`, `POS_LABELS`, `finalOutcome`, `characterId`, `lang`). `screens.js` keeps thin wrapper functions that inject runtime state. Covered by 20 unit tests in `tests/unit/debrief-analysis.test.js`.
- Promoted all accumulated [Unreleased] work to `v1.4.6`: screens partitioning (game-loop, flow-controller, screens/* modules), event-registry, storage safety, API ESM migration, CI hardening, and documentation updates.

## v1.4.5 additions

- Added a seed-driven environment-event layer that mutates weather/visibility inside the canonical resolver weather stage; no parallel progression authority was added.
- Added debrief/run-review helpers and accessibility helper modules under `prototype/web-v1/ui/helpers/` as low-risk modularization preparation for future TS migration.
- Added startup/data-boot modular ownership: `ui/helpers/data-config.js` now classifies required-file failures (missing file, HTTP failure, invalid JSON, invalid shape, post-load validation), while `ui/helpers/startup-ui.js` renders loading + fatal blocking states so `ui/screens.js` remains orchestration-focused.
