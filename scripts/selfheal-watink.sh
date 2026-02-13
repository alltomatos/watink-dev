#!/usr/bin/env bash
set -euo pipefail

WORKDIR="/root/.openclaw/workspace/watinkdev"
LOGFILE="/var/log/watink-selfheal.log"
LOCKFILE="/tmp/watink-selfheal.lock"
STATEFILE="/tmp/watink-selfheal.state"
COOLDOWN_SECONDS=300

mkdir -p "$(dirname "$LOGFILE")"
touch "$LOGFILE"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S%z')] $*" | tee -a "$LOGFILE"
}

load_state() {
  failure_count=0
  last_action_ts=0
  if [[ -f "$STATEFILE" ]]; then
    # shellcheck disable=SC1090
    source "$STATEFILE" || true
  fi
}

save_state() {
  cat > "$STATEFILE" <<EOF
failure_count=${failure_count}
last_action_ts=${last_action_ts}
EOF
}

restart_engine_only() {
  log "ACTION: restarting engine-standard only"
  cd "$WORKDIR"
  pm2 restart engine-standard --update-env >> "$LOGFILE" 2>&1 || true
}

check_api() {
  local code
  code=$(curl --noproxy '*' -s -o /dev/null -w '%{http_code}' -H 'Host: api.docker' http://127.0.0.1/public-settings || echo "000")
  [[ "$code" == "200" ]]
}

check_rabbit_consumer() {
  cd "$WORKDIR"
  local consumers
  consumers=$(docker compose -f docker-compose.dev.yml exec -T rabbitmq rabbitmqctl list_queues name consumers 2>/dev/null \
    | awk '$1=="wbot_standard_commands" {print $2}' | tail -n1)
  [[ -n "${consumers:-}" ]] && [[ "$consumers" -ge 1 ]]
}

validate_recovery() {
  local ok_api=0 ok_consumer=0
  check_api && ok_api=1 || true
  check_rabbit_consumer && ok_consumer=1 || true
  [[ $ok_api -eq 1 && $ok_consumer -eq 1 ]]
}

(
  flock -n 9 || exit 0

  load_state

  api_ok=0
  consumer_ok=0
  now_ts=$(date +%s)

  check_api && api_ok=1 || true
  check_rabbit_consumer && consumer_ok=1 || true

  if [[ $api_ok -eq 1 && $consumer_ok -eq 1 ]]; then
    failure_count=0
    save_state
    exit 0
  fi

  failure_count=$((failure_count + 1))
  log "DETECTED: unhealthy state api_ok=$api_ok consumer_ok=$consumer_ok failure_count=$failure_count"

  if [[ $consumer_ok -eq 0 ]]; then
    if (( now_ts - last_action_ts >= COOLDOWN_SECONDS )); then
      restart_engine_only
      last_action_ts=$now_ts
      sleep 4
      if validate_recovery; then
        log "RECOVERY: success (engine restart)"
        failure_count=0
        save_state
        exit 0
      fi
      log "RECOVERY: failed after engine restart (manual check required)"
    else
      log "SKIP: cooldown active, no auto-restart"
    fi
  else
    log "ESCALATE: API unhealthy but consumer is OK (no backend auto-restart by policy)"
  fi

  save_state
  exit 1

) 9>"$LOCKFILE"
