# Plano de Alinhamento Técnico: Watink Backend (Node Standard & Go Business)

Este documento descreve a estratégia de implementação para o alinhamento de segurança, arquitetura de permissões e paridade de modelos entre o `backend-standard` (Node.js) e o `backend-business` (Go).

---

## 1. Implementação de Row Level Security (RLS) no Go (Business)

### Objetivo
Garantir isolamento de dados por Tenant diretamente no nível do banco de dados PostgreSQL, espelhando a segurança implementada no Node.

### Estratégia de Implementação
A implementação no Go utilizará o PostgreSQL RLS via GORM, configurando o contexto do tenant em cada requisição.

#### A. Alterações nos Modelos (Go)
Adicionar `TenantID` a todos os modelos que ainda não possuem, garantindo conformidade com a estrutura do banco de dados.

#### B. Middleware de Conexão (RLS-Aware)
O middleware `IsAuth` deve garantir que a variável de sessão do Postgres `app.current_tenant` seja definida para cada transação.

```go
// Exemplo de lógica no Middleware (IsAuth)
tenantID := claims["tenantId"].(string)
tx := database.DB.Session(&gorm.Session{})
tx.Exec("SET LOCAL app.current_tenant = ?", tenantID)
c.Set("db", tx)
```

#### C. SQL Nativo para Ativação
Executar comandos SQL para habilitar RLS e criar políticas de segurança em todas as tabelas pertinentes:
- `ALTER TABLE "TableName" ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE "TableName" FORCE ROW LEVEL SECURITY;`
- `CREATE POLICY "TableName_tenant_isolation" ON "TableName" USING ("tenantId"::text = current_setting('app.current_tenant', true));`

---

## 2. Migração para Sistema RBAC no Node (Standard)

### Objetivo
Substituir o sistema legado de `GroupPermission` pelo esquema moderno de `Roles`, `RolePermissions` e `Scopes` já utilizado no Go.

### Estratégia de Implementação
Migrar a lógica de autorização para uma estrutura hierárquica e flexível.

#### A. Novos Modelos (Node)
1. **Role**: Define um papel (ex: "Gerente de Vendas").
2. **RolePermission**: Tabela de junção entre Role e Permission, contendo:
   - `scope`: JSONB para restrições finas (ex: `{"queueIds": [1, 2]}`).
   - `conditions`: JSONB para lógica ABAC.
3. **UserRole**: Tabela de junção entre User e Role.

#### B. Mapeamento de Impactos
- **Middlewares**: O middleware de autorização deve ser atualizado para verificar permissões através das Roles do usuário, processando o `scope` para filtrar resultados em consultas (ex: injetar filtros de `queueId`).
- **Models Legados**: Manter `GroupPermission` temporariamente para compatibilidade durante a migração, mas marcar como deprecado.

---

## 3. Estrutura 'ConversationEmbedding' no Go (Business)

### Objetivo
Alcançar paridade com o Node para suporte a funcionalidades de IA e busca semântica.

### Estratégia de Implementação
Adicionar o suporte à extensão `pgvector` e ao modelo de embeddings.

#### A. Modelo Go (`internal/models/conversation_embedding.go`)
```go
type ConversationEmbedding struct {
    ID           int            `gorm:"primaryKey" json:"id"`
    TicketID     int            `gorm:"column:ticketId" json:"ticketId"`
    ContactID    int            `gorm:"column:contactId" json:"contactId"`
    Summary      string         `gorm:"column:summary" json:"summary"`
    Topics       datatypes.JSON `gorm:"column:topics;type:jsonb" json:"topics"`
    Sentiment    float64        `gorm:"column:sentiment" json:"sentiment"`
    MessageCount int            `gorm:"column:messageCount" json:"messageCount"`
    Embedding    interface{}    `gorm:"column:embedding;type:vector(1536)" json:"-"`
    Metadata     datatypes.JSON `gorm:"column:metadata;type:jsonb" json:"metadata"`
    TenantID     uuid.UUID      `gorm:"column:tenantId;type:uuid" json:"tenantId"`
    ProcessedAt  time.Time      `gorm:"column:processedAt" json:"processedAt"`
    CreatedAt    time.Time      `gorm:"column:createdAt" json:"createdAt"`
    UpdatedAt    time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
}
```

---

## 4. Ordem de Execução das Migrations

Para garantir a integridade dos dados, as migrações devem seguir esta ordem:

1. **[Go/Node] Extensão PGVector**: Habilitar `CREATE EXTENSION IF NOT EXISTS vector;`.
2. **[Go] Tabela ConversationEmbeddings**: Criar a tabela e índices vetoriais.
3. **[Node] Esquema RBAC**: Criar tabelas `Roles`, `RolePermissions` e `UserRoles`.
4. **[Node] Migração de Dados**: Script para converter `GroupPermission` atuais em `Roles` básicas.
5. **[Go] Ativação de RLS**: Scripts de `ALTER TABLE` para habilitar RLS em todas as tabelas.
6. **[Node] Reforço de RLS**: Atualizar políticas para incluir as novas tabelas de RBAC.

---

## Impacto em Middlewares e Modelos (Resumo)

| Componente | Mudança Principal | Impacto |
| :--- | :--- | :--- |
| **Auth Middleware (Go)** | Injeção de `SET LOCAL app.current_tenant` | Isolamento total garantido pelo DB. |
| **Auth Middleware (Node)** | Verificação via Roles + Scopes | Autorização granular e multi-fila. |
| **User Model (Ambos)** | Associação com `Roles` | Flexibilidade na gestão de perfis. |
| **Database (Postgres)** | Ativação de `pgvector` | Habilita recursos de IA em ambos os backends. |
