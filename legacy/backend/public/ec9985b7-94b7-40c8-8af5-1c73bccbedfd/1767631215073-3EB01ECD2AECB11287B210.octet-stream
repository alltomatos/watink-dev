# 🧩 Guia de Desenvolvimento de Plugins - Watink

Este documento é o manual oficial para a criação e integração de novos módulos (plugins) ao ecossistema Watink. Ele detalha o ciclo completo, desde a criação da estrutura até a proteção de rotas e integração ao sistema de permissões (RBAC).

> [!IMPORTANT]
> **Convenção de Linguagem**: Todo código e documentação deve ser em **Inglês** (para variáveis/funções) ou **Português** (para comentários explicativos/docs), mantendo consistência com o projeto.
> **Ambiente**: Utilize Docker Swarm conforme detelhado em [dev.md](./dev.md).
<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked above for the full development environment rules. -->

---

## 🏗️ 1. Arquitetura do Plugin

Um plugin no Watink não é uma entidade isolada no vácuo; ele deve se integrar nativamente ao **Backend** e ao **Frontend**.

### Estrutura Sugerida
*   **Backend**:
    *   `src/models/SeuPlugin.ts` (Modelo de dados)
    *   `src/controllers/SeuPluginController.ts` (Lógica de entrada)
    *   `src/services/SeuPluginServices/` (Regras de negócio)
    *   `src/database/migrations/` (Alterações no banco)
*   **Frontend**:
    *   `src/pages/SeuPlugin/` (Componentes da UI)

---

## 🔐 2. Integração de Permissões (RBAC)

Para que o plugin seja seguro e gerenciável, suas permissões devem ser registradas no banco e acessíveis via UI.

### Passo 2.1: Migration de Permissões (Backend)
Crie uma migration de seed para inserir as permissões na tabela `Permissions`.
Use o prefixo da ação + nome do módulo (ex: `view_helpdesk`, `edit_helpdesk`).

Comando:
```bash
npx sequelize migration:create --name seed-permissions-nome-do-plugin
```

Conteúdo da Migration:
```typescript
import { QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    const permissions = [
      {
        name: "view_nome_do_plugin",
        description: "Visualizar Nome do Plugin",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "edit_nome_do_plugin",
        description: "Editar Nome do Plugin",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "delete_nome_do_plugin",
        description: "Excluir Nome do Plugin",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Use ignoreDuplicates para evitar erros se rodar múltiplas vezes
    await queryInterface.bulkInsert("Permissions", permissions, { ignoreDuplicates: true });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete("Permissions", { 
        name: ["view_nome_do_plugin", "edit_nome_do_plugin", "delete_nome_do_plugin"] 
    }, {});
  }
};
```

### Passo 2.2: Categorização no Frontend
Para que as permissões apareçam agrupadas no modal de edição de grupos, edite `frontend/src/pages/Groups/GroupModal.js`.

Adicione seu plugin ao objeto `categories` dentro da função `categorizePermissions`:

```javascript
const categorizePermissions = (permissions) => {
    const categories = {
        // ... existentes
        "nome_do_plugin": "Nome Amigável (ex: Helpdesk)",
    };
    // ...
}
```

---

## 🛡️ 3. Proteção de Rotas e UI (Frontend)

Use o componente `<Can>` para controlar o acesso visual e funcional.

### Importação Correta
> [!WARNING]
> Certifique-se de usar a **Named Import** para o componente `Can`, caso contrário o build de produção falhará.

```javascript
import { Can } from "../../components/Can";
import useAuth from "../../hooks/useAuth";
```

### Protegendo a Página Principal
No `index.js` do seu plugin:
```javascript
const SeuPlugin = () => {
    const { user } = useAuth();

    return (
        <Can
            role={user.profile}
            perform="view_nome_do_plugin"
            yes={() => (
                <Container>
                    {/* Conteúdo do Plugin */}
                </Container>
            )}
            no={() => (
                <Typography>Sem permissão.</Typography>
            )}
        />
    );
};
```

### Protegendo Botões de Ação
```javascript
<Can
    role={user.profile}
    perform="edit_nome_do_plugin"
    yes={() => (
        <Button onClick={handleCreate}>Novo Item</Button>
    )}
/>
```

---

## 📡 4. Rotas e Menu (Frontend)

1.  **Adicionar Rota**: Edite `frontend/src/routes/index.js` (ou `Routes.js` dependendo da versão) e adicione a rota protegida.
    ```javascript
    <Route exact isPrivate path="/seu-plugin" component={SeuPlugin} />
    ```

2.  **Adicionar ao Menu**: Edite `frontend/src/layout/MainLayoutDefault.js` (ou componente de menu lateral correspondente) e adicione o `ListItem` protegido pelo `<Can>`.

    ```javascript
    <Can
        role={user.profile}
        perform="view_nome_do_plugin"
        yes={() => (
            <ListItemLink
                to="/seu-plugin"
                primary="Nome do Plugin"
                icon={<IconeDoPlugin />}
            />
        )}
    />
    ```

---

## 🚀 5. Deploy

Siga o fluxo padrão de deploy via `update.sh` para aplicar as migrations e atualizar o frontend.

```bash
# 1. Subir Backend (Roda migrations automaticamente)
./update.sh backend

# 2. Subir Frontend (Builda com novas rotas/permissões)
./update.sh frontend
```
