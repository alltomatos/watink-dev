# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-25
> **Branch**: `develop` (PRs #211–#227 mergeados ou abertos)

---

## Épico Ativo: Migração Real-Time SSE (ADR 0010)

**Branch alvo:** `feat/realtime-sse`

### Auditoria Técnica — GAPs

#### GAP-RT-1 — Interface Broadcaster ausente no domínio (T2)
`Container.Broadcast` é `*services.RedisBroadcast` concreto — impossível trocar por feature-flag.
**Fix:** extrair `domain.Broadcaster`; ajustar Container + 11 controllers.

#### GAP-RT-2 — SSEHub/SSEBroadcast/endpoint /events inexistem (T2)
Nenhum arquivo SSE no backend. Criar `sse_hub.go`, `sse_broadcast.go`, `controllers/sse.go` + rota.

#### GAP-RT-3 — Redis backbone acoplado a socketio.Server (T2)
`RedisBroadcast.Start()` chama `server.BroadcastToRoom` diretamente.
**Fix:** injetar `localSink domain.Broadcaster`; feature-flag `REALTIME_BACKEND=sse|socketio`.

#### GAP-RT-4 — Auth SSE: token na query exposto em access-log (T2)
**Fix:** rota `/events` fora do middleware de log; token TTL curto (fase 1).

#### GAP-RT-5 — Frontend usa socket.io-client sem alternativa SSE (T3-BLOQUEANTE)
**Fix:** reescrever interior de `socket-io.ts` como SSEClient singleton; preservar assinatura `subscribeToSocket`.

#### GAP-RT-6 — Replay Last-Event-ID não implementado (T2)
Cache Redis `wbot:msg:{jid}:{id}` existe mas handler não o lê. **Fix:** replay no handler `/events`.

#### GAP-RT-7 — Remoção final Socket.IO pendente (T3-BLOQUEANTE)
Só após paridade dos 8 critérios de sucesso validados.

---

### DAG de Tarefas — feat/realtime-sse

**Paralelismo planejado:**
```
Rodada A (paralela): T1 + T8
Rodada B (paralela, após T1): T2 + T3 + T4
Rodada C (sequencial): T5 → T6 → T7
Rodada D: T9 (após T8) → T10 (após T6+T7+T9)
Rodada E (paralela, após T6): T11 + T12
Rodada F [BLOQUEANTE]: T13 — aguarda aprovação após T10
```

#### Tarefas
- [ ] **T1**: Criar `business/internal/domain/broadcaster.go` — interface `Broadcaster` | depends_on: []
- [ ] **T2**: Atualizar `application/container.go` — campo `Broadcast domain.Broadcaster` | depends_on: [T1]
- [ ] **T3**: Atualizar 11 controllers — aceitar `domain.Broadcaster` em vez de `*services.RedisBroadcast` | depends_on: [T1]
- [ ] **T4**: Criar `business/internal/services/sse_hub.go` — SSEHub com sync.Map, Register/Deliver/Close, heartbeat 20s | depends_on: [T1]
- [ ] **T5**: Criar `business/internal/services/sse_broadcast.go` — SSEBroadcast implementa domain.Broadcaster via SSEHub | depends_on: [T1, T4]
- [ ] **T6**: Criar `business/internal/controllers/sse.go` + rota `GET /events` — JWT inline, stream text/event-stream, Flush, X-Accel-Buffering | depends_on: [T4, T5]
- [ ] **T7**: Refatorar `redis_broadcast.go` — injetar `localSink domain.Broadcaster`; feature-flag `REALTIME_BACKEND` em main.go | depends_on: [T1, T5]
- [ ] **T8**: Reescrever `frontend/src/services/socket-io.ts` — SSEClient singleton + roomRegistry + shim de salas | depends_on: []
- [ ] **T9**: Adaptar 5 call-sites `onJoin` — useMessagesSocket, TicketsList, Ticket, useNotifications, useHelpdeskKanban | depends_on: [T8]
- [ ] **T10**: Validar paridade 6 eventos com `REALTIME_BACKEND=sse` em local | depends_on: [T6, T7, T9]
- [ ] **T11**: Auth — rota `/events` fora do access-log Gin | depends_on: [T6]
- [ ] **T12**: Replay Last-Event-ID — buscar cache Redis após reconexão (somente appMessage) | depends_on: [T6]
- [ ] **T13** 🔒 **[BLOQUEANTE — aguarda aprovação]**: Remover socket.go, rotas /socket.io/*, go-socket.io, socket.io-client | depends_on: [T10, T11, T12]

#### Critérios de saída (antes de T13)
1. [ ] Mensagem via REST aparece em <1s sem refresh
2. [ ] lastMessage do ticket atualiza em tempo real
3. [ ] 6 eventos com emissor Go com paridade confirmada
4. [ ] Evento de tenant A não chega ao tenant B
5. [ ] Backend reiniciado → reconecta e nenhum appMessage se perde
6. [ ] Multi-aba HTTP/2 → POST /messages não fica pending
7. [ ] Atrás de proxy real (staging) → evento chega imediatamente
8. [ ] go-socket.io e socket.io-client removidos

#### Registro de Execução
| Task | Status | Notas |
|---|---|---|
| T1 | ⏳ pendente | — |
| T2 | ⏳ pendente | — |
| T3 | ⏳ pendente | — |
| T4 | ⏳ pendente | — |
| T5 | ⏳ pendente | — |
| T6 | ⏳ pendente | — |
| T7 | ⏳ pendente | — |
| T8 | ⏳ pendente | — |
| T9 | ⏳ pendente | — |
| T10 | ⏳ pendente | — |
| T11 | ⏳ pendente | — |
| T12 | ⏳ pendente | — |
| T13 | 🔒 bloqueante | Aguarda aprovação após T10 |
> **Epic atual**: Onda 8 concluída — PR #226 (fix/tag-n1 já no develop via #225), PR #227 (test/deal-controller) aberto para review

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
| PRs #90–#192 | Batch: GAP-AUTH-COVERAGE (pkg/auth 0%→93.5%), GAP-MEDIA-SEND, GAP-MEDIA-1/2, GAP-ANY, GAP-WS (WebSocket hardening + multitenancy), GAP-VAL-1 (ParseIntParam), DI remoção globals socket/redis, testes Audio/TicketsList/mediastore, feat audio player, API docs sync | ✅ Mergeado |
| GAP-4 + INFO | TS-only frontend/src (loader.js→ts, test.js→ts, .gitignore media cache) | ✅ Mergeado (PR #211) |
| GAP-2 (3 piores) | Decompõe controllers god-files: contact/tag/user < 250L (5 novos arquivos) | ✅ Mergeado (PR #212) |
| GAP-1 + GAP-3 | engine-go: decomp events.go (4 arquivos) + MessageBroker interface + 13 testes offline | ✅ Mergeado (PR #213) |
| GAP-SEC + Z1 | quic-go v0.59.1 (CVE-2026-40898) + remove QueueVisibilityFilter vocab | ✅ Mergeado (PR #216) |
| GAP-GOD-2 | Decompõe 5 controllers god-files round-2: whatsapp/ticket/kb/message/pipeline < 250L | ✅ Mergeado (PR #215) |
| GAP-ENG-2 | WhatsAppClient interface + testes offline send_poll/contacts engine-go | ✅ Mergeado (PR #214) |
| GAP-SVC | Split event_listener_message.go por tipo de evento (4 arquivos) | ✅ Mergeado (PR #217) |
| GAP-N1 | Fix N+1 em TagController.List() — batch GROUP BY (tag.go) | ✅ Mergeado (PR fix/tag-n1-query) |
| GAP-SIZE R1 | Split receive_message.go(273L) → + receive_message_enrich.go | ✅ Mergeado (refactor/receive-message-split) |
| GAP-ENG-3 | Expande WhatsAppClient interface + testes offline send/download | ✅ Mergeado (test/engine-go-coverage-3) |
| GAP-TEST-FRONT | Fix 15 timeouts em TransferTicketModal (waitFor + mock async) | ✅ Mergeado (fix/frontend-test-timeouts) |
| GAP-COV-MUT M1 | Testes mutation controllers: knowledge_base/message/ticket | ✅ Mergeado (test/controllers-mutation-coverage) |
| GAP-COV-MUT M2+M3 | Testes offline engine-go: event handlers + send_interactive | ✅ Mergeado (test/engine-go-coverage-4) |
| DOCS D1 | CLAUDE.md Status Atual atualizado (PRs #211-#220) | ✅ Aplicado (T1 auto) |

---

## Cobertura de Testes Go — Estado (pós PR #213, 2026-06-23)

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
| `pkg/auth` | 93.5% ✅ (PR #186) |
| `pkg/utils` | ~75% ✅ (errors_test.go — 10 casos, 2026-06-22) |
| `engine-go/internal/rabbitmq` | 22.2% ✅ (PR #213, broker_test.go — 4 testes) |
| `engine-go/internal/whatsapp` | 11.4% ✅ (PR #213, events+session offline — 9 testes) |
| **Total business estimado** | **~55-60%** |

> Teto real engine-go: maioria dos arquivos em whatsapp/ depende de `whatsmeow.Client` I/O externo.
> Cobertura adicional requer interface para o próprio client (escopo next cycle).

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

## DAG Anterior — Batch B1–B5 (2026-06-22) — CONCLUÍDO

| ID | Tarefa | Tier | Status |
|----|--------|------|--------|
| B1 | Deletar pr_media1.md (arquivo órfão) | T1 | ✅ Aplicado |
| B2 | Fragmentar event_listener.go 499L → 4 arquivos (session/message/contact) | T2 | ✅ Aplicado |
| B3 | Testes pkg/utils/errors.go — 10 casos, build green | T2 | ✅ Aplicado |
| B4 | Testes internal/services mockáveis — 16 casos offline (revoke/reaction/contact/jid) | T2 | ✅ Aplicado |
| B5 | Atualizar ESTADO_ORQUESTRATOR.md (PRs #90–#192) | T1 | ✅ Aplicado |

---

## DAG Atual — Batch Ondas 1-2-3 (2026-06-23)

| ID | Tarefa | Tier | PR | Status |
|----|--------|------|----|--------|
| F1 | loader.js → loader.ts (tipos ApplyThemeOptions/BrandOverrides) | T1 | #211 | ✅ Mergeado |
| F2 | useThemeTokens.test.js → .test.ts (rename + assinaturas null-safe) | T1 | #211 | ✅ Mergeado |
| F3 | .gitignore: business/**/public/media/ (cache runtime mediastore) | T1 | #211 | ✅ Mergeado |
| C1 | Decompor contact.go (374L) → contact.go + contact_mutation.go + contact_sync.go | T2 | #212 | ✅ Mergeado |
| C2 | Decompor tag.go (334L) → tag.go + tag_mutation.go + tag_groups.go | T2 | #212 | ✅ Mergeado |
| C3 | Decompor user.go (327L) → user.go + user_mutation.go | T2 | #212 | ✅ Mergeado |
| G1 | Decompor events.go (346L) → events.go + events_message.go + events_pic.go + events_status.go | T2 | #213 | ✅ Mergeado |
| E1 | Interface MessageBroker + 4 testes offline (rabbitmq) | T2 | #213 | ✅ Mergeado |
| E2 | 5 testes offline events handlers (whatsapp) | T2 | #213 | ✅ Mergeado |
| E3 | 4 testes offline session (whatsapp) | T2 | #213 | ✅ Mergeado |

### God-files remanescentes (próximo ciclo)

Ciclo 4 concluído — todos os god-files controllers decompostos.

---

## DAG Onda 4 (2026-06-24)

| ID | Tarefa | Tier | PR | Status |
|----|--------|------|----|--------|
| S1 | bump quic-go v0.59.1 (CVE-2026-40898) | T1 | fix/quic-go-cve | ✅ |
| Z1 | remove QueueVisibilityFilter de CONTEXT.md | T1 | fix/quic-go-cve | ✅ |
| D1 | whatsapp.go (320L) → whatsapp_session.go + whatsapp_status.go | T2 | refactor/controllers-decompose-2 | ✅ |
| D2 | ticket.go (308L) → ticket_mutation.go + ticket_query.go | T2 | refactor/controllers-decompose-2 | ✅ |
| D3 | knowledge_base.go (304L) → knowledge_base_mutation.go | T2 | refactor/controllers-decompose-2 | ✅ |
| D4 | message.go (280L) → message_send.go + message_query.go | T2 | refactor/controllers-decompose-2 | ✅ |
| D5 | pipeline.go (258L) → pipeline_mutation.go | T2 | refactor/controllers-decompose-2 | ✅ |
| X1 | WhatsAppClient interface mínima engine-go | T2 | test/engine-go-coverage-2 | ✅ |
| X2 | Testes offline send_poll + contacts engine-go | T2 | test/engine-go-coverage-2 | ✅ |
| V1 | Split event_listener_message.go por tipo evento | T2 | refactor/services-event-split | ✅ |

---

## DAG Onda 5 (2026-06-24)

| ID | Tarefa | Tier | PR | Status |
|----|--------|------|----|--------|
| N1 | Fix N+1 TagController.List() — batch GROUP BY | T2 | fix/tag-n1-query | ✅ |
| R1 | Split receive_message.go(273L) → receive_message_enrich.go | T2 | refactor/receive-message-split | ✅ |
| X1b | Expande WhatsAppClient interface (Download+MarkRead) | T2 | test/engine-go-coverage-3 | ✅ |
| X2b | Testes offline send.go + download.go helpers | T2 | test/engine-go-coverage-3 | ✅ |

---

## DAG Onda 6 (2026-06-24)

| ID | Tarefa | Tier | PR | Status |
|----|--------|------|----|--------|
| D1 | CLAUDE.md Status Atual — PRs #211-#220 | T1 | (auto-commit) | ✅ |
| T1 | Fix timeouts TransferTicketModal (15 casos) | T2 | fix/frontend-test-timeouts | ✅ |
| M1 | Testes knowledge_base_mutation + message_send + ticket_mutation | T2 | test/controllers-mutation-coverage | ✅ |
| M2 | Testes offline events_message + events_pic + events_status | T2 | test/engine-go-coverage-4 | ✅ |
| M3 | Testes offline send_interactive engine-go | T2 | test/engine-go-coverage-4 | ✅ |

---

## DAG Onda 7 — Epic Pipeline (2026-06-24) ✅ CONCLUÍDA

> PRs #224 (pipeline improvements) e #225 (deal-controller + UI redesign) mergeados em develop.

| ID | Tarefa | Status | PR |
|----|--------|--------|----|
| P-BE-1 | Pipeline model description + type | ✅ | #224 |
| P-BE-2 | Input structs Create/Update | ✅ | #224 |
| P-BE-3 | AISuggest real LLM (aiclient) | ✅ | #224 |
| P-BE-4 | Stage upsert por nome | ✅ | #224 |
| P-FE-1/2 | AISettings custom provider + aiPipelineEnabled | ✅ | #224 |
| P-FE-3 | Remover PipelineWizard | ✅ | #224 |
| P-FE-4 | Modal confirmação stages removidas | ✅ | #225 |
| P-TEST-1/2 | Testes pipeline_mutation + AISuggest | ✅ | #225 |
| DEAL | DealController GET/PUT + fix 404/500 | ✅ | #225 |
| UI | Pipeline listing + Kanban + Creator redesign | ✅ | #225 |

---

## DAG Onda 8 — Testes DealController (2026-06-25)

| ID | Tarefa | Tier | Status | PR |
|----|--------|------|--------|----|
| N1 | Fix N+1 tag.go | T1 | ✅ (incluído em #225 via commit d27739ac) | — |
| D1 | deal_test.go — 5 casos unitários | T2 | ✅ pushed | #227 |
