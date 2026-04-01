# release-readiness-skill

## Objective

Run and document public-release readiness gates for repository changes, with explicit command evidence.

## Scope

- Governance/process/doc changes that may affect public repository readiness.
- Final verification before commit/PR for release-facing updates.

## Non-application criteria

- Purely local exploratory notes with no commit intent.
- Changes outside this repository.

## Preconditions

- Working tree includes intended changes.
- Runtime has Node.js and Python tooling available.

## Inputs

- `docs/en/public-readiness-checklist.md`
- `docs/es/checklist-preparacion-publica.md`
- Changed files in current branch

## Outputs

- Executed gate command results.
- Updated changelog and final validation report.

## Repository paths

- `docs/en/public-readiness-checklist.md`
- `docs/es/checklist-preparacion-publica.md`
- `CHANGELOG.md`
- `README.md`
- `README.es.md`
- `CONTRIBUTING.md`

## Suggested owner

- Maintainers (release/docs)

## Execution steps

1. Read the public-readiness checklist in EN or ES.
2. Execute required gate commands.
3. Capture pass/fail/limitations with exact commands.
4. Ensure `CHANGELOG.md` `[Unreleased]` contains concrete entries.
5. Verify docs/process links are coherent.

## Validation commands

```bash
npm run typecheck
npm test
pytest prototype/mra-v0/test_simulator.py -v
python3 - <<'PY'
import json, pathlib
for p in pathlib.Path('.').rglob('*.json'):
    json.loads(p.read_text(encoding='utf-8'))
print('all-json-ok')
PY
npm run smoke:release
```

## Acceptance evidence

- Command-by-command status report with exact command strings.
- File citations showing checklist/changelog synchronization.

## Definition of done

- [ ] Required checklist gates executed or justified.
- [ ] `CHANGELOG.md` updated under `[Unreleased]`.
- [ ] Final report includes exact commands + outcomes.

## Failure and rollback

- Stop release finalization if any mandatory gate fails.
- Revert or patch failing changes before commit.
