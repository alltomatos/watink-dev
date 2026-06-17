# Arquitetura do Watink

## Visão Geral

Plataforma de atendimento via WhatsApp com arquitetura orientada a eventos. Serviços desacoplados comunicam-se via RabbitMQ; dados persistidos em PostgreSQL com isolamento por tenant via RLS.

```
Frontend (React/Vite) ←REST/Socket.io→ Backend Go (Gin/GORM) ←SQL→ PostgreSQL
                                               ↕ AMQP
                                          RabbitMQ ←── Engine Go (whatsmeow) → WhatsApp
                                               ↕
                                   Plugin Manager · Marketplace Hub
```

## Serviços

| Serviço | Dir | Stack | Porta |
|---|---|---|---|
| Backend Go | `business/` | Go 1.24 / Gin / GORM | 8082 |
| Engine Go | `engine-go/` | Go 1.24 / whatsmeow | — |
| Frontend | `frontend/` | React 18 / Vite / shadcn+Tailwind v4 | 3000 |
| Plugin Manager | `plugin-manager/` | Go 1.24 / gorilla-mux | 8081 |
| Marketplace Hub | `marketplace-hub/` | Node/Express | 8090 |
| Backend Node (legacy) | `legacy/backend/` | Node/Express/Sequelize | 8080 |
| Engine Node (legacy) | `legacy/engine-standard/` | Node/whaileys | — |

## Comunicação entre Serviços

### Backend ↔ Frontend
- REST API com autenticação JWT
- Socket.io para eventos em tempo real: `appMessage`, `ticket:update`

### Backend ↔ Engine
- RabbitMQ exchange `wbot.commands` (Backend → Engine, outbound)
- RabbitMQ exchange `wbot.events` (Engine → Backend, inbound)
- Routing key pattern: `wbot.{tenantId}.{sessionId}.{command|event}`

### Transient Store (Redis)
- Mensagens cacheadas com TTL 24h: `wbot:msg:{jid}:{id}`
- Garante retentativas mesmo após reinicialização do Engine

## Multitenancy

- `tenantId` presente no payload JWT
- PostgreSQL RLS (Row Level Security) enforça isolamento por linha
- Toda query no backend Go **deve** incluir `tenantId`
- Controllers Gin usam obrigatoriamente `tenantUUIDFromContext(c)` — nunca `c.Get("tenantId")` bruto

## Autenticação e RBAC

- JWT com `tenantId` + `userId` + `profile`
- Usuários pertencem a `Groups`; grupos têm `Permissions` atômicas
- Middleware `checkPermission` no backend valida permissões combinadas (grupo + individuais)
- Usuários com `profile: "admin"` têm acesso irrestrito (fallback)

## Banco de Dados

PostgreSQL com extensões:
- **PostGIS** — suporte a dados geográficos (lat/long de contatos, consultas de raio)
- **pgvector** — armazenamento de embeddings para busca semântica (RAG/AI)

## Plugin System

- **Watink Manager** (SaaS central): catálogo de plugins, licenças, webhooks de pagamento, kill switch
- **Plugin Manager** (local): valida licenças contra o Manager, habilita/desabilita plugins localmente
- Plugins built-in (Clientes, Helpdesk) embarcados nas imagens Docker — ativação flipa `PluginInstallations.active` no DB
- Validação de licença é **sempre server-side** — flag local não é autoridade

## Session Persistence (Engine)

- `.sessions_auth/` deve ser montado como Docker volume
- Perder o volume desconecta todas as sessões WhatsApp ativas
