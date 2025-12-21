# Fase 2: Extração do WhatsApp Engine (Microsserviço)

Esta é a fase mais crítica, onde removemos a lógica de conexão do monolito e a movemos para workers isolados. A arquitetura deve ser agnóstica à biblioteca subjacente, permitindo o uso intercambiável de **Baileys (Node.js)**, **Whaileys (Node.js Fork)** ou **Whatsmeow (Go)**.

---

## Referências de Bibliotecas e Repositórios

Para esta implementação, utilizaremos as seguintes bibliotecas oficiais e forks mantidos pela comunidade:

### Libs (NPM / GoPkg)
- **Baileys:** [`https://www.npmjs.com/package/baileys`](https://www.npmjs.com/package/baileys)
- **Whaileys:** [`https://www.npmjs.com/package/whaileys`](https://www.npmjs.com/package/whaileys)
- **Whatsmeow:** [`https://pkg.go.dev/go.mau.fi/whatsmeow`](https://pkg.go.dev/go.mau.fi/whatsmeow)

### GitHub Repositories
- **Baileys:** [`https://github.com/WhiskeySockets/Baileys`](https://github.com/WhiskeySockets/Baileys)
- **Whaileys:** [`https://github.com/canove/whaileys`](https://github.com/canove/whaileys)
- **Whatsmeow:** [`https://github.com/tulir/whatsmeow`](https://github.com/tulir/whatsmeow)

---

## Tasks

### [ENG-001] Configuração do Message Broker (RabbitMQ)
**Objetivo:** Subir e configurar a infraestrutura de mensageria que servirá como barramento universal.
**Requisitos:**
- Configurar container RabbitMQ com Management Plugin.
- Definir Exchanges (ex: `whatsapp.events`, `whatsapp.commands`).
- Definir Filas e Bindings padronizados (ex: `msg.incoming`, `msg.send`, `session.status`).
- Criar usuários e vhosts seguros.
**Critérios de Aceite:**
- RabbitMQ acessível.
- Script de "setup" da topologia (filas/exchanges) criado e versionado.
**Estimativa:** 4 horas

### [ENG-002] Definição do Contrato de Interface (Protocolo)
**Objetivo:** Criar um padrão JSON estrito para comandos e eventos, independente da linguagem/biblioteca.
**Requisitos:**
- Documentar payload para `START_SESSION`, `SEND_MESSAGE`, `LOGOUT`.
- Documentar payload para eventos `MESSAGE_RECEIVED`, `QR_CODE_UPDATED`, `CONNECTION_CHANGED`.
- O payload deve abstrair diferenças entre Baileys/Whatsmeow (ex: normalizar status da conexão).
**Critérios de Aceite:**
- Documento Markdown (`PROTOCOL.md`) aprovado.
- Schemas JSON (ou Zod/Protobuf) criados para validação.
**Estimativa:** 6 horas

### [ENG-003] Criação do Engine "Standard" (Node.js - Baileys/Whaileys)
**Objetivo:** Criar o microsserviço principal em Node.js que suporta Baileys e seu fork Whaileys.
**Requisitos:**
- Setup de projeto TypeScript limpo.
- Implementar **Adapter Pattern** para facilitar troca entre `Baileys` original e `Whaileys`.
- Variável de ambiente `ENGINE_LIB=baileys|whaileys` define qual biblioteca carregar.
- Conexão com RabbitMQ implementando o Contrato definido em ENG-002.
**Critérios de Aceite:**
- Serviço inicia e conecta no RabbitMQ.
- Trocando a ENV, o log mostra "Starting with Whaileys" ou "Starting with Baileys".
**Estimativa:** 24 horas

### [ENG-004] Implementação do Engine "High Performance" (Go - Whatsmeow)
**Objetivo:** Criar versão alternativa do worker em Go para alta densidade de conexões.
**Requisitos:**
- Projeto Go estruturado.
- Implementar wrapper para biblioteca `whatsmeow`.
- Implementar o mesmo Contrato JSON definido em ENG-002 (deve ser indistinguível para o Core).
- Suporte a SQLite ou conexão direta no Postgres para armazenar sessões do Whatsmeow.
**Critérios de Aceite:**
- Enviar comando JSON na fila `whatsapp.commands` faz o container Go iniciar sessão Whatsmeow.
- Core recebe mensagem vinda do container Go sem saber que não é Node.js.
**Estimativa:** 40 horas

### [ENG-005] Adaptação do Core (Monolito) para Consumidor Agnostico
**Objetivo:** Alterar o Whaticket atual para não conectar diretamente, mas falar com o barramento.
**Requisitos:**
- Remover `libs/wbot.ts` e `services/WbotServices` (lógica de conexão local).
- Criar `Services/WbotProxyService` que publica mensagens no RabbitMQ.
- Criar Consumers que escutam `msg.incoming` e chamam `CreateMessageService`.
- Core deve permitir selecionar qual Engine usar por Tenant (via flag no banco `connection_type: 'go' | 'node'`).
**Critérios de Aceite:**
- Tenant A (Node) e Tenant B (Go) funcionam simultaneamente no mesmo Whaticket Core.
**Estimativa:** 32 horas
