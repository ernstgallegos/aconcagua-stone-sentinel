# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

SemVer versioning is enforced from `1.3.0` onward. Earlier milestones are documented retroactively from merged changes in the repository history.

## [Unreleased]

### Changed
- Root `AGENTS.md` was restructured in a convention-aligned format (scope, priority, and actionable repository instructions) while preserving existing documentation and changelog policies.

## [1.3.0] — 2026-03

### Added
- `devlog/005-prototype-architecture.md` as a formal decision record separating the frozen Python MRA (`prototype/mra-v0`) from the active web prototype (`prototype/web-v1`).
- `.env.example` documenting runtime environment variables for `api/run.js`.
- `docs/architecture.md` as the canonical architecture map for the active prototype.
- `data/characters.json` with three fully differentiated characters (`acclimatizationRate`, `resourceEfficiency`, `fatigueResistance`, `exposureResistance`, `confidenceStability`, `riskTolerance`, `perceptionBias`, `functionalCapacityBonus`).
- `data/outcomes.json` as canonical outcome taxonomy including `Rescue`.
- Character `difficultyLabel` rendered in the selection UI.
- Acclimatization-deficit penalties for HIGH_CAMP and SUMMIT_DAY in the web simulation engine.
- CI JSON validation coverage for `/data/*.json` and `/prototype/mra-v0/scenarios/*.json`.
- Informational Python linting step (ruff) in CI.

### Changed
- `README.md` and `prototype/mra-v0/README.md` to clearly separate canonical active prototype vs frozen reference artifact.
- `docs/simulation_engine.md` aligned to v1.3 behavior.
- Route model expanded to 15 named nodes in `data/nodes.json`.
- Balance tuned for a harsher summit profile through `data/environmental_pressure_config.json`, `data/stage_modifiers.json`, and `data/action_modifiers.json`.
- Scenario starting resources (water/food) reduced across base archetypes and scenarios.
- Character modifiers (`acclimatizationRate`, `resourceEfficiency`) applied directly in turn-state updates and resource consumption.
- `vercel.json` redirects changed to `308`.
- Root viewer styles (`styles.css`) aligned with web-v1 visual tokens.
- `package.json` version set to `1.3.0`.

### Fixed
- `prototype/mra-v0/simulator.py` now raises `ValueError` for invalid position updates (no silent fallback).
- Cautious-policy magic numbers replaced with named constants.
- API fallback allowlist path logs an explicit warning when `ALLOWED_ORIGINS` is not configured.

## [1.2.0] — 2026-02 (retroactive)

### Added
- Environmental Pressure / Body Tolerance / Pressure Delta turn pipeline in `prototype/web-v1/index.html`.
- `docs/simulation_engine.md` (initial engine spec publication for web prototype systemic rules).
- Data-driven simulation configuration in `/data` (`nodes`, pressure config, action modifiers, stage modifiers).
- Turn debrief export to `run_log.json` from the web prototype.

### Changed
- `prototype/web-v1/README.md` updated to describe runtime data sources and mechanics.
- Web-v1 contract tests expanded in `prototype/web-v1/tests/new-mechanics.test.js` for the new engine behavior.
- UX onboarding and control flow refined in the web prototype (begin flow, splash behavior, and instrumentation).

## [1.1.0] — 2026-01 (retroactive)

### Added
- Root `package.json` with Node 18+ test script (`npm test`).
- `requirements-dev.txt` for Python development/testing dependencies.
- Scenario JSON schema at `prototype/mra-v0/scenarios/scenario.schema.json`.
- Portable scenario validation script: `python3 prototype/mra-v0/validate_all_scenarios.py`.
- Additional bundled run artifacts (`late-push`, `weather-window`) and expanded Python test coverage.

### Changed
- `prototype/mra-v0/simulator.py` refactored (`apply_decision()` helper decomposition) without changing expected behavior.
- `prototype/mra-v0/run_all.py` now continues after per-run failures and exits non-zero when any run fails.
- JS tests migrated to Node built-in test runner.
- README and contributing docs aligned with deploy/runtime reality.
- CI pipeline improved with cache use and pinned actions.

### Security
- Unsafe `innerHTML` rendering removed from `app.js`.
- `api/run.js` hardened with strict CORS allowlist behavior, security headers, request size checks, and rate limiting.
