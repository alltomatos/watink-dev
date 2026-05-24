# Documentação da API de Referência (Pastorini API)

> **Nota:** Documentação gerada a partir da análise da API em `http://127.0.0.1:3001/docs.html`.

## Visão Geral
A API Pastorini (Powered by Baileys) oferece uma interface REST para controle de instâncias WhatsApp, incluindo envio de mensagens ricas, gestão de grupos e webhooks.

## Autenticação
- **Método**: API Key no header ou login inicial.
- **Senha Padrão**: `123456`

---

## Módulos

### 1. Instâncias (Instances)

#### Criar Instância
- **Endpoint**: `POST /api/instances`
- **Payload**:
```json
{
  "id": "minha-instancia"
}
```

#### Conectar (QR Code)
- **Endpoint**: `GET /api/instances/:id/qr`
- **Resposta**: JSON contendo `qrImage` (Base64).

---

### 2. Mensagens (Messages)

#### Enviar Texto
- **Endpoint**: `POST /api/instances/:id/send-text`
- **Payload**:
```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "text": "Olá! Esta é uma mensagem de teste."
}
```

#### Enviar Mídia (Imagem/Vídeo/Áudio)
- **Endpoint**: `POST /api/instances/:id/send-image` (ou `send-video`, `send-audio`)
- **Payload**:
```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "url": "https://exemplo.com/media.jpg",
  "caption": "Legenda da mídia"
}
```

---

### 3. Mensagens Interativas (Interactive)

#### Enviar Botões (Reply & URL)
- **Endpoint**: `POST /api/instances/:id/send-buttons`
- **Payload**:
```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "text": "Texto principal",
  "footer": "Texto do rodapé",
  "buttons": [
    {
      "type": "reply",
      "displayText": "Sim",
      "id": "btn_yes"
    },
    {
      "type": "url",
      "displayText": "Visitar Site",
      "url": "https://google.com"
    },
    {
      "type": "call",
      "displayText": "Ligar Agora",
      "phoneNumber": "5511999999999"
    }
  ]
}
```

#### Enviar Lista de Opções
- **Endpoint**: `POST /api/instances/:id/send-list`
- **Payload**:
```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "title": "Selecione uma opção",
  "text": "Descrição da lista",
  "footer": "Rodapé",
  "buttonText": "Ver Opções",
  "sections": [
    {
      "title": "Categoria 1",
      "rows": [
        {
          "title": "Opção A",
          "description": "Detalhes da opção A",
          "rowId": "opt_a"
        }
      ]
    }
  ]
}
```

#### Enviar Carrossel
- **Endpoint**: `POST /api/instances/:id/send-carousel`
- **Payload**:
```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "cards": [
    {
      "header": {
        "title": "Produto 1",
        "subtitle": "Oferta",
        "imageUrl": "https://exemplo.com/img1.jpg"
      },
      "body": "Descrição do item",
      "footer": "Preço: R$ 10,00",
      "buttons": [
        { "displayText": "Comprar", "urlButton": { "url": "https://loja.com/1" } }
      ]
    }
  ]
}
```

---

### 4. Grupos (Groups)

#### Criar Grupo
- **Endpoint**: `POST /api/instances/:id/groups/create`
- **Payload**:
```json
{
  "name": "Nome do Grupo",
  "participants": [
    "5511999999999@s.whatsapp.net",
    "5511888888888@s.whatsapp.net"
  ]
}
```

#### Gerenciar Participantes
- **Endpoint**: `POST /api/instances/:id/groups/:groupId/participants`
- **Payload**:
```json
{
  "action": "add", // ou "remove", "promote", "demote"
  "participants": ["5511999999999@s.whatsapp.net"]
}
```

---

### 5. Webhook

#### Configurar Webhook
- **Endpoint**: `POST /api/instances/:id/webhook`
- **Payload**:
```json
{
  "url": "https://seu-endpoint.com/webhook",
  "enabled": true,
  "events": ["messages", "status", "connection"]
}
```
