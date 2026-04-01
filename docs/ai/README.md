# AI / Agent Operations Hub

This directory is the canonical documentation hub for AI-assisted contribution workflows in this repository.

## Purpose

Centralize policies, checklists, and machine-readable references used by AI agents and humans who rely on language-model tooling to propose or review repository changes.

## Canonical source policy

- `docs/ai/` is the canonical location for AI/agent operational guidance.
- Root-level `AGENTS.md` remains the interoperability entry point and must continue to exist for tool compatibility.
- When conflicts exist between duplicated references, prefer this hub and then follow the instruction-priority model documented in `AGENTS.md`.
- Existing checklist files under `docs/en/` and `docs/es/` remain in place for backward compatibility and should be treated as canonical checklist artifacts.

## Document map

### Policies and entry points

- [`../../AGENTS.md`](../../AGENTS.md) — repository-wide AI agent entry point and operational policy.
- [`manifest.json`](./manifest.json) — machine-readable load map for canonical docs and skills.

### Public readiness checklists (canonical checklist artifacts)

- [`../en/public-readiness-checklist.md`](../en/public-readiness-checklist.md) (EN)
- [`../es/checklist-preparacion-publica.md`](../es/checklist-preparacion-publica.md) (ES)

### Skills infrastructure

- [`skills/README.md`](./skills/README.md) — skills subsystem overview and usage.
- [`skills/catalog.md`](./skills/catalog.md) — current skills and ownership suggestions.
- [`skills/quality-gates.md`](./skills/quality-gates.md) — mandatory validation gates for skill docs.
- [`skills/contributing-skills.md`](./skills/contributing-skills.md) — contribution and acceptance policy for skills.
- [`skills/templates/SKILL.template.md`](./skills/templates/SKILL.template.md) — canonical skill template.

## Recommended reading order for agents

### English

1. `AGENTS.md`
2. `docs/ai/manifest.json`
3. `docs/en/public-readiness-checklist.md`
4. `docs/ai/skills/README.md`
5. `docs/ai/skills/catalog.md`
6. Task-specific skill file(s)

### Español

1. `AGENTS.md`
2. `docs/ai/manifest.json`
3. `docs/es/checklist-preparacion-publica.md`
4. `docs/ai/skills/README.md`
5. `docs/ai/skills/catalog.md`
6. Skill(s) específicos de la tarea

## Compatibility notes

- Existing links to readiness checklists under `docs/en` and `docs/es` should continue to work.
- New AI-operation docs should be added under `docs/ai/` and listed in `manifest.json`.
