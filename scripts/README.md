# Scripts — Utility Tools

Validation, testing, and simulation utilities for the Aconcagua: Stone Sentinel project.

---

## Available Scripts

### Testing & Validation

#### `validate-json.js`
Validates all JSON files in the repository for syntax correctness.

**Usage:**
```bash
node scripts/validate-json.js
# or via npm:
npm run validate:json
```

**Purpose:** Ensures all data files (`data/*.json`, `package.json`, etc.) are valid JSON. Recursively walks the repository and reports any parse errors.

**Exit codes:**
- `0` — All JSON files valid
- `1` — One or more JSON files invalid

---

#### `run-webv1-tests.js`
Test runner for all web-v1 prototype tests.

**Usage:**
```bash
node scripts/run-webv1-tests.js
# or via npm:
npm run test:webv1
```

**Purpose:** Collects all `*.test.js` files under `prototype/web-v1/tests/` and runs them using Node's native test runner (`node --test`). Includes engine unit tests, acceptance tests, parity tests, and guardrails.

**Exit codes:**
- `0` — All tests passed
- `1` — One or more tests failed

---

#### `check-lock-version.js`
Verifies version consistency between `package.json` and `package-lock.json`.

**Usage:**
```bash
node scripts/check-lock-version.js
```

**Purpose:** Ensures the `version` field in `package.json` matches the `packages[""].version` field in `package-lock.json`. This prevents version drift during release processes.

**Exit codes:**
- `0` — Versions match
- `1` — Version mismatch detected

**When to run:** Before commits that change `package.json` version, or as part of CI validation.

---

#### `check-markdown-links.js`
Validates internal links in markdown documentation.

**Usage:**
```bash
node scripts/check-markdown-links.js
# Include temp directory:
node scripts/check-markdown-links.js --include-temp
```

**Purpose:** Scans all markdown files in `README.md`, `README.es.md`, and `docs/` for broken internal links. Ignores external URLs and hash anchors.

**Exit codes:**
- `0` — All internal links valid
- `1` — One or more broken links detected

**Checked files:** All `.md` files in:
- `README.md`
- `README.es.md`
- `docs/**/*.md`
- `temp/**/*.md` (only with `--include-temp` flag)

---

### Simulation & Analysis

#### `monte-carlo-web-v1.js`
Headless Monte Carlo simulator for web-v1 balance calibration.

**Usage:**
```bash
node scripts/monte-carlo-web-v1.js [--seeds N] [--output path]
# or via npm:
npm run simulate
```

**Purpose:** Runs automated gameplay simulations to generate balance calibration data. Simulates all 6 characters across all 5 scenarios with configurable seed counts per scenario.

**Default behavior:**
- **Seeds per scenario:** 50
- **Output:** `docs/playtest-results/monte-carlo-v<version>.md`
- **Policy:** `reasonablePolicy` (conservative AI player)

**Parameters:**
- `--seeds N` — Number of random seeds to test per scenario (default: 50)
- `--output path` — Custom output file path (default: versioned markdown in `docs/playtest-results/`)

**Output:** Markdown report with:
- Outcome distribution per character
- Win rates (Summit and Safe Return, High Point Return, etc.)
- Per-scenario breakdowns
- Run metadata (version, date, seed count)

**Note:** The AI policy is conservative and produces lower win rates (~0-20%) than human players (~8-30%). Use this tool for **regression detection**, not absolute calibration.

**Related documentation:**
- [`docs/balance-calibration-notes.md`](../docs/balance-calibration-notes.md) — Calibration targets and methodology
- [`docs/playtest-results/`](../docs/playtest-results/) — Historical Monte Carlo reports

---

### Deployment & Release

#### `release-smoke-vercel.js`
Smoke tests for deployed production builds.

**Usage:**
```bash
node scripts/release-smoke-vercel.js [base-url]
# or via npm:
npm run smoke:release
npm run smoke:release https://custom-domain.com
```

**Purpose:** Verifies critical paths in deployed builds. Checks that:
- Landing page (`/`) renders correctly
- Web-v1 prototype (`/prototype/web-v1/index.html`) loads with correct version marker
- Documentation deep-links are accessible

**Parameters:**
- `base-url` (optional) — URL to test (default: `https://aconcaguastonesentinel.com`)

**Exit codes:**
- `0` — All smoke tests passed (or skipped if network unreachable)
- `1` — One or more smoke tests failed

**Network handling:** Gracefully exits with status `0` if running in sandboxed/offline environments (ENOTFOUND, ECONNREFUSED, etc.), so local CI checks don't fail unnecessarily.

**Checks performed:**
1. Landing page contains "Play current web prototype" CTA
2. Web-v1 shell contains `id="screen-title"` and version marker
3. Deep-link documentation is accessible

---

#### `install-local-skill.sh`
Installs local AI agent skills for development.

**Usage:**
```bash
bash scripts/install-local-skill.sh
```

**Purpose:** Symlinks local agent skill definitions to the GitHub Copilot agent skills directory for testing custom agent behaviors during development.

**Target directory:** `.github/agents/skills/`

**Note:** This is a development-only utility for contributors working on custom AI agent skills.

---

## Common npm Script Aliases

These scripts are exposed via `package.json` for convenience:

```bash
# Testing
npm test                # Run all tests (API + web-v1)
npm run test:webv1      # Run web-v1 tests only
npm run test:api        # Run API tests (if available)
npm run test:contracts  # Run dual-prototype contract tests

# Validation
npm run validate:json   # Validate all JSON files
npm run typecheck       # TypeScript type-checking (no emit)

# Simulation & Analysis
npm run simulate        # Run Monte Carlo simulator

# Deployment
npm run smoke:release   # Smoke test production deployment
```

---

## Adding New Scripts

When adding new utility scripts:

1. **Use Node.js ESM format** (`.js` with ES modules)
2. **Add shebang line:** `#!/usr/bin/env node`
3. **Document in this README** with usage, purpose, and exit codes
4. **Add npm alias** in `package.json` if appropriate
5. **Include inline comments** explaining complex logic
6. **Handle errors gracefully** with clear error messages
7. **Follow existing patterns** for argument parsing and output formatting

---

## Related Documentation

- **Testing philosophy:** [`CONTRIBUTING.md`](../CONTRIBUTING.md) § Validation commands
- **Balance calibration:** [`docs/balance-calibration-notes.md`](../docs/balance-calibration-notes.md)
- **CI configuration:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- **Data contracts:** [`docs/data-contracts-guide.md`](../docs/data-contracts-guide.md)
