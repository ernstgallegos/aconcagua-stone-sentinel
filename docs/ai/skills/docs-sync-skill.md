# docs-sync-skill

## Objective

Keep governance and contributor-facing docs synchronized after process/policy updates.

## Scope

- AI/agent docs, READMEs, CONTRIBUTING, and changelog entries.
- Cross-link consistency for canonical docs and checklists.

## Non-application criteria

- Code-only changes without process/documentation impact.

## Preconditions

- Document updates are identified in the task scope.

## Inputs

- `AGENTS.md`
- `docs/ai/**`
- `README.md`
- `README.es.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

## Outputs

- Updated docs with coherent cross-references.
- Changelog record of governance/process documentation changes.

## Repository paths

- `docs/ai/README.md`
- `docs/ai/manifest.json`
- `README.md`
- `README.es.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

## Suggested owner

- Maintainers (docs/governance)

## Execution steps

1. Update canonical docs in `docs/ai/`.
2. Update entry-point references in root docs.
3. Confirm checklist references remain valid.
4. Add changelog entries with concrete impact.
5. Validate link/path coherence.

## Validation commands

```bash
rg -n "docs/ai/README.md|public-readiness-checklist|checklist-preparacion-publica|manifest.json" README.md README.es.md CONTRIBUTING.md AGENTS.md docs/ai/README.md
python3 - <<'PY'
from pathlib import Path
required = [
    Path('docs/ai/README.md'),
    Path('docs/ai/manifest.json'),
    Path('docs/ai/skills/catalog.md'),
]
missing = [str(p) for p in required if not p.exists()]
print('missing' if missing else 'all-required-docs-present', missing)
PY
```

## Acceptance evidence

- Grep output showing canonical links.
- Presence check output for required hub files.

## Definition of done

- [ ] Canonical AI docs centralized under `docs/ai/`.
- [ ] Root entry docs link to the hub.
- [ ] Changelog updated for the doc/process shift.

## Failure and rollback

- If link integrity fails, restore previous references and re-apply changes incrementally.
