# Relatório de Entrega — Correções de Paridade (Standard x Business)

## Escopo solicitado
1. Business Go com nível de segurança RLS equivalente ao Standard.
2. Standard Node no mesmo esquema RBAC do Business Go.
3. Node reconhecendo `configs` em `User.ts`.
4. Business Go com tabela `ConversationEmbeddings`.

## Correções implementadas

### 1) Node reconhecendo `configs` em `User.ts` ✅
- **Arquivo:** `backend/src/models/User.ts`
- **Ajuste:** inclusão de `@Column(DataType.JSON) configs` na model `User`.
- **Resultado:** paridade de leitura/escrita do campo `configs` entre Node e Go.

### 2) Business Go com `ConversationEmbeddings` ✅
- **Arquivo novo:** `bussines/internal/models/conversation_embedding.go`
- **Ajuste:** model criada com colunas compatíveis com o Standard:
  - `ticketId`, `contactId`, `summary`, `topics (jsonb)`, `sentiment`, `messageCount`, `embedding (float8[])`, `metadata (jsonb)`, `processedAt`, `tenantId`.
- **Arquivo:** `bussines/internal/database/database.go`
- **Ajuste:** model adicionada ao `AutoMigrate`.
- **Validação:** tabela `ConversationEmbeddings` criada no banco `business`.

### 3) RLS no Business Go ✅
- **Arquivo:** `bussines/internal/database/database.go`
- **Ajuste:** função `applyRLS()` criada e executada após `AutoMigrate`.
- **Tabelas com RLS + FORCE RLS:**
  - `Users`, `Tickets`, `Messages`, `Contacts`, `Settings`, `ConversationEmbeddings`.
- **Políticas criadas:**
  - `users_tenant_isolation`
  - `tickets_tenant_isolation`
  - `messages_tenant_isolation`
  - `contacts_tenant_isolation`
  - `settings_tenant_isolation`
  - `conversationembeddings_tenant_isolation`
- **Validação (SQL):** `rowsecurity = true` e `forcerowsecurity = true` nas 6 tabelas.

### 4) RBAC no Standard Node ⚠️
- O Standard já possui base de RBAC por migrations (`create-rbac-tables` + seeds de permissões).
- **Status:** estrutura existente e ativa no banco `opencore`.
- **Pendente recomendado (fase 2):** refatorar middleware de autorização para priorizar `Roles/RolePermissions` e reduzir dependência residual de `GroupPermission` em rotas legadas.

## Execução e verificação de banco

### opencore (Standard)
- Migrations: concluídas.
- Seeds: concluídas (com aviso esperado de seed que depende de usuário admin existente no fluxo inicial).

### business (Go)
- AutoMigrate: concluído.
- Seed de permissões: concluído.
- RLS aplicado e validado.

## Resultado final
- **Paridade de segurança (RLS):** atingida no nível de banco para tabelas críticas no Business.
- **Paridade de dados (`configs` e `ConversationEmbeddings`):** atingida.
- **RBAC no Standard:** base estrutural pronta; recomendada segunda etapa de endurecimento no middleware para 100% de equivalência comportamental.
