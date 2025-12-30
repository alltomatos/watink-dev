# 🛠️ Guia de Desenvolvimento - watic Premium

Este documento serve como referência técnica para desenvolvedores que atuam no projeto **watic Premium**. Ele detalha a stack tecnológica, arquitetura de microserviços e padrões de projeto que devem ser seguidos rigorosamente.

> [!IMPORTANT]
> **Leitura Complementar Obrigatória**: Consulte também [dev_micro.md](./dev_micro.md) para detalhes específicos da arquitetura de microserviços.
> **Sempre responda e crie documentos em Português do Brasil.**
> **Ambiente de Execução**: Todo o desenvolvimento e execução do projeto deve ser feito via **Docker Swarm**. Não rode os serviços localmente (fora de containers).

---

## 🏗️ Arquitetura de Microserviços

O projeto evoluiu de um monolito para uma arquitetura distribuída orientada a eventos, rodando exclusivamente em containers orquestrados.

### Componentes Principais

1.  **Frontend (SPA)**: Interface do usuário construída com React e Vite.
2.  **Backend (API + Orchestrator)**: Gerencia regras de negócio, banco de dados e orquestra comandos.
3.  **Engine (WhatsApp Worker)**:
    *   **Engine Standard/Pro**: Node.js com **Whaileys** (Wrapper otimizado do Baileys).
    *   **Engine Enterprise**: Go com **WhatsMeow** (Alta performance).
4.  **Message Broker**: **RabbitMQ** para comunicação assíncrona entre Backend e Engines.
5.  **Database**: PostgreSQL com extensões **PostGIS** e **pgvector**.
6.  **RBAC**: Sistema de controle de acesso granular baseado em Grupos e Permissões.

---

## 🔐 Controle de Acesso (RBAC)

O sistema utiliza um modelo de RBAC (Role-Based Access Control) granular e multi-tenant.

### Estrutura
1.  **Users**: Pertencem a um `Group` e podem ter `UserPermissions` individuais.
2.  **Groups**: Conjunto de `Permissions` atribuídas a múltiplos usuários.
3.  **Permissions**: Ações atômicas (ex: `view_tickets`, `user-modal:editProfile`).

### Implementação
*   **Backend**: Middleware `checkPermission` verifica as permissões combinadas (Grupo + Individuais) do usuário autenticado.
*   **Frontend**: Componente `<Can perform="permissao" />` e hook `useAuth` controlam a renderização de elementos protegidos.
### Super Admin
*   Usuários com `profile: "admin"` possuem acesso irrestrito (fallback).

### 🛡️ Guia: Criando um Novo Módulo com Permissões

Ao criar um novo recurso (ex: "Relatórios"), siga este fluxo para garantir a integração ao RBAC:

1.  **Migration (Backend)**:
    Crie uma migration (`npx sequelize migration:create --name seed-permissions-reports`) para inserir as permissões na tabela `Permissions`.
    *   Sempre use `ignoreDuplicates: true` nos seeds.
    *   Exemplo:
        ```typescript
        const permissions = [
            { name: "view_reports", description: "Visualizar Relatórios" },
            { name: "export_reports", description: "Exportar Relatórios" }
        ];
        await queryInterface.bulkInsert("Permissions", permissions, { ignoreDuplicates: true });
        ```

2.  **Categorização (Frontend)**:
    No arquivo `frontend/src/pages/Groups/GroupModal.js`, adicione as novas permissões ao objeto `categories` dentro da função `categorizePermissions`. Isso garante que elas apareçam organizadas no modal de edição de grupos.
    ```javascript
    const categories = {
        // ...
        "reports": "Relatórios",
    };
    ```

3.  **Proteção de Rotas (Backend)**:
    Adicione o middleware `checkPermission` nas rotas do novo recurso.
    ```typescript
    routes.get("/reports", isAuth, checkPermission("view_reports"), ReportController.index);
    ```

4.  **Proteção de Interface (Frontend)**:
    Use o componente `<Can>` para esconder botões ou menus.
    ```javascript
    <Can
        role={user.profile}
        perform="view_reports"
        yes={() => <MenuItem>Relatórios</MenuItem>}
    />
    ```

---

## 💻 Tecnologias Frontend

Containerizado e servido via Nginx.

*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Framework**: React
*   **UI Library**: Material UI (v4)
*   **Estado Global**: Context API
*   **Comunicação**: Axios (HTTP) e Socket.IO Client (WebSocket)

### ⚠️ Regras para Frontend:
*   **NÃO** rode `npm run dev` localmente.
*   Para aplicar alterações, reconstrua a imagem e atualize o serviço no Swarm.
*   Configurações de ambiente são injetadas no container (via `docker-stack.yml`).

---

## ⚙️ Tecnologias Backend

O backend orquestra o sistema e roda isolado em container.

*   **Runtime**: Node.js (TypeScript)
*   **Framework**: Express
*   **ORM**: Sequelize (TypeScript)
*   **Documentação**: **Swagger** (`/docs`)
*   **Mensageria**: RabbitMQ (amqplib)

### ⚠️ Regras para Backend:
*   **NUNCA** adicione lógica de conexão com WhatsApp (WWebJS/Baileys) diretamente no Backend.
*   Use o **Service Layer Pattern**: Controllers chamam Services.
*   Para ações no WhatsApp, publique mensagens no RabbitMQ.
*   Logs devem ser direcionados para `stdout`/`stderr` para coleta pelo Docker.

---

## 🤖 WhatsApp Engines (Microserviços)

Workers independentes que se conectam ao WhatsApp.

### Engine Standard (`whaileys-engine`)
*   **Tecnologia**: Node.js / TypeScript
*   **Lib Core**: **Whaileys**
*   **Função**: Processamento padrão, containerizado separadamente.

### Engine Enterprise (Conceito/Futuro)
*   **Tecnologia**: **Go (Golang)**
*   **Lib Core**: **WhatsMeow**
*   **Função**: Performance extrema para alto volume.

---

## 🌊 Flow Engine (Automação)

Sistema de automação híbrido e agnóstico à plataforma, capaz de orquestrar fluxos complexos iniciados por diversos eventos (WhatsApp, Kanban, Tickets, etc.).

*   **Arquitetura**: Baseada em Grafos (Nós e Arestas), Gatilhos (Triggers) e Sessões (Sessions).
*   **Componentes Chave**:
    *   `FlowExecutorService`: Motor de execução que processa a lógica dos nós.
    *   `FlowTriggerService`: Identifica eventos do sistema e inicia fluxos correspondentes.
    *   `FlowSessions`: Mantém o estado persistente de cada execução.
*   **Extensibilidade**: Projetado para receber novos tipos de gatilhos e nós de ação facilmente.

> [!TIP]
> **Documentação Completa**: Para detalhes de implementação, como criar novos gatilhos e nós, consulte [FLOW_ENGINE.md](../docs/engine_whaileys/FLOW_ENGINE.md).

---

## 🗄️ Banco de Dados: PostgreSQL + Extensions

Imagem customizada rodando em serviço dedicado no Swarm.

*   **Imagem Docker**: `ronaldodavi/pgvectorgis:latest`
*   **Extensões**:
    *   **PostGIS**: Adiciona suporte a objetos geográficos ao banco de dados PostgreSQL. Permite executar consultas de localização (raio, distância), armazenar coordenadas (lat/long) de contatos e interações, possibilitando recursos avançados de geolocalização e mapas.
    *   **pgvector**: Fornece recursos de busca e armazenamento de vetores. Essencial para implementações de IA e RAG (Retrieval-Augmented Generation), permitindo armazenar "embeddings" de mensagens e documentos para realizar buscas semânticas e de similaridade de forma eficiente diretamente no banco.
*   **Migrações**: Executadas automaticamente pelo container do backend na inicialização (via `dockerize` check).

---

## 🚀 Fluxo de Desenvolvimento (Swarm Only)

Todo o ciclo de vida da aplicação é gerenciado via Docker Swarm.

### 1. Inicialização (Deploy Completo)
Para subir a stack completa pela primeira vez ou recriar tudo:
```bash
docker stack deploy -c docker-stack.yml watink
```

> [!TIP]
> **Clean Deploy (Reset)**: Se precisar limpar volumes ou garantir um estado limpo (ex: erro de seeds ou banco corrompido), você pode remover a stack e os volumes antes de subir novamente:
> ```bash
> docker stack rm watink
> docker volume rm watink_db_data watink_backend_public_data # Cuidado! Apaga dados.
> # Aguarde alguns segundos para os containers encerrarem
> docker stack deploy -c docker-stack.yml watink
> ```

### 2. Aplicando Alterações (Update Script)
Para aplicar mudanças de código (backend, frontend ou engine), utilize sempre o script de automação `./update.sh`. Ele cuida do versionamento (SemVer), build da imagem e atualização do serviço no Swarm.

Sintaxe: `./update.sh <service> [type]`
*   **service**: `backend`, `frontend`, `engine` ou `all`.
*   **type** (opcional): `patch` (padrão), `minor`, `major`.

Exemplos:
```bash
# Atualizar Backend (cria nova versão patch, builda e atualiza serviço)
./update.sh backend

# Atualizar Frontend
./update.sh frontend

# Atualizar Engine com mudança Minor (ex: novas features)
./update.sh engine minor
```

> [!WARNING]
> O script `./update.sh` já executa o `docker service update` automaticamente com a flag `--force`. Não é necessário rodar comandos manuais de docker exceto para debugging.

### 2.1 Atualização de Variáveis e Stack
Se você alterou o `docker-stack.yml` (ex: novas variáveis de ambiente, portas, volumes):
```bash
docker stack deploy -c docker-stack.yml watink
```
O Swarm detectará as diferenças e atualizará apenas os serviços afetados.

### 3. Debug & Logs
*   **Logs**: `docker service logs -f watink_backend` (ou frontend, whaileys-engine, etc).
*   **Swagger**: Acesse `http://localhost:8080/docs` para testar/documentar a API.
*   **RabbitMQ**: `http://localhost:15672` para monitorar filas.

---

## 🏷️ Versionamento e Release

Seguimos estritamente o **Semantic Versioning (SemVer)** (ex: `1.0.0`).

### Política de Atualização
⚠️ **REGRA OBRIGATÓRIA**: Sempre que for realizar um build de qualquer container (seja desenvolvimento ou produção), o versionamento **DEVE** ser atualizado antes. Não gere builds sem incrementar a versão (`patch`, `minor` ou `major`).

1.  **Analise as Mudanças**:
    *   **Major (X.0.0)**: Mudanças incompatíveis na API ou quebra de compatibilidade.
    *   **Minor (0.X.0)**: Novas funcionalidades retrocompatíveis.
    *   **Patch (0.0.X)**: Correções de bugs retrocompatíveis.

2.  **Atualize o `package.json`**:
    Use o comando npm para atualizar a versão e criar a tag git automaticamente.
    ```bash
    cd backend # ou frontend/whaileys-engine
    npm version patch # ou minor/major
    ```

3.  **Build e Tag Docker**:
    Ao construir a imagem, use a nova versão como tag, além da `latest`.
    ```bash
    # Exemplo para Backend v1.0.1
    docker build -t watink/backend:1.2.0 -t watink/backend:latest .
    docker push watink/backend:1.2.0
    docker push watink/backend:latest
    ```

4.  **Atualize o Serviço**:
    No ambiente de produção, fixe a versão específica para evitar atualizações acidentais, ou use `latest` em desenvolvimento.
    ```bash
    docker service update --image watink/backend:1.2.0 watink_backend
    ```
