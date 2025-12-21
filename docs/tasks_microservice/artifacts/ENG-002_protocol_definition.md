# ENG-002: Contrato de Interface (Protocolo)

## Objetivo

Definir as estruturas de dados (schemas) que serão trocadas entre o Backend API (Core) e os microserviços de Engine (Workers) via RabbitMQ. Este contrato garante que ambos os lados "falem a mesma língua" independentemente da linguagem de implementação (Node.js, Go, etc.).

## Estrutura do Protocolo

Todas as mensagens devem ser JSON e seguir uma estrutura envelope padrão.

### 1. Envelope Padrão

```json
{
  "id": "uuid-v4",
  "timestamp": 1678901234567,
  "tenantId": "uuid-do-tenant",
  "type": "EventType ou CommandType",
  "payload": { ... }
}
```

## Comandos (Commands) - Backend -> Engine

Enviados para o Exchange `wbot.commands`.

### 1.1 Iniciar Sessão (`session.start`)

Solicita que o Engine inicie uma sessão do WhatsApp.

**Routing Key:** `command.general` ou `command.{sessionId}`

```json
{
  "type": "session.start",
  "payload": {
    "sessionId": "integer-id-do-whatsapp",
    "sessionToken": "string-token-wwebjs-auth" // Opcional, se já existir
  }
}
```

### 1.2 Enviar Mensagem de Texto (`message.send.text`)

**Routing Key:** `command.{sessionId}`

```json
{
  "type": "message.send.text",
  "payload": {
    "sessionId": 1,
    "to": "5511999999999@c.us", // ou g.us para grupos
    "body": "Olá, tudo bem?",
    "options": {
      "quotedMsgId": "id-da-mensagem-citada" // Opcional
    }
  }
}
```

### 1.3 Enviar Mídia (`message.send.media`)

**Routing Key:** `command.{sessionId}`

```json
{
  "type": "message.send.media",
  "payload": {
    "sessionId": 1,
    "to": "5511999999999@c.us",
    "media": {
      "mimetype": "image/jpeg",
      "filename": "foto.jpg",
      "data": "base64-string..." 
    },
    "caption": "Veja esta foto!"
  }
}
```

## Eventos (Events) - Engine -> Backend

Enviados para o Exchange `wbot.events`.

### 2.1 QR Code Gerado (`session.qrcode`)

**Routing Key:** `wbot.{tenantId}.{sessionId}.session.qrcode`

```json
{
  "type": "session.qrcode",
  "payload": {
    "sessionId": 1,
    "qrcode": "string-do-qrcode",
    "attempt": 1
  }
}
```

### 2.2 Status da Sessão Alterado (`session.status`)

**Routing Key:** `wbot.{tenantId}.{sessionId}.session.status`

```json
{
  "type": "session.status",
  "payload": {
    "sessionId": 1,
    "status": "CONNECTED" | "DISCONNECTED" | "QRCODE" | "OPENING"
  }
}
```

### 2.3 Mensagem Recebida (`message.received`)

**Routing Key:** `wbot.{tenantId}.{sessionId}.message.received`

```json
{
  "type": "message.received",
  "payload": {
    "sessionId": 1,
    "message": {
      "id": "id-da-mensagem-wbot",
      "from": "5511999999999@c.us",
      "to": "5511888888888@c.us",
      "body": "Texto da mensagem",
      "fromMe": false,
      "isGroup": false,
      "type": "chat", // chat, image, video, ppt, etc.
      "timestamp": 1678901234,
      "hasMedia": false
    }
  }
}
```

### 2.4 Confirmação de Leitura/Entrega (`message.ack`)

**Routing Key:** `wbot.{tenantId}.{sessionId}.message.ack`

```json
{
  "type": "message.ack",
  "payload": {
    "sessionId": 1,
    "messageId": "id-da-mensagem-wbot",
    "ack": 1 // 1: Sent, 2: Received, 3: Read, 4: Played
  }
}
```
