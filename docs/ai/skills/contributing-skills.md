# Contributing Skills

## Required format

Every new or modified skill must:

1. Use `templates/SKILL.template.md` sections.
2. Include concrete repository paths and exact validation commands.
3. Define explicit non-application criteria.
4. Define evidence expectations and definition of done.
5. Include suggested ownership (team or role).

## Acceptance criteria

A skill is accepted only when all are true:

- It passes all `quality-gates.md` checks.
- It is registered in `catalog.md` and `docs/ai/manifest.json`.
- It includes at least one runnable validation command relevant to repository reality.
- A reviewer can execute the documented steps without inferred missing context.

## Minimum validation evidence

PRs that add/change skills must include:

- Exact commands executed.
- Pass/fail result per command.
- Any environment limitation (if applicable) with concrete explanation.
- File-level summary of changed skill docs.

## Definition of done (skills)

- [ ] Skill document updated and structurally complete.
- [ ] `catalog.md` updated.
- [ ] `manifest.json` updated.
- [ ] `CHANGELOG.md` updated under `[Unreleased]`.
- [ ] Validation evidence included in PR/final report.

## Ownership suggestions

Use one of these ownership labels in each skill file:

- `Maintainers (release/docs)`
- `Maintainers (web-v1)`
- `Maintainers (docs/governance)`
- `Maintainers (simulation)`

Teams may refine ownership labels over time, but each skill must always name one suggested owner.
