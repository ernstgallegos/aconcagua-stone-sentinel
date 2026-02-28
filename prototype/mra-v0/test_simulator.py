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


class TestBalance(unittest.TestCase):
    """Validates that positive outcomes are mechanically reachable.

    These tests act as balance regression guards: if any of them fail,
    it indicates a regression in apply_decision() or classify_outcome()
    that makes victory states unreachable.
    """

    def test_summit_outcome_is_reachable_under_optimal_conditions(self):
        """With ideal conditions and aggressive policy, 'summit' must be achievable."""
        scenario = load_scenario(SCENARIOS_DIR / "optimal-conditions.json")
        _, result = run_simulation(scenario, seed=1, policy="aggressive")
        self.assertEqual(
            result.outcome,
            "summit",
            f"Expected 'summit' under optimal conditions, got '{result.outcome}' "
            f"(highest: {result.highest_position_reached}). "
            "Balance regression — check fatigue divisor in apply_decision() "
            "and summit_reached logic in run_simulation().",
        )
        self.assertEqual(result.highest_position_reached, "route")

    def test_stabilized_outcome_is_reachable_under_optimal_conditions(self):
        """With ideal conditions, a cautious policy must reach summit or stabilize."""
        scenario = load_scenario(SCENARIOS_DIR / "optimal-conditions.json")
        _, result = run_simulation(scenario, seed=1, policy="cautious")
        self.assertIn(
            result.outcome,
            {"stabilized", "summit"},
            f"Expected 'stabilized' or 'summit' under optimal conditions, "
            f"got '{result.outcome}'. Balance regression.",
        )

    def test_outcome_taxonomy_is_complete(self):
        """All returned outcomes must belong to the declared taxonomy."""
        valid_outcomes = {
            "summit", "stabilized", "retreated",
            "deteriorated", "incapacitated", "survived-marginal",
        }
        scenario = load_scenario(SCENARIOS_DIR / "optimal-conditions.json")
        _, result = run_simulation(scenario, seed=1, policy="aggressive")
        self.assertIn(result.outcome, valid_outcomes)


class TestPolicyValidation(unittest.TestCase):
    """Validates explicit policy handling and error behavior in pick_decision()."""

    def _make_state(self):
        return {
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

    def _make_signals(self):
        return {
            "weather_hint": "2",
            "visibility_hint": "1",
            "terrain_hint": "2",
            "trend": "stable",
            "uncertainty": "high",
        }

    def test_waiter_policy_is_explicit_in_source(self):
        """The 'waiter' policy must have its own named branch, not rely on fallthrough."""
        import inspect
        from simulator import pick_decision
        source = inspect.getsource(pick_decision)
        self.assertIn(
            'policy == "waiter"',
            source,
            "The 'waiter' policy must have an explicit branch in pick_decision(). "
            "A fallthrough default is not acceptable.",
        )

    def test_waiter_policy_returns_wait(self):
        """The 'waiter' policy must always return ('wait', None)."""
        from simulator import pick_decision
        decision, rationale = pick_decision(
            "waiter", self._make_state(), turn=5, signals=self._make_signals()
        )
        self.assertEqual(decision, "wait")
        self.assertIsNone(rationale)

    def test_unknown_policy_raises_value_error(self):
        """An unrecognized policy name must raise ValueError, not silently return 'wait'."""
        from simulator import pick_decision
        low_state = {
            "altitude_band": "low", "position": "horcones",
            "weather_severity": 0, "visibility": 3, "terrain_load": 0,
            "functional_capacity": 90, "fatigue": 10, "exposure": 5,
            "water": 10, "food": 10,
        }
        low_signals = {
            "weather_hint": "0", "visibility_hint": "3", "terrain_hint": "0",
            "trend": "clearing", "uncertainty": "low",
        }
        with self.assertRaises(ValueError) as ctx:
            pick_decision("undefined_policy_xyz", low_state, turn=1, signals=low_signals)
        self.assertIn("Unknown policy", str(ctx.exception))

    def test_summit_outcome_sets_highest_position_to_route(self):
        """A run that produces 'summit' must report highest_position_reached as 'route'."""
        scenario = load_scenario(SCENARIOS_DIR / "optimal-conditions.json")
        _, result = run_simulation(scenario, seed=1, policy="aggressive")
        if result.outcome == "summit":
            self.assertEqual(result.highest_position_reached, "route")


if __name__ == "__main__":
    unittest.main()
