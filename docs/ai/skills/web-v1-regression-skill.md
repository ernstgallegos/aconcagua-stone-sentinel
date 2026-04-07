# web-v1-regression-skill

## Objective

Detect structural regressions in `prototype/web-v1` flow and contracts before merging.

## Scope

- Web-v1 behavior/contracts/smoke validations.
- Documentation claims tied to web-v1 observable behavior.

## Non-application criteria

- Changes that do not affect web-v1 runtime, docs, tests, or release claims.

## Preconditions

- Dependencies installed for Node and Python test runs.
- Repository in a runnable state.

## Inputs

- `prototype/web-v1/**`
- `docs/architecture.md`
- `README.md`
- `README.es.md`

## Outputs

- Regression test evidence for web-v1 core checks.
- Notes for any skipped/limited checks.

## Repository paths

- `prototype/web-v1/tests/`
- `prototype/web-v1/ui/screens.js`
- `prototype/web-v1/index.html`
- `scripts/release-smoke-vercel.js`

## Suggested owner

- Maintainers (web-v1)

## Execution steps

1. Run web-v1 contract tests.
2. Run release smoke to validate deployed entry points.
3. If changing runtime flow, run targeted smoke tests.
4. Synchronize any flow/status docs when behavior changed.

## Validation commands

```bash
npm test
npm run smoke:release
pytest prototype/web-v1/tests/test_smoke_flow.py -v
```

## Acceptance evidence

- Passing `npm test` and release smoke output.
- Smoke-flow result or explicit environment limitation.

## Definition of done

- [ ] Web-v1 regression checks executed.
- [ ] Flow documentation aligned with tested behavior.
- [ ] Limitations (if any) documented.

## Failure and rollback

- Treat failing regression checks as merge blockers.
- Revert risky UI/flow edits until baseline checks pass.
