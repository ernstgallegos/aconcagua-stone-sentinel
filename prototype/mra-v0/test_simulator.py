import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from simulator import load_scenario, run_simulation, uncertainty_level


class TestSimulator(unittest.TestCase):
    def test_resources_are_clamped(self):
        scenario = load_scenario(Path("prototype/mra-v0/scenarios/accumulated-fatigue-trap.json"))
        logs, _ = run_simulation(scenario, seed=808, policy="waiter")
        self.assertGreaterEqual(min(row["state"]["water"] for row in logs), 0)
        self.assertGreaterEqual(min(row["state"]["food"] for row in logs), 0)

    def test_position_changes_with_decisions(self):
        scenario = load_scenario(Path("prototype/mra-v0/scenarios/narrow-weather-window.json"))
        logs, result = run_simulation(scenario, seed=101, policy="aggressive")
        self.assertIn(result.highest_position_reached, {"camp_c", "route"})
        visited_positions = {row["state"]["position"] for row in logs}
        self.assertGreater(len(visited_positions), 1)

    def test_outcome_taxonomy_has_no_aborted(self):
        scenario = load_scenario(Path("prototype/mra-v0/scenarios/false-stability-terrain.json"))
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
        import random

        uncertainty = uncertainty_level(state, random.Random(123))
        self.assertEqual(uncertainty, "high")

    def test_weather_window_scenario_is_available_and_runnable(self):
        scenario = load_scenario(Path("prototype/mra-v0/scenarios/weather-window.json"))
        _, result = run_simulation(scenario, seed=151, policy="cautious")
        self.assertIn(result.outcome, {"stabilized", "retreated", "deteriorated", "incapacitated", "survived-marginal"})


if __name__ == "__main__":
    unittest.main()
