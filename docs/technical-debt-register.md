# Technical Debt Register

This register tracks active technical debt that affects delivery risk, maintainability, and release predictability.

## Release PR policy

For every release PR:

1. Review each debt item below and update status/notes if scope, owner, or risk changed.
2. Reflect debt paydown or intentional debt extension in `CHANGELOG.md` under `[Unreleased]`.
3. If an item exits, record the closure date and link the resolving PR/commit in this file.

## Active debt items

No active debt items are currently registered. Re-open an item only when its measurable exit criterion regresses.

## Intentional deferrals (permanently classified)

These items have been evaluated and intentionally deferred with explicit rationale. They do not count as "open" debt and should not be re-opened as unresolved issues unless the exit criterion is met.

| Item | Rationale | Exit criterion |
|---|---|---|
| **Asset bundling / minification** | The prototype is a single-file static HTML app served over Vercel CDN with Brotli compression. The payload is already small (~200 KB uncompressed). Introducing a build pipeline (Vite, Rollup, etc.) would add maintenance complexity that is not justified until a production build target exists. | Revisit when a production release branch is created with a defined deployment pipeline. |
| **Service Worker / offline support** | The game requires live data fetches from `data/*.json` on startup. A Service Worker would need a cache-management strategy for data versioning. This is appropriate for v2 production but adds operational risk in the current single-file prototype. | Revisit after v2 production architecture is defined. |
| **Stylelint / HTML validator in CI** | CSS and HTML are tightly coupled with JS in a single-file prototype. Linting HTML from CI requires either a W3C network call or an npm validator dependency. For now, structural HTML invariants are covered by `new-mechanics.test.js` and Playwright smoke tests. | Add `htmlhint` and `stylelint` to devDependencies when the project introduces a formal npm package build. |
| **`screens.js` further extraction** | The `screens.js` file is reduced to orchestration/wiring as of v1.4.6 (see Resolved items below). Remaining content is wiring glue that cannot be cleanly extracted without a full ES-module rewrite. | Revisit during a full screens modularisation sprint if the file regresses above 3000 lines. |
| **`window.*` facade deprecation** | The `window.*` facade in `screens.js` (lines 3644–3684) bridges inline HTML `onclick` handlers to ES-module functions. It will be removable once all HTML event handlers are migrated to `[data-action]` delegation via `event-registry.js`. Inline `onkeydown` removed in v1.4.8. | Remove the facade after: (1) all remaining `onclick=` attributes in `index.html` are replaced with `data-action`, (2) `bindUiEventRegistry` handles all interactive element types, (3) a smoke test verifies all CTAs work without `window.*`. |
| **EN/ES parity for technical-only docs** | Technical implementation docs (`docs/architecture.md`, `docs/simulation_engine.md`, `docs/technical-debt-register.md`, `docs/api-contract.md`, `docs/deploy-routing.md`) are maintained in English only. Spanish documentation (`docs/es/`) covers narrative design, character profiles, and player-facing systems only. Mixed-audience technical docs do not require ES mirrors. | This is a permanent policy, not a debt item. No exit criterion applies. |

## Resolved debt items

| Debt item | Resolution | Resolved in |
|---|---|---|
| Tuning fragility hotspots (EP/BT multipliers, stage penalties, and resource economy thresholds) | Added automated guardrail suite `prototype/web-v1/tests/engine/tuning-guardrails.test.js` covering EP root-scale constraints, fractional burn-rate floor behavior, and deterministic summit-return viability. Updated balance notes with current target bands and dispersion table as canonical references. | v1.4.8 (Unreleased) |
| Dual-prototype divergence (`prototype/web-v1` active vs `prototype/mra-v0` reference) | Added explicit ownership matrix `docs/prototype-ownership-matrix.md`, added required contract gate script `npm run test:contracts`, and added parity enforcement suite `prototype/web-v1/tests/parity/dual-prototype-contract.test.js` validating ownership/contract overlap and intentional divergences. | v1.4.8 (Unreleased) |
| Run-log compatibility aliases (legacy additive fields kept for historical consumers) | Removed legacy summary alias fallback (`lateSignalTriggered`) from run-log summarization so telemetry aggregation now reads canonical `lateSignalActivation` only. Added immutability helper `annotateRunLogOutcome()` and contract tests to prevent alias reintroduction. | v1.4.8 (Unreleased) |
| Nationality-flag rendering parity (emoji fallback differences across desktop/mobile OS/browser stacks) | Locked ISO-code-first fallback contract via `ui/helpers/nationality.js` and added card-path coverage tests in `tests/unit/carousel-narrative.test.js` for Part 1 and Part 2 render paths so nationality remains readable even when emoji glyph rendering differs by platform. | v1.4.8 (Unreleased) |
| Telemetry centralization (per-turn telemetry object still assembled inline in multiple paths; no single structured emit contract) | Consolidated run-log mutation path into telemetry helper module (`ui/helpers/run-log.js`) by routing outcome annotation through `annotateRunLogOutcome()` and keeping per-turn entry assembly in `buildTurnLogEntry()` contract tests. Game loop remains the canonical emission path and debrief path consumes helper output without inline record-shape duplication. | v1.4.8 (Unreleased) |
| Narrative bank i18n parity (NARRATIVES_ES coverage) | Verified key parity between `NARRATIVES` and `NARRATIVES_ES` in `ui/helpers/narrative.js` (26/26 keys, no EN-only gaps). Removed obsolete debt item to prevent false tracking noise. | v1.4.8 (Unreleased) |
| Residual UI coupling in `screens.js` (carousel/narrative logic co-located) | Extracted carousel rendering, card builders, dot navigation, and info-panel toggle to `ui/helpers/carousel.js`. Extracted narrative text banks and dispatch logic to `ui/helpers/narrative.js`. Both modules are independently testable with 20+ unit tests. `screens.js` now delegates rendering through thin wrappers. | v1.4.7 |
| `screens.js` orchestration breadth (screen renderers and orchestration co-located) | Complete renderer extraction into `ui/screens/*` modules (`title.js`, `game.js`, `debrief.js`, `part2.js`) and orchestration delegation into `ui/game-loop.js`, `ui/flow-controller.js`, and `ui/helpers/screen-utils.js`. `screens.js` now limited to orchestration/wiring and initialization. Smoke + unit boundary coverage green. | v1.4.6 |

## Review cadence

- Minimum cadence: every release PR.
- Optional cadence: during any balancing or architecture refactor PR that touches debt-related files.
