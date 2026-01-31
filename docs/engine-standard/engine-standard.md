# Engine Standard - Documentação Técnica

Este documento fornece uma análise técnica abrangente do serviço **Engine Standard** (`whaileys-engine`), responsável pela conectividade com o WhatsApp na plataforma Watink.

## 1. Visão Geral

O **Engine Standard** é um microsserviço desenvolvido em Node.js/TypeScript que atua como uma ponte entre o backend da aplicação e os servidores do WhatsApp. Ele utiliza a biblioteca `whaileys` (um fork mantido internamente do Baileys) para emular um cliente WhatsApp Web via WebSocket.

A comunicação com o restante da plataforma é totalmente assíncrona, baseada em eventos e comandos via **RabbitMQ**. O estado de autenticação das sessões é persistido no **Redis**, permitindo que o serviço seja reiniciado sem perda de conexões (stateless container, stateful storage).

### Principais Responsabilidades
- Gerenciamento do ciclo de vida das sessões do WhatsApp (Start, Stop, Reconnect).
- Envio de mensagens (Texto, Mídia, Botões, Listas, Polls).
- Recebimento de mensagens e eventos em tempo real (Upsert, Acks, Presença).
- Sincronização de contatos e histórico.
- Resolução de identificadores de contatos (JID/LID).

## 2. Arquitetura

### Diagrama de Componentes

```mermaid
graph TD
    Backend[Backend Service] -->|Commands| RabbitMQ
    RabbitMQ -->|Events| Backend
    
    subgraph Engine Standard
        Consumer[RabbitMQ Consumer] --> SessionManager
        SessionManager -->|Auth State| Redis
        SessionManager -->|WebSocket| WhatsApp[WhatsApp Servers]
        WhatsApp -->|Updates| SessionManager
        SessionManager -->|Events| RabbitMQ
    end
    
    Redis[(Redis)]
```

### Tecnologias e Dependências
- **Linguagem**: TypeScript / Node.js
- **WhatsApp Core**: `whaileys` (Protocolo Noise, criptografia E2E)
- **Mensageria**: `amqplib` (RabbitMQ)
- **Cache/Persistência**: `ioredis` (Redis)
- **Logging**: `pino`
- **Util**: `libsignal` (via whaileys) para criptografia.

## 3. Infraestrutura de Mensageria (RabbitMQ)

O sistema utiliza um padrão de **Topic Exchange** para roteamento flexível.

### Exchanges
1.  **`wbot.commands`** (Entrada)
    -   **Origem**: Backend
    -   **Destino**: Engine
    -   **Tipo**: `topic`
    -   **Routing Keys**: `wbot.{tenantId}.{sessionId}.{commandType}`
2.  **`wbot.events`** (Saída)
    -   **Origem**: Engine
    -   **Destino**: Backend
    -   **Tipo**: `topic`
    -   **Routing Keys**: `wbot.{tenantId}.{sessionId}.{eventType}`

### Filas
-   **`wbot_engine_commands`**: Fila durável consumida pelo Engine.
    -   **Bindings**:
        -   `command.general`
        -   `wbot.*.*.#` (Captura todos os comandos para qualquer tenant/sessão)

## 4. API de Comandos (Backend -> Engine)

Os comandos são enviados como objetos JSON (`Envelope`) contendo `id`, `tenantId`, `type` e `payload`.

### Tipos de Comandos Suportados

#### Gestão de Sessão
-   **`session.start`**: Inicia uma sessão.
    -   *Payload*: `{ sessionId, sessionInstanceId, usePairingCode, phoneNumber, force, ... }`
-   **`session.stop`**: Encerra uma sessão.
    -   *Payload*: `{ sessionId }`

#### Mensagens
-   **`message.send.text`**: Envia texto simples.
-   **`message.send.media`**: Envia imagem, vídeo, áudio ou documento (base64).
-   **`message.send.buttons`**: Envia botões simples.
-   **`message.send.list`**: Envia menu de lista.
-   **`message.send.poll`**: Envia enquete.
-   **`message.send.template`**: Envia template (ex: call to action).
-   **`message.send.interactive`**: Mensagens nativas complexas (Native Flow).
-   **`message.send.carousel`**: Carrossel de cards.

#### Outros
-   **`message.markAsRead`**: Marca mensagens como lidas.
-   **`contact.sync`**: Força sincronização/atualização de um contato.
-   **`contact.import`**: Importação em massa da agenda do celular.
-   **`history.sync`**: Busca histórico de mensagens antigas sob demanda.

## 5. Eventos Emitidos (Engine -> Backend)

O Engine publica eventos no exchange `wbot.events` para notificar o backend sobre mudanças de estado e novos dados.

### Principais Eventos

-   **`session.status`**: Mudança de estado da conexão (`CONNECTED`, `DISCONNECTED`, `OPENING`, `QRCODE`).
-   **`session.qrcode`**: Novo QR Code gerado (payload contém string base64 do QR).
-   **`session.pairingcode`**: Código de pareamento gerado (para login via número).
-   **`message.received`**: Nova mensagem recebida.
    -   *Payload*: Objeto normalizado contendo `id`, `body`, `from`, `to`, `mediaData`, `quotedMsg`, `urlPreview`, `senderLid`, etc.
-   **`message.ack`**: Atualização de status de entrega (`SENT`, `DELIVERED`, `READ`, `PLAYED`, `ERROR`).
-   **`message.reaction`**: Reação a uma mensagem.
-   **`message.revoke`**: Mensagem apagada (Revoke for everyone).

## 6. Componentes Internos Detalhados

### `SessionManager` (`src/session.ts`)
É o coração do sistema. Mantém um `Map<number, WhaileysSession>` com as sessões ativas.

-   **Start Flow**:
    1.  Verifica se já existe sessão. Se `force=true`, derruba a anterior.
    2.  Inicializa `useRedisAuthState` para carregar credenciais do Redis.
    3.  Configura navegador (Ubuntu/Chrome para Pairing Code, Mac OS para QR).
    4.  Instancia `makeWASocket`.
    5.  Registra listeners (`connection.update`, `messages.upsert`, `creds.update`).

-   **Tratamento de Mensagens (`handleMessage`)**:
    -   Detecta tipos especiais: Protocol (Revoke), Reaction.
    -   Faz download automático de mídias (convertendo para base64).
    -   Extrai metadados de respostas (Botões, Listas, Enquetes).
    -   Resolve **LID** (Lid ID) para contatos, essencial para a nova arquitetura do WhatsApp, usando cache local (`lidCache`) ou consulta (`onWhatsApp`/`USync`).
    -   Extrai **Link Preview** (título, descrição, thumbnail).
    -   Publica evento `message.received`.

### `Redis Auth State` (`src/helpers/useRedisAuthState.ts`)
Implementação customizada do `AuthState` do Baileys que usa Redis ao invés do sistema de arquivos.
-   Chaves no Redis: `wbot:auth:{sessionId}:{key}`.
-   Permite que containers sejam efêmeros.

## 7. Configuração e Deploy

### Variáveis de Ambiente (.env)
```env
AMQP_URL=amqp://guest:guest@rabbitmq:5672
REDIS_URL=redis://redis:6379
PORT=3334 (para Healthcheck HTTP)
```

### Docker
O serviço é construído a partir do `Dockerfile` na raiz de `engine-standard`.
-   **Base Image**: Node.js (Alpine ou Slim recomendados).
-   **Build**: Compila TypeScript (`npm run build`).
-   **Run**: Executa `node dist/index.js`.

### Comandos Úteis
-   Verificar versão: `curl http://localhost:3334/version`
-   Logs: O serviço utiliza `pino`, logs são estruturados em JSON (ideal para ferramentas como Kibana/Datadog), mas podem ser formatados com `pino-pretty` em desenvolvimento.

## 8. Tratamento de Erros e Resiliência

-   **Reconexão Automática**: O `SessionManager` tenta reconectar automaticamente em casos de queda de conexão (`connection.close`), exceto em casos fatais como `401 Logged Out` (salvo em fluxo de Pairing Code onde há retry específico).
-   **Backoff Exponencial**: O tempo de espera entre tentativas aumenta progressivamente.
-   **Fila Durável**: Comandos enviados enquanto o engine está offline ficam na fila do RabbitMQ e são processados ao reiniciar.
-   **Validação de JID**: Antes de enviar mensagens, o sistema valida e corrige o JID (adiciona `@s.whatsapp.net` ou `@g.us` se necessário) e tenta resolver LIDs.

## 9. Casos de Teste Sugeridos

Para validar a estabilidade do Engine, recomenda-se os seguintes cenários de teste:

| Cenário | Ação | Resultado Esperado |
| :--- | :--- | :--- |
| **Start Session (QR)** | Enviar `session.start` sem `usePairingCode`. | Receber evento `session.qrcode` e status `OPENING`. |
| **Start Session (Pairing)** | Enviar `session.start` com `usePairingCode: true`. | Receber evento `session.pairingcode` com código formato `XXXX-XXXX`. |
| **Reconexão Simples** | Derrubar container do Redis ou simular queda de rede. | Engine deve tentar reconectar com backoff exponencial. |
| **Envio de Texto** | Enviar `message.send.text`. | Receber `message.ack` com status `SENT` (1) e depois `DELIVERED` (2). |
| **Recebimento Mídia** | Enviar imagem do celular para o bot. | Receber `message.received` com `hasMedia: true` e `mediaData` preenchido (base64). |
| **Logout via Celular** | Desconectar aparelho via aplicativo. | Engine deve detectar `401 Logged Out`, limpar sessão e emitir `session.status: DISCONNECTED`. |
| **Conflito de Sessão** | Iniciar sessão já existente com `force: true`. | Sessão anterior deve cair, nova sessão deve iniciar processo de conexão. |

## 10. Pontos de Extensão e Melhorias Futuras

-   **Hydration de Grupos**: Atualmente desabilitado (`logger.info("[HYDRATION] Group hydration disabled")`). Poderia ser reativado para sincronizar participantes de grupos ao conectar.
-   **Fila de Mensagens de Saída**: Implementar uma fila interna no Engine (além do RabbitMQ) para garantir ordem de envio e respeitar rate-limits do WhatsApp de forma mais granular.
-   **Suporte a Sharding**: Para escalar horizontalmente com milhares de sessões, seria necessário implementar sharding de sessões entre múltiplas instâncias do Engine (atualmente todas as instâncias consomem da mesma fila com `wbot.*`, o que causaria conflito se múltiplas instâncias tentassem gerenciar a mesma sessão). A arquitetura atual suporta *High Availability* no sentido de failover (se um cai, outro assume), mas para particionamento de carga seria necessário roteamento consistente.
