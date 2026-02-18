# Marketplace Panel — Operação e Acesso

## Ambiente
- **Domínio:** https://marketplace.alltomatos.dev.br
- **VPS:** `147.93.176.59` (Contabo)
- **Diretório do serviço na VPS:** `/opt/marketplace/hub`
- **Stack:** Docker Compose (`marketplace-hub`)

## Acesso Admin (MVP)
- **Header obrigatório:** `x-admin-token`
- **Token atual:** `9327753ba742a5b811d9ed7e3b8e1046`

> Recomendado: rotacionar token após alinhamento final do painel.

## Endpoints Runtime (instâncias Watink)
- `GET /api/v1/hub/catalog`
- `POST /api/v1/hub/checkout`
- `POST /api/v1/hub/heartbeat`
- `POST /api/v1/hub/webhook/mp`

## Endpoints Admin
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/instances`
- `GET /api/v1/admin/licenses`
- `POST /api/v1/admin/licenses/upsert`
- `GET /api/v1/admin/finance/summary`
- `GET /api/v1/admin/subscriptions`
- `POST /api/v1/admin/coupons` (stub)

## Comandos úteis (VPS)
```bash
cd /opt/marketplace/hub

docker compose ps
docker compose logs -f hub
docker compose up -d --build

curl -sS http://127.0.0.1:8090/health
curl -sS -k -L https://marketplace.alltomatos.dev.br/health
```

## Exemplo de chamada Admin
```bash
TOKEN="9327753ba742a5b811d9ed7e3b8e1046"
curl -sS https://marketplace.alltomatos.dev.br/api/v1/admin/overview \
  -H "x-admin-token: $TOKEN"
```
