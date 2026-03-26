# Repository Truth — Canonical Runtime and Documentation Contract

_Last updated: March 26, 2026._

## Active prototype
- **Canonical active prototype:** `prototype/web-v1`.
- **Canonical consequential turn authority:** `resolveTurn(state, action)` in `prototype/web-v1/engine/turn-resolution.js`.

## Frozen artifact
- **Frozen compatibility artifact:** `prototype/mra-v0` (no feature evolution; compatibility/test touch only).

## Public canonical version
- **Public canonical version after this sprint:** `v1.4.4`.
- Source-of-version truth: `package.json` + `package-lock.json`, mirrored in UI/docs/changelog.

## Roster truth
- **Part 1 (active):** 6 fully active characters in `data/characters.json` (Francisco, Laura, Irina, Erik, Daniela, Blake).
- **Part 2 (public):** preview bridge only with one playable public path (guided transfer), additional cards intentionally locked.

## Canonical outcomes
Canonical outcomes are defined by `data/outcomes.json` and enforced by the resolver pipeline:
- Summit and Safe Return
- High Point Return
- Strategic Retreat
- Rescue
- Collapse (Fatigue)
- Collapse (Exposure)
- Resource Exhaustion
- Expedition Window Closed
- Permit Expired
- Fatality

## Live vs deferred systems
### Live now
- EP/BT/delta canonical resolver pipeline.
- Seeded scenario system and dynamic weather/context events.
- Bounded character-event subsystem backed by `data/character_events.json`.
- Decision-window pressure and telemetry export (`run_log.json`).

### Deferred
- Full playable Part 2 expedition systems.
- Any non-canonical progression layer (XP/skill trees remain out-of-scope).

## Source-of-truth ownership map
- `data/*.json`: simulation tuning and bounded event contracts.
- `prototype/web-v1/engine/*`: canonical deterministic turn mechanics.
- `prototype/web-v1/ui/*`: rendering, input wiring, and non-authoritative presentation.
- `docs/repo-truth.md`: canonical repo status baseline; parity-tested.
- `CHANGELOG.md`: release and unreleased change ledger.

## Canonical turn authority statement
No UI path, helper, or event layer may directly assign terminal outcomes or bypass EP/BT/delta flow. All consequential outcomes must emerge through `resolveTurn(state, action)`.
