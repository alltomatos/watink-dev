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
