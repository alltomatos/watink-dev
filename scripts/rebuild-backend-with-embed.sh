#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR/frontend"
echo "🏗️ Building frontend..."
npm run build

cd "$ROOT_DIR/bussines"
echo "🧩 Building backend-go with embedded frontend..."
go build -o backend-go cmd/server/main.go

cd "$ROOT_DIR"
echo "🔄 Restarting backend-go (PM2)..."
pm2 restart backend-go

echo "✅ Done: frontend synced to embed + backend rebuilt/restarted"
