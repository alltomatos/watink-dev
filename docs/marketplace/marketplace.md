# Arquitetura do Marketplace e Plugins

Este documento detalha o funcionamento do sistema de Marketplace e Plugins do Watink/Pastorini. Ele serve como guia de referência para entender a arquitetura, o fluxo de dados e como desenvolver novos plugins.

---

## 1. Visão Geral

O Marketplace é um sistema modular que permite estender as funcionalidades do núcleo (Core) sem modificar o código-fonte principal. Plugins são tratados como cidadãos de primeira classe na arquitetura, operando como microserviços independentes ou extensões lógicas.

### Filosofia
*   **Modularidade**: Plugins devem ser desacoplados do Core.
*   **Isolamento**: Falhas em um plugin não devem derrubar o sistema principal.
*   **Multitenancy**: Plugins são ativados/desativados por Tenant (Inquilino).

---

## 2. Arquitetura

A arquitetura é composta por 4 componentes principais:

```mermaid
flowchart TD
    User[Usuário (Frontend)]
    Traefik[Traefik Proxy]
    Backend[Backend (Node.js)]
    Manager[Plugin Manager (Go)]
    DB[(PostgreSQL)]
    PluginService[Plugin Service (ex: Engine PAPI)]

    User -->|/products/papi| Traefik
    Traefik -->|/api/*| Backend
    Backend -->|Proxy /plugins/api| Manager
    Backend -->|Proxy /plugins/papi| PluginService
    Manager -->|Reads/Writes| DB
    PluginService -->|Consumes| RabbitMQ
```

### Componentes

#### 2.1 Plugin Manager (Serviço Go)
Escrito em Go, é a "fonte da verdade" sobre o estado dos plugins.
*   **Função**: Gerenciar o ciclo de vida (Instalar, Ativar, Desativar).
*   **Segurança**: Valida licenças e cotas ante de permitir a instalação.
*   **API**: Expõe rotas internas para o Backend (`/api/v1/plugins/...`).

#### 2.2 Backend (Orquestrador e Proxy)
O Backend Node.js atua como API Gateway para o frontend.
*   **Proxy de Gerenciamento**: Repassa requisições de catálogo/instalação para o `Plugin Manager`.
*   **Proxy de Função**: Repassa requisições específicas de plugins (ex: Webhooks, testes de conexão) para os respectivos containers de plugin.
*   **Rotas**:
    *   `/plugins/*` -> Encaminhado para o `Plugin Manager`.
    *   `/plugins/<slug>/*` -> Rotas específicas definidas em `pluginRoutes.ts`.

#### 2.3 Serviços de Plugin (Containers)
Cada plugin complexo (como Engine PAPI, SMTP) roda em seu próprio container Docker.
*   **Deploy**: Definidos no `docker-plugin.yml`.
*   **Comunicação**: Escutam em portas internas ou consomem filas do RabbitMQ.
*   **Configuração**: Recebem configurações dinamicamente via Payload (RabbitMQ) ou Banco de Dados, evitando variáveis de ambiente estáticas sempre que possível.

---

## 3. Modelo de Dados

O gerenciamento é feito via Banco de Dados Compartilhado (PostgreSQL).

### Tabela `Plugins`
Catálogo global de plugins disponíveis no sistema.
*   `slug`: Identificador único (ex: `engine-papi`).
*   `type`: Tipo de plugin (ex: `integration`, `channel`).
*   `version`: Versão atual disponível.

### Tabela `PluginInstallations`
Relacionamento Many-to-Many entre Tenants e Plugins.
*   `tenantId`: Quem instalou.
*   `pluginId`: O que foi instalado.
*   `status`: `active` | `inactive`.
*   `settings`: (Opcional) Configurações JSON específicas da instalação.

---

## 4. Guia de Desenvolvimento de Plugins

> [!TIP]
> **Mentor Technical Advice**: Ao criar um plugin, prefira sempre criar um **microserviço isolado** em vez de adicionar código ao monolito do Backend. Isso facilita a escalabilidade e manutenção.

### Passos para Criar um Plugin

1.  **Definição do Serviço**:
    *   Crie um diretório em `plugins/<meu-plugin>`.
    *   Crie um `Dockerfile` otimizado (Multi-stage build).
    *   Defina o serviço no `docker-plugin.yml`.

2.  **Frontend (Interface de Configuração)**:
    *   Em `frontend/src/pages/Marketplace/`, crie um formulário de configurações (ex: `MeuPluginSettings.js`).
    *   Este formulário deve receber a prop `active` para controlar sua exibição.
    *   **Regra de Ouro da UI**: Sempre desabilite ações destrutivas ou testes enquanto houver mudanças não salvas ("Dirty State").

3.  **Backend (Integração)**:
    *   Adicione as rotas necessárias em `backend/src/routes/pluginRoutes.ts`.
    *   Se o plugin precisar de Webhook, use o padrão de **Auto-Configuração**:
        ```typescript
        // Exemplo: Gerar URL baseada no domínio do App
        const webhookUrl = `${process.env.FRONTEND_URL}/plugins/meu-plugin/webhook`;
        ```

4.  **Database**:
    *   Insira o registro do plugin na tabela `Plugins` via Seed ou Migration.

### Boas Práticas (Best Practices)

*   **Statelessness**: Seus containers de plugin não devem guardar estado em memória local que precise persistir além do ciclo de vida da requisição. Use Redis ou Postgres.
*   **Configuração Dinâmica**: Evite `process.env` para configurações do usuário (Tokens, URLs). Use a tabela `Settings` e injete-as durante a execução.
*   **Falha Graciosa**: Se o plugin cair, o Core deve continuar funcionando. Use Try-Catch nos blocos de integração e Circuit Breakers se necessário.
*   **Logs**: Logue em `STDOUT` no formato JSON ou texto estruturado para fácil ingestão por ferramentas de monitoramento.

---

## 5. Deployment

Para deploy de plugins:
1.  Atualize o `docker-plugin.yml`.
2.  Use o script de automação:
    ```bash
    ./update.sh <nome-do-serviço-plugin>
    ```
3.  Isso garante versionamento semântico e tagging correta no Docker Hub.
