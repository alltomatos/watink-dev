# Watink Event-Driven Architecture Design Specification

**Date**: 2026-05-30
**Scope**: Full-stack (Business Go + Engine Go + Frontend React)
**Approach**: Event-Driven + Clean Architecture (Approach A)
**Pace**: Strictly incremental — system compiles and runs after every phase

---

## 1. Problem Statement

The Watink codebase suffers from high coupling ("domino effect"): business rules (ticket status, queue distribution, message processing) are tangled with infrastructure code (RabbitMQ publish/consume, Socket.io emit, GORM queries). Changing one business rule breaks or causes unexpected behavior in channel connections, WebSocket broadcasts, or queue processing.

### Top 3 Coupling Hotspots

| # | File | Mixed Responsibilities | Risk |
|---|------|----------------------|------|
| 1 | `business/internal/services/event_listener.go` | CRM logic (ticket/contact/message creation, distribution) + RabbitMQ consume + Socket.io emit + GORM transactions | **Critical** — every inbound WhatsApp event flows here |
| 2 | `business/internal/controllers/ticket.go` | Ticket update logic + distribution trigger + Socket.io emit + ticket logging | **High** — HTTP endpoint directly drives async distribution |
| 3 | `business/internal/services/distribution_service.go` | Distribution strategies (round-robin, balanced, wallet) + Socket.io emit inside `emitUpdate()` | **Medium** — pure logic polluted by real-time broadcasting |

---

## 2. Architecture

### 2.1 Layers

```
┌──────────────────────────────────────────────────────┐
│  API / Entry Points                                   │
│  Gin Controllers · AMQP Listeners · Socket Handlers   │
└────────────────────────┬─────────────────────────────┘
                         │ depends on
┌────────────────────────▼─────────────────────────────┐
│  Application Layer                                    │
│  Use Cases · Event Bus · Command/Query Objects        │
└────────────────────────┬─────────────────────────────┘
                         │ depends on
┌────────────────────────▼─────────────────────────────┐
│  Domain Layer                                         │
│  Entities · Domain Services · Repository Interfaces   │
│  Channel Adapter Interface · Domain Events            │
└──────────────────────────────────────────────────────┘
                         ↑ implements
┌──────────────────────────────────────────────────────┐
│  Infrastructure Layer                                 │
│  GORM Repos · RabbitMQ Adapters · Socket.io Adapter   │
│  Redis Adapter · Channel Adapters (WhatsApp, etc.)    │
└──────────────────────────────────────────────────────┘
```

**Dependency Rule**: Dependencies point inward only. Domain has zero external imports. Application depends on Domain. Infrastructure implements Domain interfaces.

### 2.2 Domain Layer (`domain/`)

Pure Go with no framework or infrastructure imports.

**Entities**: `Ticket`, `Message`, `Contact`, `Queue`, `ChannelSession`

**Repository Interfaces** (defined in domain, implemented in infrastructure):
```go
type TicketRepository interface {
    FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*Ticket, error)
    FindOpenByContact(ctx context.Context, tenantID uuid.UUID, contactID int, sessionID int) (*Ticket, error)
    Save(ctx context.Context, ticket *Ticket) error
    Update(ctx context.Context, ticket *Ticket, fields map[string]interface{}) error
}

type MessageRepository interface {
    Create(ctx context.Context, msg *Message) error
    FindByID(ctx context.Context, id string, tenantID uuid.UUID) (*Message, error)
    Update(ctx context.Context, msg *Message, fields map[string]interface{}) error
}

type ContactRepository interface {
    FindByNumber(ctx context.Context, tenantID uuid.UUID, number string, isGroup bool) (*Contact, error)
    Create(ctx context.Context, contact *Contact) error
    Update(ctx context.Context, contact *Contact, fields map[string]interface{}) error
}
```

**Channel Adapter Interface**:
```go
type ChannelAdapter interface {
    SendMessage(ctx context.Context, ticket Ticket, message Message) error
    StartSession(ctx context.Context, session ChannelSession) error
    StopSession(ctx context.Context, sessionID int) error
    DeleteSession(ctx context.Context, sessionID int) error
}
```

**Domain Events**:
```go
type DomainEvent interface {
    EventName() string
    TenantID() uuid.UUID
}

type TicketAssignedEvent struct { TicketID int; UserID int; TenantID uuid.UUID }
type MessageReceivedEvent struct { MessageID string; TicketID int; TenantID uuid.UUID }
type TicketStatusChangedEvent struct { TicketID int; OldStatus string; NewStatus string; TenantID uuid.UUID }
type ContactCreatedEvent struct { ContactID int; TenantID uuid.UUID }
type SessionStatusChangedEvent struct { SessionID int; Status string; TenantID uuid.UUID }
```

### 2.3 Application Layer (`application/`)

**Use Cases**:
- `ReceiveMessageUseCase` — processes inbound messages (find/create contact → find/create ticket → save message → emit events)
- `AssignTicketUseCase` — runs distribution strategy and assigns ticket to user
- `UpdateTicketUseCase` — handles ticket status/queue/user changes, emits events
- `SendOutboundMessageUseCase` — creates outbound message, delegates to ChannelAdapter
- `ManageSessionUseCase` — start/stop/delete channel sessions

**Event Bus** (in-process, interface-based):
```go
type EventBus interface {
    Publish(ctx context.Context, event DomainEvent) error
    Subscribe(eventName string, handler EventHandler) error
}

type EventHandler func(ctx context.Context, event DomainEvent) error
```

Implementation: in-memory with goroutines for async handlers. The RabbitMQ and Socket.io adapters subscribe to domain events and perform their I/O asynchronously. No cross-process coordination needed — the single-process backend owns the event bus.

### 2.4 Infrastructure Layer (`infrastructure/`)

**Adapters** (subscribe to EventBus, perform I/O):

| Adapter | Subscribes To | Action |
|---------|--------------|--------|
| `SocketIOAdapter` | `TicketAssignedEvent`, `MessageReceivedEvent`, `TicketStatusChangedEvent`, `SessionStatusChangedEvent` | Emits to Socket.io rooms/namespaces |
| `RabbitMQAdapter` | `SendOutboundMessageEvent`, `SessionStartEvent`, `SessionStopEvent`, `SessionDeleteEvent` | Publishes AMQP commands to Engine |
| `GORMTicketRepo` | — | Implements `TicketRepository` |
| `GORMMessageRepo` | — | Implements `MessageRepository` |
| `GORMContactRepo` | — | Implements `ContactRepository` |
| `WhatsAppAdapter` | — | Implements `ChannelAdapter` (wraps existing RabbitMQ command publishing) |

### 2.5 Engine Go Changes

The Engine remains a standalone service. Changes:
- **Command handlers** remain in `engine-go/cmd/engine/main.go`
- **Event publishing** remains via RabbitMQ `wbot.events` exchange
- **New**: Engine implements `ChannelAdapter` contract logically (processes commands, publishes events). No direct code dependency — the contract is enforced by the AMQP message schema.

### 2.6 Frontend Changes

Minimal changes to support cleaner event naming:
- Socket.io event names align with domain event names
- Frontend consumes the same events but with more consistent payloads
- No architectural restructuring in frontend — just event name alignment

---

## 3. Execution Flow: "Message Received"

```
Engine Go                    Business Go
────────                     ────────────
1. whatsmeow event
2. publishEvent()
   → AMQP wbot.events
   ───────────────────→    3. AMQP Listener receives delivery
                            4. Unmarshals → calls ReceiveMessageUseCase.Execute()
                            5. UseCase:
                               a. contactRepo.FindByNumber() / Create()
                               b. ticketRepo.FindOpenByContact() / Create()
                               c. messageRepo.Create()
                               d. eventBus.Publish(MessageReceivedEvent)
                               e. eventBus.Publish(TicketStatusChangedEvent) [if new]
                            6. EventBus dispatches:
                               → SocketIOAdapter → EmitToRoom (real-time)
                               → LoggerAdapter → log entry
```

---

## 4. Phased Rollout (Incremental)

Each phase produces a compilable, runnable system.

### Phase 1: Domain Layer Extraction
- Create `domain/` package with entities, repository interfaces, domain events
- No behavior change — just defining types and interfaces
- **Validation**: `go build ./...` passes

### Phase 2: Infrastructure Adapters
- Create `infrastructure/` with GORM repository implementations
- Create in-memory EventBus implementation
- **Validation**: unit tests for repos + event bus pass

### Phase 3: Application Use Cases
- Create `application/` with `ReceiveMessageUseCase`, `UpdateTicketUseCase`, `AssignTicketUseCase`, `SendOutboundMessageUseCase`, `ManageSessionUseCase`
- Wire EventBus subscriptions for Socket.io and RabbitMQ adapters
- **Validation**: use case unit tests pass

### Phase 4: Controller Migration
- Migrate `event_listener.go` handlers to call Use Cases instead of inline DB/messaging
- Migrate `ticket.go` controller to call Use Cases
- Migrate `message.go` controller to call Use Cases
- Remove direct `EmitToNamespace`/`EmitToRoom` calls from controllers and services
- **Validation**: `go build ./...` + existing integration still works

### Phase 5: Engine & Frontend Alignment
- Align Engine AMQP event schemas with domain events
- Update Frontend Socket.io event handlers for new event names
- **Validation**: end-to-end smoke test passes

### Phase 6: Legacy Cleanup & Test Coverage
- Remove dead code from `services/event_listener.go`
- Remove `services/distribution_service.go` (absorbed into use cases)
- Add integration tests for critical flows
- **Validation**: full test suite green

---

## 5. Success Criteria

- [ ] Domain layer has zero imports from `infrastructure/`, `database/`, `services/`, or any framework
- [ ] Controllers contain no business logic (only HTTP parsing + Use Case call)
- [ ] No direct `EmitToNamespace`/`EmitToRoom`/`PublishCommand` calls outside infrastructure adapters
- [ ] Adding a new channel (e.g., Telegram) requires only a new `ChannelAdapter` implementation — no changes to Use Cases or Domain
- [ ] System compiles and runs after every phase
- [ ] Existing tests continue passing after every phase
