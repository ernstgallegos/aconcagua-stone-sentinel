# Technical Debt Register

This register tracks active technical debt that affects delivery risk, maintainability, and release predictability.

## Release PR policy

For every release PR:

1. Review each debt item below and update status/notes if scope, owner, or risk changed.
2. Reflect debt paydown or intentional debt extension in `CHANGELOG.md` under `[Unreleased]`.
3. If an item exits, record the closure date and link the resolving PR/commit in this file.

## Active debt items

| Debt item | Owner | Risk | Symptoms | Measurable exit criterion |
|---|---|---|---|---|
| `screens.js` monolith (3658 lines) | UI layer | Medium — maintainability risk, merge conflict surface | Difficulty navigating/reviewing; multiple responsibilities in one file | `screens.js` reduced to < 500 lines of pure wiring/init; remaining logic extracted to dedicated modules with independent tests |
| `mountain-visualization.js` size (2991 lines) | UI layer | Low — isolated module with stable API | Single large rendering file with mixed concerns (terrain, climber, atmosphere, HUD, post-processing) | Subsystems extracted to at least 3 focused modules; each independently importable |
| No test coverage metrics | Quality | Low — tests exist but coverage visibility is zero | Cannot identify untested paths without manual review | Coverage reporting via `c8` or equivalent integrated into `npm test` output |

## Resolved debt items

| Debt item | Resolution | Resolved in |
|---|---|---|
| Inline `onkeydown` handler (CSP/a11y inconsistency) | Removed inline handler from `index.html`; keyboard activation for `[data-action]` elements handled by centralized `event-registry.js` with Enter/Space delegation. | v1.5.1 |
| `epResult.pressureScore` direct mutation | Replaced with separate `adjustedPressureScore` variable in `turn-resolution.js`. EP result object is no longer mutated. | v1.5.1 |
| Magic numbers in turn-resolution.js undocumented | Added inline comments documenting all balance-critical constants (progress base 58, collapse multiplier 1.2, acclimatization thresholds, late-signal gates, photo confidence values). | v1.5.1 |
| `JSON.parse(JSON.stringify())` deep clone risk | Replaced with `structuredClone` (JSON fallback) in `game-state.js`. | v1.5.1 |
| `createTurnEngine` missing dependency validation | Added required-deps check at initialization with descriptive error. | v1.5.1 |
| `pressureHistory` unbounded array growth | Added ring-buffer cap (100 entries) in `game-state.js` `applySliceUpdate`. | v1.5.1 |
| DOM property pollution via `__modalKeydownHandler` | Replaced with `WeakMap` in `accessibility.js`. | v1.5.1 |
| Duplicate position list rendering (innerHTML copy) | Refactored `renderPositionList` in `screens/game.js` to build DOM nodes independently for both containers. | v1.5.1 |
| Version drift in docs/architecture.md and docs/simulation_engine.md | Updated version headers from v1.4.8 to v1.5.0. | v1.5.1 |
| Broken markdown links in geological bible docs | Replaced image references with citation placeholders (copyrighted figure). | v1.5.1 |
| Public roadmap missing v1.5.0 | Updated EN/ES roadmaps with v1.5.0 stage and status matrix. | v1.5.1 |
| No v1.5.0 implementation plan | Created `docs/en/implementation-plan-v1.5.md` and ES mirror. | v1.5.1 |
| Playwright smoke tests not running on push to main | Removed PR-only condition; smoke tests now run on both push and PRs. | v1.5.1 |
| No dependency security scanning in CI | Added `npm audit --audit-level=high` to `js-contract-tests` job. | v1.5.1 |
| No markdown link validation in CI | Added `npm run validate:links` to `json-validation` job. | v1.5.1 |
| `temp/` legacy audit files and naming issues | Archived to `devlog/` with corrected naming; replaced empty README. | v1.5.1 |
| `vizAction`/`vizFlags` direct property assignment bypassing state validation | Added `vizAction`/`vizFlags` to `RUN_STATE_DEFAULTS`; all writes routed through `updateRunState()`. | post-v1.5.1 audit |
| Remaining `JSON.parse(JSON.stringify())` in `screens.js` and `data-config.js` | Replaced with `structuredClone` for consistency with `game-state.js` upgrade. | post-v1.5.1 audit |
| Decision timing bias (`turnDecisionStartedAt` recorded before render delay) | Moved recording into `setTimeout` callback in `game-loop.js` so measurement begins when UI is interactive. | post-v1.5.1 audit |
| Duplicate EP calculation per turn in `game-loop.js` | Reuses `lastTurnRecord.pressure.EP` from telemetry with fallback recalculation. | post-v1.5.1 audit |
| `efficiency \|\| 1` falsy-zero bug in `turn-rules.js` | Replaced with `efficiency ?? 1` (nullish coalescing) to preserve intentional zero. | post-v1.5.1 audit |
| Version drift: `docs/repo-truth.es.md` (v1.4.6) and `prototype/web-v1/README.md` (v1.4.5) | Synchronized to `v1.5.1`; added both files to version parity test. | post-v1.5.1 audit |
| Release smoke script crash on DNS/network failure | Added graceful error handling with clear message for unreachable environments. | post-v1.5.1 audit |
| `applyTimeCost` direct G-level mutations (`day`, `permitDay`, `minutesOfDay`) | Routed through `applyClockDelta` + `updateRunState` for consistency with `applyEventTimePenalty`. | post-v1.5.1 audit |
| `spendResourcesForMinutes` direct `G.consecutiveWater0` mutation | Routed through `updateRunState` for state management consistency. | post-v1.5.1 audit |
| `applyBivouacPenalty` direct G-level mutations (`persistenceTurns`, `minutesOfDay`) | Routed through `updateRunState` for state management consistency. | post-v1.5.1 audit |
| `G.character`/`G.scenario`/`G.seed` direct mutations in setup paths | All 12 call sites routed through `updateRunState()` for consistency with engine-level state writes. | post-v1.5.1 audit (phase 2) |
| Inconsistent `\|\|` vs `??` in engine numeric defaults | Standardized to `??` (nullish coalescing) across `pressure-model.js`, `turn-rules.js`, `turn-resolution.js`, `events-core.js` for safety with intentional zero values. Added `Math.max(..., 0.1)` floor guard on `fatigueResistance`/`exposureResistance` to prevent division-by-zero. | post-v1.5.1 audit (phase 2) |
| Stale `FIX:` comments in `screens.js` (5 instances) | Cleaned up 5 misleading `FIX:` comments where the fixes were already applied but the comments were never updated. | post-v1.5.1 audit (phase 2) |
| No unit tests for `helpers/debrief.js` (4 exported functions) | Added 23 tests covering `computeDecisionPattern`, `computeDominantRiskAxis`, `buildRunSignature`, `buildSignalInterpretationHint`. | post-v1.5.1 audit (phase 2) |
| No unit tests for `helpers/selectors.js` (2 exported functions) | Added 10 tests covering `getConfiguredScenarios` and `getRandomScenarioConfig` null-safety and shape contract. | post-v1.5.1 audit (phase 2) |
| `effectiveDelta \|\| pressureDelta` zero-coercion bug in `turn-resolution.js:updateState()` | Replaced `\|\|` with `??` so that a `pressureDeltaCap` of `0` correctly produces `effectiveDelta = 0` instead of falling through to the uncapped raw `pressureDelta`. Added regression test. | post-v1.5.1 audit (phase 3) |
| Remaining `\|\|` → `??` in `pressure-model.js` config lookups (6 lines) | Standardized object fallbacks to `??` for consistency with engine-wide convention. | post-v1.5.1 audit (phase 3) |
| Remaining `\|\|` → `??` in `events-core.js` object defaults (8 lines) | Standardized object/default fallbacks to `??` for consistency with engine-wide convention. | post-v1.5.1 audit (phase 3) |
| Photo action `\|\|` numeric defaults in `turn-resolution.js` | Standardized `photoConfidenceGain`, `photoUncertaintyDrop`, `photoInsightTurns` fallbacks from `\|\|` to `??`. | post-v1.5.1 audit (phase 3) |
| Dead `structuredClone` JSON fallback in `game-state.js` | Removed unreachable `JSON.parse(JSON.stringify())` branch — Node ≥18 guarantees `structuredClone`. | post-v1.5.1 audit (phase 3) |
| API OPTIONS preflight missing CORS cache and expose headers | Added `Access-Control-Max-Age: 86400` and `Access-Control-Expose-Headers` for rate-limit header visibility. Added API tests. | post-v1.5.1 audit (phase 3) |
| `\|\|` numeric/object defaults in `screens.js` gameplay layer | Standardized ~55 `\|\|` → `??` instances across perception calculations (`calculatePerceptionLatency`, `calculatePerception`, `getStageModifier`, `calculateBodyTolerance`), config/setup (`buildRandomScenario`, `beginExpedition`, `applyAcclimatizationGain`, `applyBivouacPenalty`), resource economy (`spendResourcesForMinutes`), photo system (`canUseShootPhoto`, carry-over perception), engine wiring (`getTimeWindows`, `applyContextEvents`, `applySummitDifficultyRegressionGuard`). Intentionally kept `\|\|` only for string/display fallbacks (i18n, labels) and boolean OR conditions. | post-v1.5.1 audit (phase 4) |
| Tuning fragility hotspots (EP/BT multipliers, stage penalties, and resource economy thresholds) | Added automated guardrail suite `prototype/web-v1/tests/engine/tuning-guardrails.test.js` covering EP root-scale constraints, fractional burn-rate floor behavior, and deterministic summit-return viability. Updated balance notes with current target bands and dispersion table as canonical references. | v1.4.8 |
| Dual-prototype divergence (`prototype/web-v1` active vs `prototype/mra-v0` reference) | Added explicit ownership matrix `docs/prototype-ownership-matrix.md`, added required contract gate script `npm run test:contracts`, and added parity enforcement suite `prototype/web-v1/tests/parity/dual-prototype-contract.test.js` validating ownership/contract overlap and intentional divergences. | v1.4.8 |
| Run-log compatibility aliases (legacy additive fields kept for historical consumers) | Removed legacy summary alias fallback (`lateSignalTriggered`) from run-log summarization so telemetry aggregation now reads canonical `lateSignalActivation` only. Added immutability helper `annotateRunLogOutcome()` and contract tests to prevent alias reintroduction. | v1.4.8 |
| Nationality-flag rendering parity (emoji fallback differences across desktop/mobile OS/browser stacks) | Locked ISO-code-first fallback contract via `ui/helpers/nationality.js` and added card-path coverage tests in `tests/unit/carousel-narrative.test.js` for Part 1 and Part 2 render paths so nationality remains readable even when emoji glyph rendering differs by platform. | v1.4.8 |
| Telemetry centralization (per-turn telemetry object still assembled inline in multiple paths; no single structured emit contract) | Consolidated run-log mutation path into telemetry helper module (`ui/helpers/run-log.js`) by routing outcome annotation through `annotateRunLogOutcome()` and keeping per-turn entry assembly in `buildTurnLogEntry()` contract tests. Game loop remains the canonical emission path and debrief path consumes helper output without inline record-shape duplication. | v1.4.8 |
| Narrative bank i18n parity (NARRATIVES_ES coverage) | Verified key parity between `NARRATIVES` and `NARRATIVES_ES` in `ui/helpers/narrative.js` (26/26 keys, no EN-only gaps). Removed obsolete debt item to prevent false tracking noise. | v1.4.8 |
| Residual UI coupling in `screens.js` (carousel/narrative logic co-located) | Extracted carousel rendering, card builders, dot navigation, and info-panel toggle to `ui/helpers/carousel.js`. Extracted narrative text banks and dispatch logic to `ui/helpers/narrative.js`. Both modules are independently testable with 20+ unit tests. `screens.js` now delegates rendering through thin wrappers. | v1.4.7 |
| `screens.js` orchestration breadth (screen renderers and orchestration co-located) | Complete renderer extraction into `ui/screens/*` modules (`title.js`, `game.js`, `debrief.js`, `part2.js`) and orchestration delegation into `ui/game-loop.js`, `ui/flow-controller.js`, and `ui/helpers/screen-utils.js`. `screens.js` now limited to orchestration/wiring and initialization. Smoke + unit boundary coverage green. | v1.4.6 |

## Review cadence

- Minimum cadence: every release PR.
- Optional cadence: during any balancing or architecture refactor PR that touches debt-related files.
