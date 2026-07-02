# Referência de Comandos

## Backend Go (`business/`)

```bash
cd business && go fmt ./...               # formatar código
cd business && go build ./...             # compilar
cd business && go run cmd/server/main.go  # rodar em dev
cd business && go test ./...              # executar testes

# Regenerar docs OpenAPI — obrigatório após adicionar/alterar handlers
cd business && go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs/
```

> **API Docs**: acessível em `/api/v1/docs` (requer JWT de admin ou superadmin).
> UI: **Scalar** (dark mode, sidebar, API client integrado, geração de snippets curl/Go/Python/JS).
> JSON OpenAPI gerado em `business/docs/swagger.json` — commitar junto com cada PR que altera rotas.

## Engine Go (`engine-go/`)

```bash
cd engine-go && go fmt ./...
cd engine-go && go build ./...
cd engine-go && go run cmd/engine/main.go
cd engine-go && go test ./...
```

## Frontend (`frontend/`)

```bash
cd frontend && npm install
cd frontend && npm run dev        # servidor Vite (porta 3000)
cd frontend && npm run build      # build de produção
cd frontend && npm run lint       # ESLint
cd frontend && npm run typecheck  # TypeScript sem emitir arquivos
```

## Plugin Manager (`plugin-manager/`)

```bash
cd plugin-manager && go fmt ./...
cd plugin-manager && go build ./...
cd plugin-manager && go run cmd/server/main.go
cd plugin-manager && go test ./...
```

## Backend Node legacy (`legacy/backend/`)

```bash
cd legacy/backend && npm install
cd legacy/backend && npm run dev          # ts-node-dev com respawn
cd legacy/backend && npm run build        # tsc
cd legacy/backend && npm run db:migrate   # sequelize migrations
cd legacy/backend && npm run db:seed      # sequelize seeds
cd legacy/backend && npm run test         # jest (NODE_ENV=test)
```

## Engine Node legacy (`legacy/engine-standard/`)

```bash
cd legacy/engine-standard && npm install
cd legacy/engine-standard && npm run dev
cd legacy/engine-standard && npm run build
cd legacy/engine-standard && npm run lint
```

## Docker (desenvolvimento local)

```bash
# Subir stack completa
docker compose -f docker-compose.dev.yml up

# Inspecionar serviços
docker compose -f docker-compose.dev.yml ps

# Logs
docker compose -f docker-compose.dev.yml logs --tail=100 watink-business
docker compose -f docker-compose.dev.yml logs --tail=100 watink-frontend
docker compose -f docker-compose.dev.yml logs --tail=100 watink-engine
docker compose -f docker-compose.dev.yml logs --tail=100 watink-rabbitmq
```

> O `docker-compose.dev.yml` fica na raiz do repositório. Sempre execute os comandos Docker a partir da raiz.

## PM2 (stack local sem Docker)

```bash
pm2 start ecosystem.config.js    # sobe todos os serviços
```

Variáveis de ambiente necessárias: `DB_PASS`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AMQP_URL`, `REDIS_URL`.

## Smoke Test

```bash
SMOKE_BASE_URL=http://localhost:3000 \
SMOKE_EMAIL=admin@test.com \
SMOKE_PASS=test1234 \
node scripts/playwright-smoke.js
```

## Diagnóstico de Falhas

| Sintoma | O que verificar |
|---|---|
| Backend Go não sobe | `docker compose logs watink-business` → `cd business && go build ./...` |
| Docs desatualizados no Scalar | `cd business && go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs/` |
| Engine não conecta | Logs de `watink-engine` e `watink-rabbitmq` juntos — race condition de startup |
| Frontend com erro de build | `cd frontend && npm run build` para ver erros detalhados do Vite |
| Migrations falhando | `cd legacy/backend && npm run db:migrate` com `NODE_ENV=development` |
