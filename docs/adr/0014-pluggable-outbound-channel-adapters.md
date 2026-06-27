# ADR 0014 — Channel Adapters como Portas de Saída Plugáveis

**Status:** Accepted
**Data:** 2026-06-27

## Contexto
O FlowBuilder introduz ações que produzem efeitos colaterais externos: enviar
mensagem no WhatsApp, disparar e-mail, chamar uma API HTTP, mover um Deal de
estágio, abrir/atualizar um Ticket. Cada uma dessas ações é uma forma de *saída*
do runtime de automação (`FlowRun`) para um sistema externo, com semânticas de
entrega muito diferentes entre si.

Sem uma fronteira explícita, o worker do FlowBuilder tenderia a acoplar-se a cada
destino: chamar `whatsmeow` direto aqui, abrir uma conexão SMTP ali, montar um
`http.Client` acolá. Pior: a tentação imediata seria empurrar a lógica de
**pacing**, **rotação de conexões** e **anti-ban** (necessária para campanhas — ver
Fase 4 do plano e ADR de campanhas) para dentro do `engine-go`, já que é ele quem
fala com o WhatsApp. Isso seria um erro estrutural por três razões:

1. **O `engine-go` é multi-tenant e multi-sessão por design, mas é um executor
   burro.** Seu contrato AMQP (`wbot.<tenant>.<session>.<cmd>`) é *send-by-sessionId*:
   recebe um comando endereçado a uma sessão e o executa. Ele não tem — e não deve
   ter — visão de fila de campanha, reputação de chip, janela de envio ou
   token-bucket. Essa informação é estado de negócio, vive no `business` (Postgres
   RLS + cache de `session.status` no Redis).
2. **Pacing/rotação/anti-ban são decisões de produto e de tenant**, sujeitas a
   settings, circuit-breaker, suppression list e opt-out. Colocá-las no engine
   exigiria replicar acesso ao DB do tenant, ao Redis de dedup e às settings dentro
   de um serviço que hoje é stateless em relação a negócio — quebrando a separação
   que sustenta a escalabilidade horizontal do engine.
3. **Nem todo canal passa pelo engine.** E-mail (SMTP), API (HTTP) e ações internas
   (pipeline/ticket) não têm nada a ver com WhatsApp. Tratar "saída" como sinônimo
   de "engine" não generaliza.

Precisamos de uma fronteira única que o worker do FlowBuilder atravesse para
*qualquer* saída, mantendo o engine no seu papel mínimo.

## Decisão
Introduzir a abstração **`OutboundChannelAdapter`**: uma porta de saída plugável.
Toda ação de um nó do grafo que produz efeito externo é executada *exclusivamente*
através de um adapter resolvido por um **registry** no `business`. O worker do
FlowBuilder nunca fala com `whatsmeow`, SMTP ou `http` diretamente — fala com a
interface.

- **Interface mínima e estável** (espelhada em Go, no `business`):
  ```go
  type OutboundChannelAdapter interface {
      Channel() ChannelKind // "whatsapp" | "email" | "api" | "pipeline" | "ticket"
      Send(ctx context.Context, req OutboundRequest) (OutboundResult, error)
  }
  ```
  `OutboundRequest` carrega `tenantId`, `subjectType/subjectId`, o payload já
  interpolado e metadados de idempotência (`envID`). `OutboundResult` reporta
  aceitação/erro de forma agnóstica de canal.

- **Registry por `ChannelKind`:** um `ChannelRegistry` resolve o adapter pelo tipo
  declarado no nó. Adapters são registrados via **DI pura em `main.go`** (sem
  service locator, sem singleton global — ADR 0006), permitindo trocar/mockar
  implementações em teste sem variável global.

- **`engine-go` permanece adapter BURRO.** O `WhatsAppAdapter` é uma fina camada no
  `business` que traduz `OutboundRequest` no comando AMQP `wbot.<tenant>.<session>.<cmd>`
  (a *routing key carrega o tipo do comando*; o payload leva `to`/`messageId`/
  `sessionId`). O engine continua send-by-sessionId: recebe, executa, responde. Toda
  a inteligência de **qual sessão usar** (rotação), **quando enviar** (pacing/
  token-bucket/jitter) e **se ainda pode enviar** (circuit-breaker por chip
  degradado, suppression, opt-out) é resolvida no `business` *antes* de publicar o
  comando.

- **Demais adapters vivem inteiramente no `business`:**
  - `EmailAdapter` → SMTP (Fase 6).
  - `ApiAdapter` → `http.Client`.
  - `PipelineAdapter` / `TicketAdapter` → serviço interno (chamada direta de
    serviço, sem rede).

- **Invariantes preservadas dentro do adapter:** dedup por `envID` (Redis TTL 24h,
  padrão `wbot:msg:`) *antes* de qualquer envio real; `auth.GetScoped` / `WHERE
  tenantId` manual (RLS é inerte no worker — ver ADR 0001); interpolação de
  variáveis reusando o helper do QuickAnswers (variável ausente → string vazia).

- **Pacing/rotação são camada acima do adapter, não dentro do engine.** Para
  campanhas (Fase 4), o `WhatsAppAdapter` é alimentado por um `Pacer`/rotador
  (Reputation-weighted LRU + token-bucket/jitter/batch-pause + circuit-breaker) que
  decide *quando* e *por qual sessão* chamar `Send`. Esse componente é do
  `business`, lê `session.status` do cache (nunca DB stale) e nunca atravessa para o
  engine.

## Alternativas consideradas
- **Worker chama `whatsmeow`/SMTP/`http` direto (sem porta):** menos uma camada,
  mas acopla o runtime a cada SDK de destino, espalha lógica de tenant/dedup por
  toda parte e impossibilita testar o worker offline. Rejeitada — viola a
  modularidade e a DI pura (ADR 0006).
- **Mover pacing/rotação/anti-ban para o `engine-go`** (já que é ele quem fala WhatsApp):
  centralizaria o WhatsApp num lugar, mas obrigaria o engine a carregar estado de
  negócio (filas de campanha, reputação de chip, settings, suppression, opt-out,
  Redis de dedup do tenant), quebrando seu papel de executor burro e sua
  escalabilidade horizontal. Rejeitada — é exatamente o acoplamento que este ADR
  existe para impedir.
- **Um adapter "gordo" único com `switch channel`:** evita o registry, mas
  recria um god-file que cresce a cada canal e mistura SMTP/HTTP/AMQP no mesmo
  arquivo (> 250 linhas garantido — viola a regra anti-god-file). Rejeitada.
- **Fila de saída genérica e única (outbox table) consumida por um despachante:**
  boa para auditoria e retry, mas é ortogonal: a outbox pode existir *atrás* do
  adapter como detalhe de implementação do `WhatsAppAdapter`/campanhas, sem mudar a
  fronteira. Não substitui a interface — adiada como otimização interna.

## Consequências
- **O `engine-go` nunca ganha lógica de pool/pacing/email.** O contrato AMQP
  send-by-sessionId fica congelado como a única superfície do engine; toda evolução
  de campanhas, rotação e novos canais acontece no `business` sem tocar no engine.
- **Novos canais entram pela borda:** adicionar Telegram, SMS ou WhatsApp Business
  API (BSP, caminho zero-risco do roadmap de campanhas) é implementar mais um
  `OutboundChannelAdapter` e registrá-lo no `main.go` — sem alterar o worker do
  FlowBuilder nem o engine.
- **Testabilidade:** o worker é testável offline com um adapter fake registrado no
  `ChannelRegistry`; nenhum teste de fluxo precisa de WhatsApp/SMTP reais.
- **Risco de ban fica contido no `business`:** o circuit-breaker que retira um chip
  degradado e a suppression/opt-out vivem na camada de pacing acima do adapter, com
  acesso ao cache de `session.status` — o engine só recebe comandos já filtrados.
- **Custo:** uma indireção a mais (worker → registry → adapter → engine). Justificada
  pela impossibilidade prática de mover negócio para o engine depois que campanhas
  existirem.
- **Débito declarado:** `EmailAdapter` (SMTP) e adapters de canais event/webhook são
  Fase 6; o caminho crítico 0→1→3→4 usa apenas `WhatsAppAdapter` + adapters internos
  (`pipeline`/`ticket`).
