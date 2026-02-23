# MRA v0 — Minimal Reproducible Artifact Runtime

This folder contains a fully runnable, low-fidelity runtime for the **Minimal Reproducible Artifact (MRA)** proposed in:
- `/docs/en/minimal-reproducible-artifact-proposal.md`

It is intentionally small and deterministic-first. The objective is **coherence validation**, not production polish.

## What this runtime includes

- Turn-based simulation loop
- Three canonical scenarios
- Seeded reproducibility
- Three baseline decision policies (`cautious`, `balanced`, `ambitious`)
- Structured outputs (`jsonl` turn log + `json` summary)
- Evaluation artifacts (`debrief-template.md`, `evaluation-matrix.md`)

## Folder structure

```text
prototype/mra-v0/
├── Dockerfile
├── README.md
├── debrief-template.md
├── evaluation-matrix.md
├── run.py
├── scripts/
│   └── run_all.sh
├── mra/
│   ├── __init__.py
│   ├── engine.py
│   ├── io_utils.py
│   └── scenarios.py
├── scenarios/
│   ├── accumulated-fatigue-trap.json
│   ├── false-stability-terrain.json
│   └── narrow-weather-window.json
└── runs/
    └── .gitkeep
```

## Quickstart (local)

```bash
cd prototype/mra-v0
python3 run.py --scenario narrow-weather-window --seed 11 --policy balanced
```

Generated files:
- `runs/<timestamp>-<scenario>-s<seed>-<policy>.jsonl`
- `runs/<timestamp>-<scenario>-s<seed>-<policy>.summary.json`

## Batch run (all scenarios x default seeds)

```bash
cd prototype/mra-v0
bash scripts/run_all.sh
```

Default seeds: `11, 23, 37`.

## Policy behavior

- `cautious`: prioritizes waiting/descending when signals degrade.
- `balanced`: advances opportunistically with moderate safety bias.
- `ambitious`: advances aggressively unless hard limits are reached.

## Reproducibility contract

A run is reproducible when these parameters remain unchanged:
- scenario JSON
- seed
- policy
- engine version (this folder)

Given equal parameters, state transitions and outputs are deterministic.

## Deployment options

### Option A — simple local runtime
Use Python 3.11+ and run directly with `run.py`.

### Option B — containerized runtime

```bash
cd prototype/mra-v0
docker build -t aconcagua-mra-v0 .
docker run --rm -v "$(pwd)/runs:/app/runs" aconcagua-mra-v0 \
  python run.py --scenario false-stability-terrain --seed 23 --policy cautious
```

## Suggested validation cadence

Per iteration:
1. Run 9 baseline runs (3 scenarios x 3 seeds) with `balanced`
2. Run 9 stress runs with `ambitious`
3. Run 9 safety runs with `cautious`
4. Fill one debrief form per human playtest session
5. Update `evaluation-matrix.md`

## Notes

- This runtime is intentionally abstract.
- There is no UI and no real-time input.
- It is designed to support Stage 4 / Stage 5 transition in the project roadmap.
