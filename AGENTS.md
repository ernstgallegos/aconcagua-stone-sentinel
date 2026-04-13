# AGENTS.md

Repository-wide operating instructions for human and AI contributors.

This file is aligned with the AGENTS.md interoperability convention from https://agents.md/: it uses clear scope, explicit priorities, and actionable checklists.

## Scope

- Applies to the entire repository tree rooted at this directory.

## Canonical AI docs hub

- Canonical AI/agent operations hub: [`docs/ai/README.md`](docs/ai/README.md).
- Machine-readable canonical map: [`docs/ai/manifest.json`](docs/ai/manifest.json).
- This root file remains the required interoperability entry point for agent tooling.

## Instruction priority

When instructions conflict, use this precedence order:

1. Direct user request.
2. System/developer/runtime constraints.
3. More specific `AGENTS.md` files in subdirectories.
4. This root `AGENTS.md`.

## Mandatory session start behavior (AI agents)

- **Always read this file before starting a new task.**
- **Always load and follow `docs/en/public-readiness-checklist.md` (or `docs/es/checklist-preparacion-publica.md`) for any task that changes code, docs, CI, data, or release metadata.**
- Treat the checklist as a **hard gate**: if any item is not satisfied, do not finalize the task/PR/commit.
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
- [ ] Public-readiness checklist completed and reflected in PR/agent final report with explicit command evidence.

## Mandatory completion policy (AI agents)

- Do not end a task after code/doc changes unless:
  1. `CHANGELOG.md` is updated appropriately.
  2. Public-readiness checklist items are verified (or explicitly documented as not applicable).
  3. Validation commands required by the checklist are executed or a concrete environment limitation is reported.
- If a requested shortcut conflicts with this policy, ask for an explicit override and document the override in the final report.

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
  `welcome/title → expedition-setup (character + scenario carousels) → onboarding → game → (summit-success or debrief)`.

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
- Portability for validation gates is stronger when npm scripts call checked-in Node entry points (`scripts/*.js`) instead of inline shell snippets or Bash-only helpers; this keeps local Windows/macOS/Linux behavior aligned with CI command evidence.
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
- Welcome-cover readability changes are safer when the darkening treatment is reduced to a light tint only and the secondary info CTA remains vertically stacked under BEGIN; this preserves first-load focus without muting the artwork.
- Part 2 bridge selection stays consistent with Part 1 when it reuses the same carousel/card language but hard-limits the dataset and confirmation gate to the single canonical public option set (Francisco + guided Normal Route).
- Mobile watch/status fixes should reserve extra scroll/padding against the sticky decision footer; otherwise the last telemetry/context rows can look truncated even when the accordion is technically open.
- Welcome-cover artwork behaves best when portrait/mobile uses centered `cover` (no empty top/bottom bands) and landscape switches to centered `contain`, accepting side gutters so the full composition remains visible on wide screens.
- Title-screen progression is more robust when the cover itself owns the advance interaction and any visible hint/button is just a facade calling the same handler; keep top-corner utility controls excluded from that catch-all tap target to avoid accidental navigation.
- Static Part 2 bridge screens are fragile when `showScreen()` references a renamed builder; keep the Part 2 entry screen wired to the exact setup-render function and cover it with a smoke test that clicks both locked-in selections and the confirm CTA.
- Minimal visual-mode selectors remain usable when option glyphs switch to emoji, but preserve the underlying `value` contract and explicit accessible labels so `setVisualMode()` and tests do not depend on visible text.
- Desktop gameplay readability improves when the watch keeps the same information hierarchy as mobile but redistributes it into a dedicated watch/status split column instead of a single long stack; preserve one source of live data while changing only the desktop grouping.
- Temporary accessibility/debug actions like `Focus pause` should be removed end-to-end once retired: UI button, keyboard shortcut, telemetry fields, tuning parameters, and docs must all disappear together to avoid dead controls and stale balancing knobs.
- Part 2 bridge selection feels closer to Part 1 when the screen renders the full roster/route gallery and treats future branches as visibly locked cards; keep the one public path selectable, but let locked cards still update contextual copy so the gate reads as intentional progression rather than missing UI.
- `screen-part2-character` now uses the same carousel component structure as `screen-expedition-setup`; visual sync is maintained through: (1) shared CSS selector block for background/padding, (2) `renderPart2Carousel()` which mirrors `renderCarousel()` card templates with a code comment mandating parallel updates, and (3) `CAROUSEL_STATE_PART2` kept separate to avoid Part 1 navigation interference.
- Character-portrait asset sourcing is safer when Part 2 cards prefer `art/characters/part-2/` but keep an image-level fallback to `art/characters/`; this allows gradual rollout of Part 2 variants without broken portraits during incomplete art drops.
- Playwright smoke tests for `web-v1` must use `state='attached'` (not the default `'visible'`) when asserting screen existence, since all non-active screens are hidden. Also, title-screen advance is `.title-screen-advance` (not `.btn-primary`) and `.title-info-trigger` lives outside `#screen-title` in `.title-top-controls`.
- When a release decision is explicit (e.g., `v1.4.2`), promote the entire pending changelog batch from `[Unreleased]` into that version block and reset `[Unreleased]` to only active WIP items to avoid mixed-status release notes.


- Release-cut alignment is safer when version labels in UI strings and package metadata are updated in the same commit as changelog promotion to the target patch release (e.g., `1.4.2`).

- Intro-modal external links should always use canonical project URLs (not discovery/search URLs) to preserve contributor trust and reduce onboarding friction.

- Changelog release consolidations should also prune superseded contradictory bullets (e.g., deprecated-vs-experimental theme notes) so one version block reflects one final policy state.

- Release-complete snapshots should keep `[Unreleased]` explicitly empty and move late documentation/link fixes into the same versioned block when product confirms they belong to that release.
- Systemic integrity audits are easier to maintain when `resolveTurn()` emits one structured per-turn telemetry object containing environment, EP/BT/delta, perceived signals, action, and resulting state; acceptance tests can then assert pipeline integrity without scraping UI text.
- Release/version coherence checks should include simulation tooling and docs metadata (`scripts/monte-carlo-web-v1.js`, `docs/simulation_engine.md`) so hardcoded version strings/report filenames do not drift from `package.json`.
- State-slice whitelist safety (`recordTelemetry`/`updateRunState`) requires adding new keys to `*_STATE_DEFAULTS` in the same commit as new writes; otherwise runtime throws can bypass tests that stub those writers.
- Resource-economy regressions are easier to catch when burn-rate helpers preserve fractional consumption (or explicit carryover) instead of per-turn integer rounding, which can silently zero out consumption on low-burn half-hour turns.
- When runtime resources become fractional, HUD counters should present rounded whole units (preferably ceil-until-zero) so players do not see noisy decimals or false-zero values before actual depletion.
- Version-coherence parity tests should always include all public versioned docs (`README.md`, `README.es.md`, and `docs/simulation_engine.md`) using `v${package.version}` as the canonical source to prevent green CI with stale release copy.

- Safe dynamic-event additions in `web-v1` are least risky when they only adjust existing environment inputs (weather/visibility/time) inside `apply-weather-and-persistence`; keep event planning seed-driven and avoid any parallel outcome resolver.
- Debrief replay value improved with a compact local "review turns" inspector and copyable run-signature text; preserving this as local/browser-only avoids backend scope creep while still helping playtest analysis.

- Repo-truth drift is easier to prevent when `docs/repo-truth.md` is treated as the canonical status source and parity-tested against `package.json`, UI version text, and `data/outcomes.json`.
- Character-identity depth remains mountain-first when per-character events are loaded from `data/character_events.json` with bounded effects, cooldown, and per-run caps, and never allowed to set terminal outcomes.
- Gradual TS adoption in this repo is safest as an engine-first sidecar (`prototype/web-v1/src/**` + `tsconfig.json`) while runtime UI stays JS and static deploy remains unchanged.

- Context/environment event tuning in `web-v1` is safer when archetypes are sourced from `data/context_events.json` and normalized in `engine/events-core.js`; keep a runtime fallback table only as a resilience backup, not as the primary source of truth.
- Startup hardening is cleaner when required-data error typing (missing/HTTP/shape/post-load) stays in `ui/helpers/data-config.js` and fatal/loading copy rendering is isolated in a UI helper (`ui/helpers/startup-ui.js`), keeping `screens.js` orchestration-focused and easier to audit.
- Startup diagnostics are more actionable when `invalid JSON` is emitted as its own category (not merged into generic load failures), so fatal screens and smoke tests can distinguish transport vs. parse vs. contract defects.
- Bootstrap safety in `web-v1` is stronger when post-load UI initialization (`buildCharacterGrid`, `buildScenarioGrid`, deep-link activation) is explicitly gated behind successful `loadDataConfig()` completion; otherwise blocking data failures can still leave partial interactive shells that feel broken.
- Modal accessibility in `web-v1` is more robust when all overlays (help, watch detail, field log) share one helper path with focus trap + focus return instead of bespoke open/close toggles per dialog.
- Outcome-contract integrity is safer when canonical terminal outcomes declared in `data/outcomes.json` are verified at two layers: (1) resolver-level reachability tests that force each critical terminal path and (2) Monte Carlo/report tooling loading the same outcome list from data (never hardcoded duplicates).
- Bilingual reliability in `web-v1` improves when static overlay copy and aria/title attributes are passed through one post-render translation sweep (`applyStaticTranslations`) and protected by a parity test that asserts key selector hooks exist.
- Startup diagnostics regress less when `startup-ui` localization/categorization is pinned by direct helper-level unit tests (not only smoke tests), so copy/category drift is caught before fatal-screen UX degrades.
- Public-release cleanup remains more durable when governance artifacts (`SECURITY.md`, `CODE_OF_CONDUCT.md`) and a bilingual pre-release checklist are updated in the same sprint as README/CONTRIBUTING links, so quality gates and reporting pathways stay discoverable for outside reviewers.
- AI-agent compliance is more consistent when readiness requirements are duplicated at three layers (`AGENTS.md` hard gate + `CONTRIBUTING.md` PR policy + checklist evidence line item), so missing command proof is treated as process failure instead of optional documentation.

- Canonical character coherence is safest when `docs/es/Personajes_v_3.md` remains the source-of-truth and every English mirror/data-facing profile (`docs/en/characters_v_3_en.md`, `data/characters.json`, character-event narrative copy) is synced in the same commit to prevent roster drift (e.g., stray character swaps or profession/age mismatches).
- Part 2 pre-threshold narrative rewrites are safer when represented as a single data contract (`id/eyebrow/title/body/variant/animationPreset/visualMode/navButtons`) rendered by one UI path; this preserves pacing controls (paragraph spacing, titleless beats, variable CTA counts) without duplicating static HTML cards.
- When reducing narrative duration, prefer proportional compression per screen (not removing whole beats): keep canonical logistics anchors and closing cadence lines, then trim interior exposition so pacing drops without flattening tone.
- Root-route clarity improves public onboarding when `/` explicitly presents the current public entry strategy (landing page with privileged web-v1 CTA) while legacy replay tooling remains archived under `prototype/mra-v0/viewer/` instead of competing at repository root.
- Route/deploy documentation drift decreases when one canonical document owns local-preview, Vercel, and CORS instructions (`docs/deploy-routing.md`) and README variants only keep short pointers.
- Intro/support UX in `web-v1` is clearer when prototype-info modal includes explicit “sharing helps the project” copy, one-click social intent links, and a canonical Instagram CTA; keep these links language-aware and generated from the active runtime URL to avoid stale hardcoded share targets.
- Release-note hygiene stays cleaner when a patch is declared final (e.g., `v1.4.5`): move all pending `[Unreleased]` bullets into that version block and leave `[Unreleased]` explicitly empty to avoid mixed-status histories.
- Final-screen collaboration CTAs in Part 2 are more reliable when each external destination (email/Instagram) uses its own explicit action handler and localized nav label instead of overloading one generic contact path.

- Root-entry presentation is cleaner for public onboarding when `/index.html` acts as a lightweight landing page with one privileged “play web-v1” CTA and secondary links to repo/whitepaper, instead of forcing an immediate redirect before context is shown.

- When root UX changes from redirect-shell to landing, `vercel.json` must drop any `/` redirect to `prototype/web-v1/index.html`; otherwise production deploys bypass the landing despite local static previews looking correct.

- Public landing redesigns are more reliable when they are delivered as a full package (audit + direction + design-system doc + implementation changelog) so UX intent, visual system rules, and shipped behavior stay synchronized.

- Landing localization is safest when English is the default public copy and Spanish is delivered through a visible EN/ES switch that also updates metadata (`title`, description, key alt text), preventing mixed-language first impressions.

- Public landing conversion improves when update-follow and contact actions are explicit (Instagram + official email) in a dedicated section instead of being implied only in footer/legal copy.

- Public landing clarity increases when whitepaper and roadmap are surfaced as visual summary cards (not only links), and official channels always include both GitHub and project email as explicit actions.

- Public markdown documents linked from landing are more credible when they open inside a styled viewer constrained to approved sources, avoiding raw markdown UX drift and preserving brand consistency.

- Hero artwork readability is safer when landing images keep original aspect ratio by default (`contain` + auto height); forcing fixed 16:9 crops can destroy key visual information on already-composed illustrations.
- Cross-surface typography updates are more coherent when role tokens are explicit and shared (`Playfair Display` for editorial hierarchy, `Montserrat` for operational UI/body copy, and `IBM Plex Mono` for telemetry/meta labels), and favicon changes are applied to every public HTML entry point in the same commit.

- Documentation hubs are strongest when README is surfaced alongside whitepaper/roadmap and official channels list all three direct actions (GitHub, Instagram, email) in one place.

- Landing focus remains cleaner when archived tooling links are de-emphasized from primary CTA clusters, while Vision/System sections communicate mechanics through compact visualized signals (tags + flow strips) instead of plain text-only cards.

- Audit-remediation closures are easier to defend when each external finding is mapped to a repo-traceable matrix (`FIXED` / `ALREADY CORRECT` / `NOT REPRODUCED` / `INTENTIONALLY DEFERRED`) and paired with at least one automated guard where practical (e.g., asset contract tests, RNG input validation tests).
- Runtime diagnostics in `web-v1` should prefer environment-gated debug logging over unconditional production `console.error` calls; keep player-facing failures in localized startup/fatal UI while preserving localhost troubleshooting visibility.
- Runtime diagnostics stay easier to audit when startup/load categorization and developer-report formatting live in one helper (`ui/helpers/runtime-diagnostics.js`) and loader/UI modules consume shared category constants instead of ad-hoc string parsing.
- Cross-surface language UX is safest when landing, markdown viewer, and `web-v1` reuse one shared localStorage language key (`aconcagua_language_v1`); splitting keys creates subtle “language reset” friction that feels like a bug.
- Public markdown reader routes should inherit the same visual token system as `/` (surfaces, borders, typography, focus patterns) so document deep-links feel like the same product, not a detached microsite.

- Editorial public-web redesigns are more trustworthy when section order mirrors project logic (premise → system → evidence → status → outcomes → play CTA) and copy/visual cadence stays mountain-first instead of marketing-template-first.
- Testability for legacy inline-heavy UI modules is safer when tiny pure helpers (e.g., nationality/flag fallback formatter) are extracted without behavior changes; this enables deterministic unit coverage while keeping runtime rendering contracts intact.

- Landing-to-prototype trust improves when `/` and `prototype/web-v1` share the same tonal token family (cold mineral neutrals + restrained ice/amber accents) so visual sophistication does not collapse after the Play CTA.
- Typography governance stays coherent when one primary editorial serif (`Playfair Display`) is reserved for brand/narrative hierarchy while dense UI keeps a dedicated sans + mono pairing; define these as role-based tokens (`brand/ui/reading/data`) before component-level tweaks.
- For mountain-first UX/UI coherence, pairing `Playfair Display` (editorial hierarchy) with `Montserrat` (operational UI text) yields cleaner cross-surface consistency than mixing multiple sans primaries; keep `IBM Plex Mono` reserved for telemetry/data semantics.
- Carousel image stability in setup screens improves when portraits are rendered through a shared media wrapper (`loading` skeleton + reserved aspect ratio + explicit fallback state) and critical character portraits are preloaded before first carousel paint.
- Overlay reliability is stronger when intro/tutorial/onboarding and in-game dialogs share one modal-controller path (focus trap, Escape priority, backdrop close, and body scroll-lock release), rather than ad hoc per-modal listeners.
- `screens.js` extraction is safer when renderer moves are validated with characterization regex tests that intentionally track delegation seams (e.g., wrapper calls in `screens.js`) so module moves do not silently break release-guard expectations.
- Landing/document-viewer bilingual usability is most reliable when doc CTAs are keyed by semantic doc IDs and resolved at runtime by selected language; avoid hardcoded `?file=` links that can drift to English-only targets after language switches.

- AI/process governance stays easier to maintain when canonical agent tooling docs live under `docs/ai/` with a machine-readable `manifest.json`, while root `AGENTS.md` remains the compatibility entry point for tooling that expects it at repository root.
- Debt-register hygiene is more reliable when active debt items are periodically re-validated against source/runtime truth (for example, EN/ES narrative-bank key parity) and moved to the resolved table immediately once the documented exit criterion is met.
- Debt closure quality for `web-v1` improves when each closed debt item lands with one explicit guard: contract/parity tests for cross-surface policy, helper-level immutability tests for telemetry mutations, and config guardrail tests for EP/resource viability.
- Cross-prototype drift control is stronger when release checklists include a dedicated `npm run test:contracts` gate and docs include an explicit active-vs-frozen ownership matrix that tests can parse.
- Public landing redesigns remain safer when architecture, typography, and motion are treated as one system: build narrative-first section order, centralize atmospheric tokens, and keep reveal/parallax effects subtle with strict reduced-motion fallbacks.
