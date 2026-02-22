#!/usr/bin/env bash
set -euo pipefail

# Watink Bussines Interactive Installer
# Uso: sudo bash watink-bussines.sh

GITHUB_BIN_REPO="alltomatos/watink-bussines"
HUB_BASE_URL_DEFAULT="https://marketplace.alltomatos.dev.br"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERRO]${NC} $*"; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Execute como root: sudo bash watink-bussines.sh"
    exit 1
  fi
}

ask() {
  local prompt="$1"
  local default_value="${2:-}"
  local answer
  if [[ -n "$default_value" ]]; then
    read -r -p "$prompt [$default_value]: " answer
    echo "${answer:-$default_value}"
  else
    read -r -p "$prompt: " answer
    echo "$answer"
  fi
}

ask_secret() {
  local prompt="$1"
  local answer
  read -r -s -p "$prompt: " answer
  echo
  echo "$answer"
}

ask_yes_no() {
  local prompt="$1"
  local default="${2:-y}"
  local answer
  local hint="[y/N]"
  [[ "$default" == "y" ]] && hint="[Y/n]"

  read -r -p "$prompt $hint: " answer
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[Yy]$ ]]
}

gen_secret() {
  tr -dc 'A-Za-z0-9!@#$%&_+=' </dev/urandom | head -c 32
}

hub_latest_binary_url() {
  local hub_base="${HUB_BASE_URL:-$HUB_BASE_URL_DEFAULT}"
  curl -fsSL "${hub_base}/api/v1/hub/binaries/latest" | jq -r '.ok as $ok | if $ok then "'"${hub_base}"'" + "/api/v1/hub/binaries/latest/download" else "" end' 2>/dev/null || echo ""
}

github_release_asset_url() {
  local repo="$1"
  local ref="${2:-latest}"
  local api_url

  if [[ "$ref" == "latest" ]]; then
    api_url="https://api.github.com/repos/${repo}/releases/latest"
  else
    api_url="https://api.github.com/repos/${repo}/releases/tags/${ref}"
  fi

  curl -fsSL "$api_url" | python3 - <<'PY'
import json,sys
try:
    data=json.load(sys.stdin)
    assets=data.get("assets") or []
    if not assets:
        print("")
        raise SystemExit(0)
    # Prioriza arquivo com nome contendo watink-core
    chosen=None
    for a in assets:
        name=(a.get("name") or "").lower()
        if "watink-core" in name or "watink" in name:
            chosen=a
            break
    if chosen is None:
        chosen=assets[0]
    print(chosen.get("browser_download_url") or "")
except Exception:
    print("")
PY
}

resolve_binary_source() {
  local input="$1"
  local source="$input"

  if [[ -z "$source" || "$source" == "latest" ]]; then
    # Preferência: Hub broker (funciona com repo privado)
    source="$(hub_latest_binary_url)"
    if [[ -z "$source" ]]; then
      # Fallback: release pública no GitHub
      source="$(github_release_asset_url "$GITHUB_BIN_REPO" "latest")"
    fi
  elif [[ "$source" =~ ^v[0-9] ]]; then
    source="$(github_release_asset_url "$GITHUB_BIN_REPO" "$source")"
  fi

  echo "$source"
}

install_base_packages() {
  log "Atualizando sistema e instalando pacotes base..."
  apt update
  apt -y upgrade
  apt -y install curl wget git unzip ca-certificates gnupg lsb-release nginx certbot python3-certbot-nginx jq
  ok "Pacotes base instalados"
}

install_docker_if_needed() {
  if command -v docker >/dev/null 2>&1; then
    ok "Docker já instalado"
    return
  fi

  log "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  ok "Docker instalado"
}

prepare_dirs() {
  mkdir -p /opt/watink/{app,data}
  chmod -R 755 /opt/watink
  ok "Estrutura criada em /opt/watink"
}

write_deps_compose() {
  local pg_pass="$1"
  local rabbit_pass="$2"

  cat >/opt/watink/docker-compose.deps.yml <<EOF
services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: watink
      POSTGRES_PASSWORD: ${pg_pass}
      POSTGRES_DB: watink
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "127.0.0.1:6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    restart: always
    environment:
      RABBITMQ_DEFAULT_USER: watink
      RABBITMQ_DEFAULT_PASS: ${rabbit_pass}
    ports:
      - "127.0.0.1:5672:5672"
      - "127.0.0.1:15672:15672"
    volumes:
      - ./data/rabbitmq:/var/lib/rabbitmq
EOF

  ok "docker-compose.deps.yml criado"
}

start_dependencies() {
  log "Subindo Postgres/Redis/RabbitMQ..."
  (cd /opt/watink && docker compose -f docker-compose.deps.yml up -d)
  ok "Dependências ativas"
}

install_binary() {
  local binary_source="$1"
  local binary_path="/opt/watink/app/watink-core"

  if [[ -f "$binary_source" ]]; then
    cp -f "$binary_source" "$binary_path"
  else
    wget -O "$binary_path" "$binary_source"
  fi

  chmod +x "$binary_path"
  ok "Binário instalado em $binary_path"
}

write_env_file() {
  local jwt_secret="$1"
  local pg_pass="$2"
  local rabbit_pass="$3"
  local domain="$4"

  cat >/opt/watink/app/.env <<EOF
PORT=8082
JWT_SECRET=${jwt_secret}

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=watink
DB_PASS=${pg_pass}
DB_NAME=watink

REDIS_URL=redis://127.0.0.1:6379
AMQP_URL=amqp://watink:${rabbit_pass}@127.0.0.1:5672/

RABBITMQ_MANAGEMENT_URL=http://127.0.0.1:15672
RABBITMQ_MANAGEMENT_USER=watink
RABBITMQ_MANAGEMENT_PASS=${rabbit_pass}

FRONTEND_URL=https://${domain}
BACKEND_URL=https://${domain}
EOF

  chmod 600 /opt/watink/app/.env
  ok ".env criado"
}

write_systemd_service() {
  cat >/etc/systemd/system/watink.service <<'EOF'
[Unit]
Description=Watink Bussines Core
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/watink/app
EnvironmentFile=/opt/watink/app/.env
ExecStart=/opt/watink/app/watink-core
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now watink
  ok "Serviço systemd 'watink' ativo"
}

write_nginx_conf() {
  local domain="$1"

  cat >/etc/nginx/sites-available/watink-bussines.conf <<EOF
server {
  listen 80;
  server_name ${domain};

  location / {
    proxy_pass http://127.0.0.1:8082;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300;
  }
}
EOF

  ln -sf /etc/nginx/sites-available/watink-bussines.conf /etc/nginx/sites-enabled/watink-bussines.conf

  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
  systemctl reload nginx
  ok "Nginx configurado"
}

issue_ssl() {
  local domain="$1"
  local email="$2"

  log "Emitindo SSL (Let's Encrypt)..."
  certbot --nginx -d "$domain" -m "$email" --agree-tos -n --redirect
  ok "SSL emitido"
}

validate_install() {
  local domain="$1"
  sleep 2

  log "Validação local: /api/health"
  curl -fsS "http://127.0.0.1:8082/api/health" >/dev/null
  ok "Health local OK"

  if ask_yes_no "Validar health externo em https://${domain}/api/health?" "y"; then
    curl -kfsS "https://${domain}/api/health" >/dev/null && ok "Health externo OK" || warn "Health externo ainda não respondeu (DNS/SSL pode estar propagando)"
  fi

  echo
  systemctl --no-pager --full status watink | sed -n '1,20p'
  echo
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | sed -n '1,10p'
}

main() {
  require_root

  echo
  echo "======================================================"
  echo "   Watink Bussines - Instalador Interativo"
  echo "======================================================"
  echo

  local domain
  local email
  local binary_source
  local pg_pass
  local rabbit_pass
  local jwt_secret

  domain="$(ask 'Domínio público do painel (ex: watinkdev.alltomatos.dev.br)')"
  email="$(ask 'E-mail para SSL (Certbot)' 'ronaldodavi@gmail.com')"
  binary_source="$(ask "URL/caminho do binário (ou 'latest' via Hub broker / 'vX.Y.Z' do repo ${GITHUB_BIN_REPO})" "latest")"
  binary_source="$(resolve_binary_source "$binary_source")"

  if [[ -z "$binary_source" ]]; then
    err "Não foi possível resolver o binário automaticamente no GitHub. Informe uma URL/caminho válido."
    exit 1
  fi

  if ask_yes_no "Gerar senhas fortes automaticamente?" "y"; then
    pg_pass="$(gen_secret)"
    rabbit_pass="$(gen_secret)"
    jwt_secret="$(gen_secret)"
    ok "Segredos gerados"
  else
    pg_pass="$(ask_secret 'Senha do Postgres (user watink)')"
    rabbit_pass="$(ask_secret 'Senha do RabbitMQ (user watink)')"
    jwt_secret="$(ask_secret 'JWT_SECRET')"
  fi

  echo
  echo "Resumo:"
  echo "- Domínio: $domain"
  echo "- E-mail SSL: $email"
  echo "- Binário: $binary_source"
  echo "- Instalação em: /opt/watink"
  echo

  if ! ask_yes_no "Confirmar e iniciar instalação?" "y"; then
    warn "Instalação cancelada pelo usuário"
    exit 0
  fi

  install_base_packages
  install_docker_if_needed
  prepare_dirs
  write_deps_compose "$pg_pass" "$rabbit_pass"
  start_dependencies
  install_binary "$binary_source"
  write_env_file "$jwt_secret" "$pg_pass" "$rabbit_pass" "$domain"
  write_systemd_service
  write_nginx_conf "$domain"
  issue_ssl "$domain" "$email"
  validate_install "$domain"

  echo
  ok "Instalação concluída com sucesso 🎉"
  echo
  echo "Credenciais salvas em: /opt/watink/app/.env"
  echo "Dica: faça backup seguro desse arquivo."
}

main "$@"
