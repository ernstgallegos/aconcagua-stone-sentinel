#!/usr/bin/env python3
"""Run all scenario/seed/policy combinations declared by scenario files."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

DEFAULT_POLICY_BY_SCENARIO = {
    "narrow-weather-window": "cautious",
    "false-stability-terrain": "cautious",
    "accumulated-fatigue-trap": "waiter",
    "late-push": "cautious",
    "weather-window": "cautious",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run every configured MRA scenario seed set.")
    parser.add_argument("--base", type=Path, default=Path("prototype/mra-v0"), help="Prototype base directory")
    parser.add_argument("--output-dir", type=Path, default=Path("prototype/mra-v0/runs/generated"), help="Output directory")
    args = parser.parse_args()

    scenarios_dir = args.base / "scenarios"
    simulator = args.base / "simulator.py"

    failures: list[str] = []

    for scenario_path in sorted(scenarios_dir.glob("*.json")):
        if scenario_path.name.endswith(".schema.json"):
            continue
        scenario = json.loads(scenario_path.read_text(encoding="utf-8"))
        scenario_id = scenario["id"]
        policy = DEFAULT_POLICY_BY_SCENARIO.get(scenario_id, "cautious")

        for seed in scenario.get("seeds", []):
            output_prefix = args.output_dir / f"{scenario_id}-seed{seed}-{policy}"
            cmd = [
                "python3",
                str(simulator),
                "--scenario",
                str(scenario_path),
                "--seed",
                str(seed),
                "--policy",
                policy,
                "--output-prefix",
                str(output_prefix),
            ]
            label = f"{scenario_id} seed={seed} policy={policy}"
            try:
                completed = subprocess.run(cmd, capture_output=True, text=True, check=True)
                summary = json.loads(completed.stdout)
                print(
                    f"{summary['scenario']} seed={summary['seed']} policy={summary['policy']}: "
                    f"{summary['outcome']} ({summary['key_constraint']})"
                )
            except subprocess.CalledProcessError as err:
                failures.append(label)
                print(f"ERROR running {label}: exit={err.returncode}")
                if err.stdout:
                    print(err.stdout.strip())
                if err.stderr:
                    print(err.stderr.strip())

    if failures:
        print(f"\nCompleted with {len(failures)} failure(s):")
        for label in failures:
            print(f"- {label}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
