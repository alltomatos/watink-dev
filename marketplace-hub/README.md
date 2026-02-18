# Marketplace Hub (Admin MVP)

Serviço central do Marketplace para instâncias Watink em escala.

## Objetivo
- Fonte de dados: Supabase + Mercado Pago
- Entregar endpoints de runtime para as instâncias Watink
- Expor painel admin em `marketplace.alltomatos.dev.br`

## Endpoints runtime
- `GET /api/v1/hub/catalog`
- `POST /api/v1/hub/checkout`
- `POST /api/v1/hub/heartbeat`
- `POST /api/v1/hub/webhook/mp`

## Endpoints admin (MVP)
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/instances`
- `GET /api/v1/admin/licenses`
- `POST /api/v1/admin/licenses/upsert`
- `GET /api/v1/admin/finance/summary`
- `GET /api/v1/admin/finance/by-plan`
- `GET /api/v1/admin/finance/timeline`
- `GET /api/v1/admin/subscriptions`
- `POST /api/v1/admin/coupons` (stub)

Admin API usa sessão de login (`/login`) e aceita também header `x-admin-token` para automação.

## Login do painel
- Página: `/login`
- Variáveis:
  - `ADMIN_USER`
  - `ADMIN_PASSWORD`
  - `ADMIN_TOKEN` (assinatura de sessão + integração API)

## Rodar local
1. Copiar `.env.example` para `.env`
2. Preencher variáveis
3. `docker compose up -d --build`

Painel web: `/`
