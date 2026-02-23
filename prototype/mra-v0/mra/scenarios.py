from __future__ import annotations

import json
from pathlib import Path
from typing import Any


REQUIRED_KEYS = {
    "id",
    "title",
    "max_turns",
    "altitude_band",
    "initial_state",
    "environment_profile",
    "thresholds",
}


def load_scenario(scenarios_dir: Path, scenario_id: str) -> dict[str, Any]:
    path = scenarios_dir / f"{scenario_id}.json"
    if not path.exists():
        available = sorted(p.stem for p in scenarios_dir.glob("*.json"))
        raise FileNotFoundError(
            f"Scenario '{scenario_id}' not found at {path}. Available: {available}"
        )

    data = json.loads(path.read_text(encoding="utf-8"))
    missing = REQUIRED_KEYS - set(data)
    if missing:
        raise ValueError(f"Scenario '{scenario_id}' is missing keys: {sorted(missing)}")

    return data
