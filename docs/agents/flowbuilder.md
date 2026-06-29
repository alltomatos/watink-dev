# FlowBuilder — Contexto para Agentes

## Responsabilidade

Runtime de automação **genérico** do Watink. O "chatbot" é apenas um perfil de uso;
o motor executa qualquer grafo de automação (atendimento interativo, disparos
não-interativos, agendamentos, campanhas). A unidade de execução é o **FlowRun** —
uma instância viva de um grafo em andamento.

Conceito-chave: **interativo e não-interativo são o MESMO registro**, suspendendo em
pontos diferentes. Um bot que "espera resposta" e um disparo agendado que "espera o
horário" são ambos `FlowRun` parados em um estado de espera distinto. Substitui o
antigo conceito `FlowSession` (que existia apenas comentado em `worker.go`).

> Estamos em **DEV**: sem dado de produção, sem back-compat pesado. O contrato pode
> evoluir com migração simples; o que não muda são os invariantes abaixo.

---

## Visão do runtime

```
Trigger (read-path por classe) ──► cria FlowRun (snapshot do grafo)
                                         │
                                         ▼
                            ┌──── worker / dispatch loop ────┐
                            │  carrega NodeExecutor por type  │
                            │  executa currentNode            │
                            │  resultado:                     │
                            │   • Continue(nextNodeId)        │
                            │   • Wait(state, resumeAt?)      │
                            │   • Complete / Abort             │
                            └─────────────┬───────────────────┘
                                          │ Wait
                                          ▼
                          persiste estado + resumeAt (se houver)
                                          │
                       ┌──────────────────┴───────────────────┐
                       │ waiting_message  ◄── inbound do contato│
                       │ waiting_until    ◄── scheduler (resumeAt)│
                       │ waiting_event    ◄── trigger interno    │
                       └──────────────────┬───────────────────┘
                                          ▼
                                  publica flow.resume → volta ao loop
```

- O grafo é a **fonte da verdade**. Nada de lógica de fluxo no engine-go.
- Ações de envio são **portas plugáveis** (`OutboundChannelAdapter`) — ver Channel Adapters.
- O tempo é governado por `resumeAt` varrido por um **scheduler com leader-lock Redis** —
  nunca `time.Sleep` para delays longos.

---

## Modelo de dados

### FlowRun (`business/internal/models/flow_run.go`)

```go
type FlowRun struct {
    ID           uuid.UUID    // PK
    TenantID     uuid.UUID    // RLS / scoping manual no worker
    FlowID       uuid.UUID    // grafo de origem
    Status       string       // running | waiting_message | waiting_until | waiting_event | completed | aborted | expired
    CurrentNodeID string      // nó onde a execução está parada/rodando
    SubjectType  string       // ticket | contact | none
    SubjectID    *uuid.UUID   // nullable (none → nil)
    Vars         JSONB        // estado de variáveis do run (interpolável)
    ResumeAt     *time.Time   // nullable — set apenas em waiting_until
    ExpiresAt    *time.Time   // TTL do run (limpeza de runs órfãos)
    GraphSnapshot JSONB       // SNAPSHOT do FlowGraph no start (run roda a versão que iniciou)
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

### Flow (`business/internal/models/flow.go`)

```go
type Flow struct {
    ID        uuid.UUID
    TenantID  uuid.UUID
    Name      string
    Active    bool          // gate global de elegibilidade a trigger
    Graph     JSONB         // FlowGraph canônico (verdade)

    // Colunas-índice PROJETADAS do grafo no save (read-path barato):
    TriggerClass string     // message-inbound | schedule | event | manual | webhook-inbound
    TriggerKeyword *string  // p/ message-inbound keyword
    TriggerCron  *string    // p/ schedule
    TriggerEvent *string    // p/ event (ex: "ticket.created", "deal.stage_changed")
}
```

### FlowGraph — contrato versionado (`business/internal/flow/graph.go`)

```go
type FlowGraph struct {
    SchemaVersion int        `json:"schemaVersion"` // ausência = v1 default
    Nodes         []Node     `json:"nodes"`
    Edges         []Edge     `json:"edges"`
}

type Node struct {
    ID    string          `json:"id"`
    Type  string          `json:"type"`   // chave do registry de NodeExecutor
    Data  json.RawMessage `json:"data"`   // NodeData específico por tipo
}

type Edge struct {
    ID     string  `json:"id"`
    Source string  `json:"source"`        // node.id origem
    Target string  `json:"target"`        // node.id destino
    Handle *string `json:"handle"`        // saída nomeada (branch/condição)
}
```

Structs Go espelham `NodeData`/`Edge`. Validado em `Create`/`Update` (ver Endpoints).

---

## Contrato `NodeExecutor` + registry/dispatch

Cada `node.type` tem um executor. O dispatch é por `type` via registry — nunca `switch`
gigante inline.

```go
// business/internal/flow/executor.go
type NodeExecutor interface {
    // Type retorna a chave do registry (== node.type).
    Type() string

    // Validate roda no Create/Update do flow (estático, sem run).
    Validate(node Node) error

    // Execute roda dentro de um FlowRun. Retorna a decisão de transição.
    Execute(ctx ExecCtx, node Node) (ExecResult, error)
}

type ExecCtx struct {
    Run      *FlowRun           // mutável: executor pode escrever em Run.Vars
    Tenant   uuid.UUID
    Adapters ChannelAdapterSet  // portas de saída
    LLM      LLMClient          // settings do tenant (padrão PipelineController.AISuggest)
    Logf     func(level, msg string, kv map[string]any) // → FlowRunLog
}

type ExecResult struct {
    Action   ResultAction       // Continue | Wait | Complete | Abort
    NextEdge *string            // handle da saída escolhida (Continue) — resolve nextNodeId
    WaitState string            // waiting_message | waiting_until | waiting_event (Wait)
    ResumeAt *time.Time         // set apenas em waiting_until
    AwaitEvent *string          // set apenas em waiting_event
}
```

### Registry / dispatch

```go
// Registro em main.go (DI PURA — sem container global, sem singleton)
registry := flow.NewExecutorRegistry()
registry.Register(NewMessageExecutor(adapters))
registry.Register(NewWaitInputExecutor())
registry.Register(NewDelayExecutor())
registry.Register(NewConditionExecutor())
registry.Register(NewLLMExecutor(llm))
registry.Register(NewPipelineExecutor(dealSvc))
// ...

// Dispatch no worker:
exec, ok := registry.Get(node.Type)
if !ok { return abort("unknown node type") } // nunca deve ocorrer: Validate barra no save
res, err := exec.Execute(ctx, node)
```

- Tipo desconhecido em runtime = bug (o `Validate` no save já rejeita). Trate como `abort`,
  registre no `FlowRunLog` e alerte — nunca silencie.
- Executores não fazem I/O de canal direto: usam `ctx.Adapters`.

---

## Ciclo de vida do FlowRun (estados + transições)

| Estado            | Significado                                        | Sai para                                   |
|-------------------|----------------------------------------------------|--------------------------------------------|
| `running`         | Executando nós em sequência                        | qualquer estado de espera, `completed`, `aborted` |
| `waiting_message` | Suspenso aguardando inbound do contato             | `running` (no inbound) / `expired` (TTL)   |
| `waiting_until`   | Suspenso até `resumeAt` (delay/cron)               | `running` (scheduler resume) / `expired`   |
| `waiting_event`   | Suspenso aguardando evento interno (ticket/deal)   | `running` (evento casado) / `expired`      |
| `completed`       | Grafo chegou a um nó terminal                      | — (terminal)                               |
| `aborted`         | Interrompido (opt-out, erro fatal, abort manual)   | — (terminal)                               |
| `expired`         | `expiresAt` venceu enquanto esperava               | — (terminal)                               |

Transições:

```
[start] → running
running → Continue → running (próximo nó)
running → Wait(waiting_message)  → waiting_message
running → Wait(waiting_until,t)  → waiting_until (resumeAt=t)
running → Wait(waiting_event,e)  → waiting_event
running → Complete → completed
running → Abort    → aborted
waiting_* (inbound|resume|event) → running   [via UPDATE condicional de status]
waiting_* (expiresAt<=now)       → expired    [varredura de limpeza]
qualquer não-terminal (opt-out STOP) → aborted [opt-out vence sempre]
```

**Regra de retomada (anti-double-resume):** o resume só ocorre via **UPDATE condicional**
(`UPDATE ... SET status='running' WHERE id=? AND status='waiting_*'`). Se 0 linhas
afetadas, outro worker já pegou — descarta. Ver Edge cases.

---

## Contrato de dados por tipo de nó

`node.data` é validado por `Validate()` do executor correspondente. Schemas iniciais
(v1) — todos com texto interpolável via `interpolateVariables` (reuso do QuickAnswers;
variável ausente → string vazia).

### `trigger` (nó de entrada — autora o trigger polimórfico)
```json
{
  "class": "message-inbound",
  "match": { "mode": "keyword", "keyword": "menu" }
}
```
`class` ∈ `message-inbound | schedule | event | manual | webhook-inbound`.
`match.mode` (para message-inbound) ∈ `keyword | firstContact | any`.
Para `schedule`: `{ "class": "schedule", "cron": "0 9 * * 1" }`.
Para `event`: `{ "class": "event", "event": "deal.stage_changed" }`.
**Estes campos são projetados para as colunas-índice de `Flow` no save.**

### `message` (envio de saída via adapter)
```json
{
  "channel": "whatsapp",
  "quickAnswerId": 42,
  "inline": { "type": "text", "body": "Olá *{{contact_name}}*" }
}
```
Usa `quickAnswerId` (reuso de template) **ou** `inline`. `channel` seleciona o adapter.

### `wait_input` (suspende em `waiting_message`)
```json
{
  "saveAs": "resposta_menu",
  "timeoutSeconds": 86400,
  "onTimeoutEdge": "timeout"
}
```
Salva a próxima mensagem do contato em `Run.Vars[saveAs]`. `timeoutSeconds` define
`expiresAt`; se vencer, resume pela saída `onTimeoutEdge`.

### `delay` (suspende em `waiting_until`)
```json
{ "durationSeconds": 3600 }
```
Calcula `resumeAt = now + duration`. **Nunca** `time.Sleep`. O scheduler resume.

### `condition` (branch)
```json
{
  "branches": [
    { "handle": "vip", "expr": "vars.tier == 'vip'" },
    { "handle": "default", "expr": "true" }
  ]
}
```
Avalia `expr` sobre `Run.Vars`; segue o primeiro `handle` verdadeiro (ordem importa).

### `llm` (resposta gerada — RAG na Fase 2)
```json
{
  "systemPrompt": "Responda só com base no contexto.",
  "saveAs": "ia_resposta",
  "useKnowledge": true
}
```
LLM via settings do tenant (padrão `PipelineController.AISuggest`). `useKnowledge=true`
ativa retrieval pgvector tenant-scoped (gate `aiKnowledgeEnabled`).

### `pipeline` / `ticket` (ações de serviço interno)
```json
{ "action": "moveDeal", "stageId": 7 }
```
Despacha ao serviço interno (DealService / TicketService) via adapter `pipeline`/`ticket`.

---

## Trigger polimórfico + projeção

Classes:

| Classe             | Sub-modos / chave                          | Resume/entrada                         |
|--------------------|--------------------------------------------|----------------------------------------|
| `message-inbound`  | `keyword` · `firstContact` · `any`         | inbound do contato (event_listener)    |
| `schedule`         | `cron`                                      | scheduler (Fase 3)                     |
| `event`            | `ticket.*` · `deal.*`                       | emissor interno (Fase 6)               |
| `manual` / `api`   | disparo explícito                           | `POST /flows/:id/run`                  |
| `webhook-inbound`  | endpoint público assinado                    | webhook (Fase 6)                       |

**Projeção (grafo = verdade, colunas = índice de leitura barato):** o nó `trigger`
autora a configuração; no `Create`/`Update` do flow, os campos são **projetados** para
`Flow.TriggerClass`, `Flow.TriggerKeyword`, `Flow.TriggerCron`, `Flow.TriggerEvent`.
O **read-path faz fan-out por classe** consultando essas colunas — não varre grafos.

**Precedência (Decisão A — "sessão manda"):**
1. Existe `FlowRun` ativo para o subject? → **ignora novos triggers** (o run em andamento
   tem prioridade).
2. **Exceção que vence sempre:** opt-out (`PARAR` / `STOP` / `SAIR`) → aborta o run ativo
   imediatamente, independentemente de estado.

```
inbound chega → opt-out? ──sim──► abort run ativo (vence sessão)
                  │não
                  ▼
          run ativo p/ subject? ──sim──► entrega ao run (waiting_message), ignora trigger
                  │não
                  ▼
          match por TriggerKeyword/firstContact/any → cria FlowRun novo
```

---

## Channel Adapters

Ações são **portas de saída plugáveis**. O `business` orquestra; o `engine-go` permanece
um adapter **burro** (send-by-sessionId).

```go
type OutboundChannelAdapter interface {
    Channel() string // "whatsapp" | "email" | "api" | "pipeline" | "ticket"
    Send(ctx ExecCtx, msg OutboundMessage) (sentID string, err error)
}
```

| Canal      | Destino                         | Notas                                                              |
|------------|---------------------------------|--------------------------------------------------------------------|
| `whatsapp` | engine-go via AMQP              | contrato `wbot.<tenant>.<session>.<cmd>`; routing key carrega o tipo |
| `email`    | SMTP (business-side)            | **Fase 6** (movido de F3)                                          |
| `api`      | HTTP outbound                   | webhook/integração externa                                          |
| `pipeline` | DealService (serviço interno)   | mover/criar deal                                                    |
| `ticket`   | TicketService (serviço interno) | atribuir/fechar/tag                                                 |

**Invariantes do adapter WhatsApp:**
- Pacing, rotação de chip, anti-ban → **100% no business**. O engine-go NÃO conhece campanha.
- Payload de envio precisa de `to` / `messageId` / `sessionId`; grupos usam `@g.us`.
- **Dedup por `env.ID`** (Redis TTL 24h, padrão `wbot:msg:`) **antes de qualquer envio real**.

---

## FlowRunLog / observabilidade

Toda execução grava trilha por nó. Permite replay/depuração e é a base do `/simulate`.

```go
type FlowRunLog struct {
    ID         uuid.UUID
    TenantID   uuid.UUID
    FlowRunID  uuid.UUID
    NodeID     string
    NodeType   string
    Level      string    // info | warn | error
    Message    string
    VarsDelta  JSONB     // o que mudou em Run.Vars neste passo
    Edge       *string   // saída escolhida (se houve transição)
    DurationMs int
    CreatedAt  time.Time
}
```

- `ctx.Logf` é a única via de escrita (executores não tocam a tabela direto).
- Erros de adapter, abort, expiração e opt-out **sempre** geram log `level=error|warn`.
- Logs são tenant-scoped e expiram com TTL (alinhado a `expiresAt` do run + janela de auditoria).

---

## Endpoints

### CRUD (`business/internal/controllers/flow_controller.go`)
| Método | Rota | Input | Output |
|---|---|---|---|
| `GET`  | `/flows` | — | `[]Flow` tenant-scoped |
| `GET`  | `/flows/:id` | — | `Flow` com `graph` |
| `POST` | `/flows` | `{name, graph}` | `Flow` (valida grafo + projeta colunas) |
| `PUT`  | `/flows/:id` | `{name, graph, active}` | `Flow` (revalida + reprojeta) |
| `DELETE` | `/flows/:id` | — | `204` (não afeta runs já snapshotados) |

### Ciclo de vida do run
| Método | Rota | Input | Output |
|---|---|---|---|
| `GET`  | `/flows/:id/runs` | filtros `?status=` | `[]FlowRun` |
| `GET`  | `/flowRuns/:runId` | — | `FlowRun` + último estado |
| `GET`  | `/flowRuns/:runId/logs` | — | `[]FlowRunLog` (trilha) |
| `POST` | `/flowRuns/:runId/abort` | — | aborta run ativo (manual) |

### Disparo e simulação
| Método | Rota | Input | Output |
|---|---|---|---|
| `POST` | `/flows/:id/run` | `{subjectType, subjectId?, vars?}` | cria `FlowRun` (snapshot do grafo atual) e enfileira |
| `POST` | `/flows/:id/simulate` | `{vars?, inboundScript?[]}` | **dry-run**: percorre o grafo SEM efeitos externos, retorna trilha simulada |

**`/simulate` (dry-run):** executa o grafo com adapters em **modo no-op** (não envia
WhatsApp, não toca DB de deals, não despacha AMQP). Retorna a sequência de nós, branches
escolhidos e `vars` resultantes — para validar lógica antes de publicar. Nunca cria
`FlowRun` real nem grava `FlowRunLog` persistente.

Validação no `Create`/`Update` rejeita: `node.type` desconhecido, IDs de nó duplicados,
edges órfãs (source/target inexistente), `schemaVersion` futuro. Ausência de
`schemaVersion` = v1 default.

---

## Edge cases críticos

- **Reentrância / lock no resume:** dois workers podem receber `flow.resume` do mesmo run.
  Resume só via **UPDATE condicional** (`WHERE status='waiting_*'`); 0 linhas = já tratado,
  descarta. Lock por `FlowRun.id` no scheduler (Redis SetNX) reforça.
- **Dedup de envio:** todo `message` checa `env.ID` no Redis (`wbot:msg:`, TTL 24h) antes
  de enviar. Reentrância não pode reenviar a mesma mensagem.
- **Runs órfãos:** `expiresAt` vencido em qualquer estado de espera → varredura marca
  `expired`. Nenhum run espera para sempre. TTL obrigatório no start.
- **Versionamento via snapshot:** o run roda o `GraphSnapshot` capturado no start. Editar
  o `Flow` **não afeta runs em andamento** — só novos runs pegam o grafo novo. `DELETE` do
  flow não mata runs vivos (rodam pelo snapshot).
- **Opt-out vs sessão (Decisão A):** `FlowRun` ativo ignora novos triggers ("sessão manda"),
  **mas** `PARAR`/`STOP`/`SAIR` aborta o run sempre — opt-out tem precedência absoluta.
- **Isolamento de tenant:** RLS do Postgres é **INERTE no worker** (a app nunca faz
  `SET app.current_tenant`). Logo, **WHERE tenantId manual** em toda query do worker e
  `auth.GetScoped` nos controllers. Escritas usam `Session(NewDB:true)` (armadilha de reuso
  do `db` escopado GORM).
- **Delay longo ≠ Sleep:** `delay`/`schedule` setam `resumeAt`; a fonte da verdade do tempo
  é o scheduler varrendo `resumeAt<=now` com leader-lock Redis. `time.Sleep` para delays
  longos é proibido.
- **Trigger durante run ativo:** novos inbounds vão para o `waiting_message` do run vivo
  (não criam run novo) — exceto opt-out.

---

## Invariantes (nunca violar)

- Worker: **WHERE tenantId manual** sempre (RLS é inerte); controllers: `auth.GetScoped(c, "Flows")`.
- Escritas no worker: `Session(NewDB:true)` — nunca reusar o `db` escopado GORM.
- Resume sempre por **UPDATE condicional de status** (anti-double-resume).
- Dedup por `env.ID` (Redis TTL 24h) **antes** de qualquer envio real.
- Nunca `time.Sleep` para delays longos — `resumeAt` + scheduler.
- Interpolação reusa `interpolateVariables` do QuickAnswers (var ausente → string vazia).
- LLM via settings do tenant (padrão `PipelineController.AISuggest`).
- Run roda o `GraphSnapshot` do start — edição do flow não muta runs vivos.
- Grafo é a verdade; colunas de trigger são índice projetado no save.
- engine-go é adapter burro — pacing/rotação/email ficam no business.

## O que NÃO fazer

- Não ressuscitar `FlowSession` — o registro é `FlowRun`.
- Não fazer `time.Sleep` para delays/cron — usar `resumeAt` + scheduler.
- Não confiar em RLS no worker — sempre filtrar `tenantId` manualmente.
- Não reusar o `db` escopado GORM em escritas — `Session(NewDB:true)`.
- Não montar lógica de fluxo no engine-go — ele só envia por `sessionId`.
- Não editar grafo esperando afetar runs em andamento (rodam pelo snapshot).
- Não deixar trigger novo sobrescrever run ativo (exceto opt-out).
- Não enviar sem checar dedup `env.ID`.
- Não retornar stages/respostas fixas no nó `llm` — chamar o LLM configurado do tenant.
- Não emitir webhook/event triggers nem EmailAdapter antes da Fase 6.

---

## Critério de sucesso por fase

**Fase 0 — Fundação**
1. Modelos `Flow`/`FlowRun`/`FlowRunLog` migrados; `FlowGraph` validado no Create/Update.
2. Registry de `NodeExecutor` com dispatch por `type`; tipo desconhecido rejeitado no save.
3. `POST /flows/:id/simulate` percorre grafo em no-op e retorna trilha.

**Fase 1 — Interativo core (caminho crítico)**
1. Trigger `keyword` cria `FlowRun`; nó `message` envia via adapter WhatsApp (dedup ativo).
2. `wait_input` suspende em `waiting_message`; inbound do contato resume e salva em `Vars`.
3. `condition` faz branch correto; opt-out `STOP` aborta run ativo.
4. Run roda pelo snapshot mesmo após editar o flow.

**Fase 2 — RAG (livre, paralela)**
1. Nó `llm` com `useKnowledge` faz retrieval pgvector tenant-scoped (HNSW cosine, dim 1536).
2. Guardrails: responde só do contexto + citação obrigatória + handoff humano em baixa confiança.
3. Gate `aiKnowledgeEnabled` espelha `aiPipelineEnabled`.

**Fase 3 — Delay/Cron (WhatsApp-only)**
1. Nó `delay` seta `resumeAt`; scheduler (leader-lock Redis SetNX) resume no horário.
2. Trigger `schedule` (cron) dispara runs; UPDATE condicional evita double-resume.
3. Nenhum `time.Sleep` para delays longos.

**Fase 4 — Campanhas**
1. Cada destinatário = `CampaignRecipient` (FlowRun não-interativo).
2. Rotação Reputation-weighted LRU + token-bucket/jitter/batch-pause + circuit-breaker.
3. Status de chip via cache de `session.status` (não DB stale).
4. UI exibe **aviso explícito de risco de ban** + opt-in/suppression obrigatórios.

**Fase 5 — Hardening**
1. Runs órfãos expiram via varredura de `expiresAt`; observabilidade completa em `FlowRunLog`.
2. Isolamento entre tenants validado (2 tenants, sem vazamento).
3. Reentrância de resume não duplica envios (dedup + UPDATE condicional).

**Fase 6 — Declarada (follow-up)**
1. Triggers `event` (ticket/deal) e `webhook-inbound` com emissor interno.
2. `EmailAdapter` SMTP como porta de saída adicional.

---

## Dependências internas

- **QuickAnswers**: nó `message` reusa templates por `quickAnswerId` e `interpolateVariables`.
- **Pipeline / Deal**: nó `pipeline` move/cria deals via DealService.
- **Ticket**: nó `ticket` atribui/fecha/etiqueta via TicketService.
- **engine-go**: adapter WhatsApp (contrato AMQP `wbot.<tenant>.<session>.<cmd>`).
- **Real-Time (SSE)**: progressão de run pode emitir eventos via `Broadcaster` (`EmitToTenantRoom`).
- **Settings/LLM**: nó `llm` lê provider/model/apiKey do tenant (padrão `AISuggest`).
- **Redis**: dedup (`wbot:msg:`), leader-lock do scheduler (SetNX), lock por `FlowRun.id`.

## Débitos conhecidos (Fase 0 → Fase 1)

Levantados na revisão da Fase 0; **intencionais** nesta fase, a resolver na Fase 1:

- **Projeção de trigger inerte.** O skeleton (`flow.Skeleton.RouteInbound`) casa nas colunas `triggerType`/`triggerValue`, mas a API da Fase 0 (`Create`/`Update`) **não as popula** — então o roteamento é log-only e não dispara para dados reais. A projeção polimórfica grafo→colunas (ADR 0012) liga o matching real, na Fase 1.
- **Binding de canal não filtrado no match.** O skeleton ignora `Flow.WhatsAppID` ao casar — dentro de um tenant, um flow ligado ao canal A casaria um inbound do canal B. Inerte hoje (sem trigger projetado). Quando o matching real entrar, incluir `AND ("whatsappId" IS NULL OR "whatsappId" = ?)` keyed no canal do inbound, com teste de mismatch dentro do tenant.
- **`generic` aceito fora do `NODE_TITLES` do editor.** O contrato (`flow.ParseGraph`) aceita `node.type = "generic"` como válido, mas o editor não o lista na paleta. Mantido como fallback; alinhar editor↔contrato na Fase 1.
- **`whatsappId` no FlowManager.** A Fase 0 já persiste o binding (input + associação `Whatsapp` + Preload) e expõe um toggle de ativação; a ativação só ganha efeito de runtime quando o interpretador entrar (Fase 1).

## Referências

- ADR 0009 (stage upsert por nome — padrão de upsert idempotente reusado em projeção).
- ADR 0010 (Real-Time / SSE — `Broadcaster` para progressão de run).
- [`docs/agents/quick-answers.md`](quick-answers.md) — `interpolateVariables`, dispatch backend-side.
- [`docs/agents/pipeline.md`](pipeline.md) — padrão `AISuggest` para LLM por tenant.
- [`docs/agents/realtime.md`](realtime.md) — emissão de eventos tenant-scoped.
- Memória: contrato de comandos engine-go; botões interativos whatsmeow (NativeFlow).
