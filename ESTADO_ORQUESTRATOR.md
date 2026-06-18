# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-18
> **Branch**: `develop` (release PR #75 → main em revisão)
> **Epic atual**: Epic 17 — health endpoint + graceful shutdown engine-go

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

---

## Cobertura de Testes Go — Estado (pós Epic 16)

> `hub_manager.go` foi deletado no Epic 16 — as 16 funções que bloqueavam a cobertura foram removidas.
> Cobertura efetiva pode ter subido ~1-2pp após remoção.

| Pacote | Cobertura |
|--------|-----------|
| `internal/flow` | 100.0% ✅ |
| `internal/middleware` | 95.2% ✅ |
| `internal/application/usecases` | 87.6% ✅ |
| `internal/infrastructure/repository` | 81.4% ✅ |
| `internal/controllers` | ~65% (estimado pós Epic 16) |
| `internal/domain` | 58.6% |
| `internal/application` | 40.5% |
| `internal/plugins` | ~40% (estimado pós Epic 16) |
| `internal/services` | 27.9% |
| **Total** | **~58-59%** (estimado) |

### Teto Real — Infraestrutura externa não testável com SQLite/mocks

| Arquivo | Funções em 0% | Motivo |
|---------|--------------|--------|
| `services/rabbitmq.go` | 15 | Conexão AMQP real |
| `services/event_listener.go` | 12 | Consumer RabbitMQ + Socket.io |
| `services/redis.go` + `redis_broadcast.go` | 12 | Cliente Redis real |
| `services/socket.go` | 5 | Socket.io real |
| `application/container.go` | 1 | Wiring de todas as deps reais |

Para cobri-los: job CI de integração com `docker-compose` + `//go:build integration` (já existe desde Epic 12).

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
| `application/usecases/distribute_ticket.go` | `balanced()` com SQL dialect-specific (aspas duplas) | Go-side aggregation |
| `plugins/manager.go` | Panic em Register duplicado (rota gin já registrada) | Guard `pm.plugins[slug] != nil` |

---

## DAG Atual — Próximos Epics

| ID | Tarefa | Tier | Status |
|----|--------|------|--------|
| Release | Merge develop → main (PR #75) | T2 | ⏳ CI rodando |
| Epic 17 | Health endpoint HTTP + graceful shutdown engine-go | T2 | 🔜 Próximo |
| Epic 18 | Device store multitenancy (resolveDeviceStore por sessionID) | T3 — **aguarda aprovação** | ⏸ Bloqueado |
| P4-A | Fix 15 warnings `react-hooks/exhaustive-deps` no frontend | T2 | 🔜 |
| P4-B | Dashboard controller — calculateTMR/calculateTME coverage | P3 | 🔜 |
