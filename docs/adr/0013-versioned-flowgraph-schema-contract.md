# ADR 0013 — Contrato Versionado de Schema do FlowGraph

**Status:** Accepted
**Data:** 2026-06-27

## Contexto
O FlowBuilder persiste o grafo de automação como um documento JSON (`nodes` + `edges`) editado livremente no canvas do frontend. Sem um contrato explícito entre o que o editor produz e o que o worker de execução consome, dois problemas estruturais surgem:

1. **Drift silencioso** — o frontend pode emitir um `node.type` que o worker não sabe interpretar, ou uma `edge` apontando para um nó inexistente. Sem validação no `Create`/`Update`, o erro só aparece em runtime, dentro de um `FlowRun`, longe da causa.
2. **Evolução sem rastreabilidade** — quando a forma do `NodeData` mudar (campo renomeado, semântica nova de um nó), não há como o worker distinguir um grafo "antigo" de um "novo" para decidir como interpretá-lo. O snapshot do grafo no start do `FlowRun` agrava isso: uma run roda a versão do grafo que a iniciou, então grafos de schemas diferentes coexistem em execução simultânea.

O `FlowRun` já carrega um **snapshot do grafo** no momento do start — a run executa a versão que a iniciou, não a versão atual editada. Isso torna a versão do schema parte do dado persistido, não um detalhe de validação efêmero.

Estamos em **DEV**: não há dado de produção, nenhum `FlowRun` histórico para migrar, nenhum cliente externo consumindo o formato. Isso amplia drasticamente a margem para fixar o contrato agora, de forma rígida, sem custo de back-compat.

## Decisão
Definir o **FlowGraph como um contrato versionado e validado**, espelhado por structs Go, validado de forma síncrona no `Create`/`Update` do `FlowController`.

### 1. Struct raiz versionada
```go
type FlowGraph struct {
    SchemaVersion int       `json:"schemaVersion"`
    Nodes         []Node    `json:"nodes"`
    Edges         []Edge    `json:"edges"`
}
```
- `schemaVersion` é um inteiro monotônico. **Versão corrente: `1`.**
- **Ausência de `schemaVersion` = `1` (default), não erro.** Um grafo sem o campo é tratado como v1 — isso cobre grafos legados do canvas e payloads enxutos durante DEV, sem rejeitar o save.

### 2. Structs Go espelhando `NodeData` e `Edge`
O contrato deixa de ser "JSON solto" e passa a ter representação tipada em Go, validada no unmarshal:
```go
type Node struct {
    ID   string   `json:"id"`
    Type string   `json:"type"`
    Data NodeData `json:"data"`
}

type Edge struct {
    ID     string `json:"id"`
    Source string `json:"source"`            // node.id de origem
    Target string `json:"target"`            // node.id de destino
    Handle string `json:"sourceHandle,omitempty"` // ramo (ex.: "true"/"false")
}
```
O `NodeData` é o envelope de configuração por nó (campos específicos do tipo). O frontend (React Flow) e o backend compartilham a mesma forma — o backend é a **autoridade do contrato**; o canvas se conforma a ele.

### 3. Conjunto fechado de `node.type` válidos
A validação rejeita qualquer `type` fora do conjunto conhecido na `schemaVersion` corrente. Tipos válidos em v1:

| `node.type`     | Papel |
|---|---|
| `trigger`       | Ponto de entrada polimórfico (message-inbound / schedule / event / manual-api / webhook-inbound). Projetado para colunas top-level no save. |
| `sendMessage`   | Ação de saída via `OutboundChannelAdapter` (WhatsApp em F1; email/api/interno depois). |
| `wait`          | Suspende a run: `waiting_message` (input do contato), `waiting_until` (delay/cron via `resumeAt`), `waiting_event`. |
| `condition`     | Branch booleano/multi-ramo sobre `vars` da run; `edge.sourceHandle` identifica o ramo. |
| `aiReply`       | Resposta gerada por LLM (settings do tenant; RAG em F2). |
| `setVariable`   | Escreve em `vars` (JSONB) da run. |
| `action`        | Efeito colateral em serviço interno (criar/mover Deal, mexer em Ticket, tag). |
| `end`           | Termina a run (`completed`). |

> O conjunto é **fechado por versão**: adicionar um tipo novo é uma mudança de schema. Em DEV, podemos estender o conjunto da v1 livremente enquanto o formato não estabilizar; uma vez estabilizado, tipo novo ⇒ bump de `schemaVersion`.

### 4. Validação síncrona no `Create`/`Update`
O `FlowController` valida o grafo **antes de persistir**, rejeitando com `422`:
- `node.type` desconhecido para a `schemaVersion`;
- `node.id` duplicado;
- `edge.source`/`edge.target` apontando para `node.id` inexistente (edge órfã);
- (quando aplicável) ausência de exatamente um nó `trigger` alcançável.

Sempre via `auth.GetScoped(c, "Flows")` — nunca `c.Get("tenantId")` bruto (RLS Postgres é inerte no app; ver ADR 0001).

### 5. Política de back-compat em DEV
- **Sem migração de dados.** Não existe `FlowRun` ou `Flow` de produção para reescrever.
- **Sem código de tradução v0→v1.** Grafos sem `schemaVersion` são v1 por definição, não por conversão.
- A primeira migração real de schema (v1→v2) só será escrita quando houver dado vivo a preservar. Até lá, mudanças de forma editam a struct v1 diretamente.

## Alternativas consideradas
- **JSON livre validado só em runtime (status quo do `worker.go` comentado):** zero esforço de contrato, mas empurra todo erro de forma para dentro de um `FlowRun` em execução — o pior lugar para descobrir uma edge órfã. Rejeitado por mover a falha para longe da causa.
- **JSON Schema (validação declarativa externa):** desacopla o contrato da linguagem, mas adiciona uma fonte de verdade paralela às structs Go que o worker já precisa para interpretar o grafo, criando dois lugares para manter em sincronia. Em um runtime Go monolítico, a struct Go já É o schema.
- **`schemaVersion` ausente = erro de validação:** mais estrito, mas força o canvas e todo payload de teste a carregar o campo desde o primeiro save em DEV, gerando atrito sem benefício enquanto não há grafo a desambiguar. Default-para-1 dá o mesmo rigor de execução com menos fricção.
- **Conjunto aberto de `node.type` (worker ignora o que não conhece):** tolerante, mas mascara typos e nós "fantasma" do canvas — um `sendMesage` errado viraria no-op silencioso em vez de `422`. Rejeitado: em runtime de automação, falha silenciosa é pior que falha cedo.
- **Versionar por hash do grafo em vez de inteiro:** detecta qualquer mudança, mas não ordena versões nem expressa compatibilidade; não responde "este grafo é mais novo que aquele?". Inteiro monotônico é o suficiente.

## Consequências
- **Falha cedo, perto da causa:** grafo malformado é rejeitado no `Create`/`Update` com `422`, antes de qualquer `FlowRun` nascer — nunca em runtime dentro de uma run suspensa.
- **Snapshot por versão é coerente:** como o `FlowRun` congela o grafo no start, runs de schemas diferentes coexistem sem ambiguidade — cada uma sabe sua `schemaVersion`.
- **Contrato único frontend↔backend:** o backend é a autoridade do formato; o canvas React Flow se conforma. Isso elimina o drift onde o editor produz algo que o worker não lê.
- **Trigger como índice barato:** a struct tipada do `trigger` viabiliza a projeção para colunas top-level no save (grafo = verdade, colunas = índice de leitura para o fan-out por classe), sem parsear JSONB no read-path.
- **Evolução barata enquanto em DEV:** sem dado de produção, estender a v1 ou bumpar para v2 não exige migração — só edição de struct e do conjunto de tipos. A primeira migração real é deliberadamente adiada para quando houver dado vivo.
- **Custo:** manter as structs Go em sincronia com o que o canvas emite vira disciplina de PR — todo `node.type` ou campo de `NodeData` novo passa pela struct e pela tabela de tipos válidos deste ADR.

## Referências
- [ADR 0001](0001-multitenancy-rls-jwt.md) — Multitenancy RLS + JWT (por que `auth.GetScoped` e não `c.Get("tenantId")`)
- [ADR 0009](0009-pipeline-stage-upsert.md) — Upsert por nome (mesma disciplina de reconciliar documento vs. registro persistido)
- [ADR 0010](0010-realtime-sse-over-socketio.md) — Dependência de interface vs. implementação concreta (`Broadcaster`), espelhado aqui por `OutboundChannelAdapter`
- `CLAUDE.md` — Módulo FlowBuilder (contrato versionado, invariantes do `FlowRun`, channel adapters)
