# Audit Remediation Matrix — 2026-03-30

Sources reviewed:
- `temp/AUDITORIA_ACONCAGUA_COMPLETA_2026-03-30.md`
- `temp/Adutoria_aconcagua_2.md`

Status values: `FIXED`, `ALREADY CORRECT`, `NOT REPRODUCED`, `INTENTIONALLY DEFERRED`.

| Audit source | Finding summary | Status | Verification / evidence | Files touched | Test or evidence added | Resolution note |
|---|---|---|---|---|---|---|
| Auditoría 1 (BUG-C1) | Missing `/art` blocks release | ALREADY CORRECT | Repository contains cover, character, part-2, and curated concept assets; runtime uses those paths. | `prototype/web-v1/tests/contracts/assets-contracts.test.js` | New contract test validates critical assets and all character portraits. | Historical blocker no longer reproduces in repo state. |
| Auditoría 1 (BUG-M1) | `console.error` exposed in production | FIXED | Replaced direct calls in runtime paths with localhost-only diagnostic helper. | `prototype/web-v1/ui/screens.js` | Covered via existing screen/runtime tests (`npm test`). | Keeps diagnostics in dev while reducing noisy production logging. |
| Auditoría 1 (BUG-M2) | No startup visual-asset validation | FIXED | Added automated asset integrity contract checks in test suite. | `prototype/web-v1/tests/contracts/assets-contracts.test.js` | `npm test` now enforces visual asset existence pre-release. | Chosen as CI/test gate instead of startup network probing. |
| Auditoría 1 (BUG-M3) | Potential dead refs (`valentina`/`diego`) | ALREADY CORRECT | Current code/data contract uses canonical six-character roster; no active runtime references found. | `meta/audit-remediation-2026-03-30.md` | Evidence: repository search + passing tests. | Logged as resolved historically; no additional code change required. |
| Auditoría 1 (BUG-M4) | Flag emoji inconsistency | INTENTIONALLY DEFERRED | Known cross-platform rendering limitation is currently mitigated by desktop hide rule and text-first card identity. | `docs/technical-debt-register.md` | Debt register row updated with explicit note. | Requires non-trivial asset/UI strategy (SVG flag system) post-release. |
| Auditoría 1 (BUG-M5) | Deep-link race / premature init risk | ALREADY CORRECT | Startup boot already gates deep-link activation until required-data load succeeds. | `meta/audit-remediation-2026-03-30.md` | Evidence: existing startup smoke tests and routing tests. | No new race reproduced in current code path. |
| Auditoría 1 (BUG-M6) | RNG accepts invalid seeds | FIXED | Added numeric finite-seed guard in `mulberry32`; deep-link seed parsing now sanitizes invalid params. | `prototype/web-v1/engine/turn-resolution.js`, `prototype/web-v1/ui/screens.js` | Added `prototype/web-v1/tests/engine/rng-seed-validation.test.js`. | Prevents invalid seed drift into runtime RNG. |
| Auditoría 1 (BUG-M7) | UTF-8 node names may break IDs | ALREADY CORRECT | Node contract uses ASCII-safe `nodeId` for identity and UTF-8 `nodeName` for display. | `meta/audit-remediation-2026-03-30.md` | Evidence: `data/nodes.json` and route normalization behavior. | No bug reproduced; contract already matches recommendation. |
| Auditoría 1 (BUG-M8) | `pressureHistory` could leak | ALREADY CORRECT | Runtime already slices pressure history to rolling window (`slice(-5)`). | `meta/audit-remediation-2026-03-30.md` | Evidence: current `screens.js` behavior and passing tests. | Historical risk already remediated in current branch. |
| Auditoría 1 (Docs drift set) | Changelog/docs/version parity drift | FIXED | Updated changelog and added remediation documentation package for this sprint. | `CHANGELOG.md`, `meta/audit-remediation-2026-03-30.md`, `docs/TROUBLESHOOTING.md`, `docs/context-events-guide.md` | Command evidence recorded in final report and tests run. | Keeps repo/docs release narrative aligned with shipped checks. |
| Auditoría 2 (Setup quality) | First character appeared without image until carousel interaction | ALREADY CORRECT | Current carousel markup renders image element in initial card and portrait contract tests ensure assets exist. | `prototype/web-v1/tests/contracts/assets-contracts.test.js` | New asset test adds guard against regression. | No reproducible blank-first-card issue in current render path. |
| Auditoría 2 (Overlay perception) | Modal overlay felt “buttons frozen” | ALREADY CORRECT | Shared modal helper path with focus trap, body lock, and ESC close already integrated. | `meta/audit-remediation-2026-03-30.md` | Evidence: accessibility modal tests in existing suite. | No new runtime defect reproduced. |
| Auditoría 2 (Language clarity/accessibility) | i18n/accessibility polish incomplete | ALREADY CORRECT | Existing suite covers i18n parity and modal accessibility; docs now add troubleshooting guidance. | `docs/TROUBLESHOOTING.md` | Existing parity + accessibility tests run via `npm test`. | Maintained as ongoing quality area, not blocker in current state. |
| Auditoría 2 (Need practical docs) | Missing practical operator docs | FIXED | Added troubleshooting guide and context-events operation guide. | `docs/TROUBLESHOOTING.md`, `docs/context-events-guide.md` | Included in changelog and release evidence. | New docs cover startup, assets, deep-links, and context-event contracts. |
| Auditoría 2 (Release hardening automation) | Need automatic pre-release guards | FIXED | Added tests for RNG seed guard and visual asset contracts. | `prototype/web-v1/tests/engine/rng-seed-validation.test.js`, `prototype/web-v1/tests/contracts/assets-contracts.test.js` | Executed full readiness gate command set. | Extends CI/local detection for high-visibility failures. |

## Deferred items logged

- National flag rendering consistency was intentionally deferred and documented in `docs/technical-debt-register.md` due scope/priority tradeoff for this sprint.
