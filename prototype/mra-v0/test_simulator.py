import copy
import random
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from simulator import apply_decision, load_scenario, run_simulation, uncertainty_level

SCENARIOS_DIR = ROOT / "scenarios"


class TestSimulator(unittest.TestCase):
    def test_resources_are_clamped(self):
        scenario = load_scenario(SCENARIOS_DIR / "accumulated-fatigue-trap.json")
        logs, _ = run_simulation(scenario, seed=808, policy="waiter")
        self.assertGreaterEqual(min(row["state"]["water"] for row in logs), 0)
        self.assertGreaterEqual(min(row["state"]["food"] for row in logs), 0)

    def test_position_changes_with_decisions(self):
        scenario = load_scenario(SCENARIOS_DIR / "narrow-weather-window.json")
        logs, result = run_simulation(scenario, seed=101, policy="aggressive")
        self.assertIn(result.highest_position_reached, {"base_camp", "camp_a", "camp_b", "camp_c", "route"})
        visited_positions = {row["state"]["position"] for row in logs}
        self.assertGreater(len(visited_positions), 1)

    def test_route_progression_reaches_camp_c_before_route(self):
        state = {
            "altitude_band": "low",
            "position": "horcones",
            "weather_severity": 0,
            "visibility": 3,
            "terrain_load": 0,
            "functional_capacity": 95,
            "fatigue": 10,
            "exposure": 5,
            "water": 20,
            "food": 20,
        }
        rng = random.Random(9)
        visited = []
        for turn in range(1, 7):
            apply_decision(state, "advance", {}, rng, turn)
            visited.append(state["position"])

        self.assertEqual(visited[:5], ["base_camp", "camp_a", "camp_b", "camp_c", "route"])

    def test_outcome_taxonomy_has_no_aborted(self):
        scenario = load_scenario(SCENARIOS_DIR / "false-stability-terrain.json")
        _, result = run_simulation(scenario, seed=505, policy="cautious")
        self.assertIn(result.outcome, {"stabilized", "retreated", "deteriorated", "incapacitated", "survived-marginal"})

    def test_uncertainty_can_be_high_in_clear_weather_due_to_hypoxia(self):
        state = {
            "altitude_band": "high",
            "weather_severity": 0,
            "visibility": 3,
            "fatigue": 80,
            "exposure": 80,
        }
        uncertainty = uncertainty_level(state, random.Random(123))
        self.assertEqual(uncertainty, "high")

    def test_weather_window_scenario_is_available_and_runnable(self):
        scenario = load_scenario(SCENARIOS_DIR / "weather-window.json")
        _, result = run_simulation(scenario, seed=151, policy="cautious")
        self.assertIn(result.outcome, {"stabilized", "retreated", "deteriorated", "incapacitated", "survived-marginal"})

    def test_reported_deltas_match_net_state_changes(self):
        state = {
            "altitude_band": "mid",
            "position": "camp_b",
            "weather_severity": 2,
            "visibility": 1,
            "terrain_load": 2,
            "functional_capacity": 50,
            "fatigue": 62,
            "exposure": 68,
            "water": 1,
            "food": 1,
        }
        previous = copy.deepcopy(state)
        deltas, _ = apply_decision(state, "wait", {}, random.Random(2), turn=3)

        self.assertEqual(deltas["functional_capacity_delta"], state["functional_capacity"] - previous["functional_capacity"])
        self.assertEqual(deltas["fatigue_delta"], state["fatigue"] - previous["fatigue"])
        self.assertEqual(deltas["exposure_delta"], state["exposure"] - previous["exposure"])


if __name__ == "__main__":
    unittest.main()
