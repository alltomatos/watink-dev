# Módulo: Base de Conhecimento (RAG)

## Responsabilidade

Ingestão e recuperação de conhecimento (RAG) no microsserviço `watink-knowledge`
(Python/FastAPI). Fontes (texto, arquivo, URL/site, git) são vetorizadas em KBChunks
(pgvector) e consumidas pelos nós `knowledge`/`agent` do FlowBuilder e, no futuro, por
Agentes standalone. O `business` (Go) é o único gateway: detém metadados, orquestra o
turn-taking e valida auth/tenant.

---

## Arquitetura

```
   frontend ──REST/SSE──> business (Go) ─┬─ AMQP "ingest" ─────> watink-knowledge (Python)
                          (único gateway)│                       ├─ Firecrawl :3002 (web)
   business owns:                        │<─ AMQP "status" ──────┤─ browserless (JS)
   - KB/Source CRUD + UI                 │                       ├─ omniroute (embed/rerank/search)
   - upload p/ S3                        └─ HTTP /retrieve, /agent┤
   - FlowRun / turn-taking                  (rede interna Swarm)  └─ parse pdf/docx · chunk · embed
                                                                          │
                              PostgreSQL Watink (mesmo banco) <───────────┘
                              KBChunk: halfvec(2048) HNSW cosine, RLS/tenant
```

- **business (Go):** CRUD bases/fontes + UI, upload p/ S3, publica jobs (AMQP), chama
  retrieval/agent (HTTP interno), orquestra FlowRun. Único exposto ao frontend.
- **watink-knowledge (Python/FastAPI):** ingestão assíncrona + Retrieval RAG + Agent
  Runtime. Stateless por chamada. Só rede interna do Swarm.

---

## Tipos de fonte

| `type`     | Fetcher                         | MVP |
|------------|----------------------------------|-----|
| `text`     | texto direto no payload          | ✅  |
| `file`     | download do S3 → parse (pdf/docx/md/txt/csv/xlsx) | ✅ |
| `url`      | Firecrawl (1 página → markdown)  | ✅  |
| `website`  | Firecrawl crawl recursivo / browserless (JS) | Fase 2 |
| `git`      | clone → parse de arquivos        | Fase 3 |

> WebSearch (omniroute `/v1/search`) **descobre** URLs; não extrai conteúdo.

### Fonte `url` (Firecrawl)

- O `business` valida `url` não-vazia, grava a Source em `pending` e publica
  `knowledge.<tenant>.ingest` com `type:"url"`, `payload:{url}` (mesmo caminho de `text`/`file`).
- O worker (`app/firecrawl.py`) faz `POST <FIRECRAWL_URL>/v1/scrape`
  (`{url, formats:["markdown"], onlyMainContent:true}`) → markdown → chunk/embed/store.
- **Acesso ao Firecrawl:** `http://firecrawl:3002` (rede `watink_net`). Self-hosted **não
  exige API key** (`USE_DB_AUTHENTICATION=false`) — `FIRECRAWL_API_KEY` é opcional (header
  `Authorization` só vai quando setado). Env: `FIRECRAWL_URL`/`FIRECRAWL_API_KEY`/`FIRECRAWL_TIMEOUT`.
- **Stack do Firecrawl (dev = prod):** o `docker-compose.dev.yml` sobe o Firecrawl real
  (mesmo de produção, só que via compose em vez de Swarm) — 5 serviços, 100% imagens
  publicadas no GHCR (org `firecrawl`, **não** `mendableai`), sem build-from-source:
  `firecrawl` (api+worker, `ghcr.io/firecrawl/firecrawl`) · `firecrawl-playwright` (JS) ·
  `firecrawl-nuq-postgres` (fila NUQ) · `firecrawl-rabbitmq` · `firecrawl-redis`. Infra
  **dedicada** (prefixo `firecrawl-*`) para não colidir com Redis/RabbitMQ/Postgres do Watink.
  Custo: ~5GB de imagens, ~8GB RAM recomendado. Subir só o stack:
  `docker compose -f docker-compose.dev.yml up -d firecrawl`.
- **Apenas página única** (scrape, `/v1/scrape`). Crawl recursivo de site inteiro (`website`) é Fase 2.

### Inspeção do conhecimento (read-only, human-in-the-loop)

Para um humano **ver e avaliar** como o conhecimento foi vetorizado (sem expor o vetor cru, que não é legível):

- `GET /knowledge-bases/:id/sources/:sourceId/chunks` — lista os chunks de uma fonte
  (texto, ordinal, nº de chars, modelo de embedding, dimensão, hash). Lê `KBChunk`
  direto do Postgres (read-only, **tenant-scoped manual**; coluna `embedding` omitida).
  `KBChunk` é do serviço Python — **não** é modelo GORM (raw SQL, fora do AutoMigrate).
- `POST /knowledge-bases/:id/query` `{query, topK, minScore}` — **playground de recuperação**:
  faz proxy pro `/retrieve` do Python e devolve os top-k chunks + **score** + fonte. É o
  jeito real de avaliar a vetorização (a pergunta certa traz o chunk certo com score alto?).
- Ambos no `KnowledgeInspectController` (gateway business; o frontend nunca fala com o
  watink-knowledge). UI: expandir a fonte mostra os chunks; botão "Testar recuperação"
  abre o playground. **Curadoria (editar/re-embed) é passo futuro.**

---

## Modelo de dados

```go
type KnowledgeBase struct {
    ID, Name, Description string
    TenantID  uuid.UUID
    Sources   []KnowledgeBaseSource
}

type KnowledgeBaseSource struct {
    ID, KnowledgeBaseID, TenantID
    Type            string  // text|file|url|website|git
    URL, FileName   string  // ou objectKey (S3) / text inline
    Status          string  // pending|fetching|processing|ready|error|stale
    LastError       string
    ChunkCount      int
    LastIngestedAt  *time.Time
    Updatable       bool
    RefreshSchedule *string // cron, nullable
    NextRefreshAt   *time.Time
}

// watink-knowledge (mesmo Postgres)
KBChunk {
    id, tenantId, knowledgeBaseId, sourceId
    content    text
    contentHash text          // dedup
    embedding  halfvec(2048)  // HNSW halfvec_cosine_ops
    model      text           // ex: openrouter/nvidia/llama-nemotron-embed-vl-1b-v2:free
    dim        int            // 2048
    ordinal    int
}
```

---

## Lifecycle de ingestão

```
pending → fetching → processing → ready
                          ↓          ↑
                        error ──(retry/backoff)
   (updatable) ready → stale → fetching → ...   [cron: nextRefreshAt]
```

---

## Contratos

### Ingestão (business → knowledge, AMQP assíncrono)
```
exchange: knowledge.jobs   routing: knowledge.<tenant>.ingest
{ tenantId, knowledgeBaseId, sourceId, type, embeddingModel,
  payload: { text? | objectKey? | url? | gitRepo? } }
```

### Status (knowledge → business, AMQP evento)
```
routing: knowledge.<tenant>.status
{ sourceId, status, chunkCount, error? }
→ business atualiza a Source + emite SSE (Broadcaster) p/ a UI.
```

### Retrieval (business → knowledge, HTTP síncrono, rede interna)
```
POST /retrieve   headers: X-Internal-Token
{ tenantId, knowledgeBaseId, query, topK=6, minScore }
→ { chunks: [ { text, sourceId, score, citation } ] }
```

### Agent (business → knowledge, HTTP síncrono)
```
POST /agent/respond   headers: X-Internal-Token
{ tenantId, knowledgeBaseId, persona, history:[{role,content}], query, topK, minScore }
→ { reply, action: "continue"|"resolved"|"handoff", confidence, citations:[sourceId] }
```
O LLM emite a `action` via tag de controle `[[ACTION:...]]` (parseada e removida da
reply). Stateless: o estado (history, turn-taking, suspend/resume) vive no `business`
(FlowRun). O nó `agent` envia a reply, persiste o history em `vars` (`agent_history:<node>`,
EnvID único por turno) e: `continue`→suspende (`waiting_message`), `resolved`→avança,
`handoff`→avança pela branch "handoff". Sem contexto → handoff (nunca alucina).

---

## Embedding

- Via **omniroute** (`aiCustomBaseURL` + `aiApiKey`), modelo na setting
  **`aiEmbeddingModel`** (Configurações → Agente de IA).
- MVP: `openrouter/nvidia/llama-nemotron-embed-vl-1b-v2:free` → **2048 dims** →
  `halfvec(2048)` + HNSW `halfvec_cosine_ops` (pgvector ≥ 0.7; instalado 0.8.2).
- `model`+`dim` gravados em cada chunk → migração de modelo = re-embed por base.
- **Rate-limit (free tier):** worker com backoff + fila + retry; chunks já
  embeddados preservados.

---

## S3 Storage Driver

- Abstração S3-compatível: **MinIO (dev)** → **R2/AWS S3 (prod)** sem trocar código.
- Config **global de sistema** (Configurações → Armazenamento S3, superadmin):
  endpoint, bucket, accessKey, secretKey, region.
- Isolamento por subpasta **`{tenantId}/{kbId}/{sourceId}/arquivo`**.
- `business` faz upload (corrige bug do `CreateSource` que descartava o arquivo);
  `watink-knowledge` baixa para parsing.

---

## Multitenancy & Segurança

- `business` é o **único gateway**; `watink-knowledge` só na rede interna do Swarm +
  **segredo interno** (`X-Internal-Token`). Frontend nunca o chama direto.
- **RLS é INERTE** no serviço Python → toda query `WHERE "tenantId" = ?` manual.
- Retrieval/ingestão sempre escopados por `tenantId + knowledgeBaseId`.
- (Fase 2, opcional) defesa em profundidade: validar JWT do tenant também.

---

## Consumidores

| | Comportamento | Status |
|---|---|---|
| **Knowledge node** | RAG de 1 turno (recupera → responde/sugere/busca → avança) | nó existe; falta executor |
| **Agent node** | Agente multi-turno autônomo (Agent Runtime) | ✅ implementado |
| **Agente standalone** | Mesmo Agent Runtime, sem flow ao redor | futuro |

---

## Edge cases

| Caso | Tratamento |
|---|---|
| Scrape/fetch falha | fonte → `error` + `lastError`; retryável; não bloqueia outras fontes |
| Rate-limit embedding (429) | backoff + requeue; chunks já feitos preservados |
| Arquivo grande/corrompido/sem texto | cap no upload; extração vazia → `error` "sem texto" (OCR Fase 2) |
| Conteúdo duplicado | dedup por `contentHash`; re-ingest idempotente (apaga+reinsere, transacional) |
| Refresh concorrente | lock por `sourceId`; pula se já `processing` |
| Troca de modelo (dim) | dim global + gravada no chunk → re-embed da base; guard contra mistura |
| Retrieval em KB vazia / `< minScore` | retorna vazio → guardrail "não sei"/handoff (nunca alucinar) |
| Delete de fonte/KB | cascade apaga os chunks (sem órfãos) |
| Vazamento entre tenants | `WHERE tenantId` + prefixo S3 + teste A-não-vê-B |

---

## Critério de sucesso (MVP)

> Subo um **PDF** numa base → fonte transita `pending→processing→ready` com
> `chunkCount > 0` (visível na UI via SSE) → num **flow ativo**, o nó `knowledge`
> recebe uma pergunta cujo conteúdo está no PDF → o bot responde **ancorado no PDF,
> com citação da fonte** → pergunta fora da base → responde **"não encontrei"**.

- Isolamento: query do tenant A nunca retorna chunk do B (teste automatizado).
- Resiliência: rate-limit no embedding não perde dados.
- Observabilidade: status/erro de cada fonte na UI.
- Performance: retrieval < ~500ms p95.

---

## Fases

1. **MVP — loop RAG (texto + arquivo):** S3 upload, ingestão AMQP, parse/chunk/embed,
   `KBChunk` halfvec, `/retrieve`, executor do nó `knowledge`, status+SSE.
2. **Scraping web:** Firecrawl/browserless (url/website) + WebSearch; **Agent node** + Agent Runtime.
3. **Refresh agendado:** `updatable` + cron (`nextRefreshAt`) + scheduler (padrão FlowRun).
4. **Avançado:** git source, rerank (omniroute `/v1/rerank`), embedding self-hosted, Agente standalone.

---

## O que NÃO fazer

- Não expor o `watink-knowledge` à internet nem chamar direto do frontend — sempre via `business`.
- Não confiar em RLS no serviço Python — sempre `WHERE tenantId` manual.
- Não colocar scraping/parsing no `business`/engine-go.
- Não usar chave OpenAI hardcoded — usar omniroute (`aiEmbeddingModel`).
- Não misturar dimensões; não usar `vector(N>2000)` — `halfvec`.
- Não descartar o arquivo no upload — persistir no S3.
- Não responder fora do contexto nem omitir citação; baixa confiança → handoff.
- Não construir o Agente standalone como motor separado — reusar o Agent Runtime.
