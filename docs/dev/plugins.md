# Desenvolvimento de Plugins

## Conceito

Um plugin no Watink integra-se ao Backend Go e ao Frontend React. Plugins built-in embarcam nas imagens Docker; plugins de marketplace são baixados e validados pelo Plugin Manager.

## Estrutura de um Plugin

```
backend (business/):
  internal/plugins/<nome>/
    handler.go      → controllers HTTP (Gin)
    service.go      → regras de negócio
    repository.go   → queries PostgreSQL
    domain.go       → tipos e interfaces

frontend (frontend/src/):
  pages/<Nome>/
    index.tsx       → página principal
  components/<Nome>/
    *.tsx           → componentes específicos
```

## Integração de Permissões (RBAC)

### 1. Migration de permissões (legacy Node)

```bash
npx sequelize migration:create --name seed-permissions-<nome-plugin>
```

```typescript
// migration
const permissions = [
  { name: "view_<plugin>", description: "Visualizar <Plugin>" },
  { name: "edit_<plugin>", description: "Editar <Plugin>" },
];
await queryInterface.bulkInsert("Permissions", permissions, { ignoreDuplicates: true });
```

### 2. Proteção de rota (Backend Go)

```go
// router.go
r.GET("/plugins/<nome>", authMiddleware, checkPermission("<plugin>.view"), handler.Index)
r.POST("/plugins/<nome>", authMiddleware, checkPermission("<plugin>.edit"), handler.Create)
```

### 3. Proteção de interface (Frontend)

```tsx
import { useAuth } from "@/hooks/useAuth"

const { hasPermission } = useAuth()

{hasPermission("view_<plugin>") && <MenuItem>Plugin</MenuItem>}
```

## Tipagem e Multitenancy

- **Sempre** use `string` para `tenantId` — nunca `number`
- No Backend Go: extraia o tenant com `tenantUUIDFromContext(c)`
- Toda query deve filtrar por `tenant_id`

## Ativação de Plugin Built-in

Plugins built-in não baixam código — a ativação apenas flipa a flag no banco:

```sql
UPDATE "PluginInstallations"
SET active = true
WHERE tenant_id = $1 AND plugin_slug = $2;
```

A validação da licença ocorre **server-side** no Watink Manager antes de flipar a flag.

## API do Watink Manager (licenças)

### `GET /api/marketplace_plugins`

Retorna catálogo de plugins. Público.

```bash
curl https://watink.com/api/marketplace_plugins
```

```json
{
  "plugins": [{
    "id": "uuid",
    "name": "Helpdesk",
    "category": "Helpdesk",
    "price": 29.9,
    "status": "active",
    "version": "1.0.0"
  }]
}
```

### `POST /api/verify_license`

Valida licença server-to-server. Chamado pelo Plugin Manager, nunca pelo frontend.

```bash
curl -X POST https://watink.com/api/verify_license \
  -H "Content-Type: application/json" \
  -d '{"licenseKey": "LIC-ABC-123", "tenantId": "tenant-001"}'
```

```json
{ "status": "VALID" }
```

Resposta possível: `VALID`, `INVALID`, `{ "status": "INVALID", "reason": "NOT_FOUND" }`.
