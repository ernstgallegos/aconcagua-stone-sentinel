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

## Mandatory session start behavior (AI agents)

- **Always read this file before starting a new task.**
- Treat this document as a **living learning log**: after each sprint/task with meaningful decisions, append/update the relevant learning entries.
- Keep entries concise, operational, and directly useful for future implementation/review cycles.

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

## Learning log (project + workflow)

### Project architecture and behavior (important)

- The active prototype is `prototype/web-v1/index.html` with a stateful JS engine centered on EP/BT calculations and turn resolution.
- Character mechanics are data-driven from `data/characters.json`; each character must expose the full engine modifier set plus `difficultyLabel`.
- Canonical outcomes are data-driven from `data/outcomes.json`; outcome checks in `resolveTurn()` must preserve ordering-sensitive logic.
- Current primary flow after v1.4 Phase 1 is:
  `splash → title → character → scenario → onboarding → game → (summit-success or debrief)`.

### Sprint learnings — v1.4 Phase 1 (external playtesting push)

- Replacing character roster requires mechanical coherence, not just text swap: IDs, engine fields, and UI card rendering must remain aligned.
- Permit system coupling points were critical:
  - state declaration (`G.permitDay`, `G.permitMaxDays`),
  - reset on run start,
  - synchronization when day increments,
  - outcome check precedence before expedition-window closure,
  - visual feedback in watch-side widget.
- Removing `screen-mode` works cleanly if navigation and random-scenario access are preserved via scenario-grid integration.
- Summit-success/Part-2 bridge is intentionally a gated narrative bridge, not playable Part 2; placeholder behavior is expected for now.

### Workflow learnings (implementation + validation)

- For large one-shot prompts, execute in strict section order and verify each section with targeted grep/search checks before running full tests.
- Prefer minimal, precise edits to `index.html` because it contains UI, flow, and engine logic in one file; regressions are easy when moving blocks.
- For this repository, final validation baseline should include:
  - `pytest prototype/mra-v0/test_simulator.py -v`
  - `npm test`
  - JSON parse checks for all simulation data files.
- For visible front-end changes, take screenshots through browser tooling to confirm real rendered behavior.

### Collaboration protocol for future tasks

- Treat reviewer/user dissatisfaction as a signal to audit for integration mistakes (flow, ordering, and DOM placement), not only syntax/test pass.
- When requested by the user, keep documenting meaningful lessons here as cumulative operational memory for subsequent sprints.
