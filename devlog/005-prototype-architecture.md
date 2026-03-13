# Devlog 005 — Prototype Architecture Decision

Two prototypes coexist in this repository with different purposes. This entry documents
the relationship between them and why the Python simulator (MRA v0) will not receive
further development.

## Why two prototypes existed

The Python MRA v0 (`prototype/mra-v0/simulator.py`) was the first validation artifact.
Its purpose was narrow and deliberate: to confirm that a turn-based decision loop under
partial information could generate meaningful tension without combat, stats, or progression
economies.

It accomplished that goal. The core hypothesis — that the mountain's authority could be
expressed through environmental pressure mechanics — was confirmed across six deterministic,
reproducible scenarios. The Python simulator was always a proof-of-concept tool, not a
development target.

## Why web-v1 became the active prototype

Once the core hypothesis was validated, the project needed an interactive surface where
a real player could make decisions in real time. The web prototype
(`prototype/web-v1/index.html`) serves this purpose. It is the artifact that gets iterated.

Over iterations, web-v1 has diverged substantially from the Python MRA v0: it adds a
diegetic clock, five player actions, fifteen named route nodes, an acclimatization subsystem,
stage-based multipliers, a forced bivouac system, character differentiation loaded from
`data/characters.json`, and a canonical outcome set in `data/outcomes.json`. This
divergence is intentional, not a defect.

## What MRA v0 is now

MRA v0 is a **frozen reference artifact**. It:

- Will not receive new mechanics or be kept in sync with web-v1
- Remains runnable and its tests remain in CI as regression guards on documented behavior
- Serves as documentation of the original hypothesis validation process
- Can be read alongside `docs/en/minimal-reproducible-artifact-proposal.md` to understand
  the first design step

The simulator is not abandoned — it completed its purpose. It is archived in place.

## Current active development surface

`prototype/web-v1/index.html` is the canonical interactive prototype.
All new mechanics, balance changes, and design iterations happen here.
`/data/*.json` files are its authoritative configuration layer.

See `docs/architecture.md` for the full engine flow and source-of-truth map.
