# Plano de Implementação do Swagger

## Descrição do Objetivo
Habilitar a documentação da API usando Swagger (OpenAPI) para o backend. Isso fornecerá uma interface interativa para testar endpoints e visualizar esquemas de dados, acessível em `/docs`.

## Revisão do Usuário Necessária
Nenhuma. Adição padrão de dependências de desenvolvimento.

## Alterações Propostas

### Componente Backend (`backend/`)

#### [MODIFICAR] [package.json](file:///c:/dev/whaticket-community/backend/package.json)
- Adicionar `swagger-ui-express` e `swagger-jsdoc` em `dependencies`.
- Adicionar `@types/swagger-ui-express` e `@types/swagger-jsdoc` em `devDependencies`.

#### [NOVO] [src/config/swagger.ts](file:///c:/dev/whaticket-community/backend/src/config/swagger.ts)
- Definir a definição do Swagger (OpenAPI 3.0.0).
- Configurar opções para o `swagger-jsdoc` escanear `src/routes/*.ts`.

#### [MODIFICAR] [src/app.ts](file:///c:/dev/whaticket-community/backend/src/app.ts)
- Importar `swaggerUi` e `swaggerDocs`.
- Registrar middleware: `app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));`.

#### [MODIFICAR] [src/routes/authRoutes.ts](file:///c:/dev/whaticket-community/backend/src/routes/authRoutes.ts)
- Adicionar comentários JSDoc (@swagger) para os endpoints `/login` e `/refresh_token` servirem como exemplo inicial.

## Plano de Verificação

### Testes Automatizados
- Nenhum para a UI em si.
- Verificação do processo de build (`npm run build`) para garantir que os tipos estão corretos.

### Verificação Manual
1.  **Redeploy da Stack:** `docker stack deploy -c docker-stack.yml whaticket-premium` (forçando a reconstrução do backend).
2.  **Acessar UI:** Abrir `http://localhost:3000/docs` no navegador.
3.  **Testar Endpoint:** Executar o endpoint `/auth/login` via Swagger UI com as credenciais `admin@admin.com` / `devadmin`.
