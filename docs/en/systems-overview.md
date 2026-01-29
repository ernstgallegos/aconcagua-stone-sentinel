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
   No system exists independently of the terrain.

2. **Situated Information**  
   Systems provide signals, not certainties.

3. **Persistent Consequence**  
   Decisions leave lasting effects.

4. **Limited Complexity**  
   Few deeply connected systems are preferred over many shallow ones.

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
Dynamic, probabilistic system that modifies the state of the mountain.

**Components**
- Wind
- Temperature
- Cloud cover / visibility
- Precipitation

**Produces**
- Changes in environmental legibility
- Variations in movement cost
- Increasing or decreasing risk levels

**Key Characteristics**
- Never fully predictable
- Anticipated through signals
- Operates in temporal windows

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
- Increased error likelihood
- Need for rest or descent

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
- Decisions to advance, wait, or retreat

**Note**  
Resources are not optimized to maximize progress, but to **preserve decision margin**.

---

### 5. Equipment System

**Role**  
Translates preparation into physical consequences.

**Components**
- Total carried weight
- Insulation layers
- Protection
- Tools

**Produces**
- Modified movement cost
- Altered exposure to weather
- Trade-offs between safety and fatigue

---

### 6. Information System (Interface)

**Role**  
Channels signals from other systems without eliminating uncertainty.

**Components**
- Diegetic device (watch-like interface)
- Environmental cues
- Player records and logs

**Produces**
- Trends
- Implicit alerts
- Informational ambiguity

**Does Not Produce**
- Absolute certainty
- Omniscient indicators

---

### 7. Decision and Consequence System

**Role**  
Connects player actions to persistent effects.

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
- **Decisions** affect resources and future states.
- **Information** never reveals the full system state.

No system operates in isolation. All feedback is cross-linked.

---

## Typical Decision Loop

1. Reading signals (weather, body, environment)
2. Interpretation under uncertainty
3. Choice (advance, wait, descend)
4. Immediate consequence
5. Persistent consequence

This loop repeats with no guarantee of linear improvement.

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

The systems of *Aconcagua: Stone Sentinel* are not designed to simulate the mountain in its entirety, but to **recreate the experience of deciding under its conditions**.

The system is not meant to be mastered, but to be read.
