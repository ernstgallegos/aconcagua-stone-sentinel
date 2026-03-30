# Context Events Guide (web-v1)

This document explains the canonical context/environment event contract used by `prototype/web-v1`.

## Source of truth

- Data contract: `data/context_events.json`
- Runtime normalizer + safeguards: `prototype/web-v1/engine/events-core.js`
- UI orchestration wrapper: `prototype/web-v1/ui/helpers/events.js`

## Contract shape

Each event entry must provide:

- `id`: stable unique identifier.
- `label`: player-facing short label (required).
- `trigger`: bounded trigger metadata used by the planner.
- `effects`: bounded effect payload (weather/visibility/time deltas).
- `limits`: cooldown/cap metadata.

The runtime clamps values and ignores malformed optional fields rather than granting event authority beyond configured boundaries.

## Design constraints

Context events are supportive pressure variation, not alternate outcome resolvers.

- Events may modify environment inputs.
- Events must not set terminal outcomes directly.
- Outcome authority remains in `resolveTurn(state, action)`.

## Validation

Use the standard readiness gates:

```bash
npm test
npm run typecheck
```

Relevant automated coverage includes:

- context-event schema/contract tests (`prototype/web-v1/tests/contracts/*.test.js`)
- boundedness tests (`prototype/web-v1/tests/unit/character-events-bounds.test.js` and engine suites)
