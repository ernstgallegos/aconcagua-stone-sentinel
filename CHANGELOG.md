# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

SemVer versioning is enforced from `1.3.0` onward. Earlier milestones are documented retroactively from merged changes in the repository history.

## [Unreleased]

### Added
- Added a title-screen difficulty selector with five tiers (Very Easy to Very Hard) for `prototype/web-v1`, plus a full onboarding tutorial/FAQ modal before the expedition begins.

### Changed
- Adjusted `prototype/web-v1` gameplay tuning so difficulty now changes environmental pressure, stage weather bias, body tolerance, initial resources/capacity, permit margin, and decision-window generosity.
- Updated web-v1 smoke/integration coverage and public readmes to reflect the new title difficulty step and pre-expedition tutorial flow.

### Changed
- Clarified the web-v1 descend action copy so onboarding and the in-run Horcones button explain that descending again from Horcones exits the park and ends the expedition.
- Updated the Playwright smoke-test workflow guidance so local contributors get an explicit bootstrap path, while missing Playwright dependencies now produce a skip with actionable setup instructions instead of an import failure.

### Fixed
- Added regression coverage for Daniela-only `Shoot Photo` access in both browser smoke validation and web-v1 contract tests, protecting the UI visibility and keyboard shortcut guard against future regressions.

### Fixed
- Corrected `prototype/web-v1` park-exit resolution so returning to `horcones` no longer auto-ends the run, `wait` on approach sectors cannot advance the player, and descending from `horcones` now closes the expedition as an explicit park exit.
- Added targeted `web-v1` regression coverage for approach wait movement, early retreat-to-Horcones continuity, and Horcones exit handling.

### Changed
- Removed Brazilian Portuguese from the `prototype/web-v1` runtime language selector and language validation, leaving only English (`en`) and Spanish (`es`) as supported UI locales.

### Fixed
- Fixed missing `collapse` and `survival` fields in `data/action_modifiers.json`.
  The new probabilistic `evaluateOutcome` in `prototype/web-v1/engine/turn-resolution.js`
  uses these fields to compute `collapseChance` and `survivalChance`. Without them,
  both evaluate to `NaN`, causing `r < NaN` and `r > NaN` to always be `false` —
  making collapse and retreat outcomes impossible. Result was 100% Rescue/Fatality
  across all characters and scenarios. Added calibrated values targeting ~30%
  Summit and Safe Return rate.
- Fixed `descend` direction in `evaluateOutcome` (`prototype/web-v1/engine/turn-resolution.js`):
  the `step` calculation used a fixed `+1 / −1` sign regardless of `actionMod.progress`.
  For `descend` (progress = −20), `'Advance'` was moving the player **up** the route.
  Added `directionMultiplier` that flips step sign when `actionMod.progress < 0`.
- Fixed `functional_capacity` drain rate in `updateState`
  (`prototype/web-v1/engine/turn-resolution.js`): the formula
  `capacityDelta − pressureDelta × 0.18` had no upper bound on `pressureDelta`.
  With δ=130 (night EP), fc drained 23.4/turn causing Fatality in 3–5 turns.
  Replaced with `pressureFactor × 2` (clamped 0.5–2.5), matching the pre-refactor
  cap of 1–5 fc/turn.
- Expanded Spanish localization coverage in `prototype/web-v1/ui/screens.js` by translating remaining runtime strings (sleep/tooltips, ambient/tutor cues, debrief turning-point and cause messaging, reflection prompts, and narrative text selection) so Spanish sessions no longer surface mixed English copy in core gameplay/debrief flows.
- Fixed startup interactivity regressions in `prototype/web-v1/ui/screens.js` by escaping the English title-tagline apostrophes (preventing module parse failure) and restoring the `window.setVisualMode` facade required by the title-screen inline visual-mode selector.

### Added
- Added multilingual runtime support in `prototype/web-v1` with a persistent language selector (`en`, `es`) and UI translation wiring for core navigation, decision controls, random cards, and journal prompts.
- Added a `Random Character` card in `prototype/web-v1` character selection so players can start a run with one of the six eligible profiles chosen automatically on confirm.
- Added `data/scenarios.web-v1.json` as the canonical web-v1 scenario catalog, including predefined scenarios and random-archetype generation ranges/configuration used by runtime scenario selection.
- Added `docs/technical-debt-register.md` with active debt ownership, risk, trigger symptoms, measurable exit criteria, and mandatory release-PR review guidance for architecture, data-contract, prototype-divergence, and balance-fragility hotspots.
- Added `prototype/web-v1/engine/turn-rules.js` with importable deterministic rule helpers for terminal outcome ordering, decision-window degradation caps, and resource-burn rounding floors.
- Added `prototype/web-v1/tests/turn-behavior.test.js` with fixture-based deterministic behavioral tests for `resolveTurn`, `evaluateOutcome`, and `updateState` using controlled RNG.
- Added `scripts/check-lock-version.js` and `npm run check:lock-version` to fail when `package.json.version` diverges from the lockfile root package version (`package-lock.json` → `packages[""].version`).
- Added a CI guard step in `.github/workflows/ci.yml` to execute `npm run check:lock-version` during the Node test job.
- Added version-bump and lockfile synchronization guidance to `CONTRIBUTING.md`, including regeneration and validation commands.
- Added `docs/model-contract.md` and `data/contracts/model-contract.json` to formalize cross-surface canonical concepts (outcomes, shared state metrics, turn semantics), authority ownership (`web-v1` active vs `mra-v0` historical), and intentional divergences.
- Added `prototype/web-v1/tests/model-contract.test.js` and expanded `npm test` coverage to enforce contract overlap checks between `prototype/web-v1` and `prototype/mra-v0`.

- Added `prototype/web-v1/tests/test_smoke_flow.py` as a headless browser smoke test that validates canonical screen wiring (`splash → title → character → scenario → onboarding → game`) and Part 2 unlock gating from `Summit and Safe Return`.

### Fixed
- Fixed `prototype/web-v1/ui/screens.js` data bootstrapping to treat `data/environmental_pressure_config.json` as required, preventing silent startup with an incomplete pressure model that later crashed turn resolution.
- Fixed `prototype/web-v1/ui/screens.js` environmental-pressure calculations to use null-safe scale fallbacks (`altitudePressureByBand`, `terrainLoadScale`, `weatherSeverityScale`, `visibilityRiskScale`, `timeOfDayRiskScale`, `exposurePersistenceScale`) so partial/malformed config payloads no longer throw runtime type errors.
- Fixed critical web-v1 runtime blockers in `prototype/web-v1/ui/screens.js` by restoring a module-local `TUNING` fallback, persisting `G.finalOutcome`/`G.hasSummited` from resolved turn outcomes, wiring `acclimatizationGain` into turn execution, and persisting rolling `pressureHistory` samples for non-steady trend estimation.
- Fixed narrative/UI consistency in `prototype/web-v1/ui/screens.js` and `prototype/web-v1/index.html` by correcting high-altitude `wait` narrative gating, replacing unreachable trend key `improving` with `easing`, removing dead `valentina`/`diego` branches, fixing `makeDots()` off-by-one rendering, adding `shoot_photo` debrief labels, and updating title eyebrow version text to `Prototype · v1.4`.
- Fixed terminal outcome guard ordering in `prototype/web-v1/engine/turn-resolution.js` so `High Point Return` cannot overwrite `Summit and Safe Return` after canonical terminal derivation.
- Fixed `prototype/web-v1` character-selection progression by restoring required global button handlers (`confirmCharacter`, `confirmScenario`, `startGame`, etc.) for inline `onclick` wiring, unblocking the "This is my expedition." CTA.
- Fixed `prototype/web-v1/ui/screens.js` action resolution to always return numeric `fatigueDelta`/`exposureDelta`/`capacityDelta` defaults from `getActionModifier()`, preventing `NaN` body-state propagation that blocked effective movement decisions at expedition start.
- Fixed `prototype/web-v1/ui/screens.js` decision logging to use `turnResult.resolvedAction`, restoring consistent action-state synchronization for inline controls and keyboard command routing during active runs.

### Changed
- Rebuilt the main `prototype/web-v1/index.html` gameplay interface with a new command-deck layout (route/log expedition column + telemetry/context/decision command column) while preserving canonical IDs, action controls, permit/watch/context systems, and turn-resolution wiring.
- Updated `data/characters.json` with canonical v1.4 engine values for Francisco, Laura, Erik, Daniela, Blake, and Irina (`perceptionBias`, `riskTolerance`, and related balancing fields) to realign roster identity and expected win-rate dispersion.
- Updated `.github/workflows/ci.yml` JSON validation coverage to include `data/scenarios.web-v1.json`.
- Updated `package.json` with `"type": "module"` to remove Node typeless-module warnings during test runs.
- Reworked `prototype/web-v1/index.html` gameplay-screen layout to use viewport-locked grid zones with internal panel scrolling and compact responsive breakpoints, preventing page-level scroll on desktop and mobile while preserving access to decisions and status widgets.
- Updated `prototype/web-v1/ui/screens.js` scenario selection so predefined cards no longer expose per-seed buttons; selecting a scenario now assigns one configured seed at random and keeps that seed hidden from the selection UI.
- Expanded predefined seed pools in `data/scenarios.web-v1.json` to at least 10 seeds per scenario so random assignment has meaningful run variety.
- Updated `prototype/web-v1/ui/screens.js` to load scenarios from `data/scenarios.web-v1.json`, replacing in-file `SCENARIOS` and random-archetype constants with data-driven configuration accessors.
- Updated `docs/model-contract.md` with explicit web-v1 scenario authority boundaries between data ownership (`data/scenarios.web-v1.json`) and runtime enforcement (`loadDataConfig()` in `screens.js`).
- Revised `meta/public-roadmap.md` to align current-stage messaging with the already integrated `prototype/web-v1` behavior, map each stage to objective repository evidence (modules/features/tests), and explicitly separate design-lock completion from implementation completion with a compact v1.4 status matrix linked to the implementation-plan real-progress snapshot.
- Updated canonical-status documentation across `docs/architecture.md`, `docs/simulation_engine.md`, `prototype/web-v1/README.md`, and `README.md` to reflect the v1.4 public in-progress state with explicit links to `CHANGELOG.md` `[Unreleased]` and implementation-plan snapshots.
- Clarified public/private code visibility scope across `README.md`, `README.es.md`, `prototype/web-v1/README.md`, and `meta/public-roadmap.md`: public prototype code is available in-repo, while production/commercial branch scope remains private.
- Added a documentation consistency checklist to `CONTRIBUTING.md` to prevent version-title drift between core docs and implementation reality.
- Updated `.github/workflows/ci.yml` to run the new Playwright smoke test on pull requests, including browser provisioning before executing `pytest prototype/web-v1/tests/test_smoke_flow.py -v`.
- Updated `requirements-dev.txt` and `CONTRIBUTING.md` to pin Playwright (`playwright==1.53.0`) and document the local smoke-test command path used by CI.
- Updated `prototype/web-v1/ui/screens.js` and `prototype/web-v1/engine/turn-resolution.js` to consume shared turn-rule helpers and delegate terminal-outcome precedence checks through an injectable `deriveTerminalOutcome` hook.
- Reduced `prototype/web-v1/tests/new-mechanics.test.js` string-contract coverage to critical integration hooks while shifting primary confidence to behavioral engine assertions.
- Pinned Python lint tooling in `requirements-dev.txt` by adding `ruff==0.4.10` so local and CI lint runs use the same versioned dependency.
- Updated `.github/workflows/ci.yml` to remove ad hoc lint installation and run `ruff` as a blocking gate (`E/F/W`, `E501` ignored) in the Python job for `main` and pull requests targeting `main`.
- Updated `CONTRIBUTING.md` with the CI lint gate policy and local lint command to match enforced CI behavior.
- Migrated `prototype/web-v1/index.html` to a lightweight ES-module shell that now loads `prototype/web-v1/ui/screens.js` and keeps temporary global facades (`window.makeDecision`, `window.showScreen`, and run controls) for backward-compatible button/test integration during refactor.
- Split gameplay code into modules: turn engine logic (`resolveTurn`, `evaluateOutcome`, `updateState`, RNG/clamp helpers) now lives in `prototype/web-v1/engine/turn-resolution.js`, and canonical game-state initialization now lives in `prototype/web-v1/state/game-state.js`.
- Refactored web-v1 runtime state into explicit slices (`runState`, `uiState`, `telemetryState`) in `prototype/web-v1/state/game-state.js`, added guarded helper APIs (`updateRunState`, `updateUIState`, `recordTelemetry`), and wired hot mutation paths (`showScreen`, `startGame`, `resolveTurn`, `endRun`) through these helpers with boundary assertions (`before resolveTurn`, `after updateState`) to catch state-shape drift early.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` to validate module-based loading and relocated engine/state contracts.

### Fixed
- Hardened `loadDataConfig()` validation in `prototype/web-v1/ui/screens.js` with required-file checks and runtime schema/contract assertions for `scenarios.web-v1.json` (predefined seeds and random archetype presence), failing fast via fatal screen on violations.
- Updated `prototype/web-v1/tests/model-contract.test.js` to read web initial-state overlap keys from `data/scenarios.web-v1.json` instead of parsing inline scenario literals from UI source.
- Annotated `prototype/mra-v0/test_simulator.py` import bootstrap with `# noqa: E402` so the new blocking `ruff` gate accepts the intentional `sys.path` setup used by simulator tests.
- Hardened `loadDataConfig()` in `prototype/web-v1/ui/screens.js` by treating `nodes`, `actionModifiers`, `stageModifiers`, `characters`, and `outcomes` as required assets with runtime schema checks. Any load/parse/schema failure now raises a blocking fatal screen in `prototype/web-v1/index.html`, includes filename + key-path diagnostics, and keeps `G.modelReady = false` to prevent game start with empty defaults.

- Structural balance bug: `altitudePressureByBand` and `terrainLoadScale` values in
  `data/environmental_pressure_config.json` made the upper mountain (band 3+) mathematically
  impassable. EP floor at band 3–4 nodes (159–215) permanently exceeded maximum achievable
  BT (90), producing 0% summit rate in Monte Carlo simulation of 36,000 runs. Fixed by
  reducing altitude and terrain pressure scales by ~50–70% at higher bands, reducing
  `timeOfDayRiskScale` and `exposurePersistenceScale` values, and adjusting `timeSensitivity`
  and `terrainLoad` for the four summit-day nodes in `data/nodes.json`.

- Fixed `Math.max(1, ...)` floor in `spendResourcesForMinutes` (`prototype/web-v1/index.html`):
  minimum water/food cost per action was clamped to 1 unit regardless of actual burn
  calculation. With calibrated burn rates and 45+ actions per expedition, this made
  the round trip consume 45+ water units against a 22–26 unit starting pool, making
  summit completion impossible through resource exhaustion. Changed to `Math.max(0, ...)`.
- Fixed `summitLateStart` in `data/environmental_pressure_config.json`: value of 750
  (12:30pm) caused the engine to force descent at La Canaleta (arrival ~14:15) even
  with one node remaining to summit. Updated to 960 (4pm), matching the actual 11-hour
  summit-day window from a 6am departure.
- Updated `resourceBurnPerHour` in `data/environmental_pressure_config.json` to
  calibrated values that make a full expedition viable within scenario starting
  resources (APPROACH: 0.14/0.10, HIGH_CAMP: 0.22/0.16, SUMMIT_DAY: 0.34/0.24).

- Fixed outcome classification order in `prototype/web-v1/index.html`: `Summit and
  Safe Return` was evaluated after `Expedition Window Closed`, causing players who
  returned to Horcones on the final turn to receive the wrong outcome. Swapped the
  two `else if` branches so summit completion takes priority.
- Fixed descent body-state accumulation in `data/action_modifiers.json`: `descend`
  now carries `fatigueRecovery: 1` and `exposureRecovery: 1`, activating the
  existing sign-flip logic in `evaluateOutcome()`. Descending now recovers fatigue
  and exposure instead of compounding them through stage multipliers. Added
  `pressureDeltaCap: 30` to prevent night-descent `pressureFactor` from reaching
  maximum (2.5), which was draining `functional_capacity` to fatal levels over 14
  descent turns. Implemented cap in `evaluateOutcome()` via a one-line guard.
- Fixed `max_turns` across all five predefined scenarios and the random scenario
  generator in `prototype/web-v1/index.html`. Previous values (30–34) were below
  the minimum of 35 turns required for ascent + descent with one recovery sleep.
  Updated to 46–50 for predefined scenarios and 46–54 for random mode.

### Added
- Added a Phase 2 real-progress snapshot section in `docs/en/implementation-plan-v1.4.md` and `docs/es/plan-implementacion-v1.4.md` to track implemented vs pending scope item-by-item.
- Added `docs/es/guia-observacion-playtest.md` with a short field checklist for recurrent errors, confusion signals, and abandonment points in qualitative playtests.
- Added an in-debrief new-player comprehension checklist and confusion-notes textarea in `prototype/web-v1/index.html` to capture what users understood (decision goal, loss cause, and improvement path) and to drive microcopy iteration from observed confusion.
- Added character-level decision-window profiles in `data/characters.json` (`engine.decisionWindow`) with stage modifiers for `APPROACH`, `HIGH_CAMP`, and `SUMMIT_DAY` to differentiate timing pressure behavior across roster archetypes.
- Added a contextual one-use `Focus pause` fallback in `prototype/web-v1/index.html` to provide a limited accessible grace margin during high-pressure turns.
- Added perception-latency profiles in `data/characters.json` (`engine.perceptionLatency`) to support delayed signal activation tuning per character, including specialized thresholds for `erik` and `irina`.

### Changed
- Standardized `prototype/web-v1/index.html` `run_log.json` export payload with stable cross-run comparison aliases (`epScore`, `btScore`) while preserving legacy fields (`EP`, `BT`) for backwards compatibility.
- Updated `prototype/web-v1/index.html` with layered onboarding cues in the context widget (`essentials` early, `contextual` after early turns or critical risk), capped simultaneous secondary alerts, and enforced a single prioritized primary alert per turn to reduce alert fatigue.
- Expanded `prototype/web-v1/index.html` run-log export rows with `characterId`, `stage`, `decisionWindowExceeded`, `lateSignalTriggered`, and `specialActionUsed` to improve QA and balance instrumentation.
- Added per-run critical-event summary metadata (`runSummary`) to exported `run_log.json` in `prototype/web-v1/index.html` for faster QA/balance triage without removing existing per-turn records.
- Rebalanced expedition pacing and risk envelope across `data/action_modifiers.json`, `data/stage_modifiers.json`, and `data/environmental_pressure_config.json` to reduce collapse-only trajectories and recover strategic-retreat / permit-pressure space in canonical scenario batteries.
- Recalibrated character profiles in `data/characters.json` by prioritizing perception/risk/timing knobs (not opaque power buffs), reducing dominance risk (Laura/Irina) and improving viability for high-variance profiles (Erik/Daniela/Blake).
- Added `docs/balance-calibration-notes.md` with per-character target metric bands and post-tuning dispersion results from canonical scenario stress runs for balance traceability.
- Reworked right-panel hierarchy in `prototype/web-v1/index.html` by stacking watch, permit, and a new contextual status widget to improve at-a-glance risk scanning during turns.
- Updated critical-action microcopy in `prototype/web-v1/index.html` to describe immediate cost/benefit tradeoffs directly in action buttons without extending onboarding flow.
- Added staged risk indicators (`warning`/`critical`) in `prototype/web-v1/index.html` contextual chips using engine-aligned thresholds for body state, resources, permit days, and decision window pressure.
- Reinforced debrief output in `prototype/web-v1/index.html` with a primary actionable cause line paired with the existing turning-point section.
- Tuned readability in `prototype/web-v1/index.html` for `dark`, `light`, and `sunset` themes on secondary microcopy and contextual labels.
- Updated `prototype/web-v1/README.md` and root `README*.md` references to document contextual risk reading and playtest observation support.
- Extended `prototype/web-v1/index.html` Part 2 bridge into a navigable transition sequence (`part2-hotel` → `part2-intro` → `part2-guides` → `part2-transfer` → `part2-closure`) with connected back/forward controls and explicit safe exits to debrief/title.
- Replaced `confirmPart2Character()` placeholder alert in `prototype/web-v1/index.html` with real progression to the Part 2 narrative flow, guarded so unlock remains exclusive to `G.finalOutcome === "Summit and Safe Return"`.
- Updated Part 2 transition copy in `prototype/web-v1/index.html` to match v1.4 EN/ES design references (hotel, presentation, guides, transfer, closure).
- Updated `prototype/web-v1/index.html` turn input loop to track per-turn decision time, apply gradual over-window degradation (confidence/noise/action-cost drift), and avoid binary instant-failure penalties.
- Updated `prototype/web-v1/index.html` perception pipeline with stage/time/pressure-based late activation, fairness floors for early hints, progressive clarity ramping, watch uncertainty readability messaging, late-activation debrief notes, and `run_log.json` trace events (`lateSignalActivation`).
- Updated watch-panel UI in `prototype/web-v1/index.html` to render decision countdown/overage and partial-information microcopy aligned with existing diegetic uncertainty language.
- Expanded run logging in `prototype/web-v1/index.html` to persist decision timing telemetry (`decisionMs`, `decisionWindowExceeded`, `decisionWindowEffect`) per turn for debrief and export workflows.
- Updated `prototype/web-v1/README.md` to document the timed-degradation layer, character-stage timer config, and accessibility fallback behavior.
- Added per-character perception guardrails in `data/characters.json` (`engine.perceptionGuardrails`) to enforce minimum useful signal readability and cap timing/perception penalty accumulation.
- Added SUMMIT_DAY difficulty regression guardrails in `prototype/web-v1/index.html` to cap acclimatization/timing penalty spikes and flag guarded turns (`summit-difficulty-guard`) for telemetry.
- Updated `prototype/web-v1/index.html` debrief cause messaging with systemic-vs-decision attribution so players can distinguish model pressure from execution errors.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` with regression checks for guardrail fields and SUMMIT_DAY difficulty caps.
- Updated `prototype/web-v1/tests/new-mechanics.test.js` to assert the new `effectiveDelta`/`pressureDeltaCap` path in `evaluateOutcome()` while preserving pressure-factor pipeline coverage.
- Updated `docs/balance-calibration-notes.md` with explicit rollback criteria when any character drifts outside accepted outcome bands.


### Changed
- Expanded `AGENTS.md` into a living learning log with mandatory session-start read behavior and consolidated project/workflow learnings from v1.4 Phase 1 implementation.
- Root `AGENTS.md` was restructured in a convention-aligned format (scope, priority, and actionable repository instructions) while preserving existing documentation and changelog policies.
- Added a consolidated v1.4 design/planning documentation package (ES/EN) with game-structure, character, simulation-pipeline, and phase rollout references.
- Updated `README.md`, `README.es.md`, `docs/*`, and `meta/public-roadmap.md` to cross-reference the v1.4 documentation baseline and clarify planning-vs-implementation status.

### Added
- Added Daniela-only contextual action `shoot_photo` in `prototype/web-v1/index.html` and `data/action_modifiers.json`, including capped perception/confidence/trend benefits, finite resource/time cost, cooldown/session guards, and explicit run log instrumentation (`action: "shoot_photo"` with `photoEffectApplied`).

### Changed
- Updated turn resolution and game UI to render/resolve photo-based route-reading effects diegetically without exposing forbidden raw variables, while preserving canonical resolution order (Environment → EP → BT → pressureDelta → perception → action modifier → outcome).


### Changed
- Updated `README.md` and `README.es.md` to reflect the observable web-v1 state (six characters, decision-window pressure, contextual action support, and gated Part 2 narrative bridge).
- Updated implementation-plan phase labels in `docs/en/implementation-plan-v1.4.md` and `docs/es/plan-implementacion-v1.4.md` from “next sprint” to “in progress” to match real execution status.

### Fixed
- Fixed documentation drift between published readmes and prototype behavior by explicitly documenting the current playable flow and Part 2 gating constraints (`Summit and Safe Return` only).

### Fixed
- Named the Part 2 guides in `prototype/web-v1/index.html` with role-specific narrative copy for Agustina Villanueva and Alejandro Molina.
- Removed orphaned `screen-mode` CSS rules from `prototype/web-v1/index.html`, including the leftover mobile `.mode-grid` media-query declaration.
- Expanded Section 6.3 in `docs/en/consolidated-design-v1.4.md` with calibrated win-rate distribution and active configuration values.
- Expanded Section 6.3 in `docs/es/diseno-consolidado-v1.4.md` with calibrated win-rate distribution and active configuration values in Spanish.

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
