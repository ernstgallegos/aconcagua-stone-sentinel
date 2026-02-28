# Aconcagua: Stone Sentinel

**A narrative–systemic indie game about limits, environment, and the decision to continue.**

*Aconcagua: Stone Sentinel* is an indie, single-player game inspired by the real ascent of Mount Aconcagua. It proposes a slow, deliberate, and systems-driven experience in which the player does not conquer the mountain, but learns to read it, adapt to it, and decide when advancing is no longer the right choice.

Reaching the summit is only one of several valid outcomes.

---

**Project Whitepaper**  
Start here to understand the vision and design rationale behind *Aconcagua: Stone Sentinel*:  
→ [`/meta/project-whitepaper.md`](meta/project-whitepaper.md)

---

## One-Sentence Pitch

A narrative and systemic indie game that recreates the ascent of Aconcagua through realism-driven mechanics, where the player manages body, climate, and environment to decide how far to go.

---

## Core Idea

The mountain is the central system and the highest authority.

Geography, altitude, weather, and physical limits actively shape every decision. Progress does not emerge from leveling up or acquiring abstract attributes, but from learning how to interpret signals, manage risk, and recognize boundaries.

Uncertainty, partial information, and irreversible consequences are core elements of the experience.

---

## Design Pillars

_Aconcagua: Stone Sentinel_ is designed as a systemic experience.

Climate, terrain, equipment and the player’s physical and mental condition interact through feedback loops, shaping risk, adaptation and decision-making over time.

### 1. The Mountain Governs
Altitude, terrain, and climate are active systems that condition every action. The game design adapts to real geography rather than abstract level design.

### 2. Partial Information
The player accesses physiological and environmental data through a limited, diegetic interface (a watch-like device). Certainty is never absolute.

### 3. Learning by Doing
There are no levels or character attributes. Progression emerges from observation, experience, and informed decision-making under changing conditions.

### 4. Active Contemplation
Observation, pauses, and environmental awareness are not interruptions but core mechanics. Silence, scale, and time are meaningful design elements.

---

## What This Game Is Not

- Not an action game  
- Not a technical mountaineering simulator  
- Not a heroic power fantasy  
- Not a survival game focused on crafting loops  

Realism is expressed through systems and mechanics, not through technical spectacle or excessive simulation.

---

## High-Level Progression Structure

1. **Normal Route — Assisted Expedition**  
   Introduction to systems with logistical support and buffered consequences.

2. **Less Assisted Ascents**  
   Increased autonomy, critical decisions, and direct consequences.

3. **Solo Mode — Extreme Technical Route**  
   Full autonomy, no assistance, and no guarantees. The definitive experience.

---

## Legal and Ethical Framework

- The real geography of Mount Aconcagua and its main routes is represented faithfully.
- No real people, brands, or commercial entities are depicted.
- Historical and cultural elements are treated with a documentary, non-promotional approach.
- Risk and death are not romanticized.
- The game does not force the player to reach the summit.

Turning back, stopping, or failing are valid and meaningful outcomes.

---

## Project Status

This repository documents the **conceptual and design foundations** of the project, and includes a **functional low-fidelity prototype** for core hypothesis validation.

- A minimal reproducible artifact (MRA v0) is available in `/prototype/mra-v0/`.
- The prototype implements the turn-based decision loop described in the MRA proposal.
- Validation scenarios with reproducible seeds are included.
- No production gameplay code is public at this stage.

See [`/prototype/mra-v0/README.md`](./prototype/mra-v0/README.md) for run instructions.

This is a curated, public-facing repository, not a complete production archive.

---


## Web Run Viewer v1 (Vercel-ready)

This repository includes a lightweight **run replay viewer** that visualizes pre-recorded MRA v0 simulation runs. It is not an interactive game: it renders the turn-by-turn output of bundled JSONL run files as a readable timeline.

The viewer also contains a parallel interactive prototype (`prototype/web-v1/index.html`) with an extended mechanic set — including a diegetic clock, sleep actions, stages, and forced bivouac — that diverges intentionally from the Python MRA v0 simulator. That divergence is documented in [`/prototype/web-v1/DEV_NOTE.md`](./prototype/web-v1/DEV_NOTE.md).

Included files:

- `prototype/web-v1/index.html` — experimental self-contained UI (inline CSS/JS)
- `index.html`, `styles.css`, `app.js` — latest root static client UI
- `api/run.js` — serverless API that serves bundled run files from `prototype/mra-v0/runs/`
- `vercel.json` — Vercel runtime and routing configuration

### Local preview

From repository root:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/prototype/web-v1/`.

In this local static mode, the UI reads bundled JSONL files directly from `prototype/mra-v0/runs/` (no serverless API needed).

### Vercel deploy

- Import this repository in Vercel.
- **Project Settings → Root Directory:** keep it at the repository root (`.`), not `prototype/mra-v0`.
- Framework preset: **Other** (static + serverless functions).
- No build command required for this vertical slice.
- Deploy. The latest UI is served from `/` (redirect to `/prototype/web-v1/index.html`) and consumes `/api/run`.

## Repository Structure

- [`/docs`](./docs) — Concept documents, design pillars, system overviews, and a minimal reproducible artifact proposal
- [`/art`](./art) — Curated concept art and visual references
- [`/devlog`](./devlog) — Design intent, scope decisions, and reflections
- [`/meta`](./meta) — Public roadmap, whitepaper and visibility notes

---

## Language Policy

- English is the canonical language of the project.
- Spanish documentation is provided as a parallel, contextual layer.

See [`README.es.md`](./README.es.md) for the Spanish version.

---

## License

This project is licensed under the  
**Creative Commons Attribution–NonCommercial–NoDerivatives 4.0 International License (CC BY-NC-ND 4.0).**

You are free to read, share, and reference the contents of this repository for non-commercial purposes.

You may not reuse, modify, redistribute, or commercialize any part of this project—including its concept, documentation, or artwork—without explicit permission.

For full details, see [`LICENSE.md`](./LICENSE.md).

---

## Contact

For professional inquiries, curatorial conversations, or collaboration proposals:

**Ernesto Gallegos**  
Project creator  
ernestogallegos@gmail.com

---

*Aconcagua: Stone Sentinel explores the idea that advancing does not always mean progressing, and that recognizing limits—external and internal—can be a form of success.*
