## Summary

Describe what this PR does and why.

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature / mechanic (non-breaking change that adds functionality)
- [ ] Documentation update
- [ ] Refactor (no behavior change)
- [ ] Release / version bump
- [ ] Other: ___

## Checklist

### Code quality
- [ ] Changes are minimal and targeted — no unrelated edits
- [ ] New or modified logic has corresponding tests (or existing tests cover it)
- [ ] No new external dependencies added without prior discussion (see `CONTRIBUTING.md`)

### Testing evidence (paste output below each gate)

**`npm run typecheck`**
```
(paste output here)
```

**`npm test`**
```
(paste output here)
```

**`pytest prototype/mra-v0/test_simulator.py -v`** _(if Python files changed)_
```
(paste output here)
```

**`npm run validate:json`**
```
(paste output here)
```

**`npm run validate:links`**
```
(paste output here)
```

**`npm run smoke:release`** _(push to main only — skip for draft PRs)_
```
(paste output here)
```

### Documentation
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] Related docs synchronized (`README*`, `docs/`, `CONTRIBUTING.md`) if behavior changed
- [ ] `docs/technical-debt-register.md` reviewed; debt paydown / extension reflected in CHANGELOG if applicable

### Release / version bump (only if this PR bumps the version)
- [ ] `package.json` version updated
- [ ] `package-lock.json` regenerated with `npm install --package-lock-only`
- [ ] `npm run check:lock-version` passes
- [ ] Version strings updated in UI labels, `docs/repo-truth.md`, `README.md`, `README.es.md`

### Visual changes (only if UI modified)
- [ ] Screenshot or recording included in the PR description or attached as a comment

## Related issues

Closes # (if applicable)
