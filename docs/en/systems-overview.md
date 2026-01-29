# Systems Overview

> This document describes the systemic architecture of *Aconcagua: Stone Sentinel*.  
> It does not define technical implementation or formulas. Instead, it establishes  
> **which systems exist**, **what information they handle**, **how they interact**,  
> and **what kinds of decisions they generate**.  
>  
> Its role is to bridge the conceptual vision and early prototyping.

---

## Purpose of This Document

The systems overview answers a central question:

> **How is the conceptual experience of the game translated into coherent interactive systems?**

This document:
- Prevents mechanical contradictions.
- Allows viability assessment without writing code.
- Serves as a shared reference for design, prototyping, and external communication.

---

## Systemic Principles

Before detailing individual systems, the following principles apply globally:

1. **Environmental Primacy**  
   No system exists independently of the terrain and atmospheric conditions.

2. **Situated Information**  
   Systems provide signals and trends, not certainties.

3. **Persistent Consequence**  
   Decisions leave lasting effects that compound over time.

4. **Limited Complexity**  
   Few deeply interconnected systems are preferred over many shallow ones.

---

## Subsystems Overview

For design purposes, the game is structured around a small number of tightly coupled subsystems.  
Each one governs a different aspect of the ascent, but meaning only emerges through their interaction.

- **Environment (Mountain + Weather)**  
  Defines external conditions and constraints. Acts as an active agent rather than a backdrop.

- **Body (Physiological State)**  
  Represents the player’s capacity to function under altitude, exertion, and exposure.

- **Resources and Equipment**  
  Mediate preparation, trade-offs, and risk mitigation over time.

- **Information**  
  Channels partial, situated signals without eliminating uncertainty.

- **Decision and Consequence**  
  Translates player intent into persistent systemic effects.

No subsystem operates in isolation.  
All are designed to influence and constrain one another over time.

---

## Core Systems

### 1. Mountain System (Terrain)

**Role**  
Sovereign system. Defines the baseline conditions under which all other systems operate.

**Components**
- Altitude
- Terrain (slope, stability, surface type)
- Exposure
- Distance between safe points

**Produces**
- Movement constraints
- Increased physical strain
- Contextual risks (falls, disorientation)

**Does Not Produce**
- Arbitrary damage
- Scripted events disconnected from terrain

---

### 2. Weather System

**Role**  
Dynamic, probabilistic system that modifies the state of the mountain. Weather can shift rapidly and unexpectedly.

**Components**
- Wind
- Temperature
- Cloud cover / visibility
- Precipitation

**Produces**
- Changes in environmental legibility
- Variations in movement cost
- Shifts in short- and mid-term risk

**Key Characteristics**
- Never fully predictable
- Anticipated through signals
- Operates in temporal windows rather than fixed cycles

---

### 3. Physiological System (Body)

**Role**  
Represents the body’s adaptation—or failure to adapt—to altitude and exertion.

**Components**
- Heart rate
- Oxygen saturation
- Accumulated fatigue
- General functional state

**Produces**
- Reduced performance
- Increased likelihood of errors
- Need for rest, acclimatization, or descent

**Key Principle**  
There is no traditional “health bar.”  
Only **variable functional capacity**.

---

### 4. Resource System

**Role**  
Mediates the relationship between planning and contingency.

**Components**
- Water
- Food
- Rest
- Available energy

**Produces**
- Stabilization or deterioration of the physiological system
- Strategic decisions to advance, wait, or retreat

**Note**  
Resources are not optimized to maximize progress, but to **preserve decision margin**.

---

### 5. Equipment System

**Role**  
Translates preparation into physical consequences.

**Components**
- Total carried weight
- Insulation layers
- Protection against wind and precipitation
- Tools and specialized gear

**Produces**
- Modified movement cost
- Altered exposure to weather
- Trade-offs between safety, fatigue, and flexibility

---

### 6. Information System (Interface)

**Role**  
Channels signals from other systems without resolving uncertainty.

**Components**
- Diegetic device (watch-like interface)
- Environmental cues
- Player records and logs

**Produces**
- Trends and tendencies
- Implicit alerts
- Partial situational awareness

**Does Not Produce**
- Absolute certainty
- Omniscient indicators

---

### 7. Decision and Consequence System

**Role**  
Connects player actions to persistent effects across systems.

**Components**
- Player choices
- Accumulated states
- Risk thresholds

**Produces**
- Gradual consequences
- Long-term changes to future conditions

**Key Principle**  
Consequences do not punish.  
They **inform and condition** future decisions.

---

## System Interactions (Simplified View)

- **Weather** modifies the **mountain**.
- The **mountain** loads the **body**.
- The **body** constrains **decisions**.
- **Decisions** affect resources, exposure, and future states.
- **Information** never reveals the full system state.

No system operates independently.  
All feedback is cross-linked and cumulative.

---

## Key Feedback Loops

The behavior of the game emerges from a small number of feedback loops.  
These loops explain how risk, adaptation, and failure arise without scripted events.

### R1 — Cold Exposure Spiral (Reinforcing)

Increased wind and low temperatures reduce perceived warmth.  
As body temperature drops, physical and mental dexterity decline, increasing exposure time.  
Longer exposure further amplifies heat loss, reinforcing the loop.

---

### B1 — Equipment Mitigation Loop (Balancing)

Adequate insulation and protection reduce heat loss.  
Stable body temperature preserves functional capacity, enabling clearer decisions and reduced exposure.

---

### R2 — Fatigue and Terrain Loop (Reinforcing)

Steep or unstable terrain increases energy expenditure.  
Accumulated fatigue slows movement, extending exposure time and further increasing exertion.

---

### B2 — Progressive Acclimatization (Balancing, Long-Term)

Gradual ascent combined with rest improves physiological adaptation.  
Improved adaptation reduces altitude-related penalties, stabilizing performance over time.

---

### R3 — Mental Load and Risk Perception (Reinforcing)

Adverse conditions and fatigue increase cognitive load.  
Elevated stress distorts risk perception, leading to poorer decisions and escalating danger.

---

## Typical Decision Loop

1. Reading signals (weather, body, environment)
2. Interpretation under uncertainty
3. Choice (advance, wait, descend)
4. Immediate consequence
5. Persistent consequence

This loop repeats with no guarantee of linear improvement.

---

## Why This Matters for Gameplay

These systemic interactions shape the player experience in concrete ways:

- There is no single failure point.  
  Outcomes emerge from accumulated conditions, not isolated mistakes.

- Time is a critical variable.  
  Staying longer in adverse conditions often matters more than any single action.

- Preparation is meaningful, but never absolute.  
  Equipment and resources mitigate risk; they do not eliminate it.

- The mountain acts as an active system.  
  The player does not overcome it, but negotiates with it.

The game is not about mastering mechanics, but about learning to read a system under uncertainty.

---

## What This Document Does Not Define

- Mathematical formulas
- Final UI layouts
- Numerical balance
- Technical implementation

Those belong to later development stages.

---

## Intended Use

This document should be used to:
- Design paper or low-fidelity digital prototypes
- Evaluate new mechanics
- Explain the game to technical collaborators
- Verify coherence with the design pillars

---

## Final Note

The systems of *Aconcagua: Stone Sentinel* are not designed to simulate the mountain in its entirety,  
but to **recreate the experience of deciding under its conditions**.

The system is not meant to be mastered, but to be read.
