# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Root `package.json` with Node 18+ test script.
- `requirements-dev.txt` for Python development dependencies.
- Scenario JSON schema at `prototype/mra-v0/scenarios/scenario.schema.json`.
- New bundled run artifacts for `late-push` and `weather-window`.
- Expanded Python unit coverage for output contracts, outcome branches, observed signals, schema errors, and smoke tests.

### Changed
- Refactored simulator `apply_decision()` into smaller helper functions while preserving behavior.
- `cautious` policy early-advance threshold now scales with scenario `max_turns`.
- `run_all.py` now continues on per-run failures and exits non-zero if any run failed.
- JS contract tests migrated to Node's built-in `node:test` runner.
- README (EN/ES) clarified root viewer vs prototype web-v1 routes and Vercel redirect behavior.
- CI workflow now uses dependency caches and pinned action versions.

### Security
- Removed unsafe `innerHTML` rendering paths in root viewer `app.js`.
- Hardened `api/run.js` with CORS allowlist, `nosniff`, CSP, request rate limiting, and query length validation.
