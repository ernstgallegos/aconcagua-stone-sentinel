# AGENTS.md

Repository-wide operating instructions for human and AI contributors.

This file is aligned with the AGENTS.md interoperability convention from https://agents.md/: it uses clear scope, explicit priorities, and actionable checklists.

## Scope

- Applies to the entire repository tree rooted at this directory.

## Instruction priority

When instructions conflict, use this precedence order:

1. Direct user request.
2. System/developer/runtime constraints.
3. More specific `AGENTS.md` files in subdirectories.
4. This root `AGENTS.md`.

## Mandatory change documentation policy

For every functional, technical, or security change included in a commit/PR:

1. **Update `CHANGELOG.md`** using Keep a Changelog format.
2. Record the change in the correct section:
   - **`[Unreleased]`** for unpublished work.
   - The target version block when preparing an in-progress release.
3. Classify each entry under the right type: **Added / Changed / Fixed / Security / Removed / Deprecated**.
4. Describe impact concretely (affected file/module/behavior).

## When to update other docs

In addition to the changelog:

- **`README.md` / `README.es.md`**: when usage flow, commands, routes, prototype status, or visible architecture changes.
- **`CONTRIBUTING.md`**: when contribution policy, test requirements, commit format, or validation flow changes.
- **`docs/`**: when systemic models, mechanical contracts, or architecture decisions change.

## Minimum pre-merge checklist

- [ ] Changelog updated.
- [ ] Related documentation synchronized (`README*`, `CONTRIBUTING`, `docs/`) as needed.
- [ ] Relevant tests/checks run locally (`npm test`, `pytest`, scenario validation as applicable).
- [ ] No contradictions between documented behavior and actual code behavior.

## Changelog writing conventions

- Write entries in English (canonical project language).
- Use short, descriptive, past-tense impact statements.
- Avoid vague items such as “misc fixes”.
- Security-relevant changes **must** appear explicitly under `### Security`.

## Historical maintenance

- Do not remove prior changelog history.
- If correcting a historical release entry, mark it as a retroactive adjustment.
- Keep versions in descending order (newest first).
