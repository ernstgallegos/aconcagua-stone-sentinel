# Aconcagua: Stone Sentinel — Press Kit

**Public document · April 2026**  
**Version:** 1.0  
**Status:** Public web prototype v1.5.1  
**Spanish version:** [`meta/press-kit.es.md`](./press-kit.es.md)

---

## One-sentence pitch

*Aconcagua: Stone Sentinel* is a contemplative indie game about reading signals, respecting limits, and making decisions that do not rewind — set on the highest peak outside Asia.

---

## Short description (1 paragraph)

*Aconcagua: Stone Sentinel* is a mountain-first narrative systems game developed as an independent project in Argentina. Players take on one of six expedition roles and attempt to navigate Aconcagua's environmental pressures, route constraints, and physiological realities in a turn-based structure built on a real Environmental Pressure / Body Tolerance model. The summit is one valid outcome among many — safe return, strategic retreat, and permit management carry equal narrative weight. The public web prototype (Part 1) is currently playable at [aconcaguastonesentinel.com](https://aconcaguastonesentinel.com).

---

## Key facts

| | |
|---|---|
| **Project name** | Aconcagua: Stone Sentinel |
| **Developer** | Independent / solo (Argentina) |
| **Platform** | Web (public prototype); target platforms TBD |
| **Genre** | Contemplative narrative / systems-driven |
| **Current release** | v1.5.1 — public web prototype (Part 1) |
| **Playable prototype** | [aconcaguastonesentinel.com](https://aconcaguastonesentinel.com) |
| **Repository** | [github.com/ernstgallegos/aconcagua-stone-sentinel](https://github.com/ernstgallegos/aconcagua-stone-sentinel) |
| **Press contact** | aconcaguastonesentinel@gmail.com |
| **Instagram** | [@aconcaguastonesentinel](https://www.instagram.com/aconcaguastonesentinel/) |
| **Languages** | English / Spanish |
| **Origin** | Based on real expedition experience (successful 360 Route ascent, January 2026) |

---

## Design pillars

**1. Environmental authority**  
Altitude, weather, route timing, and fatigue load shape every run. The mountain writes the rules; the player responds.

**2. Partial information**  
Signals are interpreted through confidence ranges, not omniscient dashboards. Perception degrades before collapse is visible.

**3. Plural outcomes**  
Summit-only success is an anti-design choice. Strategic retreat and safe return are valid endings with real mechanical and narrative weight.

**4. Contemplation as gameplay**  
Waiting, resting, observing, and choosing not to act are real actions with real consequences.

---

## What the game is not

- Not an action game set in the mountains.
- Not a survival game built around constant failure and punishment.
- Not a "soulslike" or "boss-fight" interpretation of mountaineering.
- Not empty-postcard tourism: the mountain is a system, not a backdrop.

---

## The characters (v1.5.1)

Six playable expedition roles with differentiated engine profiles:

| Character | Profile | Specialty |
|---|---|---|
| **Francisco Aguirre** | Argentine guide | Acclimatization, route reading |
| **Laura Kim** | Korean sport climber | Resource efficiency, speed |
| **Erik Lundvall** | Swedish veteran | Endurance, weather tolerance |
| **Daniela De Rossi** | Italian photographer | Perception clarity, photo actions |
| **Blake Harris** | American adventurer | Demanding profile, high risk/reward |
| **Irina Orlova** | Russian researcher | Systematic, strong permit management |

Each character has distinct engine parameters: perception latency, resource efficiency, acclimatization rate, risk posture, and functional capacity.

---

## The system (EP/BT model)

The game runs on a turn-resolver where:

1. The player chooses an action (advance, advance slowly, wait, descend, sleep, photo).
2. Environmental Pressure (EP) is calculated from altitude, weather, terrain, time of day, and exposure persistence.
3. Body Tolerance (BT) integrates fatigue, exposure, and functional capacity.
4. A perceived signal is generated from EP and BT through a confidence and trend layer (partial information).
5. The outcome is classified: progress, hold, retreat, or terminal event.

All parameters are data-driven (JSON files) and all claims are testable. The engine is fully decoupled from the UI.

---

## Technical transparency

- **381 automated tests** covering engine, UI helpers, API, and contract parity.
- **Monte Carlo simulation**: 1,500 headless runs validate structural integrity. No 0% summit rates across any character.
- **Open source**: full repository is public and auditable.
- **5 scenarios**: Assisted Route, Narrow Weather Window, False Stability Terrain, Accumulated Fatigue Trap, Weather Window.
- **10 route nodes** across 3 stages: Approach, High Camp, Summit Day.

---

## Cultural commitment

Aconcagua is not only a record to break. It is a territory layered with Andean cultural presence, ancestral routes, and Indigenous cosmological significance. The project takes a clear stance: no empty folklore, no ornamental local color. Human presence appears through traces, context, and carefully researched references — or not at all.

---

## Current state and roadmap

| Stage | Status |
|---|---|
| Part 1 — Web prototype (v1.5.1) | ✅ Public, playable |
| Part 2 — Narrative bridge | Preview unlocked after safe return; full Part 2 in development |
| Stage 7 — Direction evaluation | Planned (next phase) |
| Production platform(s) | TBD after direction lock |

See the public roadmap: [aconcaguastonesentinel.com](https://aconcaguastonesentinel.com) → Waypoints → Public Roadmap.

---

## Assets available

- Concept art: `/art/concept-art/` (see repository)
- Brand assets: `/art/brand/` (logo, favicon)
- Field Notes images: `/art/concept-art/curated/field-notes/` (10 curated images)
- Prototype screenshots: available on request

**Usage guidelines:** All visual assets are © 2026 Aconcagua: Stone Sentinel. Press use (editorial, reviews, features) is permitted with attribution. Commercial use requires written permission.

---

## Media contact

**Email:** aconcaguastonesentinel@gmail.com  
**Instagram:** [@aconcaguastonesentinel](https://www.instagram.com/aconcaguastonesentinel/)  
**Repository:** [github.com/ernstgallegos/aconcagua-stone-sentinel](https://github.com/ernstgallegos/aconcagua-stone-sentinel)

We respond to press inquiries, collaboration proposals, and coverage requests. Response time: 3–5 business days.

---

*Press kit version 1.0 · April 2026 · aconcaguastonesentinel.com*
