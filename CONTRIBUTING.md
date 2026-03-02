# Contributing to Aconcagua: Stone Sentinel

Thank you for your interest in this project.

This is a curated, author-driven repository. External contributions are welcome within defined boundaries. Please read this document before opening a pull request.

---

## Language Policy

- **English is the canonical language** for all code, documentation, and commit messages.
- Spanish documentation is maintained as a parallel layer (`README.es.md`, `docs/es/`) and updated alongside the English originals.
- Do not open PRs that add Spanish-only content to files that do not already have a Spanish counterpart.

---

## Repository Structure

| Directory | Purpose |
|---|---|
| `/docs/en` + `/docs/es` | Formal design documents (concept, pillars, systems) |
| `/devlog` | Design intent and process notes (English, chronological) |
| `/meta` | Roadmap, whitepaper, visibility artifacts |
| `/prototype/mra-v0` | Python simulator, scenarios, tests, run logs |
| `/prototype/web-v1` | Interactive web prototype (standalone HTML/JS/CSS) |
| `/art` | Curated visual references — no production assets |

---

## Running the Tests

**Python simulator (requires Python 3.11+):**
```bash
pip install -r requirements-dev.txt
pytest prototype/mra-v0/test_simulator.py -v
```

**Web-v1 contract tests (requires Node.js 18+):**
```bash
npm test
```

## Scenario schema validation

Scenario JSON files in `prototype/mra-v0/scenarios/` must follow `scenario.schema.json`.

Quick validation snippet:

```bash
python3 - <<'PY'
import json
import sys
from pathlib import Path

sys.path.insert(0, 'prototype/mra-v0')
from simulator import validate_scenario

for p in Path('prototype/mra-v0/scenarios').glob('*.json'):
    validate_scenario(json.loads(p.read_text(encoding='utf-8')), source=p)
print('all scenarios valid')
PY
```

Both suites run automatically on every push via GitHub Actions (`.github/workflows/ci.yml`).

---

## What Belongs in a PR

**Accepted:**
- Bug fixes to `simulator.py` with a corresponding regression test
- New scenario files in `prototype/mra-v0/scenarios/` following the existing JSON schema
- Documentation corrections (typos, factual errors, broken links)
- Improvements to the web-v1 UI that do not alter the mechanic contracts tested in `new-mechanics.test.js`

**Requires prior discussion (open an issue first):**
- Changes to design pillars or concept document
- New external dependencies (Python or JS)
- Modifications to `classify_outcome()` outcome taxonomy
- Changes to the `art/` directory
- Alterations to existing scenario seeds or `max_turns`

---

## Commit Message Format

Use concise, lowercase imperative messages:
```
fix: correct fatigue divisor in apply_decision
feat: add optimal-conditions scenario for balance validation
docs: update roadmap stage 4 status to completed
test: add balance regression guards for summit outcome
```

Prefix options: `fix`, `feat`, `docs`, `test`, `refactor`, `chore`.

---

## Contact

For design proposals, collaboration inquiries, or questions outside the scope of code:

**Ernesto Gallegos** — ernestogallegos@gmail.com
