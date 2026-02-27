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

POSITIONS = ["horcones", "base_camp", "camp_a", "camp_b", "camp_c", "route"]
POSITION_LABELS = {
    "horcones": "Horcones / Entrada Parque Provincial Aconcagua (2950 m)",
    "base_camp": 'Campamento Base / "Plaza de Mulas" (4350 m)',
    "camp_a": 'Campamento 1 "Canadá" (5050 m)',
    "camp_b": 'Campamento 2 "Nido de Cóndores" (5560 m)',
    "camp_c": 'Campamento 3 "Cólera" (5970 m)',
    "route": "Summit route sector (>5970 m)",
}
POSITION_TO_ALTITUDE = {
    "horcones": "low",
    "base_camp": "low",
    "camp_a": "mid",
    "camp_b": "mid",
    "route": "high",
    "camp_c": "high",
}
ALTITUDE_MODIFIERS = {
    "low": {"fatigue_mult": 1.0, "capacity_penalty": 0},
    "mid": {"fatigue_mult": 1.2, "capacity_penalty": 1},
    "high": {"fatigue_mult": 1.5, "capacity_penalty": 3},
}


@dataclass
class RunResult:
    outcome: str
    key_constraint: str
    total_turns: int
    highest_position_reached: str


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def load_scenario(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def uncertainty_level(state: dict[str, Any], rng: random.Random) -> str:
    base = state["weather_severity"] + (3 - state["visibility"]) + cognitive_noise(state)
    jitter = rng.choice([-1, 0, 0, 1])
    score = clamp(base + jitter, 0, 9)
    if score <= 2:
        return "low"
    if score <= 5:
        return "medium"
    return "high"


def cognitive_noise(state: dict[str, Any]) -> int:
    altitude_factor = {"low": 0, "mid": 1, "high": 3}.get(state.get("altitude_band", "mid"), 1)
    fatigue_factor = max(0, (state["fatigue"] - 50) // 15)
    exposure_factor = max(0, (state["exposure"] - 40) // 20)
    return altitude_factor + fatigue_factor + exposure_factor


def observed_signals(state: dict[str, Any], rng: random.Random) -> dict[str, str]:
    euphoria_bias = 0
    if state.get("altitude_band") == "low" and state["fatigue"] < 40 and state["functional_capacity"] > 70:
        euphoria_bias = rng.choice([0, 0, 0, -1])

    def noisy(value: int) -> int:
        return clamp(value + rng.choice([-1, 0, 0, 1]) + euphoria_bias, 0, 3)

    trend = "stable"
    combined = state["weather_severity"] + state["terrain_load"]
    if combined >= 5:
        trend = "worsening"
    elif combined <= 1 and state["visibility"] >= 2:
        trend = "improving"
    elif state["weather_severity"] == 0 or (state["weather_severity"] == 1 and state["visibility"] >= 2):
        trend = "clearing"

    return {
        "weather_hint": str(noisy(state["weather_severity"])),
        "visibility_hint": str(noisy(state["visibility"])),
        "terrain_hint": str(noisy(state["terrain_load"])),
        "trend": trend,
        "uncertainty": uncertainty_level(state, rng),
    }


def pick_decision(policy: str, state: dict[str, Any], turn: int, signals: dict[str, str]) -> tuple[str, str | None]:
    if policy == "human":
        print(f"\n--- Turn {turn} ---")
        print(
            "  Weather hint: "
            f"{signals['weather_hint']} | Trend: {signals['trend']} | Uncertainty: {signals['uncertainty']}"
        )
        print(
            "  Visibility hint: "
            f"{signals['visibility_hint']} | Terrain hint: {signals['terrain_hint']}"
        )
        print(
            "  Body: "
            f"capacity={state['functional_capacity']} fatigue={state['fatigue']} exposure={state['exposure']}"
        )
        print(f"  Resources: water={state['water']} food={state['food']}")
        print(f"  Position: {state['position']} | Altitude: {state['altitude_band']}")

        while True:
            choice = input("  Decision [advance / wait / descend]: ").strip().lower()
            if choice in ("advance", "wait", "descend"):
                rationale = input("  Why? (brief): ").strip()
                return choice, rationale
            print("  Invalid. Enter: advance, wait, or descend")

    if policy == "cautious":
        if state["functional_capacity"] < 45 or state["fatigue"] > 72 or state["exposure"] > 70:
            return "descend", None
        if state["weather_severity"] > 2 or state["terrain_load"] > 2:
            return "wait", None
        return ("advance", None) if turn <= 6 else ("wait", None)

    if policy == "aggressive":
        if state["functional_capacity"] < 30:
            return "descend", None
        return "advance", None

    return "wait", None


def update_position(state: dict[str, Any], decision: str) -> None:
    current = state.get("position", "horcones")
    if current not in POSITIONS:
        current = "horcones"
    idx = POSITIONS.index(current)

    if decision == "advance":
        if idx < len(POSITIONS) - 1 and state["weather_severity"] < 3 and state["terrain_load"] < 3:
            idx += 1
    elif decision == "descend":
        if idx > 0:
            idx -= 1

    state["position"] = POSITIONS[idx]
    state["altitude_band"] = POSITION_TO_ALTITUDE.get(state["position"], state.get("altitude_band", "mid"))


def apply_decision(
    state: dict[str, Any],
    decision: str,
    bias: dict[str, Any],
    rng: random.Random,
    turn: int,
) -> tuple[dict[str, int], list[str]]:
    flags: list[str] = []

    functional_capacity_before = state["functional_capacity"]
    fatigue_before_snapshot = state["fatigue"]
    exposure_before = state["exposure"]

    weather_shift = rng.choices(
        [-1, 0, 0, 1],
        weights=[max(0, state["weather_severity"]) * 15, 50, 25, 25],
        k=1,
    )[0] + bias.get("weather_deterioration", 0)

    terrain_shift = rng.choice([0, 1]) + bias.get("terrain_growth", 0)

    window_turns = set(bias.get("window_turns", []))
    if turn in window_turns:
        weather_shift -= 2
        terrain_shift = min(terrain_shift, 0)
    elif window_turns and turn > max(window_turns):
        weather_shift += bias.get("post_window_deterioration", 0)

    if decision == "wait" and state["terrain_load"] > 0:
        terrain_recovery = rng.choice([0, 0, -1])
        terrain_shift = min(terrain_shift, terrain_recovery)

    if decision == "advance":
        fatigue_delta = 10 + state["terrain_load"] * 3 + bias.get("fatigue_growth", 0)
        exposure_delta = 8 + state["weather_severity"] * 3
        capacity_delta = -6 - state["weather_severity"] * 2 - state["terrain_load"]
    elif decision == "wait":
        altitude_rest_modifier = {"low": -4, "mid": -2, "high": 0}.get(state.get("altitude_band", "mid"), -2)
        fatigue_delta = altitude_rest_modifier + bias.get("fatigue_growth", 0)
        exposure_delta = 4 + state["weather_severity"] * 2
        if state.get("altitude_band") == "high":
            capacity_delta = -2
        else:
            capacity_delta = -2 + (1 if state["visibility"] >= 2 else 0)
    else:  # descend
        fatigue_delta = 2 + state["terrain_load"]
        exposure_delta = 2 + state["weather_severity"]
        capacity_delta = -1
        flags.append("retreat-initiated")

    mod = ALTITUDE_MODIFIERS.get(state.get("altitude_band", "mid"), ALTITUDE_MODIFIERS["mid"])
    fatigue_delta = int(fatigue_delta * mod["fatigue_mult"])
    capacity_delta -= mod["capacity_penalty"]

    state["weather_severity"] = clamp(state["weather_severity"] + weather_shift, 0, 3)
    state["terrain_load"] = clamp(state["terrain_load"] + terrain_shift, 0, 3)
    state["visibility"] = clamp(3 - state["weather_severity"] + rng.choice([-1, 0, 1]), 0, 3)

    fatigue_before = state["fatigue"]
    state["fatigue"] = clamp(state["fatigue"] + fatigue_delta, 0, 100)
    state["exposure"] = clamp(state["exposure"] + exposure_delta, 0, 100)
    state["functional_capacity"] = clamp(state["functional_capacity"] + capacity_delta - fatigue_before // 25, 0, 100)

    state["water"] = max(0, state["water"] - 1)
    state["food"] = max(0, state["food"] - 1)

    update_position(state, decision)

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
        "functional_capacity_delta": state["functional_capacity"] - functional_capacity_before,
        "fatigue_delta": state["fatigue"] - fatigue_before_snapshot,
        "exposure_delta": state["exposure"] - exposure_before,
    }, flags


def classify_outcome(state: dict[str, Any], all_flags: list[str], ended_by_choice: bool) -> tuple[str, str]:
    if ended_by_choice:
        return "retreated", "voluntary descent"
    if state["functional_capacity"] <= 15:
        return "incapacitated", "functional capacity collapse"
    if state["exposure"] >= 75:
        return "deteriorated", "exposure critical at end"
    if state["fatigue"] >= 80:
        return "deteriorated", "fatigue critical at end"
    if state["functional_capacity"] >= 60:
        first_critical = next((f for f in all_flags if "critical" in f), "none")
        return "stabilized", f"no critical state at end (first warning: {first_critical})"
    return "survived-marginal", "timebox reached, body under stress"


def run_simulation(scenario: dict[str, Any], seed: int, policy: str) -> tuple[list[dict[str, Any]], RunResult]:
    rng = random.Random(seed)
    state = dict(scenario["initial_state"])

    logs: list[dict[str, Any]] = []
    all_flags: list[str] = []
    ended_by_choice = False
    highest_position_idx = POSITIONS.index(state.get("position", "horcones")) if state.get("position", "horcones") in POSITIONS else 0

    for turn in range(1, scenario["max_turns"] + 1):
        signals = observed_signals(state, rng)
        decision, rationale = pick_decision(policy, state, turn, signals)
        deltas, flags = apply_decision(state, decision, scenario.get("bias", {}), rng, turn)
        all_flags.extend(flags)

        if state["position"] in POSITIONS:
            highest_position_idx = max(highest_position_idx, POSITIONS.index(state["position"]))

        row = {
            "turn": turn,
            "decision": decision,
            "rationale": rationale,
            "observed": signals,
            "deltas": deltas,
            "state": dict(state),
            "position_label": POSITION_LABELS.get(state.get("position", ""), "unknown"),
            "flags": flags,
        }
        logs.append(row)

        if decision == "descend":
            ended_by_choice = True
            break
        if state["functional_capacity"] <= 15:
            break

    outcome, key_constraint = classify_outcome(state, all_flags, ended_by_choice)
    return logs, RunResult(
        outcome=outcome,
        key_constraint=key_constraint,
        total_turns=len(logs),
        highest_position_reached=POSITIONS[highest_position_idx],
    )


def write_outputs(logs: list[dict[str, Any]], result: RunResult, output_prefix: Path) -> None:
    output_prefix.parent.mkdir(parents=True, exist_ok=True)
    csv_path = output_prefix.with_suffix(".csv")
    jsonl_path = output_prefix.with_suffix(".jsonl")

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "turn", "position", "position_label", "altitude_band", "decision", "weather_hint", "visibility_hint", "terrain_hint", "trend", "uncertainty",
            "functional_capacity", "fatigue", "exposure", "water", "food", "flags", "rationale"
        ])
        for row in logs:
            writer.writerow([
                row["turn"],
                row["state"].get("position", "unknown"),
                row.get("position_label", "unknown"),
                row["state"].get("altitude_band", "unknown"),
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
                row.get("rationale") or "-",
            ])

    with jsonl_path.open("w", encoding="utf-8") as handle:
        for row in logs:
            handle.write(json.dumps(row) + "\n")
        handle.write(json.dumps({"summary": result.__dict__}) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an MRA v0 scenario and export run logs.")
    parser.add_argument("--scenario", required=True, type=Path, help="Path to scenario JSON file")
    parser.add_argument("--seed", required=True, type=int, help="Random seed")
    parser.add_argument("--policy", default="cautious", choices=["cautious", "aggressive", "waiter", "human"])
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
        "highest_position_reached": result.highest_position_reached,
        "key_constraint": result.key_constraint,
    }, indent=2))


if __name__ == "__main__":
    main()
