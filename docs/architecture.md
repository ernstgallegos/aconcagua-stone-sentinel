# Architecture — Prototype Web v1.5 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[1.5.1]`](../CHANGELOG.md#151--2026-04).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (and Spanish mirror: `docs/es/plan-implementacion-v1.4.md`). v1.5.0 delivery documented in [`docs/en/implementation-plan-v1.5.md`](./en/implementation-plan-v1.5.md).
> - Current public build is **v1.5.1** with phased rollout contracts preserved.

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

- `prototype/web-v1/`: **active canonical prototype** (v1.5.1 public state, phased progress).
- `prototype/mra-v0/`: **frozen historical validation artifact**.
- `index.html` at repo root: canonical public landing page with primary CTA to `prototype/web-v1/index.html`.

## Active technical debt

Active debt items (owner, risk, symptoms, and measurable exit criteria) are tracked in [`docs/technical-debt-register.md`](./technical-debt-register.md). Consult that file for the current state — do not rely on any historical snapshot here.

## Change history

Per-version change history (what was added, fixed, or changed in each release) is recorded in [`CHANGELOG.md`](../CHANGELOG.md). This architecture document describes the current system structure only.
