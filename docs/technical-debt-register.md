# Technical Debt Register

This register tracks active technical debt that affects delivery risk, maintainability, and release predictability.

## Release PR policy

For every release PR:

1. Review each debt item below and update status/notes if scope, owner, or risk changed.
2. Reflect debt paydown or intentional debt extension in `CHANGELOG.md` under `[Unreleased]`.
3. If an item exits, record the closure date and link the resolving PR/commit in this file.

## Active debt items

| Debt item | Owner | Risk | Target Version | Trigger symptoms | Measurable exit criterion |
|---|---|---|---|---|---|
| Telemetry centralization (per-turn telemetry object still assembled inline in multiple paths; no single structured emit contract) | Web-v1 maintainers | Medium: analytics readers depend on fragile field ordering; new telemetry additions risk omitting fields or duplicating keys | v1.5.0 | Adding new telemetry fields requires touching multiple files; `run_log.json` shape drifts between game-loop and debrief paths | Structured per-turn telemetry object defined as a typed contract; `game-loop.js` emits one canonical object per turn; `run-log.js` consumes it without field duplication; contract tests assert shape invariants |
| Nationality-flag rendering parity (emoji fallback differences across desktop/mobile OS/browser stacks) | Web-v1 UX maintainers | Medium: inconsistent character-card polish across platforms | TBD | Emoji glyph appears differently (or not at all) by font stack; desktop/mobile cards diverge in visual density | Replace emoji-only flags with explicit asset/text fallback contract (e.g., SVG or ISO code strategy) and lock with snapshot/contract tests across card render paths |
| Run-log compatibility aliases (legacy additive fields kept for historical consumers) | Simulation data contract owner | Medium: schema ambiguity and long-term maintenance overhead | v1.5.0 (documented alias removal target) | Analytics readers consume both canonical and alias keys; new telemetry additions duplicate fields; consumers break when alias semantics drift | Alias deprecation date published; consumers migrated to canonical contract; contract tests enforce canonical-only output after deprecation window |
| Dual-prototype divergence (`prototype/web-v1` active vs `prototype/mra-v0` reference) | Architecture owner | High: behavior drift and contradictory documentation/contracts | TBD | Outcome/state semantics differ across prototypes; docs mention inconsistent authority; PRs change one prototype without cross-checking the other | Cross-prototype contract tests in place for shared outcomes/state semantics; ownership matrix documented and enforced; release checklist includes contract test pass gate |
| Tuning fragility hotspots (EP/BT multipliers, stage penalties, and resource economy thresholds) | Balance and systems design owner | High: accidental difficulty spikes, blocked summit paths, or trivialized routes | TBD | Win-rate swings after minor config edits; specific nodes/stages become mathematically dominant or impossible; Monte Carlo spread drifts outside target bands | Guardrail tests/assertions for EP root scales, burn-rate floors, and summit-route viability are automated; balance note targets updated with measured dispersion bands per character |

## Resolved debt items

| Debt item | Resolution | Resolved in |
|---|---|---|
| Narrative bank i18n parity (NARRATIVES_ES coverage) | Verified key parity between `NARRATIVES` and `NARRATIVES_ES` in `ui/helpers/narrative.js` (26/26 keys, no EN-only gaps). Removed obsolete debt item to prevent false tracking noise. | v1.4.8 (Unreleased) |
| Residual UI coupling in `screens.js` (carousel/narrative logic co-located) | Extracted carousel rendering, card builders, dot navigation, and info-panel toggle to `ui/helpers/carousel.js`. Extracted narrative text banks and dispatch logic to `ui/helpers/narrative.js`. Both modules are independently testable with 20+ unit tests. `screens.js` now delegates rendering through thin wrappers. | v1.4.7 |
| `screens.js` orchestration breadth (screen renderers and orchestration co-located) | Complete renderer extraction into `ui/screens/*` modules (`title.js`, `game.js`, `debrief.js`, `part2.js`) and orchestration delegation into `ui/game-loop.js`, `ui/flow-controller.js`, and `ui/helpers/screen-utils.js`. `screens.js` now limited to orchestration/wiring and initialization. Smoke + unit boundary coverage green. | v1.4.6 |

## Review cadence

- Minimum cadence: every release PR.
- Optional cadence: during any balancing or architecture refactor PR that touches debt-related files.
