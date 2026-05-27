# Aconcagua: Stone Sentinel

**A narrative-systems indie game about the real ascent of Mount Aconcagua — uncertainty, consequence, and the uncomfortable decision to keep going or turn back in time.**

The mountain is the primary system and the final authority. You do not "defeat" it; you learn to interpret it, negotiate with it, and accept that sometimes wisdom looks a lot like retreat. Reaching the summit is only one of several valid outcomes.

![Aconcagua: Stone Sentinel — cover art](art/cover/ig/2.png)

| Francisco Aguirre | Daniela De Rossi | Erik Lundvall |
|---|---|---|
| ![Francisco](art/characters/francisco-aguirre.png) | ![Daniela](art/characters/daniela-de-rossi.png) | ![Erik](art/characters/erik-lundvall.png) |

---

## Play it now

The current public build is **v1.5.2** — a complete 30-minute expedition on the Normal Route with six playable characters, five scenarios, and a full EP/BT simulation engine.

Official site: **https://aconcaguastonesentinel.com/**

Run locally:

```bash
python3 -m http.server 4173
# Open: http://localhost:4173/prototype/web-v1/
```

See [`prototype/web-v1/README.md`](./prototype/web-v1/README.md) for full instructions.

---

## Repository structure

| Path | Description |
|------|-------------|
| `prototype/web-v1/` | **Active prototype** (v1.5.2) — interactive web client with full EP/BT simulation engine |
| ↳ `engine/` | Turn resolution (`resolveTurn`), pressure model (EP/BT), events system, game rules |
| ↳ `ui/` | Screen rendering (`screens.js`), game loop, flow controller, helpers (carousel, narrative, modals) |
| ↳ `state/` | Global game state management and state contracts |
| ↳ `tests/` | Engine unit tests, acceptance tests, parity tests, guardrails |
| `prototype/mra-v0/` | Frozen Python simulator (early hypothesis validation, historical reference) |
| `data/` | **Simulation data source of truth** — nodes, characters, scenarios, outcomes, pressure config, events |
| `docs/` | Architecture, simulation engine, design system, balance calibration, technical guides |
| ↳ `en/` | English design documentation (pillars, consolidated design, geological reference) |
| ↳ `es/` | Spanish design documentation (diseño consolidado, biblia geológica, personajes) |
| ↳ `ai/` | AI agent operations hub and manifest |
| `art/` | Concept art catalog (13 curated scenes), character portraits, brand assets, icons |
| `scripts/` | Monte Carlo simulator, test runners, validation utilities |
| `meta/` | Project whitepaper, public roadmap, press kit |
| `src/` | TypeScript type definitions (gradual adoption, type-checking only, no build output) |
| `api/` | Serverless API functions (Vercel deployment) |
| `devlog/` | Design decisions and development reflections |

---

## Key documentation

**Quick navigation guide**: [`docs/NAVIGATION.md`](./docs/NAVIGATION.md) — decision tree for finding any documentation by role or topic

### Core documents
- **[Whitepaper](meta/project-whitepaper.md)** — vision and design rationale
- **[Architecture](docs/architecture.md)** — engine flow and data source map
- **[Simulation engine](docs/simulation_engine.md)** — full EP/BT mechanics reference
- **[Repo truth](docs/repo-truth.md)** — canonical version/roster/status contract

### Design & implementation
- **[Consolidated design v1.4](docs/en/consolidated-design-v1.4.md)** — design + implementation plan ([ES](docs/es/diseno-consolidado-v1.4.md))
- **[Design pillars](docs/en/design-pillars.md)** — 4 core design principles ([ES](docs/es/pilares-de-diseno.md))
- **[Balance calibration](docs/balance-calibration-notes.md)** — tuning rationale and target bands

### Technical reference
- **[Data contracts guide](docs/data-contracts-guide.md)** — JSON schemas and validation
- **[Deep links](docs/deep-links.web-v1.md)** — every prototype screen via hash URL
- **[Deploy & routing](docs/deploy-routing.md)** — Vercel, local server, CORS reference

---

## Design pillars

1. **The Mountain Governs** — altitude, terrain, and climate are active rule-makers
2. **Partial Information** — the player reads clues through a constrained diegetic watch interface
3. **Learning by Doing** — no RPG levels, no stat inflation; progression through observation and repeated decisions
4. **Active Contemplation** — pauses, environmental awareness, and silence carry design weight

---

## Governance

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution policy, validation commands, CI gates
- [`SECURITY.md`](./SECURITY.md) — vulnerability reporting
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community behavior expectations
- [`docs/en/public-readiness-checklist.md`](./docs/en/public-readiness-checklist.md) — pre-release checklist
- [`docs/operations-support.md`](./docs/operations-support.md) — runtime/deep-link/overlay troubleshooting and release command quick-reference
- [`docs/en/accessibility-verification-checklist.md`](./docs/en/accessibility-verification-checklist.md) — focused accessibility verification checklist for public flows

---

## Language

English is the canonical project language. Spanish documentation is maintained in parallel. See [`README.es.md`](./README.es.md).

## On AI use

This project used AI assistance for documents, programming support, and concept art during its initial public stage — not as an ideal, but as the only viable starting tool. We will always prefer work by human artists and collaborators. Full statement: [`meta/press-kit.md`](./meta/press-kit.md#on-ai-use).

## License

**CC BY-NC-ND 4.0** — read, share, and reference for non-commercial purposes. See [`LICENSE.md`](./LICENSE.md).

## Contact

**Ernesto Gallegos** — aconcaguastonesentinel@gmail.com

---

*Advancing does not always mean progressing. Recognizing limits — external and internal — can be a form of success.*
