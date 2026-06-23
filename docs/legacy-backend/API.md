# Documentação da API

## Visão Geral
A API segue o padrão REST e utiliza JSON para comunicação. A documentação interativa completa (**Scalar**) está disponível em `/api/v1/docs?token=<JWT>` quando a aplicação Go (`business/`) está rodando na porta 8082.

> **Nota**: este arquivo documenta o backend Node.js legado (`legacy/backend/`). O backend Go canônico está em `business/` e sua documentação OpenAPI é gerada via swaggo — ver [`docs/frontend/swagger/OVERVIEW.md`](../frontend/swagger/OVERVIEW.md).

## Endpoints Principais
Abaixo estão os prefixos de rota definidos em `src/routes/index.ts`:

### Autenticação & Usuários
- `/auth`: Login, Refresh Token.
- `/users`: Gestão de usuários do sistema.

### Comunicação WhatsApp
- `/whatsapp`: Gestão de conexões (sessões) do WhatsApp.
- `/tickets`: Gerenciamento de atendimentos (chats).
- `/messages`: Envio e histórico de mensagens.
- `/contacts`: Gestão de contatos.

### Funcionalidades de Negócio
- `/queues`: Filas de atendimento.
- `/quickAnswers`: Respostas rápidas.
- `/pipelines`: Gestão de funis de vendas (Kanban).
- `/deals`: Negócios/Oportunidades.
- `/groups`: Gestão de grupos do WhatsApp.

### Configurações
- `/settings`: Configurações globais do sistema.
- `/tenants`: Gestão de inquilinos (Multi-tenant).
- `/microservices`: Integração com microsserviços.

### Outros
- `/api`: Rotas para integrações externas (Token API).
- `/version`: Informações de versão.
- `/flow`: Rotas do construtor de fluxos.
- `/knowledge`: Base de conhecimento para IA.

## Autenticação
A maioria das rotas requer um token Bearer JWT no cabeçalho `Authorization`.
Exemplo: `Authorization: Bearer <token>`
