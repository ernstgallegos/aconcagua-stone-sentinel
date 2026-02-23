#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from mra.engine import run_simulation
from mra.io_utils import write_outputs
from mra.scenarios import load_scenario


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Aconcagua MRA v0 simulation")
    parser.add_argument("--scenario", required=True, help="Scenario id (json filename without .json)")
    parser.add_argument("--seed", required=True, type=int, help="Random seed")
    parser.add_argument(
        "--policy",
        default="balanced",
        choices=["cautious", "balanced", "ambitious"],
        help="Decision policy",
    )
    parser.add_argument(
        "--outdir",
        default="runs",
        help="Output directory for logs and summaries",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    base_dir = Path(__file__).resolve().parent
    scenario = load_scenario(base_dir / "scenarios", args.scenario)

    events, summary = run_simulation(scenario=scenario, seed=args.seed, policy=args.policy)
    paths = write_outputs(
        outdir=base_dir / args.outdir,
        scenario_id=scenario["id"],
        seed=args.seed,
        policy=args.policy,
        events=events,
        summary=summary,
    )

    print("Run complete")
    print(f"Scenario: {scenario['id']}")
    print(f"Seed: {args.seed}")
    print(f"Policy: {args.policy}")
    print(f"Outcome: {summary['outcome_class']}")
    print(f"Turns played: {summary['turns_played']}")
    print(f"Log: {paths['jsonl']}")
    print(f"Summary: {paths['summary_json']}")


if __name__ == "__main__":
    main()
