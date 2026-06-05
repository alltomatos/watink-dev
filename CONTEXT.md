# Watink
Plataforma open-source de atendimento e automação no WhatsApp com arquitetura de microsserviços, multitenancy via PostgreSQL RLS, e sistema de plugins com licenciamento centralizado.

## Language

**Ticket**: Unidade central de atendimento — representa uma conversa ativa entre um Contact e um User em um Queue. Criada automaticamente ao receber uma mensagem ou manualmente por um agente.
_Avoid_: Case, chamado, issue, conversation

**Contact**: Pessoa ou grupo do WhatsApp que envia ou recebe mensagens. Pode ser individual (pessoa) ou grupo (isGroup=true). Vincula-se a um Ticket como remetente.
_Avoid_: Customer, client, destinatário, pessoa

**User**: Agente ou administrador da plataforma que atende Tickets. Possui perfil, permissões, roles e filas associadas.
_Avoid_: Agent, attendant, operador, atendente

**Queue**: Departamento ou fila de atendimento que agrupa Tickets. Define estratégia de distribuição (Round-Robin ou Balanced) e saudações. Possui associação many-to-many com Whatsapps.
_Avoid_: Department, team, setor, fila (ambíguo em PT sem contexto)

**ChannelSession**: Sessão ativa de um canal de comunicação (WhatsApp/Telegram). Contém QR code, status de conexão, e configurações por tenant. Representa o estado runtime de um Whatsapp.
_Avoid_: Session, conexão, wbot, instancia

**Whatsapp**: Configuração persistente de um número de WhatsApp. Referência lógica que dá origem a ChannelSessions. Associa-se a Queues via tabela de junção.
_Avoid_: WABA, número, telefone, channel

**Message**: Mensagem individual dentro de um Ticket. Pode ser de texto, mídia, reação ou sistema. Rastreada por Ack (0=pending, 1=sent, 2=delivered, 3=read, 4=error).
_Avoid_: Msg, texto, notificação

**Flow**: Automação visual construída no FlowBuilder. Define chatbots, menus de navegação, e integrações API/Webhook. Executado pelo FlowWorker via RabbitMQ.
_Avoid_: Automation, workflow, bot, chatbot

**Pipeline**: Funil de vendas com estágios sequenciais. Cada Deal pertence a um PipelineStage e opcionalmente a um Ticket.
_Avoid_: Funnel, CRM, sales-flow

**Deal**: Oportunidade comercial dentro de um Pipeline. Rastreia progresso de vendas vinculado a um Contact.
_Avoid_: Opportunity, lead, negócio

**Tag**: Marcador categorial aplicado polimorficamente a entidades (Tickets, Contacts, etc.) via EntityTag. Agrupa-se em TagGroups.
_Avoid_: Label, marca, categoria

**Protocol**: Registro formal de atendimento no Helpdesk. Vincula-se a um Contact e opcionalmente a um Ticket.
_Avoid_: Atendimento, registro, chamado helpdesk

**KnowledgeBase**: Base de conhecimento com fontes (KnowledgeBaseSource) para resposta automática assistida por IA.
_Avoid_: FAQ, wiki, documentação

**QuickAnswer**: Resposta rápida predefinida para agilizar atendimento de Tickets.
_Avoid_: Template, canned response, resposta padrão

**Tenant**: Organização cliente na plataforma SaaS. Isolamento de dados garantido por PostgreSQL RLS (`app.current_tenant`). Cada Tenant possui Users, Queues, Whatsapps, e Settings próprios.
_Avoid_: Account, organization, empresa, cliente

**Role**: Conjunto nomeado de Permissions com escopo (ABAC via Scope/Conditions JSONB em RolePermission). Usuários e Groups associam-se a Roles.
_Avoid_: Profile, perfil, cargo

**Permission**: Capacidade granular de ação no sistema. Associada a Users, Roles, e Groups.
_Avoid_: Ability, capacidade, permissão (genérica)

**Group**: Agrupamento de Users com Roles e Permissions compartilhadas. Herda permissões de Roles associadas.
_Avoid_: Team, equipe, grupo (ambíguo sem contexto)

**DistributionStrategy**: Estratégia de atribuição de Tickets a Users dentro de um Queue. Valores: `AUTO_ROUND_ROBIN` (sequência cíclica) ou `AUTO_BALANCED` (menor carga).
_Avoid_: Assignment, alocação, round-robin (isolado)

**DomainEvent**: Evento de domínio emitido pelo sistema (TicketAssigned, MessageReceived, TicketStatusChanged, ContactCreated, SessionStatusChanged). Transportado via RabbitMQ ou EventBus interno.
_Avoid_: Event (genérico), notificação, trigger

**RabbitMQService**: Serviço de mensageria que publica comandos (`wbot.commands`) e consome eventos (`wbot.events`) entre Business e Engine. Gerencia DLQ com retry exponencial.
_Avoid_: Message broker, queue service, AMQP

**CommandPublisher**: Interface publicadora de comandos RabbitMQ com apenas PublishCommand(routingKey, payload). Usada por controllers que enviam mensagens ao Engine.
_Avoid_: RabbitMQ client, publisher interface

**EventConsumer**: Interface consumidora de eventos RabbitMQ. Publico é interno via EventListener — controllers não consomem diretamente events.
_Avoid_: RabbitMQ subscriber, consumer interface

**EventBus**: Interface interna do Go para publish/subscribe de DomainEvents. Distinto de RabbitMQ — é para eventos internos dentro do mesmo processo.
_Avoid_: Event system, message bus, event dispatcher

**CommandPublisher**: Interface publicadora de comandos RabbitMQ com apenas PublishCommand(routingKey, payload). Usada por controllers que enviam mensagens ao Engine.
_Avoid_: RabbitMQ client, publisher interface

**EventConsumer**: Interface consumidora de eventos RabbitMQ. Publico é interno via EventListener — controllers não consomem diretamente events.
_Avoid_: RabbitMQ subscriber, consumer interface

**EventBus**: Interface interna do Go para publish/subscribe de DomainEvents. Distinto de RabbitMQ — é para eventos internos dentro do mesmo processo.
_Avoid_: Event system, message bus, event dispatcher

**FlowWorker**: Consumidor de eventos do `api.events` exchange que executa Flows automaticamente quando Tickets mudam de estado.
_Avoid_: Flow executor, automation engine, bot runner

**Engine**: Microsserviço Go (engine-go) que gerencia conexões WhatsApp via whatsmeow. Consome comandos de sessão e emite eventos de volta ao Business.
_Avoid_: Bot, connector, wbot engine

## Entity Relationships (Canonical)

```
Tenant ──1:N──> User
Tenant ──1:N──> Queue
Tenant ──1:N──> Whatsapp
Tenant ──1:N──> Setting
Tenant ──1:N──> Ticket

User ──M:N──> Queue        (via user_queues)
User ──M:N──> Permission   (via user_permissions)
User ──M:N──> Role          (via user_roles)

Queue ──M:N──> Whatsapp     (via whatsapp_queues)
Queue ──self──> Queue        (ParentID)

Contact ──1:N──> Ticket
Ticket ──1:N──> Message
Ticket ──N:1──> Queue
Ticket ──N:1──> User (assignee)

Whatsapp ──1:N──> Ticket

Group ──M:N──> Permission   (via group_permissions)
Group ──M:N──> Role          (via group_roles)

Role ──M:N──> Permission     (via role_permissions, com Scope/Conditions JSONB)
```

## RabbitMQ Routing Key Pattern

`wbot.{tenantId}.{sessionId}.{domainEvent}`

### Command Direction (Business → Engine)
- `wbot.{t}.{s}.session.start|stop|delete`
- `wbot.{t}.{s}.message.send.text|media`
- `wbot.{t}.{s}.message.markAsRead`

### Event Direction (Engine → Business)
- `wbot.{t}.{s}.session.qrcode|pairing_code|status|history_sync`
- `wbot.{t}.{s}.message.received|ack|revoke|reaction`
- `wbot.{t}.{s}.contact.update`
