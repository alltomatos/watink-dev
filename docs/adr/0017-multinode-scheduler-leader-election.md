# ADR 0017 — Scheduler Multi-Node: Leader Election + Lock por FlowRun + Resume Idempotente

**Status:** Accepted
**Data:** 2026-06-27

## Contexto
O FlowBuilder precisa retomar `FlowRun`s suspensos em `waiting_until` (delays do
nó `delay`/`schedule`) quando `resumeAt <= now`. Como o business roda em múltiplos
nós (escala horizontal), três problemas surgem ao varrer e disparar essas retomadas:

1. **Varredura concorrente** — se cada nó varre `FlowRun where resumeAt <= now` e
   publica `flow.resume`, o mesmo run é disparado N vezes (N = número de nós),
   duplicando envios reais ao WhatsApp.
2. **Disparo duplicado por consumo concorrente** — mesmo com um único varredor,
   se a mensagem `flow.resume` for entregue/reprocessada mais de uma vez (retry de
   AMQP, ack perdido, redelivery), o resume-worker reexecuta o nó.
3. **Fonte da verdade do tempo** — a tentação é "dormir" o delay inline com
   `time.Sleep`, ou empurrar a mensagem para uma fila com TTL+DLX (dead-letter
   exchange) e deixar o broker "acordar" o run quando o TTL expira. Ambos acoplam a
   semântica de tempo a um processo/conexão volátil: um `time.Sleep` morre com o
   pod (perde-se o delay); o TTL+DLX não permite cancelar/reprogramar o delay, não
   sobrevive a mudança de `resumeAt`, e o head-of-line blocking de filas TTL no
   RabbitMQ degrada de forma não-determinística com delays longos heterogêneos
   (semanas, no caso de campanhas drip). Há precedente ruim no repo: o
   `rabbitmq_dlq.go` já usa o padrão TTL+DLX para retry de mensagens — ele NÃO deve
   ser reaproveitado como mecanismo de delay de FlowRun.

Restrições do ambiente (ver ADR 0001): RLS do Postgres é **inerte** no app — nunca
fazemos `SET app.current_tenant`, logo toda query do worker carrega `WHERE tenantId`
manual. Escritas usam `Session(NewDB: true)` para não vazar o escopo de leitura do
GORM. Dedup de envio real já existe por `env.ID` em Redis (`wbot:msg:`, TTL 24h).

## Decisão
**Fonte da verdade do tempo = `FlowRun.resumeAt` varrido por um scheduler com
leader-lock Redis.** Nunca `time.Sleep` para delays longos; nunca TTL+DLX como
relógio de FlowRun. Três camadas de exclusão mútua + idempotência:

### 1. Leader election do scheduler (Redis `SetNX` com TTL renovável)
Apenas um nó varre `resumeAt` por vez. Cada nó tenta adquirir
`flow:scheduler:lock` via `SET flow:scheduler:lock <nodeId> NX PX <ttl>`
(ex.: TTL 15s). O vencedor é o **líder** e roda o loop de varredura; renova o lock
periodicamente (ex.: a cada 5s) com um `SET ... XX` condicionado ao próprio
`nodeId` (compare-and-set via script Lua, para não renovar lock de outro nó). Se o
líder morre, o TTL expira e outro nó assume na próxima tentativa. O lock é
**tenant-agnóstico** (um líder global de varredura); o escopo de tenant vem das
queries, não do lock.

### 2. Lock por `FlowRun.id` no momento do resume (`flow:resume:{id}`)
O líder varre `FlowRun where status = 'waiting_until' AND resumeAt <= now`
(com `WHERE tenantId` manual por linha/lote) e, para cada run, publica
`flow.resume{ runId, tenantId }`. O **resume-worker** que consome essa mensagem
adquire um lock curto `SET flow:resume:{runId} <workerId> NX PX <ttl>` (ex.: 30s)
antes de tocar o run. Isso protege contra redelivery AMQP e contra o caso raro de
dois líderes transitórios (split-brain durante troca de liderança) publicarem o
mesmo run. Sem lock → descarta a mensagem (ack) sem reexecutar.

### 3. UPDATE condicional de status (guarda transacional definitiva)
A defesa final NÃO depende de Redis (que pode falhar/expirar): o resume-worker faz
uma transição de estado **condicional** no Postgres, dentro de `Session(NewDB:true)`:

```sql
UPDATE flow_runs
   SET status = 'running'
 WHERE id = $1 AND tenantId = $2 AND status = 'waiting_until'
```

Só prossegue se `RowsAffected == 1`. Se outro worker já transicionou o run para
`running` (ou para `aborted`/`expired` por opt-out), o `UPDATE` afeta 0 linhas e
este worker desiste. Essa guarda é a **fonte de verdade de idempotência**: o lock
Redis é otimização (evita trabalho redundante cedo), mas o invariante "um run só
é retomado uma vez por suspensão" é garantido pela transição atômica no banco.

### Fluxo completo
```
[líder único]  scan resumeAt<=now ──publish──▶ flow.resume{runId,tenantId}
                                                      │
[resume-worker] SET flow:resume:{id} NX ──fail──▶ ack & drop (duplicado)
                       │ ok
                       ▼
              UPDATE ... WHERE status='waiting_until'  ── RowsAffected=0 ──▶ ack & drop
                       │ RowsAffected=1
                       ▼
              executa currentNode (dedup de envio por env.ID em wbot:msg:)
                       │
                       ▼
              avança/suspende run; libera flow:resume:{id}
```

Expirados (`expiresAt <= now`) são varridos no mesmo loop e transicionados para
`expired` pela mesma guarda condicional.

## Consequências
- **Sem disparo duplicado por estrutura, não por sorte:** três camadas redundantes
  (líder único → lock por run → UPDATE condicional) significam que mesmo a falha
  total do Redis degrada para "no máximo um nó retoma o run" via a guarda Postgres.
- **Delays sobrevivem a restart/deploy:** o estado vive em `resumeAt` no banco;
  derrubar todos os pods e subir de novo apenas atrasa a varredura, não perde o
  delay. Reprogramar é um `UPDATE resumeAt` — impossível com TTL+DLX.
- **Cancelamento/opt-out vence sempre:** PARAR/STOP/SAIR transiciona o run para
  `aborted`; quando o scheduler chegar nele, o `UPDATE ... WHERE status='waiting_until'`
  falha (0 linhas) e a retomada é abortada sem efeito colateral.
- **`rabbitmq_dlq.go` permanece como está:** TTL+DLX continua sendo o mecanismo de
  **retry de mensagem** (curto, idempotente, com backoff), e NÃO de delay de FlowRun.
  A separação é explícita para evitar reuso indevido.
- **Custo operacional:** exige Redis disponível para o caminho feliz (leader lock +
  resume lock). A indisponibilidade do Redis não corrompe nada (Postgres é a
  autoridade), mas pausa a varredura de novos resumes até o Redis voltar — aceitável
  para delays cuja granularidade é de segundos/minutos.
- **Observabilidade necessária:** métricas de "lag de scheduler" (`now - resumeAt`
  no momento da retomada) e de quem é o líder atual; sem isso, um líder travado
  (renovando lock mas sem varrer) passa despercebido. Débito registrado.
- **Janela de jitter no resume:** a granularidade de retomada é o intervalo de
  varredura do líder (ex.: ~5s), não milissegundos. Aceitável para delays de
  automação; não use este scheduler para timing de precisão.

## Alternativas consideradas
- **`time.Sleep` inline no worker (estado em memória):** trivial de escrever, mas o
  delay morre com o pod, não escala, não cancela e não sobrevive a deploy. Rejeitado
  — é a anti-decisão que este ADR existe para proibir.
- **TTL + DLX no RabbitMQ como relógio de delay:** "acordar" o run quando o TTL da
  mensagem expira. Não permite reprogramar/cancelar o delay, sofre head-of-line
  blocking com TTLs heterogêneos, e a mensagem em voo não é cancelável quando o
  contato faz opt-out. Reaproveitaria o padrão de `rabbitmq_dlq.go` para um fim ao
  qual ele não serve. Rejeitado.
- **Todos os nós varrem + dedup só por `UPDATE` condicional (sem leader):** correto
  para idempotência, mas desperdiça N varreduras concorrentes do mesmo conjunto de
  linhas e gera contenção de lock de linha no Postgres a cada ciclo. O leader-lock
  Redis elimina esse desperdício mantendo a guarda Postgres como rede de segurança.
- **`SELECT ... FOR UPDATE SKIP LOCKED` como fila de trabalho (sem Redis):** padrão
  sólido e remove a dependência do Redis para a varredura. Viável como evolução, mas
  hoje o Redis já é dependência operacional (cache, dedup, fan-out SSE — ADR 0010) e
  o `SetNX` é mais barato que segurar transações longas de varredura. Plano B caso o
  acoplamento ao Redis se torne um problema.
- **Serviço de scheduler dedicado (ex.: Temporal, Quartz):** robusto, mas introduz
  novo serviço para operar e versionar, desacoplando do stack Redis/Postgres já em
  produção — over-engineering para o volume atual do FlowBuilder.
