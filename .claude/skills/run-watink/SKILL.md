---
name: run-watink
description: Build, run, and drive the Watink WhatsApp business platform. Use when asked to start Watink, run its services, build it, take a screenshot of its UI, or interact with the running app.
---

# Watink — WhatsApp Business Platform

Open-source WhatsApp business automation platform with microservices architecture (Go backend, React frontend, RabbitMQ engine). Drive it via `.claude/skills/run-watink/driver.mjs` — the driver manages Docker dependencies, service lifecycle, health checks, and screenshots.

All paths below are relative to the repo root (`/home/ronaldo/watinkdev`).

## Prerequisites

```bash
# Go 1.24+ (install to home if not system-wide)
curl -fsSL https://go.dev/dl/go1.24.4.linux-amd64.tar.gz | tar -C $HOME -xzf -
export PATH="$HOME/go/bin:$PATH"
export GOROOT="$HOME/go"
export GOPATH="$HOME/gopath"
mkdir -p "$GOPATH"

# Node.js 20+ (already available on this host)
# No legacy-peer-deps needed - framer-motion 6.5.1 is compatible with React 17
npm install

# Docker (for PostgreSQL, Redis, RabbitMQ)
# On WSL: ensure Docker Desktop is running and user is in docker group
sudo usermod -aG docker $USER && newgrp docker
```

## Setup

```bash
# 1. Install frontend deps
cd frontend && npm install && cd ..

# 2. Build frontend (also syncs to Go embed dir)
cd frontend && npm run build && cd ..

# 3. Build backend Go (requires CGO for postgres driver)
cd business && CGO_ENABLED=1 go build -o watink-business ./cmd/server/main.go && cd ..

# 4. Build engine Go
cd engine-go && go build -o engine-go ./cmd/engine/main.go && cd ..

# 5. Build plugin manager
cd plugin-manager && go build -o plugin-manager . && cd ..

# 6. Install marketplace hub deps
cd marketplace-hub && npm install && cd ..
```

## Build

```bash
# Frontend (must run first — output syncs to Go embed dir)
cd frontend && npm run build && cd ..

# Backend (embeds frontend build)
cd business && CGO_ENABLED=1 go build -o watink-business ./cmd/server/main.go && cd ..
```

## Run (agent path)

```bash
# Start Docker dependencies (PostgreSQL, Redis, RabbitMQ)
docker compose -f docker-compose.business.yml up -d
sleep 30  # PostgreSQL needs time to initialize

# Set required env vars before starting backend
export DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASS=watink_secret_pass DB_NAME=watink
export AMQP_URL=amqp://guest:guest@localhost:5672
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=dev-jwt-secret JWT_REFRESH_SECRET=dev-jwt-refresh-secret

# Start backend Go (port 8082, serves API + embedded frontend)
cd business && ./watink-business &
cd ..

# Start frontend dev server (port 3000, hot reload)
cd frontend && npx vite --port 3000 --host 0.0.0.0 &
cd ..

# Start engine Go (RabbitMQ consumer, no HTTP port)
cd engine-go && ./engine-go &
cd ..

# Start plugin manager (port 8081)
cd plugin-manager && ./plugin-manager &
cd ..

# Start marketplace hub (port 8090)
cd marketplace-hub && npm start &
cd ..

# Wait for backend health
until curl -sf http://localhost:8082/api/v1/health; do sleep 2; done

# Wait for frontend
until curl -sf http://localhost:3000; do sleep 2; done
```

Or use the driver:

```bash
# Check deps
node .claude/skills/run-watink/driver.mjs init

# Start all services
node .claude/skills/run-watink/driver.mjs launch

# Show status
node .claude/skills/run-watink/driver.mjs ss

# Check backend health
node .claude/skills/run-watink/driver.mjs health

# Stop all services
node .claude/skills/run-watink/driver.mjs stop
```

| Driver command | What it does |
|---|---|
| `init` | Check Docker, Go binaries, frontend build |
| `launch` | Start Docker deps + all 5 services |
| `stop` | Gracefully stop all services |
| `ss` | Print status table (process, health, port) |
| `health` | Fetch `GET /api/v1/health` from backend |
| `screenshot` | Take screenshot via chromium-cli or puppeteer |

Screenshots land in the CWD as `watink-screenshot.png`.

## Run (human path)

```bash
# With PM2 (starts all services from ecosystem.config.js)
pm2 start ecosystem.config.js

# Or individual terminals per service
cd business && ./watink-business          # port 8082
cd frontend && npm run dev                # port 3000
cd engine-go && ./engine-go               # AMQP only
cd plugin-manager && ./plugin-manager     # port 8081
cd marketplace-hub && npm start           # port 8090
```

## Test

```bash
# Backend Go tests
cd business && go test ./...

# Engine Go tests
cd engine-go && go test ./...

# Frontend lint
cd frontend && npm run lint

# Smoke test (requires running app)
SMOKE_BASE_URL=http://localhost:3000 SMOKE_EMAIL=user@example.com SMOKE_PASS=secret node scripts/playwright-smoke.js

# Health check
curl http://localhost:8082/api/v1/health
```

## Gotchas

- **`npm install` works without `--legacy-peer-deps`** — framer-motion 6.5.1 is compatible with React 17
- **Go `go.sum` may be incomplete** — if `go build` fails with "missing go.sum entry", run `go mod tidy` first in the service directory.
- **Docker socket permissions on WSL** — the `docker` group exists but the shell session may not have it loaded. Run `newgrp docker` or start a new login shell after `usermod -aG docker`.
- **Frontend build must precede backend build** — `npm run build` in `frontend/` runs `sync-embed-go.js` which copies the build output to `business/internal/web/build/` for Go's `embed.FS`. If you skip this, the backend binary won't serve the SPA.
- **Backend auto-migrates and seeds on startup** — it calls `database.Migrate()` then `database.Seed()` on every boot. Schema changes apply automatically but RLS policy creation may fail if the DB isn't ready.
- **Engine Go requires RabbitMQ** — it fatal-exits if it can't connect. Backend Go is more tolerant (logs a warning and continues without RabbitMQ).
- **Port 8082 backend also serves frontend** — the Go binary embeds the React build. Port 3000 (Vite) is only for hot-reload dev. In production, only port 8082 is needed.

## Troubleshooting

- **`npm install` fails with ERESOLVE`**: This should not happen with framer-motion 6.5.1. If it does, try `npm install --legacy-peer-deps`.
- **`go build` fails with "missing go.sum entry"**: Run `go mod tidy` in the service directory (`business/`, `engine-go/`, `plugin-manager/`).
- **`go build` fails with "unknown revision"**: The `go.sum` references a protobuf version that doesn't exist. Run `GOTOOLCHAIN=auto go mod tidy` to let Go resolve the toolchain.
- **Docker "permission denied"**: `sudo usermod -aG docker $USER && newgrp docker`. On WSL, you may need to restart the terminal.
- **`psql: connection refused`**: Docker compose PostgreSQL hasn't started yet. Wait 30s or check `docker compose logs postgres`.
- **Backend exits immediately with "Failed to connect to database"**: Ensure PostgreSQL is running and env vars `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` are set.