# Documentação de Conexões do Backend

Este documento descreve detalhadamente como o Backend do projeto interage com sistemas externos, bancos de dados e serviços de mensageria.

## 1. Banco de Dados (PostgreSQL)

O sistema utiliza PostgreSQL como banco de dados relacional principal, gerenciado pelo ORM Sequelize (TypeScript).

### Configuração
*   **Arquivo:** `backend/src/config/database.ts`
*   **Variáveis de Ambiente:**
    *   `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
    *   `DB_DIALECT` (Padrão: `postgres`)
    *   `DB_USE_SSL` (Opcional para conexões seguras)
*   **Timezone:** `-03:00` (Hardcoded no config)

### Conexão e Inicialização
*   A conexão é estabelecida em `backend/src/database/index.ts`.
*   O Sequelize carrega dinamicamente todos os modelos listados no array `models` (User, Ticket, Contact, Message, etc.).
*   O sistema utiliza migrações (`sequelize-cli`) para controle de versão do esquema do banco de dados.

---

## 2. Mensageria Assíncrona (RabbitMQ)

O RabbitMQ é o backbone de comunicação entre o Backend e o Engine Standard (WhatsApp), além de processamento de fluxos e tarefas em background.

> **Nota:** Para detalhes profundos sobre filas, exchanges e routing keys, consulte a [Bíblia das Filas](../../filas/rabbitmq.md).

### Conexão
*   **Serviço:** `backend/src/services/RabbitMQService.ts`
*   **URL:** `AMQP_URL` (ex: `amqp://guest:guest@rabbitmq:5672`)
*   **Biblioteca:** `amqplib`

### Interações Principais
1.  **Publicação de Comandos (`wbot.commands`):**
    *   O Backend atua como **Produtor**, enviando comandos para o Engine.
    *   Exemplos: `message.send`, `session.start`.
    *   Routing Key: `wbot.<tenantId>.<sessionId>.<action>`

2.  **Consumo de Eventos (`wbot.events`):**
    *   O Backend atua como **Consumidor** através do `EventListener.ts`.
    *   Fila: `api.events.process` (Durable).
    *   Exemplos: `message.received`, `message.ack`, `session.qrcode`.
    *   Ação: Persiste mensagens no PostgreSQL e notifica o frontend via WebSocket.

3.  **Workers Dedicados:**
    *   **FlowWorker:** Consome da fila `flow.worker.queue` para processar passos de automação (Flowbuilder).

---

## 3. Comunicação em Tempo Real (Socket.IO)

O Socket.IO é utilizado para comunicação bidirecional em tempo real entre o Backend e o Frontend (Navegador).

### Configuração
*   **Arquivo:** `backend/src/libs/socket.ts`
*   **Porta:** Mesma porta do servidor HTTP Express (compartilhada).
*   **Autenticação:** JWT (via Query Param `token` ou Header `Authorization`). O token é verificado usando `authConfig.secret`.

### Canais (Rooms) e Eventos
O frontend pode se inscrever em diferentes canais ("rooms") para receber atualizações específicas:

| Canal (Room) | Descrição | Eventos Emitidos |
| :--- | :--- | :--- |
| `notification` | Notificações gerais do sistema | `notification` |
| `<ticketId>` | Sala específica de um ticket | `appMessage` (novas msgs), `ticket:update` |
| `open`, `pending`, `closed` | Listas de tickets por status | `ticket:update`, `ticket:create` |
| `helpdesk-kanban` | Kanban do Helpdesk | Atualizações do quadro |

### Rastreamento de Usuários Online
*   O serviço `UserOnlineService` utiliza Redis para rastrear quais usuários estão conectados.
*   Quando um socket conecta, o par `userId` -> `socketId` é salvo.

---

## 4. Cache e Sessão (Redis)

O Redis é utilizado para cache de alta performance, sessões de usuário e controle de estado do WhatsApp.

### Configuração
*   **Biblioteca:** `ioredis`
*   **URL:** `REDIS_URL` (ex: `redis://redis:6379`)

### Casos de Uso
1.  **Filas de Processamento (Bull - Legado/Auxiliar):**
    *   Embora o RabbitMQ seja o principal, o projeto pode conter vestígios ou usos específicos de Bull para filas simples de e-mail ou tarefas agendadas (verificar `src/libs/Queue.ts` se existir).
2.  **User Online Status:**
    *   Armazena status online/offline dos usuários para o chat interno.
3.  **Cache de Sessão (Engine):**
    *   O Engine utiliza Redis para armazenar o `AuthState` (chaves de criptografia) das sessões do WhatsApp, permitindo que as sessões sobrevivam a reinícios do container do Engine (pois o volume não é persistente em disco, mas sim no Redis).

---

## 5. Integração com WhatsApp (Engine Standard)

O Backend **não** se conecta diretamente aos servidores do WhatsApp. Toda a comunicação é intermediada pelo microsserviço `Engine Standard` (Whaileys).

*   **Protocolo:** RabbitMQ (AMQP).
*   **Fluxo:**
    *   Backend -> RabbitMQ -> Engine -> WhatsApp
    *   WhatsApp -> Engine -> RabbitMQ -> Backend
*   **Controle:** O Backend envia comandos de controle (Start, Stop, Restart) via filas, e o Engine reporta status (`CONNECTED`, `QRCODE`, `DISCONNECTED`) via eventos.

---

## Diagrama de Conexões

```mermaid
graph TD
    Frontend[Frontend React] <-->|Socket.IO / HTTP| Backend[Backend API]
    
    subgraph Infrastructure
        PG[(PostgreSQL)]
        Redis[(Redis)]
        RMQ[RabbitMQ]
    end
    
    subgraph External Services
        WA[WhatsApp Servers]
    end

    Backend -->|Sequelize| PG
    Backend -->|ioredis| Redis
    Backend <-->|AMQP| RMQ
    
    Engine[Engine Standard] <-->|AMQP| RMQ
    Engine -->|AuthState| Redis
    Engine <-->|WebSocket| WA
```
