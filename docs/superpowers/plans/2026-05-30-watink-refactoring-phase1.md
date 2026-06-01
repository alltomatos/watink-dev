# Watink Architecture Refactoring Phase 1 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar Watink para arquitetura Event-Driven + Clean Architecture (Fase 1: Isolamento da Camada de Domínio e Infraestrutura Básica).

**Architecture:** Mover entidades/lógica para `domain/`, implementar interfaces de repositório, criar adapters `infrastructure/`.

**Tech Stack:** Go, GORM, RabbitMQ.

---

### Task 1: Estruturar Camada de Domínio

**Files:**
- Modify: `business/internal/domain/domain.go` (preencher com entidades e interfaces mapeadas)
- Test: `business/internal/domain/domain_test.go` (validar tipos)

- [ ] **Step 1: Refinar `business/internal/domain/domain.go`**
  - Garantir que não existam dependências desnecessárias (GORM, frameworks).
  - Definir entidades limpas, interfaces de repositório e eventos.

- [ ] **Step 2: Criar teste básico para garantir compilação do pacote domain**

- [ ] **Step 3: Commit**

### Task 2: Implementar Infrastructure Adapters (In-Memory Repo)

**Files:**
- Create: `business/internal/infrastructure/repository/gorm_ticket_repo.go`
- Create: `business/internal/infrastructure/repository/gorm_message_repo.go`
- Create: `business/internal/infrastructure/repository/gorm_contact_repo.go`

- [ ] **Step 1: Implementar `GORMTicketRepo` implementando `domain.TicketRepository`**

- [ ] **Step 2: Implementar `GORMMessageRepo`**

- [ ] **Step 3: Implementar `GORMContactRepo`**

- [ ] **Step 4: Commit**

### Task 3: Setup Event Bus

**Files:**
- Create: `business/internal/application/event_bus.go`

- [ ] **Step 1: Implementar `InMemoryEventBus`**

- [ ] **Step 2: Commit**

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-30-watink-refactoring-phase1.md`.**

Seguindo a abordagem **Subagent-Driven**, iniciarei a **Task 1** despachando um subagente.

Deseja que eu inicie agora?
