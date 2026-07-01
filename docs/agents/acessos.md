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
  pacote de Gestor se `ehGestor=true` em algum `user_setores` (escopado a esses
  Setores), limitado pelo `Alcance` (`próprio|setor|tenant|plataforma`).
- **Enforcement:** `RequirePermission(recurso, ação)` roda no handler, antes da
  lógica de negócio — não é mais só `auth.GetScoped` (que continua existindo
  para o isolamento por tenant/RLS, mas não decide permissão de ação).
  Rollout faseado: rotas sensíveis primeiro (users/setores/cargos/conexões/
  faturamento/relatórios/reassign-close-ticket), demais depois.
- **Setor × Queue:** Setor é organizacional (pessoas/gestão/permissão); Queue é
  o mecanismo de roteamento de Tickets. `setor_filas` liga um Setor a 1+ Queues;
  a visibilidade de Tickets de um agente deriva do(s) Setor(es), não muda o
  motor de distribuição existente (Round-Robin/Balanced).
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
- **Criar/editar User:** aceita `cargoId`, `setorIds[]` (com flag `ehGestor`
  por item), `alcance`. Substitui os payloads antigos `groupId`/`roleIds[]`.
- **Anti-lockout:** `DELETE /users/:id` e qualquer troca de Cargo que tiraria o
  último Administrador do tenant (ou o dono via `OwnerID`) retornam 409.
- **Endpoints:** `/users`, `/setores`, `/cargos` (CRUD, todos sob
  `auth.GetScoped(c, "Users"|"Setores"|"Cargos")` **+** `RequirePermission`
  nas rotas de escrita). `/permissions` continua um catálogo de leitura,
  consumido só pela tela de Cargo.

## Edge cases
- Usuário sem Setor e sem Cargo → nenhuma permissão (fail-closed), nunca crash.
- Gestor de Setor A tenta agir sobre Setor B → barrado pelo escopo do Alcance.
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
Criar Setor+Cargo+User herda permissão (teste) · marcar gestor escopa
visibilidade/ação ao(s) Setor(es) marcado(s) (teste) · chamada direta à API
sem passar pela UI é barrada pelo `RequirePermission` (teste, 403) · impossível
remover o último Administrador/dono pela API (teste, 409) · suíte Go cobrindo
herança + escopo de gestor + enforcement, 100% verde.
