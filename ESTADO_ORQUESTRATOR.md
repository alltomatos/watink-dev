# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-19
> **Branch**: `develop` (main sincronizado via PR #85 + PR #86)
> **Epic atual**: Fase 3 — Nova inspeção pós-GAP batch (remoção dead-code + engine-go router)

---

## Histórico de Epics

| Epic | Descrição | Status |
|------|-----------|--------|
| Epic 1 | Migração MUI → shadcn/ui + TypeScript | ✅ Mergeado |
| Epic 2 | DI Backend Go + TS Strict Frontend | ✅ Mergeado (PR #58) |
| Epic 3 | Security (filippo.io upgrade) + Lint governance | ✅ Mergeado (PR #59) |
| Epic 3.5 | Backend test coverage + fix UpdateQueue | ✅ Mergeado (PR #60) |
| Epic 4 | E2E Playwright — 21 testes + CI job | ✅ Mergeado (PR #61) |
| Epic 5 | Dependabot Go deps upgrade (crypto/net) | ✅ Mergeado (PR #62) |
| Epic 6 | Lint zero frontend + cobertura Go +5pp + fix UpdateFlow | ✅ Mergeado (PR #63) |
| Epic 7 | Testes unitários Go — 22 arquivos, 23%→38% | ✅ Mergeado (PR #64) |
| Epic 8 | Cobertura Phase 2 — usecases + repos + services | ✅ Mergeado (PR #65) |
| Epic 9 | Cobertura Phase 3 — controllers restantes + pipeline fix | ✅ Mergeado (PR #66) |
| Epic 10 | Cobertura Phase 4 — session/whatsapp/repos/usecases | ✅ Mergeado (PR #67) |
| Epic 11 | Cobertura Phase 5 — domain/repos finais/plugin wrappers | ✅ Mergeado (PR #68) |
| Epic 12 | Testes integração RabbitMQ/Redis + handlers event_listener + step CI | ✅ Mergeado (PR #69) |
| Epic 13 | Bootstrap engine-go (go.mod + whatsmeow + feature parity legacy) | ✅ Mergeado (PR #70) |
| Epic 14 | CI job `build-engine-go` | ✅ Mergeado (PR #71) |
| Epic 15 | Dockerfile + docker-compose entry engine-go | ✅ Mergeado (PR #73) |
| Epic 16 | Remoção HubManager / marketplace-hub | ✅ Mergeado (PR #72) |
| Security | bump undici 7.27→7.28 (CVE high+medium) | ✅ Mergeado (PR #74) |
| Epic 17 | Health endpoint HTTP + graceful shutdown engine-go | ✅ Mergeado (PR #76) |
| Epic 18 | Device store multitenancy via Whatsapps.wid | ✅ Mergeado (PR #78) |
| P4-A | Fix lint warnings `react-hooks/exhaustive-deps` frontend | ✅ Resolvido (já passava --max-warnings 0) |
| P4-B | Dashboard controller — calculateTMR/calculateTME coverage (PostgreSQL) | ✅ Mergeado (PR #81) |
| Fix | Redis PubSub race condition — sub.Receive() antes de Publish | ✅ Mergeado (PR #80) |
| GAP-3 | Extract UserQueueRepository + TicketLogRepository — DI pura nos use cases | ✅ Mergeado (PR #83) |
| GAP-4 | engine-go tests: usecases + pkg/auth/utils (PR #84) | ✅ Mergeado (PR #84) |
| Epic 19 | Release develop→main (PR #85) | ✅ Mergeado (PR #85) |
| Epic 20 | Remoção dead-code (distribution+ticketlog services) + engine-go command router testável (PR #86) | ✅ Mergeado (PR #86) |
| Epic 21 | Modularização rabbitmq.go (3 arquivos) + DI pura EventListener (remove *gorm.DB) | ✅ Mergeado (PR #87) |
| Epic 22 | Testes offline DLQ/tracing (12 testes) + split send.go/send_types.go engine-go | ✅ Mergeado (PR #88) |
| Epic 23 | DI pura WhatsAppService engine-go — SessionLoader interface + 4 testes offline | ✅ Mergeado (PR #89) |

---

## Cobertura de Testes Go — Estado (pós PR #83)

| Pacote | Cobertura (CI com PostgreSQL) |
|--------|-------------------------------|
| `internal/flow` | 100.0% ✅ |
| `internal/middleware` | 95.2% ✅ |
| `internal/application/usecases` | ~85% ✅ |
| `internal/infrastructure/repository` | ~82% ✅ |
| `internal/controllers` | ~65% |
| `internal/domain` | 58.6% |
| `internal/application` | ~40% |
| `internal/plugins` | ~40% |
| `internal/services` | ~28% |
| `pkg/auth` | 0% ⚠️ |
| `pkg/utils` | 0% ⚠️ |
| `engine-go` | 0% ⚠️ (0 test files) |
| **Total estimado** | **~55-60%** |

### Teto Real — Infraestrutura externa não testável sem infra real

| Arquivo | Funções em 0% | Motivo |
|---------|--------------|--------|
| `services/rabbitmq.go` | 15 | Conexão AMQP real |
| `services/event_listener.go` | 12 | Consumer RabbitMQ + Socket.io |
| `services/redis.go` + `redis_broadcast.go` | 12 | Cliente Redis real |
| `services/socket.go` | 5 | Socket.io real |
| `application/container.go` | 1 | Wiring de todas as deps reais |

---

## Bugs de Produção Corrigidos Durante os Epics

| Arquivo | Bug | Fix |
|---------|-----|-----|
| `controllers/flow.go` | GORM scope accumulation em UpdateFlow | `db.Session(&gorm.Session{NewDB:true}).Save()` |
| `controllers/queue.go` | GORM scope accumulation em UpdateQueue | idem |
| `controllers/tag.go` | GORM scope accumulation em UpdateTag/ArchiveTag | idem |
| `controllers/pipeline.go` | GORM scope accumulation em UpdatePipeline | idem |
| `controllers/user.go` | `configs=""` inválido para coluna json PostgreSQL | default `"{}"` |
| `repository/gorm_user_repo.go` | ID não propagado após Create | `user.ID = m.ID` |
| `application/usecases/distribute_ticket.go` | `balanced()` com SQL dialect-specific | Go-side aggregation |
| `plugins/manager.go` | Panic em Register duplicado | Guard `pm.plugins[slug] != nil` |
| `services/redis_integration_test.go` | PubSub race condition (timeout CI) | `sub.Receive(ctx)` antes de Publish + 5s timeout |

---

## DAG Atual — Inspeção Fase 3 (2026-06-19, atualizado)

| ID | Tarefa | Tier | Status |
|----|--------|------|--------|
| NEW-1 | Modularizar event_listener.go + DI pura EventListener | T2/T3 | ✅ PR #87 |
| NEW-2 | Modularizar rabbitmq.go (3 arquivos) | T2 | ✅ PR #87 |
| NEW-3 | Split send.go/send_types.go + testes offline DLQ/tracing | T2 | ✅ PR #88 |
| NEW-4 | SessionLoader DI em WhatsAppService engine-go | T3 | ✅ PR #89 |
| NEW-5 | Deletar rabbitmq_state.go (Service Locator global — dead code) | T1 | ✅ Aplicado |
| NEW-6 | send_types_test.go — 6 testes JSON roundtrip offline | T2 | 🔄 Em andamento |
