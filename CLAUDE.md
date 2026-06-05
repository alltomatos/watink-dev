# CLAUDE.md This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watink — plataforma open-source de atendimento e automação no WhatsApp. Arquitetura de microsserviços com comunicação via RabbitMQ, multitenancy via PostgreSQL RLS, e sistema de plugins com licenciamento centralizado.

## Anti-Laziness & Strict Editing Rules

1. **ZERO PSEUDOCÓDIGO (No Code Laziness):** É estritamente proibido o uso de omissões textuais como `// ...`, `// resto do código aqui`, ou `// rotas anteriores` ao utilizar a ferramenta de `Edit` ou `Write`. Você deve fornecer o código real, completo e funcional em todas as substituições.
2. **EDIÇÕES CIRÚRGICAS (Atomic Edits):** Ao utilizar a ferramenta `Edit`, o bloco `old_string` deve ser o menor possível para isolar a mudança. Nunca inclua uma função inteira no `old_string` se você só precisa alterar a assinatura ou uma única linha interna. Isso evita a deleção acidental de blocos inteiros de código.
3. **PROIBIDO INVENTAR CONTEXTO:** Nunca tente adivinhar o conteúdo de um bloco `old_string`. Se o compilador apontar um erro, utilize obrigatoriamente a ferramenta `Read` nas linhas específicas do erro ANTES de tentar aplicar um `Edit`.
4. **DI PURA (Injeção via Construtor):** É proibido criar ou utilizar *Service Locators*, Containers Globais (ex: `appContainer`), ou Singletons para Injeção de Dependência. Todas as dependências devem ser instanciadas no arquivo raiz (`main.go`) e injetadas explicitamente via parâmetros em rotas e construtores.
5. ciclo (Read -> Edit -> Build)

## File Size Management & Anti-Loop Protocol (Divide and Conquer)

1. **LIMITE DE ARQUIVO (Modularity First):** Arquivos muito extensos causam "cegueira de contexto" e falhas na ferramenta de edição. Sempre prefira dividir estruturas em múltiplos arquivos menores dentro do mesmo pacote (ex: `models.go`, `interfaces.go`, `events.go` em vez de um único `domain.go` gigante). Se um arquivo ultrapassar ~250 linhas, sugira proativamente o seu desmembramento.
2. **O PODER DO PACOTE GO:** Lembre-se que em Go, arquivos no mesmo diretório compartilham o mesmo pacote (`package xyz`). Dividir arquivos não quebra importações externas. Use isso a nosso favor.
3. **LEITURA COM OFFSET (Targeted Reads):** Ao editar arquivos que ainda são grandes, NUNCA faça edições cegas baseadas na memória. Use obrigatoriamente a ferramenta `Read` delimitando linhas precisas (`offset` e `limit`) para capturar o estado real do código antes de disparar o `Edit`.
4. **QUEBRA DE LOOP (Human Takeover):** Se um `Edit failed` ocorrer duas vezes seguidas, ou se o `go build` acusar erros de sintaxe estrutural (como `non-declaration statement outside function body`) repetidamente: PARE IMEDIATAMENTE. Não tente adivinhar. Alerte o desenvolvedor para realizar uma intervenção manual no IDE e aguarde a confirmação de que o arquivo foi corrigido visualmente.

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
| Frontend | `frontend/` | React 18 / Vite / shadcn+Tailwind (MUI v4 em migracao) | 3000 (vite) |
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

## Core Engineering & Testing Guidelines

- **Segurança (Multitenancy)**: Em qualquer novo controller do Gin no diretório `business/`, é estritamente obrigatório utilizar o utilitário `tenantUUIDFromContext(c)` para extrair o ID do cliente. Nunca utilize `c.Get("tenantId")` com tipagem genérica ou bruta.
- **Injeção de Dependência (DI)**: Controllers e Services não devem instanciar dependências globais internamente. Utilize structs receptoras (ex: `type MessageController struct { rabbit domain.RabbitMQServiceInterface }`) e injete interfaces através de construtores. As implementações concretas devem ser mapeadas no arquivo de rotas.
- **Padrão de Testes (Sem Globais)**: Ao escrever testes de integração no Go (ex: com `httptest`), é proibido o uso de variáveis globais para criar Mocks. Os Mocks devem ser encapsulados em structs locais instanciadas dentro de cada função `Test...` para garantir que o código seja thread-safe e suporte paralelismo.
- **Prevenção de Perda de Dados**: Ao modificar arquivos grandes ou de domínio (`domain.go`), utilize ferramentas de Edit de forma pontual. O uso de Write sobrescrevendo o arquivo inteiro com resumos ou omissões é estritamente proibido.

## Anti-Laziness & Strict Editing Rules

Para manter a integridade do código e a qualidade arquitetural, as seguintes regras são estritas:

1. **Zero Pseudocódigo**: É proibido substituir código real por comentários, resumos ou pseudocódigo (ex: `// ... rotas anteriores ...`). O código deve ser sempre funcional e completo.
2. **Edições Atômicas**: Mudanças devem ser cirúrgicas e atômicas. Se um bloco grande falhar, faça edições menores e focadas.
3. **Proibido Inventar Contexto**: Não assuma comportamentos ou estruturas que não foram previamente lidos através das ferramentas de Read. Na dúvida, leia o arquivo.
4. **DI Pura (Anti-Singleton)**: É proibido o uso de variáveis globais de estado, Singletons ou Service Locators. Toda dependência deve ser passado explicitamente via construtores (Constructor Injection).

## Frontend Migration Governance (MUI v4 -> shadcn/ui)

**Estado atual:** 199 arquivos JS/JSX, 0 TS. 40+ componentes MUI v4, 100+ `makeStyles`, React 17, Router v5.
**Target:** React 18 + TypeScript + Tailwind v4 + shadcn/ui (Radix headless + Tailwind styling).

### Regras Estritas de Migracao

1. **PROIBIDO novo `makeStyles`**: Qualquer estilizacao nova DEVE usar Tailwind CSS utility classes. A ESLint rule `no-makeStyles` deve falhar o build.
2. **PROIBIDO novo import de `@material-ui/core`** em features novas. Componentes novos usam `src/components/ui/` (shadcn/ui).
3. **Diretorio Legacy**: Componentes MUI v4 existentes sao READ-ONLY — correcoes de bug/security apenas. Nao adicionar funcionalidades.
4. **Componentes de Ponte**: Wrappers em `src/components/ui/` que abstraem a implementacao (MUI hoje, shadcn amanha). Consumidores nunca importam MUI diretamente.
5. **TypeScript incremental**: `tsconfig.json` com `allowJs: true`. Novos arquivos sao `.tsx`. Arquivos existentes sao convertidos apenas quando tocados (boy scout rule).
6. **Tokens existentes**: O sistema 3-camadas (`src/theme/tokens/`) e a fonte de verdade para cores/espacamento/radius. Tailwind `@theme` no `index.css` consome essas CSS vars. NAO duplicar valores hardcoded no tailwind.config.
7. **React 18 obrigatorio**: shadcn/ui exige React 18+. O upgrade React 17->18 + Router v5->v6 e prerequisito bloqueante.

### Fases da Migracao

| Fase | Objetivo | Risco | Pre-requisito |
|------|----------|-------|---------------|
| 0 | React 17->18 + Router v5->v6 | ALTO | testes E2E existentes |
| 1 | TypeScript (tsconfig + allowJs) + vite.config.ts | MEDIO | Fase 0 |
| 2 | Tailwind v4 + shadcn/ui init + POC (Button) | BAIXO | Fase 1 |
| 3 | Pattern Shim (ESLint no-makeStyles + coexistencia) | BAIXO | Fase 2 |
| 4 | Substituicao gradual por camada (Atomicos -> Forms -> Overlays -> Composicao) | MEDIO | Fase 3 |
| 5 | Remocao MUI v4 (npm uninstall + cleanup) | MEDIO | Fase 4 completa |

### Estrutura de Diretorios Frontend

```
frontend/src/
  components/
    ui/          -> componentes shadcn/ui (NOVO, .tsx)
    legacy/      -> componentes MUI v4 existentes (READ-ONLY)
  lib/
    utils.ts     -> cn() helper (clsx + tailwind-merge)
  hooks/         -> custom hooks
  theme/
    tokens/      -> fontes de verdade (primitives, semantic, components, typography)
    bridge.js    -> MUI createTheme bridge (remover na Fase 5)
    loader.js    -> CSS var injection (manter, adaptar para Tailwind @theme)
```

## Agent skills

### Issue Tracker
- **Platform**: GitHub (`gh` CLI)
- **Config**: `docs/agents/issue-tracker.md`

### Triage Labels
- **Config**: `docs/agents/triage-labels.md`
- `needs-triage` → `triage`
- `needs-info` → `needs-info`
- `ready-for-agent` → `ready-for-agent`
- `ready-for-human` → `ready-for-human`
- `wontfix` → `wontfix`

### Domain Docs
- **Glossary**: `CONTEXT.md`
- **ADRs**: `docs/adr/`
- **Config**: `docs/agents/domain.md`
- Use canonical terms from `CONTEXT.md` in all code and docs. Never use `_Avoid_` terms in new code.
