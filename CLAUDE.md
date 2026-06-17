# CLAUDE.md

Guia para o Claude Code ao trabalhar neste repositório.

## Project Overview

Watink — plataforma open-source de atendimento e automação no WhatsApp. Microsserviços com RabbitMQ, multitenancy via PostgreSQL RLS, sistema de plugins com licenciamento centralizado.

```
Frontend (React/Vite) ←REST/Socket→ Backend Go (Gin/GORM) ←SQL→ PostgreSQL
                                          ↕ AMQP
                                     RabbitMQ ←── Engine Go (whatsmeow) → WhatsApp
                                          ↕
                              Plugin Manager · Marketplace Hub
```

## Services & Ports

| Service | Dir | Stack | Port |
|---|---|---|---|
| Backend Go | `business/` | Go 1.24 / Gin / GORM | 8082 |
| Engine Go | `engine-go/` | Go 1.24 / whatsmeow | — |
| Frontend | `frontend/` | React 18 / Vite / shadcn+Tailwind v4 | 3000 |
| Plugin Manager | `plugin-manager/` | Go 1.24 / gorilla-mux | 8081 |
| Marketplace Hub | `marketplace-hub/` | Node/Express | 8090 |
| Backend Node (legacy) | `legacy/backend/` | Node/Express/Sequelize | 8080 |
| Engine Node (legacy) | `legacy/engine-standard/` | Node/whaileys | — |

## Commands

### Backend Go (`business/`)
```bash
cd business && go fmt ./...
cd business && go build ./...
cd business && go run cmd/server/main.go
cd business && go test ./...
```

### Engine Go (`engine-go/`)
```bash
cd engine-go && go fmt ./...
cd engine-go && go build ./...
cd engine-go && go run cmd/engine/main.go
```

### Frontend (`frontend/`)
```bash
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
```

### Docker
```bash
docker compose -f docker-compose.dev.yml up
docker compose -f docker-compose.dev.yml logs --tail=100 watink-business
docker compose -f docker-compose.dev.yml logs --tail=100 watink-frontend
```

### Smoke Test
```bash
SMOKE_BASE_URL=http://localhost:3000 SMOKE_EMAIL=admin@test.com SMOKE_PASS=test123 node scripts/playwright-smoke.js
```

## Git & PR Conventions

→ Detalhes completos em [`docs/dev/git_workflow_policy.md`](docs/dev/git_workflow_policy.md)

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `hotfix:`, `hardening:`
- **Branch naming** (espelha o tipo de commit):
  - `feat/<tema>` — nova funcionalidade
  - `fix/<tema>` — correção de bug
  - `refactor/<tema>` — refatoração
  - `chore/<tema>` — manutenção/tooling
  - `docs/<tema>` — documentação
  - `hotfix/<tema>` — urgência em produção
- **Merge flow**: `feat/*` → `develop` → `main`; `hotfix/*` → `main` → back-merge `develop`
- **PR checklist**: resumo técnico, risco/impacto, evidência de teste, plano de rollback

## Core Engineering Rules

### Editing (Anti-Laziness)

1. **ZERO PSEUDOCÓDIGO** — proibido `// ...`, `// resto do código`, omissões em `Edit`/`Write`.
2. **EDIÇÕES CIRÚRGICAS** — `old_string` deve ser o menor trecho que isola a mudança.
3. **PROIBIDO INVENTAR CONTEXTO** — sempre use `Read` antes de `Edit` em arquivo desconhecido.
4. **CICLO OBRIGATÓRIO**: Read → Edit → Build.
5. **QUEBRA DE LOOP** — se `Edit` falhar 2 vezes seguidas ou `go build` repetir erro estrutural: PARE e alerte o desenvolvedor.

### Modularidade (Anti-God File)

- Arquivos > ~250 linhas devem ser divididos proativamente.
- Em Go, arquivos no mesmo diretório compartilham o pacote — divida sem medo.
- Nunca edite às cegas: use `Read` com `offset`/`limit` em arquivos grandes.

### Backend Go — DI & Segurança

- **DI PURA**: proibido Service Locator, Container Global ou Singleton. Dependências injetadas via construtor em `main.go`.
- **Multitenancy**: use sempre `tenantUUIDFromContext(c)` em controllers Gin. Nunca `c.Get("tenantId")` bruto.
- **Testes**: Mocks encapsulados em structs locais dentro de cada `Test...` — sem variáveis globais de mock.

## Frontend Design System

→ Referência completa em [`docs/frontend/design-system.md`](docs/frontend/design-system.md)

Stack: **React 18 + TypeScript + Tailwind v4 + shadcn/ui**. MUI v4 removido.

**Regras críticas:**
- Tokens semânticos em HSL cru — o Tailwind adiciona `hsl()` via `@theme inline`, nunca duplique.
- Cards usam sombra, não borda: `rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)]`.
- Sidebar: fundo `bg-[var(--slate-800)]`, separadores `border-[var(--slate-700)]`.
- Proibido `makeStyles` ou qualquer import de `@material-ui/*`.
- Todos os arquivos novos em `.tsx`.

## Security

- **NUNCA** commite `.env`, credenciais ou secrets.
- PostgreSQL RLS + JWT `tenantId` — inclua sempre `tenantId` nas queries.
- Plugin license validation é server-side (Watink Manager) — flag local no DB não é autoridade.

## Key Patterns

- **Frontend config**: `src/config.ts` lê `import.meta.env` com fallback `window.ENV`.
- **Engine sessions**: `.sessions_auth/` deve ser Docker volume — perder desconecta todas as sessões WhatsApp.
- **Redis cache**: mensagens com TTL 24h em `wbot:msg:{jid}:{id}`.
- **Plugin activation**: flipa `PluginInstallations.active` no DB após validação no Manager.

## Domain Docs

- **Glossário**: [`CONTEXT.md`](CONTEXT.md)
- **ADRs**: [`docs/adr/`](docs/adr/)
- **Frontend DS**: [`docs/frontend/design-system.md`](docs/frontend/design-system.md)
- **Git Workflow**: [`docs/dev/git_workflow_policy.md`](docs/dev/git_workflow_policy.md)
- **Agent config**: [`docs/agents/`](docs/agents/)
