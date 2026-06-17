# ADR 0006 — Interfaces Obrigatórias para Repositories e Services no Backend Go

**Data**: 2026-06-17
**Status**: Aceito
**Contexto**: `business/` — Backend Go (Gin/GORM)
**Branch de origem**: `refactor/backend-di-packages`

---

## Contexto

O backend Go (`business/`) acumulou um padrão de acoplamento direto: controllers recebiam
`*gorm.DB` como dependência construtora e instanciavam services concretos internamente.
Isso criava três problemas estruturais:

1. **Testabilidade zero** — impossível substituir o banco por um mock sem reescrever o controller.
2. **Violação de DI pura** — o controller conhecia a implementação, não o contrato.
3. **Risco de vazamento de tenant** — queries raw espalhadas sem escopo RLS centralizado.

A auditoria do Epic 2 identificou 10 controllers com `*gorm.DB` direto no construtor e
5 services sem interface declarada no domínio.

---

## Decisão

**Todo repository e service no backend Go deve ser exposto via interface declarada em
`internal/domain/interfaces.go`, nunca como struct concreto.**

Regras derivadas:

1. **Construtores de controller aceitam apenas interfaces** — nunca `*gorm.DB` diretamente.
2. **Implementações GORM ficam em `internal/infrastructure/repository/`** — prefixo `GORM*`.
3. **Instanciação centralizada em `NewContainer`** — único ponto de wiring da aplicação.
4. **DB com escopo RLS chega via `auth.GetScoped(c, "Resource")`** — nunca via construtor.
5. **Mocks de teste são structs locais dentro de cada `Test*`** — sem variáveis globais de mock.

---

## Padrão Adotado

```
domain/interfaces.go          → interface PermissionRepository
infrastructure/repository/    → GORMPermissionRepository (implementa a interface)
application/container.go      → permissionRepo := repository.NewGORMPermissionRepo(db)
controllers/group.go          → NewGroupController(permRepo domain.PermissionRepository)
```

O `*gorm.DB` existe apenas em:
- `application/container.go` — wiring root
- `infrastructure/repository/*.go` — implementações GORM
- Closures de transação dentro de handlers (`db.Transaction(func(tx *gorm.DB) error {...})`)
  onde o DB vem de `auth.GetScoped`, não de campo de struct.

---

## Alternativas Rejeitadas

| Alternativa | Motivo da Rejeição |
|---|---|
| Service Locator / Container Global | Oculta dependências, impossibilita testes unitários |
| Singleton por service | Compartilha estado entre requests, risco de race condition |
| `*gorm.DB` direto no construtor | Acopla controller à implementação, sem contrato testável |
| Wire / fx (DI frameworks) | Overhead desnecessário; `NewContainer` manual é legível e suficiente |

---

## Consequências

**Positivas**:
- Qualquer repository pode ser substituído por mock struct em testes — sem CGO, sem SQLite.
- O grafo de dependências é explícito e legível em `NewContainer`.
- Novos controllers seguem o padrão por convenção visível no código existente.

**Negativas / Trade-offs**:
- Cada novo recurso exige: interface em `domain/` + implementação em `repository/` + wiring em `container.go`.
- Boilerplate maior para recursos simples (aceitável dado o ganho em testabilidade e segurança).

---

## Relação com outros ADRs

- **ADR 0001** — Multitenancy RLS/JWT: o escopo RLS (`auth.GetScoped`) é o mecanismo
  que entrega `*gorm.DB` já filtrado por tenant ao handler, sem passar pelo construtor.
- **ADR 0005** — ABAC Role/Permission: `PermissionRepository` (global, sem tenant) foi
  criado como consequência direta desta decisão — permissões são catálogo global, não RLS.
