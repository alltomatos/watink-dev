# Refatoração e Evolução da Arquitetura Watink

## 1. Diagnóstico do Problema
O sistema apresenta alto acoplamento ("efeito dominó"), onde regras de negócio (CRM) estão misturadas com código de infraestrutura (RabbitMQ, WebSocket, DB/GORM). Alterações nas regras de negócio impactam diretamente a conectividade e a comunicação em tempo real.

### Hotspots Críticos
1. **`business/internal/services/event_listener.go`**: Centraliza regras de negócio e infraestrutura.
2. **`business/internal/controllers/ticket.go`**: Lógica de distribuição acoplada ao controller.
3. **`business/internal/services/distribution_service.go`**: Lógica de distribuição acoplada a broadcasting de Sockets.

---

## 2. Proposta de Arquitetura (Clean Architecture + Event-Driven)

### Estrutura de Camadas
- **Domain Layer**: Entidades e regras de negócio puras (sem dependências de infra).
- **Application Layer**: Use Cases (Ticket, Distribution, Messaging) e mediator pattern.
- **Infrastructure Layer**: Adapters para RabbitMQ, Socket.io, GORM e APIs externas.

### Novo Fluxo (Exemplo: Mensagem Recebida)
1. Evento de domínio emitido.
2. Use Case processa (Criação/Atualização).
3. Event Bus publica eventos (TicketAssigned, MessageSaved).
4. Infra Adapters (RabbitMQ, Socket) ouvem e realizam side-effects.

---

## 3. Plano de Refatoração Incremental

### Fase 1: Isolamento do Domínio
- [ ] Criar pacotes `domain/` (entities, domain services).
- [ ] Extrair `TicketService` e `ContactService`.

### Fase 2: Camada de Use Cases
- [ ] Criar `application/usecases/`.
- [ ] Implementar Mediator Pattern.

### Fase 3: Refatoração de Controllers
- [ ] Migrar lógica de negócio dos controllers para Use Cases.

### Fase 4: Event Bus
- [ ] Criar Event Bus para desacoplar envio de eventos de IO.
- [ ] Migrar infraestrutura para adapters.

### Fase 5: Testes
- [ ] Testes unitários do domínio.
- [ ] Testes de integração de fluxos críticos.