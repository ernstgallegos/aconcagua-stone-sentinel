# prompting-for-frontend-aesthetics-skill

## Objective

Operationalize the aesthetics prompting framework from `prompting_for_frontend_aesthetics.ipynb` into a reusable repository skill for frontend ideation and prompt-engineering workflows.

## Scope

- Frontend prompting guidance for aesthetic quality improvements.
- Reuse of the distilled aesthetics prompt and isolated prompt variants.
- Skill-level documentation for reproducible usage in this repository.

## Non-application criteria

- Tasks that require production-ready UI implementation or refactoring (use engineering skills/tests instead).
- Backend-only, simulation-only, or non-visual documentation tasks.
- Situations where a strict pre-existing design system fully dictates UI output and experimentation is not allowed.

## Preconditions

- `docs/ai/skills/prompting_for_frontend_aesthetics.ipynb` is present and readable.
- Contributor understands this skill guides prompting quality, not runtime/UI correctness.
- Any resulting code changes must still pass repository readiness/quality gates.

## Inputs

- `docs/ai/skills/prompting_for_frontend_aesthetics.ipynb`
- Prompt target/context (feature description, UI goal, constraints)
- Base system prompt used by the selected coding/model workflow

## Outputs

- A standardized aesthetics prompting section ready to append to system prompts.
- Optional isolated prompt modules (typography/theme) for constrained generations.
- Clear evidence of prompt assembly and validation checks.

## Repository paths

- `docs/ai/skills/prompting_for_frontend_aesthetics.ipynb`
- `docs/ai/skills/prompting-for-frontend-aesthetics-skill.md`
- `docs/ai/skills/catalog.md`
- `docs/ai/manifest.json`
- `CHANGELOG.md`

## Suggested owner

- Maintainers (web-v1)

## Execution steps

1. Open `docs/ai/skills/prompting_for_frontend_aesthetics.ipynb` and identify canonical prompt blocks (`DISTILLED_AESTHETICS_PROMPT`, isolated prompt variants, and base system prompt scaffolding).
2. Assemble prompt payload in this order:
   - Task-specific system prompt (technical stack + constraints).
   - Distilled aesthetics prompt block.
   - Optional isolated block(s) (e.g., typography/theme) only when needed.
3. Validate final prompt coherence:
   - No contradiction between design freedom and hard constraints.
   - Explicitly forbid generic typography/color defaults when that is the objective.
4. Record which blocks were used and why in task notes/PR report.
5. If generated UI artifacts are committed, run repository readiness checks (including screenshot evidence for visible UI changes).

## Validation commands

```bash
python3 - <<'PY'
import json
from pathlib import Path
p = Path('docs/ai/skills/prompting_for_frontend_aesthetics.ipynb')
nb = json.loads(p.read_text(encoding='utf-8'))
all_text = '\n'.join(''.join(c.get('source', [])) for c in nb.get('cells', []))
required = [
    'DISTILLED_AESTHETICS_PROMPT',
    'BASE_SYSTEM_PROMPT',
    'TYPOGRAPHY_PROMPT',
    'SOLARPUNK_THEME_PROMPT',
]
missing = [k for k in required if k not in all_text]
print('prompt-blocks-ok' if not missing else f'missing: {missing}')
PY

rg -n "prompting-for-frontend-aesthetics-skill|prompting_for_frontend_aesthetics.ipynb" docs/ai/skills/catalog.md docs/ai/manifest.json docs/ai/skills/prompting-for-frontend-aesthetics-skill.md
```

## Acceptance evidence

- Notebook parsing output confirming all required prompt blocks are present.
- Grep output showing catalog/manifest/skill references are wired.
- Final report listing exact prompt blocks applied for the task.

## Definition of done

- [ ] Skill document follows the canonical template sections.
- [ ] Skill is registered in `docs/ai/skills/catalog.md`.
- [ ] Skill is registered in `docs/ai/manifest.json`.
- [ ] `CHANGELOG.md` `[Unreleased]` includes this skill configuration update.
- [ ] Validation command evidence is included in final report.

## Failure and rollback

- If notebook prompt blocks are missing or renamed, stop and restore/realign notebook content before using this skill.
- If catalog/manifest references are inconsistent, revert registration edits and re-apply with exact path parity.
