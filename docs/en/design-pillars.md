# Design Pillars

> This document defines the design pillars of *Aconcagua: Stone Sentinel* as **operational rules**.  
> It is not promotional material: it functions as the project’s constitution.  
> Each pillar establishes **what the game prioritizes**, **what it enables**, **what it forbids**, **how it manifests in practice**, and **how conflicts are resolved** when pillars compete.

---

## How to Read This Document

- **Pillar**: guiding principle.
- **Intent**: why it exists.
- **Design Implications**: concrete decisions it enforces.
- **Acceptance Criteria**: objective signals that the pillar is being respected.
- **Antipattern**: common ways the pillar is violated.
- **Micro-scenarios**: playable test cases to validate coherence.
- **Risks**: where the pillar can break and how to protect it.

---

## Pillar 1 — The Mountain Governs

### Statement
Geography, altitude, and weather are **active systems**. They do not accompany the experience; they determine it.

### Intent
To prevent the mountain from becoming a mere backdrop. The game is about **making decisions under external authority** (terrain + conditions). Difficulty does not come from enemies or puzzles, but from environmental reality and uncertainty.

### Design Implications
- Routes, camps, rests, and risks emerge from terrain, not abstract “levels”.
- Weather affects movement, visibility, consumption, planning, and risk.
- Altitude reduces error tolerance and amplifies consequences.
- Scale and exposure must be felt mechanically, not only visually.
- The environment can legitimately force retreat, stagnation, or failure.

### Acceptance Criteria
- Players can explain decisions in environmental terms.
- Weather and terrain create real dilemmas.
- Routes and camps feel like consequences of geography.
- Tension primarily comes from climate, fatigue, and uncertainty.

### Antipatterns
- Weather as visual decoration only.
- Omniscient maps or indicators.
- Arbitrary checkpoints.
- External threats replacing the environment as antagonist.

### Micro-Scenarios
**A. Short Weather Window**  
Leaving now allows progress but risks arriving exhausted with little margin.  
→ Test: no universally optimal choice.

**B. Deceptive Terrain**  
A slope looks stable but increases energy cost and slip risk.  
→ Test: terrain overrides planning.

### Risks and Safeguards
- Punitive realism → use gradual consequences.
- Oversimulation → limit variables, ensure clear feedback.

---

## Pillar 2 — Partial Information

### Statement
The player acts with **incomplete, noisy, and situated data**. The interface is diegetic, limited, and functional.

### Intent
To center interpretation and judgment rather than mathematical optimization. High-altitude mountaineering exists between what can be measured and what remains uncertain.

### Design Implications
- UI elements are part of the world (watch, notes, environmental cues).
- Measurements include error and variability.
- Qualitative signals matter (breathing, tremors, sound, wind).
- Emphasis on trends and patterns over exact values.
- Avoid survival-HUD metagame loops.

### Acceptance Criteria
- Players anticipate problems without explicit warnings.
- Outcomes cannot be predicted with full certainty.
- UI remains sparse, sober, and useful.

### Antipatterns
- Omniscient HUDs.
- Constant tutorial pop-ups.
- Magical minimaps and markers.

### Micro-Scenarios
**A. Ambiguous Physiological Reading**  
SpO₂ drops slightly, but the player feels fine.  
→ Test: no single metric dictates action.

**B. Conflicting Signals**  
Clear skies, but rising wind and sound cues.  
→ Test: interpretation over alerts.

### Risks and Safeguards
- Too much ambiguity → randomness.
- Too much certainty → optimization.

---

## Pillar 3 — Learning by Doing

### Statement
There are no levels or attributes. Progress emerges from **judgment, routine, and situated knowledge**.

### Intent
To avoid “RPG-ification” of mountaineering. The mountain does not grant buffs; it teaches decision-making—sometimes harshly.

### Design Implications
- The player improves, not the character.
- Repeated routines build habits.
- Mistakes teach and leave lasting impact.
- Unlocks are diegetic, not XP-based.

### Acceptance Criteria
- Repeating a section leads to improvement through understanding.
- New options arise from experience, not rewards.

### Antipatterns
- Skill trees.
- Magical loot.
- Numerical grinding.

### Micro-Scenarios
**A. Informed Repetition**  
The player departs earlier with better load distribution.  
→ Test: cognitive progress.

**B. Persistent Error**  
A bad decision causes a lasting limitation.  
→ Test: mistakes inform future play.

### Risks and Safeguards
- Lack of perceived progress → use logs and expanded responsibility.

---

## Pillar 4 — Active Contemplation

### Statement
Observing, stopping, and recording the environment are core actions. The game rewards attention, not haste.

### Intent
To sustain presence, scale, and silence as mechanics—not passive pauses.

### Design Implications
- Pauses involve cost/benefit tradeoffs.
- Recording is a practice of attention, not a checklist.
- Sound conveys information.
- Time advances; contemplation is never free.

### Acceptance Criteria
- The game can be played well without rushing.
- Observation meaningfully affects decisions.

### Antipatterns
- Checklist collectibles.
- Photo mode replacing mechanics.
- Passive cinematic contemplation.

### Micro-Scenarios
**A. Costly Observation**  
Documenting wildlife as weather deteriorates.  
→ Test: contemplation involves risk.

**B. Strategic Pause**  
Detecting wind change before an exposed traverse.  
→ Test: observation reduces danger.

### Risks and Safeguards
- Walking sim without tension.
- Task overload.

---

## Pillar Conflicts and Tie-Breaking Rules

When pillars conflict, apply these rules in order:

1. **The Mountain First**: if it weakens environmental authority, discard it.
2. **Situated Legibility**: if it cannot be read, simplify.
3. **Experience-Based Progression**: if it depends on stats, redesign.
4. **Active Contemplation**: if it breaks tone, reassess.

---

## Simulation Boundaries (What Is Not Simulated)

To preserve clarity, tone, and feasibility, the project deliberately does **not** simulate:
- Detailed metabolism or advanced nutrition (abstracted states).
- Hyper-specialized technical climbing.
- Exact physical modeling of all materials.
- Complex social or interpersonal dynamics.

The focus remains **decision-making under environmental conditions**.

---

## Glossary

- **Assisted**: ascent with logistical support and buffered consequences.
- **Mediated**: demanding environment with room for correction.
- **Probabilistic**: outcomes based on ranges and context.
- **Diegetic**: information embedded in the game world.
- **Persistent consequence**: an effect that carries forward and shapes future decisions.

---

## Final Notes

This document should be used to:
- Evaluate new mechanics.
- Detect incoherence.
- Justify exclusions.

Any significant change to a pillar must be versioned and justified.
