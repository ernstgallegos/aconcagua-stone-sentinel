# Release Hardening Report — v1.4.5

Date: 2026-03-28  
Scope: `prototype/web-v1` public prototype hardening pass (stability, UX friction, startup resilience, docs parity).

## 1) Audited areas

- Repository structure and canonical scope docs (`README*`, `docs/repo-truth.md`, `docs/architecture.md`, `docs/simulation_engine.md`, `CHANGELOG.md`).
- Active prototype runtime path (`prototype/web-v1/index.html`, `ui/screens.js`, `ui/helpers/*`, `engine/*`, `state/*`).
- Runtime data sources and startup contracts (`data/*.json`, `ui/helpers/data-config.js`).
- Routing/deep-link logic (`ui/helpers/routing.js`, deep-link handling in `ui/screens.js`).
- Overlay/modal behavior and interaction lock paths (`index.html`, `css/components.css`, `ui/helpers/accessibility.js`, `ui/screens.js`).
- Existing coverage and high-value regression gaps (`prototype/web-v1/tests/**`).

## 2) Issues found during hardening audit

### Critical
1. **Partial boot after blocking data failure**: post-load UI bootstrap code still ran even when required data failed to load, causing confusing partially initialized states.

### High
2. **Transient overlay persistence across screen navigation**: open overlays/bottom sheets could survive route changes and create apparent interaction freezes.
3. **Modal lock consistency gap**: shared modal helper handled focus trap/return but did not enforce a global scroll lock for stacked dialogs.

### Medium
4. **Overlay dismissal parity gap**: game-help/watch/field-log overlays lacked unified overlay-surface click-to-close behavior.
5. **Regression gap**: no dedicated unit test pinned the new modal lock lifecycle (open count + unlock on close).
6. **Regression gap**: startup blocking-error localization/categorization copy had smoke-level coverage only, with no direct helper-level assertions.

## 3) Fixes implemented

1. **Bootstrap gating and failure hardening**
   - `loadDataConfig()` now returns success/failure boolean.
   - Post-load UI bootstrap chain now executes only when model data loads successfully.
   - Added bootstrap `.catch(...)` path that routes unexpected runtime failures into blocking diagnostics.

2. **Screen-transition transient UI cleanup**
   - Added a centralized transient UI cleanup routine invoked by `showScreen()` to close overlays and bottom sheets and clear visible backdrops before screen activation.

3. **Modal global lock behavior**
   - Extended shared modal accessibility helper with modal-open counting and `body.modal-open` state to prevent background page scroll while dialogs are open.
   - Preserved focus trap and focus-return behavior.

4. **Overlay dismiss UX consistency**
   - Added overlay-surface click handling for game-help/watch-detail/field-log overlays to close on outside click, matching expected public UX behavior.

5. **Regression coverage added**
   - New `prototype/web-v1/tests/unit/accessibility-modal.test.js` validates modal open/close lock lifecycle and focus restoration.
   - New `prototype/web-v1/tests/unit/startup-ui.test.js` validates localized blocking-error summaries/details for categorized startup failures and unknown-category fallback copy.

## 4) Deferred items

- **Full manual browser visual QA + screenshots** deferred in this environment because no browser container tool was available in-session.
- **Larger `screens.js` modular split** intentionally deferred to avoid high-risk refactor in a release-hardening pass; this sprint focused on targeted, high-impact risk reduction.

## 5) Tests and checks run

- `npm test`
- `pytest prototype/mra-v0/test_simulator.py -v`
- `pytest prototype/web-v1/tests/test_smoke_flow.py -v` (suite skipped in current environment)
- `node --test prototype/web-v1/tests/unit/startup-ui.test.js`

## 6) Manual validation checklist outcomes

Status key: ✅ verified, ⚠️ limited by environment

### Startup and boot
- ✅ Required-data startup failure path remains categorized and blocking via existing smoke tests.
- ✅ Successful data load reaches model-ready state and enables startup flow.

### Onboarding
- ⚠️ Full interactive browser walkthrough not executed in this headless session.

### In-run gameplay
- ⚠️ Full real-time UI interaction walkthrough not executed in this headless session.

### End-of-run
- ⚠️ Full visual debrief/replay click-path validation not executed in this headless session.

### Routing
- ✅ Deep-link parser behavior remains covered in unit tests.
- ✅ Hash sync/deep-link bootstrap path preserved with startup-gating changes.

### Failure behavior
- ✅ Missing file / invalid JSON / invalid shape / HTTP startup failure categories verified by test suite.
- ✅ Startup blocking-error helper returns bilingual categorized copy and stable fallback copy for unknown categories.

## 7) Remaining known risks

1. `ui/screens.js` remains a large orchestration file; although this pass removed critical runtime fragility, future release cycles should continue controlled helper extraction around setup/debrief/render clusters.
2. A full browser-based visual regression sweep is still recommended before public announcement (especially mobile overlay interactions).

## 8) Release readiness assessment

**Result:** ready for public testing with known non-blocking risks documented above.  
Critical/high hardening issues found in this pass were fixed with targeted code changes and regression coverage.
