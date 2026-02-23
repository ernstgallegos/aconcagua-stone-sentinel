#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCENARIOS=(
  "narrow-weather-window"
  "false-stability-terrain"
  "accumulated-fatigue-trap"
)
SEEDS=(11 23 37)
POLICIES=(balanced cautious ambitious)

for scenario in "${SCENARIOS[@]}"; do
  for seed in "${SEEDS[@]}"; do
    for policy in "${POLICIES[@]}"; do
      echo "Running: scenario=${scenario} seed=${seed} policy=${policy}"
      python3 run.py --scenario "$scenario" --seed "$seed" --policy "$policy"
    done
  done
done

echo "All runs completed. Check prototype/mra-v0/runs/."
