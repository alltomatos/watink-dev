# Relatório de Alinhamento — Integração de Frontend (Standard & Business)

## 📋 Resumo Executivo
Este relatório detalha as unificações estruturais concluídas na camada de backend para que o time de frontend possa padronizar as requisições e a gestão de estado. O foco principal é a transição para um sistema de autorização robusto (RBAC) e a paridade de campos críticos entre as versões Node.js e Go.

---

## 1. Alterações Críticas nos Modelos de Dados

### 1.1 Usuários (`User`)
- **Campo `configs`:** Agora é suportado nativamente por **ambos os backends**.
  - **Ação do Frontend:** Pode persistir e ler preferências de usuário (ex: widgets do dashboard, tema, layout) via JSON no campo `configs`. Não é mais necessário usar `localStorage` para estados que devem ser persistentes entre dispositivos.
- **Associação `roles`:** O campo `groupId` está sendo depreciado em favor de `roles`.
  - **Ação do Frontend:** Priorizar a leitura de permissões através do array `user.roles`.

### 1.2 Atendimentos (`Ticket`) e IA
- **ConversationEmbeddings:** Tabela agora disponível em ambos os backends.
  - **Ação do Frontend:** Preparar componentes para exibição de sumários automáticos e análise de sentimento gerados pela IA, consumindo o endpoint de embeddings.

---

## 2. Sistema de Permissões (RBAC Unificado)

A estrutura de autorização foi padronizada seguindo o modelo do **Business (Go)**, que agora também está presente no **Standard (Node)**.

### Estrutura de Tabelas:
- `Roles`: Define o papel (ex: SuperAdmin, Manager, Agent).
- `RolePermissions`: Vincula permissões a roles com suporte a **Scopes**.
  - **Dica de Mentor:** O `scope` (JSONB) permite que o frontend saiba exatamente o que o usuário pode ver (ex: `{"queueIds": [1, 2]}`).
- **Impacto no Frontend:**
  - Em vez de checar `user.profile === 'admin'`, verifique se a permissão necessária está presente em `user.roles[].permissions[]`.

---

## 3. Padronização de Banco de Dados e Naming

Para evitar erros de integração, as tabelas de junção foram unificadas para o padrão **PascalCase** (padrão legado do Sequelize que o Go agora respeita):

| Tabela (Anterior no Go) | Tabela Unificada (Atual) |
| :--- | :--- |
| `user_roles` | `UserRoles` |
| `user_permissions` | `UserPermissions` |
| `user_queues` | `UserQueues` |
| `whatsapp_queues` | `WhatsappQueues` |
| `group_roles` | `GroupRoles` |

---

## 4. Guia de Implementação para o Frontend

### Etapa 1: Refatoração de Contexto de Autenticação
Atualizar o `AuthContext` para processar as `roles` do usuário logado.

### Etapa 2: Migração de Configurações
Mover configurações de UI (como o `darkMode` ou visibilidade de colunas no kanban) para o campo `user.configs` via API.

### Etapa 3: Suporte a IA
Adicionar aba ou widget de "Insights de IA" no Drawer do Ticket, consumindo os dados de `ConversationEmbeddings`.

---

## 5. Próximos Passos (Checklist Item 2 Finalizado)
- [x] Unificação de nomes de tabelas de junção. ✅
- [x] Inclusão de `configs` no modelo Node. ✅
- [x] Inclusão de `ConversationEmbeddings` no modelo Go. ✅
- [ ] Implementação de Reforço de RLS no Go (em andamento pelo DBA).

---
*Mentor: Ground — Atuando no Alinhamento de Produto e Tecnologia.*
