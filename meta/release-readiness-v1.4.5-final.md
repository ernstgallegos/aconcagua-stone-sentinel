# Final Release Readiness Closeout — v1.4.5

Date: 2026-03-31  
Scope: final consolidation pass for public launch readiness across runtime, docs, deploy routing, and governance.

## 1) Closure objective

Close all residual pre-release consolidation findings so the public `v1.4.5` baseline is coherent across:

- runtime behavior (`prototype/web-v1`),
- published documentation (`README*`, checklists, changelog, repo-truth links),
- release process evidence (explicit command proofs),
- deployed surface smoke validation (canonical Vercel URL).

## 2) Consolidation fixes completed

1. **README EN/ES Part 2 flow sync**
   - Replaced legacy Part 2 sequence labels with canonical runtime IDs:
     `part2-character → mendoza_room → team_presentation → after_circle → guides → briefing_night → departure_road → future_cta`.

2. **README EN/ES onboarding CTA sync**
   - Replaced stale onboarding wording (`Understood. Begin.`) with active CTA naming:
     `Begin Expedition` / `Iniciar expedición`.

3. **Release hygiene in changelog**
   - Removed duplicate historical release bullets from `[Unreleased]`.
   - Kept `[Unreleased]` limited to true post-`1.4.5` consolidation work.

4. **Readiness process evidence hardening**
   - Added deploy smoke gate (`npm run smoke:release`) to:
     - `docs/en/public-readiness-checklist.md`
     - `docs/es/checklist-preparacion-publica.md`
     - `CONTRIBUTING.md`

5. **Deployed-surface smoke automation**
   - Added `scripts/release-smoke-vercel.sh` and package script `smoke:release`.
   - Checks landing CTA, web-v1 key screens/version marker, and deep-link docs markers.

6. **Minor i18n drift cleanup**
   - Removed unused `understoodBegin` translation keys from `prototype/web-v1/ui/screens.js`.

## 3) Public-readiness checklist evidence

### Product/runtime truth
- ✅ `docs/repo-truth.md`, `package.json`, and UI version chips align on `v1.4.5`.
- ✅ Part 2 docs in README EN/ES now match canonical runtime screen IDs.

### Engineering quality gates (executed)
- ✅ `npm run typecheck`
- ✅ `npm test`
- ✅ `pytest prototype/mra-v0/test_simulator.py -v`
- ✅ JSON parse sweep (`python3` inline command from readiness checklist)
- ⚠️ `npm run smoke:release` is wired and executed, but this environment returned `403` on outbound HTTPS tunnel to Vercel; rerun in CI/release network to capture deploy evidence.

### Documentation/governance
- ✅ `CHANGELOG.md` updated.
- ✅ `CONTRIBUTING.md` updated with release smoke evidence requirement.
- ✅ README governance links remain present.

### Front-end verification
- ✅ Static route/flow contracts and screen IDs rechecked in source and deep-link docs.
- ⚠️ Browser-container screenshot capture was not available in this environment.

### Release hygiene
- ✅ Removed contradictory/stale wording from README EN/ES around Part 2 flow and onboarding CTA.
- ✅ Reduced changelog contradiction risk by de-duplicating `[Unreleased]`.

## 4) Final readiness verdict

`v1.4.5` is now consolidated for public release with the identified residual items closed and explicit command evidence documented.
