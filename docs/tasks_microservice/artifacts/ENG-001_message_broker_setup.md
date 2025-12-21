# ENG-001: Configuração do Message Broker (RabbitMQ)

## Visão Geral

Para permitir a escalabilidade horizontal e desacoplar o motor de WhatsApp (Engine) do núcleo da aplicação (Backend API), utilizaremos uma arquitetura orientada a eventos. O **RabbitMQ** foi escolhido como Message Broker devido à sua robustez, suporte a padrões complexos de roteamento e maturidade.

## Topologia de Filas e Exchanges

A comunicação será baseada no padrão **Exchange -> Queue**.

### Exchanges (Roteadores)

1.  **`wbot.events` (Topic Exchange)**
    *   **Propósito:** Distribuir eventos gerados pelo Engine (mensagens recebidas, status de conexão, QR code).
    *   **Routing Keys:** `wbot.{tenantId}.{sessionId}.{eventType}`
    *   **Consumidores:** Backend API (para persistir mensagens e enviar via WebSocket).

2.  **`wbot.commands` (Direct Exchange)**
    *   **Propósito:** Enviar comandos do Backend API para o Engine (enviar mensagem, desconectar, iniciar sessão).
    *   **Routing Keys:** `command.{sessionId}` (para rotear para o worker específico que detém a sessão) ou `command.general` (para qualquer worker disponível).

### Filas (Queues)

1.  **`api.events.process`**
    *   **Binding:** `wbot.events` -> `wbot.*.*.message.upsert` (Exemplo)
    *   **Consumidor:** Backend API (Service de processamento de mensagens).

2.  **`engine.session.{sessionId}`** (Fila Exclusiva/Temporária)
    *   **Binding:** `wbot.commands` -> `command.{sessionId}`
    *   **Consumidor:** Container do Engine responsável pela sessão específica.

## Configuração da Infraestrutura

### Docker Compose

Serviço adicionado: `rabbitmq`

*   **Imagem:** `rabbitmq:3-management-alpine`
*   **Portas:**
    *   `5672`: Protocolo AMQP (Comunicação entre serviços).
    *   `15672`: Interface de Gerenciamento (Dashboard Web).
*   **Persistência:** Volume `rabbitmq_data` para garantir que mensagens não processadas sobrevivam a reinícios.

### Variáveis de Ambiente (Backend)

*   `AMQP_URL`: String de conexão (ex: `amqp://***REMOVED_AMQP_CREDENTIALS***@rabbitmq:5672`)

## Próximos Passos (ENG-002 e ENG-003)

1.  Definir o contrato JSON (Protocolo) exato das mensagens.
2.  Implementar o "Producer" no Backend API (para enviar comandos).
3.  Criar o microserviço do Engine que consome esses comandos.
