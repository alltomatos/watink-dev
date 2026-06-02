#!/usr/bin/env bash
set -euo pipefail
# Lint staged JS/JSX files from frontend
# Called by lint-staged with staged file paths as arguments
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

cd "$FRONTEND_DIR" || exit 1

args=()
for file in "$@"; do
  case "$file" in
    frontend/*) args+=("${file#frontend/}") ;;
    "$ROOT_DIR"/frontend/*) args+=("${file#"$ROOT_DIR"/frontend/}") ;;
    *) args+=("$file") ;;
  esac
done

exec "$FRONTEND_DIR/node_modules/.bin/eslint" --max-warnings=0 "${args[@]}"
