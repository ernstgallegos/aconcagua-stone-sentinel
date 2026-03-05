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

Portable validation command:

```bash
python3 prototype/mra-v0/validate_all_scenarios.py
```

## Serverless API CORS configuration

The API (`api/run.js`) supports `ALLOWED_ORIGINS` as a comma-separated list of exact origin matches.

- Configure it in **Vercel → Project Settings → Environment Variables**.
- Example:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

If `ALLOWED_ORIGINS` is not set, the function uses the repository's hardcoded dev default allowlist.

Manual rate-limit smoke checklist (when touching `api/run.js`):

1. Request the same run repeatedly from one IP and confirm `X-RateLimit-Remaining` decreases.
2. Confirm requests over the limit return `429` with `retry_after_ms`.
3. Wait for one rate window and confirm requests are accepted again.

Both suites run automatically on every push via GitHub Actions (`.github/workflows/ci.yml`).

---

## Whitepaper PDF Sync Policy

- `meta/project-whitepaper.md` is the canonical whitepaper source.
- `meta/exports/project-whitepaper.pdf` is a manually generated artifact (not CI-generated).
- Any PR that modifies `meta/project-whitepaper.md` must also regenerate and commit `meta/exports/project-whitepaper.pdf` in the same PR to avoid markdown/PDF drift.
- Recommended export command:
  `pandoc meta/project-whitepaper.md --from gfm --pdf-engine=pdflatex -o meta/exports/project-whitepaper.pdf`

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
