# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

SemVer versioning is enforced from `1.3.0` onward. Earlier milestones are documented retroactively from merged changes in the repository history.

## [Unreleased]

### Added
- Added character-level decision-window profiles in `data/characters.json` (`engine.decisionWindow`) with stage modifiers for `APPROACH`, `HIGH_CAMP`, and `SUMMIT_DAY` to differentiate timing pressure behavior across roster archetypes.
- Added a contextual one-use `Focus pause` fallback in `prototype/web-v1/index.html` to provide a limited accessible grace margin during high-pressure turns.
- Added perception-latency profiles in `data/characters.json` (`engine.perceptionLatency`) to support delayed signal activation tuning per character, including specialized thresholds for `erik` and `irina`.

### Changed
- Updated `prototype/web-v1/index.html` turn input loop to track per-turn decision time, apply gradual over-window degradation (confidence/noise/action-cost drift), and avoid binary instant-failure penalties.
- Updated `prototype/web-v1/index.html` perception pipeline with stage/time/pressure-based late activation, fairness floors for early hints, progressive clarity ramping, watch uncertainty readability messaging, late-activation debrief notes, and `run_log.json` trace events (`lateSignalActivation`).
- Updated watch-panel UI in `prototype/web-v1/index.html` to render decision countdown/overage and partial-information microcopy aligned with existing diegetic uncertainty language.
- Expanded run logging in `prototype/web-v1/index.html` to persist decision timing telemetry (`decisionMs`, `decisionWindowExceeded`, `decisionWindowEffect`) per turn for debrief and export workflows.
- Updated `prototype/web-v1/README.md` to document the timed-degradation layer, character-stage timer config, and accessibility fallback behavior.


### Changed
- Expanded `AGENTS.md` into a living learning log with mandatory session-start read behavior and consolidated project/workflow learnings from v1.4 Phase 1 implementation.
- Root `AGENTS.md` was restructured in a convention-aligned format (scope, priority, and actionable repository instructions) while preserving existing documentation and changelog policies.
- Added a consolidated v1.4 design/planning documentation package (ES/EN) with game-structure, character, simulation-pipeline, and phase rollout references.
- Updated `README.md`, `README.es.md`, `docs/*`, and `meta/public-roadmap.md` to cross-reference the v1.4 documentation baseline and clarify planning-vs-implementation status.

### Added
- Added Daniela-only contextual action `shoot_photo` in `prototype/web-v1/index.html` and `data/action_modifiers.json`, including capped perception/confidence/trend benefits, finite resource/time cost, cooldown/session guards, and explicit run log instrumentation (`action: "shoot_photo"` with `photoEffectApplied`).

### Changed
- Updated turn resolution and game UI to render/resolve photo-based route-reading effects diegetically without exposing forbidden raw variables, while preserving canonical resolution order (Environment → EP → BT → pressureDelta → perception → action modifier → outcome).

## [1.4.0] — 2026-03

### Added
- Six fully differentiated characters replacing the previous three: Francisco Aguirre,
  Laura Kim, Erik Lundvall, Daniela De Rossi, Blake Harris, and Irina Orlova.
  Each has a complete biographical and mechanical profile in `data/characters.json`.
- `"Permit Expired"` outcome: 20-day park permit tracked via `G.permitDay` and
  `G.permitMaxDays`. Visualized as a persistent widget in the game panel.
- `screen-summit-success`: special screen shown exclusively on "Summit and Safe Return"
  outcome, explaining the simulation's scope and announcing Part 2.
- `screen-part2-character`: Part 2 character selection with 5 locked characters and
  Francisco Aguirre as the only active option.
- `difficultyLabel` rendered in character selection cards for all six characters.

### Changed
- Screen flow simplified: `screen-mode` removed. Flow is now
  splash → title → character → scenario → onboarding → game.
- `confirmCharacter()` now calls `buildScenarioGrid()` and navigates directly to scenario.
- Back button on scenario screen now returns to character selection.
- `endRun()` now branches to `screen-summit-success` on summit outcome instead of
  always showing the standard debrief.
- Debrief action buttons updated: "Change character" and "Same character, new scenario"
  replace the single "Choose scenario" button.
- Title screen eyebrow updated from "Prototype Web-v1.1" to "Prototype · v1.3".
- `package.json` version bumped to 1.4.0.

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
