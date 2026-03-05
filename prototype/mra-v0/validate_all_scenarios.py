#!/usr/bin/env python3
"""Validate all MRA v0 scenario JSON files using simulator.validate_scenario()."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent
    scenarios = sorted(
        path
        for path in (root / "scenarios").glob("*.json")
        if path.name != "scenario.schema.json"
    )
    if not scenarios:
        print("No scenario files found.")
        return 1

    sys.path.insert(0, str(root))
    from simulator import validate_scenario  # pylint: disable=import-outside-toplevel

    for scenario_path in scenarios:
        payload = json.loads(scenario_path.read_text(encoding="utf-8"))
        validate_scenario(payload, source=scenario_path)

    print(f"Validated {len(scenarios)} scenario files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
