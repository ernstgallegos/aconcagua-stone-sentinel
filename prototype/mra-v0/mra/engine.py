from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any


@dataclass
class State:
    turn: int
    position_index: int
    altitude_band: str
    weather_severity: int
    visibility: int
    terrain_load: int
    functional_capacity: int
    fatigue: int
    exposure: int
    water: int
    food: int


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def weighted_choice(rng: random.Random, weighted_values: list[tuple[int, int]]) -> int:
    values = [x[0] for x in weighted_values]
    weights = [x[1] for x in weighted_values]
    return rng.choices(values, weights=weights, k=1)[0]


def decide(policy: str, state: State, thresholds: dict[str, int], noisy: dict[str, Any]) -> str:
    severe = noisy["weather_trend"] == "worsening" and state.visibility <= 1
    depleted = state.functional_capacity <= thresholds["functional_low"]
    exhausted = state.fatigue >= thresholds["fatigue_high"]
    exposed = state.exposure >= thresholds["exposure_high"]

    if policy == "cautious":
        if depleted or exhausted or exposed:
            return "descend"
        if severe:
            return "wait"
        return "advance" if state.position_index < 3 else "wait"

    if policy == "ambitious":
        if depleted and (exhausted or exposed):
            return "descend"
        return "advance" if state.position_index < 3 else "wait"

    # balanced
    if depleted and (exhausted or exposed):
        return "descend"
    if severe or exhausted:
        return "wait"
    return "advance" if state.position_index < 3 else "wait"


def apply_environment(rng: random.Random, env_profile: dict[str, Any]) -> tuple[int, int, int]:
    weather = weighted_choice(rng, [tuple(x) for x in env_profile["weather_severity_weights"]])
    visibility = weighted_choice(rng, [tuple(x) for x in env_profile["visibility_weights"]])
    terrain = weighted_choice(rng, [tuple(x) for x in env_profile["terrain_load_weights"]])
    return weather, visibility, terrain


def noisy_signals(rng: random.Random, state: State) -> dict[str, Any]:
    # intentionally partial and noisy
    weather_trend_roll = rng.randint(-1, 1)
    trend_score = state.weather_severity + weather_trend_roll
    if trend_score >= 2:
        weather_trend = "worsening"
    elif trend_score <= 1:
        weather_trend = "stable"
    else:
        weather_trend = "unclear"

    if state.functional_capacity < 40:
        body_signal = "strained"
    elif state.functional_capacity < 70:
        body_signal = "loaded"
    else:
        body_signal = "operational"

    uncertainty_tag = rng.choice(["low", "medium", "medium", "high"])

    return {
        "weather_trend": weather_trend,
        "body_signal": body_signal,
        "uncertainty_tag": uncertainty_tag,
    }


def apply_decision(state: State, decision: str) -> dict[str, int]:
    deltas = {
        "position_index": 0,
        "functional_capacity": 0,
        "fatigue": 0,
        "exposure": 0,
        "water": 0,
        "food": 0,
    }

    # baseline environmental pressure
    pressure = state.weather_severity + state.terrain_load + (3 - state.visibility)

    if decision == "advance":
        deltas["position_index"] = 1
        deltas["fatigue"] += 8 + pressure
        deltas["exposure"] += 6 + state.weather_severity
        deltas["functional_capacity"] -= 5 + pressure
        deltas["water"] -= 2
        deltas["food"] -= 2
    elif decision == "wait":
        deltas["fatigue"] += 2 + max(0, state.weather_severity - 1)
        deltas["exposure"] += 2 + max(0, state.weather_severity - 1)
        deltas["functional_capacity"] -= max(1, pressure - 2)
        deltas["water"] -= 1
        deltas["food"] -= 1
    elif decision == "descend":
        deltas["position_index"] = -1 if state.position_index > 0 else 0
        deltas["fatigue"] += max(1, 5 + state.terrain_load - 2)
        deltas["exposure"] += max(1, 4 + state.weather_severity - 1)
        deltas["functional_capacity"] -= max(1, pressure - 3)
        deltas["water"] -= 1
        deltas["food"] -= 1
    else:
        raise ValueError(f"Unknown decision: {decision}")

    return deltas


def apply_state_deltas(state: State, deltas: dict[str, int]) -> None:
    state.position_index = clamp(state.position_index + deltas["position_index"], 0, 3)
    state.functional_capacity = clamp(state.functional_capacity + deltas["functional_capacity"], 0, 100)
    state.fatigue = clamp(state.fatigue + deltas["fatigue"], 0, 100)
    state.exposure = clamp(state.exposure + deltas["exposure"], 0, 100)
    state.water = clamp(state.water + deltas["water"], 0, 20)
    state.food = clamp(state.food + deltas["food"], 0, 20)


def classify_outcome(state: State, turns_played: int, max_turns: int, thresholds: dict[str, int]) -> tuple[str, str]:
    if state.functional_capacity <= thresholds["functional_critical"]:
        return "deteriorated", "functional_capacity_critical"
    if state.exposure >= thresholds["exposure_critical"]:
        return "deteriorated", "exposure_critical"
    if state.fatigue >= thresholds["fatigue_critical"]:
        return "deteriorated", "fatigue_critical"
    if state.water == 0:
        return "aborted", "water_depleted"
    if state.food == 0:
        return "aborted", "food_depleted"
    if turns_played >= max_turns and state.position_index >= 2:
        return "stabilized", "time_limit_reached_with_progress"
    if turns_played >= max_turns and state.position_index < 2:
        return "retreated", "time_limit_low_position"
    return "ongoing", "none"


def run_simulation(scenario: dict[str, Any], seed: int, policy: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    rng = random.Random(seed)
    initial = scenario["initial_state"]

    state = State(
        turn=0,
        position_index=initial["position_index"],
        altitude_band=scenario["altitude_band"],
        weather_severity=initial["weather_severity"],
        visibility=initial["visibility"],
        terrain_load=initial["terrain_load"],
        functional_capacity=initial["functional_capacity"],
        fatigue=initial["fatigue"],
        exposure=initial["exposure"],
        water=initial["water"],
        food=initial["food"],
    )

    events: list[dict[str, Any]] = []
    max_turns = scenario["max_turns"]
    thresholds = scenario["thresholds"]

    outcome_class = "ongoing"
    outcome_reason = "none"

    while state.turn < max_turns and outcome_class == "ongoing":
        state.turn += 1

        weather, visibility, terrain = apply_environment(rng, scenario["environment_profile"])
        state.weather_severity = weather
        state.visibility = visibility
        state.terrain_load = terrain

        observed = noisy_signals(rng, state)
        decision = decide(policy, state, thresholds, observed)

        deltas = apply_decision(state, decision)
        apply_state_deltas(state, deltas)

        outcome_class, outcome_reason = classify_outcome(
            state=state,
            turns_played=state.turn,
            max_turns=max_turns,
            thresholds=thresholds,
        )

        events.append(
            {
                "turn": state.turn,
                "observed_signals": observed,
                "decision": decision,
                "state": {
                    "position_index": state.position_index,
                    "altitude_band": state.altitude_band,
                    "weather_severity": state.weather_severity,
                    "visibility": state.visibility,
                    "terrain_load": state.terrain_load,
                    "functional_capacity": state.functional_capacity,
                    "fatigue": state.fatigue,
                    "exposure": state.exposure,
                    "water": state.water,
                    "food": state.food,
                },
                "state_deltas": deltas,
                "threshold_event": outcome_reason if outcome_class != "ongoing" else "none",
            }
        )

    summary = {
        "scenario_id": scenario["id"],
        "scenario_title": scenario["title"],
        "seed": seed,
        "policy": policy,
        "turns_played": state.turn,
        "outcome_class": outcome_class,
        "outcome_reason": outcome_reason,
        "final_state": {
            "position_index": state.position_index,
            "functional_capacity": state.functional_capacity,
            "fatigue": state.fatigue,
            "exposure": state.exposure,
            "water": state.water,
            "food": state.food,
        },
    }

    return events, summary
