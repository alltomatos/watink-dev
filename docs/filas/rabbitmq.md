# Documentação do RabbitMQ (A Bíblia das Filas)

Este documento detalha a arquitetura de mensageria do projeto Watink, documentando Exchanges, Filas, Routing Keys e os fluxos de mensagens entre os microsserviços (Backend e Engine Standard).

## Visão Geral

O sistema utiliza o RabbitMQ como backbone de comunicação assíncrona para garantir desacoplamento, resiliência e escalabilidade. A comunicação é dividida principalmente em **Comandos** (Ações solicitadas) e **Eventos** (Notificações de ocorrências).

### Conexão

*   **URL:** Definida pela variável de ambiente `AMQP_URL` (ex: `amqp://guest:guest@rabbitmq:5672`).
*   **Biblioteca:** `amqplib` (Node.js).

---

## Exchanges

O sistema utiliza dois **Topic Exchanges** principais. Ambos são configurados como `durable: true`.

| Nome | Tipo | Descrição |
| :--- | :--- | :--- |
| `wbot.commands` | topic | Utilizado para enviar comandos do Backend para o Engine (ou outros workers). |
| `wbot.events` | topic | Utilizado pelo Engine para publicar eventos (mensagens recebidas, status) para o Backend. |

---

## Filas (Queues)

Todas as filas são configuradas como `durable: true` para garantir persistência em caso de reinício do RabbitMQ.

### 1. `wbot_engine_commands`
*   **Consumidor:** `Engine Standard` (Serviço de conexão com WhatsApp).
*   **Exchange de Origem:** `wbot.commands`
*   **Routing Keys (Bindings):**
    *   `command.general`: Comandos gerais do sistema.
    *   `wbot.*.*.#`: Captura todos os comandos direcionados a sessões específicas.
*   **Padrão de Routing Key:** `wbot.<tenantId>.<sessionId>.<commandType>`
*   **Função:** Recebe solicitações para iniciar sessões, enviar mensagens, enviar mídia, etc.

### 2. `api.events.process`
*   **Consumidor:** `Backend` (Serviço principal da API).
*   **Exchange de Origem:** `wbot.events`
*   **Routing Keys (Bindings):**
    *   `wbot.*.*.session.qrcode`: Atualizações de QR Code.
    *   `wbot.*.*.session.pairingcode`: Códigos de pareamento.
    *   `wbot.*.*.session.status`: Mudanças de status da conexão (CONNECTED, DISCONNECTED).
    *   `wbot.*.*.message.received`: Novas mensagens recebidas do WhatsApp.
    *   `wbot.*.*.message.reaction`: Reações a mensagens.
    *   `wbot.*.*.contact.update`: Atualizações de perfil de contatos.
    *   `wbot.*.*.message.ack`: Confirmações de envio/leitura (ACKs).
    *   `wbot.*.*.message.revoke`: Mensagens apagadas.
*   **Função:** Processa todos os eventos gerados pelo Engine para persistência no banco de dados e notificação via WebSocket (Socket.IO).

### 3. `flow.worker.queue`
*   **Consumidor:** `Backend (FlowWorkerService)` (Worker dedicado a fluxos).
*   **Exchange de Origem:** `wbot.commands`
*   **Routing Keys (Bindings):**
    *   `flow.execution.*`: Comandos relacionados à execução de fluxos de automação.
*   **Função:** Processa passos de fluxos de automação (Flowbuilder) de forma assíncrona para não bloquear o event loop principal da API.

### 4. `api.commands.process`
*   **Consumidor:** `Backend (CommandListener)`.
*   **Exchange de Origem:** `wbot.commands`
*   **Routing Keys (Bindings):**
    *   *(Atualmente sem bindings ativos por padrão, reservado para expansão)*.
*   **Função:** Permite que o Backend processe comandos específicos que podem ser reencaminhados ou necessitem de processamento interno assíncrono.

---

## Estrutura das Mensagens (Envelope)

Todas as mensagens trafegadas seguem a interface `Envelope`:

```typescript
interface Envelope {
  id: string;        // UUID v4 da mensagem
  timestamp: number; // Timestamp em milissegundos
  tenantId: string | number;
  type: string;      // Tipo do comando ou evento (ex: "message.send", "message.received")
  payload: any;      // Dados específicos da mensagem
}
```

---

## Tipos de Mensagens (Routing Key Patterns)

A estrutura das Routing Keys segue o padrão: `wbot.<tenantId>.<sessionId>.<action>`

### Comandos (Backend -> Engine)

| Tipo (`type`) | Routing Key Suffix | Descrição |
| :--- | :--- | :--- |
| `session.start` | `session.start` | Iniciar uma sessão do WhatsApp. |
| `message.send` | `message.send` | Enviar mensagem de texto. |
| `message.send.media` | `message.send.media` | Enviar imagem, vídeo, áudio ou documento. |
| `message.send.buttons` | `message.send.buttons` | Enviar mensagem com botões. |
| `message.send.list` | `message.send.list` | Enviar mensagem de lista. |
| `message.send.poll` | `message.send.poll` | Enviar enquete. |
| `contact.sync` | `contact.sync` | Solicitar sincronização de contatos (processado pelo Engine). |

### Eventos (Engine -> Backend)

| Tipo (`type`) | Routing Key Suffix | Descrição |
| :--- | :--- | :--- |
| `session.qrcode` | `session.qrcode` | Novo QR Code gerado para leitura. |
| `session.status` | `session.status` | Status da conexão alterado (ex: QRCODE, CONNECTED). |
| `message.received` | `message.received` | Mensagem recebida de um contato. |
| `message.ack` | `message.ack` | Atualização de status de entrega (Enviado, Recebido, Lido). |
| `contact.update` | `contact.update` | Dados de contato atualizados (foto, nome). |

---

## Fluxos de Exemplo

### 1. Envio de Mensagem (API -> WhatsApp)
1.  **API:** Recebe requisição POST `/messages`.
2.  **Backend:** Salva mensagem no DB com status `pending`.
3.  **Backend:** Publica comando no Exchange `wbot.commands` com routing key `wbot.1.10.message.send`.
4.  **RabbitMQ:** Roteia para fila `wbot_engine_commands`.
5.  **Engine:** Consome mensagem, localiza sessão 10.
6.  **Engine:** Envia para servidores do WhatsApp via WebSocket.
7.  **Engine:** Publica evento `message.ack` (status `sended`) no Exchange `wbot.events`.
8.  **RabbitMQ:** Roteia para fila `api.events.process`.
9.  **Backend:** Consome evento e atualiza status no DB para `sended`.

### 2. Recebimento de Mensagem (WhatsApp -> API)
1.  **Engine:** Recebe pacote do WhatsApp via WebSocket.
2.  **Engine:** Normaliza dados e publica evento `message.received` no Exchange `wbot.events`.
3.  **RabbitMQ:** Roteia para fila `api.events.process`.
4.  **Backend:** Consome evento.
5.  **Backend:** Encontra ou cria Ticket e Contato.
6.  **Backend:** Salva Mensagem no DB.
7.  **Backend:** Emite evento via Socket.IO para o Frontend.

---

## Boas Práticas e Manutenção

1.  **Durabilidade:** Sempre use `durable: true` para filas e exchanges críticos.
2.  **Tratamento de Erros:** Consumidores devem usar `ack` apenas após processamento com sucesso. Em caso de erro recuperável, usar `nack` com requeue (com cuidado para não criar loops infinitos) ou Dead Letter Queues (DLQ).
3.  **Idempotência:** O Backend deve estar preparado para processar a mesma mensagem mais de uma vez (ex: verificar se ID da mensagem já existe antes de inserir).
4.  **Monitoramento:** Monitorar o tamanho das filas. O acúmulo de mensagens em `wbot_engine_commands` indica que o Engine está desconectado ou sobrecarregado.
