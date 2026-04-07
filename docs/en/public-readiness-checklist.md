# Public Readiness Checklist (Repository)

This checklist is the final pass before treating a sprint output as public-facing and review-ready.

## 1) Product/runtime truth

- [ ] `docs/repo-truth.md`, `package.json`, and visible UI version labels are aligned.
- [ ] `data/outcomes.json` still matches resolver and simulator assumptions.
- [ ] `README.md` / `README.es.md` describe the currently observable flow and status.

## 2) Engineering quality gates

Run and record:

```bash
npm run typecheck
npm test
pytest prototype/mra-v0/test_simulator.py -v
npm run validate:json
npm run smoke:release
```

- [ ] All gates pass locally.
- [ ] `npm run smoke:release` passed against the canonical deployed URL (or an explicit release candidate URL).
- [ ] Any skipped check includes an explicit reason in PR notes.
- [ ] PR/final report includes the exact commands executed for each completed gate.

## 3) Documentation and governance

- [ ] `CHANGELOG.md` updated (Keep a Changelog structure).
- [ ] `CONTRIBUTING.md` instructions still match current commands/CI behavior.
- [ ] `SECURITY.md` and `CODE_OF_CONDUCT.md` links remain reachable from README.
- [ ] `docs/data-contracts-guide.md` reflects any schema changes to `characters.json`, `character_events.json`, `context_events.json`, or `nodes.json`.
- [ ] `docs/deep-links-summary.md` screen-ID table matches all `<section id="screen-…">` entries in `prototype/web-v1/index.html`.

## 4) Front-end verification

- [ ] For visible UI changes, include an updated screenshot artifact.
- [ ] Smoke flow still reaches title → setup → onboarding → game → outcomes.

## 5) Release hygiene

- [ ] No contradictory statements across README, architecture docs, and changelog.
- [ ] No stale references to removed mechanics/features.
- [ ] Pending debt updates mirrored in `docs/technical-debt-register.md` and changelog when relevant.
