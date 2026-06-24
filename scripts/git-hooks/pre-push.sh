#!/usr/bin/env bash
set -euo pipefail

echo "[pre-push] running quality gates"

# Backend checks
if [ -f "business/go.mod" ]; then
  echo "[pre-push] go test ./..."
  (cd business && DB_HOST=localhost DB_PORT=5432 DB_NAME=watink DB_USER=postgres DB_PASS=watink_secret_pass go test ./...)

  if command -v golangci-lint >/dev/null 2>&1; then
    echo "[pre-push] golangci-lint run (new issues only)"
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
      (cd business && golangci-lint run --new-from-rev=origin/main)
    else
      (cd business && golangci-lint run --new-from-rev=HEAD~1)
    fi
  else
    echo "[pre-push] golangci-lint not installed, skipping"
  fi
fi

# Frontend checks
if [ -f "frontend/package.json" ]; then
  echo "[pre-push] frontend build"
  (cd frontend && npm run build)
fi

echo "[pre-push] ok"
