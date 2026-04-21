# Contributing to Aconcagua: Stone Sentinel

Thank you for your interest in this project.

This is a curated, author-driven repository. External contributions are welcome within defined boundaries. Please read this document before opening a pull request.

Before proposing public-facing/release hardening changes, complete:

- [`docs/ai/README.md`](./docs/ai/README.md) (canonical AI/agent operations hub)
- [`docs/en/public-readiness-checklist.md`](./docs/en/public-readiness-checklist.md)
- [`docs/es/checklist-preparacion-publica.md`](./docs/es/checklist-preparacion-publica.md)

For AI-assisted contributions, this checklist is mandatory (not advisory). PR descriptions must include explicit command evidence for each executed gate.
When creating/updating skills, follow [`docs/ai/skills/contributing-skills.md`](./docs/ai/skills/contributing-skills.md).

This project used AI for documents, programming assistance, and concept art in its initial public stage — as a starting tool, not an ideal. We will always prefer contributions from human collaborators. Full statement: [`meta/press-kit.md`](./meta/press-kit.md#on-ai-use).

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

**TypeScript/domain type checks (Node.js 18+):**
```bash
npm run typecheck
```

**Release deploy smoke check (canonical production URL by default):**
```bash
npm run smoke:release
```

Optionally pass a custom URL: `npm run smoke:release -- https://your-preview-url`

**Headless browser smoke test (requires Playwright browser install):**
```bash
python -m pip install -r requirements-dev.txt
python -m playwright install --with-deps chromium
pytest prototype/web-v1/tests/test_smoke_flow.py -v
```

If Playwright is not installed yet, the smoke suite now skips with a bootstrap hint instead of failing at import time.

**Python lint (ruff, same gate as CI):**
```bash
ruff check prototype/mra-v0/ --select=E,F,W --ignore=E501
```

## CI lint gate policy

- **Branch policy:** for `main` and pull requests targeting `main`, Python lint is a **blocking gate**.
- CI enforces `ruff check prototype/mra-v0/ --select=E,F,W --ignore=E501`.
- Ruff is pinned in `requirements-dev.txt`; CI installs it via `pip install -r requirements-dev.txt` (no ad hoc linter install in workflow steps).

## Scenario schema validation

Scenario JSON files in `prototype/mra-v0/scenarios/` must follow `scenario.schema.json`.

Portable validation commands:

```bash
python3 prototype/mra-v0/validate_all_scenarios.py
npm run validate:json
npm run validate:links
```

## Visual asset contribution guardrails

When touching files under `art/` or changing portrait/cover references in `prototype/web-v1`:

1. Keep filenames stable when possible (runtime mapping depends on canonical IDs).
2. If a filename must change, update the corresponding runtime mapping and tests in the same PR.
3. Run:
   ```bash
   npm test
   ```
   and verify `prototype/web-v1/tests/contracts/assets-contracts.test.js` passes.
4. For visible UI changes, include an updated screenshot artifact in the PR/final report.

Do not ship visual-asset reference changes without matching contract-test evidence.

## Serverless API CORS configuration

The API (`api/run.js`) supports `ALLOWED_ORIGINS` as a comma-separated list of exact origin matches.

- Configure it in **Vercel → Project Settings → Environment Variables**.
- Example:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

If `ALLOWED_ORIGINS` is not set, the function uses the repository's hardcoded dev default allowlist.

## Serverless API rate-limit backend (required in Vercel)

`api/run.js` uses distributed counters when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are configured (Upstash/Vercel KV REST API).

- In **Vercel environments**, distributed rate-limit config is mandatory; if missing, the API now fails closed with HTTP `503`.
- In local/dev environments, the handler falls back to in-memory counters for convenience.

Example environment variables:

```bash
KV_REST_API_URL=https://<your-kv-endpoint>.upstash.io
KV_REST_API_TOKEN=<your-read-write-token>
```

Manual rate-limit smoke checklist (when touching `api/run.js`):

1. Request the same run repeatedly from one IP and confirm `X-RateLimit-Remaining` decreases.
2. Confirm requests over the limit return `429` with `retry_after_ms`.
3. Wait for one rate window and confirm requests are accepted again.

Python tests, Python lint, JSON validation, web-v1 contract tests, and a headless browser smoke test (pull requests) run automatically via GitHub Actions (`.github/workflows/ci.yml`).

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

## Version bump and lockfile sync

When preparing a version bump, keep `package.json` and `package-lock.json` root metadata aligned in the same commit:

1. Update `package.json` `version`.
2. Regenerate the lockfile from current package metadata:
   ```bash
   npm install --package-lock-only
   ```
3. Run the lockfile/version consistency check:
   ```bash
   npm run check:lock-version
   ```
4. Run tests (`npm test`, plus other relevant suites) before opening the PR.

CI enforces this with `npm run check:lock-version` and will fail if `package.json.version` differs from `package-lock.json` root package version.

## Release PR debt review policy

Every release PR must review `docs/technical-debt-register.md` and update it when ownership, risk, symptoms, or exit criteria change.

When debt is paid down or intentionally extended, add a corresponding entry to `CHANGELOG.md` under `[Unreleased]`.

---

## Documentation consistency checklist (prevent version-title drift)

When a PR changes implementation status, flow wiring, or release phase labels, verify all of the following in the same PR:

- [ ] `CHANGELOG.md` `[Unreleased]` reflects the new implementation reality.
- [ ] Core docs include an up-to-date **Canonical status** block with links to `[Unreleased]` and the current implementation plan docs (`docs/en/implementation-plan-v1.4.md`, `docs/en/implementation-plan-v1.5.md`).
- [ ] Version labels in titles/headings (e.g., `v1.3`, `v1.4`) match current public state and include phase qualifiers when rollout is in progress.
- [ ] `README.md`, `README.es.md`, `docs/architecture.md`, and `prototype/web-v1/README.md` do not contradict each other on canonical prototype status.

## Public readiness enforcement policy

Every release-facing or public-readiness PR must:

- include completed checklist evidence from `docs/en/public-readiness-checklist.md` (or Spanish counterpart),
- include command output evidence for `npm run typecheck`, `npm test`, `pytest prototype/mra-v0/test_simulator.py -v`, `npm run validate:links`, and `npm run smoke:release` (or clearly justify why a gate is not applicable),
- keep `CHANGELOG.md` synchronized with the exact governance/docs/process changes shipped.

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

**Ernesto Gallegos** — aconcaguastonesentinel@gmail.com
