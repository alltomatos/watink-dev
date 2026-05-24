#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
ACTION="${1:-up}"

case "$ACTION" in
  up)
    docker compose -f docker-compose.business.yml up -d
    echo "[OK] watink business docker up"
    ;;
  down)
    docker compose -f docker-compose.business.yml down
    echo "[OK] watink business docker down"
    ;;
  rebuild)
    docker compose -f docker-compose.business.yml down -v
    docker compose -f docker-compose.business.yml build --no-cache
    docker compose -f docker-compose.business.yml up -d
    echo "[OK] watink business docker rebuild"
    ;;
  logs)
    docker compose -f docker-compose.business.yml logs -f
    ;;
  status)
    docker compose -f docker-compose.business.yml ps
    ;;
  *)
    echo "Uso: $0 {up|down|rebuild|logs|status}"
    exit 1
    ;;
esac
