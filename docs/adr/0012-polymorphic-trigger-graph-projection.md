# ADR 0012 — Trigger Polimórfico Projetado do Grafo

**Status:** Accepted
**Data:** 2026-06-27

## Contexto
O FlowBuilder precisa disparar `FlowRun`s a partir de gatilhos de natureza muito
diferente: mensagem recebida (keyword / primeiro contato / qualquer), agendamento
(cron), evento de domínio (ticket / deal), disparo manual / API e webhook de entrada.
Cada gatilho é autorado dentro do grafo do fluxo, no nó de entrada — o grafo é o
artefato editado no canvas e a fonte de verdade da automação.

Mas o read-path de disparo é hostil ao grafo. Quando chega uma mensagem do WhatsApp,
o backend precisa decidir, em milissegundos e por tenant, **quais fluxos têm um
trigger de mensagem com a keyword X** — sem desserializar o JSONB do grafo de todos
os fluxos ativos e varrer seus nós em memória a cada inbound. Isso degrada
linearmente com o número de fluxos e não é indexável pelo Postgres.

Some-se a isso a precedência: um `FlowRun` já ativo para o mesmo subject não deve ser
interrompido por um novo trigger (a sessão "manda" — Decisão A), exceto pelo opt-out
explícito do usuário (PARAR / STOP / SAIR), que vence sempre. Essa regra precisa ser
avaliada de forma barata no mesmo read-path, antes de instanciar um novo run.

Estamos em DEV, sem dado de produção e sem back-compat pesado — é o momento de fixar
o contrato.

## Decisão
**O grafo é a verdade; colunas top-level são índice de leitura barato.** O trigger é
autorado no nó de entrada do `FlowGraph` e **projetado** para colunas indexáveis na
tabela `flows` a cada Create/Update. A projeção é derivada determinística do grafo,
nunca editada à parte — o grafo e as colunas nunca divergem porque a escrita é atômica
e a projeção roda dentro da mesma transação do save.

- **Trigger polimórfico por classe.** O nó de entrada carrega `triggerClass` ∈
  `{ message-inbound, schedule, event, manual, webhook-inbound }` mais um payload
  específico da classe (`triggerConfig`, JSONB). As classes são fechadas no contrato
  versionado (`FlowGraph.schemaVersion`); um `triggerClass` desconhecido é rejeitado
  na validação do Create/Update (mesma porta que rejeita tipo de nó desconhecido, ID
  duplicado e edge órfã — ADR do contrato versionado).

- **Colunas de projeção (índice).** O save projeta para `flows`:
  - `trigger_class` (enum) — particiona o fan-out do read-path.
  - `trigger_keys` (array/JSONB indexado) — keywords normalizadas para
    `message-inbound`; vazio para classes sem chave textual.
  - `trigger_schedule` (cron string + `next_run_at`) — só para `schedule`.
  - `trigger_event` (tipo de evento de domínio) — só para `event`.
  - `enabled` (bool) — fluxo publicado/ativo.
  Todas tenant-scoped; o índice de leitura inclui `tenantId` na chave (RLS é inerte no
  app — sempre `WHERE tenantId` manual no read-path do worker).

- **Read-path com fan-out por classe.** Cada origem entra por um dispatcher que olha
  só a sua classe: inbound de mensagem consulta `WHERE tenant_id=? AND enabled AND
  trigger_class='message-inbound' AND <match de keyword em trigger_keys>`; o scheduler
  varre `trigger_class='schedule' AND next_run_at<=now`; o bus de eventos de domínio
  consulta `trigger_class='event' AND trigger_event=?`; manual/API e webhook resolvem
  o fluxo por ID/rota direta. Nenhum read-path desserializa o grafo para **decidir** se
  dispara — só para **executar** (e aí carrega o snapshot do run, não o grafo vivo).

- **Precedência: sessão manda (Decisão A), opt-out vence sempre.** Antes de instanciar
  um novo run, o dispatcher de `message-inbound` checa se já existe `FlowRun` ativo
  (`running | waiting_*`) para `(tenantId, subjectType, subjectId)`. Se existe, o novo
  trigger é ignorado e a mensagem é roteada para o run em espera (resume de
  `waiting_message`). **Exceção única:** palavras de opt-out (PARAR / STOP / SAIR,
  normalizadas) abortam o run ativo (`status=aborted`) e **não** iniciam novo fluxo —
  o opt-out tem precedência sobre a sessão e sobre qualquer novo trigger.

## Alternativas consideradas
- **Varrer o grafo em memória a cada inbound (sem projeção):** uma única fonte de
  verdade, zero risco de divergência grafo↔colunas. Mas O(n fluxos) por mensagem,
  desserializa JSONB no caminho quente e não é indexável — não escala com o volume de
  inbound do WhatsApp.
- **Tabela `triggers` normalizada como fonte de verdade (em vez de projeção do grafo):**
  indexável e barata de ler, mas cria uma segunda fonte de verdade que o editor de
  grafo precisaria manter em sincronia bidirecional — exatamente o acoplamento que a
  projeção unidirecional (grafo→colunas) evita. O canvas continua sendo o único lugar
  onde o trigger é autorado.
- **Despachar todos os triggers por um único matcher genérico:** menos código de
  roteamento, mas mistura semânticas heterogêneas (texto, cron, evento, rota HTTP) num
  só caminho, dificultando indexar cada classe pelo que ela realmente precisa. O
  fan-out por classe deixa cada origem consultar exatamente seu índice.
- **Precedência "último trigger vence" (novo run sobrescreve o ativo):** simples de
  raciocinar, mas quebra fluxos interativos no meio — o usuário responde uma pergunta e
  o bot reinicia do zero. A Decisão A (sessão manda) preserva a continuidade
  conversacional; o opt-out como exceção dá ao usuário o escape garantido.

## Consequências
- **Disparo barato e indexável:** o read-path consulta colunas indexadas por tenant +
  classe, sem tocar o JSONB do grafo na decisão de disparo. O custo por inbound é uma
  query indexada, não uma varredura.
- **Sem divergência grafo↔índice:** a projeção é derivada e reescrita a cada save,
  dentro da mesma transação. Não há caminho de escrita que altere as colunas sem passar
  pela revalidação do grafo.
- **Classes futuras entram sem quebrar o contrato.** Adicionar uma nova `triggerClass`
  (ex.: na Fase 6, `event` cobrindo novos tipos de domínio, ou um `webhook-inbound`
  mais rico) é: (1) registrar o novo valor de enum no contrato versionado, (2) ensinar
  o validador a aceitar seu `triggerConfig`, (3) acrescentar a projeção da sua coluna de
  índice e (4) plugar um dispatcher para sua classe no read-path. Fluxos e runs
  existentes — que rodam o **snapshot** do grafo do start — não são afetados; o
  `schemaVersion` ausente continua significando `v1`.
- **Precedência testável e localizada:** a regra "sessão manda + opt-out vence" vive no
  dispatcher de `message-inbound`, avaliada com uma consulta por `(tenantId, subject)` ao
  estado de `FlowRun`. O opt-out é um match de keyword normalizada que curto-circuita
  antes da checagem de sessão.
- **Acoplamento com os invariantes do FlowRun:** o read-path nunca confia em RLS
  (`WHERE tenantId` manual sempre); escritas de run usam `Session(NewDB:true)`; o dedup
  por `env.ID` (Redis TTL 24h) precede qualquer envio real disparado pelo run. A projeção
  não introduz nova fonte de verdade de tempo — agendamentos vão para `next_run_at`,
  varrido pelo scheduler (ADR do scheduler, Fase 3), nunca por `time.Sleep`.
- **Débito declarado:** as classes `event` e `webhook-inbound` têm coluna de projeção e
  dispatcher previstos no contrato, mas seus emissores/rotas completos são entregues na
  Fase 6 — o read-path já reconhece a classe e a ignora com segurança enquanto não há
  fluxo publicado nela.
