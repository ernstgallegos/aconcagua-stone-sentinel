# AI Skills Documentation

This folder defines the repository contract for AI-intervention skills.

## Scope

Skills documented here are process recipes for AI-assisted tooling. They do not execute code by themselves; they define reproducible operating sequences.

## Minimum skill contract

Every skill must include:

1. Objective
2. Scope
3. Non-scope (or explicit non-application criteria)
4. Preconditions
5. Inputs
6. Outputs
7. Execution steps
8. Validation commands
9. Acceptance evidence
10. Failure/rollback guidance

Use [`templates/SKILL.template.md`](./templates/SKILL.template.md) as the mandatory base format.

## Where to start

- Read [`catalog.md`](./catalog.md) for available skills.
- Review [`quality-gates.md`](./quality-gates.md) before proposing changes.
- Follow [`contributing-skills.md`](./contributing-skills.md) for review and acceptance requirements.

## Installing repository-local skills into Codex

When working in web Codex sessions, `$CODEX_HOME/skills` can reset between sessions depending on the runtime container lifecycle.

Use the repository helper script to reinstall a local skill definition into the active Codex profile:

```bash
./scripts/install-local-skill.sh docs/ai/skills/prompting-for-frontend-aesthetics-skill.md prompting-for-frontend-aesthetics
```

Notes:
- This writes the skill to `$CODEX_HOME/skills/<name>/SKILL.md` (or `~/.codex/skills` if `CODEX_HOME` is unset).
- Re-run after starting a fresh web Codex session when the environment is ephemeral.
- Restart the Codex session after installation so the new skill is discovered.
