# Análise Detalhada do Fluxo de Conexão e QR Code

Este documento descreve a análise técnica do fluxo de geração de QR Code para conexão com o WhatsApp, incluindo componentes, containers, infraestrutura e resolução de problemas.

## 1. Visão Geral do Fluxo

O processo é **assíncrono** e **orientado a eventos**, utilizando RabbitMQ para desacoplamento e Socket.IO para tempo real.

### Diagrama de Sequência
```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant B as Backend (API)
    participant R as RabbitMQ
    participant E as Whaileys Engine
    participant W as WhatsApp (Baileys)

    F->>B: POST /whatsappsession/:id
    Note over B: Status -> OPENING
    B->>R: Publish (wbot.commands) session.start
    R->>E: Consume (wbot.commands)
    E->>W: makeWASocket() -> Connect
    W-->>E: Event: connection.update { qr: "..." }
    E->>R: Publish (wbot.events) session.qrcode
    R->>B: Consume (wbot.events)
    B->>B: DB Update (qrcode, status)
    B->>F: Socket.IO Emit (whatsappSession)
    F-->>F: Render QR Code
```

## 2. Detalhamento Técnico por Camada

### 1. Frontend
- **Localização**: `src/pages/Connections/ConnectionConfig.js`
- **Requisição**: `POST /whatsappsession/${whatsappId}`
- **Monitoramento**: Escuta evento `whatsappSession` via Socket.IO.
- **Estado**: Exibe "Conectando..." (Spinner) enquanto status é `OPENING`. Ao receber QR Code, renderiza com `qrcode.react`.

### 2. Backend
- **Rota**: `POST /whatsappsession/:id` (`whatsappSessionRoutes.ts`)
- **Controller**: `WhatsAppSessionController.store`
- **Serviço**: `StartWhatsAppSession.ts`
  - Verifica se já existe sessão.
  - Atualiza DB para `OPENING`.
  - Envia comando ao RabbitMQ:
    - **Exchange**: `wbot.commands`
    - **Routing Key**: `wbot.{tenantId}.{sessionId}.session.start`

### 3. Infraestrutura (RabbitMQ)
- **Container**: `watink_rabbitmq`
- **Exchanges**:
  - `wbot.commands` (Topic, Durable): Backend -> Engine
  - `wbot.events` (Topic, Durable): Engine -> Backend
- **Problema Identificado**: O RabbitMQ estava atingindo o limite de memória (High Watermark) com 512MB, forçando fechamento de conexões (`connection_forced`).

### 4. Whaileys Engine
- **Container**: `watink_whaileys-engine`
- **Consumo**:
  - Cria fila temporária exclusiva e faz binding em `wbot.commands`.
  - Processa `session.start`.
- **Geração**:
  - Usa biblioteca `@whiskeysockets/baileys` (via wrapper `whaileys`).
  - Ao receber QR do Baileys, publica evento `session.qrcode` na exchange `wbot.events`.
- **Problema Identificado**: Falha na conexão com RabbitMQ devido a instabilidade do broker (memória) e possíveis timeouts.

## 3. Diagnóstico e Resolução (Caso: QR Code não gerado)

### Sintomas
- Frontend travado em "Conectando..." ou "Aguardando QR Code".
- Logs do RabbitMQ mostrando `system_memory_high_watermark` e `broker forced connection closure`.
- Logs do Engine mostrando `Failed to connect to RabbitMQ` e `npm error signal SIGTERM` (devido a crash por falta de conexão estável).

### Ações Realizadas
1. **Análise de Logs**: Identificada falha crítica de memória no RabbitMQ.
2. **Ajuste de Recursos**:
   - RabbitMQ: Memória aumentada de 512MB para **1024MB** no `docker-stack.yml`.
   - Engine: Memória aumentada de 1024MB para **2048MB** (preventivo).
3. **Validação de Rede**: Confirmado que `AMQP_URL` estava correto (`amqp://guest:guest@rabbitmq:5672`).
4. **Deploy**: Stack atualizada (`docker stack deploy`).

### Resultados Pós-Correção
- **RabbitMQ**: Estável, sem alertas de memória.
- **Engine**: Conectado com sucesso (`[INFO] Connected to RabbitMQ`, `Consumer setup completed`).
- **Fluxo**: Restaurado. O Engine agora consegue consumir comandos e publicar eventos de QR Code.

## 4. Verificações de Validação do QR Code

Para garantir a qualidade do fluxo:
1. **Formato**: O payload do QR Code é uma string alfanumérica longa (base64 ou raw string do WhatsApp).
2. **Leitura**: O componente frontend usa `qrcode.react` com nível de correção de erro 'M' ou 'Q' para facilitar leitura.
3. **Expiração**: O QR Code expira a cada ~20-60 segundos. O fluxo garante que novos eventos `session.qrcode` (com `attempt` incrementado) sejam enviados e atualizem a tela automaticamente via Socket.IO.

## 5. Recomendações

- **Monitoramento**: Configurar alertas para uso de memória do RabbitMQ.
- **Persistência**: Garantir que o volume `sessions_auth_data` tenha permissões corretas para evitar perda de sessão (relogin).
- **UX**: Adicionar timeout visual no frontend caso o socket não receba atualização em 30s.
