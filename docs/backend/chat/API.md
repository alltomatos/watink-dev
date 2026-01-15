# API de Chat (Backend)

## Envio de Mensagens

### Endpoint
`POST /api/messages/:ticketId`

### Fluxo de Processamento
1. **Controller** (`MessageController.store`):
   - Recebe `body` (texto) e `medias` (arquivos).
   - Identifica o Ticket (`ticketId`).
2. **Service** (`SendWhatsAppMessage` ou `SendWhatsAppMedia`):
   - Valida se o Ticket possui conexão válida (`whatsappId`).
   - Salva a mensagem no banco de dados com status `pending`.
   - Formata o corpo da mensagem (Mustache).
   - **Publica comando na fila RabbitMQ**.

### Integração com Engine (RabbitMQ)
O backend não se comunica diretamente com a API do WhatsApp. Ele delega o envio para o microsserviço `engine-standard` via fila.

**Comando Publicado**:
- Tópico: `wbot.{tenantId}.{sessionId}.message.send.text`
- Payload: `Envelope` contendo `messageId`, `body`, e `to` (número).

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below deeply to understand how the Engine consumes this command. Then, return to this exact point to continue the original analysis. -->
[Processamento de Envio no Engine](../../engine-standard/API.md)

### Retorno
Retorna o objeto `Message` criado (ainda pendente de envio real).
