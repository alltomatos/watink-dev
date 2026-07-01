# ADR 0022 — Modelo de acesso Cargo/Setor/Alcance com enforcement real

**Status:** Accepted
**Data:** 2026-07-01

## Contexto
Auditoria (jul/2026) do RBAC existente (`User.Profile` + `Group` + `Role` +
`Permission`) encontrou um sistema desenhado por inteiro no schema mas só
metade cabeado: `effectivePermissionNames()` só resolvia `user_permissions` +
`group_permissions` (via `User.GroupID`, FK singular). `Role`, `user_roles`,
`group_roles` e `RolePermission.Scope/Conditions` (ABAC, ADR 0005) nunca eram
lidos em runtime — dado inerte. Quem de fato controlava acesso era
`User.Profile` (admin/superadmin bypassam tudo; agent cai num filtro
hardcoded de fila/atribuição). Não existia `RequirePermission` em nenhuma
rota — permissão só escondia item de menu no frontend (`Can`), nunca barrava
uma ação no backend. A UI (`/access`, `UserPermissionsTab`) recomendava migrar
de Group para Role — o inverso do que o código sustentava. Havia ainda um bug
ativo: `GroupEdit` enviava `userIds` para `PUT /groups/:id`, mas o backend
ignorava o campo silenciosamente.

O dono autorizou reset de banco (ambiente de desenvolvimento, sem dado de
produção a migrar) e pediu um modelo com grupos por setor que carregam
permissão, herança automática ao entrar no setor, e um papel de gestor/gerente
com permissões especiais — pensando também num plugin SaaS futuro
(multi-tenant, hoje operando single-tenant).

## Decisão
Substituir o RBAC por 3 dimensões independentes:

1. **Cargo** (renomeia `Role`): conjunto nomeado de Permissions — *o que* o
   usuário pode fazer. Único container de permissão (não duplicado por
   Group). Catálogo de Permission passa de granularidade **menu**
   (`resource:view`) para **`recurso:ação`** (`tickets:reassign`,
   `sectors:manage`), pré-condição para o enforcement ter algum sentido.

2. **Setor** (substitui `Group`): agrupa usuários — *onde* estão — via
   `user_setores` (N:N, não mais FK singular). Carrega a marca `ehGestor` por
   vínculo, permitindo um usuário ser gestor de múltiplos setores
   simultaneamente (caso real do dono: "gestor do Comercial e do Vendas").
   Distinto de `Queue` (mecanismo de roteamento): um Setor tem 1+ Queues
   (`setor_filas`); a visibilidade de Tickets do agente deriva do Setor, sem
   reescrever o motor de distribuição existente.

3. **Alcance**: dimensão nova, ortogonal ao Cargo — *até onde* a autoridade
   vale: `próprio | setor | tenant | plataforma`. Resolve o gestor sem
   duplicar cargos por setor ("Gestor de Vendas", "Gestor de Suporte"): o
   pacote de gestão é um único Cargo/permissão, escopado pelo Alcance
   (`setor` = só os setores marcados; `tenant` = Gerente Geral/Administrador,
   todos os setores; `plataforma` = Superadmin, fora do RBAC do tenant — vive
   no plugin SaaS).

**Enforcement real, faseado:** `RequirePermission(recurso, ação)` passa a
rodar no handler antes da lógica de negócio, começando pelas rotas sensíveis
(users/setores/cargos/conexões/faturamento/relatórios/reassign-close-ticket).
`auth.GetScoped` continua existindo para isolamento por tenant (RLS), mas
deixa de ser a única barreira de autorização.

**Anti-lockout:** o dono do tenant (`Tenant.OwnerID`) é blindado como
Administrador — não pode perder o Cargo, não pode ser excluído; o sistema
bloqueia a remoção do último Administrador do tenant.

**Reset de banco:** `Group`, `user_permissions`, `user_roles`,
`group_permissions`, `group_roles`, `RolePermission.Scope/Conditions` são
removidos (não portados) — substituídos por `user_setores`, `setor_filas`,
`cargo_permissoes`. Seed recria catálogo de Permissions + Cargos-padrão
(Atendente, Gestor, Gerente Geral, Administrador) + primeiro Administrador.

## Alternativas consideradas
- **Manter Group OU Role (um só, sem Setor/Alcance):** mais simples, mas
  trava no gestor — exigiria um grupo "Gestores de Vendas" duplicando
  permissões, ou permissões avulsas por usuário (a bagunça que já existia).
  Rejeitado.
- **Cargo por setor (multiplicar cargos):** "Gestor de Vendas", "Gestor de
  Suporte" como cargos distintos. Rejeitado — manutenção ruim (editar
  permissão de gestor exige tocar N cargos) e o Alcance resolve o mesmo caso
  sem duplicação.
- **Cargo por vínculo usuário-setor (em vez de global):** mais flexível
  ("Atendente no Suporte, Gerente em Vendas"), mas UI mais pesada e sem caso
  de uso real relatado. Adiado — cargo global ao usuário cobre o caso atual;
  reavaliar se surgir demanda concreta.
- **Setor absorve Queue (unificar):** simplifica o modelo mental, mas exige
  reescrever o motor de roteamento/distribuição de Tickets — escopo e risco
  incompatíveis com esta refatoração. Rejeitado por ora.
- **Enforcement cosmético (manter só menu):** zero esforço, mas inviável para
  SaaS multi-tenant sério — qualquer chamada direta à API ignora a permissão;
  "poderes do gestor" seriam decorativos. Rejeitado.
- **Enforcement total imediato (todas as rotas de uma vez):** mais coerente
  de imediato, mas risco de quebra maior num único PR grande. Substituído por
  rollout faseado (sensíveis primeiro).

## Consequências
- Frontend consolida 6 telas fragmentadas (`Users`, `Groups`, `GroupEdit`,
  `Roles`, `RoleEdit`, `Access`) numa **Central de Acessos** com abas
  (Usuários · Setores · Cargos); Permission não tem tela própria (vive dentro
  da edição de Cargo, matriz recurso×ação).
- `RolePermission.Scope/Conditions` (ABAC) sai do schema sem substituto
  condicional — o caso de uso que o motivou ("gerente só da fila X") é
  resolvido pelo Alcance, mais simples de raciocinar e de auditar.
- Trabalho novo não-trivial: gate de permissão por rota (`RequirePermission`)
  onde antes não existia nenhum — é o maior esforço da refatoração, mitigado
  por rollout faseado.
- Superadmin/nível `plataforma` não é implementado neste ADR — só reservado
  no enum de Alcance para não fechar a porta ao plugin SaaS futuro.
- Bug do `GroupEdit` (userIds descartado) desaparece por construção — o novo
  modelo não tem essa ambiguidade de onde vincular usuário a agrupamento.
