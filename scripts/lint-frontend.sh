#!/usr/bin/env bash
set -euo pipefail
# Lint staged JS/JSX files from frontend
# Called by lint-staged with staged file paths as arguments
cd "$(dirname "$0")/../frontend" || exit 1
exec ./node_modules/.bin/eslint --max-warnings=0 "$@"
