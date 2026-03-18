# One-shot prompt — web-v1 debug + remediation sweep

Use this prompt as the next implementation brief for `prototype/web-v1`. It assumes Bugs D/E/F are already understood and that the target player experience still expects roughly **30% `Summit and Safe Return`** under favorable, well-played conditions.

---

## Context you must preserve

- Canonical flow remains `splash → title → character → scenario → onboarding → game → (summit-success or debrief)`.
- `horcones` is **the park access point**, not the final automatic endpoint of a run.
- The expedition must end only when the player **explicitly exits the park**. In practice: if the player is already at `horcones` and chooses `descend`, that turn means **leave the park alive**.
- `Summit and Safe Return` must keep precedence over permit/window failures, but only once the return is **fully completed through park exit**.
- `run_log.json` and current outcome contracts must remain backward-compatible.

---

## Bugs already confirmed in code review

1. **Bug D — premature run termination on return to `horcones`.**
   - Old behavior: returning to `horcones` after any prior progress (`highestPosIdx > 0`) could end the run immediately as a retreat.
   - Expected behavior: returning to `horcones` after a retreat is **not** the end by itself; the run continues until the player explicitly chooses `descend` from `horcones` to exit the park.

2. **Bug E — `wait` on approach could randomly advance the player.**
   - Old behavior: `progressChance` allowed `wait` in low-altitude approach sectors to produce `Advance` and move the run forward even when the policy intended to hold position.
   - Expected behavior: `wait` on approach/base sectors must never create unintended forward displacement.

3. **Bug F — descending from `horcones` with `highestPosIdx = 0` did not end the run.**
   - Old behavior: the run could become stuck at `horcones` because the end condition only recognized a prior ascent.
   - Expected behavior: `descend` from `horcones` must always resolve as a valid park exit, even if the expedition never advanced beyond the entrance.

---

## Playtesting review performed on current web-v1 ruleset

### Method

Run an engine-level simulation sweep using current `prototype/web-v1` turn-resolution rules and repo data files:

- Characters: all 6 in `data/characters.json`.
- Scenarios: all 5 predefined scenarios in `data/scenarios.web-v1.json`.
- Seeds: all 10 configured seeds per scenario.
- Total runs: **300**.
- Policy: a deterministic “reasonable caution” heuristic using current state (`position`, `fatigue`, `exposure`, `resources`, `acclimatization`, `time`) to choose `advance`, `advance_slowly`, `wait`, `sleep`, `descend`, and Daniela’s `shoot_photo` when available.
- Important limitation: this is an engine-level sweep, not a browser-rendered UX capture; timing-pressure UX and manual player creativity are not represented.

### Real metrics observed in that sweep

- Total runs: **300**.
- `Summit and Safe Return`: **0 / 300 = 0.0%**.
- `Strategic Retreat`: **72 / 300 = 24.0%**.
- `Collapse (Fatigue)`: **228 / 300 = 76.0%**.
- Average run length: **4.33 turns**.

### Scenario-level outcome distribution

- `assisted-route`: **54 collapse / 6 retreat**.
- `narrow-weather-window`: **42 collapse / 18 retreat**.
- `false-stability-terrain`: **42 collapse / 18 retreat**.
- `accumulated-fatigue-trap`: **48 collapse / 12 retreat**.
- `weather-window`: **42 collapse / 18 retreat**.

### Key interpretation

These metrics are **far below** the intended experience.

Even allowing for heuristic-policy limitations, the current web-v1 balance envelope appears to be failing at a systemic level because:

- a favorable scenario like `assisted-route` still collapses in **90%** of simulated runs,
- average runs end after only **~4.3 turns**, which is too short for the intended expedition arc,
- no configuration in this sweep produced even a single `Summit and Safe Return`, which is incompatible with the intended ~30% favorable-run success target.

This indicates at least one of the following is still overtuned or miswired:

- early-route pressure/collapse probabilities,
- action cost accumulation in the approach,
- acclimatization gain pacing,
- action policy incentives around `wait`/`advance_slowly`,
- scenario starting pools/resources,
- character differentiation not meaningfully reaching outcome resolution,
- route progression probabilities at low bands.

---

## Additional gameplay problems to investigate from the simulation evidence

Treat these as probable defects or balancing regressions until disproven:

1. **Approach-sector collapse rate is likely too high.**
   - Runs frequently fail before reaching a meaningful high-camp rhythm.
   - Investigate `evaluateOutcome()` probability shaping together with `calculateEnvironmentalPressure()`, `calculateBodyTolerance()`, and early-route action modifiers.

2. **Favorable scenario survivability is implausibly low.**
   - `assisted-route` should function as a low-friction onboarding/baseline scenario, not a near-certain collapse funnel.

3. **Character identity may be mechanically underexpressed.**
   - The sweep produced effectively identical aggregate outcome counts across all six characters.
   - Verify that character engine fields are materially affecting: BT, perception, resource economy, acclimatization, and downstream outcome distributions.

4. **Current route arc may be too short to support the intended narrative/strategic cadence.**
   - A mean of ~4 turns suggests players may not be seeing enough state transition, learning, or recoverability before terminal outcomes.

5. **The success envelope is incompatible with the stated target.**
   - With a target near 30% `Summit and Safe Return` under favorable/competent play, current measured outcomes imply a major balance regression still exists.

---

## Required implementation tasks

Execute these tasks in order.

### 1) Lock in Bugs D/E/F with explicit automated coverage

Add/keep regression tests that prove all of the following:

- returning to `horcones` after descending from a higher node does **not** auto-end the run,
- `wait` from approach/base sectors cannot advance the route,
- `descend` from `horcones` with `highestPosIdx = 0` ends as a valid safe park exit,
- `descend` from `horcones` after a summit resolves to `Summit and Safe Return`,
- `descend` from `horcones` after a partial ascent resolves to `High Point Return`.

### 2) Audit and rebalance early-route survivability

Inspect and tune, with small measured steps and reruns after each change:

- `data/action_modifiers.json`
- `data/environmental_pressure_config.json`
- `data/stage_modifiers.json`
- `data/nodes.json`
- any related probability shaping in `prototype/web-v1/engine/turn-resolution.js`

Specific goals:

- reduce collapse frequency during the first third of the route,
- make `advance_slowly` and `wait` viable stabilizing tools instead of hidden death delays,
- keep summit pushes dangerous without making the approach mathematically unwinnable.

### 3) Re-check character differentiation

Audit whether the following character fields are actually influencing outcomes enough to matter:

- `fatigueResistance`
- `exposureResistance`
- `confidenceStability`
- `riskTolerance`
- `resourceEfficiency`
- `acclimatizationRate`
- perception-latency and perception-guardrail fields

If characters still collapse into near-identical distributions, adjust formulas or add missing integration points so roster identity is mechanically visible in simulation outcomes.

### 4) Restore the intended success envelope

After each balance pass, rerun a Monte Carlo or seeded sweep over all predefined scenarios and characters.

Acceptance target for the next pass:

- a favorable/competent-policy aggregate should move meaningfully toward **~30% `Summit and Safe Return`**,
- `assisted-route` should become clearly more survivable than the hard scenarios,
- average run length should increase enough to reflect a full expedition arc rather than a 4-turn collapse spiral.

Do not fake this by simply forcing successes at the terminal-outcome layer. Fix the underlying route/balance dynamics.

### 5) Preserve outcome ordering and expedition-end semantics

Keep these ordering rules explicit and tested:

- explicit park exit from `horcones` is the final completion action,
- `Summit and Safe Return` takes precedence over permit/window expiry once the full return is completed,
- exact-final-turn safe exits must not be downgraded to permit/window failure,
- partial ascent returns must remain distinct from summit-safe-return outcomes.

### 6) Produce evidence in-repo

Update all necessary documentation in the same change set:

- `CHANGELOG.md`
- `README.md` / `README.es.md` if visible behavior changes again
- `docs/balance-calibration-notes.md` if new balance measurements are produced
- this file, if you are superseding these findings with fresher numbers

Include the actual simulation counts, not just qualitative claims.

---

## Validation checklist you must run before closing the task

Run at minimum:

- `npm test`
- `pytest prototype/mra-v0/test_simulator.py -v`
- JSON parse validation for all `data/*.json`
- a seeded engine-level playtesting sweep for `web-v1`
- if browser tooling works, a rendered smoke pass confirming that Horcones exit behavior matches the intended flow

Also verify manually in code that:

- the run does **not** end just by re-entering `horcones`,
- the run **does** end when descending from `horcones`,
- `wait` on low-altitude sectors never moves the player forward,
- the favorable-scenario success envelope is no longer catastrophically low.

---

## Deliverable format expected from the next agent

Return:

1. a concise summary of code changes,
2. the exact simulation metrics before/after,
3. the remaining known risks,
4. citations to modified files and evidence files,
5. test commands and outcomes.

