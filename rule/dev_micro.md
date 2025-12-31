### Projeto watic Premium

Sempre responder e ou criar planos documentos em portugues do brasil

Repositorio: https://github.com/alltomatos/whaticket-premium.git

O projeto deve sempre focar na stack Docker contida em `watink`.

Repositorio Original: https://github.com/canove/whaticket-community.git

---

## Roadmap: Transformação Microservices & SaaS

Acompanhamento das etapas definidas em `docs/tasks_microservice/`.

A cada finalização de etapa marcar como concluido.

### Fase 1: Arquitetura de Dados SaaS
- [x] **[DB-001] Design da Estrutura Multi-tenant** (Concluído: Planejamento em `docs/tasks_microservice/artifacts/DB-001_multitenancy_plan.md`)
- [x] **[DB-002] Implementação de RLS (Row Level Security)** (Concluído: Migrations criadas em `backend/src/database/migrations` e `backend/dist/database/migrations`)
- [x] **[DB-003] Estratégia de Backup e Recuperação (PITR)** (Concluído: Estratégia em `docs/tasks_microservice/artifacts/DB-003_backup_strategy.md` e scripts em `scripts/database/`)
- [x] **[DB-004] Preparação para Escalabilidade Horizontal (Read Replicas)** (Concluído: Configuração de replication no `database.ts` e variável `DB_READ_HOST`)

### Fase 2: Extração do WhatsApp Engine
- [x] **[ENG-001] Configuração do Message Broker (RabbitMQ)** (Concluído: Adicionado ao `docker-compose.yaml` e documentado em `docs/tasks_microservice/artifacts/ENG-001_message_broker_setup.md`)
- [x] **[ENG-002] Definição do Contrato de Interface (Protocolo)** (Concluído: Documentado em `docs/tasks_microservice/artifacts/ENG-002_protocol_definition.md` e Tipos TS em `backend/src/microservice/contracts.ts`)
- [x] **[ENG-003] Criação do Engine "Standard" (Node.js - Baileys/Whaileys)** (Concluído: Código em `engine-standard/`, serviço renomeado para `whaileys-engine`)
- [x] **[ENG-004] Implementação do Engine "High Performance" (Go - Whatsmeow)** (Concluído: Código em `engine-go/`, serviço preparado (comentado) no `docker-compose.yaml`)
- [x] **[ENG-005] Adaptação do Core (Monolito) para Consumidor Agnostico** (Concluído: Backend desacoplado do wwebjs, envia comandos via RabbitMQ e consome eventos via EventListener)

### Validação da Migração Whaileys & Microserviços (Dez 2025)

#### 1. Arquitetura de Comunicação
O projeto agora opera em arquitetura de microserviços orientada a eventos, substituindo a biblioteca local `whatsapp-web.js`.

*   **Protocolo**: AMQP (RabbitMQ)
*   **Serviços**:
    *   `Backend` (Producer de Comandos / Consumer de Eventos)
    *   `whaileys-engine` (Consumer de Comandos / Producer de Eventos) - Baseado em **Whaileys** (Baileys Wrapper)

#### 2. Fluxos de Dados
*   **Start Session**: `Backend` -> `wbot.commands` (session.start) -> `whaileys-engine` -> `wbot.events` (session.qrcode / session.status) -> `Backend`
*   **Send Message**: `Backend` -> `wbot.commands` (message.send.text) -> `whaileys-engine` -> WhatsApp API
*   **Receive Message**: WhatsApp API -> `whaileys-engine` -> `wbot.events` (message.received) -> `Backend`

#### 3. Compatibilidade e Banco de Dados
*   **Banco de Dados**: PostgreSQL com suporte a RLS (Row Level Security) para multi-tenancy.
*   **Migrations**: Scripts de migração (`20251220...`) garantem a estrutura `tenantId` em todas as tabelas críticas.
*   **Whaileys**: O serviço `whaileys-engine` implementa a interface compatível com o protocolo definido, utilizando `@hapi/boom` para tratamento de erros de desconexão.

#### 4. Variáveis de Ambiente Críticas
```bash
# Backend & Engine
AMQP_URL=amqp://***REMOVED_AMQP_CREDENTIALS***@rabbitmq:5672
DB_DIALECT=postgres
DB_HOST=postgres
POSTGRES_DB=watic
```

### Fase 3: Frontend & Dashboard SaaS
- [x] **[FRONT-001] Design de Wireframes e Fluxos (Admin SaaS)** (Concluído: Documento de design criado em `docs/tasks_microservice/artifacts/FRONT-001_saas_frontend_design.md`)
- [x] **[FRONT-002] Adaptação do Login e Autenticação** (Concluído: Backend suporta tenantId no JWT, Frontend redireciona Super Admin. Seed de Tenant Default criado.)
- [x] **[FRONT-003] Desenvolvimento do Painel Super Admin** (Concluído: Backend CRUD Tenants, Frontend Página de Tenants e Modal de Edição.)
- [x] **[FRONT-004] Dashboards Personalizáveis por Cliente** (Concluído: Widgets implementados e persistência de layout via tabela Users.)

### Fase 4: DevOps, Infraestrutura e Deploy
- [x] **[OPS-001] Containerização e Orquestração (Docker Swarm/K8s)** (Concluído: Arquivo `docker-stack.yml` criado com definição de serviços e limites de recursos.)
- [x] **[OPS-002] Configuração do API Gateway (Traefik/Nginx)** (Concluído: Traefik configurado no stack com roteamento dinâmico. Documentação em `docs/tasks_microservice/artifacts/OPS-002_api_gateway_config.md`.)
- [ ] **[OPS-003] Pipelines de CI/CD**
- [ ] **[OPS-004] Procedimentos de Rollback e Monitoramento**

### Fase 5: Flow Engine Scalability (Novo)
- [ ] **[FLOW-001] Event-Driven Architecture**: Refatorar `wbotMessageListener` para publicar eventos de fluxo no RabbitMQ ao invés de executar síncrono.
- [ ] **[FLOW-002] Flow Worker Service**: Criar microserviço dedicado (`flow-engine-worker`) para processar a fila de fluxos.
- [ ] **[FLOW-003] Redis State Cache**: Implementar cache de sessões ativas no Redis para reduzir load no Postgres.
