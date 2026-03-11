# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

SemVer versioning will be enforced starting with the first tagged release. Until then, changes are tracked under `[Unreleased]`.

## [Unreleased]

### Changed
- Prototype Web upgraded to **v1.3** canonical engine contract with single-turn authority in `resolveTurn(state, action)`.
- Route progression migrated to canonical 15-node sequence from `data/nodes.json` (including `Cambio de Pendiente (5300m)`, `El Balcón Amarillo (5800m)`, `La Travesía`).
- Outcomes unified to canonical public set and `Rescue` implemented as real systemic outcome.
- Character system moved to structured data (`data/characters.json`) with engine-level influence on BT/perception and resource/fatigue dynamics.
- Run log schema expanded with stage, node, day/time, character, and trend estimate.

### Added
- `docs/architecture.md` with active vs frozen prototype boundaries and v1.3 flow.
- `data/outcomes.json` and `data/characters.json` as new canonical sources.


### Added
- Prototype Web v1.1 Environmental Pressure Engine documentation at `docs/simulation_engine.md`.
- Data-driven web-v1 simulation configs in `/data` (`nodes`, environmental pressure, action modifiers, and stage modifiers).
- Root `package.json` with Node 18+ test script.
- `requirements-dev.txt` for Python development dependencies.
- Scenario JSON schema at `prototype/mra-v0/scenarios/scenario.schema.json`.
- New bundled run artifacts for `late-push` and `weather-window`.
- Expanded Python unit coverage for output contracts, outcome branches, observed signals, schema errors, and smoke tests.
- Portable scenario validation script: `python3 prototype/mra-v0/validate_all_scenarios.py`.

### Changed
- `prototype/web-v1/index.html` now computes Environmental Pressure / Body Tolerance and exports turn logs as `run_log.json` from debrief.
- `prototype/web-v1/README.md` updated to reflect v1.1 systemic model and runtime data sources.
- Refactored simulator `apply_decision()` into smaller helper functions while preserving behavior.
- `cautious` policy early-advance threshold now scales with scenario `max_turns`.
- `run_all.py` now continues on per-run failures and exits non-zero if any run failed.
- JS contract tests migrated to Node's built-in `node:test` runner.
- README (EN/ES) clarified root viewer vs prototype web-v1 routes and Vercel redirect behavior.
- CI workflow now uses dependency caches and pinned action versions.

### Security
- Removed unsafe `innerHTML` rendering paths in root viewer `app.js`.
- Hardened `api/run.js` with CORS allowlist, `nosniff`, CSP, request rate limiting, and query length validation.
