#!/usr/bin/env bash
set -euo pipefail

# Move to the calculator assets folder relative to repo root
cd "site/themes/veecasa/assets"

PORT="${1:-8080}"

echo "Starting local server in: $(pwd)"
echo "URL: http://localhost:${PORT}/mortgage-calculator.html"

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "${PORT}"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "${PORT}"
elif command -v npx >/dev/null 2>&1; then
  npx --yes serve . -l "${PORT}"
else
  echo "Error: Need python3/python or npx installed to run a local server."
  exit 1
fi
