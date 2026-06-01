#!/usr/bin/env bash
set -euo pipefail

echo "[pre-commit] running staged checks"

# Run lint-staged rules from package.json
npx lint-staged

echo "[pre-commit] ok"
