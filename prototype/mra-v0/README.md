# MRA v0 Prototype

Technical prototype for the **Minimal Reproducible Artifact (MRA)** defined in the project documentation.

## What is included

- `simulator.py`: deterministic turn-based simulator with partial information and persistent consequences.
- `scenarios/`: 5 scenario definition files (including `late-push` and `weather-window` for degraded high-altitude starts and temporary weather openings), each with a fixed seed set.
- `runs/`: exported run logs in both CSV and JSONL format.
- `run_all.py`: batch script to execute all scenarios/seeds with documented policies.
- `debrief-template.md`: session template for qualitative validation.
- `test_simulator.py`: regression tests for key simulator invariants.

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
- `human`: interactive turn-by-turn decisions with optional rationale capture.

## Output contract

Each run includes:

- turn index
- position and altitude band
- observed noisy signals
- chosen decision (`advance`, `wait`, `descend`)
- optional rationale (for human sessions)
- body-state deltas
- resulting body/resource state
- triggered flags
- summary line with outcome class (`stabilized`, `retreated`, `deteriorated`, `incapacitated`, `survived-marginal`)

## Reproducing bundled sample runs

```bash
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/narrow-weather-window.json --seed 101 --policy cautious --output-prefix prototype/mra-v0/runs/narrow-weather-window-seed101-cautious
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/false-stability-terrain.json --seed 505 --policy cautious --output-prefix prototype/mra-v0/runs/false-stability-terrain-seed505-cautious
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/accumulated-fatigue-trap.json --seed 808 --policy waiter --output-prefix prototype/mra-v0/runs/accumulated-fatigue-trap-seed808-waiter
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/late-push.json --seed 222 --policy cautious --output-prefix prototype/mra-v0/runs/late-push-seed222-cautious
python3 prototype/mra-v0/simulator.py --scenario prototype/mra-v0/scenarios/weather-window.json --seed 151 --policy cautious --output-prefix prototype/mra-v0/runs/weather-window-seed151-cautious
```

## Scenario bias extensions

The simulator now supports optional weather-window controls in scenario bias:

- `window_turns` (list[int]): turns where a favorable weather window is enforced.
- `post_window_deterioration` (int): added deterioration once the window has passed.

## Batch execution and regression checks

```bash
python3 prototype/mra-v0/run_all.py
python3 -m unittest prototype/mra-v0/test_simulator.py
```

## Notes

- Scenarios are intentionally simple and tuned for hypothesis testing, not game balance.
- The model is deterministic under fixed `(scenario, seed, policy)`.
