# Documentation Navigation Guide

Quick decision tree for finding the right documentation in this repository.

---

## I want to understand...

### **What this project is about**
- **Vision & design rationale**: [`meta/project-whitepaper.md`](../meta/project-whitepaper.md)
- **Quick overview**: [`README.md`](../README.md) (EN) or [`README.es.md`](../README.es.md) (ES)
- **Design pillars**: [`docs/en/design-pillars.md`](./en/design-pillars.md) (EN) or [`docs/es/pilares-de-diseno.md`](./es/pilares-de-diseno.md) (ES)

### **How the simulation engine works**
- **EP/BT mechanics & turn pipeline**: [`docs/simulation_engine.md`](./simulation_engine.md)
- **Code flow & data sources**: [`docs/architecture.md`](./architecture.md)
- **Pressure model details**: See "Environmental Pressure" and "Body Tolerance" sections in `simulation_engine.md`

### **The codebase structure**
- **Repository overview**: [`README.md`](../README.md) § Repository structure
- **Prototype-specific details**: [`prototype/web-v1/README.md`](../prototype/web-v1/README.md)
- **Module organization**: See expanded structure table in README (includes `engine/`, `ui/`, `state/`)

### **How to contribute**
- **Contribution policy & validation**: [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- **AI agent instructions**: [`AGENTS.md`](../AGENTS.md)
- **AI operations hub**: [`docs/ai/README.md`](./ai/README.md)
- **Public readiness checklist**: [`docs/en/public-readiness-checklist.md`](./en/public-readiness-checklist.md)

### **Game design & mechanics**
- **Design + implementation**: [`docs/en/consolidated-design-v1.4.md`](./en/consolidated-design-v1.4.md) (EN) or [`docs/es/diseno-consolidado-v1.4.md`](./es/diseno-consolidado-v1.4.md) (ES)
- **Systems overview**: [`docs/en/systems-overview.md`](./en/systems-overview.md) (EN) or [`docs/es/vision-de-sistemas.md`](./es/vision-de-sistemas.md) (ES)
- **Balance calibration notes**: [`docs/balance-calibration-notes.md`](./balance-calibration-notes.md)

### **Data contracts & JSON schemas**
- **Data contracts guide**: [`docs/data-contracts-guide.md`](./data-contracts-guide.md)
- **Validation schemas**: [`data/contracts/`](../data/contracts/)
- **Model contract reference**: [`docs/model-contract.md`](./model-contract.md)

### **Characters & scenarios**
- **Character profiles**: [`docs/es/Personajes_v_3.md`](./es/Personajes_v_3.md) (ES canonical) or [`docs/en/characters_v_3_en.md`](./en/characters_v_3_en.md) (EN)
- **Scenario configuration**: [`data/scenarios.web-v1.json`](../data/scenarios.web-v1.json)
- **Character events**: [`data/character_events.json`](../data/character_events.json)

### **Visual assets & branding**
- **Concept art catalog**: [`docs/concept-art-catalog.md`](./concept-art-catalog.md) (13 curated scenes with usage notes)
- **Character portraits**: [`art/characters/`](../art/characters/)
- **Cover art**: [`art/cover/`](../art/cover/)
- **Design system & typography**: [`docs/design-system.md`](./design-system.md) (visual tokens, color palette, type scale)

### **Testing & validation**
- **Running tests**: See `npm test` and related commands in [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- **Scripts documentation**: [`scripts/README.md`](../scripts/README.md) (all utility scripts explained)
- **Monte Carlo simulation**: `npm run simulate` (see [`scripts/monte-carlo-web-v1.js`](../scripts/monte-carlo-web-v1.js))
- **Acceptance tests**: [`prototype/web-v1/tests/engine/systemic-acceptance.test.js`](../prototype/web-v1/tests/engine/systemic-acceptance.test.js)
- **Contract tests**: [`prototype/web-v1/tests/parity/dual-prototype-contract.test.js`](../prototype/web-v1/tests/parity/dual-prototype-contract.test.js)

### **Deployment & operations**
- **Deploy & routing guide**: [`docs/deploy-routing.md`](./deploy-routing.md) (local server, Vercel, CORS)
- **Deep-link reference**: [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md) (all prototype screens via URL)
- **Operations support**: [`docs/operations-support.md`](./operations-support.md) (troubleshooting & release commands)
- **Troubleshooting**: [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

### **Geological & real-world reference**
- **Geological foundation**: [`docs/es/biblia-geologica-aconcagua.md`](./es/biblia-geologica-aconcagua.md) (ES) or [`docs/en/geological-bible-aconcagua.md`](./en/geological-bible-aconcagua.md) (EN)
- **Reality reference**: [`docs/en/aconcagua-reality-reference.md`](./en/aconcagua-reality-reference.md) (EN) or [`docs/es/referencia-realidad-aconcagua.md`](./es/referencia-realidad-aconcagua.md) (ES)

### **Project status & roadmap**
- **Canonical repo truth**: [`docs/repo-truth.md`](./repo-truth.md) (version, roster, status contract)
- **Public roadmap**: [`meta/public-roadmap.md`](../meta/public-roadmap.md)
- **Changelog**: [`CHANGELOG.md`](../CHANGELOG.md) (complete change history)
- **Technical debt register**: [`docs/technical-debt-register.md`](./technical-debt-register.md)

### **Governance & policies**
- **Security policy**: [`SECURITY.md`](../SECURITY.md)
- **Code of conduct**: [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md)
- **License**: [`LICENSE.md`](../LICENSE.md) (CC BY-NC-ND 4.0)
- **AI use statement**: See "On AI use" section in README or [`meta/press-kit.md`](../meta/press-kit.md)

---

## By role

### **New contributor**
1. [`README.md`](../README.md) — understand what the project is
2. [`CONTRIBUTING.md`](../CONTRIBUTING.md) — learn contribution process
3. [`AGENTS.md`](../AGENTS.md) — read operational instructions

### **Game designer**
1. [`meta/project-whitepaper.md`](../meta/project-whitepaper.md) — understand vision
2. [`docs/en/design-pillars.md`](./en/design-pillars.md) — learn design principles
3. [`docs/en/consolidated-design-v1.4.md`](./en/consolidated-design-v1.4.md) — see design + implementation

### **Engineer / developer**
1. [`docs/architecture.md`](./architecture.md) — understand code flow
2. [`docs/simulation_engine.md`](./simulation_engine.md) — learn EP/BT mechanics
3. [`docs/data-contracts-guide.md`](./data-contracts-guide.md) — work with data schemas
4. [`CONTRIBUTING.md`](../CONTRIBUTING.md) — validation commands

### **AI agent**
1. [`AGENTS.md`](../AGENTS.md) — mandatory session start
2. [`docs/ai/README.md`](./ai/README.md) — AI operations hub
3. [`docs/en/public-readiness-checklist.md`](./en/public-readiness-checklist.md) — pre-release validation

### **Playtester**
1. Play the game: https://aconcaguastonesentinel.com/
2. [`docs/es/guia-observacion-playtest.md`](./es/guia-observacion-playtest.md) — observation guide (ES)
3. [`prototype/mra-v0/debrief-template.md`](../prototype/mra-v0/debrief-template.md) — session debrief template

### **Researcher / academic**
1. [`meta/project-whitepaper.md`](../meta/project-whitepaper.md) — project foundation
2. [`docs/es/biblia-geologica-aconcagua.md`](./es/biblia-geologica-aconcagua.md) — geological reference
3. [`docs/simulation_engine.md`](./simulation_engine.md) — simulation mechanics
4. [`docs/balance-calibration-notes.md`](./balance-calibration-notes.md) — calibration rationale

---

## Quick lookups

### Commands
- **Run locally**: `python3 -m http.server 4173` → http://localhost:4173/prototype/web-v1/
- **Run tests**: `npm test`
- **Run simulation**: `npm run simulate`
- **Type check**: `npm run typecheck`
- **Validate JSON**: `npm run validate:json`

### Key files
- **Main entry point**: [`index.html`](../index.html) (public landing)
- **Prototype entry**: [`prototype/web-v1/index.html`](../prototype/web-v1/index.html)
- **Turn resolver**: [`prototype/web-v1/engine/turn-resolution.js`](../prototype/web-v1/engine/turn-resolution.js)
- **Data loader**: [`prototype/web-v1/ui/helpers/data-config.js`](../prototype/web-v1/ui/helpers/data-config.js)

### Data files (simulation source of truth)
- **Route nodes**: [`data/nodes.json`](../data/nodes.json)
- **Characters**: [`data/characters.json`](../data/characters.json)
- **Scenarios**: [`data/scenarios.web-v1.json`](../data/scenarios.web-v1.json)
- **Outcomes**: [`data/outcomes.json`](../data/outcomes.json)
- **Pressure config**: [`data/environmental_pressure_config.json`](../data/environmental_pressure_config.json)

---

## Still can't find what you need?

- Check [`CHANGELOG.md`](../CHANGELOG.md) for recent changes
- Review [`docs/repo-truth.md`](./repo-truth.md) for canonical status
- Search the repository for keywords
- Contact: aconcaguastonesentinel@gmail.com
