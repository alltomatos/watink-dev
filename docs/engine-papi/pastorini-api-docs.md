# Pastorini API - Documentação v1.6

> Autor: Matheus Pastorini
> Exportado em: 31/01/2026, 07:05:54

---

## 📑 Índice

1. [Pastorini API - A Mais Completa do Mercado](#pastorini-api-a-mais-completa-do-mercado)
2. [Todos os Recursos](#todos-os-recursos)
3. [Por que Escolher a Pastorini API](#por-que-escolher-a-pastorini-api)
4. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
5. [Instalação](#instala-o)
6. [Respostas Padronizadas v1.6](#respostas-padronizadas-v1-6)
7. [Instâncias](#inst-ncias)
8. [Webhook](#webhook)
9. [WebSocket NOVO](#websocket-novo)
10. [Configurações da Instância ATUALIZADO](#configura-es-da-inst-ncia-atualizado)
11. [Configuração](#configura-o)
12. [Mensagens](#mensagens)
13. [Mensagens Interativas](#mensagens-interativas)
14. [Catálogo de Produtos](#cat-logo-de-produtos)
15. [Grupos](#grupos)
16. [Perfil](#perfil)
17. [Privacidade](#privacidade)
18. [Outros](#outros)
19. [Informações Importantes](#informa-es-importantes)
20. [SMS](#sms)
21. [Proxy](#proxy)
22. [Status do Servidor](#status-do-servidor)
23. [Fila de Mensagens](#fila-de-mensagens)
24. [Templates Prontos](#templates-prontos)
25. [Integração Typebot NOVO](#integra-o-typebot-novo)
26. [Integração Chatwoot NOVO](#integra-o-chatwoot-novo)
27. [PowerTools IA - Agentes Inteligentes PRO](#powertools-ia-agentes-inteligentes-pro)
28. [Central de Ligações VoIP PRO](#central-de-liga-es-voip-pro)
29. [Disparo de Ligações PRO](#disparo-de-liga-es-pro)
30. [Envio de SMS PRO](#envio-de-sms-pro)

---

## Pastorini API - A Mais Completa do Mercado

Cards deslizantes com imagens, títulos e botões interativos. Perfeito para catálogos, produtos e apresentações. Nenhuma outra API oferece!

## Todos os Recursos

## Por que Escolher a Pastorini API

⚠️ = Parcial/Básico | ❌ = Não disponível | ✅ = Completo

## Arquitetura e Tecnologias

Runtime

## Instalação

### `DOCKER` Docker Swarm / Portainer

Deploy completo com PostgreSQL, Redis e API usando Docker Swarm. Ideal para produção.

**Exemplo:**

```json
version: '3.8'

services:
  # PostgreSQL - Banco de dados
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pastorini_api
      POSTGRES_USER: pastorini
      POSTGRES_PASSWORD: SUA_SENHA_SEGURA
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"  # Use 5433 se já tiver PostgreSQL na 5432
    networks:
      - pastorini-net
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # Redis - Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - pastorini-net
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # Pastorini API - WhatsApp API
  api:
    image: SEU_USUARIO/pastorini-api:latest
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PANEL_API_KEY=SUA_CHAVE_PAINEL  # Deixe vazio para desativar
      - STORAGE_TYPE=postgres+redis
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=pastorini_api
      - POSTGRES_USER=pastorini
      - POSTGRES_PASSWORD=SUA_SENHA_SEGURA
      - POSTGRES_SSL=false
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - LICENSE_KEY=SUA_CHAVE_LICENCA
    volumes:
      - api_sessions:/app/sessions
      - api_media:/app/Media
    ports:
      - "3000:3000"
    networks:
      - pastorini-net
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

volumes:
  postgres_data:
  redis_data:
  api_sessions:
  api_media:

networks:
  pastorini-net:
    driver: overlay
    attachable: true
```

---

### `ENV` Variáveis de Ambiente

Todas as variáveis de ambiente disponíveis para configuração:

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `PORT` | Porta do servidor | 3000 |
| `PANEL_API_KEY` | Chave para proteger acesso ao painel web | vazio (desativado) |
| `STORAGE_TYPE` | Tipo de armazenamento: file, postgres, postgres+redis | file |
| `POSTGRES_HOST` | Host do PostgreSQL | localhost |
| `POSTGRES_PORT` | Porta do PostgreSQL | 5432 |
| `POSTGRES_DB` | Nome do banco de dados | pastorini_api |
| `POSTGRES_USER` | Usuário do PostgreSQL | postgres |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | - |
| `REDIS_HOST` | Host do Redis | localhost |
| `REDIS_PORT` | Porta do Redis | 6379 |
| `LICENSE_KEY` | Chave de licença para ativação do servidor | - |

---

### `🔐` Proteção do Painel

O painel web pode ser protegido com uma chave de acesso (API Key). Quando configurada, os usuários precisam informar a chave para acessar.

**Exemplo:**

```json
# No docker-stack.yml ou .env
PANEL_API_KEY=minha-chave-secreta-123

# Para desativar a proteção, deixe vazio:
PANEL_API_KEY=
```

---

### `🔑` Autenticação da API (x-api-key)

Quando PANEL_API_KEY está configurada, todas as rotas da API (exceto algumas públicas) requerem autenticação. A mesma chave usada para acessar o painel é usada para autenticar as requisições da API.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `Header x-api-key` | x-api-key: SUA_CHAVE | ✓ Sim |
| `Header Authorization` | Authorization: Bearer SUA_CHAVE | ✓ Sim |
| `Query Parameter` | ?key=SUA_CHAVE | ⚠ Não (expõe na URL) |

**Exemplo:**

```json
# Usando header x-api-key (recomendado)
curl -X GET "https://seu-servidor.com/api/instances" \
  -H "x-api-key: SUA_CHAVE"

# Usando Authorization Bearer
curl -X GET "https://seu-servidor.com/api/instances" \
  -H "Authorization: Bearer SUA_CHAVE"

# Enviando mensagem com autenticação
curl -X POST "https://seu-servidor.com/api/instances/minha-instancia/send-text" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE" \
  -d '{"jid": "5511999999999@s.whatsapp.net", "text": "Olá!"}'
```

---

## Respostas Padronizadas v1.6

### `📋` Formato de Resposta dos Envios

Todos os endpoints de envio de mensagens agora retornam respostas padronizadas com informações detalhadas sobre o envio, incluindo o ID da mensagem para rastreamento.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `success` | boolean | Sempre true quando o envio foi bem-sucedido |
| `messageId` | string | ID único da mensagem no WhatsApp (use para rastrear, reagir, editar ou deletar) |
| `remoteJid` | string | JID do destinatário (pode ser diferente do enviado se foi normalizado) |
| `timestamp` | number | Timestamp Unix do momento do envio |

**Exemplo:**

```json
{
  "success": true,
  "messageId": "3EB0B430F7A4D8C1E2F3",
  "remoteJid": "5511999999999@s.whatsapp.net",
  "timestamp": 1703847600
}
```

---

### `🔍` Validação Automática de Número

Todos os endpoints de envio agora validam automaticamente se o número existe no WhatsApp antes de enviar. Isso evita envios para números inválidos e retorna erro 400 imediatamente.

**Exemplo:**

```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "text": "Olá!",
  "validateNumber": false
}
```

---

### `📝` Endpoints Atualizados

Os seguintes endpoints agora retornam o formato padronizado com messageId:

---

## Instâncias

### `GET` /api/instances

Lista todas as instâncias criadas com seus status atuais.

**Exemplo:**

```json
// Resposta
[
  {
    "id": "minha-instancia",
    "status": "CONNECTED",
    "name": "João Silva",
    "phoneNumber": "5511999999999"
  }
]
```

---

### `POST` /api/instances

Cria uma nova instância do WhatsApp. Após criar, use o endpoint de QR Code para conectar.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `id *obrigatório` | string | Identificador único da instância |

**Exemplo:**

```json
// Requisição
{
  "id": "minha-instancia"
}

// Resposta
{
  "id": "minha-instancia",
  "status": "CONNECTING"
}
```

---

### `GET` /api/instances/:id/qr

Obtém o QR Code para conectar a instância ao WhatsApp.

**Exemplo:**

```json
// Resposta
{
  "qrImage": "data:image/png;base64,..."
}
```

---

### `GET` /api/instances/:id/status

Obtém o status detalhado de uma instância específica.

**Exemplo:**

```json
// Resposta
{
  "id": "minha-instancia",
  "status": "CONNECTED",
  "name": "João Silva",
  "phoneNumber": "5511999999999"
}
```

---

### `DELETE` /api/instances/:id

Remove uma instância e desconecta do WhatsApp.

**Exemplo:**

```json
// Resposta
{
  "success": true
}
```

---

### `POST` /api/instances/:id/toggle-public-link

Habilita ou desabilita o link público de QR Code. Quando habilitado, você pode compartilhar um link para que clientes escaneiem o QR Code diretamente.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `enabled *obrigatório` | boolean | true para habilitar, false para desabilitar |

**Exemplo:**

```json
// Requisição
{
  "enabled": true
}

// Resposta
{
  "success": true,
  "enabled": true
}

// Link público para compartilhar:
https://seu-servidor.com/qr-client.html?id=minha-instancia
```

---

### `GET` /api/instances/:id/public-status

Obtém o status da instância para uso público (página de QR do cliente). Só funciona se o link público estiver habilitado.

**Exemplo:**

```json
// Resposta (link habilitado)
{
  "id": "minha-instancia",
  "status": "QR_READY",
  "qr": "2@abc123...",
  "publicLinkEnabled": true
}

// Resposta (link desabilitado)
{
  "error": "Public link disabled"
}
```

---

### `POST` /api/instances/:id/logout

Desconecta a instância do WhatsApp sem deletar os dados da sessão.

**Exemplo:**

```json
// Resposta
{
  "success": true
}
```

---

### `GET` /api/instances/:id/check-number/:phone

Verifica se um número de telefone está registrado no WhatsApp.

**Exemplo:**

```json
// Exemplo: GET /api/instances/minha-instancia/check-number/5511999999999

// Resposta (número existe)
{
  "exists": true,
  "jid": "5511999999999@s.whatsapp.net"
}

// Resposta (número não existe)
{
  "exists": false,
  "jid": null
}
```

---

## Webhook

### `POST` /api/instances/:id/webhook

Configura o webhook para receber mensagens e eventos em tempo real. Quando uma mensagem é recebida, ela será enviada para a URL configurada.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `url *obrigatório` | string | URL que receberá os eventos (POST) |
| `enabled *obrigatório` | boolean | Habilitar ou desabilitar o webhook |
| `events` | array | Eventos para receber: ["messages", "status", "all"] |

**Exemplo:**

```json
// Requisição
{
  "url": "https://seu-servidor.com/webhook",
  "enabled": true,
  "events": ["messages", "status"]
}

// Resposta
{
  "success": true,
  "webhook": {
    "url": "https://seu-servidor.com/webhook",
    "enabled": true,
    "events": ["messages", "status"]
  }
}
```

---

### `GET` /api/instances/:id/webhook

Obtém a configuração atual do webhook.

**Exemplo:**

```json
// Resposta
{
  "webhook": {
    "url": "https://seu-servidor.com/webhook",
    "enabled": true,
    "events": ["messages", "status"]
  }
}
```

---

### `GET` Eventos Disponíveis

Lista de todos os eventos que podem ser configurados no webhook:

**Exemplo:**

```json
Content-Type: application/json
X-Instance-ID: minha-instancia
X-Event-Type: messages | message_status | message_reaction | group_update | ...
```

---

## WebSocket NOVO

### `POST` /api/instances/:id/websocket

Configura o WebSocket para receber eventos em tempo real. Similar ao webhook, mas usando conexão persistente WebSocket.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `url *obrigatório` | string | URL do servidor WebSocket (ws:// ou wss://) |
| `enabled *obrigatório` | boolean | Habilitar ou desabilitar o WebSocket |
| `events` | string[] | Lista de eventos para receber (mesmos do webhook) |

**Exemplo:**

```json
// Requisição
{
  "url": "wss://seu-servidor.com/ws",
  "enabled": true,
  "events": ["messages", "connection", "qr"]
}

// Resposta
{
  "success": true,
  "websocket": {
    "url": "wss://seu-servidor.com/ws",
    "enabled": true,
    "events": ["messages", "connection", "qr"]
  }
}
```

---

### `GET` /api/instances/:id/websocket

Obtém a configuração atual do WebSocket.

**Exemplo:**

```json
// Resposta
{
  "websocket": {
    "url": "wss://seu-servidor.com/ws",
    "enabled": true,
    "events": ["messages", "connection"]
  }
}
```

---

## Configurações da Instância ATUALIZADO

### `POST` /api/instances/:id/settings

Configura comportamentos automáticos da instância como rejeitar chamadas, ignorar grupos, ignorar canais/newsletters, etc.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `rejectCalls` | boolean | Rejeitar todas as chamadas automaticamente |
| `ignoreGroups` | boolean | Ignorar todas as mensagens de grupos (@g.us) |
| `ignoreNewsletters` | boolean | Ignorar mensagens de canais/newsletters (@newsletter, @broadcast) |
| `alwaysOnline` | boolean | Permanecer sempre online |
| `readMessages` | boolean | Marcar todas as mensagens como lidas automaticamente |
| `readStatus` | boolean | Visualizar todos os status automaticamente |
| `syncFullHistory` | boolean | Sincronizar histórico completo ao conectar |

**Exemplo:**

```json
// Requisição
{
  "rejectCalls": true,
  "ignoreGroups": false,
  "ignoreNewsletters": true,
  "alwaysOnline": true,
  "readMessages": true,
  "readStatus": false,
  "syncFullHistory": true
}

// Resposta
{
  "success": true,
  "settings": {
    "rejectCalls": true,
    "ignoreGroups": false,
    "ignoreNewsletters": true,
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": false,
    "syncFullHistory": true
  }
}
```

---

### `GET` /api/instances/:id/settings

Obtém as configurações atuais da instância.

**Exemplo:**

```json
// Resposta
{
  "settings": {
    "rejectCalls": false,
    "ignoreGroups": false,
    "ignoreNewsletters": false,
    "alwaysOnline": false,
    "readMessages": false,
    "readStatus": false,
    "syncFullHistory": true
  }
}
```

---

## Configuração

### `GET` Storage (PostgreSQL + Redis)

A Pastorini API suporta 3 tipos de armazenamento para sessões, configuráveis via variáveis de ambiente:

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `file` | Armazena sessões em arquivos no disco | Desenvolvimento, até 50 instâncias |
| `postgres` | Armazena sessões no PostgreSQL | Produção, 50-500 instâncias |
| `postgres+redis` | PostgreSQL + Redis como cache | Alta escala, 500+ instâncias |

**Exemplo:**

```json
# Variáveis de ambiente (.env)

# Tipo de storage: file | postgres | postgres+redis
STORAGE_TYPE=postgres+redis

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pastorini_api
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha

# Redis (apenas para postgres+redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## Mensagens

### `POST` /api/instances/:id/send-text

Envia uma mensagem de texto simples. Valida automaticamente se o número existe no WhatsApp.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário (ex: 5511999999999@s.whatsapp.net) |
| `text *obrigatório` | string | Texto da mensagem |
| `validateNumber` | boolean | Validar se número existe no WhatsApp (padrão: true) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "text": "Olá! Esta é uma mensagem de teste."
}

// Resposta de Sucesso (200)
{
  "success": true,
  "messageId": "3EB0B430F7A4D8C1E2F3",
  "remoteJid": "5511999999999@s.whatsapp.net",
  "timestamp": 1703847600
}

// Erro: Número não existe no WhatsApp (400)
{
  "success": false,
  "error": "Number not registered on WhatsApp",
  "number": "5511999999999"
}
```

---

### `POST` /api/instances/:id/send-image

Envia uma imagem com legenda opcional. Aceita URL ou base64.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `url` | string | URL da imagem (obrigatório se não usar base64) |
| `base64` | string | Imagem em base64 (obrigatório se não usar url) |
| `caption` | string | Legenda da imagem |
| `mimetype` | string | Tipo MIME (padrão: image/jpeg) |
| `validateNumber` | boolean | Validar se número existe no WhatsApp (padrão: true) |

**Exemplo:**

```json
// Requisição com URL
{
  "jid": "5511999999999@s.whatsapp.net",
  "url": "https://exemplo.com/imagem.jpg",
  "caption": "Veja esta imagem!"
}

// Resposta de Sucesso (200)
{
  "success": true,
  "messageId": "3EB0B430F7A4D8C1E2F3",
  "remoteJid": "5511999999999@s.whatsapp.net",
  "timestamp": 1703847600
}
```

---

### `POST` /api/instances/:id/send-video

Envia um vídeo com legenda opcional. Aceita URL ou base64.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `url` | string | URL do vídeo (obrigatório se não usar base64) |
| `base64` | string | Vídeo em base64 (obrigatório se não usar url) |
| `caption` | string | Legenda do vídeo |
| `gifPlayback` | boolean | Enviar como GIF (loop) |
| `mimetype` | string | Tipo MIME (padrão: video/mp4) |
| `validateNumber` | boolean | Validar se número existe no WhatsApp (padrão: true) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "url": "https://exemplo.com/video.mp4",
  "caption": "Confira este vídeo!",
  "gifPlayback": false
}

// Resposta de Sucesso (200)
{
  "success": true,
  "messageId": "3EB0B430F7A4D8C1E2F3",
  "remoteJid": "5511999999999@s.whatsapp.net",
  "timestamp": 1703847600
}
```

---

### `POST` /api/instances/:id/send-audio

Envia um áudio (pode ser como mensagem de voz). Aceita URL ou base64.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `url` | string | URL do áudio (obrigatório se não usar base64) |
| `base64` | string | Áudio em base64 (obrigatório se não usar url) |
| `ptt` | boolean | Enviar como mensagem de voz (push-to-talk) |
| `mimetype` | string | Tipo MIME (padrão: audio/mpeg ou audio/ogg se ptt=true) |
| `validateNumber` | boolean | Validar se número existe no WhatsApp (padrão: true) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "url": "https://exemplo.com/audio.mp3",
  "ptt": true
}

// Resposta de Sucesso (200)
{
  "success": true,
  "messageId": "3EB0B430F7A4D8C1E2F3",
  "remoteJid": "5511999999999@s.whatsapp.net",
  "timestamp": 1703847600
}
```

---

### `POST` /api/instances/:id/send-document

Envia um documento (PDF, DOC, etc).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `url *obrigatório` | string | URL do documento |
| `filename` | string | Nome do arquivo |
| `mimetype` | string | Tipo MIME (ex: application/pdf) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "url": "https://exemplo.com/documento.pdf",
  "filename": "Contrato.pdf",
  "mimetype": "application/pdf"
}
```

---

### `POST` /api/instances/:id/send-location

Envia uma localização.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `latitude *obrigatório` | number | Latitude |
| `longitude *obrigatório` | number | Longitude |
| `name` | string | Nome do local |
| `address` | string | Endereço |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "name": "São Paulo",
  "address": "Av. Paulista, 1000"
}
```

---

### `POST` /api/instances/:id/send-contact

Envia um cartão de contato.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `name *obrigatório` | string | Nome do contato |
| `phone *obrigatório` | string | Telefone do contato |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "name": "Maria Silva",
  "phone": "+5511988888888"
}
```

---

### `POST` /api/instances/:id/send-sticker

Envia um sticker/figurinha.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `url *obrigatório` | string | URL do sticker (WebP) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "url": "https://exemplo.com/sticker.webp"
}
```

---

### `POST` /api/instances/:id/send-reaction

Envia uma reação (emoji) a uma mensagem.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | JID do chat |
| `messageId *obrigatório` | string | ID da mensagem para reagir |
| `emoji *obrigatório` | string | Emoji da reação (vazio para remover) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "messageId": "3EB0B430A...",
  "emoji": "👍"
}
```

---

## Mensagens Interativas

### `POST` /api/instances/:id/send-buttons

Envia uma mensagem com botões interativos. ✅ Funciona em Web, iOS e Android!

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `text *obrigatório` | string | Texto principal da mensagem |
| `footer` | string | Texto do rodapé |
| `buttons *obrigatório` | array | Array de botões (ver tipos abaixo) |

**Exemplo:**

```json
// Botão de Resposta Rápida (quick_reply)
{
  "type": "quick_reply",
  "displayText": "Sim",
  "id": "btn_sim"
}

// Botão de URL (cta_url)
{
  "type": "cta_url",
  "displayText": "Visitar Site",
  "url": "https://google.com"
}

// Botão de Ligação (cta_call)
{
  "type": "cta_call",
  "displayText": "Ligar",
  "phoneNumber": "+5511999999999"
}

// Botão de Copiar Código - PIX, Cupom, etc (cta_copy)
{
  "type": "cta_copy",
  "displayText": "📋 Copiar Código PIX",
  "copyCode": "00020126580014br.gov.bcb.pix..."
}
```

---

### `POST` /api/instances/:id/send-list

Envia uma mensagem com lista de opções. ✅ Funciona em Web, iOS e Android!

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `title` | string | Título da mensagem |
| `text *obrigatório` | string | Texto principal |
| `footer` | string | Texto do rodapé |
| `buttonText *obrigatório` | string | Texto do botão que abre a lista |
| `sections *obrigatório` | array | Seções com opções da lista |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "title": "Menu Principal",
  "text": "Selecione uma opção abaixo:",
  "footer": "Atendimento 24h",
  "buttonText": "Ver Opções",
  "sections": [
    {
      "title": "Produtos",
      "rows": [
        { "title": "Produto A", "description": "Descrição do produto A", "rowId": "prod_a" },
        { "title": "Produto B", "description": "Descrição do produto B", "rowId": "prod_b" }
      ]
    },
    {
      "title": "Suporte",
      "rows": [
        { "title": "Falar com Atendente", "description": "Atendimento humano", "rowId": "human" }
      ]
    }
  ]
}
```

---

### `POST` /api/instances/:id/send-carousel

Envia um carrossel de cards com imagens e botões. Nota: Funciona apenas no celular.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `cards *obrigatório` | array | Array de cards (máximo 10) |

**Exemplo:**

```json
// Requisição
{
  "jid": "5511999999999@s.whatsapp.net",
  "title": "🛍️ Ofertas Especiais",
  "body": "Confira nossos produtos!",
  "footer": "Loja Virtual",
  "cards": [
    {
      "imageUrl": "https://exemplo.com/img1.jpg",
      "title": "📱 Produto 1",
      "body": "Descrição do produto 1",
      "footer": "R$ 99,90",
      "buttons": [
        { "id": "comprar_p1", "title": "🛒 Comprar" },
        { "id": "info_p1", "title": "📋 Detalhes" }
      ]
    },
    {
      "imageUrl": "https://exemplo.com/img2.jpg",
      "title": "💻 Produto 2",
      "body": "Descrição do produto 2",
      "footer": "R$ 149,90",
      "buttons": [
        { "id": "comprar_p2", "title": "🛒 Comprar" }
      ]
    }
  ]
}
```

---

### `POST` /api/instances/:id/send-products

Envia múltiplos produtos do catálogo do WhatsApp Business. Requer: Catálogo configurado no WhatsApp Business.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `productIds *obrigatório` | string[] | Array de IDs dos produtos do catálogo (máximo 30) |
| `catalogId` | string | ID do catálogo (opcional, usa o padrão da conta) |
| `title` | string | Título da mensagem |
| `body` | string | Texto da mensagem |
| `footer` | string | Rodapé da mensagem |

**Exemplo:**

```json
// Enviar múltiplos produtos do catálogo
{
  "jid": "5511999999999@s.whatsapp.net",
  "productIds": ["produto_001", "produto_002", "produto_003"],
  "title": "Ofertas da Semana",
  "body": "Confira nossos produtos em promoção!",
  "footer": "Válido até domingo"
}
```

---

### `POST` /api/instances/:id/send-product

Envia um único produto do catálogo com detalhes completos. Requer: Catálogo configurado no WhatsApp Business.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário |
| `productId *obrigatório` | string | ID do produto no catálogo |
| `catalogId` | string | ID do catálogo (opcional) |
| `body` | string | Texto da mensagem |
| `footer` | string | Rodapé da mensagem |

**Exemplo:**

```json
// Enviar produto único do catálogo
{
  "jid": "5511999999999@s.whatsapp.net",
  "productId": "produto_001",
  "body": "Olha esse produto incrível!",
  "footer": "Frete grátis"
}
```

---

### `POST` /api/instances/:id/send-poll

Envia uma enquete/votação para um contato ou grupo. Funciona no celular e desktop!

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | Número do destinatário (ex: 5511999999999@s.whatsapp.net) |
| `name *obrigatório` | string | Pergunta da enquete |
| `options *obrigatório` | string[] | Lista de opções (mínimo 2, máximo 12) |
| `selectableCount` | number | Quantidade de opções selecionáveis (1 = única, 0 = múltipla). Padrão: 1 |

**Exemplo:**

```json
// Enquete de escolha única
{
  "jid": "5511999999999@s.whatsapp.net",
  "name": "Qual sua linguagem favorita?",
  "options": ["JavaScript", "Python", "TypeScript", "Go"],
  "selectableCount": 1
}

// Enquete de múltipla escolha
{
  "jid": "5511999999999@s.whatsapp.net",
  "name": "Quais tecnologias você usa?",
  "options": ["React", "Vue", "Angular", "Node.js", "Docker"],
  "selectableCount": 0
}
```

---

## Catálogo de Produtos

Gerencie o catálogo de produtos do WhatsApp Business. Requer: Conta WhatsApp Business com catálogo configurado.

### `GET` /api/instances/:id/catalog

Lista todos os produtos do seu catálogo.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `limit` | number | Quantidade máxima de produtos (padrão: 100) |
| `cursor` | string | Cursor para paginação (retornado na resposta anterior) |

**Exemplo:**

```json
// Resposta
{
  "success": true,
  "jid": "5511999999999@s.whatsapp.net",
  "productsCount": 15,
  "products": [
    {
      "id": "produto_001",
      "name": "Camiseta Básica",
      "description": "Camiseta 100% algodão",
      "price": 4990,
      "currency": "BRL",
      "imageUrl": "https://..."
    }
  ],
  "nextPageCursor": "abc123..."
}
```

---

### `GET` /api/instances/:id/catalog/:number

Obtém o catálogo de outro número do WhatsApp Business.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `number *obrigatório` | string | Número do WhatsApp Business (ex: 5511999999999) |
| `limit` | number | Quantidade máxima de produtos (padrão: 100) |

**Exemplo:**

```json
// GET /api/instances/minha-instancia/catalog/5511888888888
// Resposta
{
  "success": true,
  "jid": "5511888888888@s.whatsapp.net",
  "productsCount": 25,
  "products": [...]
}
```

---

### `POST` /api/instances/:id/catalog/product

Cria um novo produto no catálogo.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `name *obrigatório` | string | Nome do produto |
| `description` | string | Descrição do produto |
| `price` | number | Preço em centavos (ex: 4990 = R$ 49,90) |
| `currency` | string | Moeda (padrão: BRL) |
| `imageUrl` | string | URL da imagem do produto |
| `url` | string | Link para o produto (site) |
| `retailerId` | string | ID interno do produto (SKU) |
| `isHidden` | boolean | Ocultar produto do catálogo público |

**Exemplo:**

```json
// Criar produto
{
  "name": "Camiseta Premium",
  "description": "Camiseta 100% algodão, várias cores disponíveis",
  "price": 7990,
  "currency": "BRL",
  "imageUrl": "https://exemplo.com/camiseta.jpg",
  "url": "https://minhaloja.com/camiseta-premium",
  "retailerId": "SKU-001",
  "isHidden": false
}
```

---

### `PUT` /api/instances/:id/catalog/product/:productId

Atualiza um produto existente no catálogo.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `productId *obrigatório` | string | ID do produto (na URL) |
| `name` | string | Novo nome do produto |
| `price` | number | Novo preço em centavos |

**Exemplo:**

```json
// PUT /api/instances/minha-instancia/catalog/product/produto_001
{
  "price": 5990,
  "description": "Promoção! Camiseta com 25% de desconto"
}
```

---

### `DELETE` /api/instances/:id/catalog/product/:productId

Remove um produto do catálogo.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `productId *obrigatório` | string | ID do produto a ser removido |

**Exemplo:**

```json
// DELETE /api/instances/minha-instancia/catalog/product/produto_001
// Resposta
{
  "success": true,
  "deletedProductId": "produto_001"
}
```

---

### `GET` /api/instances/:id/catalog/collections

Lista as coleções do catálogo (categorias de produtos).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `limit` | number | Quantidade máxima de coleções (padrão: 50) |

**Exemplo:**

```json
// Resposta
{
  "success": true,
  "collectionsCount": 3,
  "collections": [
    {
      "id": "colecao_001",
      "name": "Roupas Masculinas",
      "productsCount": 12
    },
    {
      "id": "colecao_002",
      "name": "Acessórios",
      "productsCount": 8
    }
  ]
}
```

---

### `POST` /api/instances/:id/catalog/collection

Cria uma nova coleção no catálogo com produtos selecionados.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `name *obrigatório` | string | Nome da coleção |
| `productIds *obrigatório` | string[] | Array de IDs dos produtos para incluir na coleção |

**Exemplo:**

```json
// Criar coleção
{
  "name": "Promoções de Verão",
  "productIds": ["produto_001", "produto_002", "produto_003"]
}
```

---

### `DELETE` /api/instances/:id/catalog/collection/:collectionId

Remove uma coleção do catálogo. Os produtos não são deletados, apenas removidos da coleção.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `collectionId *obrigatório` | string | ID da coleção a ser removida (na URL) |

**Exemplo:**

```json
// DELETE /api/instances/minha-instancia/catalog/collection/colecao_001
// Resposta
{
  "success": true,
  "deletedCollectionId": "colecao_001"
}
```

---

## Grupos

### `POST` /api/instances/:id/groups/create

Cria um novo grupo.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `name *obrigatório` | string | Nome do grupo |
| `participants *obrigatório` | array | Lista de JIDs dos participantes |

**Exemplo:**

```json
// Requisição
{
  "name": "Meu Grupo",
  "participants": [
    "5511999999999@s.whatsapp.net",
    "5511888888888@s.whatsapp.net"
  ]
}
```

---

### `GET` /api/instances/:id/groups/:groupId/metadata

Obtém metadados de um grupo (nome, descrição, participantes, etc).

---

### `GET` /api/instances/:id/groups/:groupId/invite-code

Obtém o código de convite do grupo.

---

### `POST` /api/instances/:id/groups/:groupId/participants

Gerencia participantes do grupo (adicionar, remover, promover, rebaixar).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `action *obrigatório` | string | Ação: add, remove, promote, demote |
| `participants *obrigatório` | array | Lista de JIDs |

**Exemplo:**

```json
// Adicionar participantes
{
  "action": "add",
  "participants": ["5511999999999@s.whatsapp.net"]
}

// Remover participantes
{
  "action": "remove",
  "participants": ["5511999999999@s.whatsapp.net"]
}

// Promover a admin
{
  "action": "promote",
  "participants": ["5511999999999@s.whatsapp.net"]
}

// Rebaixar de admin
{
  "action": "demote",
  "participants": ["5511999999999@s.whatsapp.net"]
}
```

---

### `PUT` /api/instances/:id/groups/:groupId/settings

Atualiza configurações do grupo.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `subject` | string | Nome do grupo |
| `description` | string | Descrição do grupo |
| `announce` | boolean | Apenas admins enviam mensagens |
| `restrict` | boolean | Apenas admins editam info |

---

### `POST` /api/instances/:id/groups/:groupId/leave

Sai do grupo.

---

### `GET` /api/instances/:id/groups

Lista todos os grupos que você participa.

---

## Perfil

### `GET` /api/instances/:id/profile-picture/:jid

Obtém a URL da foto de perfil de um contato ou grupo.

---

### `PUT` /api/instances/:id/profile-picture

Atualiza sua foto de perfil.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `url *obrigatório` | string | URL da imagem ou base64 |

---

### `PUT` /api/instances/:id/profile-status

Atualiza seu recado/status.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `status *obrigatório` | string | Texto do recado |

---

### `PUT` /api/instances/:id/profile-name

Atualiza seu nome de perfil.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `name *obrigatório` | string | Novo nome |

---

## Privacidade

### `GET` /api/instances/:id/privacy-settings

Obtém as configurações de privacidade atuais.

---

### `POST` /api/instances/:id/block

Bloqueia ou desbloqueia um contato.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | JID do contato |
| `action *obrigatório` | string | block ou unblock |

---

## Outros

### `POST` /api/instances/:id/presence

Atualiza a presença (online, digitando, gravando áudio).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | JID do chat |
| `presence *obrigatório` | string | available, unavailable, composing, recording, paused |

**Exemplo:**

```json
// Mostrar "digitando..."
{
  "jid": "5511999999999@s.whatsapp.net",
  "presence": "composing"
}

// Mostrar "gravando áudio..."
{
  "jid": "5511999999999@s.whatsapp.net",
  "presence": "recording"
}

// Ficar online
{
  "jid": "5511999999999@s.whatsapp.net",
  "presence": "available"
}
```

---

### `POST` /api/instances/:id/read-messages

Marca mensagens como lidas.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `keys *obrigatório` | array | Array de chaves de mensagens |

**Exemplo:**

```json
// Requisição
{
  "keys": [
    {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "3EB0B430A...",
      "fromMe": false
    }
  ]
}
```

---

### `POST` /api/instances/:id/labels

Gerencia etiquetas/labels (WhatsApp Business).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | JID do chat |
| `labelId *obrigatório` | string | ID da etiqueta |
| `action *obrigatório` | string | add ou remove |

---

### `GET` /api/instances/:id/check-number/:phone

Verifica se um número está registrado no WhatsApp.

**Exemplo:**

```json
// Resposta
{
  "exists": true,
  "jid": "5511999999999@s.whatsapp.net"
}
```

---

### `POST` /api/instances/:id/delete-message

Deleta uma mensagem.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | JID do chat |
| `messageId *obrigatório` | string | ID da mensagem |
| `fromMe *obrigatório` | boolean | Se a mensagem foi enviada por você |

---

### `POST` /api/instances/:id/edit-message

Edita uma mensagem enviada por você.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `jid *obrigatório` | string | JID do chat |
| `messageId *obrigatório` | string | ID da mensagem |
| `newText *obrigatório` | string | Novo texto da mensagem |

---

### `POST` /api/instances/:id/logout

Desconecta a instância do WhatsApp (logout).

---

## Informações Importantes

## SMS

### `POST` /api/sms/send

Envia SMS através do gateway integrado. Suporta rotação automática de chips (30 portas disponíveis).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `number *` | string | Número do destinatário (apenas números, ex: 5582988898565) |
| `text *` | string | Texto da mensagem SMS |
| `port` | number | Porta do chip (1-30). Se não informado, usa rotação automática |

**Exemplo:**

```json
// Requisição
POST /api/sms/send
{
  "number": "5582988898565",
  "text": "Olá! Sua confirmação de pedido #12345",
  "port": 5  // opcional
}

// Resposta
{
  "success": true,
  "message": "SMS enviado",
  "port": 5,
  "response": "OK"
}
```

---

### `GET` /api/call-instances

Gerencia instâncias de ligação/SMS. Cada instância pode ter uma porta de chip configurada.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `GET` | /api/call-instances | Lista todas as instâncias de ligação |
| `POST` | /api/call-instances | Cria nova instância |
| `PUT` | /api/call-instances/:id | Atualiza instância |
| `DEL` | /api/call-instances/:id | Remove instância |
| `POST` | /api/call-instances/test-sms | Envia SMS de teste |

**Exemplo:**

```json
// Criar instância de ligação
POST /api/call-instances
{
  "name": "Suporte",
  "number": "5582988898565",
  "port": 1,
  "mode": "manual"  // manual | audio | ai
}

// Enviar SMS de teste
POST /api/call-instances/test-sms
{
  "instanceId": "call_1234567890",
  "number": "5582988898565",
  "text": "Teste de SMS"
}
```

---

## Proxy

Configure proxies HTTP, HTTPS ou SOCKS para suas instâncias. Útil para contornar bloqueios de IP ou usar IPs de diferentes regiões.

### `POST` /api/instances/:id/proxy

Configura um proxy específico para uma instância. Após configurar, reconecte a instância para aplicar.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `enabled *` | boolean | Habilita ou desabilita o proxy para esta instância |
| `url` | string | URL do proxy no formato: protocolo://usuario:senha@host:porta |

**Exemplo:**

```json
// Requisição - Habilitar proxy HTTP
POST /api/instances/minha-instancia/proxy
{
  "enabled": true,
  "url": "http://user:pass@proxy.example.com:8080"
}

// Requisição - Habilitar proxy SOCKS5
POST /api/instances/minha-instancia/proxy
{
  "enabled": true,
  "url": "socks5://user:pass@proxy.example.com:1080"
}

// Requisição - Desabilitar proxy
POST /api/instances/minha-instancia/proxy
{
  "enabled": false,
  "url": ""
}

// Resposta
{
  "success": true,
  "proxy": {
    "enabled": true,
    "url": "http://user:pass@proxy.example.com:8080"
  },
  "message": "Proxy configurado. Reconecte a instância para aplicar."
}
```

---

### `GET` /api/instances/:id/proxy

Obtém a configuração de proxy de uma instância e informações sobre o proxy global.

**Exemplo:**

```json
// Requisição
GET /api/instances/minha-instancia/proxy

// Resposta
{
  "proxy": {
    "enabled": true,
    "url": "http://user:pass@proxy.example.com:8080"
  },
  "globalProxy": {
    "enabled": false,
    "url": ""
  }
}
```

---

### `GET` /api/proxy/global

Obtém a configuração do proxy global (definido via variáveis de ambiente).

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `PROXY_ENABLED` | Habilita o proxy global | true ou false |
| `PROXY_URL` | URL do proxy global | http://proxy.example.com:8080 |

**Exemplo:**

```json
// Configuração no .env
PROXY_ENABLED=true
PROXY_URL=http://user:pass@proxy.example.com:8080

// Requisição
GET /api/proxy/global

// Resposta
{
  "globalProxy": {
    "enabled": true,
    "url": "http://user:pass@proxy.example.com:8080"
  }
}
```

---

## Status do Servidor

### `GET` /api/stats

Retorna estatísticas em tempo real do servidor: CPU, memória, uptime e instâncias conectadas. Esta rota é pública (não requer autenticação).

**Exemplo:**

```json
// Requisição
GET /api/stats

// Resposta
{
  "cpu": {
    "usage": 15.2,
    "cores": 8
  },
  "memory": {
    "total": 17179869184,
    "used": 8589934592,
    "free": 8589934592,
    "usagePercent": 50
  },
  "process": {
    "rss": 157286400,
    "heapTotal": 67108864,
    "heapUsed": 45088768
  },
  "system": {
    "platform": "linux",
    "nodeVersion": "v20.10.0",
    "uptime": 86400
  },
  "api": {
    "uptime": 3600,
    "instances": 5,
    "connectedInstances": 3
  }
}
```

---

## Fila de Mensagens

Sistema de fila com Redis para envio de mensagens com rate limiting, retry automático e persistência. Requer STORAGE_TYPE=postgres+redis.

### `GET` /api/queue/status

Verifica se a fila está habilitada e retorna a configuração atual.

**Exemplo:**

```json
{
  "enabled": true,
  "config": {
    "messagesPerMinute": 20,
    "maxRetries": 3,
    "retryDelayMs": 5000
  }
}
```

---

### `GET` /api/instances/:id/queue/stats

Retorna estatísticas da fila de uma instância.

**Exemplo:**

```json
{
  "success": true,
  "stats": {
    "instanceId": "minha-instancia",
    "pending": 15,
    "processing": 1,
    "completed": 1250,
    "failed": 3,
    "messagesLastMinute": 18
  }
}
```

---

### `POST` /api/instances/:id/queue/config

Configura rate limit específico para uma instância.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `messagesPerMinute` | number | Máximo de mensagens por minuto (padrão: 20) |
| `maxRetries` | number | Tentativas em caso de falha (padrão: 3) |
| `retryDelayMs` | number | Delay base para retry em ms (padrão: 5000) |

---

### `GET` 

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `GET` | /api/queue/stats | Estatísticas de todas as filas |
| `GET` | /api/instances/:id/queue/pending | Lista mensagens pendentes |
| `GET` | /api/instances/:id/queue/failed | Lista mensagens que falharam |
| `POST` | /api/instances/:id/queue/retry-failed | Reprocessa mensagens que falharam |
| `DELETE` | /api/instances/:id/queue | Limpa fila de uma instância |

---

## Templates Prontos

Templates prontos para copiar e usar nas suas requisições. Basta copiar o JSON e ajustar os dados conforme sua necessidade.

### `📱` Templates de Carrossel

O carrossel permite enviar múltiplos cards horizontais com imagem, título, descrição e botões. Ideal para catálogos de produtos, cardápios, imóveis e serviços.

**Exemplo:**

```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "title": "🛍️ Ofertas Especiais",
  "body": "Confira nossos produtos em destaque!",
  "footer": "Loja Virtual - Entrega em todo Brasil",
  "cards": [
    {
      "imageUrl": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
      "title": "📱 iPhone 15 Pro Max",
      "body": "256GB - Titânio Natural\n💰 R$ 8.999,00 à vista\n💳 12x R$ 833,25",
      "footer": "Frete Grátis",
      "buttons": [
        { "id": "comprar_iphone", "title": "🛒 Comprar Agora" },
        { "id": "info_iphone", "title": "📋 Mais Detalhes" }
      ]
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
      "title": "💻 MacBook Air M3",
      "body": "8GB RAM - 256GB SSD\n💰 R$ 12.499,00 à vista\n💳 12x R$ 1.166,58",
      "footer": "Garantia Apple 1 ano",
      "buttons": [
        { "id": "comprar_macbook", "title": "🛒 Comprar Agora" },
        { "id": "info_macbook", "title": "📋 Mais Detalhes" }
      ]
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400",
      "title": "⌚ Apple Watch Series 9",
      "body": "GPS + Cellular - 45mm\n💰 R$ 5.299,00 à vista\n💳 12x R$ 491,58",
      "footer": "Pronta Entrega",
      "buttons": [
        { "id": "comprar_watch", "title": "🛒 Comprar Agora" },
        { "id": "info_watch", "title": "📋 Mais Detalhes" }
      ]
    }
  ]
}
```

---

### `🔘` Templates de Botões

Botões permitem respostas rápidas do usuário. Máximo de 3 botões por mensagem.

**Exemplo:**

```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "title": "👋 Olá! Bem-vindo(a)!",
  "body": "Sou o assistente virtual da Empresa XYZ.\n\nComo posso ajudar você hoje?",
  "footer": "Atendimento 24h",
  "buttons": [
    { "id": "vendas", "title": "🛒 Fazer Pedido" },
    { "id": "suporte", "title": "🔧 Suporte Técnico" },
    { "id": "financeiro", "title": "💰 Financeiro" }
  ]
}
```

---

### `📋` Templates de Lista

Listas permitem organizar muitas opções em seções. Ideal quando há mais de 3 opções.

**Exemplo:**

```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "title": "🍔 Cardápio Completo",
  "body": "Escolha uma categoria para ver os itens disponíveis",
  "footer": "Delivery - Taxa grátis acima de R$ 50",
  "buttonText": "📋 Ver Cardápio",
  "sections": [
    {
      "title": "🍔 Hambúrgueres",
      "rows": [
        { "id": "burger_classico", "title": "Clássico", "description": "Pão, carne 180g, queijo, alface, tomate - R$ 28,90" },
        { "id": "burger_bacon", "title": "Bacon Lovers", "description": "Pão, carne 180g, bacon crocante, cheddar - R$ 34,90" },
        { "id": "burger_vegano", "title": "Veggie Burger", "description": "Pão integral, hambúrguer de grão de bico - R$ 32,90" }
      ]
    },
    {
      "title": "🍕 Pizzas",
      "rows": [
        { "id": "pizza_margherita", "title": "Margherita", "description": "Molho, mussarela, tomate, manjericão - R$ 49,90" },
        { "id": "pizza_pepperoni", "title": "Pepperoni", "description": "Molho, mussarela, pepperoni - R$ 54,90" },
        { "id": "pizza_4queijos", "title": "Quatro Queijos", "description": "Mussarela, gorgonzola, parmesão, catupiry - R$ 59,90" }
      ]
    },
    {
      "title": "🥤 Bebidas",
      "rows": [
        { "id": "bebida_refri", "title": "Refrigerante 350ml", "description": "Coca, Guaraná, Sprite - R$ 6,90" },
        { "id": "bebida_suco", "title": "Suco Natural 500ml", "description": "Laranja, Limão, Maracujá - R$ 12,90" },
        { "id": "bebida_agua", "title": "Água Mineral", "description": "Com ou sem gás - R$ 4,90" }
      ]
    }
  ]
}
```

---

## Integração Typebot NOVO

Conecte sua instância WhatsApp ao Typebot para criar fluxos de conversação automatizados. Suporta Typebot self-hosted ou cloud.

### `POST` /api/instances/{id}/integrations/typebot

Configura a integração com Typebot para a instância.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `enabled` | boolean | Ativar/desativar integração |
| `url` | string | URL do Typebot (ex: https://typebot.io ou self-hosted) |
| `typebot` | string | Nome/ID do typebot a ser executado |
| `expire` | number | Tempo em minutos para expirar sessão (0 = não expira) |
| `keywordFinish` | string | Palavra-chave para finalizar (ex: #sair) |
| `keywordRestart` | string | Palavra-chave para reiniciar (ex: #reiniciar) |
| `unknownMessage` | string | Mensagem quando não entende a resposta |
| `stopBotFromMe` | boolean | Parar bot quando você enviar mensagem manual |
| `debounceTime` | number | Tempo de debounce em ms (agrupa mensagens rápidas) |
| `triggerType` | string | Tipo de gatilho: "all", "keyword" ou "none" |
| `triggerOperator` | string | Operador: "contains", "equals", "startsWith", "endsWith", "regex" |
| `triggerValue` | string | Valor do gatilho (palavra-chave, regex, etc) |

**Exemplo:**

```json
{
  "enabled": true,
  "url": "https://typebot.seudominio.com",
  "typebot": "atendimento-vendas",
  "expire": 30,
  "keywordFinish": "#sair",
  "keywordRestart": "#reiniciar",
  "unknownMessage": "Desculpe, não entendi. Digite #sair para falar com um atendente.",
  "stopBotFromMe": true,
  "debounceTime": 3000,
  "triggerType": "keyword",
  "triggerOperator": "contains",
  "triggerValue": "oi|olá|bom dia|boa tarde"
}
```

---

### `GET` /api/instances/{id}/integrations/typebot

Obtém a configuração atual do Typebot.

---

## Integração Chatwoot NOVO

Conecte sua instância ao Chatwoot para atendimento humano. Cria inbox automaticamente e configura webhook.

### `POST` /api/instances/{id}/integrations/chatwoot

Configura a integração com Chatwoot. Testa conexão, cria inbox e configura webhook automaticamente.

**Parâmetros:**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `enabled` | boolean | Ativar/desativar integração |
| `url` | string | URL do Chatwoot (ex: https://app.chatwoot.com) |
| `accountId` | string | ID da conta no Chatwoot |
| `token` | string | Token de acesso (API Access Token) |
| `nameInbox` | string | Nome da inbox a criar/usar |
| `autoCreateInbox` | boolean | Criar inbox automaticamente se não existir |
| `webhookUrl` | string | URL pública da API (para configurar webhook) |
| `signMsg` | boolean | Assinar mensagens com nome do agente |
| `signDelimiter` | string | Delimitador da assinatura (ex: "\n\n") |
| `reopenConversation` | boolean | Reabrir conversa ao receber nova mensagem |
| `conversationPending` | boolean | Criar conversa como pendente |
| `mergeBrazilContacts` | boolean | Mesclar contatos brasileiros (9º dígito) |

**Exemplo:**

```json
{
  "enabled": true,
  "url": "https://chatwoot.seudominio.com",
  "accountId": "1",
  "token": "seu_api_access_token",
  "nameInbox": "WhatsApp - Vendas",
  "autoCreateInbox": true,
  "webhookUrl": "https://api.seudominio.com",
  "signMsg": true,
  "signDelimiter": "\\n\\n",
  "reopenConversation": true,
  "conversationPending": false,
  "mergeBrazilContacts": true
}
```

---

### `GET` /api/instances/{id}/integrations/chatwoot

Obtém a configuração atual do Chatwoot.

---

### `POST` /api/instances/{id}/chatwoot/webhook

Endpoint que recebe mensagens do Chatwoot (configurado automaticamente na inbox).

---

## PowerTools IA - Agentes Inteligentes PRO

Sistema de agentes de IA multimodal com Google Gemini. Crie assistentes inteligentes que respondem automaticamente no WhatsApp com contexto, personalidade e conhecimento personalizado.

### `GET` /api/agents

Lista todos os agentes de IA disponíveis no PapiZAI.

---

### `POST` /api/instances/{id}/agent

Vincula um agente de IA à instância WhatsApp.

**Exemplo:**

```json
{
  "agentId": "uuid-do-agente"
}
```

---

### `GET` /api/instances/{id}/agent

Obtém o agente vinculado à instância.

---

### `DELETE` /api/instances/{id}/agent

Remove o vínculo do agente com a instância.

---

## Central de Ligações VoIP PRO

Sistema completo de telefonia VoIP integrado. Gerencie instâncias de ligação, faça chamadas e envie SMS.

### `GET` /api/call-instances

Lista todas as instâncias de ligação configuradas.

---

### `POST` /api/call-instances

Cria uma nova instância de ligação.

**Exemplo:**

```json
{
  "name": "Linha Comercial",
  "provider": "twilio",
  "phoneNumber": "+5511999999999",
  "accountSid": "ACxxxxxxxxxxxxxxx",
  "authToken": "xxxxxxxxxxxxxxx"
}
```

---

## Disparo de Ligações PRO

Crie campanhas de ligações em massa com áudio personalizado, agendamento e relatórios detalhados.

### `GET` /api/call-campaigns

Lista todas as campanhas de ligação.

---

### `POST` /api/call-campaigns

Cria uma nova campanha de disparo de ligações.

**Exemplo:**

```json
{
  "name": "Campanha Black Friday",
  "callInstanceId": "uuid-da-instancia",
  "audioUrl": "https://exemplo.com/audio-promocao.mp3",
  "numbers": [
    "+5511999999999",
    "+5511888888888"
  ],
  "scheduleAt": "2025-11-29T10:00:00Z",
  "maxConcurrent": 5,
  "retryAttempts": 2
}
```

---

### `POST` /api/call-campaigns/{id}/start

Inicia uma campanha de ligações.

---

### `POST` /api/call-campaigns/{id}/pause

Pausa uma campanha em andamento.

---

## Envio de SMS PRO

Envie SMS individual ou em massa através das instâncias de ligação configuradas.

### `POST` /api/sms/send

Envia um SMS para um número.

**Exemplo:**

```json
{
  "callInstanceId": "uuid-da-instancia",
  "to": "+5511999999999",
  "message": "Olá! Sua consulta está confirmada para amanhã às 14h."
}
```

---

### `POST` /api/sms/send-bulk

Envia SMS em massa para múltiplos números.

**Exemplo:**

```json
{
  "callInstanceId": "uuid-da-instancia",
  "numbers": [
    "+5511999999999",
    "+5511888888888",
    "+5511777777777"
  ],
  "message": "🎉 Promoção especial! 50% OFF em todos os produtos. Acesse: loja.com"
}
```

---

### `GET` /api/sms/stats

Obtém estatísticas de envio de SMS (enviados, entregues, falhas).

---

