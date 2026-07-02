# Acessos (Usuários, Setores, Cargos, Permissões) — Contexto para Agentes

## Responsabilidade
Autorização do tenant. Substitui o RBAC legado (`User.Profile` string +
`Group` + `Role` inerte) por 3 dimensões independentes: **Cargo** (o que pode
fazer), **Setor** (onde está — N:N, com marca de Gestor), **Alcance** (até
onde vale). Permissão é barreira real no backend, não mais cosmética de menu.
Reset de banco autorizado (dev) — sem migração de dado legado. Gestão em
**Central de Acessos** (abas Usuários · Setores · Cargos).

## Arquitetura / fluxo
- **Resolução de permissões efetivas:** no login e a cada request sensível,
  `effectivePermissions(userID)` = permissões do `Cargo` do User, **mais** o
  pacote de Gestor se `ehGestor=true` em algum `user_setores`. **Atenção — o
  escopo por Setor NÃO está implementado:** `gestorPackageHasPermission`
  (`business/pkg/auth/permission.go`) só checa se o user tem alguma linha
  `ehGestor=true` (qualquer Setor) + o Cargo "Gestor" do tenant, e concede as
  permissões em nível de AÇÃO (`recurso:ação`) **tenant-wide** — não verifica
  a qual Setor pertence o recurso da requisição. Restringir o Gestor ao(s)
  Setor(es) marcado(s) (Alcance=`setor`) é roadmap. `RequirePermission` hoje
  não tem dimensão de Setor.
- **Enforcement:** `RequirePermission(recurso, ação)` roda no handler, antes da
  lógica de negócio — não é mais só `auth.GetScoped` (que continua existindo
  para o isolamento por tenant/RLS, mas não decide permissão de ação).
  Rollout faseado: rotas sensíveis primeiro (users/setores/cargos/conexões/
  faturamento/relatórios/reassign-close-ticket), demais depois.
- **Setor × Queue:** Setor é organizacional (pessoas/gestão/permissão); Queue é
  o mecanismo de roteamento de Tickets. `setor_filas` liga um Setor a Queues
  (M:N via tabela de junção). **A visibilidade de Tickets NÃO deriva do Setor
  hoje:** `TicketController.ListTickets` filtra por `status/searchParam/date/
  isGroup` e por `queueIds` vindos da **query string do client** — nenhum código
  deriva as filas visíveis do(s) Setor(es) do usuário; `GET /tickets` nem tem
  `RequirePermission`. Visibilidade real = tenant-scoped + filtro de fila
  client-side. A derivação Setor→fila é decisão de design **ainda não
  implementada** (roadmap), sem tocar no motor de distribuição existente
  (Round-Robin/Balanced).
- **Frontend:** Central de Acessos com abas. Edição de User tem seções Dados /
  Cargo / Setores & Gestão (chip por setor + toggle "gestor deste setor") /
  Alcance. Edição de Cargo mostra a matriz recurso×ação. Permission não tem
  tela própria.

## Modelo de dados
- `User`: perde `Profile` e `GroupID`. Ganha `cargoId` (FK, cargo base) e
  `alcance` (enum). Dono do tenant via `Tenant.OwnerID` (blindado).
- `Setor`: `id, nome, tenantId`.
- `user_setores` (junção): `userId, setorId, ehGestor bool`.
- `setor_filas` (junção): `setorId, queueId`.
- `Cargo` (renomeia `Role`): `id, nome, tenantId`. M:N `cargo_permissoes`.
- `Permission`: catálogo `recurso:ação` (não mais granularidade de menu para
  ações que mutam estado).
- **Removidos:** `Group`, `user_permissions`, `user_roles`, `group_permissions`,
  `group_roles`, `RolePermission.Scope/Conditions` (ABAC nunca implementado).

## Contratos
- **Criar/editar User:** aceita `cargoId`, `setores` (array de objetos
  `{setorId, ehGestor}` — ver `createUserRequest`/`setorVinculo` em
  `business/internal/controllers/user_mutation.go`), `alcance`. Substitui os
  payloads antigos `groupId`/`roleIds[]`.
- **Anti-lockout:** `DELETE /users/:id` e qualquer troca de Cargo que tiraria o
  último Administrador do tenant (ou o dono via `OwnerID`) retornam 409.
- **Endpoints:** `/users`, `/setores`, `/cargos` (CRUD, todos sob
  `auth.GetScoped(c, "Users"|"Setores"|"Cargos")` **+** `RequirePermission`
  nas rotas de escrita). O catálogo de Permission é lido via
  `GET /cargos/catalog/permissions` (não existe rota `/permissions` — foi
  removida com o modelo antigo), consumido só pela tela de Cargo.

## Edge cases
- Usuário sem Setor e sem Cargo → nenhuma permissão (fail-closed), nunca crash.
- Gestor de Setor A agindo sobre recurso do Setor B → **hoje NÃO é barrado**:
  o pacote de Gestor concede as permissões tenant-wide, sem escopo por Setor
  (ver Arquitetura). Barrar por Setor-alvo é roadmap.
- Excluir Setor com membros/gestor/filas → exige realocar ou confirmar.
- Excluir Cargo em uso → bloquear ou exigir reatribuição prévia dos usuários.
- Alcance `tenant` (Gerente Geral/Administrador) ignora a marca `ehGestor` —
  já enxerga todos os Setores.
- Remover o último Administrador do tenant, ou o dono (`OwnerID`) → bloqueado.

## Limites (o que NÃO resolve)
Não implementa ABAC condicional (o `RolePermission.Scope/Conditions` antigo
nunca funcionou e foi removido, não portado). Não introduz cross-tenant — o
Superadmin/plataforma pertence ao plugin SaaS, fora deste módulo.

## Ops
- Reset de banco em dev: seed recria catálogo de Permissions
  (`recurso:ação`) + Cargos-padrão (Atendente, Gestor, Gerente Geral,
  Administrador) + primeiro Administrador (dono do tenant).
- Migração via GORM AutoMigrate.

## Critério de sucesso (invariantes verificáveis)
Criar Setor+Cargo+User herda permissão (teste) · marcar gestor (`ehGestor`)
soma o pacote do Cargo "Gestor" às permissões do user — hoje **tenant-wide**,
sem escopo por Setor (o escopo de dados por Setor é roadmap) · chamada direta à API
sem passar pela UI é barrada pelo `RequirePermission` (teste, 403) · impossível
remover o último Administrador/dono pela API (teste, 409) · suíte Go cobrindo
herança + escopo de gestor + enforcement, 100% verde.
