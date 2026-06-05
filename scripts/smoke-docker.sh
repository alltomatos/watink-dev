#!/usr/bin/env bash
# smoke-docker.sh — Automated Docker stack smoke test for Watink
# Usage: ./scripts/smoke-docker.sh [--wait SECONDS]
# Exit codes: 0=pass, 1=fail
set -uo pipefail

COMPOSE_FILE="/home/ronaldo/watinkdev/docker-compose.dev.yml"
WAIT_SECONDS="${2:-15}"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0

log_pass() { echo -e "  ${GREEN}✅ PASS${NC} $1"; ((PASS++)); }
log_fail() { echo -e "  ${RED}❌ FAIL${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "  ${YELLOW}⚠️  WARN${NC} $1"; ((WARN++)); }
header()   { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

# ────────────────────────────────────────────
# 1. CONTAINER STATUS
# ────────────────────────────────────────────
header "Container Status"

REQUIRED_CONTAINERS=(
  "watink-business"
  "watink-engine"
  "watink-frontend"
  "watink-postgres"
  "watink-redis"
  "watink-rabbitmq"
  "watink-plugin-manager"
  "watink-hub"
)

for name in "${REQUIRED_CONTAINERS[@]}"; do
  status=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo "missing")
  if [[ "$status" == "running" ]]; then
    log_pass "$name → running"
  elif [[ "$status" == "missing" ]]; then
    log_fail "$name → NOT FOUND (not created)"
  else
    log_fail "$name → $status (expected running)"
  fi
done

# ────────────────────────────────────────────
# 2. INFRASTRUCTURE CONNECTIVITY
# ────────────────────────────────────────────
header "Infrastructure"

# PostgreSQL
pg_status=$(docker exec watink-postgres pg_isready -U watink 2>&1)
if echo "$pg_status" | grep -q "accepting connections"; then
  log_pass "PostgreSQL → accepting connections"
else
  log_fail "PostgreSQL → $pg_status"
fi

# Redis
redis_pong=$(docker exec watink-redis redis-cli ping 2>&1)
if [[ "$redis_pong" == "PONG" ]]; then
  log_pass "Redis → PONG"
else
  log_fail "Redis → $redis_pong"
fi

# RabbitMQ Management
rabbit_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:15672/ 2>/dev/null || echo "000")
if [[ "$rabbit_code" == "200" ]]; then
  log_pass "RabbitMQ Management → 200"
else
  log_fail "RabbitMQ Management → HTTP $rabbit_code"
fi

# ────────────────────────────────────────────
# 3. APPLICATION ENDPOINTS
# ────────────────────────────────────────────
header "Application Endpoints"

# Business API — Health (/api/v1/health)
biz_body=$(curl -sf http://localhost:8082/api/v1/health 2>/dev/null || echo '{"status":"FAIL"}')
if echo "$biz_body" | grep -q '"status":"OK"'; then
  log_pass "Business API :8082 /api/v1/health → 200 OK"
else
  log_fail "Business API :8082 /api/v1/health → $biz_body"
fi

# Business API — Public Settings (/api/v1/public-settings)
pub_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/api/v1/public-settings 2>/dev/null || echo "000")
if [[ "$pub_code" =~ ^(200|401|503)$ ]]; then
  log_pass "Business API :8082 /api/v1/public-settings → $pub_code"
else
  log_warn "Business API :8082 /api/v1/public-settings → $pub_code"
fi

# Frontend — Vite Dev Server
fe_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo "000")
if [[ "$fe_code" == "200" ]]; then
  log_pass "Frontend :3000 → 200"
else
  log_fail "Frontend :3000 → HTTP $fe_code"
fi

# Marketplace Hub — Root redirect
hub_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8090/ 2>/dev/null || echo "000")
if [[ "$hub_code" =~ ^(200|302)$ ]]; then
  log_pass "Hub :8090 → $hub_code"
else
  log_warn "Hub :8090 → HTTP $hub_code"
fi

# Plugin Manager — Port reachability
pm_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/ 2>/dev/null || echo "000")
if [[ "$pm_code" =~ ^(200|404)$ ]]; then
  log_pass "Plugin-Manager :8081 → reachable ($pm_code)"
else
  log_warn "Plugin-Manager :8081 → HTTP $pm_code"
fi

# ────────────────────────────────────────────
# 4. ERROR PATTERN SCAN (last 5 min logs)
# ────────────────────────────────────────────
header "Error Pattern Scan (last 5 min)"

CRITICAL_PATTERNS="panic|fatal|segfault|out of memory|connection refused"
for name in "${REQUIRED_CONTAINERS[@]}"; do
  errors=$(docker logs "$name" --since=5m 2>&1 | grep -cEi "$CRITICAL_PATTERNS" || true)
  if [[ "$errors" -eq 0 ]]; then
    log_pass "$name → 0 critical errors"
  else
    log_fail "$name → $errors critical error lines"
    docker logs "$name" --since=5m 2>&1 | grep -Ei "$CRITICAL_PATTERNS" | tail -3
  fi
done

# ────────────────────────────────────────────
# 5. SUMMARY
# ────────────────────────────────────────────
header "Summary"

TOTAL=$((PASS + FAIL + WARN))
echo -e "  Total: $TOTAL | ${GREEN}Pass: $PASS${NC} | ${RED}Fail: $FAIL${NC} | ${YELLOW}Warn: $WARN${NC}"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n${RED}🚨 SMOKE TEST FAILED — $FAIL critical issue(s) detected${NC}"
  exit 1
else
  echo -e "\n${GREEN}🎉 SMOKE TEST PASSED — All services operational${NC}"
  exit 0
fi
