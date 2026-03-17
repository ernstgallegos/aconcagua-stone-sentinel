import copy
import csv
import json
import random
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent
# Keep ROOT pointed at prototype/mra-v0: run_all imports and test mocks depend on this path.
sys.path.insert(0, str(ROOT))

from simulator import (  # noqa: E402
    apply_decision,
    classify_outcome,
    load_scenario,
    observed_signals,
    pick_decision,
    run_simulation,
    validate_scenario,
    write_outputs,
    uncertainty_level,
)

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

    def test_refactor_regression_seeded_signature_is_stable(self):
        scenario = load_scenario(SCENARIOS_DIR / "narrow-weather-window.json")
        logs, result = run_simulation(scenario, seed=101, policy="cautious")
        # Stable regression signature: cautious advances early and then retreats as fatigue/exposure accumulate.
        signature = (result.outcome, result.total_turns, logs[-1]["state"]["functional_capacity"], logs[-1]["state"]["position"])
        self.assertEqual(signature, ("retreated", 4, 40, "base_camp"))

    def test_validate_scenario_rejects_invalid_initial_state_types_and_ranges(self):
        scenario = load_scenario(SCENARIOS_DIR / "narrow-weather-window.json")

        bad_capacity = copy.deepcopy(scenario)
        bad_capacity["initial_state"]["functional_capacity"] = "90"
        with self.assertRaises(ValueError) as capacity_error:
            validate_scenario(bad_capacity)
        self.assertIn("initial_state.functional_capacity must be int 0-100", str(capacity_error.exception))

        bad_altitude = copy.deepcopy(scenario)
        bad_altitude["initial_state"]["altitude_band"] = "summit"
        with self.assertRaises(ValueError) as altitude_error:
            validate_scenario(bad_altitude)
        self.assertIn("initial_state.altitude_band", str(altitude_error.exception))

        bad_position = copy.deepcopy(scenario)
        bad_position["initial_state"]["position"] = "camp_z"
        with self.assertRaises(ValueError) as position_error:
            validate_scenario(bad_position)
        self.assertIn("initial_state.position", str(position_error.exception))

    def test_validate_scenario_rejects_bias_typo_and_non_numeric_values(self):
        scenario = load_scenario(SCENARIOS_DIR / "narrow-weather-window.json")

        typo_bias = copy.deepcopy(scenario)
        typo_bias["bias"]["fatigue_gorwth"] = 2
        with self.assertRaises(ValueError) as typo_error:
            validate_scenario(typo_bias)
        self.assertIn("bias contains unknown keys: fatigue_gorwth", str(typo_error.exception))

        wrong_type_bias = copy.deepcopy(scenario)
        wrong_type_bias["bias"]["terrain_growth"] = "fast"
        with self.assertRaises(ValueError) as type_error:
            validate_scenario(wrong_type_bias)
        self.assertIn("bias.terrain_growth must be a number", str(type_error.exception))


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


class TestOutputContracts(unittest.TestCase):
    def test_write_outputs_creates_expected_csv_and_jsonl_shapes(self):
        scenario = load_scenario(SCENARIOS_DIR / "narrow-weather-window.json")
        logs, result = run_simulation(scenario, seed=101, policy="cautious")

        with tempfile.TemporaryDirectory() as tmpdir:
            out_prefix = Path(tmpdir) / "sample"
            write_outputs(logs, result, out_prefix)

            with out_prefix.with_suffix(".csv").open("r", encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(handle)
                rows = list(reader)
                self.assertEqual(
                    reader.fieldnames,
                    [
                        "turn", "position", "position_label", "altitude_band", "decision", "weather_hint", "visibility_hint",
                        "terrain_hint", "trend", "uncertainty", "functional_capacity", "fatigue", "exposure", "water", "food", "flags", "rationale",
                    ],
                )
                self.assertGreater(len(rows), 0)

            lines = out_prefix.with_suffix(".jsonl").read_text(encoding="utf-8").strip().splitlines()
            summary = json.loads(lines[-1])["summary"]
            self.assertIn("outcome", summary)
            self.assertEqual(summary["total_turns"], len(logs))


class TestOutcomeClassification(unittest.TestCase):
    def test_classify_outcome_branches(self):
        self.assertEqual(classify_outcome({"functional_capacity": 90, "exposure": 10, "fatigue": 10}, [], False, True)[0], "summit")
        self.assertEqual(classify_outcome({"functional_capacity": 90, "exposure": 10, "fatigue": 10}, [], True, False)[0], "retreated")
        self.assertEqual(classify_outcome({"functional_capacity": 15, "exposure": 10, "fatigue": 10}, [], False, False)[0], "incapacitated")
        self.assertEqual(classify_outcome({"functional_capacity": 50, "exposure": 75, "fatigue": 10}, [], False, False)[0], "deteriorated")
        self.assertEqual(classify_outcome({"functional_capacity": 50, "exposure": 10, "fatigue": 80}, [], False, False)[0], "deteriorated")
        self.assertEqual(classify_outcome({"functional_capacity": 70, "exposure": 10, "fatigue": 10}, ["critical-fatigue"], False, False)[0], "stabilized")
        self.assertEqual(classify_outcome({"functional_capacity": 40, "exposure": 10, "fatigue": 10}, [], False, False)[0], "survived-marginal")


class TestObservedSignals(unittest.TestCase):
    def test_observed_signals_noise_bias_and_trend(self):
        low_state = {
            "altitude_band": "low", "weather_severity": 1, "visibility": 3, "terrain_load": 0,
            "functional_capacity": 85, "fatigue": 20, "exposure": 10,
        }
        high_state = {
            "altitude_band": "high", "weather_severity": 3, "visibility": 0, "terrain_load": 3,
            "functional_capacity": 40, "fatigue": 85, "exposure": 85,
        }
        low = observed_signals(low_state, random.Random(42))
        high = observed_signals(high_state, random.Random(42))
        self.assertIn(low["trend"], {"clearing", "improving", "stable", "worsening"})
        self.assertIn(high["trend"], {"clearing", "improving", "stable", "worsening"})
        self.assertLessEqual(int(low["weather_hint"]), 3)
        self.assertGreaterEqual(int(high["weather_hint"]), 0)
        self.assertIn(high["uncertainty"], {"medium", "high"})

    def test_observed_signals_euphoria_bias_is_observable(self):
        state = {
            "altitude_band": "low", "weather_severity": 1, "visibility": 2, "terrain_load": 1,
            "functional_capacity": 85, "fatigue": 20, "exposure": 10,
        }

        lowered_hints = 0
        for seed in range(1, 120):
            sampled = observed_signals(state, random.Random(seed))
            if int(sampled["weather_hint"]) <= state["weather_severity"] - 1:
                lowered_hints += 1

        self.assertGreaterEqual(lowered_hints, 1)


class TestPolicyBranches(unittest.TestCase):
    def test_aggressive_policy_threshold(self):
        signals = {"weather_hint": "1", "visibility_hint": "1", "terrain_hint": "1", "trend": "stable", "uncertainty": "medium"}
        decision_high, _ = pick_decision("aggressive", {"functional_capacity": 31}, 1, signals)
        decision_low, _ = pick_decision("aggressive", {"functional_capacity": 30}, 1, signals)
        self.assertEqual(decision_high, "advance")
        self.assertEqual(decision_low, "advance")
        decision_desc, _ = pick_decision("aggressive", {"functional_capacity": 29}, 1, signals)
        self.assertEqual(decision_desc, "descend")

    def test_human_policy_uses_injected_input_function(self):
        signals = {"weather_hint": "1", "visibility_hint": "1", "terrain_hint": "1", "trend": "stable", "uncertainty": "medium"}
        state = {
            "functional_capacity": 50,
            "fatigue": 40,
            "exposure": 30,
            "water": 3,
            "food": 3,
            "position": "horcones",
            "altitude_band": "low",
        }
        fake_inputs = iter(["advance", "testing rationale"])
        decision, rationale = pick_decision("human", state, 1, signals, input_fn=lambda _: next(fake_inputs))
        self.assertEqual(decision, "advance")
        self.assertEqual(rationale, "testing rationale")


class TestRunAllAndSchema(unittest.TestCase):
    def test_run_all_smoke_generates_output(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / "generated"
            cmd = [
                "python3",
                str(ROOT / "run_all.py"),
                "--base",
                str(ROOT),
                "--output-dir",
                str(output_dir),
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
            self.assertTrue(any(output_dir.glob("*.jsonl")))

    def test_run_all_continues_after_subprocess_error(self):
        with mock.patch("run_all.subprocess.run") as run_mock:
            import run_all

            call_counter = {"n": 0}

            def fake_run(*_args, **_kwargs):
                call_counter["n"] += 1
                if call_counter["n"] == 1:
                    raise subprocess.CalledProcessError(returncode=1, cmd=["python3"], stderr="boom")
                return mock.Mock(stdout=json.dumps({
                    "scenario": "ok",
                    "seed": 1,
                    "policy": "cautious",
                    "outcome": "stabilized",
                    "key_constraint": "none",
                }))

            run_mock.side_effect = fake_run
            with tempfile.TemporaryDirectory() as tmpdir:
                with self.assertRaises(SystemExit) as ctx:
                    with mock.patch.object(sys, "argv", ["run_all.py", "--base", str(ROOT), "--output-dir", tmpdir]):
                        run_all.main()
                self.assertEqual(ctx.exception.code, 1)

    def test_invalid_scenario_json_raises_clear_error(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            bad = Path(tmpdir) / "bad.json"
            bad.write_text(json.dumps({"id": "x", "seeds": [1]}), encoding="utf-8")
            with self.assertRaises(ValueError) as ctx:
                load_scenario(bad)
            self.assertIn("missing required fields", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
