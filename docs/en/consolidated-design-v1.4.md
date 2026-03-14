# Aconcagua: Stone Sentinel — Consolidated Design Document

**Version:** 1.4  
**Date:** March 2026  
**Status:** Design and planning reference (documentation alignment)

---

## 1. Project vision

*Aconcagua: Stone Sentinel* is a single-player indie game focused on a narrative and systemic ascent of Cerro Aconcagua.

The player does not conquer the mountain; they learn to read it, adapt to it, and decide how far to go.

The true summit is not always the top. It is recognizing both personal and environmental limits and returning home safely.

### Design pillars (non-negotiable)

1. The mountain governs.
2. Information is always partial.
3. Progress emerges from learning by doing.
4. Safe return is a legitimate outcome.

---

## 2. Game structure

### 2.1 Playable prologue (current public version)

The prologue is a standalone playable teaser/public prototype. Prologue choices do not persist into story mode.

Prologue goals:
- Let players experience six character perspectives.
- Show that each character reads environment and risk differently.

### 2.2 Screen flow (v1.4)

In v1.4, the intermediate **Expedition Type** screen is removed. Mode selection (preset/random) is merged into scenario selection.

Target flow:
1. Home / Intro
2. Character selection
3. Scenario selection (includes mode)
4. Simulation
5. Debrief
6. Unlock or replay

### 2.3 Park permit

Each expedition uses a Provincial Park permit with a maximum duration of 20 days.

In simulation UI, the permit should appear in the right panel under the diegetic watch with:
- character name,
- photo/emblem,
- remaining days (countdown from Day 1).

### 2.4 Victory condition and Part 2 unlock

The only outcome that unlocks Part 2 is:
- **Summit and Safe Return**

All other outcomes end in standard debrief with replay options:
- High Point Return
- Strategic Retreat
- Collapse
- Rescue
- Fatality
- Permit Expired
- Expedition Window Closed

---

## 3. Six characters

Characters represent distinct yet plausible alpinist profiles within a commercial group expedition on the normal route.

### 3.1 Francisco Aguirre

- PE teacher from Mendoza.
- Dramatic drive: unresolved grief over his friend Mateo Villalba (Fitz Roy, 2022).
- Body-signal interpretation is distorted by persistent guilt.

Differential mechanic:
- Physical warning cues have lower UI prominence.
- Requires active interpretation of physiological state.

### 3.2 Laura Kim

Planning-oriented profile with strong procedural discipline and sensitivity to accumulated costs.

### 3.3 Erik Lundvall

Profile with tendency to overestimate situational stability during apparent control windows.

### 3.4 Daniela De Rossi

Observational profile focused on context reading and information return.

### 3.5 Blake Harris

Competitive push profile with risk of forward pressure decisions under objective fixation.

### 3.6 Irina Orlova

Her physical stats are the strongest, but her perceptual noise is the highest.

Key design note:
- `perceptionBias: 9`
- `riskTolerance: 1.48`

Character experience does not reduce difficulty; it relocates it.

---

## 4. Interpersonal relationships (prologue)

In the prologue, relationships are in their initial state (first contact or first hours).

They are expressed through:
- exchange tone,
- passive signals,
- trust/risk-reading micro-tensions.

Deeper development is reserved for Part 2+.

---

## 5. Expedition guides

The expedition is organized by **Stone Sentinel Expeditions** and led by two EPGAMT-certified guides (Mendoza).

- **Agustina Villanueva** — Lead guide
- **Alejandro Molina** — Assistant guide

---

## 6. Simulation engine and balance

### 6.1 Turn resolution pipeline (v1.3 base)

Authoritative function:

`resolveTurn(state, action)`

Sequence:

`Environment → Environmental Pressure (EP) → Acclimatization Deficit Check → Body Tolerance (BT) → Pressure Delta → Perception → Action Modifier → Outcome`

### 6.2 Data sources

System configuration is defined under `/data` (nodes, environmental pressure, stage/action modifiers, characters, outcomes).

### 6.3 Target win-rate distribution

Calibrated from 1,200 stochastic runs per character (80 replications × 15 scenario-seed pairs).
Full calibration notes in `docs/balance-calibration-notes.md`.

| Character | Summit & Safe Return | Strategic Retreat | Rescue | Collapse | Permit Expired |
|---|---:|---:|---:|---:|---:|
| Laura Kim | 4.6% | 82.9% | 4.1% | 4.6% | 3.8% |
| Francisco Aguirre | 3.5% | 79.5% | 5.9% | 5.0% | 6.1% |
| Irina Orlova | 3.2% | 72.2% | 7.3% | 7.4% | 9.8% |
| Erik Lundvall | 3.5% | 74.8% | 6.6% | 6.3% | 8.8% |
| Daniela De Rossi | 3.9% | 82.8% | 5.2% | 4.6% | 3.4% |
| Blake Harris | 3.1% | 59.9% | 14.8% | 13.9% | 8.3% |

**Balance rationale:** these values prioritize Strategic Retreat as the most frequent outcome
(55–83%) across all characters, consistent with Design Pillar 1 (The Mountain Governs) and
Pillar 4 (Active Contemplation). Summit rates are intentionally low (~3–5%); the correct
success loop is recognizing limits, not reaching the top.

**Active configuration values** (post-calibration, as of v1.4):

`data/stage_modifiers.json` — key multipliers:
- `HIGH_CAMP.fatigueMultiplier`: 1.24 · `HIGH_CAMP.exposureMultiplier`: 1.28
- `SUMMIT_DAY.fatigueMultiplier`: 1.42 · `SUMMIT_DAY.exposureMultiplier`: 1.50
- `SUMMIT_DAY.weatherSeverityBias`: 2 · `SUMMIT_DAY.confidencePenalty`: 18

`data/action_modifiers.json` — key values:
- `advance.fatigueMultiplier`: 1.18 · `advance.timeCost`: 110 min
- `advance_slowly.fatigueMultiplier`: 0.90 · `advance_slowly.timeCost`: 165 min
- `wait.fatigueMultiplier`: 0.62 · `wait.acclimatizationGain`: 4
- `sleep.fatigueRecovery`: 18 · `sleep.acclimatizationGain`: 7

`data/environmental_pressure_config.json` — key values:
- `baseCosts.fatigue`: 9 · `baseCosts.exposure`: 7
- `altitudePressureByBand[4]`: 100
- `summitOptimalEnd`: 630 min (10:30) · `summitLateStart`: 750 min (12:30)
- `bivouacPenalty.fatigue`: 26 · `bivouacPenalty.exposure`: 32

These values diverge from the pre-calibration spec in `one-shot-fase1-v1.4.md` by design.
The spec used conservative estimates; post-run calibration reduced punishment to recover
strategic retreat space and avoid collapse-dominant trajectories.

---

## 7. Implementation plan

### Phase 1 — Current sprint (implement now)

- Replace `data/characters.json` with six new characters.
- Add `Permit Expired` outcome.
- Add `G.permitDay` and `G.permitMaxDays = 20`.
- Implement permit UI.
- Reorder flow and remove `screen-mode`.
- Add special success screen for `Summit and Safe Return`.
- Add Part 2 selector (5 locked characters, Francisco active).
- Update `title-eyebrow` to `v1.3`.
- Bump `package.json` to `1.4.0`.
- Update `CHANGELOG` with `[1.4.0]`.

### Phase 2 — Next sprint

- Daniela photo mechanic (`shootPhoto()`).
- Character-specific decision windows.
- Late-activation risk indicators for Erik and Irina.
- Part 2 narrative screens (Mendoza hotel, group intro, guides, transfer, “To be continued”).
- Visual/UX improvements for external playtesting.

### Phase 3 — Publication prep

- 5–10 internal playtests of full flow (Part 1 + Part 2).
- Verify win-rate distribution with six characters.
- Deploy on Vercel with clean URL.
- Write short presentation paragraph for sharing.

---

## 8. Repository architecture (reference)

Document version: **1.4 — March 2026**.  
Suggested next update: after Phase 1 completion.
