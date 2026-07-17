# Glossary — Aconcagua: Stone Sentinel

This glossary defines the key terms used across the design documents, engine code, and technical documentation of *Aconcagua: Stone Sentinel*. Each entry explains the term in the specific context of this project.

Entries are organized thematically, starting with the core simulation model and moving outward to architecture, testing, and player-facing concepts.

Spanish mirror: [`docs/es/glosario.md`](../es/glosario.md)

---

## Core Simulation Model

### EP/BT Model (Environmental Pressure / Body Tolerance)

The central mathematical framework governing every game turn.

- **Environmental Pressure (EP)** is a composite score that quantifies how hard the mountain is working against the climber at any given moment. It aggregates altitude, terrain load, weather severity, visibility risk, time-of-day exposure, and node-level biases into a single number.
- **Body Tolerance (BT)** is a composite score that quantifies how much stress the climber's body can currently absorb. It integrates functional capacity, acclimatization, hydration, nutrition, fatigue, exposure, and character-specific stats.
- **Pressure Delta** (`EP − BT`) is the difference between the two. A positive delta means the environment is winning — conditions are harder than the body can handle, increasing risk and physiological cost. A negative delta means the body is coping well. Zero represents equilibrium.

No UI path or event system may assign a terminal outcome without routing through this model. All consequences must emerge from `resolveTurn(state, action)`.

> See also: `docs/simulation_engine.md`, `prototype/web-v1/engine/pressure-model.js`

---

### resolveTurn

The single authoritative function that resolves a game turn:

```
resolveTurn(state, action)
```

It processes the following pipeline in strict order:

1. `normalize-action`
2. `consume-time-and-resources`
3. `apply-weather-and-persistence`
4. `compute-pressure-and-perception`
5. `apply-decision-window-effects`
6. `evaluate-outcome`
7. `update-state`
8. `classify-terminal-outcome`
9. `emit-signals-and-narrative`

No parallel outcome logic exists. Every turn consequence — progress, physiological cost, risk, and final outcomes — emerges exclusively from this function.

> See also: `prototype/web-v1/engine/turn-resolution.js`

---

### Perception Model

A layer of the simulation that translates raw EP/BT/delta values into the imperfect signals the player actually sees on the watch interface.

The perception model produces three outputs:

- **`confidenceLevel`** — how reliable the current reading is.
- **`trendEstimate`** — whether conditions appear to be improving, stable, or worsening.
- **`noiseLevel`** — how much distortion is affecting the signal.

The player never sees raw EP, BT, or pressureDelta. They see only **Mountain Pressure**, **Trend**, and **Confidence** — all filtered through the perception model.

Characters modify perception differently: some have biases that make them overestimate or underestimate danger; others have latency that delays signal onset.

> See also: `prototype/web-v1/engine/pressure-model.js` (`calculatePerception`)

---

### Variable Confidence (`confidenceLevel`)

The signal reliability indicator produced by the perception model. It ranges from low to high and indicates how trustworthy the player's current environmental reading is.

Variable confidence is the mechanical expression of the design pillar "information is always partial." Even a confident reading is never absolute. Factors that reduce confidence include:
- High pressure delta (extreme conditions degrade situational awareness).
- High fatigue and exposure (the body becomes a worse instrument).
- Character-specific perception guardrails (e.g., Francisco's guilt distorts his body-signal interpretation).
- Advanced stages and late-day timing penalties.

Confidence is *variable* because it changes every turn based on state — it is not a static character attribute.

> See also: `data/characters.json` (`engine.confidenceStability`), `prototype/web-v1/engine/pressure-model.js`

---

### Functional Capacity

A core body-state metric representing the climber's current ability to function effectively. It is not a health bar — there is no moment where capacity hits zero and the climber "dies." Instead, declining functional capacity increases physiological cost per action, degrades perception, and raises the probability of adverse outcomes.

Functional capacity decreases with altitude, fatigue, and exposure; it partially recovers with rest, sleep, and acclimatization actions.

> See also: `data/characters.json` (`engine.functionalCapacityBonus`), `prototype/web-v1/engine/turn-resolution.js`

---

### Acclimatization

The body's gradual physiological adaptation to altitude. In the game engine, acclimatization accumulates when the player performs rest or sleep actions at altitude and degrades when they move too fast or descend without reacclimatizing.

Higher acclimatization lowers the BT cost of altitude exposure and improves the perception model's signal quality. Each character has an `acclimatizationRate` multiplier that determines how fast they adapt.

---

### Action Modifier

A data-driven object loaded from `data/action_modifiers.json` that defines how a specific action (e.g., `advance`, `wait`, `sleep`, `descend`) affects the turn engine. Fields include fatigue delta, exposure delta, capacity delta, resource cost per minute, and progress chance modifiers.

The engine reads action modifiers in the `evaluate-outcome` pipeline step. Missing fields are normalized to zero at runtime.

> See also: `docs/data-contracts-guide.md`

---

### Stage

One of three canonical progression tiers that shape EP/BT modifiers and outcome probabilities:

| Stage | Description |
|---|---|
| `APPROACH` | Lower-altitude segments, buffered consequences, acclimatization-focused. |
| `HIGH_CAMP` | Mid-to-high altitude, compressed resources, increasing physiological cost. |
| `SUMMIT_DAY` | Maximum pressure, strict time window, highest collapse risk. |

Stage modifiers are loaded from `data/stage_modifiers.json` and applied on top of node-level EP calculations.

---

### Route Node

A discrete location along the route, loaded from `data/nodes.json`. Each node has an `id`, `stage`, `routeIndex`, altitude, terrain load, weather/visibility biases, a camp flag (`isCamp`), and time sensitivity weights.

The engine uses the current node to compute EP and to enforce rules such as the bivouac penalty (applied when `time > 22:00` and `node.isCamp === false`).

---

### Terminal Outcome

A game-ending state classified by `classify-terminal-outcome` in the `resolveTurn` pipeline. Canonical terminal outcomes are defined in `data/outcomes.json`:

- Summit and Safe Return
- High Point Return
- Strategic Retreat
- Rescue
- Collapse (Fatigue)
- Collapse (Exposure)
- Resource Exhaustion
- Expedition Window Closed
- Permit Expired
- Fatality

All outcomes except "Summit and Safe Return" end in standard debrief. Only "Summit and Safe Return" unlocks Part 2.

---

### Park Permit

A simulation constraint that limits expedition duration. Each run starts with a maximum permit duration (up to 20 days on Normal difficulty). The permit day counter increments with each in-game day. If the permit expires before the player exits the park, the terminal outcome is **Permit Expired**.

The permit is displayed in the right-side panel of the game UI as a visible countdown, reinforcing time as a real constraint.

---

### Decision Window

A soft, stage-aware timer that degrades confidence and adds noise as the player takes longer to choose an action. The decision window does not hard-fail — it is not a binary timeout. Instead, delayed decisions produce mild confidence drift and minor cost increases, making prolonged indecision mechanically costly without punishing players arbitrarily.

Each character has a `decisionWindow` configuration object in `data/characters.json` with `baseMs`, stage modifiers, minimum floor, and degradation rate.

---

### Run

A single playthrough session from expedition start to terminal outcome. Each run uses one character, one scenario, and one random seed. The run ends when `resolveTurn` classifies a terminal outcome.

Run data is recorded turn-by-turn in `run_log.json` (stored in `localStorage`). The debrief screen summarizes the completed run.

---

## Player Experience

### Cosmetic Feedback

UI or narrative effects that communicate state changes to the player without modifying underlying game values. Examples include color changes on the watch interface, atmospheric narrative lines in the action feed, or sound cues tied to weather shifts.

Cosmetic feedback is intentionally distinguished from mechanical consequence. A cosmetic feedback element informs perception without altering EP, BT, fatigue, exposure, or any other engine variable. This distinction is a core design principle: *decisions leave a mark and are not "cleaned up" with cosmetic feedback*.

> See also: `meta/project-whitepaper.es.md` §2, design pillar "Consecuencia real".

---

### Partial Information

A design pillar and gameplay constraint: the player never has complete, accurate, or real-time knowledge of the game state. All information is mediated through the diegetic watch interface, filtered through the perception model, and subject to variable confidence.

This is not a UI limitation — it is a mechanical guarantee. The simulation actively withholds raw EP, BT, and pressure delta from the player. What the player sees is always an interpretation, not ground truth.

---

### Debrief

The end-run screen displayed after every terminal outcome. It presents the run's outcome, key statistics, a causal explanation of the most important decision point, and the option to replay or return to setup.

"Summit and Safe Return" debrief unlocks the Part 2 bridge; all other outcomes show a standard debrief.

---

## Architecture

### Engine

In this project, "the engine" refers to the simulation modules in `prototype/web-v1/engine/`, which collectively implement the EP/BT model and the `resolveTurn` pipeline. Key modules include:

| Module | Responsibility |
|---|---|
| `turn-resolution.js` | Orchestrates the full pipeline via `RESOLVE_TURN_PIPELINE`. |
| `pressure-model.js` | Computes EP, BT, pressure delta, and perception outputs. |
| `turn-rules.js` | Applies action-level rules (bivouac penalties, sleep hold, etc.). |
| `events-core.js` | Normalizes and applies character and context events. |
| `game-state.js` | Manages state slices, defaults, and deep-clone safety. |

The engine is separate from the UI layer (`prototype/web-v1/ui/`) and from data loading (`prototype/web-v1/ui/helpers/data-config.js`). It has no DOM access and can be run headlessly for Monte Carlo simulation.

---

### Canvas2D Visualization

The mountain visualization rendered in the game screen using the HTML5 Canvas 2D API (`CanvasRenderingContext2D`). Implemented in `prototype/web-v1/ui/mountain-visualization.js`.

The Canvas2D visualization renders:
- Terrain silhouette and route segments.
- Climber position, animated movement.
- Atmospheric effects (weather, visibility overlays).
- HUD-level overlays (stage markers, camp indicators).
- Character-specific visual identity (portrait, color accent).

The term "Canvas2D" distinguishes this from WebGL or other rendering approaches. It is intentionally chosen for simplicity and broad compatibility.

---

### web-v1 / Active Prototype

`prototype/web-v1/` is the canonical active prototype. It is the playable public-facing implementation, the authority for all active engine behavior, and the reference for all ongoing documentation.

Current public build: **v1.5.2**.

---

### mra-v0 / Frozen Historical Artifact

`prototype/mra-v0/` is a frozen Python-based simulation from an earlier development phase. It is preserved for regression reference and historical reproducibility but is **not** the active product. No new features are added to it.

---

### Deep Link

A URL with a hash fragment that navigates directly to a specific screen in `prototype/web-v1` without going through the normal flow. For example:

```
prototype/web-v1/index.html#game&character=francisco&scenario=assisted-route&seed=1234
```

Deep links are used for testing, sharing specific run configurations, and CI smoke validation.

> See also: `docs/deep-links.web-v1.md`

---

### Telemetry / run_log

Per-turn structured data recorded during every run by `ui/helpers/run-log.js`. Each entry captures:
- Turn index, character, scenario, action.
- EP, BT, pressure delta, perception outputs.
- Physiological state changes (fatigue, exposure, capacity, resources).
- Any character or context events that fired.
- The resulting outcome and narrative signals.

At run end, `exportRunLog()` writes the full log to `localStorage`. The debrief screen can display a compact turn review, and a copyable run-signature string summarizes the run for sharing.

---

## Testing and Quality

### Contract Tests / Parity Tests

Automated tests that verify shared expectations across multiple components or surfaces without over-constraining implementation details.

In this project, contract tests verify:
- That active outcomes in the engine match the canonical list in `data/outcomes.json`.
- That shared state metrics (position, fatigue, exposure, etc.) are present in both `web-v1` and `mra-v0` scenario schemas.
- That TypeScript type declarations in `src/types/` match the runtime normalized data shapes from `data-config.js`.

**Parity tests** are a subset that specifically check that two representations of the same concept remain aligned. For example, `tests/parity/loader-ts-contract-parity.test.js` ensures the runtime loader output and the TypeScript contract declare the same invariants.

These tests protect shared conceptual contracts while intentionally allowing implementation divergence.

> See also: `docs/model-contract.md`, `data/contracts/model-contract.json`

---

### Flow Smoke Test

A lightweight, end-to-end automated test that validates the main screen flow of `prototype/web-v1`:

```
title → expedition-setup → onboarding → game → outcome/debrief
```

Smoke tests do not verify engine balance or narrative content — they verify that the screens activate, gate controls work (disabled/enabled), and critical navigation paths do not throw errors.

Implemented with Playwright (`prototype/web-v1/tests/playwright/`) and run as part of CI on every push and pull request.

`npm run smoke:release` extends this to also validate deployed entry points against the live Vercel URL.

> See also: `docs/en/public-readiness-checklist.md`

---

### Monte Carlo Simulation

A headless batch runner (`scripts/monte-carlo-web-v1.js`, invoked via `npm run simulate`) that executes a large number of automated runs across all characters and scenarios using a deterministic AI policy.

Its primary purpose is **regression detection**: if any character produces a 0% summit rate, there is a structural engine bug. The Monte Carlo runner is explicitly *not* used for absolute balance calibration because the automated policy does not model human decision-making (timing, sleep strategy, signal interpretation).

Results are written to `docs/playtest-results/`.

---

### Tuning Guardrails

Engine-level tests in `tests/engine/tuning-guardrails.test.js` that enforce constraints on balance-critical parameters — for example, ensuring EP scale values stay within proven viable ranges, fractional burn-rate floors are non-zero, and at least one deterministic summit route remains reachable. They catch balance regressions that would otherwise only appear as invisible 0% summit rates in Monte Carlo runs.

---

*Last updated: v1.5.2. For current canonical module status, see [`docs/repo-truth.md`](../repo-truth.md).*
