#!/usr/bin/env python3
"""Deterministic MRA v0 simulator for Aconcagua: Stone Sentinel."""

from __future__ import annotations

import argparse
import csv
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

POSITIONS = ["camp_a", "camp_b", "route", "camp_c"]


@dataclass
class RunResult:
    outcome: str
    key_constraint: str
    total_turns: int


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def load_scenario(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def observed_signals(state: dict[str, Any], rng: random.Random) -> dict[str, str]:
    def noisy(value: int) -> int:
        return clamp(value + rng.choice([-1, 0, 0, 1]), 0, 3)

    trend = "stable"
    if state["weather_severity"] + state["terrain_load"] >= 5:
        trend = "worsening"
    elif state["weather_severity"] == 0 and state["visibility"] >= 2:
        trend = "improving"

    uncertainty = rng.choice(["low", "medium", "high"])
    return {
        "weather_hint": str(noisy(state["weather_severity"])),
        "visibility_hint": str(noisy(state["visibility"])),
        "terrain_hint": str(noisy(state["terrain_load"])),
        "trend": trend,
        "uncertainty": uncertainty,
    }


def pick_decision(policy: str, state: dict[str, Any], turn: int) -> str:
    if policy == "cautious":
        if state["functional_capacity"] < 45 or state["fatigue"] > 72 or state["exposure"] > 70:
            return "descend"
        if state["weather_severity"] > 2 or state["terrain_load"] > 2:
            return "wait"
        return "advance" if turn <= 6 else "wait"

    if policy == "aggressive":
        if state["functional_capacity"] < 30:
            return "descend"
        return "advance"

    return "wait"


def apply_decision(state: dict[str, Any], decision: str, bias: dict[str, int], rng: random.Random) -> tuple[dict[str, int], list[str]]:
    flags: list[str] = []

    weather_shift = rng.choice([0, 0, 1]) + bias.get("weather_deterioration", 0)
    terrain_shift = rng.choice([0, 1]) + bias.get("terrain_growth", 0)

    if decision == "advance":
        fatigue_delta = 10 + state["terrain_load"] * 3 + bias.get("fatigue_growth", 0) * 2
        exposure_delta = 8 + state["weather_severity"] * 3
        capacity_delta = -6 - state["weather_severity"] * 2 - state["terrain_load"]
        state["water"] -= 1
        state["food"] -= 1
    elif decision == "wait":
        fatigue_delta = -4 + bias.get("fatigue_growth", 0)
        exposure_delta = 4 + state["weather_severity"] * 2
        capacity_delta = -2 + (1 if state["visibility"] >= 2 else 0)
        state["water"] -= 1
        state["food"] -= 1
    else:  # descend
        fatigue_delta = 2
        exposure_delta = 2
        capacity_delta = -1
        state["water"] -= 1
        state["food"] -= 1
        flags.append("retreat-initiated")

    state["weather_severity"] = clamp(state["weather_severity"] + weather_shift, 0, 3)
    state["terrain_load"] = clamp(state["terrain_load"] + terrain_shift, 0, 3)
    state["visibility"] = clamp(3 - state["weather_severity"] + rng.choice([-1, 0, 1]), 0, 3)

    state["fatigue"] = clamp(state["fatigue"] + fatigue_delta, 0, 100)
    state["exposure"] = clamp(state["exposure"] + exposure_delta, 0, 100)
    state["functional_capacity"] = clamp(state["functional_capacity"] + capacity_delta - state["fatigue"] // 25, 0, 100)

    if state["water"] <= 0:
        flags.append("water-depleted")
        state["functional_capacity"] = clamp(state["functional_capacity"] - 8, 0, 100)
    if state["food"] <= 0:
        flags.append("food-depleted")
        state["functional_capacity"] = clamp(state["functional_capacity"] - 5, 0, 100)
    if state["exposure"] >= 75:
        flags.append("critical-exposure")
    if state["fatigue"] >= 80:
        flags.append("critical-fatigue")

    return {
        "functional_capacity_delta": capacity_delta,
        "fatigue_delta": fatigue_delta,
        "exposure_delta": exposure_delta,
    }, flags


def classify_outcome(state: dict[str, Any], all_flags: list[str], ended_by_choice: bool) -> tuple[str, str]:
    if ended_by_choice:
        return "retreated", "player-triggered descent"
    if state["functional_capacity"] <= 15:
        return "deteriorated", "functional capacity collapse"
    if "critical-exposure" in all_flags:
        return "deteriorated", "exposure overload"
    if "critical-fatigue" in all_flags:
        return "deteriorated", "fatigue overload"
    if state["functional_capacity"] >= 60:
        return "stabilized", "manageable body state"
    return "aborted", "timebox reached without stable trend"


def run_simulation(scenario: dict[str, Any], seed: int, policy: str) -> tuple[list[dict[str, Any]], RunResult]:
    rng = random.Random(seed)
    state = dict(scenario["initial_state"])

    logs: list[dict[str, Any]] = []
    all_flags: list[str] = []
    ended_by_choice = False

    for turn in range(1, scenario["max_turns"] + 1):
        signals = observed_signals(state, rng)
        decision = pick_decision(policy, state, turn)
        deltas, flags = apply_decision(state, decision, scenario.get("bias", {}), rng)
        all_flags.extend(flags)

        row = {
            "turn": turn,
            "decision": decision,
            "observed": signals,
            "deltas": deltas,
            "state": dict(state),
            "flags": flags,
        }
        logs.append(row)

        if decision == "descend":
            ended_by_choice = True
            break
        if state["functional_capacity"] <= 15:
            break

    outcome, key_constraint = classify_outcome(state, all_flags, ended_by_choice)
    return logs, RunResult(outcome=outcome, key_constraint=key_constraint, total_turns=len(logs))


def write_outputs(logs: list[dict[str, Any]], result: RunResult, output_prefix: Path) -> None:
    output_prefix.parent.mkdir(parents=True, exist_ok=True)
    csv_path = output_prefix.with_suffix(".csv")
    jsonl_path = output_prefix.with_suffix(".jsonl")

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "turn", "decision", "weather_hint", "visibility_hint", "terrain_hint", "trend", "uncertainty",
            "functional_capacity", "fatigue", "exposure", "water", "food", "flags"
        ])
        for row in logs:
            writer.writerow([
                row["turn"],
                row["decision"],
                row["observed"]["weather_hint"],
                row["observed"]["visibility_hint"],
                row["observed"]["terrain_hint"],
                row["observed"]["trend"],
                row["observed"]["uncertainty"],
                row["state"]["functional_capacity"],
                row["state"]["fatigue"],
                row["state"]["exposure"],
                row["state"]["water"],
                row["state"]["food"],
                "|".join(row["flags"]) if row["flags"] else "-",
            ])

    with jsonl_path.open("w", encoding="utf-8") as handle:
        for row in logs:
            handle.write(json.dumps(row) + "\n")
        handle.write(json.dumps({"summary": result.__dict__}) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an MRA v0 scenario and export run logs.")
    parser.add_argument("--scenario", required=True, type=Path, help="Path to scenario JSON file")
    parser.add_argument("--seed", required=True, type=int, help="Random seed")
    parser.add_argument("--policy", default="cautious", choices=["cautious", "aggressive", "waiter"])
    parser.add_argument("--output-prefix", required=True, type=Path, help="Output path without extension")
    args = parser.parse_args()

    scenario = load_scenario(args.scenario)
    logs, result = run_simulation(scenario, args.seed, args.policy)
    write_outputs(logs, result, args.output_prefix)

    print(json.dumps({
        "scenario": scenario["id"],
        "seed": args.seed,
        "policy": args.policy,
        "outcome": result.outcome,
        "total_turns": result.total_turns,
        "key_constraint": result.key_constraint,
    }, indent=2))


if __name__ == "__main__":
    main()
