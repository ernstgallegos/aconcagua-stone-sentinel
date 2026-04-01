#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <source-skill-md> [installed-skill-name]" >&2
  echo "Example: $0 docs/ai/skills/prompting-for-frontend-aesthetics-skill.md prompting-for-frontend-aesthetics" >&2
  exit 1
fi

SOURCE_PATH="$1"
SKILL_NAME="${2:-$(basename "${SOURCE_PATH%.*}")}"

if [[ ! -f "$SOURCE_PATH" ]]; then
  echo "Skill source file not found: $SOURCE_PATH" >&2
  exit 1
fi

TARGET_ROOT="${CODEX_HOME:-$HOME/.codex}/skills"
TARGET_DIR="$TARGET_ROOT/$SKILL_NAME"
TARGET_FILE="$TARGET_DIR/SKILL.md"

mkdir -p "$TARGET_DIR"
cp "$SOURCE_PATH" "$TARGET_FILE"

echo "Installed skill: $SKILL_NAME"
echo "Source: $SOURCE_PATH"
echo "Target: $TARGET_FILE"
echo "Restart Codex web session to pick up newly installed skills."
