# Watink Event-Driven Architecture Design Specification

## Overview
Refactoring Watink to resolve high coupling ('domino effect') by implementing Clean Architecture concepts and an Event-Driven design.

## Architecture

### 1. Layers
*   **Domain (`domain/`)**: Pure business logic, entities (`Ticket`, `Message`, `Contact`, `Channel`), and repository interfaces. No external dependencies.
*   **Application (`application/`)**: Use Cases (`TicketUseCase`, `MessageUseCase`). Orchestrates business logic and persists via repository interfaces.
*   **Infrastructure (`infrastructure/`)**: Implementations of repository interfaces (GORM, RabbitMQ drivers, Socket.io adapters).

### 2. Core Components

#### Channel Abstraction
To support multi-channel (WhatsApp, Telegram, etc.):
```go
type ChannelAdapter interface {
    SendMessage(ctx context.Context, ticket Ticket, message Message) error
}
```

#### Event Bus
An asynchronous Event Bus based on the Mediator pattern.
*   **Producers**: Domain Services or Use Cases emit domain events (`TicketAssigned`, `MessageReceived`).
*   **Consumers**: Infrastructure Adapters (RabbitMQ, WebSocket) listen and perform I/O.

### 3. Execution Flow
1.  **Request/Event** (HTTP/AMQP) enters through Infrastructure.
2.  **Controller/Listener** calls the corresponding **Use Case**.
3.  The **Use Case** executes logic, interacts with Domain Entities, and emits **Domain Events**.
4.  The **Event Bus** notifies subscribers (Infra, Logger, Metrics).

## Risk & Mitigation
*   **Incremental Goal**: Ensure the system remains compilable and runnable at each stage of refactoring.
*   **Testing**: Unit tests for Domain/UseCases; integration tests for Infrastructure.
