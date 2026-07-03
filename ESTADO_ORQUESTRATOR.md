Os achados estão completos e bem fundamentados. Vou produzir o relatório consolidado diretamente.

---

# 🔍 RELATÓRIO DE GAPS — Auditoria Técnica Watink (Subsistema Proxy / Anti-Ban + God-Files)

## 📊 RESUMO EXECUTIVO

| Prioridade | GAPs confirmados |
|---|---|
| 🔴 **P1 Crítico** | 3 |
| 🟠 **P2 Alto** | 11 |
| 🟡 **P3 Médio** | 5 |
| ⚪ **P4 Baixo** | 5 |
| ✅ Verificado / sem ação | 4 |

**TOTAL: 24 GAPs acionáveis** (+ 4 dimensões auditadas e confirmadas sãs).

### Os 3 mais urgentes

1. **🔴 Delete de proxy faz FAIL-OPEN em conexões de grupo** — deletar 1 chip queimado de um grupo flipa `proxyMode='none'` em TODAS as conexões sticky nele, vazando o IP real do servidor. É o oposto literal do design anti-ban. (P1, `proxy.go:449-455`)

2. **🔴 Bug do `db` escopado reusado em `proxy_group.go` / `connection_group.go`** — Delete/Update encadeiam escritas sem `Session(NewDB:true)`; **reproduzido empiricamente** (`column "proxyId" of relation "Proxies" does not exist`, transação abortada). O grupo NÃO é deletado em runtime. (P1, `proxy_group.go:190-203`, `connection_group.go:158-164`)

3. **🟠 ip-api.com é SPOF que invalida o pool inteiro** — outage/rate-limit do ip-api → todo probe retorna `OK=false` → proxies BONS rebaixados a `disabled` → saem da rotação → conexões single batem no fail-closed e **não reconectam**. Falha de terceiro grátis vira outage de WhatsApp do tenant. (P2 elevado, `proxy_probe.go:75` + `proxy.go:597-599`)

### Veredito de saúde

- **Segredos / auth / build / tipos / swagger**: ✅ **SÃOS** — cifragem fail-closed, `json:"-"`, rotas sob `protected`, build/vet/typecheck verdes, swagger sincronizado. Sem regressão.
- **Lógica de detach do proxy e GORM statement-reuse**: 🔴 **DOENTES** — 3 bugs reais de runtime, 2 com reprodução empírica. Esta é a área crítica.
- **Modularidade**: 🟠 **DÉBITO AMPLO** — 8 god-files acima do limite (pior: `quick_answer.go` 837L com `Send()` de ~360L). Não são bugs, mas concentram risco de regressão.
- **Resiliência externa (ip-api)**: 🟠 acoplamento perigoso entre "proxy alcançável" e "geo-lookup".

---

## 🔴 P1 — CRÍTICO

### 🚨 GAP: `ProxyController.Delete` faz FAIL-OPEN em conexões group-mode
├── 📉 **Impacto:** O `UPDATE` casa `WHERE proxyId=?` e seta `proxyMode='none'` indiscriminadamente. Para conexões em grupo, `ProxyID` guarda o pick sticky atual — deletar um chip queimado flipa TODAS as conexões sticky nele para `none`, removendo a proteção. Na próxima reconexão a sessão sai pelo **IP real do servidor**, contaminando-o. É o oposto do design anti-ban (fail-OPEN em vez de fail-closed).
├── 💡 **BOA PRÁTICA:** Separar a semântica por `proxyMode`. Só zerar `proxyMode='none'` quando o vínculo é único (`single`); em grupo, só zerar `proxyId` e deixar `pickGroupProxy` re-escolher no próximo pick (já trata `proxyId` nulo → LRU atômico).
├── 🗺️ **PLANO AÇÃO:** Quebrar o Delete em dois UPDATEs por `proxyMode` — `single`→`{proxyId:nil, proxyMode:'none'}`, `group`→`{proxyId:nil}` (preserva `proxyMode`/`proxyGroupId`).
├── 📋 **TAREFAS:**
│   - [ ] Refatorar `Delete` em dois UPDATEs separados por `proxyMode`
│   - [ ] Teste: deletar proxy sticky de conexão group-mode preserva `proxyMode='group'`+`proxyGroupId`, zerando só `proxyId`
│   - [ ] Confirmar que `isolateConnectionProxy` (single isolado) cai no fail-closed, não fail-open
├── ⚠️ **TIER:** T1
└── 📁 **Arquivos:** `business/internal/controllers/proxy.go:449-455` · `business/internal/models/whatsapp.go:33-38` · `business/internal/services/whatsapp_session.go:150-196`

### 🚨 GAP: `proxy_group.go` reusa `db` escopado em escritas encadeadas (BUG REPRODUZIDO)
├── 📉 **Impacto:** Delete/Update encadeiam `Model().Where().Updates()/Delete()` no mesmo handle do `auth.GetScoped` (que já carrega `.Where(tenantId)`). O clause acumula entre escritas → **reproduzido contra o test DB**: `column "proxyId" of relation "Proxies" does not exist` na 2ª escrita, transação fica `invalid`, **o grupo NÃO é deletado e a conexão NÃO é desvinculada em runtime**. É exatamente a armadilha que `proxy.go` já documenta e evita.
├── 💡 **BOA PRÁTICA:** Toda query (leitura e escrita) após `auth.GetScoped` deve usar `db.Session(&gorm.Session{NewDB:true})` — padrão canônico já em `whatsapp.go`/`proxy.go`.
├── 🗺️ **PLANO AÇÃO:** Envolver cada `Model/Where/Updates/Delete/First` em `Session(NewDB:true)` no Delete e no Update.
├── 📋 **TAREFAS:**
│   - [ ] `Delete` (l.190, 197, 203): `Session(NewDB:true)` em cada operação
│   - [ ] `Update` (l.141, 166, 170): idem no First inicial, Updates e re-leitura
│   - [ ] Teste de `ProxyGroupController.Delete` com proxies+conexões vinculados, verificando deleção e detach efetivos
├── ⚠️ **TIER:** T3 (sem cobertura atual; exige teste novo)
└── 📁 **Arquivos:** `business/internal/controllers/proxy_group.go:190,197,203,166` · `business/pkg/auth/tenant.go:99`

### 🚨 GAP: `connection_group.go` reusa `db` escopado (mesma classe do bug acima)
├── 📉 **Impacto:** Delete (`Model(&Whatsapp{})` l.158 → `Delete(&ConnectionGroup{})` l.164) e Update (First 119 → Update 136 → First 140) acumulam clause no mesmo handle. Mesma corrupção de statement do `proxy_group`, mas **`ConnectionGroupController` não tem testes** → a falha passa silenciosa.
├── 💡 **BOA PRÁTICA:** Resetar o statement com `Session(NewDB:true)` em cada operação após `GetScoped`.
├── 🗺️ **PLANO AÇÃO:** Aplicar `Session(NewDB:true)` no Delete e no Update.
├── 📋 **TAREFAS:**
│   - [ ] `Delete` (l.158, 164): `Session(NewDB:true)` em cada escrita
│   - [ ] `Update` (l.119, 136, 140): idem no First, Update e re-leitura
│   - [ ] Cobrir `ConnectionGroupController.Delete` com teste de detach+deleção
├── ⚠️ **TIER:** T3
└── 📁 **Arquivos:** `business/internal/controllers/connection_group.go:158,164,136,140`

---

## 🟠 P2 — ALTO

### 🚨 GAP: ip-api.com é SPOF que rebaixa o pool inteiro de proxies (RISCO DESTACADO)
> ⚠️ **Achado consolidado de 3 auditores** (Performance, Anti-ban, DDD) — elevado a P2 pela severidade do path anti-ban.

├── 📉 **Impacto:** `TestAll` depende EXCLUSIVAMENTE do ip-api.com como ponto de verificação. Se cair / 5xx / 429 / bloquear os IPs, TODO probe retorna `OK=false` e o `TestAll` rebaixa todos os `active`→`disabled`. `pickGroupProxy` exclui `status!=active` e conexões single em proxy disabled batem no fail-closed e **não reconectam**. **Outage de terceiro grátis sem SLA vira outage de WhatsApp do tenant inteiro.** Agravante: proxies de datacenter/Webshare compartilham gateway de saída → 429 falso-negativo rebaixa proxies saudáveis.
├── 💡 **BOA PRÁTICA:** Desacoplar "proxy alcançável" de "geo-lookup". Distinguir falha de **dial-do-proxy** (proxy ruim → rebaixar) de falha do **echo-host** (5xx/429/timeout → NÃO rebaixar, só marcar `lastCheckedAt`). Fallback multi-endpoint (ifconfig.co/ipinfo). Idealmente N falhas consecutivas antes de invalidar.
├── 🗺️ **PLANO AÇÃO:** `probeProxy` retorna tipo de falha; `TestAll` só rebaixa `active→disabled` em falha de conectividade real.
├── 📋 **TAREFAS:**
│   - [ ] Em `probeProxy` (l.84-91), distinguir HTTP 429 / `body.Status=='fail'` / 5xx de sucesso real, retornando tipo de falha
│   - [ ] Em `TestAll` (l.591-599), não rebaixar `active→disabled` quando o erro é inconclusivo (echo-host), só de dial real
│   - [ ] Adicionar endpoint(s) de fallback para echo/geo
│   - [ ] Considerar endpoint de echo interno para remover a dependência no bulk
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/proxy_probe.go:72-91` · `business/internal/controllers/proxy.go:577-601`

### 🚨 GAP: engine-go usa `SetProxy()` para socks5 em vez de `SetProxyAddress()`
├── 📉 **Impacto:** `client.SetProxy()` roteia via `http.Transport.Proxy` para TODOS os schemes, inclusive `socks5://`. whatsmeow expõe `SetProxyAddress()` que despacha socks5 via `proxy.FromURL`/`SetSOCKSProxy`. Resultado: SOCKS5 provavelmente não funciona (ou é frágil) na conexão websocket — o caminho crítico. O probe testa socks5 corretamente via `xproxy.SOCKS5`, então passa no teste mas falha no engine: **divergência probe-vs-runtime que mascara o defeito**. A UI oferece SOCKS5 como opção de primeira classe.
├── 💡 **BOA PRÁTICA:** Trocar `client.SetProxy(func...)` por `client.SetProxyAddress(proxyURL)` — helper nativo do whatsmeow que parseia scheme e despacha http vs socks5. Manter fail-loud em erro de parse.
├── 🗺️ **PLANO AÇÃO:** Substituir o bloco em `session.go:58-71`, validar E2E com socks5 autenticado.
├── 📋 **TAREFAS:**
│   - [ ] Substituir `SetProxy` por `SetProxyAddress(proxyURL)` com tratamento de erro (fail-loud)
│   - [ ] Testar E2E conexão real via proxy socks5 autenticado
│   - [ ] Manter log sem credenciais (só `scheme://host`)
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `engine-go/internal/whatsapp/session.go:58-71` · `business/internal/controllers/proxy_probe.go:42-66`

### 🚨 GAP: `quick_answer.go` (837L) — pior god-file; `Send()` ~360L
├── 📉 **Impacto:** Viola fortemente o limite ~250L (Anti-God-File). `Send()` (l.450-810) amarra switch de payload por tipo + interpolação + persistência GORM + update do Ticket + 3 emissões SSE = 4 responsabilidades intestáveis em unidade. Cada novo tipo engorda o switch; risco de regressão alto.
├── 💡 **BOA PRÁTICA:** Extrair `QuickAnswerPayloadBuilder` (1 função pura por tipo → `map[string]interface{}`), separando montagem-de-contrato da orquestração HTTP. Controller fino: valida → builder → publish → persiste/broadcast.
├── 🗺️ **PLANO AÇÃO:** Criar pacote `quickanswer/payload_builder.go`; reduzir `Send()` a passos `<40L`.
├── 📋 **TAREFAS:**
│   - [ ] Criar `payload_builder.go` com `build{Media,Buttons,Carousel,Pix,List,Poll,Text}Payload` (puras, sem gin/db), movendo o switch (l.531-723)
│   - [ ] Mover `buildInteractiveDataJSON` (l.58-163) e `buildNativeFlowButtons` (l.169-215) para o builder
│   - [ ] Mover `validateQuickAnswerType/Content/isUniqueViolation` (l.20-52) para `quick_answer_validation.go`
│   - [ ] Reduzir `Send()` a: resolver vars → `builder.Build()` → publish → persistOutgoing → broadcast
│   - [ ] `go build ./... && go test ./...`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/quick_answer.go:450-810,58-215,20-52`

### 🚨 GAP: `proxy.go` (693L) mistura CRUD + bulk-ops + status + 7 helpers
├── 📉 **Impacto:** ~2.8x o limite. ~11 métodos + ~7 funções num arquivo: CRUD simples com bulk-ops concorrentes (`TestAll` goroutines+semaphore), parsing de import e mutação de status. Dificulta navegação e teste isolado.
├── 💡 **BOA PRÁTICA:** Dividir por eixo no mesmo pacote (Go: dividir sem medo).
├── 🗺️ **PLANO AÇÃO:** `proxy_crud.go` / `proxy_bulk.go` / `proxy_test_handler.go` / `proxy_helpers.go`.
├── 📋 **TAREFAS:**
│   - [ ] `proxy_crud.go`: List/Create/Update/Delete/setStatus/Isolate/Activate
│   - [ ] `proxy_bulk.go`: Import/parseProxyLine/TestAll/DeleteAll/AssignGroup
│   - [ ] `proxy_test_handler.go`: Test orquestrando probeProxy
│   - [ ] `proxy_helpers.go`: proxyKey/proxyExistsForTenant/proxyGroupOwnedByTenant/normalizeScheme/toProxyResponse/validateProxyStrings/proxyInput
│   - [ ] `go build && go test` (proxy_test.go já existe — verde)
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/proxy.go:99-461,264-353,538-673,20-155`

### 🚨 GAP: `KnowledgeBaseConfig.tsx` (692L) — componente React monolítico
├── 📉 **Impacto:** 692L num componente (limite ~250L do DS). SSE + CRUD de fontes + UI de upload acoplados; bug em qualquer aba afeta o arquivo inteiro. Badge/ícone reutilizáveis presos.
├── 💡 **BOA PRÁTICA:** Extrair subcomponentes + hook de dados (padrão ADR 0007, já usado em MessagesList/QuickAnswerEditor).
├── 🗺️ **PLANO AÇÃO:** `SourceStatus.tsx` / `SourceListItem.tsx` / `AddSourceDialog.tsx` + `useKnowledgeBaseSources()`.
├── 📋 **TAREFAS:**
│   - [ ] Extrair `SourceIcon`/`StatusBadge`/`sourceLabel` → `components/SourceStatus.tsx`
│   - [ ] Extrair item da lista (l.408-571) → `SourceListItem.tsx`
│   - [ ] Extrair Dialog adicionar fonte (l.574-681) → `AddSourceDialog.tsx`
│   - [ ] Extrair dados+SSE+handlers → hook `useKnowledgeBaseSources(kbId)`
│   - [ ] `npm run typecheck && npm run lint`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `frontend/src/pages/KnowledgeBase/KnowledgeBaseConfig.tsx:91-157,408-571,574-681,163-253`

### 🚨 GAP: `skeleton.go` (486L) — runtime inbound com 6 eixos + duplicação StartFlow
├── 📉 **Impacto:** 486L. `StartFlow` (l.244) e `StartFlowForContact` (l.294) duplicam ~40L de snapshot+marshal+Create+ExecState — divergência futura provável. Matching/lifecycle/start misturados dificultam evoluir cada eixo (ex.: fase 2 RAG/campanhas).
├── 💡 **BOA PRÁTICA:** Dividir por eixo no mesmo pacote `flow`; extrair helper comum de snapshot.
├── 🗺️ **PLANO AÇÃO:** `skeleton_match.go` / `skeleton_run.go` / `skeleton_start.go` / `skeleton_vars.go`.
├── 📋 **TAREFAS:**
│   - [ ] `skeleton_match.go`: matchTriggers + warnFirstContactGap
│   - [ ] `skeleton_run.go`: activeRun/abortActiveRun/claimRun/resume/ExpireDueRuns
│   - [ ] `skeleton_start.go`: StartFlow*/`snapshotAndCreate()` helper eliminando duplicação (l.244-287 vs 294-348)
│   - [ ] `skeleton_vars.go`: buildVars/firstName/mustJSON
│   - [ ] `go build && go test`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/flow/skeleton.go:172-209,211-413,244-348,420-486`

### 🚨 GAP: `ProxySection.tsx` (413L) — 15 useState + tabela/dialog inline
├── 📉 **Impacto:** 413L > limite. Estado de filtro + atribuição em massa + tabela + ações por linha no mesmo componente; dificulta reuso e teste.
├── 💡 **BOA PRÁTICA:** Extrair tabela e dialog como subcomponentes; dados/filtro como hooks; `ProxySection` vira casca.
├── 🗺️ **PLANO AÇÃO:** `ProxyTable.tsx` / `AssignGroupDialog.tsx` + `useProxies()` / `useProxyFilters()`.
├── 📋 **TAREFAS:**
│   - [ ] Extrair tabela (l.300-369) → `ProxyTable.tsx`
│   - [ ] Extrair Dialog atribuir (l.376-408) → `AssignGroupDialog.tsx`
│   - [ ] Hook `useProxies()` (fetch + mutações)
│   - [ ] Hook `useProxyFilters(proxies)` (search/city/status/filtered/cities/filterActive)
│   - [ ] `npm run typecheck && npm run lint`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `frontend/src/pages/Settings/components/ProxySection.tsx:47-205,300-369,376-408,148-187`

### 🚨 GAP: `knowledge_base_mutation.go` (427L) — `CreateSource` ~157L com I/O entrelaçado
├── 📉 **Impacto:** `CreateSource` (l.157-314) mistura multipart + validação + persistência + upload S3 (4 ramos de `markSourceError`) + 2 dispatches AMQP (file vs text/url). Editar o fluxo de arquivo arrisca o de texto.
├── 💡 **BOA PRÁTICA:** Quebrar em helpers por etapa, separando o caminho file do text/url.
├── 🗺️ **PLANO AÇÃO:** `parseAndValidateSourceInput` / `handleFileSource` / `handleTextOrURLSource`.
├── 📋 **TAREFAS:**
│   - [ ] Extrair `parseAndValidateSourceInput(c)` (l.170-222)
│   - [ ] Extrair `handleFileSource(...)` (upload S3 + dispatch file, l.253-293)
│   - [ ] Extrair `handleTextOrURLSource(...)` (l.298-311)
│   - [ ] Considerar separar `knowledge_base_source.go` (mutação de Source) de mutação de KB
│   - [ ] `go build && go test`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/knowledge_base_mutation.go:157-314,253-293,298-311`

### 🚨 GAP: `flow.go` (396L) — `Update` ~117L com PATCH parcial denso
├── 📉 **Impacto:** Marginalmente acima de 250L. `Update` concentra duplo `ShouldBindBodyWith` + update-set parcial + recálculo de grafo + re-validação + re-projeção + guard de ativação — fonte recorrente de bugs (FB0-B1 data loss já corrigido aqui).
├── 💡 **BOA PRÁTICA:** Extrair validação/projeção do grafo + helper de montagem do update-set.
├── 🗺️ **PLANO AÇÃO:** `flow_graph_validation.go` + `buildFlowUpdateSet()` + `detectWhatsappPresence()`.
├── 📋 **TAREFAS:**
│   - [ ] Mover `validateFlowGraph/projectFlowTrigger/guardActivation` (l.59-115) → `flow_graph_validation.go`
│   - [ ] Extrair `buildFlowUpdateSet(req, present, existing)` (l.278-335)
│   - [ ] Extrair `detectWhatsappPresence(c)` (l.273-275)
│   - [ ] `go build && go test`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/flow.go:252-369,59-115,265-335`

### 🚨 GAP: `AISettings.tsx` (339L) — 3 Cards autônomos num arquivo
├── 📉 **Impacto:** 339L > limite, mas presentational puro (sem estado de dados próprio além de `embeddingDedicated`) → baixo risco. 3 seções distintas dificultam evolução independente.
├── 💡 **BOA PRÁTICA:** Extrair cada Card como subcomponente recebendo as mesmas props.
├── 🗺️ **PLANO AÇÃO:** `AIFeaturesCard.tsx` / `ChatGatewayCard.tsx` / `EmbeddingGatewayCard.tsx`.
├── 📋 **TAREFAS:**
│   - [ ] Extrair `AIFeaturesCard.tsx` (l.62-150)
│   - [ ] Extrair `ChatGatewayCard.tsx` (l.153-256)
│   - [ ] Extrair `EmbeddingGatewayCard.tsx` (l.259-334, mantendo `embeddingDedicated` local)
│   - [ ] `AISettings` vira `<div className="space-y-6">` com 3 cards
│   - [ ] `npm run typecheck && npm run lint`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `frontend/src/pages/Settings/components/AISettings.tsx:62-150,153-256,259-334`

### 🚨 GAP: Ausência de camada de repositório (vazamento de persistência)
├── 📉 **Impacto:** GORM cru dentro de TODOS os controllers auditados + runtime `Skeleton`, sem repositório. A lógica `WHERE tenantId` manual + `Session(NewDB)` é repetida e fácil de errar — **os 3 bugs P1 acima são consequência direta disso**. Testes de controller exigem DB real (sem interface para mockar). Débito estrutural amplo.
├── 💡 **BOA PRÁTICA:** Repositórios por agregado (`ProxyRepository`, `FlowRunRepository`, etc.) centralizando `WHERE tenantId` + `Session(NewDB)`, permitindo mock por interface. Incremental, pelos mais consultados.
├── 🗺️ **PLANO AÇÃO:** Definir interfaces + impl GORM, injetar via construtor (DI pura) em `main.go`.
├── 📋 **TAREFAS:**
│   - [ ] `ProxyRepository` (ExistsForTenant/GroupOwnedByTenant/List/Create/Update/Delete/BulkAssignGroup)
│   - [ ] `FlowRunRepository` (ActiveWaiting/AbortActive/Claim/Create/ExpireDue) encapsulando o padrão `Session(NewDB)`
│   - [ ] Avaliar `QuickAnswerRepository` (isolar persistência de Message/Ticket do Send)
│   - [ ] Injetar via construtor em `main.go`
│   - [ ] Testes de controller com repo mockado (struct local por Test)
├── ⚠️ **TIER:** T2 (estrutural, incremental; aprovação do dono recomendada para o escopo)
└── 📁 **Arquivos:** `business/internal/controllers/proxy.go:26-43` · `quick_answer.go:772-794` · `knowledge_base_mutation.go:238-243` · `business/internal/flow/skeleton.go:227-366`

---

## 🟡 P3 — MÉDIO

### 🚨 GAP: Auto-isolação por ban sub-detecta 403 (chip queimado fica `active`)
├── 📉 **Impacto:** Engine trata 403 MainDeviceGone/LOCKED como `DISCONNECTED`, não `BANNED` (só 406/402 viram BANNED). Como a isolação do proxy só dispara em `status=='BANNED'`, um ban real via 403 **não isola o proxy** — o IP queimado fica `active` e `pickGroupProxy` continua entregando-o a outras conexões, propagando o ban. Trade-off consciente, mas débito real.
├── 💡 **BOA PRÁTICA:** Aceitar o trade-off mas (a) documentar que 403 exige isolação manual; (b) heurística de 403 repetido → isolar; (c) aviso na UI.
├── 🗺️ **PLANO AÇÃO:** Documentar limitação + avaliar contador de 403 consecutivos.
├── 📋 **TAREFAS:**
│   - [ ] Documentar sub-detecção 403 em `docs/agents/` (proxy/anti-ban)
│   - [ ] Avaliar contador de 403 consecutivos por sessão → promover a BANNED após threshold
│   - [ ] UI de Conexões deixar óbvia a ação manual de isolar
├── ⚠️ **TIER:** T3 (mudança de semântica de ban; aprovação do dono)
└── 📁 **Arquivos:** `engine-go/internal/whatsapp/events.go:28-43` · `business/internal/services/event_listener_session.go:84-118`

### 🚨 GAP: Persistência do pick sticky fora da transação → sticky degrada para rotate
├── 📉 **Impacto:** O bump de `lastUsedAt` commitou, mas o `Update(proxyId)` é non-fatal (só loga). Se a escrita falhar em modo sticky, a próxima reconexão falha o sticky-check e o LRU escolhe OUTRO proxy → **sticky vira rotate silencioso**, trocando o IP de saída e enfraquecendo a postura anti-ban. Observável só por log de warn.
├── 💡 **BOA PRÁTICA:** Bump + `Update(proxyId)` na MESMA transação; em sticky, falha de persistência = erro (fail-closed). Em rotate, best-effort ok.
├── 🗺️ **PLANO AÇÃO:** Envolver pick atômico + `Update(proxyId)` numa transação GORM única.
├── 📋 **TAREFAS:**
│   - [ ] Transação única para pick + `Update(proxyId)` em `pickGroupProxy`
│   - [ ] Sticky: tratar falha de persistência como erro (fail-closed)
│   - [ ] Teste: simular falha do `Update(proxyId)`, verificar que sticky não degrada silenciosamente
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/services/whatsapp_session.go:168-196`

### 🚨 GAP: `ProxyController.Update` permite duplicata e deixa geo/healthy stale
├── 📉 **Impacto:** `Update` altera scheme/host/port SEM revalidar dedup (`proxyExistsForTenant` só roda no Create) e SEM resetar healthy/geo. Resultado: (1) duplicata `(scheme,host,port)` via edição furando o UNIQUE lógico, distorcendo LRU; (2) geo/healthy apontando para o endpoint ANTIGO — operador atribui proxy a grupo geográfico errado (caso 'só Fortaleza').
├── 💡 **BOA PRÁTICA:** No Update: se endpoint muda, rodar dedup excluindo o próprio id (rejeitar duplicata) + zerar healthy/country/countryCode/city/lastCheckedAt.
├── 🗺️ **PLANO AÇÃO:** Checagem de dedup condicional + reset de geo quando endpoint muda.
├── 📋 **TAREFAS:**
│   - [ ] Dedup no Update quando endpoint muda (excluindo o id atual)
│   - [ ] Resetar healthy+geo quando scheme/host/port mudam
│   - [ ] Teste de update para duplicata e reset de geo
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/proxy.go:364-432,24-32`

### 🚨 GAP: `TestAll` faz 3N UPDATEs serializados pós-`wg.Wait()` (sem batch)
├── 📉 **Impacto:** Fan-out de probe é concorrente, mas a persistência é O(N) serial: até 3 UPDATEs por proxy. 100 proxies = 100-300 round-trips serializados, segurando uma conexão do pool por todo o período.
├── 💡 **BOA PRÁTICA:** Agrupar writes: bulk `UPDATE ... FROM (VALUES ...)` por resultado, dois UPDATEs por IN(ok)/IN(fail) numa transação. Troca 3N round-trips por ~3 statements.
├── 🗺️ **PLANO AÇÃO:** Coletar okIDs/failIDs+geo no laço; 3 bulk UPDATEs em transação.
├── 📋 **TAREFAS:**
│   - [ ] Coletar okIDs/failIDs/geo por id (l.582-601)
│   - [ ] 3 bulk UPDATEs (healthy/geo ok; healthy=false fail; status='disabled' WHERE IN(fail) AND status='active')
│   - [ ] Envolver em `Session(NewDB).Transaction()`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/proxy.go:582-601`

### 🚨 GAP: `TestAll` síncrono (~56s pior caso) estoura timeout de gateway
├── 📉 **Impacto:** `ceil(100/16)=7` lotes × 8s ≈ 56s no pior caso (proxies mortos = timeout cheio). Request síncrona pode ser cortada por timeout de proxy reverso (60s) / axios antes de responder, perdendo a varredura inteira. Botão "Testar todos" trava sem feedback.
├── 💡 **BOA PRÁTICA:** Para pools grandes: assíncrono (job + progresso via Broadcaster/SSE) ou reduzir timeout por-probe (8s→5s) e subir concorrência (16→32, probes são I/O-bound, não seguram conexão DB).
├── 🗺️ **PLANO AÇÃO:** Avaliar timeout gateway vs pior caso; Opção A (tuning) ou B (assíncrono).
├── 📋 **TAREFAS:**
│   - [ ] Avaliar timeout reverse-proxy/axios vs pior caso
│   - [ ] Opção A: concorrência 16→32, timeout 8s→5s (l.555/572)
│   - [ ] Opção B (preferida pools grandes): test-all assíncrono com progresso SSE
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `business/internal/controllers/proxy.go:555,572` · `proxy_probe.go:27,75`

---

## ⚪ P4 — BAIXO

### 🚨 GAP: Status `'banned'` de proxy é código morto (UI filtra, backend nunca seta)
├── 📉 **Impacto:** Model documenta `'banned'` e frontend oferece filtro+badge, mas NENHUM código backend seta `status='banned'` (auto-isolação usa `'isolated'`). Operador filtra "Banido" e nunca vê nada. UX confusa, sugere capacidade inexistente.
├── 💡 **BOA PRÁTICA:** Ou remover `'banned'` do enum UI/model, ou implementar a transição (confirmação manual distinta de `'isolated'`).
├── 📋 **TAREFAS:** Decidir semântica banned vs isolated (ADR 0016) · remover ou implementar consistente em model+UI
├── ⚠️ **TIER:** T3 (decisão de produto)
└── 📁 **Arquivos:** `business/internal/models/proxy.go:13-18` · `frontend/src/pages/Settings/components/ProxySection.tsx:43-44,269`

### 🚨 GAP: Rotas `/proxies*` sem gate de permissão explícito (qualquer agente do tenant opera proxy + probe)
├── 📉 **Impacto:** `auth.GetScoped(c,"Whatsapps")` só escopa a query por tenant, NÃO impõe a permissão como autorização. Qualquer usuário autenticado (inclusive agente comum) pode criar proxy e disparar probe. Vetor SSRF **limitado** (destino fixo ip-api; o host arbitrário é o PROXY, não a URL final — risco real é varredura de portas internas via timing). Consistente com `/whatsapp` atual → não é regressão.
├── 💡 **BOA PRÁTICA:** Middleware `RequirePermission('Whatsapps')` nas rotas de infra; denylist de proxy em faixas RFC1918/loopback no probe; ip-api configurável e fail-soft.
├── 📋 **TAREFAS:** Middleware de permissão em `/proxies*`/`/proxy-groups`/`/connection-groups` · avaliar denylist interna no probe · ip-api configurável fail-soft
├── ⚠️ **TIER:** T2 (alinhar com decisão de produto sobre quem opera proxies)
└── 📁 **Arquivos:** `business/internal/controllers/proxy_probe.go:75` · `proxy.go:493` · `routes/routes.go:130` · `pkg/auth/tenant.go:84`

### 🚨 GAP: Código morto — `frontend/src/components/ContactDrawer/` (~9 arquivos órfãos)
├── 📉 **Impacto:** `ContactDrawer` não é importado em lugar nenhum (grep confirma zero refs). O painel vivo usa `DadosTab`/`DetailsPanel`. ~9 arquivos compilam e poluem a base, mascarando qual é o sidebar real. Inclui lógica recente (contato→FlowRun, commit 8ad245ef0) nunca renderizada.
├── 💡 **BOA PRÁTICA:** Remover o diretório após confirmar zero imports, ou religar `FlowsSection`/`NewFlowRunDialog` ao `DadosTab` vivo.
├── 📋 **TAREFAS:** Confirmar zero refs (feito) · remover `ContactDrawer/` OU integrar ao `DadosTab` · `npm run typecheck && build`
├── ⚠️ **TIER:** T2
└── 📁 **Arquivos:** `frontend/src/components/ContactDrawer/index.tsx:23` + dir · `frontend/src/pages/Tickets/components/DetailsPanel.tsx:48`

### 🚨 GAP: `ticket_mutation.go` — `Status`/`Range` sem `ValidateStringField` (GAP-VAL-3/M18 pendente)
├── 📉 **Impacto:** `UpdateTicket` lê `input.Status` (l.45) e `RecoverHistory` lê `input.Range` (l.98) como string livre, sem validação de tamanho/charset — inconsistente com proxy.go/pipeline/flow. Risco baixo (campos pequenos), mas é débito registrado.
├── 💡 **BOA PRÁTICA:** `utils.ValidateStringField` após o bind, ou whitelist de enum (open/pending/closed; 1d|2d|7d|30d|all).
├── 📋 **TAREFAS:** ValidateStringField/whitelist para `input.Status` (após l.48) e `input.Range` (após l.101) · marcar M18/GAP-VAL-3 concluído em `ORCHESTRATOR-ROADMAP.md:30`
├── ⚠️ **TIER:** T1
└── 📁 **Arquivos:** `business/internal/controllers/ticket_mutation.go:45,98` · `ORCHESTRATOR-ROADMAP.md:30`

### 🚨 GAP: `window.confirm` em DeleteAll/Delete + assign por cidade com geo stale
> Consolidação de 2 achados P4 menores (UX destrutiva + precisão geográfica).

├── 📉 **Impacto:** (a) `DeleteAll` (operação irreversível que detacha TODAS as conexões → fail-open) atrás de `window.confirm` trivial, inconsistente com o DS shadcn. (b) `assign-group` por `cityFilter`: proxies não testados têm `city` vazia e caem em "Todas as cidades", podendo ser atribuídos junto e contaminar o grupo geográfico (tenant-scope ok, é precisão funcional).
├── 💡 **BOA PRÁTICA:** Trocar `window.confirm` por `AlertDialog` shadcn (DeleteAll com typed-confirm); avisar/bloquear assign quando há proxies com `city` vazia sob `cityFilter` ativo.
├── 📋 **TAREFAS:** `AlertDialog` em handleDelete/handleDeleteAll (typed-confirm no DeleteAll) · aviso no diálogo de assign quando filtered tem `city` vazia
├── ⚠️ **TIER:** T3 (UX, baixa prioridade)
└── 📁 **Arquivos:** `frontend/src/pages/Settings/components/ProxySection.tsx:105-114,133-146,148-187` · `business/internal/controllers/proxy.go:647-673`

---

## ✅ DIMENSÕES VERIFICADAS E SÃS (sem ação)

- **Não-vazamento da senha de proxy** — `PasswordEnc` com `json:"-"`, nunca em `toProxyResponse`/Import/logs; cryptobox AES-256-GCM fail-closed. ✅
- **Auth das rotas novas + Build/Tipos** — todas sob `protected` (IsAuth+TenantMiddleware); `go build`/`go vet`/`npm run typecheck` EXIT 0. ✅
- **Higiene geral** — sem TODO/FIXME/console.log nas áreas auditadas; swagger.json sincronizado (88 paths, diff vazio). ✅
- **Pool de conexões DB no test-all** — probes são rede pura (não seguram conexão DB); persistência serial → sem risco de exaustão pelo test-all. (Nota latente: `database.go:27` sem `SetMaxOpenConns` global — risco geral sob pico, T2 trivial). ⚠️ menor

### 🔧 Reparos de débito-fantasma (docs/memória)
- Memória `project_audit_debt.md` lista "QuickAnswerEditor 1157L" como pendente — **já resolvido** (343L, decomposto em `editors/`). Atualizar memória.
- Subsistema de proxy **sem doc** — criar `docs/agents/proxy.md` (invariantes: fail-closed, sticky-LRU/rotate, dedup, never-leak-password, geo) + ADR + linha na tabela de Status do CLAUDE.md.
- `SetMaxOpenConns/SetMaxIdleConns/SetConnMaxLifetime` ausentes em `database.go:27` (produção) — adicionar (T2, trivial).

---

## 🗺️ MATRIZ DAG DE CORREÇÃO

Legenda: `[∥]` paralelizável · `[T3]` bloqueante (aprovação do dono) · ⏱️ <10min ou slice vertical.

```
═══ ONDA 0 — Bugs P1 de runtime (máxima prioridade, paralelizáveis entre si) ═══

P1-A  Fix Delete fail-open (proxy.go 2 UPDATEs por proxyMode) ........ [∥] ⏱️slice  depends_on: ∅
P1-B  Fix db-reuse proxy_group.go (Session NewDB)  .................. [∥][T3] ⏱️    depends_on: ∅
P1-C  Fix db-reuse connection_group.go (Session NewDB) ............. [∥][T3] ⏱️    depends_on: ∅
        (T3: P1-B/P1-C exigem teste novo — controllers sem cobertura)

═══ ONDA 1 — Resiliência anti-ban (após P1, alguns dependem de P1-A) ═══

P2-IPAPI  Desacoplar dial-vs-echo no probe + não rebaixar em 5xx/429 .. [∥]        depends_on: ∅
P2-SOCKS  engine SetProxyAddress p/ socks5 ......................... [∥]          depends_on: ∅
P3-STICKY Pick sticky em transação única (fail-closed) ............. [∥]          depends_on: ∅
P3-UPDDUP Update revalida dedup + reseta geo ....................... [∥]          depends_on: ∅
P3-403    [T3] heurística/doc sub-detecção 403 ..................... [T3]         depends_on: ∅ (decisão produto)

═══ ONDA 2 — Performance test-all (sequencial: batch antes de async) ═══

P3-BATCH  TestAll → bulk UPDATEs em transação ..................... ⏱️           depends_on: P1-A (mesma região de Update de status)
P3-ASYNC  TestAll assíncrono via SSE (opcional, pool grande) ....... slice        depends_on: P3-BATCH, P2-IPAPI

═══ ONDA 3 — God-files (todos ∥ entre si; nenhum bloqueia bug) ═══

G-QA   quick_answer.go → payload_builder ........................... [∥] slice    depends_on: ∅
G-PX   proxy.go → crud/bulk/helpers ............................... [∥] slice    depends_on: P1-A, P3-BATCH (mexem em proxy.go — fazer DEPOIS p/ evitar conflito)
G-KBC  KnowledgeBaseConfig.tsx → subcomp+hook ..................... [∥] slice    depends_on: ∅
G-SK   skeleton.go → match/run/start/vars ......................... [∥] slice    depends_on: ∅
G-PS   ProxySection.tsx → table/dialog+hooks ...................... [∥] slice    depends_on: ∅ (coordenar com P4-CONFIRM)
G-KBM  knowledge_base_mutation.go → helpers CreateSource .......... [∥] slice    depends_on: ∅
G-FL   flow.go → graph_validation + buildUpdateSet ................ [∥] slice    depends_on: ∅
G-AI   AISettings.tsx → 3 cards .................................. [∥] slice    depends_on: ∅

═══ ONDA 4 — Estrutural + débito + docs ═══

S-REPO [T3] Repositórios (Proxy/FlowRun) + DI ...................... [T3] slice    depends_on: P1-A,P1-B,P1-C,G-PX,G-SK (codifica o fix dos bugs)
D-IDX  Índices compostos (tenant,proxyGroupId)/(tenant,connGroupId) . [∥] ⏱️       depends_on: ∅
D-POOL SetMaxOpenConns/Idle/Lifetime em database.go ............... [∥] ⏱️       depends_on: ∅
P4-VAL ValidateStringField Status/Range + marcar M18 .............. [∥] ⏱️       depends_on: ∅
P4-DEAD Remover ContactDrawer/ (código morto) ..................... [∥] ⏱️       depends_on: ∅
P4-BAN  [T3] Decidir banned vs isolated (model+UI) ................. [T3]         depends_on: P3-403 (mesma decisão)
P4-CONFIRM AlertDialog DeleteAll + aviso assign geo ............... [∥] slice    depends_on: G-PS (mexe no mesmo componente)
P4-AUTH [T3] RequirePermission nas rotas de infra ................. [T3]         depends_on: ∅ (decisão produto)
DOC-1  docs/agents/proxy.md + ADR + Status CLAUDE.md ............... [∥]          depends_on: P1-A,P3-403 (documentar comportamento final)
DOC-2  Atualizar memória (QuickAnswerEditor resolvido) ............ [∥] ⏱️       depends_on: ∅
```

### Frente paralela imediata (sem dependências, podem começar JÁ)
`P1-A` · `P1-B` · `P1-C` · `P2-IPAPI` · `P2-SOCKS` · `P3-STICKY` · `P3-UPDDUP` · `G-QA` · `G-KBC` · `G-SK` · `G-KBM` · `G-FL` · `G-AI` · `D-IDX` · `D-POOL` · `P4-VAL` · `P4-DEAD` · `DOC-2`

### Gates de aprovação do dono (T3 — não auto-executar)
- **P1-B / P1-C** — exigem suíte de teste nova em controllers sem cobertura (esforço + decisão de fixture DB).
- **S-REPO** — refatoração estrutural ampla (interfaces + DI em `main.go`).
- **P3-403 / P4-BAN** — mudança de semântica de detecção de ban (produto).
- **P4-AUTH** — quem pode operar proxies é decisão de produto.

### Sequenciamento crítico para evitar conflito de merge em `proxy.go`
`proxy.go` é tocado por **P1-A, P3-BATCH, P3-UPDDUP, G-PX**. Ordem obrigatória: **P1-A → P3-UPDDUP → P3-BATCH → G-PX** (decompor por último, depois que os fixes de comportamento aterrissaram). `ProxySection.tsx`: **G-PS → P4-CONFIRM**.
---

# Módulo: Acessos (Usuários, Setores, Cargos, Permissões) — 2026-07-01

Refatoração aprovada via mentoria (`grill-feature-with-docs`). Ver ADR 0022,
`docs/agents/acessos.md`, bloco `## Módulo: Acessos` no CLAUDE.md.

## GAPs

```
GAP-1 [T3] Reset de schema RBAC (Setor/Cargo/junções; drop Group/Role/RolePermission)
├── models novos: Setor, Cargo (renomeia Role), user_setores, setor_filas, cargo_permissoes
├── Users: remove Profile/GroupID; adiciona cargoId, alcance
├── seed: catálogo recurso:ação + Cargos-padrão (Atendente/Gestor/Gerente Geral/Administrador) + 1º Admin
└── depends_on: ∅ — RAIZ, bloqueante, feito por schema real de dev (não delegado a agente autônomo)

GAP-2a [T3] effectivePermissions() + RequirePermission (helper, sem aplicar ainda)
└── depends_on: GAP-1

GAP-3 [T2] Backend CRUD Setor (novo controller, substitui group.go)
└── depends_on: GAP-1

GAP-4 [T2] Backend CRUD Cargo (renomeia role.go)
└── depends_on: GAP-1

GAP-5 [T2] Backend User atualizado (cargoId/setorIds+ehGestor/alcance) + anti-lockout dono/último Admin
└── depends_on: GAP-1, GAP-3, GAP-4

GAP-2b [T3] Aplicar RequirePermission nas rotas sensíveis (users/setores/cargos/conexões/faturamento/relatórios/reassign-close-ticket)
└── depends_on: GAP-2a, GAP-3, GAP-4, GAP-5

GAP-6 [T2] Frontend Central de Acessos (abas Usuários/Setores/Cargos, substitui 7 rotas antigas)
└── depends_on: GAP-3, GAP-4, GAP-5

GAP-7 [T2] Testes (herança, escopo gestor, enforcement 403, anti-lockout 409)
└── depends_on: GAP-2b, GAP-6
```

## Aprovação do dono
- **GAP-1** (reset destrutivo do banco de dev) — ✅ aprovado 2026-07-01.
- **GAP-2/2b** (enforcement real de autorização) — ✅ aprovado 2026-07-01.

## Arquivos identificados
- Backend: `business/internal/models/{user,group,permission}.go`, `business/internal/database/database.go` (AutoMigrate+seed), `business/internal/controllers/{user,user_mutation,group,role}.go`, `business/internal/routes/routes.go`, `business/pkg/auth/tenant.go`, `business/internal/middleware/auth.go`, `business/internal/infrastructure/repository/gorm_user_repo.go` (effectivePermissionNames).
- Frontend: `frontend/src/pages/{Users,UserEdit,Groups,GroupEdit,Roles,RoleEdit,Access}/*`, `frontend/src/components/UserModal/*`, `frontend/src/routes/index.tsx` (7 rotas a substituir).

## Bug ativo que este trabalho fecha
`GroupEdit` envia `userIds` em `PUT /groups/:id`, mas o backend ignora — vínculo user↔grupo pela tela de Grupo nunca persistia. Desaparece por construção no novo modelo (`user_setores` explícito).

## Status GAP-1 (2026-07-01) — ✅ CONCLUÍDO

Branch `refactor/acessos-gap1-schema` (push feito, PR ainda não aberto —
aguardando completar GAP-3/4/5 antes de abrir PR único ou incremental).

- Reset de schema aplicado no banco de dev real (DROP DATABASE + CREATE
  DATABASE TEMPLATE template0 — reset total, não patch condicional, dado que
  o Watink é instalado em múltiplos ambientes).
- Backup completo pré-reset em `.backups/watink_pre_acessos_reset.dump` (~1GB).
- Modelos novos: `Setor`, `Cargo`, `CargoPermissao`, `UserSetor`, `SetorFila`.
- `User.Profile`/`GroupID` removidos; `User.CargoID`/`Alcance` adicionados.
- Catálogo de Permission: 47 entradas `recurso:ação` (era `resource:view` de
  menu). `InitializeTenant` cria 4 Cargos-padrão + Setor "Geral" + admin
  blindado (dono, alcance=tenant).
- Descoberta/fix: `Cargo.Permissions` via tag `many2many` do GORM não
  funciona com tabela de junção de colunas customizadas (Association()
  resolve nomes de coluna independente do struct explícito) — gerenciado
  manualmente (`attachCargoPermissions`/`loadCargoPermissions`), mesmo padrão
  de `UserSetor`/`SetorFila`.
- Validado: suíte 100% verde, boot limpo, `/initial-setup` + `/auth/login`
  end-to-end confirmados manualmente contra o Postgres real de dev.

### Próximo lote (paralelizável — arquivos sem overlap)
- GAP-2a: `effectivePermissions`/`RequirePermission` helper (pacote de Gestor
  via `user_setores.ehGestor`, escopado por Alcance) — arquivo novo em
  `business/pkg/auth/`.
- GAP-3: controller `Setor` (CRUD + membros + ehGestor + filas vinculadas) —
  arquivo novo `setor.go`.
- GAP-4: controller `Cargo` (renomeia `role.go`, já deletado no GAP-1) —
  arquivo novo `cargo.go`.

Depois: GAP-5 (User atualizado, depende de 3+4) → rotas (routes.go,
sequencial) → GAP-2b (aplicar enforcement) + GAP-6 (frontend) → GAP-7 (testes).

## Status GAP-2a/3/4 (2026-07-01) — ✅ CONCLUÍDOS (paralelo)

3 agentes em paralelo, cada um em worktree isolada (2 precisaram de correção
de checkout — worktree criado a partir de commit-base desatualizado; ver nota
abaixo). Merges sequenciais na branch `refactor/acessos-gap1-schema`, 1
colisão de nome resolvida (`uniqueInts` duplicado entre setor.go/cargo.go,
GAP-3 e GAP-4 não se viram — mantida a versão de cargo.go).

- **GAP-2a**: `effectivePermissionNames` soma o pacote de Gestor (Cargo
  "Gestor" do tenant) quando `user_setores.ehGestor=true`, sem exigir que o
  Cargo base do usuário se chame "Gestor". `RequirePermission(resource,
  action)` criado em `business/pkg/auth/permission.go` — middleware de
  enforcement, AINDA NÃO aplicado em nenhuma rota (isso é GAP-2b).
- **GAP-3**: `SetorController` completo (9 handlers). Corrigiu 2 bugs reais
  do padrão "GetScoped não é nova sessão" descobertos pelos testes contra
  Postgres real.
- **GAP-4**: `CargoController` completo (6 handlers, incl. matriz de
  permissões). Anti-lockout: bloqueia deletar o único Cargo "Administrador"
  do tenant ou um Cargo em uso.
- Nenhum dos 3 editou `routes.go`/`container.go` (por instrução) — rotas
  ainda não registradas, feito a seguir sequencialmente para evitar conflito
  de merge no hub file.
- Suíte completa 100% verde com os 4 GAPs integrados. Push feito
  (`2f7c6e151`).

**Nota operacional**: `isolation:"worktree"` do Agent tool às vezes cria o
worktree a partir de um commit-base desatualizado (visto 2x nesta sessão).
Mitigação: incluir no prompt do agente uma instrução explícita de `git fetch`
+ `git checkout -B <branch> origin/<branch>` como primeiro passo, com
verificação do log antes de prosseguir.

### Próximo passo (sequencial, feito por mim — não delegado)
- Registrar rotas de `/setores*` e `/cargos*` em `routes.go` (arquivo
  compartilhado, hub — sequencial evita conflito).
- GAP-5: User atualizado (payload `cargoId`/`setorIds[]`+`ehGestor`/`alcance`)
  + anti-lockout no `UserController` (bloquear remover/rebaixar o último
  Administrador do tenant ou o dono via `Tenant.OwnerID`).

## Status GAP-5 (2026-07-01) — ✅ CONCLUÍDO

- `CreateUser`/`UpdateUser` aceitam `setores[]` (`{setorId, ehGestor}`),
  replace (não merge) no Update, validado cross-tenant antes de aplicar.
- Anti-lockout (`user_lockout.go`): `DeleteUser` bloqueia (409) excluir o
  dono do tenant ou o último Administrador; `UpdateUser` bloqueia (409)
  trocar o cargoId do dono/último Administrador para um Cargo que não seja
  "Administrador".
- 9 testes novos + suíte completa 100% verde.
- Validado end-to-end via API real: deletar único admin → 409; rebaixar
  cargo do dono → 409; criar usuário com `cargoId`+`setores[ehGestor:true]`
  → sucesso, vínculo confirmado no banco.
- Push: `022d03ef4`.

### Restante do DAG (não iniciado)
- **GAP-2b**: aplicar `RequirePermission` nas rotas sensíveis (faseado:
  users/setores/cargos primeiro, depois conexões/faturamento/relatórios/
  reassign-close-ticket).
- **GAP-6**: frontend — Central de Acessos com abas (Usuários/Setores/
  Cargos), substituindo as 6 telas antigas (`Users`, `Groups`, `GroupEdit`,
  `Roles`, `RoleEdit`, `Access`) e o `UserModal` atual.
- **GAP-7**: testes de integração ponta a ponta cobrindo os invariantes do
  ADR 0022 (herança de setor, escopo de gestor, enforcement 403,
  anti-lockout 409) — muitos já cobertos incrementalmente por GAP; avaliar
  o que falta de cobertura combinada.

## Status GAP-2b (2026-07-01) — ✅ CONCLUÍDO — Backend do ADR 0022 completo

`RequirePermission` aplicado no primeiro lote de rotas sensíveis: `/users*`,
`/setores*`, `/cargos*`, `/whatsapp*`+`/whatsappsession*` (conexões),
`PUT /tickets/:ticketId` (reassign/close via UpdateTicket genérico).

Validado end-to-end: Administrador (alcance=tenant) bypassa tudo; usuário
com Cargo "Gestor" (alcance=proprio) passa em `GET /users` (tem
`users:read`) mas é barrado 403 em `POST /users`/`GET /cargos`/
`DELETE /setores/:id` (não tem essas permissions) — mensagem de erro clara.
Push: `3c20c8b56`.

**Com isso, o BACKEND do ADR 0022 está completo (GAP-1 a GAP-2b).** Rotas
fora do primeiro lote (pipelines/flows/tags/deals/knowledge-bases/quick-
answers/proxies/queues/contacts) ficam para uma próxima fase do rollout —
fora do escopo desta refatoração inicial.

### Restante
- **GAP-6**: frontend — Central de Acessos (abas Usuários/Setores/Cargos),
  substituindo `Users`/`UserEdit`/`Groups`/`GroupEdit`/`Roles`/`RoleEdit`/
  `Access`/`UserModal`.
- **GAP-7**: consolidação de testes — muito já coberto incrementalmente
  (GAP-2a: 10 testes; GAP-3: 18; GAP-4: 15; GAP-5: 9; suíte completa 100%
  verde a cada passo). Avaliar lacunas de cobertura combinada (ex: fluxo
  ponta-a-ponta gestor-escopado-a-um-setor-só) antes de fechar.

## Status GAP-6 (2026-07-01) — ✅ CONCLUÍDO — Refatoração de Acessos completa (GAP-1 a GAP-6)

Frontend: Central de Acessos em `/acessos/:tab` (usuarios|setores|cargos),
substituindo 7 rotas antigas + consolidando 2 itens de menu em 1. Sheets
laterais para editar User/Setor/Cargo; matriz de permissões recurso×ação no
Cargo. `UserModal` corrigido (chamava `/groups`/`/roles`, rotas já removidas
desde o GAP-1 — bug latente que só apareceria ao abrir "Meu perfil").

**Verificação manual no navegador (não só typecheck/lint/build) encontrou
2 bugs reais que nenhuma ferramenta estática pegaria:**

1. **Menu não navegava para `/acessos`**: o agente editou
   `AdminNavItems.tsx` (código MORTO — não importado por nada usado), mas o
   menu real é `SidebarNav.tsx` (usado por `MainSidebar`, que `MainLayout.tsx`
   de fato renderiza), com uma lista de itens PARALELA e desatualizada.
   Corrigido consolidando o item ali também.
2. **Cargo Administrador com 46/47 permissões (Flows 3/4)**: `dropLegacyRBAC()`
   tinha `('flows','read')` na lista de permissões legadas a apagar — mas
   colide (mesmo resource+action) com a permissão NOVA `flows:read` do
   catálogo `recurso:ação`. A cada boot do servidor, a permissão nova era
   apagada e recriada com ID novo, SEM o vínculo ao Administrador (que só é
   atribuído uma vez, no `InitializeTenant`). Corrigido removendo essa
   entrada da lista de DELETE. Validado: reset total + restart do servidor
   (cenário exato do bug) → 47/47 sobrevive.

Ambos só apareceram testando de verdade (login real + navegação + inspeção
da matriz), confirmando a importância de verificação manual além de
build/lint/typecheck para mudanças de frontend.

**Com isso, a refatoração completa do ADR 0022 (Cargo/Setor/Alcance +
enforcement real) está pronta**: schema, 3 controllers novos (Setor/Cargo/
User atualizado), effectivePermissions com pacote de Gestor, anti-lockout,
RequirePermission aplicado no primeiro lote de rotas, e frontend consolidado
numa Central de Acessos. Suíte Go 100% verde, typecheck/lint/build frontend
limpos. Push final: `a829f393b`.

### Pendente
- **GAP-7** (consolidação/lacunas de teste combinado) — avaliar se algo
  além da cobertura incremental já feita (GAP-2a: 10 · GAP-3: 18 · GAP-4: 15
  · GAP-5: 9 testes) é necessário antes de considerar a refatoração encerrada.
- PR de `refactor/acessos-gap1-schema` → `develop` ainda não aberto —
  aguardando decisão do dono sobre revisar antes ou seguir direto.

## Módulo Onboarding — Wizard + Checklist (2026-07-01)

Escopo mentorado via `/grill-feature-with-docs` após a refatoração de Acessos
(ADR 0022): melhorar o Wizard de Setup Inicial (cadastro da empresa) e
introduzir um Checklist pós-login guiando o primeiro Setor real e o primeiro
usuário adicional. Documentação preparada antes da implementação:
`docs/agents/onboarding.md`, bloco `## Módulo: Onboarding` no `CLAUDE.md`,
termos novos no `CONTEXT.md` (Wizard de Setup Inicial, Checklist de
Onboarding, verbete Tenant corrigido). Mesma branch da refatoração de
Acessos (`refactor/acessos-gap1-schema`) — continuação do mesmo esforço.

### Status GAP-A (2026-07-01) — ✅ CONCLUÍDO — Backend

- `domain.TenantSeedData`/`SetupRequest` ganham `CompanyName` (obrigatório,
  validado via `ValidateStringField`) → `Tenant.Name` (antes:
  `"{firstName}'s Workspace"`).
- Os 4 Cargos-padrão (Atendente/Gestor/Gerente Geral/Administrador) ganham
  `Description` real explicando o que cada um cobre.
- Queue "Atendimento Inicial" ganha `GreetingMessage` padrão.
- Testes ajustados (`setup_service_test.go`, `setup_mock_test.go`) — suíte
  completa (`services`+`controllers`) 100% verde. `go build`/`go vet` limpos.

### Status GAP-B (2026-07-01) — ✅ CONCLUÍDO — Frontend do Wizard

- `frontend/src/pages/InitialSetup/index.tsx`: campo "Nome Fantasia da
  Empresa *" adicionado (full-width, acima de Nome/Sobrenome), incluído na
  validação client-side e no payload de submissão.
- Validado em browser: campo renderiza corretamente; submit com payload
  completo retorna 403 "System already initialized" tratado via toast
  (sistema já estava inicializado no ambiente de dev — confirma o
  tratamento de erro do fluxo real, não só o caminho feliz).

### Status GAP-C (2026-07-01) — ✅ CONCLUÍDO — Checklist de Onboarding

Implementado via workflow (fases Investigate → Implement → Review → Fix;
review não encontrou findings). Arquivos novos:
`frontend/src/pages/Dashboard/hooks/useOnboardingChecklist.ts` (estado 100%
derivado — contagem via `GET /setores`/`GET /users`, sem flag persistida) e
`frontend/src/pages/Dashboard/components/OnboardingChecklistCard.tsx` (card
no Dashboard, logo após `DashboardKpiRow`). Extensão cirúrgica em
`SetorPanel`/`SetoresTab`/`UsuariosTab`/`useSetoresTab` para suportar
auto-abertura do painel de criação via query param (`?autoOpen=create`,
+`suggestedName` para Setor) — mecanismo que não existia antes.

**Achado da investigação prévia**: não existe atalho de backend para criar
Setor+Queue vinculados numa chamada só (`POST /setores` só aceita `name`; o
vínculo de Queue só é possível depois, via `PUT /setores/:id/queues`, com o
painel fechando automaticamente após criar). Decisão registrada: o
checklist NÃO tenta bundlar Setor+Queue nem manter o painel aberto para
forçar esse fluxo — linka para `/acessos/setores` com nome sugerido
pré-preenchido (chips: Atendimento/Vendas/Suporte/Financeiro), dentro do
limite já documentado ("não é um tour guiado interativo").

**Validado manualmente em browser (não só typecheck/lint/build)**, com o
tenant de dev real (`admin@test.com`, 1 Setor + 1 User pré-existentes):
- Card aparece para o Administrador (alcance=tenant), ambos os itens
  pendentes (contagens reais 1/1 confirmadas via API).
- Clique no chip "Atendimento" → navega para `/acessos/setores`, painel
  "Novo Setor" auto-abre com nome pré-preenchido "Atendimento" — criado com
  sucesso (contagem via `PUT`/`POST` real, não mock).
- Item "Criar setor" desaparece (botão+chips somem) assim que a contagem
  passa de 1 para 2 — sem reload manual necessário além da navegação de
  volta ao Dashboard.
- Botão "Criar usuário" → mesma auto-abertura em `/acessos/usuarios`,
  usuário criado com sucesso.
- Card inteiro desaparece quando os 2 itens ficam completos (allDone) —
  e reaparece corretamente depois que os registros de teste foram
  removidos (contagem de volta a 1/1), confirmando que o estado é
  realmente derivado em tempo real, não cacheado.
- Setor e usuário de teste criados durante a verificação foram apagados ao
  final, restaurando o tenant de dev ao estado anterior (1 Setor + 1 User).

Suíte Go completa 100% verde, `npm run typecheck`/`lint`/`build` limpos.

---

# 🆕 Redesenho de Plugins (Marketplace + Licenciamento via Hub) — jul/2026

Origem: sessão `/grill-feature-with-docs` + `/orchestrator`. Documentação de
referência: ADR 0024, `docs/agents/plugins.md`, bloco `## Módulo: Plugins`
no `CLAUDE.md`, `CONTEXT.md` (Plugin/Marketplace/Watink Hub/plugin-manager/
Licença de Plugin/Alocação/degradeMode). ADR 0003 marcado como superado no
ponto da flag. Contraparte servidora: `watink-ecosistema/hub` (novo projeto,
só spec). **Branch:** `feat/plugin-marketplace-licensing` (de `develop`,
commit base `547b42b11` com a doc).

## Gate de aprovação (T3) — ✅ APROVADO pelo dono (2026-07-02)
P-1 (migration real de `PluginInstallations`) e P-4 (remoção do `saas-plugin`
+ rotas `/saas/manager/*`, redundante com o `watink-saas`) aprovados
explicitamente.

## Onda 0 — Fundação (paralelizável, arquivos sem overlap) · ✅ CONCLUÍDA (2026-07-02)
- [x] **P-1** [T3]: Migration real de `PluginInstallations` — model GORM
  `business/internal/models/plugin_installation.go` (tenantId, pluginId
  string=slug do catálogo, active, activatedAt, activatedBy *uuid),
  `AutoMigrate` + `UNIQUE(tenantId,pluginId)` + índice `tenantId` em
  `database.go`. Schema manual do `testutil` removido (redundante).
  **Decisão**: NÃO entrou em `applyRLS()` — segue o padrão majoritário do
  projeto de RLS seletivo (Setores/Cargos/Proxies também ficam de fora).
  Commit `2d5f3cff7`.
- [x] **P-2** [T2]: `business/pkg/licensetoken` — `Verify(token, keys
  []PublicKey) (*Claims, error)` via `golang-jwt/v5` (já usado no projeto
  p/ JWT de sessão), `SigningMethodEdDSA`, claims validadas manualmente
  (exp após checar assinatura, para erro específico). 4 sentinel errors
  (`ErrUnknownKid/ErrInvalidSignature/ErrTokenExpired/ErrMalformedToken`).
  6 testes/10 subtestes verdes. Sem `Emit()` (fica no Hub). Commit
  `da2efa011`.
- [x] **P-3** [T2]: `plugin-manager`: `instance.go` — `getInstanceID()`/
  `generateInstanceID()` (`INST-{unix}-{hex12 via crypto/rand}`),
  persistido em `.instance_id` (plain-text, convenção já existente).
  **Achado**: já havia um `getInstanceID()` fraco (hash previsível de
  `UnixNano()`) — substituído. Commit `49f97e701`.
- [x] **P-4** [T3]: `saas-plugin` removido (`main.go` + `saas.go` deletado
  + testes `TestSaaSPlugin_*`). **Achado**: nenhum teste de contagem de
  plugins existia no repo — nada a ajustar em `helpdesk_manager_test.go`.
  Swagger não regenerado (rotas nunca tiveram anotação swaggo). Commit
  `a74663513`.

**Integração**: 4 worktrees paralelas, sem conflito de merge (arquivos
disjuntos). Cherry-pick sequencial em branch `onda0-merge` → renomeada
para `feat/plugin-marketplace-licensing`. Build+vet+suíte completa
(`business` + `plugin-manager`) verdes com as 4 mudanças combinadas —
incluindo o pacote novo `pkg/licensetoken` (1.194s).

## Onda 1 — Elo plugin-manager ↔ business (após Onda 0) · ✅ CONCLUÍDA (2026-07-02)
- [x] **P-5** [T2]: `plugin-manager`: `GET /internal/licenses` —
  `licenses.go`, stub de dev (sem `HUB_URL`: todo plugin conhecido
  responde `active`/`tenantCap=0`/`exp=0`). `resolveLicenseFromHub()`
  definida mas não chamada (fail-closed `unlicensed`), TODO documentado
  p/ quando o heartbeat do Hub existir. Lista estática de slugs
  conhecidos (`helpdesk`,`webchat`). Commit `182fa4d09`.
- [x] **P-6** [T2]: `business/internal/pluginlicense/client.go` —
  `Client.GetLicense(slug)` com cache em memória (TTL
  `PLUGIN_LICENSE_CACHE_TTL_SECONDS`, default 60s) + fallback pra cache
  stale quando o plugin-manager está indisponível; erro só quando não há
  cache algum. Nunca fala com o Hub. Commits `10a69e0a4` + fix lint
  `27f473af2`.
- [x] **P-7** [T2]: `business/internal/plugins/registry.go` —
  `PluginRegistry.GetStatus(tenantId, pluginSlug)` real: cruza alocação
  (`PluginInstallations.active`) × licença (`LicenseFetcher`, adapter do
  client P-6). Não alocado → `StatusBlocked`; alocado+active/readonly/
  blocked/unlicensed → status correspondente; erro do client →
  **fail-closed** `StatusBlocked` (documentado no código). `manager.go`
  resolve `tenantId` do contexto Gin em request-time. 8 testes (inclui
  isolamento cross-tenant). Commit `3490bed65`.

**Achado de processo**: 1 tentativa de P-7 falhou silenciosamente — o
agente relatou "vou despachar um agente" e encerrou sem nenhum commit
(worktree limpa, sem diff). Redisparado com instrução explícita de
execução direta + prova via `git log`/`git diff --stat`; concluído na
2ª tentativa com verificação por inspeção direta da worktree (não só o
texto do relatório). Ver `feedback_agent_self_delegation` na memória.

**Armadilha de worktree registrada**: um agente rodando `checkout -B
<mesma-branch>` numa worktree separada RESETA o ponteiro compartilhado
da branch (refs são globais ao `.git`) — um commit local (P-5) ainda
não empurrado foi temporariamente "perdido" (recuperado via reflog +
`git reset --hard`). Mitigação adotada dali em diante: **push imediato**
após cada commit mesclado, antes de despachar a tarefa seguinte que
abre outra worktree na mesma branch. Ver `feedback_worktree_branch_reset`
na memória.

## Onda 2 — Endpoints core · ✅ CONCLUÍDA (2026-07-02, fatia única)
Consolidado num único agente (não paralelizado) — os 4 endpoints vivem no
mesmo arquivo `plugin_manager.go` de ~75L; paralelizar teria gerado
conflito de merge certo. `business/internal/controllers/plugin_manager.go`
+ `routes.go` + `plugin_manager_test.go` + swagger regenerado. Commit
`56ad7d5d0`.
- [x] **P-8**: `POST /plugins/:slug/activate` — consulta `Client.GetLicense`;
  `status="active"` → upsert `PluginInstallations` (lookup-then-branch, não
  `ON CONFLICT`, pois o UNIQUE só existe via SQL raw em prod, não no
  AutoMigrate de teste); `readonly/blocked/unlicensed` → 402
  `{"error":"plugin_unlicensed","checkoutUrl":""}`; teto atingido (tenant
  novo + `count(active)>=tenantCap>0`) → 402
  `{"error":"plugin_tenant_cap_reached"}`. **Débito registrado**:
  `ActivatedBy` fica `nil` — `userId` do contexto é `int` (Users.ID), não
  `uuid.UUID`; exigiria mudança de model, fora do escopo desta fatia.
- [x] **P-9**: `POST /plugins/:slug/deactivate` — `active=false` (preserva
  histórico, não deleta — "suspensão nunca apaga").
- [x] **P-10**: `GET /plugins/installed` — `active[]` dos alocados +
  `statuses{}` via `PluginRegistry.GetStatus` real por slug.
- [x] **P-11**: `GET /plugins/catalog` — **catálogo estático placeholder**
  (helpdesk+webchat, `type:"pro"`), documentado com `TODO(ADR 0024)`
  apontando para o proxy real via plugin-manager quando o Hub existir. NÃO
  tenta proxyar o plugin-manager ainda (sem garantia de dado real lá).

## Onda 3 — Testes e limpeza · ✅ CONCLUÍDA
- [x] **P-12**: confirmado durante P-4 — nenhum teste de contagem de
  plugins existia no repo; nada a ajustar.
- [x] **P-13**: absorvido pela Onda 2 — `plugin_manager_test.go` cobre
  activate licenciado/sem licença/teto atingido/idempotente, deactivate,
  installed com status real, catalog estático. Suíte completa
  (`business`+`plugin-manager`) + `frontend typecheck` verdes como gate
  final.

## ✅ DAG COMPLETO — Redesenho de Plugins (P-1 a P-13)
13 tarefas concluídas. `business` e `plugin-manager` compilam e testam
100% verde; frontend typecheck limpo (rotas `/plugins/*` que ele já
chamava agora respondem de verdade em vez de 503/vazio). **Débitos
registrados para fases futuras** (nenhum bloqueia esta entrega):
`ActivatedBy` não populado (userId int vs uuid); catálogo é estático até
o Hub existir e o proxy real ser implementado; `resolveLicenseFromHub()`
no plugin-manager definida mas não chamada (heartbeat real do Hub é
trabalho de outro projeto, `watink-ecosistema/hub`); modo dev do
plugin-manager trata todo plugin conhecido como licenciado ilimitado
(correto para destravar desenvolvimento, mas não é enforcement real até o
Hub existir).

## Regra de ouro desta onda (ADR 0024)
`business` nunca fala com o Hub direto — sempre via `plugin-manager`.
`PluginInstallations.active` nunca é autoridade de licença, só alocação.
Nenhuma licença é reportada válida sem verificar assinatura + `exp`.

### Achado incidental (fora de escopo, sinalizado separadamente)

Durante a verificação manual, os logs do `watink-business` mostraram
`ERROR: syntax error at or near "$1"` em toda requisição autenticada —
`business/internal/middleware/auth.go:74` usa
`tx.Exec("SET LOCAL app.current_tenant = ?", tenantID)`, e o Postgres não
aceita bind parameter nessa posição do `SET LOCAL` (precisa de
`set_config()` para aceitar parâmetro). Efeito: a RLS por
`app.current_tenant` está silenciosamente inerte em toda a aplicação — a
proteção real hoje é 100% o filtro manual `WHERE tenantId`. Não é
bloqueante para o Onboarding; sinalizado como tarefa separada
(`task_10ab6677`) em vez de corrigido aqui, para não misturar escopos.

### Pendente (Onboarding)
- Commit + push das mudanças de GAP-A/B/C na branch
  `refactor/acessos-gap1-schema`.
- Mesma decisão em aberto de antes: PR `refactor/acessos-gap1-schema` →
  `develop` ainda não aberto. **[RESOLVIDO]** PR #302 → develop (merge
  fabf618f1) e release PR #303 develop → main (merge 1d9ca68d7). Branch
  `refactor/acessos-gap1-schema` deletada (local + remota).

---

# DAG — Remediação de QA (pós-refatoração Acessos + Onboarding)

**Origem:** [`docs/qa/plano-qa-pos-refatoracao-acessos-onboarding.md`](docs/qa/plano-qa-pos-refatoracao-acessos-onboarding.md)
(auditoria adversarial multi-agente; 16 achados confirmados: 2 P1, 10 P2,
4 P3 + 30 P3 prováveis). **Branch:** `fix/qa-acessos-onboarding` (de develop).
**Diagnóstico (Fase 3) já pronto — orchestrator consome, não re-audita.**

## Item externo (não duplicar)
- **RLS-EXT** — bug RLS inerte `SET LOCAL app.current_tenant` em
  `middleware/auth.go:74` — já rastreado em task separada (`task_10ab6677`).
  Coordenar com T3.x (schema/perf), não recriar.

## Onda 0 — P1 (bloqueia release; JÁ vivo em main) · TIER T3 · ✅ CONCLUÍDA (2026-07-02)
- [x] **T0.1**: P1-1 — `UpdateUser`/`CreateUser` (`user_mutation.go`): enum
  `alcance` validado; no-escalation (`alcanceRank`: ator nunca concede acima
  do próprio); tenant-guard em `cargoId` via `cargoBelongsToTenant`
  (Session NewDB). Funde P2-1 write-path. **Aprovado pelo dono (gate T3).**
- [x] **T0.2**: P1-2 — self-service via **rota `/me` dedicada** (decisão do
  dono): `GET/PUT /me` sem `RequirePermission` (`user_me.go`); `UpdateMe`
  com whitelist estrita `name/email/password/whatsappId` — RBAC ignorado.
  Front `useUserModal.ts` aponta para `/me`.
- [x] **T0.3**: 9 testes novos em `user_rbac_test.go` (self-promo→403;
  enum→400; cargo cross-tenant→400; alcance dentro do escopo→200; Create
  no-escalation→403; Create cargo cross-tenant→400; GetMe→perfil próprio;
  UpdateMe self-service→200; UpdateMe ignora RBAC). Mock `Update` estendido
  p/ persistir alcance (torna o teste de "ignora RBAC" significativo).
  **Validação:** pacote controllers 100% verde (177s), go build/vet limpos,
  frontend typecheck/lint limpos, swagger regenerado (rotas `/me`).
  **Débito de teste:** e2e do fluxo Atendente ("Meu perfil" via UI) fica
  para T2.1 (Onda 2) — cobertura unit do handler + rota gate-free já garante
  o invariante; a fiação end-to-end é o que o e2e adiciona.

## Onda 1 — P2 segurança + regressão funcional visível · T2/T3 · ✅ CONCLUÍDA (2026-07-02)
- [x] **T1.1**: P2-1 read-path defense-in-depth — `loadCargoPermissions`
  (repo) e `cargoHasPermission` (middleware) agora fazem JOIN em `"Cargos"`
  filtrando `tenantId`; um cargoId cross-tenant nunca concede permissão no
  read-path, mesmo que tenha vazado para a linha do usuário. **Aprovado
  como hardening (torna mais restrito, não muda fluxo legítimo).**
- [x] **T1.2**: P2-3 + P2-4 — delegado a subagente; 11 arquivos frontend:
  `Can` decide por `alcance ∈ {tenant,plataforma}` (bypass) + `permissions`;
  gates de superadmin (Swagger/Monitor/VersionFooter/VersionDashboard/
  Settings-S3/TicketOptionsMenu/Helpdesk/TransferTicket) → `alcance ===
  "plataforma"`; `SidebarNav` realinhado ao catálogo real (dashboard/tags/
  quick-answers/helpdesk → `tickets:read`; clients → sem gate). Admin volta
  a ver tudo por bypass. Cast pontual de `alcance` (tipo global fica p/ T3.4).
- [x] **T1.3**: P2-2 — **gate aplicado** (escolha segura, alinha com as rotas
  irmãs `/whatsapp` e satisfaz o invariante ADR 0022): `/proxies`,
  `/proxy-groups`, `/connection-groups` agora gated por
  `connections:<ação>`; comentário enganoso corrigido. Fecha o buraco de um
  não-admin zerar o pool (`DELETE /proxies`).
- [x] **T1.4**: P2-5 + P2-6 — `validatePasswordStrength` (mín. 8) em setup/
  CreateUser/UpdateUser/UpdateMe; `normalizeEmail` (lowercase+trim) no
  setup/create/update e login case-insensitive via `LOWER(email)` em
  `FindByEmailForAuth`. Front `InitialSetup` espelha (mín. 8 + email
  lowercase). 3 testes novos (setup senha curta→400; CreateUser senha
  curta→400; CreateUser normaliza email).
  **Validação Onda 1:** build/vet limpos, frontend typecheck/lint limpos,
  testes controllers/auth/repository/services verdes; suíte completa em
  verificação final.

### Débitos sinalizados pelo subagente T1.2 (para ondas posteriores)
- Nav legado morto (`layout/components/MainNavItems`, `AdminNavItems`,
  `MainListItems`) usa performs inexistentes mas NÃO é renderizado — deletar
  em T3.4.
- Páginas de plugin (`Clients`, `Marketplace`) com performs fora do catálogo
  — hoje visíveis ao Admin por bypass; alinhar/remover gate numa passada de
  plugins (fora do escopo das ondas atuais).

## Onda 2 — testes de regressão de segurança + docs que induzem a erro · T1/T2 · ✅ CONCLUÍDA (2026-07-02)
- [x] **T2.1**: P2-10 — delegado; `e2e/tests/admin/permissions.spec.ts`
  (Atendente → 403 em GET /users, POST /setores, PUT /whatsapp; GET /me → 200
  controle) + `anti-lockout.spec.ts` (DELETE owner → 409; rebaixar último
  Admin → 409). Segue o fixture `auth.fixture` existente.
- [x] **T2.2**: P2-7 + P2-8 + P2-9 — delegado; corrigidos CLAUDE.md,
  onboarding.md, acessos.md, ADR 0022, CONTEXT.md + comentário setor_fila.go:
  sem bundle Setor+Queue; Gestor concede ação tenant-wide (escopo por Setor =
  roadmap); visibilidade de Tickets client-side; `/permissions`→
  `/cargos/catalog/permissions`; `setorIds[]`→`setores:[{setorId,ehGestor}]`;
  `sectors:manage`→`setores:manage`; RLS "inerte" no verbete Tenant; Status
  Atual atualizado; Setor→Queue M:N.
- [x] **T2.3**: P3-4 — delegado; `e2e/tests/onboarding/setup-wizard.spec.ts`
  (re-init → 403; payload vazio → 403) + `checklist.spec.ts` (endpoints do
  hook + regra derivada > 1). Absorve GAP-7.

## Onda 3 — higiene, dívida de schema e performance latente · ✅ CONCLUÍDA (parcial — T3.2 deferido)
- [x] **T3.1**: índices RBAC (`user_setores(setorId)`) + UNIQUE
  (`Cargos(tenantId,name)`, `Setores(tenantId,name)`, `Permissions(resource,
  action)`) em `addCustomIndexes`, best-effort (não trava boot em dado legado
  com duplicata). Roda antes do Seed — a UNIQUE de Permissions já protege o
  catálogo. Seed mantido em FirstOrCreate (ignora erro de corrida; a UNIQUE
  impede duplicar).
- [ ] **T3.2**: **DEFERIDO** — cache do `RequirePermission`. Só necessário
  ANTES de expandir o rollout do gate (não feito nestas ondas); impacto atual
  baixo (1 rota quente). Um cache correto exige Redis + bump de `tokenVersion`
  na mudança de PERMISSÃO (hoje só bumpa em credencial), senão serve permissão
  revogada até o TTL; e um cache in-memory ilimitado em `pkg/auth` é risco de
  memória. Decisão: não introduzir auth-cache meia-boca agora — reabrir junto
  com a expansão do gate.
- [x] **T3.3**: N+1 eliminado — `ShowUser` agora devolve `setores[]` (vínculos
  do usuário), e `useUsuariosTab.openEdit` lê `data.setores` em vez de cruzar
  `GET /setores/:id` de todos os setores. Checklist: `fetchCounts` guarda por
  `dismissed` (0 fetch se dispensado) e usa `Promise.allSettled` (um 403 em
  /users não descarta o /setores).
- [x] **T3.4**: código morto removido — 5 arquivos de nav legado
  (`MainListItems`/`AdminNavItems`/`MainNavItems`/`useMainListItems`/
  `mainListItemsTypes`), DTO `UserDetailResponse` (pacote `dto` esvaziado e
  removido), `c.Set("userEmail")` (claim inexistente). **Deferido:** remoção
  dos tipos `profile`/`role` de `domain.ts`/`useAuth` — `UserProfile/index.tsx`
  ainda lê `user?.profile` (página com débito próprio no plano); remover o
  tipo agora quebraria o typecheck. Fica para a limpeza da página UserProfile.
- [x] **T3.6**: `SetorController.Delete` fail-closed (captura `.Error` do
  Count); `InitializeTenant` com `pg_advisory_xact_lock` + re-check de
  `tenantCount` na tx (barreira concorrente do setup, P3-3).

### Não incluído nas ondas (débito remanescente registrado)
- **T3.5** (i18n namespace `acessos.*` + migração das tabs para React Query) —
  não executado; churn alto, valor baixo, sem risco. Fica para uma passada de
  higiene de frontend dedicada.
- Páginas de plugin (`Clients`/`Marketplace`) com performs fora do catálogo.
- Tipos `profile`/`role` + página `UserProfile` (contrato `signature`/avatar
  multipart + `PUT /users/:id/configs` inexistente) — cluster de débito da
  UserProfile.
- **RLS inerte** (`SET LOCAL app.current_tenant`, `middleware/auth.go`) —
  task externa `task_10ab6677`, deliberadamente não tocada aqui.

## Onda 3 — higiene, dívida de schema e performance latente · T1/T2/T3
- [ ] **T3.1**: Schema — índices RBAC (`Cargos(tenantId,name)`,
  `user_setores(setorId)`) + `UNIQUE(resource,action)` em `Permissions` +
  `UNIQUE(tenantId,name)` em `Setores`/`Cargos` + Seed idempotente
  (`OnConflict{DoNothing}`). | depends_on: [] | **T3 (schema)**
- [ ] **T3.2**: P3-1 — cache do `RequirePermission` por
  `(userId,tokenVersion,tenantId)` TTL 30-60s **antes** de expandir o
  rollout do gate. | depends_on: [T1.1] | T2
- [ ] **T3.3**: P3-2 + checklist — N+1 `resolveUserSetores` (reusar estado
  `setores`) + guard `dismissed`/`allDone` no `useOnboardingChecklist`. |
  depends_on: [] | T1
- [ ] **T3.4**: Código morto — deletar cadeia `MainListItems`/`AdminNavItems`/
  `MainNavItems`/`useMainListItems`/`mainListItemsTypes`; DTO
  `UserDetailResponse` (Profile/GroupID/Roles); `c.Set("userEmail")` de claim
  inexistente; tipos `profile`/`role` em `types/domain.ts`+`useAuth`+Flow. |
  depends_on: [T1.2] | T1
- [ ] **T3.5**: i18n namespace `acessos.*` (pt/en/es) + migração das tabs de
  Acessos para React Query. | depends_on: [] | T2
- [ ] **T3.6**: `SetorController.Delete` fail-closed (capturar `.Error` do
  Count) + P3-3 lock do setup concorrente (`pg_advisory_xact_lock`). |
  depends_on: [] | T2

## Regra de ouro (invariante ADR 0022)
Nenhuma rota nova de escrita entra sem `RequirePermission`; expandir o gate
às rotas do backlog exige o cache de T3.2 no lugar + 1 teste 403 por rota.

## Gate de aprovação (T3)
Onda 0 (T0.1, T0.2), T1.1, T1.3-se-gate e T3.1 são **T3 (auth/schema)** —
**PARADA obrigatória**: aguardando aprovação do dono antes de aplicar.

---

# 🆕 Onda Clientes (CRM) — jul/2026

Origem: sessão `/grill-feature-with-docs` + `/orchestrator`. Documentação de
referência: ADR 0023, `docs/agents/clients.md`, bloco `## Módulo: Clientes
(CRM)` no CLAUDE.md, `CONTEXT.md` (Client/ClientAddress/Contact/Tenant).

## Gate de aprovação (T3) — ✅ APROVADO pelo dono
Escopo aprovado explicitamente: "estamos em desenvolvimento, não precisamos
de nada do legado do plugin que não seja útil, pode remover, vamos
prosseguir." Decommission do `ClientesPlugin` autorizado sem plano de
migração de dado legado (ambiente de desenvolvimento).

## Onda A — fundações independentes (paralelizável, arquivos isolados) · ✅ CONCLUÍDA
- [x] **A1**: Decommission `ClientesPlugin` — registro em `main.go` removido,
  `business/internal/plugins/clientes.go` deletado, testes `ClientesPlugin`
  removidos de `plugin_test.go`/`helpdesk_manager_test.go` (2º plugin do
  teste de contagem trocado por `WebchatPlugin`, sem alterar o número
  esperado). Verificado por `grep -r ClientesPlugin business/` vazio + build/
  vet/test verdes. Commit `8e598c152`.
- [x] **A2**: Catálogo de permissão — resource `clients` (`read`, `create`,
  `update`, `delete`, `manage`) seedado em `database.go:132-136`, mesmo
  padrão de `connections`/`tickets`. Nenhum teste de contagem depende de
  `database.Seed()` (setup_service_test/permission_repo_test usam seeds
  locais próprios) — sem ajuste necessário. Commit `e4e6fc9b2`.
- [x] **A3**: Nova seção "Endereço (CEP)" em Configurações —
  `AddressLookupSettings.tsx` (padrão de `AISettings.tsx`), chaves
  `addressLookupProvider` (default `"viacep"`) e `addressLookupBaseUrl`
  (default `"https://viacep.com.br/ws"`), registrada em `Settings/index.tsx`
  + `SettingsSideNav.tsx`. Commit `bb9e94f9a`.
- **Lição do processo**: os 3 agentes de worktree editaram os arquivos mas
  não commitaram nas suas branches — o primeiro `git merge` de cada uma
  "teve sucesso" sem trazer nenhum arquivo (merge vazio), e a verificação
  inicial (`go build`/`go test`) não pegou isso porque o código no estado
  ORIGINAL também compila e passa nos testes. Descoberto ao inspecionar
  `git diff HEAD <branch>` antes do `git worktree remove` (que corretamente
  recusou apagar o worktree A1 por ter mudanças não commitadas). Corrigido
  commitando nas 3 worktrees antes do merge real. Verificação passou a
  incluir grep explícito pelo resultado esperado, não só build/test verdes.

## Onda B — schema (fatia única, coesa — mesmo arquivo `database.go`) · ✅ CONCLUÍDA
- [x] **B1**: `Client` expandido (`Type`, `SocialName *string`, `DocumentEnc`
  cifrado + `Document` transiente `gorm:"-"` pro controller decifrar,
  `Notes`, `DeletedAt` soft-delete) + novo model `ClientAddress`
  (endereço completo + `Latitude`/`Longitude` nullable) + `Contact.ClientID
  *int` nullable (sem unique — N Contacts podem apontar pro mesmo Client) +
  `AutoMigrate`/`applyRLS`(`Clients`,`ClientAddresses`)/índices
  (`idx_contacts_client` parcial, `idx_client_addresses_tenant_client`) +
  coluna `geog geography(Point,4326)` via SQL raw best-effort. Verificado
  por grep explícito dos 6 pontos (não só build) + `go test` em
  `infrastructure/repository`. Commit `2c7020970`.

## Onda C — serviços/controller backend (paralelizável após B1)
- [x] **C1**: `services.LookupAddressByCEP` (lê Settings addressLookup*,
  timeout 5s) + `AddressLookupController.Lookup` (`auth.GetScoped`, 400
  CEP inválido / 200 com notFound / 502 erro externo). Rota NÃO registrada
  (fica pra D1). Commit `77225f3ec`.
- [x] **C2**: `services.Geocode` (Nominatim, timeout 5s, User-Agent, nunca
  retorna erro pro chamador) + `services.SyncClientAddressGeography`
  (`ST_MakePoint(lng,lat)` — ordem confirmada). Commit `b9fbaac4f`.
- [x] **C3**: `ClientController` (List/Show/Create/Update/Delete) — DTO de
  input dedicado, validação PJ+SocialName→400, cripto fail-closed na
  escrita/fail-open na leitura, soft-delete via `gorm.DeletedAt`. Rota NÃO
  registrada (D1). Commit `1b74997ca`.
- **Anomalia de processo**: C1/C2/C3 nasceram de worktree baseada em
  `develop` em vez de `feat/clientes-crm` (causa não identificada — possível
  race na criação de worktrees paralelas). C2 e C3 detectaram e
  autocorrigiram (`git reset --hard`/merge trazendo `feat/clientes-crm`
  antes de codar); C1 não precisou (seu escopo não dependia do schema da
  Onda B). Verificado e corrigido no merge — sem perda de trabalho, mas
  fica registrado para vigiar em ondas futuras.
- [x] **C4**: `LinkContact`/`UnlinkContact` em
  `client_contact_link.go` — 409 com `requiresConfirmation` quando o
  Contact já pertence a outro Client e `confirmReassign` não veio `true`;
  reatribuição efetiva com confirmação. Commit `cabee7219`.
- [x] **C5**: `ClientAddress` CRUD aninhado em `client_address.go` —
  `isPrimary` exclusivo por Client (helper compartilhado), geocoding
  best-effort (C1/C2) síncrono mas nunca bloqueante em Create/Update, hard
  delete em `ClientAddress` (só `Client` precisa soft-delete). Commit
  `0cd298146`.
- [x] **C6**: `client_history.go` (`GET` transitivo via `Contact.ClientID`
  IN, `Ticket`+`Deal`, limite 50, `Preload("Contact")`) + `Preload("Contact.Client")`
  trocado em `ticket.go:65,147` e `deal.go:67,102`. **Pendente**:
  `contact.go` (`ListContacts`/`ShowContact`) usa `domain.ContactRepository`
  — não ganhou `Preload("Client")` porque exigiria tocar a interface do
  repositório, fora do escopo cirúrgico. Fica registrado para a Onda F
  (F4, exibição de Nome Social) resolver ou explicitamente aceitar o gap
  na tela de Contatos. Commit `23dacc0d0`.
- Todos verificados por grep explícito dos métodos/arquivos esperados +
  `go build`/`go vet`/`go test ./internal/controllers/...` (220s, verde,
  inclusive os testes pré-existentes de `ticket.go`/`deal.go` que a Parte 2
  de C6 tocou).

## Onda D — wiring de rotas (fatia única, arquivo compartilhado `routes.go`) · ✅ CONCLUÍDA
- [x] **D1**: 13 rotas `/clients*` + `/addresses/lookup` registradas, todas
  sob `auth.RequirePermission("clients", <ação>)` — `/contacts` (débito
  legado sem gate) intocado. Swagger regenerado (`docs/docs.go`,
  `swagger.json`, `swagger.yaml`) e commitado junto. Verificado por grep
  das 13 linhas + `go build`/`go vet`/`go test ./...` (suíte completa do
  backend, todos os pacotes verdes). Commit `d4ca20e22`.

**Backend do módulo Clientes está funcionalmente completo e wireado**
(CRUD, endereços com geocoding, vínculo Contact↔Client, histórico
transitivo, permissões reais). Falta: Onda E (testes unitários
dedicados do `ClientController`), Onda F (frontend), Onda G (e2e).

## Onda E — testes backend · ✅ CONCLUÍDA
- [x] **E1**: Testes unitários `ClientController` (list/create/update/
  soft-delete/link/unlink-com-confirmação/histórico-transitivo/documento-
  nunca-em-texto-plano-na-resposta). | depends_on: [D1] | T2 · ✅ CONCLUÍDA
  (E1a: `client_test.go`, 9 casos, commit `5ed0dcff6`. E1b: link/address/
  history, 13 casos, commit `5b4397254` — **encontrou bug real**: `LinkContact`/
  `ListAddresses`/`History` reusavam o `db` de `auth.GetScoped` em leituras
  encadeadas sem `Session(NewDB:true)`, mesmo landmine do módulo Proxy;
  corrigido diretamente (não mascarado no teste), commit `1ac486973`. Total
  20/20 testes verdes + suíte completa do backend (`go test ./...`) verde.)
- **Lição de prompt**: minhas instruções anteriores (C3-C6) só enfatizavam
  `Session(NewDB:true)` em ESCRITAS encadeadas — o bug real estava em
  LEITURAS encadeadas (`First`/`Find`/`Pluck` sequenciais no mesmo handle).
  A regra correta é mais ampla: qualquer 2ª+ operação (leitura OU escrita)
  no `db` retornado por `auth.GetScoped` precisa de `Session(NewDB:true)`.
- **Achado menor registrado (não corrigido, cosmético)**: `Client.DeletedAt`
  persiste como `deleted_at` (snake_case, default GORM) em vez do padrão
  `deletedAt` camelCase do resto do schema — funciona corretamente, só
  inconsistente. Considerar `gorm:"column:deletedAt"` numa limpeza futura.

## Onda F — frontend (paralelizável parcialmente após D1)
- [x] **F1**: `clientTypes.ts` (`ClientRecord`/`ClientAddress` de resposta,
  distintos dos DTOs de escrita) + `useClients`/`useClientModal`
  reescritos para o contrato `/clients` real — `handleSubmit` agora separa
  Client (`POST/PUT /clients`) de Addresses (`POST/PUT /clients/:id/
  addresses` por item, novo vs existente por presença de `id`). `fetch`
  direto ao ViaCEP REMOVIDO — `handleCepBlur` chama `GET /addresses/
  lookup` do backend. Coluna "Contatos" removida da listagem (API real
  não traz esse array agregado). Vínculo/confirmação de Contact e UI de
  Nome Social ficam para F2. typecheck+lint limpos. Commit `40775f16a`.
- [x] **F2**: `ClientModal.tsx` Dialog→Sheet (confirmado no DOM real:
  `inset-y-0 right-0 h-full`, slide-in-from-right, igual UserPanel);
  Nome Social só em PF (helper LGPD); `ContactsTab` reescrita com busca
  real + link/unlink + `ConfirmationModal` no 409; aba Contatos avisa
  "Salve o cliente antes de vincular contatos" quando `!clientId`.
  **Verificado visualmente ao vivo** (login no docker + navegação real):
  Sheet renderiza corretamente, campo Nome Social some ao trocar pra PJ,
  aba Endereços funcional, aba Contatos com o gate correto — screenshots
  conferidos, sem erro de console atribuível ao módulo Clientes (só um
  warning pré-existente de Tooltip/Popover na página de Tickets, não
  relacionado). Commit `0f8a511ad`.
- [x] **F3**: `perform="view_clients"`→`clients:read`,
  `"edit_clients"`→`clients:create`(botão Novo)/`clients:update`(editar
  linha), `"delete_clients"`→`clients:delete`. `rules.ts` não precisou de
  ajuste (não tinha as chaves legadas). `Can/index.tsx` já implementava o
  padrão real ADR 0022 (`user.permissions` + bypass `alcance`) — não
  precisou mudar. Commit `bdd80904c`.
- **Fix adicional (achado por F3, corrigido diretamente)**: menu lateral
  "Clientes" (`SidebarNav.tsx`) usava `activePlugins.includes("clientes")`
  — gate morto desde que o plugin foi removido (A1), o link nunca mais
  apareceria. Trocado para `Can perform="clients:read"`, verificado ao
  vivo no browser (link `/clients` volta a aparecer no menu). Commit
  `39ed6d816`.
- [x] **F4a**: `frontend/src/utils/clientDisplayName.ts`
  (`getContactDisplayName`) + aplicado em `TicketListItem`, `TicketInfo`,
  `MessageBubble` (chat bubble). `Contact.client?.socialName` adicionado
  aos tipos (`types/Ticket.ts`, `MessagesList/types.ts`). Commit
  `21ca1fe21`.
- [ ] **F4b**: mesma propagação em Notificações (`NotificationToast`),
  Pipeline/Deal (`PipelineKanban`, `PipelineGantt`) e Helpdesk/Protocol
  (`ProtocolCard`, `ProtocolInfoCard`, `ProtocolsTable`), reusando
  `getContactDisplayName` de F4a. | depends_on: [F4a] | T2 · ✅ CONCLUÍDA
  (6/6 arquivos confirmados por grep, `??`→`||` corrigido — `getContactDisplayName`
  nunca retorna `undefined`, então `??` nunca cairia no fallback textual.
  typecheck/lint/build limpos. Commit `76b7a8c78`.)
- **Débito registrado (não bloqueante) #1**: `ContactController`
  (`ListContacts`/`ShowContact`) não ganhou `Preload("Client")` — usa
  `domain.ContactRepository` (achado de C6). A tela de Contatos (não
  Tickets/Deals) não vai mostrar Nome Social até esse preload ser
  adicionado. Fora do escopo desta onda; registrar como follow-up.
- **Débito registrado (não bloqueante) #2**: `Protocol`/Helpdesk não tem
  `Preload("Contact.Client")` no backend (só Ticket/Deal ganharam isso em
  C6) — `getContactDisplayName` degrada graciosamente pro nome civil, sem
  quebrar nada, mas o Nome Social não aparece de fato em Protocol/Helpdesk
  até esse preload backend ser adicionado. Follow-up.

## Onda G — fiscalização final · ✅ CONCLUÍDA
- [x] **G1**: `e2e/tests/clients/clients.spec.ts` — soft-delete, documento
  nunca em `documentEnc` na resposta, PJ+socialName rejeitado, fluxo de
  confirmação link/unlink (409→200 com `confirmReassign`), histórico
  transitivo (shape, sem Ticket real — sem rota `POST /tickets` pra
  simular sem infra AMQP/engine), gate anônimo (401, confirmado via leitura
  do middleware). **Não executado ao vivo** (docker-compose rodando é a
  imagem antiga, sem `/clients` — rebuildar a stack compartilhada foi
  deliberadamente fora de escopo); verificado só estaticamente
  (`tsc --noEmit` limpo). Fica pra CI/execução manual futura.
  Commit `f0c843256`.
- **Achado adicional (aprofunda o débito #1 registrado em F4b)**:
  `domain.Contact` (`business/internal/domain/models.go`,
  `gorm_contact_repo.go`) nem mapeia o campo `ClientID`/`clientId` do
  model GORM — não é só falta de `Preload`, o DTO de domínio do
  `ContactController` não carrega esse campo de jeito nenhum. Capturado
  antes de virar teste flaky (o e2e evitou depender de `GET /contacts/:id`
  pra verificar o vínculo, usando a resposta do próprio `LinkContact`).

## Regra de ouro desta onda (ADR 0023)
`Ticket`/`Deal` nunca ganham `ClientID` desnormalizado — histórico do
Client é sempre `JOIN` via `Contact.ClientID`. Nenhuma rota nova de
`clients`/`addresses` entra sem `RequirePermission`.

## ✅ ONDA CLIENTES (CRM) — DAG COMPLETO
19 tarefas concluídas (A1-A3, B1, C1-C6, D1, E1, F1-F4b, G1) + 2 fixes
diretos (bug real de `Session(NewDB:true)` faltante em leituras
encadeadas — achado pelos testes E1b; gate morto do menu lateral —
achado pela F3). Backend 100% testado (20/20 testes unitários + suíte
completa `go test ./...` verde). Frontend com typecheck/lint/build
limpos e verificação visual ao vivo confirmada (Sheet, tabs, Nome Social
PF-only, gates de aba). Débito registrado (não bloqueante, follow-up
futuro): `Preload`/mapeamento de `Client` faltando em `ContactController`
(domain DTO) e em `Protocol`/Helpdesk; suíte e2e criada mas não executada
ao vivo (ambiente compartilhado roda imagem antiga).

---

# DAG — Integração CORE ↔ plugin-manager (ADR 0024) · jul/2026

**Escopo:** só `watinkdev` (o `plugin-manager` é serviço proprietário separado,
consumido como imagem `ghcr.io/alltomatos/watink-plugin-manager` — NÃO tocar).
Hub e plugin-manager já prontos; fechar os gaps de integração do lado core.
**Branch:** `chore/plugin-manager-integration` (de `origin/develop` e279e124a) → PR p/ develop.
**Tier:** T2 (wiring + config + proxy + testes; sem schema/auth). **Execução delegada.**

## Auditoria (confirmado por leitura)
- `pluginlicense.Client` consome só `GET /internal/licenses` (contrato estável — NÃO mexer).
- `PLUGIN_HUB_URL` (compose linha 93) NÃO tem uso em Go (grep) → morto, remover.
- `Catalog` (plugin_manager.go:74) = lista estática; `Instance` (:215) = `instanceId:""`.
- `NewPluginController` (routes.go:47) + ~9 call-sites no teste precisarão do novo dep (base URL do PM).

## Tarefas
- [ ] T1: compose — volume `plugin_manager_data:/data` no serviço plugin-manager (persiste .instance_id/.hub_secret/.hub_cache.json). | depends_on: []
- [ ] T2: compose — remover `PLUGIN_HUB_URL` (morta) e setar `PLUGIN_MANAGER_URL=http://plugin-manager:8081` no env do business (senão o core não alcança o PM no Docker). | depends_on: []
- [ ] T3: `.env.example` — documentar `PLUGIN_MANAGER_URL` e `PLUGIN_LICENSE_CACHE_TTL_SECONDS`. | depends_on: []
- [ ] T4: `Catalog` → proxy p/ `{PLUGIN_MANAGER_URL}/api/v1/plugins/catalog` (shape {offline,plugins[]}); fail-safe offline:true+[]. | depends_on: [T5-design]
- [ ] T5: `Instance` → proxy p/ `{PLUGIN_MANAGER_URL}/api/v1/plugins/instance` (instanceId real). | depends_on: []
- [ ] T5-design: injetar comms do PM via `pluginlicense.Client` (GetCatalog/GetInstance) + DI no controller (sem os.Getenv no handler). | depends_on: []
- [ ] T6: testes httptest (proxy ok + fail-safe) + `go build/test ./...` verdes + swagger regen. | depends_on: [T1,T2,T3,T4,T5]

## Constraints
NÃO alterar contrato `/internal/licenses`; NÃO tocar repo do plugin-manager;
git-flow (branch→PR develop, nunca main); verificar proxy de forma independente (httptest).

## ✅ CONCLUÍDO (fiscalizado)
T1–T6 entregues em `chore/plugin-manager-integration`. Fiscal independente:
`go build ./...` verde; `pluginlicense` + 6 testes de proxy (Catalog/Instance
nil/proxy/erro, fail-safe) verdes; `docker compose config -q` OK (PLUGIN_MANAGER_URL
setado, PLUGIN_HUB_URL removida, volume plugin_manager_data montado+declarado);
swagger regenerado; DI pura (sem os.Getenv em handler); contrato /internal/licenses intacto.
