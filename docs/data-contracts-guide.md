# Data Contract Guide — `prototype/web-v1`

This document explains the purpose, required fields, key constraints, and
validation approach for each data file consumed by the `prototype/web-v1` runtime.

**Validation layer:** `prototype/web-v1/ui/helpers/data-config.js::validateDataConfigShape()`
performs runtime shape assertions during startup.  The TypeScript sidecar
(`prototype/web-v1/src/types/`) provides structural type inference for tooling but
does NOT run in the browser.

---

## `data/characters.json`

**Purpose:** Defines the six playable characters for Part 1.  Each character
carries both narrative identity fields (name, bio, traits) and engine modifier
fields consumed by `resolveTurn()`.

**Required fields per character:**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Canonical snake_case identifier; referenced by events, scenarios, and tests |
| `name` | string | Display name |
| `difficultyLabel` | string | e.g. `"Standard"`, `"Expert"` — shown in UI |
| `engine` | object | Full engine modifier set (see below) |

**Engine modifier object (required sub-fields):**

`fatigueResistance`, `exposureResistance`, `confidenceStability`, `riskTolerance`
are the minimum required engine fields.  Additional perception and recovery modifiers
(`perceptionBias`, `perceptionGuardrails`, `perceptionLatency`, `recoveryEfficiency`,
etc.) are optional but recommended for full mechanical differentiation.

**Optional fields:**

`flag` (string, flag emoji), `nationalityCode` (ISO 3166-1 alpha-2, uppercase,
validated by regex `/^[A-Z]{2}$/`), `role`, `bio`, `traits` (array of strings).

**Common mistakes:**
- Adding a character without full engine modifier set → results in `NaN` propagation
  in turn math (guarded by `getActionModifier()` normalization).
- Mismatching `id` between this file and `data/character_events.json` → events never trigger.
- Using a lowercase `nationalityCode` → validation throws at startup.

**Validated in code:** id (string), nationalityCode format (regex), array structure.

---

## `data/character_events.json`

**Purpose:** Bounded per-character narrative/mechanical events triggered by engine
conditions (fatigue level, stage, action, turn count).  Effects are additive deltas
only; no terminal outcomes are set here.

**Required fields per event:**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique event identifier; used in telemetry |
| `characterId` | string | Must match a character `id` in `data/characters.json` |
| `category` | string | One of: `onset_context`, `pressure_interpretation`, `pacing_hesitation`, `observation`, `body_mind_drift` |
| `trigger` | object | Conditions object; can be empty `{}` |
| `effects` | object | Additive deltas (`fatigueDelta`, `exposureDelta`, etc.) |
| `limits` | object | `{ maxPerRun: number (>=1), cooldownTurns: number (>=0) }` |
| `telemetryTag` | string | Required for run-log instrumentation |
| `visibleToPlayer` | boolean | Whether event text surfaces in UI |
| `hiddenFromPlayer` | boolean | Whether event is suppressed from player view |
| `conditions.mountainAuthority` | string | Required for test coverage assertions |

**Constraints:**
- All six active characters (`francisco`, `laura`, `irina`, `erik`, `daniela`, `blake`)
  must have at least one event each (tested in `tests/contracts/data-contracts.test.js`).
- `maxPerRun >= 1` and `cooldownTurns >= 0` are hard lower bounds.
- Event effects are additively applied, never terminal-outcome-setting.

**Common mistakes:**
- Missing `telemetryTag` → validation error at startup.
- `maxPerRun: 0` → validation throws.
- Category outside the allowed set → startup shape check throws.

---

## `data/context_events.json`

**Purpose:** Environment/context events triggered at specific turn numbers or
stages.  They modify weather, visibility, and time penalty — not body state directly.

**Required fields per event:**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier |
| `label` | string | Display label |
| `category` | string | Must be `"context"` |
| `trigger` | object | `{ turns: number[] (non-empty), stages?: Stage[] }` |
| `effects` | object | `{ weatherDelta: number, visibilityDelta: number, timePenalty?: number (>=0) }` |
| `limits.maxPerRun` | number | Must be >= 1 |
| `telemetryTag` | string | Required |

**Constraints:**
- At least 4 events required (tested).
- `timePenalty`, if present, must be non-negative.
- Effects are bounded — large deltas can make summit routes probabilistically impossible.

**Common mistakes:**
- Empty `trigger.turns` array → validation throws.
- Missing `effects` object → validation throws.
- Setting `weatherDelta` > 3 without accounting for EP ceiling effects.

---

## `data/nodes.json`

**Purpose:** Route nodes defining the Aconcagua ascent path.  Each node is a
position on the route with altitude, terrain, and environmental bias values.

**Required fields per node:**

| Field | Type | Notes |
|---|---|---|
| `nodeId` | string | **Raw JSON field**; normalized to `id` by `normalizeRouteData()` |
| `altitudeBand` | number | Used for EP band calculations |
| `routeIndex` | number | Sort order for the route |

**Important normalization note:**  Raw JSON uses `nodeId`; after
`normalizeRouteData()` the field becomes `id`.  The TypeScript `RouteNode`
interface expects `id` (normalized).  Never pass raw nodes to `assertDataConfig()`.

**Optional fields:** `nodeName`, `altitudeMeters`, `terrainLoad`, `weatherBias`,
`visibilityBias`, `timeSensitivity`, `isCamp` (boolean), `stageHint`.

**Constraints:**
- `stageHint` must be one of `APPROACH`, `HIGH_CAMP`, `SUMMIT_DAY` (validated by TS layer).
- The last node in `routeIndex` order is treated as the summit.
- `horcones` node should exist as the park gate; it is not an automatic end-state.

**Common mistakes:**
- Adding a node with `nodeId: null` → startup shape check throws.
- Reordering `routeIndex` without checking camp positions → may break stage inference.

---

## `data/outcomes.json`

**Purpose:** Canonical list of all possible run outcome strings.  This list is
the ground truth for outcome labels used in the resolver, debrief, and run log.

**Required fields per outcome:** Each entry is expected to be an object with at
minimum an `id` or `name` string field (validated in code by structure check).

**Constraints:**
- Must include all ten canonical outcomes (tested in `tests/parity/*.test.js`):
  `Summit and Safe Return`, `High Point Return`, `Strategic Retreat`, `Rescue`,
  `Collapse (Fatigue)`, `Collapse (Exposure)`, `Resource Exhaustion`,
  `Expedition Window Closed`, `Permit Expired`, `Fatality`.
- Order within the file does NOT matter; ordering-sensitive logic is in the resolver.
- Do NOT add outcomes here unless the resolver in `engine/turn-resolution.js` also handles them.

**Common mistakes:**
- Removing an outcome from this file without removing it from the resolver → parity test fails.
- Renaming an outcome string without updating debrief analysis and run-log formatters.

---

## `data/scenarios.web-v1.json`

**Purpose:** Predefined scenarios (each with a set of seeds and initial conditions)
and the random-scenario archetype configuration.

**Required structure:**

```json
{
  "predefinedScenarios": [ ... ],
  "randomScenario": { "archetypes": [ ... ], "initialRanges": { ... } }
}
```

**Required fields per scenario:**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Canonical identifier; referenced in deep links and tests |
| `name` | string | Display name |
| `max_turns` | number | Expedition window cap |
| `seeds` | number[] | At least one seed required; aim for ~10 for replay entropy |

**Constraints:**
- `predefinedScenarios` must be non-empty (validated at startup).
- Each scenario should have multiple seeds (convention: ~10 minimum per the learning log).
- `max_turns` is a hard ceiling; runs ending exactly at this turn trigger
  `Expedition Window Closed`.

**Common mistakes:**
- Providing `seeds: []` → runtime may produce undefined seed behavior.
- Using non-unique `id` values across scenarios → carousel rendering may duplicate cards.

---

## Validation summary

| Layer | File | What it checks |
|---|---|---|
| JS runtime startup | `ui/helpers/data-config.js::validateDataConfigShape()` | Per-file structural shape (types, required fields) |
| JS runtime post-load | `ui/helpers/data-config.js::validateLoadedDataConfig()` | Cross-file invariants (non-empty arrays, at least one scenario) |
| TypeScript sidecar | `src/types/data-contracts.ts::assertDataConfig()` | Post-normalized structural contract (after `normalizeRouteData()`) |
| Contract tests | `tests/contracts/data-contracts.test.js` | Full-array element validation, character roster, outcome list |
| Parity tests | `tests/parity/*.test.js` | Canonical outcome set, active character roster, version coherence |
