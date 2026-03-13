# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

SemVer versioning will be enforced starting with the first tagged release. Until then, changes are tracked under `[Unreleased]`.

## [Unreleased]

## [1.3.0] — 2026-03

### Added
- `devlog/005-prototype-architecture.md`: formal decision record explaining the relationship
  between the Python MRA v0 (frozen reference artifact) and web-v1 (active prototype).
- `.env.example`: documents all runtime environment variables for `api/run.js`.
- `docs/architecture.md`: canonical engine flow and data source map for v1.3.
- `data/characters.json`: three characters with full engine-level differentiation
  (`acclimatizationRate`, `resourceEfficiency`, `fatigueResistance`, `exposureResistance`,
  `confidenceStability`, `riskTolerance`, `perceptionBias`, `functionalCapacityBonus`).
- `data/outcomes.json`: canonical outcome taxonomy including `Rescue`.
- `difficultyLabel` field per character rendered in character selection screen.
- Acclimatization deficit penalty system in `resolveTurn()` for HIGH_CAMP and SUMMIT_DAY.
- JSON validation job in CI for all `/data/*.json` and `/mra-v0/scenarios/*.json` files.
- Python lint step (ruff, informative / non-blocking) in CI.
- Named constants for cautious policy thresholds (`CAUTIOUS_MIN_CAPACITY`, `CAUTIOUS_MAX_FATIGUE`, etc.).
- Docstrings for all four internal helpers in `apply_decision()`.

### Changed
- `prototype/mra-v0/README.md`: FROZEN status banner inserted at the top.
- `README.md`: Project Status section updated to distinguish active vs frozen prototypes;
  web-v1 no longer described as "legacy/experimental".
- `docs/simulation_engine.md`: version header updated from v1.1 to v1.3.
- Route expanded from 13 to 15 named nodes (`Cambio de Pendiente`, `El Balcón Amarillo`,
  `La Travesía` added to `data/nodes.json`).
- `data/environmental_pressure_config.json`: EP values increased for 30% win rate target
  (altitudePressureByBand[4] 85→100; weatherSeverityScale[3] 45→52; baseCosts.fatigue 8→10;
  SUMMIT_DAY resource burn rates increased; bivouac penalties +25%; summit window tightened).
- `data/stage_modifiers.json`: HIGH_CAMP and SUMMIT_DAY multipliers increased.
- `data/action_modifiers.json`: advance costs increased; sleep recovery reduced.
- Scenario starting resources (water/food) reduced across all archetypes and base scenarios.
- `acclimatizationRate` and `resourceEfficiency` character mods now applied in `updateState()`
  and `spendResourcesForMinutes()`.
- `vercel.json`: redirects changed from 302 to 308 (permanent).
- `styles.css` (root viewer): unified with web-v1 visual token system (IBM Plex Mono).
- `api/run.js`: hardcoded ALLOWED_ORIGINS fallback now logs a warning.
- `package.json`: version bumped to 1.3.0.

### Fixed
- `update_position()` in `simulator.py`: silent fallback on invalid position replaced with
  explicit `ValueError`.
- Cautious policy magic numbers replaced with named constants.


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
