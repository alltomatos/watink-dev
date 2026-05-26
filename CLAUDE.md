# CLAUDE.md This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watink — plataforma open-source de atendimento e automação no WhatsApp. Arquitetura de microsserviços com comunicação via RabbitMQ, multitenancy via PostgreSQL RLS, e sistema de plugins com licenciamento centralizado.

## Architecture

```
Frontend (React/Vite) ←REST/Socket→ Backend Go (Gin/GORM) ←SQL→ PostgreSQL
                                          ↕ AMQP                              ↕
                                     RabbitMQ ←──── Engine Go (whatsmeow) → WhatsApp
                                          ↕
                              Plugin Manager · Marketplace Hub
```

### Services & Ports (local dev)

| Service | Dir | Stack | Port |
|---|---|---|---|
| Backend Go | `business/` | Go 1.24 / Gin / GORM | 8082 |
| Engine Go | `engine-go/` | Go 1.24 / whatsmeow | — |
| Frontend | `frontend/` | React 18 / Vite / MUI v5 | 3000 (vite) |
| Plugin Manager | `plugin-manager/` | Go 1.24 / gorilla-mux | 8081 |
| Marketplace Hub | `marketplace-hub/` | Node/Express | 8090 |
| Plugin SDK | `packages/plugin-sdk/` | TypeScript | — |
| Backend Node (legacy) | `legacy/backend/` | Node/Express/Sequelize | 8080 |
| Engine Node (legacy) | `legacy/engine-standard/` | Node/whaileys | — |

### Communication Flow

- **Backend ↔ Frontend**: REST API + Socket.io (real-time events: `appMessage`, `ticket:update`)
- **Backend ↔ Engine**: RabbitMQ exchanges — `wbot.commands` (outbound), `wbot.events` (inbound)
- **Multitenancy**: `tenantId` in JWT payload; PostgreSQL RLS policies enforce row-level isolation. RabbitMQ routing keys: `wbot.{tenantId}.{sessionId}.{command|event}`

### Plugin System

- **Watink Manager** (central SaaS): owns plugin catalog, license keys, payment webhooks, kill switch
- **Plugin Manager** (local): gatekeeper — downloads catalog from Manager, validates licenses, enables/disables plugins locally. Built-in plugins (Clientes, Helpdesk) ship inside Docker images; "activation" just flips a DB flag, no code download

## Commands

### Backend Go (`business/`)
```bash
cd business && go fmt ./...              # format code
cd business && go build ./...            # compile
cd business && go run cmd/server/main.go  # run dev
cd business && go test ./...              # run tests
```

### Engine Go (`engine-go/`)
```bash
cd engine-go && go fmt ./...              # format code
cd engine-go && go build ./...            # compile
cd engine-go && go run cmd/engine/main.go  # run dev
cd engine-go && go test ./...              # run tests
```

### Frontend (`frontend/`)
```bash
cd frontend && npm install
cd frontend && npm run lint              # ESLint check
cd frontend && npm run dev               # vite dev server
cd frontend && npm run build             # production build
```

### Plugin Manager (`plugin-manager/`)
```bash
cd plugin-manager && go fmt ./...              # format code
cd plugin-manager && go build ./...            # compile
cd plugin-manager && go run cmd/server/main.go  # run dev
cd plugin-manager && go test ./...              # run tests
```

### Backend Node legacy (`legacy/backend/`)
```bash
cd legacy/backend && npm install
cd legacy/backend && npm run dev        # ts-node-dev with respawn
cd legacy/backend && npm run build      # tsc
cd legacy/backend && npm run db:migrate # sequelize migrations
cd legacy/backend && npm run db:seed    # sequelize seeds
cd legacy/backend && npm run test       # jest (NODE_ENV=test)
```

### Engine Node legacy (`legacy/engine-standard/`)
```bash
cd legacy/engine-standard && npm install
cd legacy/engine-standard && npm run lint
cd legacy/engine-standard && npm run dev
cd legacy/engine-standard && npm run build
```

### Full Stack Local (PM2)
```bash
pm2 start ecosystem.config.js    # starts all services
```
All credentials read from env vars — set `DB_PASS`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AMQP_URL`, `REDIS_URL` before starting.

### Docker
```bash
docker-compose -f docker-compose.business.yml up   # Go backend + Postgres + Redis + RabbitMQ
```

### Smoke Test
```bash
SMOKE_BASE_URL=http://localhost:3000 SMOKE_EMAIL=user@example.com SMOKE_PASS=secret node scripts/playwright-smoke.js
```

## Git & PR Conventions

- **No direct push to `main`** — all changes via PR
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `hardening:`
- **Branch naming**: `robot/<topic>`, `groud/<topic>`, `tinker/<topic>`, `hotfix/<topic>`
- **PR checklist**: technical summary, risk/impact, test evidence, rollback plan
- **Merge flow**: feature → `develop` → `main` (release); hotfix → `main` → back-merge to `develop`

## Security

- **NEVER** commit `.env` files, credentials, or secrets — all use env vars
- `.env.example` has placeholders only — do NOT put real keys there
- PostgreSQL RLS + JWT `tenantId` enforce data isolation — always include `tenantId` in queries
- Plugin license validation happens server-side (Watink Manager) — local DB flags alone are not authoritative
- See `SECURITY_NOTICE.md` for credential rotation status

## Key Patterns

- **Frontend multitenancy config**: `src/config.js` reads from `import.meta.env` with `window.ENV` runtime fallback
- **Engine session persistence**: `.sessions_auth/` must be a Docker volume — losing it disconnects all WhatsApp sessions
- **Redis transient store**: messages cached with TTL 24h at key `wbot:msg:{jid}:{id}` for retry after engine restart
- **Plugin activation**: no code download — built-in plugins are unlocked by flipping `PluginInstallations.active` in DB after Manager license check
