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
| Frontend | `frontend/` | React 17 / Vite / MUI v4 | 3000 (vite) |
| Plugin Manager | `plugin-manager/` | Go 1.24 / gorilla-mux | 8081 |
| Marketplace Hub | `marketplace-hub/` | Node/Express | 8090 |
| Plugin SDK | `packages/plugin-sdk/` | TypeScript | — |
| Backend Node (legacy) | `legacy/backend/` | Node/Express/Sequelize | 8080 |
| Engine Node (legacy) | `legacy/engine-standard/` | Node/whaileys | — |


### Environment Setup

- Use `docker-compose.dev.yml` for development (bind mounts, hot-reload).
- Run with: `npm run linux:docker:dev:build`

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
docker compose -f docker-compose.dev.yml up         # full local dev stack
docker compose -f docker-compose.dev.yml ps         # inspect running dev services
docker compose -f docker-compose.dev.yml logs --tail=100 watink-business
docker compose -f docker-compose.dev.yml logs --tail=100 watink-frontend
```

### Development Diagnostics

- `docker-compose.dev.yml` is at the repository root. If logs fail with `no such file or directory`, verify the current working directory is the repo root or pass the absolute compose file path.
- Backend hot reload runs with Air inside `watink-business`; a Go syntax/build error will stop reload until the offending file compiles again.
- For backend failures, check `watink-business` logs first, then run `cd business && go build ./...` to get deterministic compiler errors.
- For engine or AMQP failures, check `watink-engine` and `watink-rabbitmq` logs together; RabbitMQ startup race conditions can produce initial transient connection failures.
- Frontend warnings from Material-UI v4 transitions under React `StrictMode` may include `findDOMNode is deprecated`. This is a library-level dev warning from MUI v4/React 17 compatibility, not necessarily an application failure. Prefer migrating affected components to MUI v5+ for a full fix; do not mask real runtime errors.
- Vite duplicate-key warnings in translation files should be fixed in `frontend/src/translate/languages/*.js` by removing or merging duplicated object keys.

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

## Skills (Claude Code)

Skills são comandos especializados (`/nome`) que automatizam fluxos recorrentes. Cada skill vive em `.claude/skills/<nome>/` com seu `SKILL.md` e script `.mjs`.

| Skill | Comando | Descrição |
|---|---|---|
| **devops-ops** | `/devops-ops` | GitFlow automatizado — cria/termina/aborta branches feature/release/hotfix, status do flow, auto-commit com conventional commits, smart-commit (commit + draft PR), proteção de branch, CI status/logs, health do stack Docker, PR com risk assessment. Guardrails: sem push direto em main/develop, secret scanning, dry-run. |
| **designer** | `/designer` | Design system do frontend — parseia tokens MUI v4 do `DarkMode/index.js`, audita cores hardcoded e gaps dark-mode em 112+ `makeStyles`, tira screenshots via puppeteer/chromium-cli, modifica tokens no source, lista/compara/alterna temas (apple vs saas). |
| **run-watink** | `/run-watink` | Build e orquestração do stack completo — gerencia dependências Docker (PostgreSQL, Redis, RabbitMQ), build/start dos 5 serviços, health checks (`/api/v1/health`), status, screenshots, graceful shutdown. |
| **tenant-guard** | `/tenant-guard` | Auditoria read-only de multitenancy — escaneia controllers e services do backend Go buscando filtros `tenantId` ausentes em queries GORM, operações destrutivas sem escopo tenant, raw SQL sem tenant scoping, e contexto tenant não propagado. Reporta severidade HIGH/MEDIUM/LOW. Use **antes** de alterar qualquer controller/service que toque dados tenant. |
| **backend** | `/backend` | Diagnóstico e implementação do fluxo command/event (Backend ↔ RabbitMQ ↔ Engine Go/whatsmeow). Rastreamento root-to-cause do ciclo mensagem/QR, comandos Docker/RabbitMQ/psql, checklist de 9 passos do fluxo de mensagem, padrões de falha comuns. Regra: sem fixes especulativos, apenas mudanças mínimas no boundary identificado. |

### Uso

```bash
# Exemplos de invocação no Claude Code REPL
/devops-ops feature start user-avatar
/devops-ops flow status
/designer tokens
/designer audit
/run-watink health
/tenant-guard scan
/backend diagnose qr-not-loading
```

Skills são invocados via `/nome` no REPL do Claude Code. O script associado executa e retorna resultado estruturado. Para detalhes completos de cada skill, consulte `.claude/skills/<nome>/SKILL.md`.

## Core Engineering & Testing Guidelines

- **Segurança (Multitenancy)**: Em qualquer novo controller do Gin no diretório `business/`, é estritamente obrigatório utilizar o utilitário `tenantUUIDFromContext(c)` para extrair o ID do cliente. Nunca utilize `c.Get("tenantId")` com tipagem genérica ou bruta.
- **Injeção de Dependência (DI)**: Controllers e Services não devem instanciar dependências globais internamente. Utilize structs receptoras (ex: `type MessageController struct { rabbit domain.RabbitMQServiceInterface }`) e injete interfaces através de construtores. As implementações concretas devem ser mapeadas no arquivo de rotas.
- **Padrão de Testes (Sem Globais)**: Ao escrever testes de integração no Go (ex: com `httptest`), é proibido o uso de variáveis globais para criar Mocks. Os Mocks devem ser encapsulados em structs locais instanciadas dentro de cada função `Test...` para garantir que o código seja thread-safe e suporte paralelismo.
- **Prevenção de Perda de Dados**: Ao modificar arquivos grandes ou de domínio (`domain.go`), utilize ferramentas de Edit de forma pontual. O uso de Write sobrescrevendo o arquivo inteiro com resumos ou omissões é estritamente proibido.
