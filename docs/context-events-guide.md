# Context Events Guide (web-v1)

This document describes the canonical context/environment event contract for `prototype/web-v1`.

## Source of truth

- Data file: `data/context_events.json`
- Runtime normalization/guards: `prototype/web-v1/engine/events-core.js`
- Runtime orchestration bridge: `prototype/web-v1/ui/helpers/events.js`
- Turn resolver integration: `prototype/web-v1/engine/turn-resolution.js`

## Contract shape

Each event is expected to include:

- `id` (string)
- `label` (string)
- `category` (string)
- `trigger` (object)
- `effects` (object)

These fields are validated by `loadDataConfigFiles()` and related test contracts.

## Design constraints

Context events are intentionally bounded and **cannot** directly set terminal outcomes.
They may adjust existing systemic inputs such as weather severity, visibility, and time pressure.

This preserves canonical resolver authority:

`environment → EP → BT → pressure delta → perception → action modifier → outcome`.

## Practical authoring rules

1. Keep effects additive and bounded.
2. Prefer short-lived pressure on existing variables instead of introducing side-channel state.
3. Ensure labels are player-readable and diagnostics-friendly.
4. Validate changes with:
   - `npm test`
   - `npm run simulate` (regression signal, not absolute balance calibration)

## Regression checks

Relevant suites include:

- `prototype/web-v1/tests/engine/context-events.test.js`
- `prototype/web-v1/tests/contracts/data-contracts.test.js`
- `prototype/web-v1/tests/engine/resolve-turn-pipeline.test.js`
