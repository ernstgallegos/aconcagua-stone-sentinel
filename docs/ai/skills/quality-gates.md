# Skills Quality Gates

These gates apply to all skill documents under `docs/ai/skills/`.

## Mandatory gates

- Skill follows `templates/SKILL.template.md` structure.
- Objective is specific and testable.
- Includes concrete repository paths.
- Includes executable validation commands (no placeholder-only commands).
- Includes explicit non-application criteria.
- Includes definition of done checklist.
- Includes expected evidence format (command output summary, file diffs, or artifacts).
- Skill is listed in `catalog.md` and `docs/ai/manifest.json`.
- `CHANGELOG.md` `[Unreleased]` includes the skill creation/update entry.

## Validation baseline for this repository

When applicable, use these canonical checks:

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

Document any skipped command with explicit environment limitation evidence.
