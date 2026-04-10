# Data Contracts Guide — `prototype/web-v1`

This guide documents the schema, required fields, valid values, and common validation errors for the four main simulation data files used by `prototype/web-v1`.

Validation is performed at runtime by `prototype/web-v1/ui/helpers/data-config.js` (`validateDataConfigShape`) on every element of each array. The TypeScript-side parity contract in `prototype/web-v1/src/types/data-contracts.ts` (`assertDataConfig`) runs on post-normalized data (after `normalizeRouteData()`).

---

## `data/characters.json`

Array of character profiles. Six entries are required for Part 1.

### Required fields per entry

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique character identifier. Used as URL parameter. Valid: `francisco`, `laura`, `irina`, `erik`, `daniela`, `blake`. |
| `name` | `string` | Display name. |
| `flag` | `string` | Emoji flag for the character's nationality. |
| `role` | `string` | Short role/profession label. |
| `bio` | `string` | Narrative bio paragraph. |
| `traits` | `string[]` | Array of two trait description strings. |
| `difficultyLabel` | `string` | Human-readable difficulty tier. Accepted values: `Standard`, `Intermediate`, `Advanced`. |
| `engine` | `object` | Engine modifier block (see below). |

### Optional fields

| Field | Type | Validation |
|---|---|---|
| `nationalityCode` | `string` | ISO 3166-1 alpha-2 uppercase code (e.g., `AR`, `KR`, `SE`). Must match `^[A-Z]{2}$`. If absent, nationality display falls back to the emoji flag. |

### `engine` block fields

| Field | Type | Description |
|---|---|---|
| `functionalCapacityBonus` | `number` | Added to base functional capacity. |
| `acclimatizationRate` | `number` | Multiplier for acclimatization gain. `1.0` = neutral. |
| `resourceEfficiency` | `number` | Multiplier for resource consumption. `< 1` = uses less. |
| `fatigueResistance` | `number` | Multiplier for fatigue resistance. `> 1` = more resistant. |
| `exposureResistance` | `number` | Multiplier for exposure resistance. |
| `confidenceStability` | `number` | Multiplier for confidence signal stability. |
| `riskTolerance` | `number` | Multiplier for risk tolerance threshold. |
| `perceptionBias` | `number` | Signed additive bias on perceived EP. Positive = overestimates danger. |
| `perceptionGuardrails` | `object` | Hard limits on perception outputs: `minConfidence`, `maxNoise`, `minHintLevel`, `maxTimingActionPenalty`, `maxTimingConfidencePenalty`, `maxTimingNoiseIncrease`. |
| `perceptionLatency` | `object` | Latency model controlling when hidden-signal effects start: `baseDelay`, `pressureDeltaStart`, `stageActivation`, `timeActivationStart`, `minEarlyHint`. |
| `decisionWindow` | `object` | Decision timer configuration: `baseMs`, `stageModifiersMs`, `minFloorMs`, `degradeEveryMs`. |

### Common validation errors

- `characters:$[i].id` expected string — `id` is missing or not a string.
- `characters:$[i].nationalityCode expected ISO-3166 alpha-2 uppercase code` — value is not exactly two uppercase ASCII letters (e.g., `ar` instead of `AR`).

---

## `data/character_events.json`

Array of per-character bounded events. Each event can modulate fatigue, exposure, or confidence but **must never directly assign terminal outcomes** (`conditions.mountainAuthority` must be `"never_bypass_ep_bt"`).

### Required fields per entry

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique event ID, conventionally `<characterId>-<slug>`. |
| `category` | `string` | Event category tag (e.g., `onset_context`, `pacing_hesitation`). |
| `characterId` | `string` | Must match a character `id` in `characters.json`. |
| `trigger` | `object` | Conditions under which the event fires. |
| `conditions` | `object` | Engine-level constraints. Must include `mountainAuthority: "never_bypass_ep_bt"`. |
| `effects` | `object` | Bounded effect deltas. |
| `limits` | `object` | Per-run caps. |
| `telemetryTag` | `string` | Tag emitted in `run_log.json`. Conventionally `char-<characterId>-<slug>`. |
| `visibleToPlayer` | `boolean` | Whether the event narrative is shown to the player. |
| `hiddenFromPlayer` | `boolean` | Whether the event is suppressed from run-log display. |
| `narrative` | `string` | Short narrative text shown when `visibleToPlayer: true`. |
| `notes` | `string` | Internal design note (not shown to players). |

### `trigger` block fields (at least one typically set)

| Field | Type | Description |
|---|---|---|
| `actions` | `string[]` | Action IDs that activate this event (e.g., `["advance"]`, `["wait"]`). |
| `stages` | `string[]` | Stages that activate this event. Accepted values: `APPROACH`, `HIGH_CAMP`, `SUMMIT_DAY`. |
| `minTurn` | `number` | Minimum turn number for trigger eligibility. |
| `minPersistenceTurns` | `number` | Minimum consecutive turns on the same behavior before firing. |

### `effects` block fields (at least one typically set)

| Field | Type | Constraint |
|---|---|---|
| `fatigueDelta` | `number` | Signed fatigue delta. Must not produce instant terminal outcomes. |
| `exposureDelta` | `number` | Signed exposure delta. Must not produce instant terminal outcomes. |
| `confidenceDelta` | `number` | Signed confidence delta. |

### `limits` block fields

| Field | Type | Description |
|---|---|---|
| `oncePerRun` | `boolean` | If `true`, fires at most once per run. |
| `cooldownTurns` | `number` | Turns before this event can fire again. |
| `maxPerRun` | `number` | Maximum number of times this event fires in a single run. |

### Common validation errors

- `characterEvents:$[i].id` expected string — `id` is missing.
- `characterEvents:$[i].limits` expected object — `limits` block missing or malformed.
- Event bypasses EP/BT pipeline — events must set only delta fields; never set an `outcome` field directly.

---

## `data/context_events.json`

Array of environmental/context events applied seed-deterministically during runs. These events adjust weather, visibility, and time penalty inputs **before** EP/BT resolution — they never override outcomes directly.

### Required fields per entry

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique event ID, conventionally `ctx-<slug>`. |
| `category` | `string` | Event category tag (e.g., `context`). |
| `trigger` | `object` | Turn numbers or conditions that activate the event. |
| `effects` | `object` | Weather/visibility/time deltas. |
| `limits` | `object` | Per-run cap (`maxPerRun`). |
| `telemetryTag` | `string` | Tag emitted in `run_log.json`. |
| `visibleToPlayer` | `boolean` | Whether the narrative is shown to the player. |
| `hiddenFromPlayer` | `boolean` | Whether hidden from run-log display. |
| `narrative` | `string` | Short event description for the player. |
| `notes` | `string` | Internal design note. |
| `label` | `string` | Short display label used in UI hints. |

### `trigger` block fields

| Field | Type | Description |
|---|---|---|
| `turns` | `number[]` | Turn numbers on which this event may fire. Seed offset can shift exact activation within the window. |

### `effects` block fields

| Field | Type | Description |
|---|---|---|
| `weatherDelta` | `number` | Signed weather intensity delta (`+1` = worse weather). |
| `visibilityDelta` | `number` | Signed visibility delta (negative = worse). |
| `timePenalty` | `number` | Extra time cost added to affected turns (minutes). |

### `limits` block fields

| Field | Type | Description |
|---|---|---|
| `maxPerRun` | `number` | Maximum activations per run (usually `1`). |

### Common validation errors

- `contextEvents:$[i].id` expected string — `id` missing.
- `contextEvents:$[i].label` expected string — `label` missing (required since v1.4.4).
- `contextEvents:$[i].trigger` expected object — `trigger` block missing.
- `contextEvents:$[i].effects` expected object — `effects` block missing.

---

## `data/nodes.json`

Array of 15 route nodes representing the Normal Route from Horcones to the summit.  
After loading, `normalizeRouteData()` in `ui/helpers/data-config.js` transforms `nodeId` -> `id` and `stageHint` -> `stage` for engine consumption.

### Fields per entry

| Field | Type | Required | Notes |
|---|---|---|---|
| `nodeId` | `string` | Yes | Unique node identifier. Becomes `id` after normalization. |
| `nodeName` | `string` | Yes | Human-readable node name. |
| `altitudeMeters` | `number` | Yes | Real altitude in meters. |
| `altitudeBand` | `number` | Yes | Integer altitude band (0–4). Controls EP scaling. |
| `terrainLoad` | `number` | Yes | Integer terrain load (1–4). Affects resource and fatigue costs. |
| `weatherBias` | `number` | Yes | Additive weather bias for this node (0–4). |
| `visibilityBias` | `number` | Yes | Additive visibility bias for this node (0–4). |
| `timeSensitivity` | `number` | Yes | Time-pressure multiplier for this node. |
| `isCamp` | `boolean` | Yes | Whether this node is a designated camp site. Affects sleep eligibility and bivouac penalty. |
| `stageHint` | `string` | Yes | Stage label before normalization. Accepted values: `APPROACH`, `HIGH_CAMP`, `SUMMIT_DAY`. Becomes `stage` after `normalizeRouteData()`. |
| `routeIndex` | `number` | Yes | Zero-based position along the route. Must be contiguous from `0` (Horcones) to `14` (Summit). |

### Normalization output fields (post-`normalizeRouteData()`)

| Field | Source |
|---|---|
| `id` | Renamed from `nodeId` |
| `stage` | Renamed from `stageHint` |
| All other fields | Copied unchanged |

### Common validation errors

- `nodes:$[i].nodeId` expected string — `nodeId` field missing.
- Missing `routeIndex` — causes `undefined` positions in the headless simulator; all 15 indices must be present and contiguous.
- `stageHint` outside accepted values — the engine reads only `APPROACH`, `HIGH_CAMP`, or `SUMMIT_DAY`; any other value silently falls through to the APPROACH modifier.

---

## `data/scenarios.web-v1.json`

Contains predefined scenarios and random-scenario archetype configuration.

### Predefined scenario fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique scenario identifier. |
| `num` | `string` | Two-digit display number. |
| `name` | `string` | Human-readable scenario name. |
| `desc` | `string` | Short description. |
| `intro` | `string` | Intro text shown at expedition start. |
| `max_turns` | `number` | Maximum turns for this scenario. |
| `seeds` | `number[]` | Array of 10 seed values for deterministic replay. |
| `difficulty` | `string` | Difficulty tier: `Low`, `Medium`, `Hard`. |
| `difficultyModifiers` | `object` | Engine modifier block (see below). |
| `initial` | `object` | Starting state snapshot. |

### Optional / internal fields

| Field | Type | Notes |
|---|---|---|
| `_designIntent` | `object` | Design annotations (not consumed by engine). Documents intended scenario behavior variations. Allowed keys: `weather_deterioration`, `terrain_growth`, `fatigue_growth`, `window_turns`, `post_window_deterioration`. These are data-dead fields preserved as design documentation for future implementation consideration. |

### Random scenario archetype `tweak` fields

| Field | Type | Notes |
|---|---|---|
| `_acclimatizationBonus` | `number` | Additive acclimatization bonus applied at run start via `startGame()`. Read in `screens.js` during game initialization. If present, combined with `difficultyModifiers.acclimatizationBonus`. |
| `_designIntent` | `object` | Same design-annotation contract as predefined scenarios. |

Note: `_equinoxTrapTurn` was removed in the current version (previously read but never consumed downstream).

### `difficultyModifiers` block

| Field | Type | Description |
|---|---|---|
| `pressureBias` | `number` | Additive EP bias. Positive = harder. |
| `stageWeatherBias` | `number` | Additive weather severity per stage. |
| `bodyToleranceBonus` | `number` | Additive BT bonus. Negative = harder. |
| `acclimatizationBonus` | `number` | Additive acclimatization at run start. |
| `fatigueMultiplier` | `number` | Multiplier on fatigue accumulation. `> 1` = harder. |
| `exposureMultiplier` | `number` | Multiplier on exposure accumulation. `> 1` = harder. |
| `resourceEfficiency` | `number` | Multiplier on resource burn. `< 1` = burns faster. |
| `permitDaysBonus` | `number` | Additive permit-day bonus. Negative = fewer days. |
| `initialCapacityBonus` | `number` | Additive starting capacity bonus. |
| `initialWaterBonus` | `number` | Additive starting water bonus. |
| `initialFoodBonus` | `number` | Additive starting food bonus. |
| `decisionWindowMsBonus` | `number` | Additive decision window bonus (ms). |

---

## Designing character events

This section provides guidelines for adding new character events to `data/character_events.json`.

### Event activation flow

1. Each turn, `maybeApplyCharacterEvent()` in `engine/events-core.js` evaluates all events for the active character.
2. An event fires when **all** trigger conditions match (action, stage, persistence, turn, body-state thresholds).
3. Cooldown and per-run caps are enforced via `G.characterEventState[event.id].uses` and `.lastUsedTurn`.

### Trigger condition reference

| Trigger field | Type | Description |
|---|---|---|
| `actions` | `string[]` | Required action(s) for activation (e.g., `["advance"]`, `["wait"]`). |
| `stages` | `string[]` | Required stage(s) (e.g., `["SUMMIT_DAY"]`). |
| `minTurn` | `number` | Minimum turn number. |
| `minPersistenceTurns` | `number` | Minimum consecutive turns with similar behavior. |
| `minWeatherSeverity` | `number` | Minimum weather severity threshold. |
| `maxFunctionalCapacity` | `number` | Maximum functional capacity (fires when body is weak). |
| `maxWater` | `number` | Maximum water level (fires under resource pressure). |

### Effect constraints

- Effects must only use signed deltas: `fatigueDelta`, `exposureDelta`, `confidenceDelta`.
- Absolute bounds: `|fatigueDelta| <= 3`, `|exposureDelta| <= 3`, `|confidenceDelta| <= 5`.
- Events **must never** set terminal outcomes directly.
- `conditions.mountainAuthority` must always be `"never_bypass_ep_bt"`.

### Cooldown / cap interaction

- `cooldownTurns`: Minimum turns between activations of the same event.
- `maxPerRun`: Hard cap on total activations per run.
- `oncePerRun: true`: Shorthand for `maxPerRun: 1`.
- When `maxPerRun` is reached, the event is permanently disabled for the rest of the run.
- Cooldown starts counting from the turn the event last fired.

### Category conventions

Categories group events by mechanical role:

| Category | Description |
|---|---|
| `onset_context` | Environmental/supply-driven onset events. |
| `pacing_hesitation` | Over-cautious pacing penalties. |
| `pressure_interpretation` | Perception/interpretation distortions. |
| `observation` | Observation-based signal boosts (at body cost). |
| `body_mind_drift` | Body/mind disconnection events. |
| `emotional_override` | Emotionally driven physical cost events. |
| `diagnostic_overcaution` | Over-analysis/over-waiting penalties. |
| `pattern_lock` | Prior-experience pattern-lock events. |
| `ego_override` | Ego-driven push penalties. |
| `physiological_limit` | Body-capacity limitation events. |
| `psychological_override` | Psychological-drive override events. |

### Telemetry

- Set `telemetryTag` to `char-<characterId>-<slug>` by convention.
- Character events are recorded in `G.characterEventHistory` (ID list) and exposed in `run_log.json` via the `characterEvent` field on each turn entry.

---

## Validation command

To verify all data files parse and satisfy shape contracts:

```bash
npm test
```

The parity test `prototype/web-v1/tests/parity/loader-ts-contract-parity.test.js` loads every data file through the canonical loader and asserts all contract invariants. Individual shape checks are in `prototype/web-v1/tests/smoke/model-ready.test.js`.

For a quick JSON parse check across the entire repository:

```bash
python3 - <<'PY'
import json, pathlib
for p in pathlib.Path('.').rglob('*.json'):
    json.loads(p.read_text(encoding='utf-8'))
print('all-json-ok')
PY
```
