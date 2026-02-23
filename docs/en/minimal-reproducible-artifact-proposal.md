# Minimal Reproducible Artifact Proposal (v0.1)

> This document proposes a **minimal reproducible artifact (MRA)** for *Aconcagua: Stone Sentinel*.
> It is designed to validate the core hypothesis before any production-heavy implementation.

---

## 1. Purpose

The artifact exists to test one question:

> Can the project generate meaningful tension and responsibility through slow decisions under partial information, without combat, action loops, or progression stats?

This proposal translates the current conceptual framework into a repeatable, low-cost validation format.

Implementation reference runtime: [`/prototype/mra-v0`](../../prototype/mra-v0).

---

## 2. Scope of the Artifact

### Included (must exist in v0.1)
- Turn-based decision loop (discrete time steps)
- Partial/noisy information output
- Persistent consequences across turns
- Three core decisions: **advance**, **wait**, **descend**
- Environment-driven pressure (weather + terrain + exposure)
- Functional body state (not health bar)

### Excluded (must not exist in v0.1)
- Combat systems
- Skill trees / XP / leveling
- Branching narrative complexity
- Polished audiovisual layer
- Real-time traversal

This strict reduction keeps the artifact falsifiable and inexpensive.

---

## 3. Reproducibility Definition

A run is considered reproducible when:
- It starts from a documented initial state
- It uses a documented random seed (or deterministic lookup table)
- It applies identical turn rules
- It outputs a comparable event/state log

Reproducibility here does **not** mean identical player choices.
It means identical system behavior under equal conditions.

---

## 4. Minimal System Set

The MRA should implement only these interacting layers:

1. **Environment Layer**
   - Weather severity (0-3)
   - Visibility quality (0-3)
   - Terrain load (0-3)

2. **Body Layer**
   - Functional capacity (0-100)
   - Fatigue (0-100)
   - Exposure accumulation (0-100)

3. **Resource Layer**
   - Water units
   - Food units
   - Rest opportunity (binary per turn)

4. **Information Layer**
   - Imperfect readings (trend + uncertainty tag)
   - No omniscient risk score

5. **Decision Layer**
   - Advance / Wait / Descend
   - Consequence propagation to next turn

---

## 5. Turn Loop Specification

Each turn must execute in this order:

1. **Generate/resolve environment state**
2. **Expose partial signals to player**
3. **Collect decision (advance / wait / descend)**
4. **Apply systemic consequences**
5. **Persist resulting state and log output**

### Turn Duration
- One turn = one significant expedition time slice (e.g., half-day)
- A short scenario should last 8-16 turns

---

## 6. Input and Output Contract

### Required Inputs
- Scenario ID
- Initial state block
- Random seed
- Decision sequence (manual or test script)

### Required Outputs
- Structured log (`.csv` or `.jsonl`) with:
  - turn index
  - observed signals
  - player decision
  - resulting state deltas
  - threshold events triggered
- End-state summary:
  - outcome class: **stabilized / retreated / deteriorated / aborted**
  - total turns survived
  - key constraint that ended run

---

## 7. Success and Failure Criteria for the Artifact

### Evidence of Validity
- Players hesitate and justify choices in environmental terms
- Waiting and retreat are used as intentional strategies
- Runs diverge meaningfully through accumulated consequences
- Players can explain loss of control before collapse

### Evidence of Structural Failure
- One dominant strategy wins most runs
- Uncertainty feels random instead of interpretable
- Outcomes feel detached from player decisions
- Engagement depends on imagined stakes, not system response

---

## 8. Suggested Scenario Pack (v0.1)

Use exactly three scenarios:

1. **Narrow Weather Window**
   - Favorable start, rapid deterioration risk
2. **False Stability Terrain**
   - Mild weather, high terrain load over time
3. **Accumulated Fatigue Trap**
   - Manageable conditions, long-term body degradation

Each scenario should be executable with at least 3 predefined seeds.

---

## 9. Minimal Data Model (Reference)

```yaml
state:
  turn: int
  altitude_band: low|mid|high
  weather_severity: 0..3
  visibility: 0..3
  terrain_load: 0..3
  functional_capacity: 0..100
  fatigue: 0..100
  exposure: 0..100
  water: int
  food: int
  position: camp_a|camp_b|camp_c|route
  accumulated_flags: [string]
```

---

## 10. Validation Protocol

For each test session:
1. Run one scenario with one seed
2. Record decision-by-decision player rationale
3. Export system log
4. Classify run outcome
5. Fill a short debrief template:
   - Which signal influenced your choice?
   - When did uncertainty become uncomfortable?
   - Why did you continue, wait, or descend?
   - At what point did you feel consequences became irreversible?

Minimum recommended sample per iteration: **5-8 runs**.

---

## 11. Implementation Options (Equivalent)

Any of these formats are valid if the contract is respected:
- Spreadsheet with deterministic rules + seed table
- Small CLI script (Python/JS)
- Paper prototype with lookup matrices and manual logging

Tool choice is secondary; reproducibility and interpretability are primary.

---

## 12. Exit Conditions (When to Move Beyond MRA)

Move to the next phase only if:
- At least two scenarios produce meaningful decision tension
- Retreat is repeatedly perceived as valid (not as failure-only)
- Partial information is legible without omniscient UI
- No single action pattern dominates all seeds

If these conditions are not met, iterate on:
- signal clarity
- degradation rate
- decision frequency

without violating core design pillars.

---

## 13. Final Note

This artifact is not a prototype of the full game.
It is a **coherence test rig** for the project's foundational promise:

- environmental authority,
- partial information,
- persistent consequence,
- and meaningful limits.

If this rig fails, the design must be revised before scaling production.
