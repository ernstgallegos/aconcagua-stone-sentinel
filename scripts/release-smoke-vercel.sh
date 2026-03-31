#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://aconcagua-stone-sentinel.vercel.app}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fetch() {
  local path="$1"
  local out="$2"
  curl -fsSL "${BASE_URL}${path}" -o "$out"
}

assert_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if ! rg -q "$needle" "$file"; then
    echo "FAIL: ${label} did not contain expected marker: ${needle}" >&2
    exit 1
  fi
}

LANDING_HTML="${TMP_DIR}/landing.html"
WEBV1_HTML="${TMP_DIR}/web-v1.html"
DEEP_LINKS_MD="${TMP_DIR}/deep-links.md"

fetch "/" "$LANDING_HTML"
assert_contains "$LANDING_HTML" "Play current web prototype" "Landing page"
assert_contains "$LANDING_HTML" "prototype/web-v1/index.html" "Landing CTA"

fetch "/prototype/web-v1/index.html" "$WEBV1_HTML"
assert_contains "$WEBV1_HTML" "id=\"screen-title\"" "web-v1 title screen"
assert_contains "$WEBV1_HTML" "id=\"screen-expedition-setup\"" "web-v1 expedition setup screen"
assert_contains "$WEBV1_HTML" "Prototype · v1.4.5" "web-v1 version chip"

fetch "/docs/deep-links.web-v1.md" "$DEEP_LINKS_MD"
assert_contains "$DEEP_LINKS_MD" "mendoza_room" "Part 2 deep-link docs"
assert_contains "$DEEP_LINKS_MD" "future_cta" "Part 2 final deep-link docs"

echo "release smoke passed for ${BASE_URL}"
