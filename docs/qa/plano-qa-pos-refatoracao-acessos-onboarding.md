# Plano de QA — Pós-refatoração Acessos (ADR 0022) + Onboarding

> **Escopo:** consolidação da auditoria pós-merge em `main` da refatoração de Acessos (ADR 0022 — modelo Cargo/Setor/Alcance + `RequirePermission`) e do Onboarding (Wizard `POST /initial-setup` + Checklist do Dashboard).
> **Data:** 2026-07-01 · **Repositório:** `D:\01_PROJETOS\watinkdev` · **Branch base:** `main` (PRs #300–#303 mergeados)

---

## 1. Sumário executivo

A refatoração está estruturalmente fiel ao ADR 0022 no núcleo (modelo Cargo/Setor/Alcance, anti-lockout, `RequirePermission` fail-closed, setup transacional, checklist derivado), mas a auditoria adversarial confirmou **2 achados P1, 10 P2 e 4 P3**, além de **24 achados P3 prováveis (não verificados individualmente)**. Os dois P1 são graves e correlatos: (a) `UpdateUser` aceita `alcance` arbitrário de qualquer port­ador de `users:update`, permitindo **auto-promoção a `alcance=plataforma` → bypass total do RBAC + acesso às rotas SaaS cross-tenant**; (b) o fluxo "Meu perfil" **quebrou para todo usuário comum** (atendente) porque `PUT /users/:id` passou a exigir `users:update`, que o Cargo padrão não tem — impacto funcional visível no público primário do produto, incluindo troca de senha.

O tema recorrente é **dessincronia entre backend e frontend de autorização**: o backend dropou `user.profile`, mas o frontend inteiro (Can, gates de superadmin, menu) ainda decide por ele e por strings de permissão inexistentes no catálogo — escondendo Dashboard/Tags/Respostas Rápidas de **todos**, inclusive Administrador. Há ainda drift documental que induzirá agentes futuros a erro (bundle "Setor+Queue" inexistente, escopo por Setor prometido e não implementado). Performance é adequada para o volume atual, mas `RequirePermission` (2–5 queries/request sem cache) é dívida latente que escala mal com o rollout faseado.

**Risco global: ALTO** enquanto os 2 P1 não forem corrigidos (um é escalonamento de privilégio cross-tenant; o outro é regressão funcional total para atendentes). Itens externos já rastreados: **bug RLS inerte** (task aberta, tratado como P1 externo) e **GAP-7** (consolidação de testes combinados — absorvido neste plano).

**Contagem de achados**

| Severidade | Verificados | Prováveis (não verificados) | Total |
|---|---|---|---|
| P1 | 2 | 0 | 2 |
| P2 | 10 | 0 | 10 |
| P3 | 4 | 24 | 28 |
| **Total** | **16** | **24** | **40** |
| P1 externo (em andamento) | RLS inerte (`SET LOCAL`) | — | 1 |

---

## 2. Achados P1

| # | Título | Arquivo:linha | Classe |
|---|---|---|---|
| P1-1 | Auto-promoção a `alcance=plataforma` via `UpdateUser` → bypass total do RBAC + rotas SaaS | `business/internal/controllers/user_mutation.go:215` | Segurança (escalonamento de privilégio) |
| P1-2 | "Meu perfil" quebrado para usuário comum — `PUT /users/:id` agora exige `users:update` | `frontend/src/components/UserModal/hooks/useUserModal.ts:89` | Regressão funcional |

### P1-1 — `UpdateUser` aceita `alcance`/`cargoId` sem validação de escalonamento

- **Arquivo:** `business/internal/controllers/user_mutation.go:215-222`
- **Evidência:** o handler grava `updateMap["alcance"] = alcance` após apenas `utils.ValidateStringField(v, "alcance", 50)` — só valida comprimento, sem whitelist do enum (`proprio|setor|tenant|plataforma`), sem comparar com o alcance do ator e sem bloquear self-target. O anti-lockout (linhas 242-250) cobre **apenas `cargoId`** do dono/último admin. Em `permission.go:44-47`, `alcance ∈ {tenant, plataforma}` faz `c.Next()` pulando **toda** checagem de permissão; e `middleware/auth.go:88` (`SuperAdminOnly`) libera `/saas` (ListTenants cross-tenant, CreatePlan) e `/system` para `alcance==plataforma`. Claims do JWT carregam `alcance` lido do DB no login/refresh (`session.go:60/150`).
- **Cenário de ataque:** usuário cujo Cargo tenha a permissão de aparência inócua `users:update` ("Editar Usuários") faz `PUT /users/{próprio id}` com `{"alcance":"plataforma"}`, renova o token e vira **superadmin da plataforma** com acesso cross-tenant.
- **Fix:**
  1. Validar `alcance` contra o enum (`400` se fora).
  2. Rejeitar elevação acima do alcance do ator (ator só concede `alcance <= o próprio`; nunca `plataforma` via API de tenant).
  3. Mesma regra para `cargoId` — não atribuir Cargo com permissões que o ator não possui; exigir `users:manage` para mexer em `alcance`/`cargoId` de terceiros e proibir no self.
- **Teste que previne regressão:**
  - **Unit (Gin+SQLite, padrão `permission_test.go`):** user com `users:update` e `alcance=proprio` faz `PUT /users/{self}` `{alcance:"plataforma"}` → **403/400**; `{alcance:"banana"}` → **400**.
  - **Integration:** após tentativa negada, o refresh token **não** carrega alcance elevado.

### P1-2 — "Meu perfil" quebrado para usuário comum (gate `users:update` no self-service)

- **Arquivos:** `frontend/src/components/UserModal/hooks/useUserModal.ts:89` (PUT) e `:57` (GET); `frontend/src/pages/UserProfile/hooks/useUserProfile.ts:46`; backend `business/internal/routes/routes.go:206/208`; `business/internal/services/setup_service.go:90-93`.
- **Evidência:** o modal é aberto do avatar do topo para o **próprio** usuário (`MainLayout.tsx:196-200`, `userId={user?.id}`) e faz `PUT /users/:id`. A rota é gateada por `RequirePermission("users","update")` e `permission.go` **não tem exceção de self-service** (fail-closed 403). O Cargo Atendente do setup só tem `tickets:*` + `contacts:*` (alcance default `proprio`) → **403 ao salvar nome/senha/avatar**. Bônus: `GET /users/:userId` exige `users:read`, que Atendente também não tem — o modal nem carrega os dados.
- **Fix:** criar caminho de self-service — endpoint dedicado `GET/PUT /me` sem `RequirePermission`, **ou** exceção no gate quando `:userId == userId do token` limitando o payload a `name/email/password/whatsappId` (nunca `alcance`/`cargoId`/`setores`). Coordenar com o fix de P1-1 (o self-service jamais pode aceitar campos de RBAC).
- **Teste que previne regressão:**
  - **E2E (Playwright):** logar como Atendente recém-criado → avatar → "Meu perfil" → trocar senha → **sucesso** (hoje: toast 403).
  - **Unit backend:** `PUT /users/{self}` `{name}` por user sem `users:update` → **200**; com `{alcance}` → **403**.

---

## 3. Achados P2

| # | Título | Arquivo:linha | Classe |
|---|---|---|---|
| P2-1 | Vazamento cross-tenant de permissões via `cargoId` de outro tenant (write + read sem guarda de tenant) | `business/internal/controllers/user_mutation.go:231` | Segurança |
| P2-2 | Comentário afirma enforcement nas rotas de Proxy que não existe (sem `RequirePermission`) | `business/internal/routes/routes.go:130` | Inconsistência/Segurança |
| P2-3 | `SidebarNav` gateia menu com permissões inexistentes → Dashboard/Tags/Respostas Rápidas invisíveis para todos | `frontend/src/components/MainSidebar/components/SidebarNav.tsx:40` | Inconsistência |
| P2-4 | `Can` e gates de superadmin decidem por `user.profile` (campo dropado) → páginas superadmin inacessíveis | `frontend/src/components/Can/index.tsx:6` | Inconsistência |
| P2-5 | Senha do admin inicial sem comprimento mínimo (senha "a" cria o Administrador) | `business/internal/controllers/setup.go:81` | Segurança |
| P2-6 | Email do admin não normalizado + login case-sensitive → admin pode não conseguir logar | `business/internal/controllers/setup.go:94` | Inconsistência |
| P2-7 | Docs prometem checklist criando "Setor + Queue juntos" — código só faz auto-open com nome sugerido | `CLAUDE.md:385` | Docs vs código |
| P2-8 | Docs afirmam pacote de Gestor "escopado só aos Setores marcados" — código concede tenant-wide | `business/pkg/auth/permission.go:139` | Segurança/Docs |
| P2-9 | Docs afirmam visibilidade de Tickets derivada do Setor — não implementado (filtro de fila é client-side) | `docs/agents/acessos.md:23` | Inconsistência/Docs |
| P2-10 | Zero e2e do enforcement RBAC novo (403 de `RequirePermission` + anti-lockout) | `e2e/tests/admin/users.spec.ts` | Teste faltando |

### P2-1 — Vazamento cross-tenant de permissões via `cargoId`
- **Arquivo:** `business/internal/controllers/user_mutation.go:231-257` (Update) e `:134` (Create); read-path em `business/pkg/auth/permission.go:122-126` e `business/internal/infrastructure/repository/gorm_user_repo.go:108-116/141-147`.
- **Evidência:** `CreateUser`/`UpdateUser` aceitam `cargoId` arbitrário sem verificar que o Cargo pertence ao tenant (contraste com `replaceUserSetores`, que **valida** `setorIds` contra o tenant). O read-path (`cargoHasPermission`, `loadCargoPermissions`, `effectivePermissionNames`) resolve permissões só por `cargoID`, ignorando `tenantID`. `Permissions` é catálogo global; `Cargos` é tenant-scoped → apontar `cargoId` para um Cargo de **outro tenant** faz o `RequirePermission` e o `Can` avaliarem as permissões estrangeiras.
- **Fix:** no write-path, validar `Where("id = ? AND \"tenantId\" = ?", cargoId, tenantID)` antes de aceitar (`400`). Defense-in-depth: guarda de tenant também em `cargoHasPermission`/`loadCargoPermissions`/`effectivePermissionNames` (JOIN em `Cargos` com `tenantId`).
- **Teste:** integration — admin do tenant A faz `PUT /users/:id` com `cargoId` do tenant B → **400**, `cargoId` inalterado. Unit — user com `cargoId` cross-tenant não recebe `Next()` para permissão que só o Cargo estrangeiro possui.

### P2-2 — Comentário afirma enforcement nas rotas de Proxy que não existe
- **Arquivo:** `business/internal/routes/routes.go:130` (+ `proxy.go:52-54`, `proxy_group.go:16`).
- **Evidência:** o comentário diz "gated pela mesma permissão de conexões (Whatsapps)", mas **nenhuma** rota de `/proxies` (131-141), `/proxy-groups` (144-147) ou `/connection-groups` (148-151) tem `RequirePermission`. Só chamam `GetScoped(c,"Whatsapps")` (tenant-scoping puro, nunca nega por permissão). As rotas irmãs `/whatsapp` (121-128) têm o gate. Um user `alcance=proprio/setor` sem permissão de conexões cria/importa/deleta/rotaciona proxies (inclui `DELETE /proxies` = wipe do pool). Senhas não vazam (`json:"-"`), mas host/porta/username sim.
- **Fix:** aplicar `RequirePermission("connections", <action>)` às rotas de proxy/proxy-groups/connection-groups **ou** corrigir os comentários para refletir "só tenant-scoping, sem gate (rollout faseado)".
- **Teste:** e2e — user sem permissão de connections e `alcance=proprio` → `POST /proxies` e `GET /proxies` devem retornar **403** (após decisão) ou o comentário deve refletir o `200` atual.

### P2-3 — `SidebarNav` gateia menu com permissões inexistentes
- **Arquivo:** `frontend/src/components/MainSidebar/components/SidebarNav.tsx:40/106/120/149/165`; `Settings/index.tsx:56`.
- **Evidência:** `perform="dashboard:read"`, `"quick-answers:read"`, `"tags:read"`, `"clients:read"`, `"helpdesk:read"`, `"marketplace:read"` — nenhum desses resources existe no catálogo seedado (`database.go:99-159`). Como `user.permissions` vem só de `effectivePermissionNames` e o fallback admin do `Can` está morto, num banco resetado **até o Administrador** não vê Dashboard, Tags e Respostas Rápidas. Também faltam entradas de menu para `/knowledge-bases` e `/swagger`.
- **Fix:** alinhar os `perform=` ao catálogo real (ex.: `tickets:read` para Dashboard) **ou** adicionar as permissões faltantes ao Seed e aos cargos-padrão; adotar constantes compartilhadas espelhando `database.go`. Adicionar entradas de menu para knowledge-bases e `swagger:view`.
- **Teste:** RTL — renderizar `SidebarNav` com user `{alcance:'tenant', permissions:[catálogo completo]}` e assertar presença de Dashboard/Tags/Respostas Rápidas. Smoke e2e — admin do initial-setup vê todos os itens.

### P2-4 — `Can` e gates de superadmin decidem por `user.profile` (campo dropado)
- **Arquivo:** `frontend/src/components/Can/index.tsx:6-8` (+ `Swagger/index.tsx:14-19`, `MonitorQueues/index.tsx:30`, `useVersionDashboard.ts:31`, `Settings/index.tsx:48`, `VersionFooter/index.tsx:12`, `TicketOptionsMenu/index.tsx:88`, `Helpdesk/index.tsx:38/62/85`, `TransferTicketModal/index.tsx:78`).
- **Evidência:** `const profile = user?.profile || user?.role; if (profile && ["admin","superadmin"].includes(profile)) return true;` — `domain.User` não tem `profile` (coluna dropada em `database.go:180`). Ramo morto; `Can` decide só por `permissions.includes`, ignorando `alcance` (incoerente com `permission.go`, que bypassa tudo para `alcance tenant/plataforma`). Páginas de superadmin (Monitor, Swagger, seção S3 do ADR 0019) ficaram inacessíveis; "Excluir ticket" sumiu para todos.
- **Fix:** substituir o ramo `profile` por `user.alcance === 'tenant' || user.alcance === 'plataforma'` (espelhando `permission.go`); trocar cada gate de superadmin por `alcance === 'plataforma'`; corrigir Swagger para `permissions.includes('swagger:view')`; remover `profile`/`role` de `types/domain.ts` e `useAuth`. Padrão correto já existe em `useOnboardingChecklist.ts:32-33`.
- **Teste:** RTL do `Can` — `{alcance:'tenant', permissions:[]}` → `yes()`; `{alcance:'proprio', permissions:['tickets:read']}` perform `tickets:read` → `yes()`. E2E — superadmin (`alcance=plataforma`) acessa `/monitor`, `/swagger` e a seção S3 de Settings.

### P2-5 — Senha do admin inicial sem comprimento mínimo
- **Arquivo:** `business/internal/controllers/setup.go:81`.
- **Evidência:** única validação é `ValidateStringField(req.Password, "password", 128)` (só maxLen). Frontend (`InitialSetup/index.tsx:39-47`) só checa truthy. `POST /initial-setup` com `password="a"` cria o Administrador (dono do tenant, `alcance=tenant`). Sem rate-limit/lockout de brute-force no login; bcrypt cost 8.
- **Fix:** impor mínimo de 8+ caracteres no backend (`len(trimmed) < 8 → 400`) e espelhar no frontend; considerar rejeitar `senha == email`. Aplicar também em `user_mutation.go:97/182`.
- **Teste:** unit no controller — `POST` com senha curta → **400** e `InitializeTenant` **não** chamado. E2E — wizard com senha "a" exibe erro de validação.

### P2-6 — Email do admin não normalizado + login case-sensitive
- **Arquivo:** `business/internal/controllers/setup.go:94` (+ `setup_service.go:152`, `gorm_user_repo.go:89`).
- **Evidência:** setup persiste `Email: data.Email` cru (sem `ToLower`/`TrimSpace`; email nem passa por `ValidateStringField`). Login faz `Where("email = ?", email)` (match exato). Sem `toLowerCase` no frontend. Wizard grava `"Admin@empresa.com"`, login digita `"admin@empresa.com"` → **401 numa instalação fresh, sem fluxo de recuperação**. Unique de `Users.email` trata os dois como registros distintos.
- **Fix:** `strings.ToLower(strings.TrimSpace(email))` no setup/criação de usuário e em `FindByEmailForAuth` (ou `LOWER(email) = LOWER(?)`); idealmente índice unique funcional em `LOWER(email)`.
- **Teste:** unit — `FindByEmailForAuth` com case diferente autentica. E2E — completar wizard com email capitalizado e logar com lowercase.

### P2-7 — Docs prometem checklist criando "Setor + Queue juntos"
- **Arquivo:** `CLAUDE.md:385`; `docs/agents/onboarding.md:20-21`.
- **Evidência:** doc afirma "'Criar setor' no checklist cria **Setor + Queue vinculada juntos**, numa ação só". Código: `OnboardingChecklistCard.tsx:28-32` só navega `?autoOpen=create&suggestedName=...`; `useSetoresTab.ts:104` faz `api.post("/setores", { name })`; `SetorController.Create` (`setor.go:188-193`) só `db.Create(&setor)` — **zero Queue**. `SetorQueuesSection` só aparece na edição. Os chips de sugestão existem (parte verdadeira), o bundle não.
- **Fix:** atualizar `CLAUDE.md` (invariant + "O que NÃO fazer" do módulo Onboarding) e `docs/agents/onboarding.md` para o comportamento real (auto-open com `suggestedName`; Queue vinculada depois, na edição). Ou abrir task para implementar o bundle em `SetorController.Create`.
- **Teste:** e2e — clicar num chip do checklist, salvar o Setor, assertar que `GET /queues` não ganhou Queue nova (documenta o real).

### P2-8 — Pacote de Gestor concedido tenant-wide, não "escopado aos Setores marcados"
- **Arquivo:** `business/pkg/auth/permission.go:139-163` (+ docs `CLAUDE.md:359`, `docs/agents/acessos.md:14-15/73-74`, `CONTEXT.md:145`).
- **Evidência:** `gestorPackageHasPermission` só checa `user_setores WHERE ehGestor=true` (qualquer setor) + Cargo "Gestor" do tenant — não verifica a qual Setor pertence o recurso da requisição. `RequirePermission` não tem dimensão de setor. Consequência real hoje: gestor de qualquer setor ganha `users:read`/`setores:read` **tenant-wide**. (A escrita cross-setor via `PUT /tickets/:id` é parcialmente mitigada por `GetScoped('Tickets')` + `user_queues`, ortogonal.)
- **Fix (curto prazo):** corrigir os 3 docs — o pacote de Gestor é concedido em nível de ação (`resource:action`) **sem escopo de dados por Setor**; o escopo por Setor é roadmap. Ou registrar task para implementar a checagem do setor-alvo (`ticket→queue→setor_filas→user_setores`).
- **Teste:** integration Go — user com `ehGestor` só no Setor A tenta agir sobre recurso do Setor B → documentar o comportamento atual (passa) ou **403** se implementado.

### P2-9 — Docs afirmam visibilidade de Tickets derivada do Setor (não implementado)
- **Arquivo:** `docs/agents/acessos.md:23-24` (+ ADR 0022:41-42, `CONTEXT.md:139`, comentário `models/setor_fila.go:5-7`).
- **Evidência:** `TicketController.ListTickets` (`ticket.go:57-128`) filtra só por `status/searchParam/date/isGroup` e por `queueIds` vindos da **query string do client** (86-97). Nenhum código deriva filas do Setor do usuário. `GET /tickets` não tem `RequirePermission` nem middleware de setor. Visibilidade real = tenant-scoped + filtro voluntário do frontend.
- **Fix:** reformular as 3 ocorrências para tempo futuro/decisão de design ("a visibilidade DEVERÁ derivar do Setor — não implementado; hoje o filtro de fila é client-side") e abrir task para o backend derivar `queueIds` permitidos de `user_setores→setor_filas`.
- **Teste:** integration Go — user `alcance=proprio` membro só do Setor A lista `GET /tickets` sem `queueIds` → hoje recebe tickets de todas as filas (comprova ausência da derivação).

### P2-10 — Zero e2e do enforcement RBAC novo (403 + anti-lockout)
- **Arquivo:** `e2e/tests/admin/users.spec.ts`.
- **Evidência:** cobre só `401` sem autenticação — nunca o caminho `403` de `RequirePermission` com usuário logado sem a permissão (ex.: Atendente em `GET /users` ou `POST /setores`). Nenhum teste de anti-lockout (`DELETE` do dono `Tenant.OwnerID`, rebaixamento do último Administrador). A lógica tem cobertura unitária (`permission_test.go`, `user_lockout_test.go`), mas a **fiação** (middleware realmente anexado à rota) não é testada — uma rota perder o gate no rollout retornaria `200` e passaria em toda a suíte.
- **Fix:** adicionar `e2e/tests/admin/permissions.spec.ts` (Atendente → **403** em `GET /users`, `POST /setores`, `PUT /whatsapp`) e `anti-lockout.spec.ts` (`DELETE` do owner → 4xx; trocar cargo do último Administrador → 4xx).
- **Teste:** Playwright API-first (padrão de `users.spec.ts`), fixture que cria/limpa o usuário de baixa permissão por teste.

---

## 4. Achados P3 / higiene

### P3 verificados
- **P3-1 — `RequirePermission` sem cache (2–5 queries/request)** · `business/pkg/auth/permission.go:39`. Caminho gestor = 5 queries em série, sempre, em rotas quentes (`PUT /tickets/:ticketId`). Fix: cache por `(userId, tokenVersion, tenantId)` TTL 30–60s (Redis/memória) ou embutir permissões efetivas no JWT. → ver Seção 6.
- **P3-2 — N+1 de requests em `resolveUserSetores`** · `frontend/src/pages/Acessos/hooks/useUsuariosTab.ts:97`. Abrir edição de 1 usuário dispara `GET /setores` + 1 `GET /setores/:id` por setor do tenant + refetch redundante da lista já em estado. Fix: reusar o estado `setores`; a fundo, backend devolver vínculos em `ShowUser` ou `GET /users/:id/setores`.
- **P3-3 — `POST /initial-setup` concorrente sem lock** · `business/internal/controllers/setup.go:53`. `NeedsSetup` é check-then-act fora de transação; com emails diferentes na janela de corrida nascem 2 tenants. Fix: `pg_advisory_xact_lock` + re-check dentro da tx → 403 sentinela.
- **P3-4 — Zero e2e do onboarding (wizard/checklist/Setor+Queue)** · `e2e/tests`. Adicionar `e2e/tests/onboarding/setup-wizard.spec.ts` (re-init→403, payload inválido→400) e `checklist.spec.ts`. (Absorve parte do GAP-7.)

### P3 prováveis (não verificados individualmente — rotular "não verificado")

**RBAC / resíduos legados**
- *(não verificado)* Inventário de rotas de mutação sem `RequirePermission` (rollout faseado — baseline de QA): `plugins/checkout`, `settings/:key`, `messages`, `media/download`, proxies, contacts, queues, quick-answers, knowledge-bases, flows, tags, deals, pipelines. `routes.go:92+`. Serve de matriz de regressão ao aplicar cada gate.
- *(não verificado)* DTO morto `UserDetailResponse` com `Profile/GroupID/Roles`. `business/internal/domain/dto/user_detail.go:10`. Remover.
- *(não verificado)* `IsAuth` grava `userEmail` de claim inexistente (`claims["email"]` sempre nil). `business/internal/middleware/auth.go:69`. Remover o `c.Set`.

**Frontend / consistência**
- *(não verificado)* `UserModal` renderiza `QueueSelect`/`WhatsAppSelect` atrás de `Can` sem prop `user` (nunca renderiza) e `selectedQueueIds` nunca é enviado. `frontend/src/components/UserModal/index.tsx:68`. Remover blocos mortos.
- *(não verificado)* Cadeia de menu morto: `MainListItems.tsx` + `AdminNavItems.tsx` + `MainNavItems.tsx` + `useMainListItems.ts` + `mainListItemsTypes.ts` sem importadores. `frontend/src/layout/MainListItems.tsx:1`. Deletar os 5 arquivos (validar `build`+`typecheck`).
- *(não verificado)* i18n: chaves órfãs `groups/roles` nos 3 idiomas + Central de Acessos 100% hardcoded pt. `frontend/src/translate/languages/pt.ts:564`. Remover órfãs, criar namespace `acessos.*`.
- *(não verificado)* Tipos legados `profile`/`role` em `types/domain.ts:5`, `useAuth`, e FlowBuilder (`nodeEditorTypes.ts:131`, `filterBuilderTypes.ts:50`) referenciam coluna dropada. Trocar por `alcance`.
- *(não verificado)* Dashboard "salvar preferências" chama `PUT /users/:id/configs` inexistente no Go. `frontend/src/pages/Dashboard/hooks/useDashboard.ts:109`. Trocar por `PUT /users/:id {configs}` (adicionar `configs` ao `updateMap`) ou `/me/configs`.
- *(não verificado)* `UserProfile` envia `signature` que `UpdateUser` ignora (toast de sucesso mentiroso) e avatar multipart quebra no `ShouldBindJSON`. `frontend/src/pages/UserProfile/hooks/useUserProfile.ts:43`. Decidir contrato.
- *(não verificado)* `MainListItems`/`AdminNavItems` código morto — `AdminNavItems` foi até atualizado para `/acessos`. `frontend/src/layout/MainListItems.tsx:1`. (Duplicata do item acima; consolidar na remoção.)

**Backend / performance & integridade de schema**
- *(não verificado)* Sem índices para tabelas novas do RBAC: falta `Cargos(tenantId,name)` (lookup "Gestor" por request), `user_setores(setorId)` (full scan em join global), opcional `Users(tenantId,cargoId)`. `business/internal/database/database.go:216`.
- *(não verificado)* `Permissions` sem `UNIQUE(resource,action)` + Seed `FirstOrCreate` não-atômico → duplicação em boot concorrente multi-node (prod é Swarm). `business/internal/models/permission.go:8`. `uniqueIndex` + `OnConflict{DoNothing}`.
- *(não verificado)* `Setor` sem `UNIQUE(tenantId,name)` e Create sem checagem → setores homônimos; idem `Cargos` (enfraquece anti-lockout do Administrador). `business/internal/models/setor.go:13`.
- *(não verificado)* `IsAuth` executa `SET LOCAL` (round-trip inútil + no-op fora de tx) em toda request autenticada. `business/internal/middleware/auth.go:74`. Ligado ao bug RLS externo.
- *(não verificado)* `SetorController.Delete` ignora `.Error` do Count de membros → guard anti-exclusão fail-open. `business/internal/controllers/setor.go:273`. Capturar erro → 500.

**Frontend / performance**
- *(não verificado)* Checklist dispara `GET /setores` + `GET /users` a cada mount do Dashboard mesmo dismissed / mesmo com tenant já configurado. `frontend/src/pages/Dashboard/hooks/useOnboardingChecklist.ts:46/53`. Guard de `dismissed` no `fetchCounts` + cache de sessão do `allDone`.
- *(não verificado)* Tabs de Acessos e checklist usam fetch manual (`useState`) em vez do React Query já padronizado. `frontend/src/pages/Acessos/hooks/useUsuariosTab.ts:46`. Migrar para `useQuery` + `invalidateQueries`.

**Onboarding / setup — bordas**
- *(não verificado)* `companyName` só-espaços passa e o valor trimado é descartado → `Tenant.Name = "   "`. `setup.go:69`. Atribuir o retorno de `ValidateStringField` + rejeitar vazio pós-trim.
- *(não verificado)* Wizard frontend sem paridade de validação (`noValidate`, sem regex de email, 400 vira mensagem genérica em inglês). `frontend/src/pages/InitialSetup/index.tsx:96`.
- *(não verificado)* Checklist eternamente pendente para cargo `alcance=tenant` sem `users:read`/`setores:read` (`Promise.all` descarta o fetch bom). `useOnboardingChecklist.ts:53`. Trocar por `Promise.allSettled`. **→ documentar como edge case de QA.**
- *(não verificado)* `lookupPerms` descarta silenciosamente permissão inexistente no catálogo (hoje sem mismatch, mas drift futuro cria cargo incompleto sem erro). `business/internal/services/setup_service.go:80`. Retornar erro/log + teste de paridade.

**Docs vs código**
- *(não verificado)* `acessos.md:49` cita `/permissions` (rota inexistente; real é `GET /cargos/catalog/permissions`) e `setorIds[]` (real: `setores:[{setorId,ehGestor}]`).
- *(não verificado)* Lista do "primeiro lote" (faturamento/relatórios/reassign-close) não bate com rotas gateadas; `tickets:reassign/close` no catálogo mas nenhuma rota os checa. `CLAUDE.md:357`.
- *(não verificado)* `onboarding.md:56` cita 3 testes inexistentes (Description dos Cargos, GreetingMessage da Queue, checklist invisível p/ `alcance=proprio`).
- *(não verificado)* Tabela "Status Atual" do `CLAUDE.md:58` não registra Acessos (ADR 0022) nem Onboarding — para nos PRs #292-#296.
- *(não verificado)* `CONTEXT.md:124` afirma "isolamento garantido por RLS" — enganoso (RLS inerte). Reformular para "WHERE tenantId manual".
- *(não verificado)* Exemplo `sectors:manage` (real: `setores:manage`) em `CLAUDE.md:358`/`CONTEXT.md`/ADR 0022; e cardinalidade Setor→Queue documentada como 1:N mas schema é M:N.
- *(não verificado)* Comentários "ROTAS A REGISTRAR / routes.go NÃO foi editado" obsoletos em `setor.go:534` e `cargo.go:421` (rotas já registradas com `RequirePermission`).
- *(não verificado)* Bypass total de `RequirePermission` para `alcance tenant/plataforma` não documentado em nenhum doc do módulo. `permission.go:44`. Documentar o invariant.

---

## 5. Matriz de testes de QA

Legenda — **Tipo:** U=unit · I=integration · E=e2e · M=manual. **Status:** ⛔ falta · ⚠️ parcial (só unit da lógica, falta fiação) · ✅ existe.

### 5.1 RBAC — enforcement (`RequirePermission`)

| ID | Dado / Quando / Então | Tipo | Prio | Status |
|---|---|---|---|---|
| RBAC-01 | Dado Atendente autenticado · quando `GET /users` · então **403** | I/E | P1 | ⛔ |
| RBAC-02 | Dado Atendente · quando `POST /setores` · então **403** | I/E | P1 | ⛔ |
| RBAC-03 | Dado Atendente · quando `PUT /whatsapp/:id` · então **403** | I/E | P1 | ⛔ |
| RBAC-04 | Dado user `alcance=proprio` com `users:update` · quando `PUT /users/{self}` `{alcance:"plataforma"}` · então **403/400** (P1-1) | U | P1 | ⛔ |
| RBAC-05 | Dado idem · quando `{alcance:"banana"}` · então **400** (enum) | U | P1 | ⛔ |
| RBAC-06 | Dado idem · após tentativa · então refresh token **não** carrega alcance elevado | I | P1 | ⛔ |
| RBAC-07 | Dado admin tenant A · quando `PUT /users/:id` `{cargoId: <Cargo tenant B>}` · então **400** e `cargoId` inalterado (P2-1) | I | P2 | ⛔ |
| RBAC-08 | Dado user com `cargoId` cross-tenant persistido · quando checa permissão que só o Cargo estrangeiro tem · então **não** recebe `Next()` (P2-1 defense-in-depth) | U | P2 | ⛔ |
| RBAC-09 | Dado user sem permissão de connections `alcance=proprio` · quando `POST /proxies` / `DELETE /proxies` · então **403** (após decisão P2-2) | E | P2 | ⛔ |
| RBAC-10 | Dado `alcance=tenant`/`plataforma` · quando qualquer rota gated · então **bypass** (`Next()`) — fixa o invariant documentado | U | P3 | ✅ (`permission_test.go`) |
| RBAC-11 | Dado user `alcance=proprio` com `tickets:update` · quando `PUT /tickets/:id` (rota quente) · então **200** (regressão do 1º lote) | I | P2 | ⚠️ |
| RBAC-12 | Baseline: cada rota fora do 1º lote hoje retorna **200** para Cargo sem a permissão → congelar como regressão ao aplicar o gate | I | P3 | ⛔ |

### 5.2 Anti-lockout (dono / último Administrador)

| ID | Dado / Quando / Então | Tipo | Prio | Status |
|---|---|---|---|---|
| LOCK-01 | Dado dono do tenant (`Tenant.OwnerID`) · quando `DELETE /users/{owner}` · então **4xx** com mensagem | I/E | P2 | ⚠️ (unit em `user_lockout_test.go`, falta e2e) |
| LOCK-02 | Dado último Administrador · quando `PUT /users/{id}` rebaixando o Cargo · então **4xx** | I/E | P2 | ⚠️ |
| LOCK-03 | Dado owner · quando tentativa de remover Cargo Administrador · então bloqueado | U | P2 | ✅ (`user_lockout_test.go`) |
| LOCK-04 | Dado 2 Administradores · quando `DELETE` de um · então **200** (não é o último) | I | P3 | ⛔ |

### 5.3 Wizard (`POST /initial-setup`)

| ID | Dado / Quando / Então | Tipo | Prio | Status |
|---|---|---|---|---|
| WIZ-01 | Dado sistema não inicializado · quando setup válido · então cria Tenant+Cargo/Setor/Queue/Admin e `Tenant.Name == companyName` | U/E | P2 | ✅ (`setup_mock_test.go`) |
| WIZ-02 | Dado sistema já inicializado · quando 2º `POST /initial-setup` · então **403** "System already initialized" e `InitializeTenant` **não** chamado | U | P2 | ✅ (unit) / ⛔ (e2e) |
| WIZ-03 | Dado `password="a"` · quando setup · então **400** (P2-5) | U | P2 | ⛔ |
| WIZ-04 | Dado email `"Admin@x.com"` no setup · quando login com `"admin@x.com"` · então **autentica** (P2-6) | I/E | P2 | ⛔ |
| WIZ-05 | Dado `companyName="   "` · quando setup · então **400**; e `" Acme "` → `Tenant.Name="Acme"` (P3 trim) | U | P3 | ⛔ |
| WIZ-06 | Dado 2 `POST /initial-setup` concorrentes (emails diferentes) · então exatamente 1 tenant, o outro **403/409** (P3-3) | I | P3 | ⛔ |
| WIZ-07 | Dado email inválido `"abc"` no wizard UI · quando submit · então erro pt-BR sem chamar `api.post` (P3 validação front) | U | P3 | ⛔ |

### 5.4 Checklist de Onboarding

| ID | Dado / Quando / Então | Tipo | Prio | Status |
|---|---|---|---|---|
| CHK-01 | Dado user `alcance=proprio` · quando monta Dashboard · então checklist **não** renderiza e **nenhum** `GET /setores`/`/users` | U | P2 | ⛔ |
| CHK-02 | Dado user `alcance=tenant` não-dismissed · quando monta · então **exatamente 1** GET em cada endpoint | U | P3 | ⛔ |
| CHK-03 | Dado checklist dismissed (sessionStorage) · quando monta · então **nenhum** fetch (P3 perf) | U | P3 | ⛔ |
| CHK-04 | Dado contagem de Setores/Usuários `> 1` · então item marcado como **done** (estado derivado, sem flag no banco) | U | P2 | ⛔ |
| CHK-05 | Dado clique num chip · quando abre `/acessos/setores?autoOpen=create&suggestedName=X` · então painel de Setor abre com nome pré-preenchido | E | P2 | ⛔ |
| CHK-06 | Dado clique no chip → salvar Setor · então **nenhuma** Queue nova em `GET /queues` (documenta o real, P2-7) | E | P2 | ⛔ |
| CHK-07 | Dado `alcance=tenant` sem `users:read` (`GET /users`→403, `/setores`→200) · então `setorDone=true` via `allSettled` e sem erro no console (P3 edge case) | U/M | P3 | ⛔ |

### 5.5 Central de Acessos (frontend)

| ID | Dado / Quando / Então | Tipo | Prio | Status |
|---|---|---|---|---|
| ACS-01 | Dado user `{alcance:'tenant', permissions:[catálogo completo]}` · quando renderiza `SidebarNav` · então Dashboard/Tags/Respostas Rápidas **presentes** (P2-3) | U | P2 | ⛔ |
| ACS-02 | Dado `Can {alcance:'tenant', permissions:[]}` · quando `perform` qualquer · então `yes()` (P2-4) | U | P2 | ⛔ |
| ACS-03 | Dado superadmin `alcance=plataforma` · quando acessa `/monitor`, `/swagger`, seção S3 de Settings · então **acessível** (P2-4) | E | P2 | ⛔ |
| ACS-04 | Dado 5 setores no tenant · quando `openEdit(user)` · então total de `api.get` == 2 (após fix P3-2; hoje 7) | I/U | P3 | ⛔ |
| ACS-05 | Dado troca de aba Usuários→Setores→Usuários dentro do staleTime · então `/users` e `/cargos` não refetchados (após migração React Query) | U | P3 | ⛔ |
| ACS-06 | Dado idioma EN · quando navega `/acessos` · então labels traduzidos (após i18n) | M | P3 | ⛔ |
| ACS-07 | Dado remoção da cadeia de menu morto · quando `npm run build && npm run typecheck` · então **verde** e grep de importadores zerado | U/M | P3 | ⛔ |

### 5.6 Performance (ver Seção 6 para método)

| ID | Dado / Quando / Então | Tipo | Prio | Status |
|---|---|---|---|---|
| PERF-01 | Dado user `alcance=proprio+ehGestor` · quando 2 requests consecutivos ao mesmo endpoint gated · então N queries no 1º e **0** no 2º (após cache P3-1) | U | P3 | ⛔ |
| PERF-02 | Dado ~10k linhas em `user_setores` · quando `Setor.List` · então `EXPLAIN` mostra **Index Scan** (após índice `setorId`) | I | P3 | ⛔ |
| PERF-03 | Dado `Seed()` rodado 2x concorrentemente · então `COUNT(*) Permissions == 48` (após `UNIQUE`) | I | P3 | ⛔ |
| PERF-04 | Dado `POST /setores` 2x mesmo nome/tenant · então 2º **4xx**; nomes iguais em tenants distintos → ambos **200** (após `UNIQUE(tenantId,name)`) | I | P3 | ⛔ |

---

## 6. Performance

Achados de performance confirmados e **como medir cada um** antes/depois do fix.

### 6.1 `RequirePermission` — 2–5 queries/request sem cache (P3-1)
- **Onde:** `business/pkg/auth/permission.go:39`. Caminho feliz (cargo base) = 2 queries; caminho gestor (permissão só via pacote) = **5 queries em série, sempre**. Só `alcance=tenant/plataforma` faz bypass. Rotas gated hoje incluem `PUT /tickets/:ticketId` (ação mais frequente de atendente). O rollout faseado multiplicará o custo por toda a API.
- **Impacto atual:** baixo (a única rota gated fora de admin é `PUT /tickets/:id`, ~+2 queries indexadas ~1–3 ms). Risco é **prospectivo**.
- **Como medir:**
  - **Contagem de queries:** callback GORM `db.Callback().Query().After("gorm:query")` incrementando contador; montar o middleware com user `alcance=proprio+ehGestor` e assertar N no 1º request e **0** no 2º (com cache) — teste PERF-01.
  - **Latência:** `testing.B` do handler completo antes/depois; ou `hey`/`vegeta` numa rota autenticada medindo p50/p99.
- **Fix:** cache por `(userId, tokenVersion, tenantId)` TTL 30–60s (`tokenVersion` já existe e é bumpado em mudanças de auth — chave de invalidação natural), ou embutir `effectivePermissionNames` nos claims do JWT.

### 6.2 `IsAuth` — `SET LOCAL` round-trip inútil por request (P3, ligado ao RLS externo)
- **Onde:** `business/internal/middleware/auth.go:74`. `tx.Exec("SET LOCAL app.current_tenant = ?", tenantID)` — no-op (bind param no `SET` falha + fora de transação) mas **é 1 round-trip ao Postgres em 100% das rotas protegidas**, somando às queries de `RequirePermission`.
- **Como medir:** benchmark HTTP (`hey`/`vegeta`) de rota simples autenticada antes/depois da remoção do `Exec`, p50/p99; ou callback GORM contando statements no middleware isolado (esperado: 0 após remoção).
- **Fix:** coordenar com a task RLS externa — remover o `Exec` (o projeto já filtra por `tenantId` manual) ou implementar transaction-per-request de verdade, medindo o overhead de `BEGIN/COMMIT`.

### 6.3 N+1 de rede em `resolveUserSetores` (P3-2)
- **Onde:** `frontend/src/pages/Acessos/hooks/useUsuariosTab.ts:97`. `openEdit` dispara `GET /users/:id` + `GET /setores` + N `GET /setores/:id` (um por setor), cada Show fazendo 3 queries no backend (setor + members + queues).
- **Como medir:** teste de integração do hook mockando `api` — com 5 setores, `openEdit(user)` dispara 7 gets hoje, meta 2 (ACS-04). Manual: DevTools Network num tenant com 30+ setores.
- **Fix:** reusar o estado `setores`; a fundo, `ShowUser` devolver os vínculos `user_setores` (ou `GET /users/:id/setores`).

### 6.4 Checklist — 2 requests/mount do Dashboard mesmo dismissed (P3)
- **Onde:** `frontend/src/pages/Dashboard/hooks/useOnboardingChecklist.ts:46/53`. `fetchCounts` só guarda por `canSeeChecklist`, ignorando `dismissed` e `allDone`; `GET /setores` executa agregação `GROUP BY` no backend.
- **Como medir:** teste de componente (vitest + msw) — `dismissed=true` no sessionStorage → **0** chamadas; `alcance=tenant` não-dismissed → **1** a cada endpoint (CHK-02/03).
- **Fix:** guard de `dismissed` no `fetchCounts`; cache de sessão do `allDone` (não viola "nunca persistir flag no backend").

### 6.5 Índices e UNIQUE ausentes nas tabelas novas (P3)
- **Onde:** `business/internal/database/database.go:216` (`addCustomIndexes`) não cria nada para `Cargos/Setores/user_setores/setor_filas/cargo_permissoes/Permissions`.
- **Impactos:** lookup "Gestor" (`Cargos(tenantId,name)`) por request → seq scan; `user_setores(setorId)` full scan em tabela de junção global; falta `UNIQUE(resource,action)` em `Permissions` (duplicação em boot Swarm concorrente) e `UNIQUE(tenantId,name)` em `Setores`/`Cargos`.
- **Como medir:** `EXPLAIN (FORMAT JSON)` com ~10k linhas em `user_setores` assertando Index Scan (PERF-02); `Seed()` 2x concorrente assertando `COUNT==48` (PERF-03); `POST /setores` duplicado (PERF-04); smoke de migração verificando presença em `pg_indexes`.
- **Fix:** `CREATE INDEX ... idx_cargos_tenant_name`, `idx_user_setores_setor`; `uniqueIndex` composto em `Permissions(resource,action)` + Seed com `OnConflict{DoNothing}`; `UNIQUE(tenantId,name)` em `Setores`/`Cargos` com tratamento de 409.

---

## 7. Sequenciamento sugerido

### Onda 0 — P1 (bloqueia release) + P1 externo
1. **P1-1** — validar `alcance`/`cargoId` em `UpdateUser` (enum + no-escalation + no-self-RBAC). Fecha o bypass de plataforma. Testes RBAC-04/05/06.
2. **P1-2** — caminho de self-service para "Meu perfil" (`/me` ou exceção no gate limitada a campos não-RBAC). Testes do fluxo Atendente. **Coordenar com P1-1** (self-service jamais aceita RBAC).
3. **P1 externo (RLS inerte)** — já em task própria; garantir que a correção do `SET LOCAL` considere o custo de round-trip (6.2). Não bloquear Onda 0 nas outras frentes, mas rastrear.

### Onda 1 — P2 de segurança + regressão funcional visível
4. **P2-1** — guarda de tenant no write/read-path de `cargoId` (RBAC-07/08).
5. **P2-3 + P2-4** — realinhar Can/SidebarNav/gates de superadmin ao modelo `alcance`/catálogo (uma frente só; devolve Dashboard/Tags/Respostas Rápidas e páginas superadmin). ACS-01/02/03.
6. **P2-2** — decidir e aplicar (gate nas rotas de proxy) ou corrigir os comentários enganosos. RBAC-09.
7. **P2-5 + P2-6** — hardening do wizard (senha mínima + normalização de email). WIZ-03/04.

### Onda 2 — testes de regressão de segurança + docs que induzem agentes a erro
8. **P2-10** — e2e de enforcement + anti-lockout (`permissions.spec.ts`, `anti-lockout.spec.ts`). RBAC-01/02/03, LOCK-01/02.
9. **P2-7 + P2-8 + P2-9** — corrigir CLAUDE.md/onboarding.md/acessos.md/CONTEXT.md/ADR 0022 para o comportamento real (bundle Setor+Queue, escopo de Gestor, visibilidade de Tickets). Baixo esforço, alto valor (evita bugs fantasma e reimplementações erradas).
10. **P3-4** — e2e de onboarding (wizard re-init/payload, checklist). Absorve GAP-7.

### Onda 3 — higiene, dívida de schema e performance latente
11. **Schema/integridade:** índices RBAC + `UNIQUE(resource,action)`/`UNIQUE(tenantId,name)` + Seed idempotente (PERF-02/03/04); `SetorController.Delete` fail-closed; `P3-3` lock do setup concorrente.
12. **Performance:** cache do `RequirePermission` (P3-1) — **antes** de expandir o rollout faseado; N+1 `resolveUserSetores` (P3-2); guard de `dismissed`/cache no checklist.
13. **Limpeza de código morto:** deletar cadeia `MainListItems`/`AdminNavItems`/…; DTO `UserDetailResponse`; `c.Set("userEmail")`; tipos `profile`/`role`; blocos de comentário obsoletos em `setor.go`/`cargo.go`; validar `build`+`typecheck`.
14. **i18n + React Query:** namespace `acessos.*` nos 3 idiomas + migração das tabs para `useQuery`.
15. **Docs de higiene:** tabela "Status Atual" do CLAUDE.md, `/permissions`→`/cargos/catalog/permissions`, `sectors:manage`→`setores:manage`, cardinalidade Setor→Queue M:N, bypass `alcance tenant/plataforma` documentado.

> **Regra de ouro do rollout (invariante ADR 0022):** nenhuma rota nova de escrita entra sem `RequirePermission`, e a expansão do gate às rotas do backlog (Seção 4, inventário) deve vir com o cache de P3-1 já no lugar e um teste 403 por rota (RBAC-12 como baseline de regressão).