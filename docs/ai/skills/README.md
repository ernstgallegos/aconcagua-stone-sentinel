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
