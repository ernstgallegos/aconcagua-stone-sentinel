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
| `screens.js` orchestration breadth (screen renderers and orchestration still partially co-located) | Web-v1 maintainers | High: regression-prone edits, high merge conflicts, difficult targeted testing | TBD | Small feature changes still require touching long `screens.js` sections; renderer updates are not fully isolated by screen concern | Complete renderer extraction into `ui/screens/*` modules (title/game/debrief/part2) with `screens.js` limited to orchestration/wiring; keep smoke + unit boundary coverage green |
| Nationality-flag rendering parity (emoji fallback differences across desktop/mobile OS/browser stacks) | Web-v1 UX maintainers | Medium: inconsistent character-card polish across platforms | TBD | Emoji glyph appears differently (or not at all) by font stack; desktop/mobile cards diverge in visual density | Replace emoji-only flags with explicit asset/text fallback contract (e.g., SVG or ISO code strategy) and lock with snapshot/contract tests across card render paths |
| Run-log compatibility aliases (legacy additive fields kept for historical consumers) | Simulation data contract owner | Medium: schema ambiguity and long-term maintenance overhead | v1.5.0 (documented alias removal target) | Analytics readers consume both canonical and alias keys; new telemetry additions duplicate fields; consumers break when alias semantics drift | Alias deprecation date published; consumers migrated to canonical contract; contract tests enforce canonical-only output after deprecation window |
| Dual-prototype divergence (`prototype/web-v1` active vs `prototype/mra-v0` reference) | Architecture owner | High: behavior drift and contradictory documentation/contracts | TBD | Outcome/state semantics differ across prototypes; docs mention inconsistent authority; PRs change one prototype without cross-checking the other | Cross-prototype contract tests in place for shared outcomes/state semantics; ownership matrix documented and enforced; release checklist includes contract test pass gate |
| Tuning fragility hotspots (EP/BT multipliers, stage penalties, and resource economy thresholds) | Balance and systems design owner | High: accidental difficulty spikes, blocked summit paths, or trivialized routes | TBD | Win-rate swings after minor config edits; specific nodes/stages become mathematically dominant or impossible; Monte Carlo spread drifts outside target bands | Guardrail tests/assertions for EP root scales, burn-rate floors, and summit-route viability are automated; balance note targets updated with measured dispersion bands per character |

## Review cadence

- Minimum cadence: every release PR.
- Optional cadence: during any balancing or architecture refactor PR that touches debt-related files.
