from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def write_outputs(
    outdir: Path,
    scenario_id: str,
    seed: int,
    policy: str,
    events: list[dict[str, Any]],
    summary: dict[str, Any],
) -> dict[str, Path]:
    outdir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stem = f"{ts}-{scenario_id}-s{seed}-{policy}"

    jsonl_path = outdir / f"{stem}.jsonl"
    summary_path = outdir / f"{stem}.summary.json"

    with jsonl_path.open("w", encoding="utf-8") as f:
        for row in events:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"jsonl": jsonl_path, "summary_json": summary_path}
