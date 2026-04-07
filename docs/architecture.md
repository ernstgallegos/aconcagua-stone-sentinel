# Architecture — Prototype Web v1.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[1.4.6]`](../CHANGELOG.md#146--2026-04).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (and Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4.6** with phased rollout contracts preserved.

Prototype Web v1.4 (public branch state) is the canonical active prototype in this repository, with completed and in-progress items from the v1.4 phase plan.

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

**TypeScript side:** `src/types/data-contracts.ts` declares the `DataConfig` interface and `assertDataConfig()`, which validates the **post-normalization** shape (i.e., after `normalizeRouteData` has run). `src/boot/loadDataConfig.ts` is a thin re-export adapter; it does not contain loading logic.

**Parity test:** `tests/parity/loader-ts-contract-parity.test.js` verifies that the normalized output of the JS loader satisfies every invariant that the TS contracts declare, catching drift between the two sources.

## Repository prototype status

- `prototype/web-v1/`: **active canonical prototype** (v1.4 public state, phased progress).
- `prototype/mra-v0/`: **frozen historical validation artifact**.
- `index.html` at repo root: canonical public landing page with primary CTA to `prototype/web-v1/index.html`.


## v1.4.6 additions

- Extracted debrief analysis functions `findTurningPoint`, `findPrimaryCause`, and `buildReflectionPrompts` from `ui/screens.js` to `ui/screens/debrief.js`. All three are now pure functions that receive deps via a parameter object (`turnLog`, `POS_LABELS`, `finalOutcome`, `characterId`, `lang`). `screens.js` keeps thin wrapper functions that inject runtime state. Covered by 20 unit tests in `tests/unit/debrief-analysis.test.js`.
- Promoted all accumulated [Unreleased] work to `v1.4.6`: screens partitioning (game-loop, flow-controller, screens/* modules), event-registry, storage safety, API ESM migration, CI hardening, and documentation updates.

## v1.4.5 additions

- Added a seed-driven environment-event layer that mutates weather/visibility inside the canonical resolver weather stage; no parallel progression authority was added.
- Added debrief/run-review helpers and accessibility helper modules under `prototype/web-v1/ui/helpers/` as low-risk modularization preparation for future TS migration.
- Added startup/data-boot modular ownership: `ui/helpers/data-config.js` now classifies required-file failures (missing file, HTTP failure, invalid JSON, invalid shape, post-load validation), while `ui/helpers/startup-ui.js` renders loading + fatal blocking states so `ui/screens.js` remains orchestration-focused.
