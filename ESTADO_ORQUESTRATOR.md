# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-18
> **Branch**: `main`
> **Epic atual**: Concluído — cobertura Go 57%

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
| Epic 12 | Testes integração RabbitMQ/Redis + handlers event_listener + step CI | 🔄 PR #69 em revisão |

---

## Cobertura de Testes Go — Estado Final

| Pacote | Cobertura |
|--------|-----------|
| `internal/flow` | 100.0% ✅ |
| `internal/middleware` | 95.2% ✅ |
| `internal/application/usecases` | 87.6% ✅ |
| `internal/infrastructure/repository` | 81.4% ✅ |
| `internal/controllers` | 63.7% |
| `internal/domain` | 58.6% |
| `internal/application` | 40.5% |
| `internal/plugins` | 37.0% |
| `internal/services` | 27.9% |
| **Total** | **57.1%** |

### Teto Real Atingido

Os 43% restantes são código de infraestrutura externa não testável com SQLite/mocks:

| Arquivo | Funções em 0% | Motivo |
|---------|--------------|--------|
| `plugins/hub_manager.go` | 16 | HTTP ao Marketplace Hub |
| `services/rabbitmq.go` | 15 | Conexão AMQP real |
| `services/event_listener.go` | 12 | Consumer RabbitMQ + Socket.io |
| `services/redis.go` + `redis_broadcast.go` | 12 | Cliente Redis real |
| `services/socket.go` | 5 | Socket.io real |
| `application/container.go` | 1 | Wiring de todas as deps reais |

Para cobri-los: job CI de integração com `docker-compose` + `//go:build integration`.

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

## Próximos Passos Sugeridos (P2)

| ID | Tarefa | Prioridade |
|----|--------|-----------|
| N1 | Job CI de integração com docker-compose (RabbitMQ/Redis/PG) + `go test -tags integration` | ✅ Epic 12 |
| N2 | Cobrir `services/event_listener.go` handlers com mocks de socket + repo | ✅ Epic 12 |
| N3 | Abstração de interface para `hub_manager.go` (HTTP client mockável) | P2 |
| N4 | Dashboard controller — calculateTMR/calculateTME paths não cobertos | P3 |
