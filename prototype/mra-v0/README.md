# MRA v0 Prototype

Technical prototype for the **Minimal Reproducible Artifact (MRA)** defined in the project documentation.

## What is included

- `simulator.py`: deterministic turn-based simulator with partial information and persistent consequences.
- `scenarios/`: 3 scenario definition files, each with a fixed seed set.
- `runs/`: exported run logs in both CSV and JSONL format.
- `debrief-template.md`: session template for qualitative validation.

## Requirements

- Python 3.10+
- No external dependencies (standard library only)

## Run a scenario

From repository root:

```bash
python3 prototype/mra-v0/simulator.py \
  --scenario prototype/mra-v0/scenarios/narrow-weather-window.json \
  --seed 101 \
  --policy cautious \
  --output-prefix prototype/mra-v0/runs/narrow-weather-window-seed101-cautious
```

This generates:

- `prototype/mra-v0/runs/<name>.csv`
- `prototype/mra-v0/runs/<name>.jsonl`

## Decision policies

- `cautious`: advances while conditions are manageable, waits under high pressure, descends under critical body stress.
- `aggressive`: prioritizes advancing until functional collapse risk becomes immediate.
- `waiter`: always waits (useful for baseline behavior checks).

## Output contract

Each run includes:

- turn index
- observed noisy signals
- chosen decision (`advance`, `wait`, `descend`)
- body-state deltas
- resulting body/resource state
- triggered flags
- summary line with outcome class (`stabilized`, `retreated`, `deteriorated`, `aborted`)

## Reproducing bundled sample runs

```bash
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/narrow-weather-window.json --seed 101 --policy cautious --output-prefix prototype/mra-v0/runs/narrow-weather-window-seed101-cautious
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/false-stability-terrain.json --seed 505 --policy cautious --output-prefix prototype/mra-v0/runs/false-stability-terrain-seed505-cautious
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/accumulated-fatigue-trap.json --seed 808 --policy waiter --output-prefix prototype/mra-v0/runs/accumulated-fatigue-trap-seed808-waiter
```

## Notes

- Scenarios are intentionally simple and tuned for hypothesis testing, not game balance.
- The model is deterministic under fixed `(scenario, seed, policy)`.
