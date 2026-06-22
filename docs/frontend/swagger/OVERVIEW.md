# API Docs (Scalar)

Visualizador interativo da documentação OpenAPI do Backend Go.

## Acesso
- **URL**: `http://localhost:8082/api/v1/docs` (requer JWT de admin ou superadmin no query param `?token=`)
- **JSON OpenAPI**: `http://localhost:8082/api/v1/swagger.json`
- UI: **Scalar** — dark mode, sidebar, API client integrado, geração de snippets curl/Go/Python/JS.

## Como acessar

```
GET /api/v1/docs?token=<JWT>
```

O token é validado server-side; apenas perfis `superadmin` ou usuários com permissão `swagger` têm acesso.

## Atualizar a documentação

Após qualquer alteração em rotas ou handlers Go, regenerar obrigatoriamente:

```bash
cd business && go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs/
```

Commitar os 3 arquivos gerados (`docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`) no mesmo PR da alteração de rota.
