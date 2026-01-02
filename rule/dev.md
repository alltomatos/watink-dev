# 🛠️ Guia de Desenvolvimento - Watink

Este documento serve como referência técnica para desenvolvedores que atuam no projeto **Watink**. Ele detalha a stack tecnológica, arquitetura de microserviços e padrões de projeto que devem ser seguidos rigorosamente.

> [!IMPORTANT]
> **Leitura Complementar Obrigatória**: Consulte também [dev_micro.md](./dev_micro.md) para detalhes específicos da arquitetura de microserviços.
> **Sempre responda e crie documentos em Português do Brasil.**
> **Ambiente de Execução**: Todo o desenvolvimento e execução do projeto deve ser feito via **Docker Swarm**. Não rode os serviços localmente (fora de containers).

---

## 🏗️ Arquitetura de Microserviços

O projeto evoluiu de um monolito para uma arquitetura distribuída orientada a eventos, rodando exclusivamente em containers orquestrados.

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below deeply to understand the Microservices Topology and Multitenancy strategy. Then, return to this exact point to continue. -->
- [Arquitetura de Microserviços e Topologia](../docs/microservices/ARCHITECTURE.md)
- [Multitenancy e Isolamento](../docs/microservices/MULTITENANCY.md)

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

<!-- AI_INSTRUCTION: Pause analysis here. Read the documents linked below to understand the Frontend Architecture, Directory Structure, and Theming guidelines. Then, return to this exact point. -->
- [Arquitetura do Frontend](../docs/frontend/ARCHITECTURE.md)
- [Guia de Temas e Design](../docs/frontend/THEMING.md)

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

<!-- AI_INSTRUCTION: Pause analysis here. Read the documents linked below to understand the Backend Architecture, API patterns, and Setup. Then, return to this exact point. -->
- [Arquitetura do Backend](../docs/backend/ARCHITECTURE.md)
- [Documentação da API](../docs/backend/API.md)

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

<!-- AI_INSTRUCTION: Pause analysis here. Read the documents linked below to understand the Engine architecture, Event System, and how to develop for it. Then, return here. -->
- [Documentação do Engine (Whaileys)](../docs/engine-standard/README.md)
- [Arquitetura de Eventos Engine](../docs/engine-standard/ARCHITECTURE.md)

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

<!-- AI_INSTRUCTION: Pause analysis here. Read the documents linked below to understand the Flow Builder implementation. Then, return here. -->
- [Visão Geral do Flow Builder](../docs/frontend/flowbuilder/OVERVIEW.md)
- [Componentes do Flow Builder](../docs/frontend/flowbuilder/COMPONENTS.md)

*   **Arquitetura**: Baseada em Grafos (Nós e Arestas), Gatilhos (Triggers) e Sessões (Sessions).
*   **Componentes Chave**:
    *   `FlowExecutorService`: Motor de execução que processa a lógica dos nós.
    *   `FlowTriggerService`: Identifica eventos do sistema e inicia fluxos correspondentes.
    *   `FlowSessions`: Mantém o estado persistente de cada execução.
*   **Extensibilidade**: Projetado para receber novos tipos de gatilhos e nós de ação facilmente.

---

## 🗄️ Banco de Dados: PostgreSQL + Extensions

Imagem customizada rodando em serviço dedicado no Swarm.

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below to understand the Multitenancy isolation and RLS security. Then, return here. -->
- [Multitenancy e RLS](../docs/microservices/MULTITENANCY.md)

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
Para aplicar mudanças de código (backend, frontend ou engine), utilize sempre o script de automação `./update.sh`. Ele cuida do versionamento (SemVer), build da imagem, **atualização do `docker-stack.yml`** e redeploy da stack.

Sintaxe: `./update.sh <service> [type]`

**O que o script faz:**
1.  Incrementa versão no `package.json`.
2.  Gera tags docker correspondentes.
3.  **Atualiza o `docker-stack.yml` com a nova tag específica (ex: 1.0.5).**
4.  Executa `docker stack deploy` para aplicar o novo estado.

Exemplos:
```bash
./update.sh backend
```

> [!WARNING]
> O `docker-stack.yml` é a fonte da verdade. O script irá garantirá que a versão da imagem no arquivo seja a que está rodando.

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

## 📚 Manutenção da Documentação

A documentação é parte integrante e vital do sistema, dividida em **Manual do Usuário** (`userguide/`) e **Documentação Técnica** (`docs/`). Qualquer alteração no código deve ser refletida imediatamente na documentação correspondente.

<!-- AI_INSTRUCTION: Pause analysis here. Read the directory structures of userguide/ and docs/ to understand where to add or update documentation. Then, return here. -->
### Regras de Ouro

#### 1. Manual do Usuário (`userguide/`)
*   **Sincronia**: Todo PR que altera funcionalidade ou UX deve incluir a atualização no `userguide/`.
*   **Novos Módulos**: Ao criar um novo módulo (ex: "Marketing"), **deve-se** criar a pasta correspondente `userguide/marketing/` e documentar seu uso.
*   **Novos Modelos de Conexão**: Se um novo modelo de conexão for adicionado, atualize `userguide/connections/` detalhando o processo.

#### 2. Documentação Técnica (`docs/`)
*   **Arquitetura e Design**: Se alterar a arquitetura, criar novos serviços ou mudar padrões de projeto, atualize os documentos em `docs/` (ex: `docs/backend/`, `docs/microservices/`).
*   **Novos Componentes Técnicos**: Código relevante novo (ex: um novo Engine, um novo Service complexo) exige a criação de documentação técnica explicando seu funcionamento, decisões de design e integração.
*   **API**: Alterações em endpoints devem refletir no Swagger e, se necessário, em `docs/backend/API.md`.

> [!IMPORTANT]
> Considere a tarefa incompleta se a documentação (User Guide ou Técnica) não estiver atualizada. A documentação deve evoluir viva junto com o software.

---

## 🌳 Controle de Versão (Git)

Para manter a sanidade do repositório, siga estas convenções de Git Flow.

### 1. Padrão de Branches
*   **`devel_developer`**: Branch principal de desenvolvimento (staging).
*   **`main`**: Produção (estável).
*   **`feature/nome-atividade`**: Novas funcionalidades (ex: `feature/nova-api-chat`).
*   **`fix/nome-correcao`**: Correções de bugs (ex: `fix/scroll-chat`).
*   **`chore/nome-tarefa`**: Tarefas de manutenção, docs ou config (ex: `chore/atualizar-readme`).

### 2. Fluxo de Trabalho (Workflow)
1.  **Branching**: Sempre crie sua branch a partir da `devel_developer` (ou da branch de integração vigente).
2.  **Desenvolvimento**: Realize suas alterações e testes no Swarm.
3.  **Preparação para Merge**:
    *   Verifique se tudo funciona.
    *   Execute `./update.sh` para incrementar a versão e atualizar o `docker-stack.yml`.
4.  **Commit & Push**:
    *   Inclua os arquivos de versão (`package.json`) e o `docker-stack.yml` atualizado no commit.
    *   Mensagens de commit devem seguir o [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`.
5.  **Pull Request**: Abra o PR para a branch principal.

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
    No ambiente de produção (e agora também em desenvolvimento para evitar cache agressivo), **SEMPRE** use a versão específica.
    ```bash
    docker service update --image watink/backend:1.2.0 watink_backend
    ```
