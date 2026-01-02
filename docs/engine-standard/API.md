# API do Engine (AMQP)

O Engine opera inteiramente via filas **RabbitMQ**, consumindo comandos e publicando eventos.

## Comandos Aceitos (Consumers)
O Engine escuta na exchange `wbot.commands` com a routing key `wbot.*.*.#`.

### 1. Envio de Mensagem de Texto
**Routing Key**: `wbot.{tenantId}.{sessionId}.message.send.text`
**Payload**:
```json
{
  "sessionId": 1,
  "to": "5511999999999@s.whatsapp.net",
  "body": "Olá, mundo!",
  "messageId": "uuid-v4"
}
```
**Processamento no Engine**:
- Recebido por `RabbitMQ.consumeCommands`.
- Despachado em `SessionManager.handleCommand`.
- Executado por `SessionManager.sendText`.
- Utiliza `session.socket.sendMessage` da lib `whaileys`.

### 2. Iniciar Sessão
**Routing Key**: `session.start`
**Payload**: `StartSessionPayload` (sessionId, force, usePairingCode).

### 3. Outros Comandos
- `session.stop`: Desconectar.
- `message.send.media`: Enviar arquivo.
- `contact.sync`: Sincronizar contato/grupo.

## Eventos Publicados (Producers)
O Engine publica na exchange `wbot.events`.

- `message.update`: Status de entrega (ack).
- `message.upsert`: Nova mensagem recebida.
- `session.status`: Alteração de estado (CONNECTED, OPENING, DISCONNECTED).
- `session.qrcode` / `session.pairingcode`: Códigos para autenticação.
