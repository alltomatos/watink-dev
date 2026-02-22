# Relatório de Paridade Técnica: Backend Standard vs. Backend Business

## 1. Visão Geral
Este relatório detalha a paridade entre o `backend-standard` (Node.js/Sequelize) e o `backend-business` (Go/GORM). O objetivo é identificar divergências estruturais, de modelos e de migração.

---

## 2. Estratégia de Migração e Banco de Dados

### Backend Standard (Node.js)
- **ORM:** Sequelize.
- **Migrations:** Baseadas em arquivos `.ts` no diretório `src/database/migrations`.
- **Controle:** Histórico rigoroso de migrations sequenciais com timestamps.
- **Isolation:** Implementação recente de RLS (Row Level Security) via migrations (2026-02-11).

### Backend Business (Go)
- **ORM:** GORM.
- **Migrations:** Utiliza `AutoMigrate` no arquivo `internal/database/database.go`.
- **Controle:** Sincronização automática baseada nas structs das Models.
- **Isolation:** Depende da lógica de `TenantID` (UUID) nas consultas e middleware.

---

## 3. Análise de Modelos (Schemas)

### User (Usuários)
| Campo | Standard (Node) | Business (Go) | Paridade |
|-------|-----------------|---------------|----------|
| `id` | INTEGER (AutoInc) | int (PK) | ✅ Simétrica |
| `name` | STRING | string | ✅ Simétrica |
| `email` | STRING | string (Unique) | ✅ Simétrica |
| `passwordHash` | STRING | string | ✅ Simétrica |
| `tokenVersion` | INTEGER | int | ✅ Simétrica |
| `profile` | STRING | string | ✅ Simétrica |
| `whatsappId` | INTEGER (FK) | *int | ✅ Simétrica |
| `tenantId` | UUID | UUID | ✅ Simétrica |
| `groupId` | INTEGER (FK) | *int | ✅ Simétrica |
| `configs` | **Faltante (Model)** | JSON | ⚠️ Divergente |
| `createdAt` | DATE | time.Time | ✅ Simétrica |

**Observação:** A model `User` em Go possui um campo `Configs` (JSON) que está presente no banco Standard via migration (`20251220150803-add-configs-to-users.ts`), mas não está explicitamente definido na classe `User.ts` do Node.

### Ticket (Atendimentos)
| Campo | Standard (Node) | Business (Go) | Paridade |
|-------|-----------------|---------------|----------|
| `id` | INTEGER (AutoInc) | int (PK) | ✅ Simétrica |
| `status` | STRING | string | ✅ Simétrica |
| `unreadMessages`| INTEGER | int | ✅ Simétrica |
| `lastMessage` | STRING | string | ✅ Simétrica |
| `isGroup` | BOOLEAN | bool | ✅ Simétrica |
| `contactId` | INTEGER (FK) | int | ✅ Simétrica |
| `userId` | INTEGER (FK) | *int | ✅ Simétrica |
| `whatsappId` | INTEGER (FK) | int | ✅ Simétrica |
| `queueId` | INTEGER (FK) | *int | ✅ Simétrica |
| `tenantId` | UUID | UUID | ✅ Simétrica |

---

## 4. Estrutura de Tabelas e Índices

### Novas Estruturas no Business (Go)
A versão Business introduz conceitos de **RBAC (Role Based Access Control)** mais granulares:
- **Roles:** Tabela para perfis de acesso customizáveis.
- **RolePermissions:** Tabela de junção com suporte a `Scope` e `Conditions` em JSONB.
- **TagGroups / EntityTags:** Sistema de etiquetagem mais flexível.
- **TicketLog:** Auditoria detalhada de eventos no ticket.

### Divergências Encontradas
1. **RBAC:** Enquanto o Standard utiliza `GroupPermission`, o Business expande para `Roles` e `RolePermissions`.
2. **Plugins:** O Business possui integração nativa de modelos para plugins (`clientes.go`, `helpdesk.go`) dentro do core.
3. **RLS:** O Standard possui migrations específicas para habilitar `ENABLE ROW LEVEL SECURITY`, enquanto no Business a isolação é tratada via `TenantID` nas queries do GORM.

---

## 5. Campos Divergentes ou Faltantes

### Backend Standard -> Backend Business
- **Faltantes no Business:**
  - `ClientAddress`, `ClientContact` (Modelos de plugins específicos podem estar em locais diferentes).
  - `ProtocolAttachment`, `ProtocolHistory` (Presentes no Node, no Go parecem simplificados ou em desenvolvimento).
  - `ConversationEmbedding` (Integração de IA/Vector DB).

### Backend Business -> Backend Standard
- **Faltantes no Standard:**
  - `Role` e `RolePermission` (O Node usa `GroupPermission` mais simples).
  - `TicketLog` (O Node depende de logs de aplicação ou histórico simplificado).
  - `EntityTag` (Sistema de tags polimórfico).

---

## 6. Conclusão
A paridade de dados central (Users, Tickets, Contacts, Messages) é de **aproximadamente 90%**. A maior divergência reside no sistema de permissões (RBAC vs Groups) e na implementação de isolamento de dados (RLS via DB no Node vs. Query Scope no Go). Recomenda-se a unificação dos nomes de colunas JSON (ex: `configs`) para garantir compatibilidade total em ambientes híbridos.
