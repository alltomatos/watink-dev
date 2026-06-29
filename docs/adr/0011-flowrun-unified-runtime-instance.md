# ADR 0011 — FlowRun como Instância Unificada de Runtime

**Status:** Accepted  
**Data:** 2026-06-27

## Contexto
O FlowBuilder precisa de um runtime de automação **genérico** — chatbot é apenas um perfil de uso. As primeiras notas de design tratavam fluxos interativos (chatbot que espera resposta do contato) e fluxos não-interativos (disparo agendado, campanha, automação event-driven) como conceitos distintos, e o código carregava um esboço de `FlowSession` comentado em `worker.go` que modelava apenas o caso conversacional.

Isso criava pressão para dois runtimes paralelos: um "session" para conversas e um "job" para disparos. Na prática, ambos são a mesma coisa — uma execução de um grafo que avança nó a nó e, em certos pontos, **suspende** à espera de algo externo (uma mensagem do contato, um instante no relógio, um evento de domínio). A diferença entre "interativo" e "não-interativo" não é estrutural: é apenas **em que tipo de ponto a execução suspende**. Manter dois modelos duplicaria scheduler, persistência de variáveis, snapshot de grafo, dedup e regras de multitenancy — e abriria divergência de comportamento entre os dois caminhos.

Some-se a isso a necessidade de o runtime atender sujeitos heterogêneos (um ticket, um contato, ou nenhum sujeito no caso de um job puramente temporal) e de garantir que uma execução longa não mude de comportamento no meio do caminho se o autor editar o fluxo.

## Decisão
Adotar **FlowRun** como a única instância de execução do FlowBuilder. Interativo e não-interativo são o **mesmo registro**, suspendendo em estados diferentes. `FlowRun` **substitui** o conceito `FlowSession` (removido do esboço em `worker.go`).

**Estados de execução:**
- `running` — avançando nós, sem suspensão.
- `waiting_message` — suspenso aguardando mensagem inbound do sujeito (ponto interativo).
- `waiting_until` — suspenso até `resumeAt` (delay/cron; ver ADR de scheduler).
- `waiting_event` — suspenso aguardando evento de domínio (ticket/deal) ou webhook.
- `completed` · `aborted` · `expired` — terminais.

**Campos do registro:**
- `tenantId` — multitenancy; WHERE manual no worker (RLS é **inerte**, o app nunca faz `SET app.current_tenant`).
- `flowId`, `currentNodeId`.
- `subjectType` ∈ {`ticket`, `contact`, `none`} e `subjectId` (nullable) — **sujeito polimórfico**. `none` cobre o job puramente temporal sem alvo conversacional.
- `vars` (JSONB) — estado de variáveis da execução; interpolação reusa `interpolateVariables` do QuickAnswers (variável ausente → string vazia).
- `resumeAt` (nullable) — fonte da verdade do tempo, varrida pelo scheduler; **nunca** `time.Sleep` para delays longos.
- `expiresAt` — TTL da execução suspensa; ao estourar, transição para `expired`.
- **Snapshot do grafo no start** — a run carrega a versão do `FlowGraph` vigente no momento do start e roda **essa** versão até terminar; editar o fluxo não altera runs em andamento.

**Precedência de controle:** "a sessão manda" (Decisão A) — havendo `FlowRun` ativo para o sujeito, novos triggers são ignorados; **exceto** opt-out (PARAR/STOP/SAIR), que vence sempre e aborta a run.

**Invariantes de escrita:** toda escrita usa `Session(NewDB:true)` (evita reuso do db escopado do GORM); dedup por `env.ID` em Redis (TTL 24h, padrão `wbot:msg:`) antes de qualquer envio real.

Cada destinatário de campanha é um `FlowRun` não-interativo (`CampaignRecipient` mapeia 1:1 a uma run), reusando integralmente este runtime.

## Alternativas consideradas
- **Dois modelos separados (`FlowSession` + `FlowJob`):** intuitivo no curto prazo, mas duplica scheduler, snapshot, persistência de `vars`, dedup e regras de tenant; garante divergência de comportamento entre os caminhos e dobra a superfície de teste. Rejeitado — a distinção interativo/não-interativo é só o ponto de suspensão.
- **Polimorfismo do sujeito por tabelas dedicadas (uma run-table por `subjectType`):** normaliza FKs, mas fragmenta o read-path do scheduler (varrer N tabelas por `resumeAt`) e impede um índice único de execuções ativas. `subjectType`/`subjectId` em colunas resolve com um índice só.
- **Run sem snapshot (sempre lê a versão corrente do grafo):** elimina a cópia, mas torna o comportamento de uma execução longa não-determinístico sob edição concorrente do fluxo. Inaceitável para campanhas e delays de dias. Snapshot no start é a barreira de isolamento temporal.
- **Delays via `time.Sleep`/goroutine viva:** trivial de codar, mas perde estado em restart, não escala para milhares de runs suspensas e não sobrevive a deploy. `resumeAt` + scheduler com leader-lock é a única fonte da verdade do tempo.
- **Manter precedência "trigger novo sempre cria run":** simples, mas gera runs concorrentes para o mesmo sujeito e enxurrada de mensagens. "Sessão manda" + opt-out soberano é o equilíbrio.

## Consequências
- **Um único runtime, scheduler e modelo de persistência** servem chatbot, agendamento, campanha e automação event-driven — sem código paralelo nem divergência de comportamento.
- O read-path de execuções ativas é um índice só (`tenantId`, `subjectType`, `subjectId`, `status`); o scheduler varre `resumeAt <= now` sobre uma única tabela.
- Execuções longas são **deterministicamente isoladas** de edições do fluxo via snapshot — pré-requisito para campanhas de dias e delays/cron (ver fases 3 e 4 do roadmap).
- O sujeito `none` habilita jobs puramente temporais sem forçar um alvo conversacional artificial.
- A regra "sessão manda, opt-out vence" precisa ser checada em **todos** os caminhos de trigger (message-inbound, schedule, event, manual/api, webhook) — é responsabilidade do read-path de triggers, não do runtime.
- Como RLS é inerte neste serviço, **toda** query do worker carrega `WHERE tenantId` manual; esquecer isso vaza execuções entre tenants. Coberto por `auth.GetScoped` nas bordas e revisão obrigatória no worker.
- Débito declarado: a transição de status no resume deve ser um `UPDATE` condicional (compare-and-set sobre o `status`) sob lock por `FlowRun.id`, para que duas instâncias do scheduler nunca retomem a mesma run — detalhado no ADR do scheduler (Fase 3).
- `FlowSession` deixa de existir como conceito; qualquer referência remanescente no esboço de `worker.go` é removida ao implementar a Fase 0 (Fundação).