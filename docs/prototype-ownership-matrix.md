# Prototype ownership matrix

## Scope

This matrix prevents drift between the active web prototype and the frozen legacy simulator.

## Ownership and authority

| Surface | Status | Purpose | Change policy | Required contract gate |
|---|---|---|---|---|
| `prototype/web-v1` | Active canonical gameplay authority | Public playable experience and deterministic resolver authority (`resolveTurn`) | Feature development allowed; must preserve canonical outcomes and contracts | `npm run test:contracts` and `npm test` must pass |
| `prototype/mra-v0` | Frozen compatibility artifact | Historical simulator baseline for regression reference and schema contract checks | No new mechanics; compatibility/test-only updates | `pytest prototype/mra-v0/test_simulator.py -v` must pass |
| `data/contracts/model-contract.json` | Cross-surface canonical bridge | Declares shared metrics, intentional divergences, and taxonomy contracts | Update in same commit as any cross-surface semantic change | `prototype/web-v1/tests/model-contract.test.js` + parity suite |

## Enforcement rules

1. Any PR touching shared outcome/state semantics must update `data/contracts/model-contract.json` first.
2. Any PR changing one prototype but not the other must document why that is valid under `intentionalDivergences`.
3. Release-readiness checks must include explicit evidence of:
   - `npm run test:contracts`
   - `pytest prototype/mra-v0/test_simulator.py -v`
