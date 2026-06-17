# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-17
> **Branch**: `refactor/backend-di-packages`
> **Epic**: Epic 2 — DI & Organização de Pacotes (Backend Go)

---

## Contexto da Sessão

Auditoria do backend Go (`business/`) identificou violações de DI pura: controllers recebem
`*gorm.DB` diretamente, services concretos são expostos sem interfaces, há controllers fora
do lugar na raiz do projeto e um fallback global no Container. O objetivo deste epic é
garantir que toda dependência flua via interfaces declaradas em `domain/` e instanciadas
exclusivamente em `main.go` / `Container`.

---

## GAPs Identificados (Fase 3)

| ID | GAP | Prioridade | Tier |
|----|-----|-----------|------|
| G1 | Controllers recebem `*gorm.DB` diretamente (10 controllers) | P2 | T2 |
| G2 | Services concretos sem interface no domínio (5 services) | P2 | T2 |
| G3 | `internal/controllers/` na raiz do projeto (swagger.go, version.go) | P2 | T2 |
| G4 | `Container.NewContainer` usa `database.DB` global como fallback | P2 | T1 |
| G5 | `dashboard.go` com lógica de negócio (TMR/TME) no controller | P2 | T2 |

---

## DAG de Tarefas

### Legenda
- `pending` ⏳ — aguardando
- `in_progress` 🔄 — em andamento
- `done` ✅ — concluído
- `blocked` 🚫 — depende de outra tarefa

---

### Bloco A — Fundação (sem dependências)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| A1 | Remover fallback `database.DB` global do Container | `business/internal/application/container.go` | ✅ | — |
| A2 | Deletar `internal/` da raiz (swagger.go e version.go órfãos, sem importações) | `internal/controllers/swagger.go`, `internal/controllers/version.go` | ✅ | — |
| A3 | Declarar interface `SetupServiceInterface` em `domain/interfaces.go` | `business/internal/domain/interfaces.go` | ✅ | — |
| A4 | Declarar interface `DistributionServiceInterface` em `domain/interfaces.go` | `business/internal/domain/interfaces.go` | ✅ | A3 |
| A5 | Declarar interface `PlanLimitServiceInterface` em `domain/interfaces.go` | `business/internal/domain/interfaces.go` | ✅ | A3 |
| A6 | Declarar interface `TicketLogServiceInterface` em `domain/interfaces.go` | `business/internal/domain/interfaces.go` | ✅ | A3 |
| A7 | Declarar interface `WhatsAppSessionServiceInterface` em `domain/interfaces.go` | `business/internal/domain/interfaces.go` | ✅ | A3 |

### Bloco B — Controllers (depende de A)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| B1 | `GroupController`: substituir `*gorm.DB` por repositório de interface | `business/internal/controllers/group.go` | ⏳ | A3 |
| B2 | `RoleController`: substituir `*gorm.DB` por repositório de interface | `business/internal/controllers/role.go` | ⏳ | A3 |
| B3 | `SettingController`: substituir `*gorm.DB` por repositório de interface | `business/internal/controllers/setting.go` | ⏳ | A3 |
| B4 | `SetupController`: substituir `*gorm.DB` por `SetupServiceInterface` | `business/internal/controllers/setup.go` | ⏳ | A3 |
| B5 | `SystemController`: substituir `*gorm.DB` por interfaces de repositório | `business/internal/controllers/system.go` | ⏳ | A3 |
| B6 | `UserController`: remover `*gorm.DB` residual (já tem `UserRepo`) | `business/internal/controllers/user.go` | ⏳ | A3 |
| B7 | `WhatsappController`: substituir `*gorm.DB` por interface de sessão | `business/internal/controllers/whatsapp.go` | ⏳ | A7 |
| B8 | `PluginController`: substituir `*gorm.DB` por interface de repositório | `business/internal/controllers/plugin_manager.go` | ⏳ | A3 |
| B9 | `DashboardController`: extrair lógica TMR/TME para `DashboardService` | `business/internal/controllers/dashboard.go` | ⏳ | A3 |
| B10 | `SwaggerController` + `VersionController`: manter DI, apenas confirmar | `business/internal/controllers/swagger.go`, `version.go` | ⏳ | A2 |

### Bloco C — Container & Rotas (depende de B)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| C1 | Atualizar `Container` para carregar as novas interfaces de service | `business/internal/application/container.go` | ⏳ | B1–B9 |
| C2 | Atualizar `routes.go` para injetar interfaces em vez de concretos | `business/internal/routes/routes.go` | ⏳ | C1 |
| C3 | ADR: documentar decisão de interfaces obrigatórias para services Go | `docs/adr/0006-go-service-interfaces.md` | ⏳ | C2 |

### Bloco D — Testes (depende de C)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| D1 | Adicionar teste de integração para `GroupController` com mock via interface | `business/internal/controllers/group_test.go` | ⏳ | C2 |
| D2 | Adicionar teste de integração para `SetupController` com mock via interface | `business/internal/controllers/setup_test.go` | ⏳ | C2 |
| D3 | `go build ./...` + `go test ./...` — validação final | — | ⏳ | D1, D2 |

---

## Checkpoints de Sanidade

- [x] **CP-1** — Após Bloco A: `go build ./...` compila sem erros ✅ 2026-06-17
- [ ] **CP-2** — Após Bloco B: testes existentes ainda passam
- [ ] **CP-3** — Após Bloco C: `go build ./...` + `go test ./...` limpos
- [ ] **CP-4** — Final: ADR criado, PR aberta, zero `*gorm.DB` em construtores de controller

---

## Histórico de Ações

| Data | Ação | Status |
|------|------|--------|
| 2026-06-17 | Auditoria do backend Go — 5 GAPs identificados | ✅ |
| 2026-06-17 | Branch `refactor/backend-di-packages` criado | ✅ |
| 2026-06-17 | ESTADO_ORQUESTRATOR.md criado com DAG completo | ✅ |
| 2026-06-17 | Bloco A concluído — globals removidos, 5 interfaces declaradas, CP-1 ✅ | ✅ |
| 2026-06-17 | API Docs migrados: Swagger UI → Scalar + swaggo/swag; 50+ handlers anotados; JSON gerado em `business/docs/` | ✅ |
