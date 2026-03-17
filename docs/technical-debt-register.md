# Technical Debt Register

This register tracks active technical debt that affects delivery risk, maintainability, and release predictability.

## Release PR policy

For every release PR:

1. Review each debt item below and update status/notes if scope, owner, or risk changed.
2. Reflect debt paydown or intentional debt extension in `CHANGELOG.md` under `[Unreleased]`.
3. If an item exits, record the closure date and link the resolving PR/commit in this file.

## Active debt items

| Debt item | Owner | Risk | Trigger symptoms | Measurable exit criterion |
|---|---|---|---|---|
| Single-file `web-v1` architecture (`prototype/web-v1/index.html` still mixes UI, flow wiring, and runtime orchestration) | Web-v1 maintainers | High: regression-prone edits, high merge conflicts, difficult targeted testing | Small feature changes require touching distant sections; unrelated UI/engine updates conflict; defect triage needs full-file context | Module extraction complete for screen rendering, flow controller, and runtime entrypoint; `index.html` reduced to shell + boot wiring only; smoke + unit tests cover module boundaries |
| Run-log compatibility aliases (legacy additive fields kept for historical consumers) | Simulation data contract owner | Medium: schema ambiguity and long-term maintenance overhead | Analytics readers consume both canonical and alias keys; new telemetry additions duplicate fields; consumers break when alias semantics drift | Alias deprecation date published; consumers migrated to canonical contract; contract tests enforce canonical-only output after deprecation window |
| Dual-prototype divergence (`prototype/web-v1` active vs `prototype/mra-v0` reference) | Architecture owner | High: behavior drift and contradictory documentation/contracts | Outcome/state semantics differ across prototypes; docs mention inconsistent authority; PRs change one prototype without cross-checking the other | Cross-prototype contract tests in place for shared outcomes/state semantics; ownership matrix documented and enforced; release checklist includes contract test pass gate |
| Tuning fragility hotspots (EP/BT multipliers, stage penalties, and resource economy thresholds) | Balance and systems design owner | High: accidental difficulty spikes, blocked summit paths, or trivialized routes | Win-rate swings after minor config edits; specific nodes/stages become mathematically dominant or impossible; Monte Carlo spread drifts outside target bands | Guardrail tests/assertions for EP root scales, burn-rate floors, and summit-route viability are automated; balance note targets updated with measured dispersion bands per character |

## Review cadence

- Minimum cadence: every release PR.
- Optional cadence: during any balancing or architecture refactor PR that touches debt-related files.
