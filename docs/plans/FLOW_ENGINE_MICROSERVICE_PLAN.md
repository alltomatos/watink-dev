# Plano de Implementação: Flow Engine Microservice

## 1. Objetivo
Migrar a execução de fluxos (Flow Engine) de uma arquitetura síncrona/acoplada para uma arquitetura assíncrona orientada a eventos, visando escalabilidade e resiliência.

## 2. Arquitetura Alvo

*   **Producer**: O `wbotMessageListener` (Backend) não executará mais lógica de fluxo. Ele apenas publicará mensagens na fila RabbitMQ.
*   **Queue**: `flow.execution.process` (Durable).
*   **Consumer**: Novo serviço `FlowWorkerService` que consome a fila e chama o `FlowExecutorService`.

## 3. Etapas de Implementação

### Fase 1: Infraestrutura de Mensageria (RabbitMQ)
- [ ] Criar classe `FlowQueueService` (Producer) no Backend.
- [ ] Definir topologia de filas (Exchange `flow.events` -> Queue `flow.execution.process`).

### Fase 2: Implementação do Worker (Consumer)
- [ ] Criar `FlowWorkerService` no Backend (inicialmente rodando como thread/processo paralelo no mesmo container para facilitar deploy imediato).
- [ ] Mover lógica de chamada do `FlowExecutor` para dentro do `processMessage` do Worker.

### Fase 3: Refatoração do Listener
- [ ] Alterar `wbotMessageListener.ts` para substituir chamadas diretas a `FlowExecutorService` por `FlowQueueService.add()`.

### Fase 4: Inicialização
- [ ] Atualizar `server.ts` ou `app.ts` para iniciar o `FlowWorkerService` junto com a API.

## 4. Estrutura de Mensagens (Payload)

### Evento: `whatsapp_message`
```json
{
  "id": "uuid",
  "type": "whatsapp_message",
  "tenantId": 1,
  "payload": {
    "ticketId": 105,
    "contactId": 32,
    "messageBody": "Olá, quero suporte",
    "fromMe": false,
    "isGroup": false
  }
}
```

## 5. Observações sobre Redis
*   O ambiente atual **NÃO** possui Redis configurado no `docker-compose.yaml`.
*   A implementação de Cache de Sessão será postergada para uma fase futura para não bloquear a entrega atual. O estado continuará sendo lido do PostgreSQL (`FlowSessions`).
