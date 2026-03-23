# AGENTS.md

Repository-wide operating instructions for human and AI contributors.

This file is aligned with the AGENTS.md interoperability convention from https://agents.md/: it uses clear scope, explicit priorities, and actionable checklists.

## Scope

- Applies to the entire repository tree rooted at this directory.

## Instruction priority

When instructions conflict, use this precedence order:

1. Direct user request.
2. System/developer/runtime constraints.
3. More specific `AGENTS.md` files in subdirectories.
4. This root `AGENTS.md`.

## Mandatory session start behavior (AI agents)

- **Always read this file before starting a new task.**
- Treat this document as a **living learning log**: after each sprint/task with meaningful decisions, append/update the relevant learning entries.
- Keep entries concise, operational, and directly useful for future implementation/review cycles.

## Mandatory change documentation policy

For every functional, technical, or security change included in a commit/PR:

1. **Update `CHANGELOG.md`** using Keep a Changelog format.
2. Record the change in the correct section:
   - **`[Unreleased]`** for unpublished work.
   - The target version block when preparing an in-progress release.
3. Classify each entry under the right type: **Added / Changed / Fixed / Security / Removed / Deprecated**.
4. Describe impact concretely (affected file/module/behavior).

## When to update other docs

In addition to the changelog:

- **`README.md` / `README.es.md`**: when usage flow, commands, routes, prototype status, or visible architecture changes.
- **`CONTRIBUTING.md`**: when contribution policy, test requirements, commit format, or validation flow changes.
- **`docs/`**: when systemic models, mechanical contracts, or architecture decisions change.

## Minimum pre-merge checklist

- [ ] Changelog updated.
- [ ] Related documentation synchronized (`README*`, `CONTRIBUTING`, `docs/`) as needed.
- [ ] Relevant tests/checks run locally (`npm test`, `pytest`, scenario validation as applicable).
- [ ] No contradictions between documented behavior and actual code behavior.

## Changelog writing conventions

- Write entries in English (canonical project language).
- Use short, descriptive, past-tense impact statements.
- Avoid vague items such as “misc fixes”.
- Security-relevant changes **must** appear explicitly under `### Security`.

## Historical maintenance

- Do not remove prior changelog history.
- If correcting a historical release entry, mark it as a retroactive adjustment.
- Keep versions in descending order (newest first).

## Learning log (project + workflow)

### Project architecture and behavior (important)

- The active prototype is `prototype/web-v1/index.html` with a stateful JS engine centered on EP/BT calculations and turn resolution.
- Character mechanics are data-driven from `data/characters.json`; each character must expose the full engine modifier set plus `difficultyLabel`.
- Canonical outcomes are data-driven from `data/outcomes.json`; outcome checks in `resolveTurn()` must preserve ordering-sensitive logic.
- Current primary flow after v1.4 Phase 1 is:
  `splash → title → character → scenario → onboarding → game → (summit-success or debrief)`.

### Sprint learnings — v1.4 Phase 1 (external playtesting push)

- Replacing character roster requires mechanical coherence, not just text swap: IDs, engine fields, and UI card rendering must remain aligned.
- Permit system coupling points were critical:
  - state declaration (`G.permitDay`, `G.permitMaxDays`),
  - reset on run start,
  - synchronization when day increments,
  - outcome check precedence before expedition-window closure,
  - visual feedback in watch-side widget.
- Removing `screen-mode` works cleanly if navigation and random-scenario access are preserved via scenario-grid integration.
- Summit-success/Part-2 bridge is intentionally a gated narrative bridge, not playable Part 2; placeholder behavior is expected for now.

### Workflow learnings (implementation + validation)

- One-shot audit remediations are safer when applied in strict dependency order (runtime constants → terminal outcome persistence → state subsystems), then validated with targeted grep/line checks before full test suites.
- Keep lint tooling version-pinned in `requirements-dev.txt` and call it directly in CI jobs; avoid ad hoc `pip install` inside workflow steps so local and CI lint behavior cannot drift.
- Post-audit cleanup tasks should remove orphan CSS selectors immediately after flow removals; run targeted grep checks for selector leftovers (base styles + responsive media queries) before final test runs.
- For large one-shot prompts, execute in strict section order and verify each section with targeted grep/search checks before running full tests.
- Prefer minimal, precise edits to `index.html` because it contains UI, flow, and engine logic in one file; regressions are easy when moving blocks.
- During ES-module migrations, keep a temporary `window.*` facade for existing inline button handlers and legacy regex-based tests until all call sites are fully decoupled from global functions.
- For this repository, final validation baseline should include:
  - `pytest prototype/mra-v0/test_simulator.py -v`
  - `npm test`
  - JSON parse checks for all simulation data files.
- For visible front-end changes, take screenshots through browser tooling to confirm real rendered behavior.
- ES-module screens with inline HTML `onclick` hooks require explicit `window.*` exports for every invoked handler; missing facade assignments can silently break CTA navigation despite rendered buttons.
- Keep `run_log.json` exports backward-compatible by layering new telemetry as additive fields/aliases and attaching run-level summaries without replacing the per-turn array contract.
- After any balance pass that changes action/stage multipliers, re-check `data/environmental_pressure_config.json` EP root scales (`altitudePressureByBand`, `terrainLoadScale`) against BT ceilings to prevent mathematically blocked summit routes.
- Resource-economy tuning must be validated against `spendResourcesForMinutes` rounding floors; a forced minimum per action can silently invalidate scenario starting pools even when hourly burn rates look viable on paper.

### Collaboration protocol for future tasks

- Difficulty-regression protection is most robust when SUMMIT_DAY uses explicit penalty caps (acclimatization + timing degradation) and emits a dedicated telemetry flag so balancing can separate true challenge from accidental spike behavior.
- Balance passes are more stable when global pressure/cost multipliers are relaxed first, then character identity is corrected with perception/risk/timing controls before touching raw capacity stats.
- Keep a persistent internal balance note (`docs/balance-calibration-notes.md`) with explicit target-rate bands and observed dispersion per character so future tuning can compare drift without re-deriving assumptions.
- Treat reviewer/user dissatisfaction as a signal to audit for integration mistakes (flow, ordering, and DOM placement), not only syntax/test pass.
- When requested by the user, keep documenting meaningful lessons here as cumulative operational memory for subsequent sprints.
- Daniela-specific contextual actions should be gated in both UI rendering and resolver-level execution checks; keyboard shortcuts and fallback resolution must enforce the same constraint path to prevent hidden-action exploits.
- Perception-altering actions require anti-stacking controls (cooldown, per-run cap, and short-lived carry effects) plus explicit run-log instrumentation so post-run analysis can separate signal-quality boosts from baseline engine behavior.
- Decision-window mechanics are safest when implemented as soft, stage-aware degradations (confidence/noise/minor cost drift) with explicit accessibility fallback and per-turn timing telemetry in `run_log.json`; avoid binary timeout fail states in playtesting.
- Part 2 bridge flow remains safer when each narrative screen includes both bidirectional chaining (back/continue) and an explicit debrief escape hatch; this avoids dead routes while preserving replay continuity after early exits.
- Right-panel readability improved when watch, permit, and context are grouped as one status stack; users scan top-to-bottom faster when risk chips mirror engine thresholds (`warning`/`critical`) instead of purely narrative wording.
- Debrief clarity improves when turning-point text is paired with one outcome-specific actionable cause; this shifts post-run feedback from “system felt random” to concrete next-run adjustments.
- Documentation drift risk increases when `README*` still describe older character counts/flow labels; after each Phase 2 UX/mechanics merge, mirror the observable state (current flow, Part 2 gating, active mechanics) in both EN/ES readmes and phase plans within the same commit.
- Summit-return outcome classification must keep `Summit and Safe Return` precedence above expedition-window expiry checks to avoid false failures on exact-final-turn returns.
- Descent balancing now depends on action-level recovery/capping fields (`fatigueRecovery`, `exposureRecovery`, `pressureDeltaCap`) consumed in `evaluateOutcome()`; future action tuning should prefer additive action metadata over hardcoded branch exceptions.
- State-refactor safety is stronger when mutable globals are partitioned into semantic slices (`runState`, `uiState`, `telemetryState`) and hot turn boundaries assert the allowed shape (`before resolveTurn`, `after updateState`) so key drift fails fast during balancing iterations.
- Version bumps are safer when lockfile metadata (`packages[""].version`) is guarded by a dedicated CI script; regenerate `package-lock.json` with `npm install --package-lock-only` in the same commit as `package.json` version changes.
- Route wiring regressions are best caught with one deterministic headless smoke test that asserts screen activation and gate transitions (disabled/enabled controls) instead of brittle visual snapshots.
- Maintaining an explicit `docs/technical-debt-register.md` with owner/risk/symptoms/exit criteria improves release discipline; require release PRs to review the register and mirror debt paydown/extension in `CHANGELOG.md`.
- Public roadmap updates should classify each stage with two separate flags (design lock vs implementation completion) and anchor status claims to concrete repo evidence (named modules/tests), with implementation-plan snapshot links for auditability.
- Public-facing status docs should avoid binary visibility wording; explicitly state that prototype code in-repo is public while production/commercial branches remain private to prevent roadmap/readme ambiguity.
- Scenario UX remained cleaner when predefined cards hid manual seed picking and selected a random configured seed on card selection; preserve at least ~10 seeds per scenario in data to keep replay entropy without user-facing complexity.
- Action-modifier data currently omits explicit `fatigueDelta`/`exposureDelta`/`capacityDelta`; keep runtime normalization in `getActionModifier()` so missing fields never propagate `NaN` into body-state updates or freeze decision progression.
- Treat `data/environmental_pressure_config.json` as a blocking runtime dependency for `web-v1`; also keep pressure-scale reads null-safe in `calculateEnvironmentalPressure()` so malformed partial payloads degrade gracefully instead of crashing turns.
- Mobile status shortcuts only stay trustworthy when bottom-sheet/watch-route panels are updated from the same render pass as the main HUD; avoid placeholder-only mobile copies that drift from live state.
- Debrief readability improved when the end-run screen privileged outcome, concise summary stats, and one actionable lesson; keep verbose per-turn diagnostics behind tooling or exports rather than the primary player-facing surface.

- Multilingual rollout in `web-v1` is safest when language state is centralized (single source + localStorage) and reapplied after rebuilding dynamic grids (character/scenario) to avoid mixed-language UI fragments.

- Inline `onclick` controls in `index.html` depend on both successful ES-module parsing and explicit `window.*` facades; one unescaped apostrophe in i18n strings or a missing facade export (e.g., `setVisualMode`) can disable all title/splash controls at once.

- Park-exit flow in `web-v1` is safer when `horcones` is treated as the park gate rather than an automatic end-state: returning there after a retreat should remain playable until the user explicitly descends to exit, while summit/high-point outcomes can be awarded on that exit turn.
- Outcome resolution for non-movement actions should guard against zero-progress `wait` turns producing route displacement on low-altitude approach sectors; regression tests should pin both approach waiting and Horcones exit behavior together.
- Difficulty presets in `web-v1` are safer when centralized as a single profile table consumed by title UI, onboarding copy, pressure/tolerance math, resource economy, permit limits, and decision-window timing; splitting those knobs across unrelated constants risks fake difficulty that players immediately feel as incoherent.
- Pre-expedition tutorial overlays are easier to maintain when the long-form copy is rendered from localized data objects instead of hardcoded multilingual HTML, so title/onboarding language switches keep the briefing consistent without duplicating screen markup.

- Difficulty tuning regressions can hide in sign-sensitive math: if a global fatigue/exposure multiplier is applied directly to negative recovery deltas, easier modes accidentally recover less and harder modes recover more; normalize recovery and resource/timer bonuses through shared helpers so Title difficulty remains mechanically truthful.

- Summit/descent regression fixes are safest when validated at two layers: engine-level deterministic tests for summit continuation, descent movement, recovery math, and window ordering first; only then proceed to broader balance sweeps, because aggregate win-rate data is misleading while those structural blockers remain.

- Summit-state safety is strongest when ascent is blocked at both layers: disable uphill UI affordances at `summit` and also coerce resolver-level advance attempts into a flagged hold/descend-only path so Part 2 victory still depends on safe park exit, not summit arrival alone.
- Summit-return outcome checks are safer when park-exit classification treats `hasSummited` as the canonical success memory and not only `highestPosIdx`; this protects winning exits if route-index telemetry drifts during long descents.
- Park-exit UI flow in `web-v1` must distinguish **arriving at `horcones`** from **exiting from `horcones`**; if end-run checks read the post-turn position instead of the pre-turn position, valid summit returns are misclassified one turn early as `Strategic Retreat` and Part 2 stays locked.

- Welcome-screen UX stays cleaner when the entry view remains cover-first with a single dominant advance CTA; move explanatory/version/credit copy into an optional modal so curious players can read it without slowing first-time flow.

- Mobile HUD simplification is safer when watch and context/status share the same live panel markup; keeping separate accordions on small screens duplicates scan effort and makes state updates feel inconsistent.
- Welcome-screen primary navigation works better when the main CTA and prototype-info trigger sit in the same centered action row; floating the info control in a distant corner weakens discoverability.
- Mobile gameplay readability improves when secondary watch/context/narrative panels collapse by default and the decision panel stays sticky; preserve instant access to actions first, then expose detail progressively.

### Sprint learnings — gameplay-fix-v4 (post-audit __11_)

- sleep bug: `sleep` was advancing position 58% of turns because `evaluateOutcome` processed it with `progress=0` producing `progressChance=58%`. Fix: force `outcome='Hold'` when `context.action==='sleep'` in evaluateOutcome, same pattern as `isApproachWait`.
- collapseChance `*2` multiplier caused 62% collapse on weather spikes (ws=1→3). Under normal mountain variability, summit was probabilistically impossible. Fix: reduce to `*1.2`. At eff=52 (worst case): 15.4% collapse — meaningful danger without instant death.
- Part 2 unlock required `localStorage` persistence. `G.finalOutcome` resets on `startRun()` so the Part 2 gate only worked from the summit-success screen during the same session. Fix: `SUMMIT_ACHIEVED_KEY` in localStorage, set at endRun, checked in `canAccessPart2` helper.
- `summitLateStart=1200` (20:00) eliminated summit-day timing tension. Fix: 1020 (17:00). Forces departure before 09:00 from Cólera to reach summit before cutoff.
- Balance is correct under perfect play (ws≤1, sleep every camp, advance 06:00): summit reachable with fat=13, fc=65. The automated simulation collapses because it doesn't model timing — human players who learn the system can summit at ~30%.
- Simulation harness as balance proxy: automated AI policies are poor proxies for human play. Use for regression detection (0% summit = bug), not for absolute calibration.

### Sprint learnings — Fase 3 completion (audit + Monte Carlo harness)

- Monte Carlo harness for web-v1 is now available via `npm run simulate` (`scripts/monte-carlo-web-v1.js`); runs all 6 characters × 5 scenarios × N seeds headlessly and writes results to `docs/playtest-results/monte-carlo-v1.4.1.md`.
- The headless AI policy (`reasonablePolicy`) produces 0–4% summit rates vs. 8–20% human target bands — this divergence is expected and documented. Use the harness for regression detection (0% summit = structural bug) not absolute calibration.
- CHANGELOG consolidation convention: accumulate changes in `[Unreleased]`, then batch-version the block (rename to `[X.Y.Z] — YYYY-MM`) when preparing a release; consolidate any duplicate `### Fixed / Added / Changed` sub-headers into single sections at consolidation time.
- Documentation sync should happen after every calibration pass: `docs/es/diseno-consolidado-v1.4.md` §6 values and `docs/balance-calibration-notes.md` both need updating whenever `data/*.json` calibration files change.
- Headless simulators for `web-v1` must normalize `data/nodes.json` nodeId→id mapping (matching `screens.js` `ROUTE_NODES` transform) before constructing POSITIONS; skipping this produces `undefined` positions and silent 0% outcomes.
- `resolveTurn` uses `'Strategic Retreat'` as the continue-turn marker (not a terminal outcome); runs only end when `exitedPark || outcome !== 'Strategic Retreat'` — mirror this exact condition in any headless simulator loop.
