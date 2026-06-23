# CLAUDE.md

Guia para o Claude Code ao trabalhar neste repositório.

## Project Overview

Watink — plataforma de atendimento e automação no WhatsApp. Microsserviços com RabbitMQ, multitenancy via PostgreSQL RLS, sistema de plugins com licenciamento centralizado.

```
Frontend (React/Vite) ←REST/Socket.io→ Backend Go (Gin/GORM) ←SQL→ PostgreSQL
                                               ↕ AMQP
                                          RabbitMQ ←── Engine Go (whatsmeow) → WhatsApp
                                               ↕
                                   Plugin Manager · Marketplace Hub
```

## Status Atual (jun/2026)

| Área | Status |
|---|---|
| Frontend — migração MUI v4 → shadcn/ui (163 arquivos, Epic 4B/4D/4F) | ✅ Concluída |
| Frontend — JS/JSX → TypeScript (163 arquivos) | ✅ Concluída |
| Frontend — Design Token System (3 camadas) | ✅ Concluída |
| Frontend — ESLint/Lint governance | ✅ Concluída |
| Frontend — Política anti-MUI (ADR 0008) | ✅ Concluída |
| Backend Go — DI & organização de pacotes | ✅ Concluída (PR #58) |
| Backend Go — API Docs (Scalar + swaggo) | ✅ Concluída |
| Backend Go — Testes unitários (coverage +5pp) | ✅ Concluída (PR #60) |
| E2E — Playwright suite (21 testes + CI job) | ✅ Concluída (PR #61) |
| Dependabot Go deps (crypto/net upgrade) | ✅ Concluída (PR #62) |
| Frontend — Ticket Queue Visibility (filtros `isGroup` + `withUnreadMessages`) | ✅ Concluída (PR #98) |
| Frontend — TicketListItem type badges (community/group/newsletter) | ✅ Concluída (PR #98) |
| Frontend — ESLint rule: permite `hsl(var(--token))` como referência de token | ✅ Concluída (PR #98) |
| Frontend — MessagesList decomposição (799→362L, 9 módulos, GAP-Q) | ✅ Concluída (PR #99) |
| Frontend — Testes TicketListItem + TicketsManager (18 casos, GAP-R) | ✅ Concluída (PR #99) |
| Frontend — Suite de testes 65/65 verde (GAP-T) | ✅ Concluída (PR #100) |

## Services & Ports

| Service | Dir | Stack | Porta |
|---|---|---|---|
| Backend Go | `business/` | Go 1.24 / Gin / GORM | 8082 |
| Engine Go | `engine-go/` | Go 1.24 / whatsmeow | — |
| Frontend | `frontend/` | React 18 / Vite / TypeScript / shadcn+Tailwind v4 | 3000 |
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

# Regenerar documentação OpenAPI (obrigatório após adicionar/alterar rotas)
# Commitar docs/docs.go + docs/swagger.json + docs/swagger.yaml no mesmo PR
cd business && go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs/
```

> **API Docs (Scalar)**: `http://localhost:8082/api/v1/docs?token=<JWT>` — requer perfil `superadmin` ou permissão `swagger`.
> JSON OpenAPI: `http://localhost:8082/api/v1/swagger.json?token=<JWT>`

### Engine Go (`engine-go/`)
```bash
cd engine-go && go fmt ./...
cd engine-go && go build ./...
cd engine-go && go run cmd/engine/main.go
```

### Frontend (`frontend/`)
```bash
cd frontend && npm run dev        # Vite dev server (porta 3000)
cd frontend && npm run build      # build de produção
cd frontend && npm run lint       # ESLint
cd frontend && npm run typecheck  # TypeScript sem emitir
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

→ Referência completa em [`docs/dev/commands.md`](docs/dev/commands.md)

## Git & PR Conventions

→ Detalhes em [`docs/dev/git_workflow_policy.md`](docs/dev/git_workflow_policy.md)

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `hardening:`, `test:`
- **Branch naming**:
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
- **Testes**: Mocks em structs locais dentro de cada `Test...` — sem variáveis globais de mock.

## Frontend Design System

→ Referência completa em [`docs/frontend/design-system.md`](docs/frontend/design-system.md)

Stack canônica: **React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui + Lucide React**.  
MUI v4 **completamente removido** — `@material-ui/*` não é dependência do projeto.

**Regras críticas (ADR 0008):**
- `@material-ui/*` e `@mui/*` são **PROIBIDOS** — qualquer import é erro de build.
- Componentes UI: usar exclusivamente `src/components/ui/` (shadcn/ui + Radix UI).
- Ícones: usar exclusivamente `lucide-react`. Não usar `@material-ui/icons`.
- Estilização: Tailwind classes + `cn()`. Proibido `makeStyles`, `withStyles`, JSS.
- Tokens semânticos em HSL cru — usar `hsl(var(--token))` em valores arbitrários Tailwind.
- Cards: sombra, não borda — `rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)]`.
- Todos os arquivos novos em `.tsx`. Proibido `.jsx` ou `.js` em `src/`.

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
- **ADRs**: [`docs/adr/`](docs/adr/) — ver **ADR 0008** para política anti-MUI, **ADR 0007** para decomposição de componentes
- **Arquitetura**: [`docs/dev/architecture.md`](docs/dev/architecture.md)
- **Frontend DS**: [`docs/frontend/design-system.md`](docs/frontend/design-system.md)
- **Git Workflow**: [`docs/dev/git_workflow_policy.md`](docs/dev/git_workflow_policy.md)
- **Plugins**: [`docs/dev/plugins.md`](docs/dev/plugins.md)
- **Migrations**: [`docs/dev/migrations.md`](docs/dev/migrations.md)
- **Agent config**: [`docs/agents/`](docs/agents/)
- **Roadmap**: [`ORCHESTRATOR-ROADMAP.md`](ORCHESTRATOR-ROADMAP.md) — Epics e milestones do projeto

## Agent Skills

### Issue Tracker
- **Platform**: GitHub (`gh` CLI)
- **Config**: [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)

### Triage Labels
- **Config**: [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md)

### Domain
- **Config**: [`docs/agents/domain.md`](docs/agents/domain.md)
- Use sempre os termos canônicos de `CONTEXT.md` — nunca os termos marcados como `_Avoid_`.
