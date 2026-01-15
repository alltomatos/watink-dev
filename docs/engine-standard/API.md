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
  "messageId": "uuid-v4",
  "options": {
     "quoted": { ... } // Opcional
  }
}
```

### 2. Envio de Mídia
**Routing Key**: `wbot.{tenantId}.{sessionId}.message.send.media`
**Payload**:
```json
{
  "sessionId": 1,
  "to": "5511999999999@s.whatsapp.net",
  "caption": "Legenda da foto",
  "mentions": ["551188888888@s.whatsapp.net"], // Array de JIDs mencionados
  "media": {
    "mimetype": "image/jpeg",
    "filename": "foto.jpg",
    "data": "base64_string..."
  },
  "messageId": "uuid-v4",
  "options": {
     "quoted": { ... }
  }
}
```

### 3. Envio de Botões (Template/Simple)
**Routing Key**: `wbot.{tenantId}.{sessionId}.message.send.buttons`
**Payload**:
```json
{
  "sessionId": 1,
  "to": "5511999999999@s.whatsapp.net",
  "text": "Título",
  "footer": "Rodapé",
  "mentions": ["551188888888@s.whatsapp.net"],
  "buttons": [
    {
      "buttonId": "id_1",
      "buttonText": "Opção 1"
    }
  ],
  "messageId": "uuid-v4",
  "options": {
     "quoted": { ... }
  }
}
```

### 4. Envio de Botão Interativo (URL)
**Routing Key**: `wbot.{tenantId}.{sessionId}.message.send.interactive`
**Payload**:
```json
{
  "sessionId": 1,
  "to": "5511999999999@s.whatsapp.net",
  "content": {
    "text": "Corpo da mensagem",
    "footer": "Rodapé da mensagem",
    "buttons": [
      {
        "index": 1,
        "urlButton": {
          "displayText": "Texto do Botão",
          "url": "https://exemplo.com"
        }
      }
    ]
  },
  "messageId": "uuid-v4"
}
```

### 5. Iniciar Sessão
**Routing Key**: `session.start`
**Payload**: `StartSessionPayload` (sessionId, force, usePairingCode).

### 6. Outros Comandos
- `session.stop`: Desconectar.
- `contact.sync`: Sincronizar contato/grupo.

## Eventos Publicados (Producers)
O Engine publica na exchange `wbot.events`.

- `message.update`: Status de entrega (ack).
- `message.upsert`: Nova mensagem recebida.
- `session.status`: Alteração de estado (CONNECTED, OPENING, DISCONNECTED).
- `session.qrcode` / `session.pairingcode`: Códigos para autenticação.
