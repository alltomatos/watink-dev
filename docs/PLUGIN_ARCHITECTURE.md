# Arquitetura de Plugins e Licenciamento: Watink vs Watink Manager

Este documento detalha a divisão de responsabilidades entre o **Watink** (a plataforma utilizada pelos clientes) e o **Watink Manager** (o painel administrativo/SaaS da Watink), especificamente no contexto do ecossistema de Plugins.

## Visão Geral

O ecossistema opera em um modelo Cliente-Servidor distribuído:
*   **Watink (Instância/Cliente)**: O software rodando na infraestrutura do cliente ou no cluster SaaS. É o consumidor dos plugins.
*   **Watink Manager (Central/Servidor)**: A plataforma central que gerencia o catálogo, vendas, licenças e distribuição de metadados.

---

## 1. Watink Manager (O "Cérebro")

O **Watink Manager** é a autoridade central. Suas responsabilidades são:

### A. Catálogo e Marketplace
*   **Hospedagem de Metadados**: Armazena nome, descrição, versão, ícone e preço dos plugins.
*   **Gestão de Arquivos**: Armazena os binários (`.zip`) ou referências de código (para casos de download, embora a arquitetura recomendada seja 'built-in').
*   **API Pública**: Expõe endpoints (REST) para que as instâncias do Watink consultem o catálogo (`GET /marketplace_plugins`).

### B. Gestão de Licenças (Licensing Authority)
*   **Emissão de Chaves**: Gera chaves de licença únicas (License Keys) vinculadas a um Cliente/Tenant.
*   **Validação de Status**: Mantém o status financeiro da assinatura (Adimplente, Inadimplente, Cancelado).
*   **Endpoint de Verificação**: Fornece uma API (`POST /verify_license`) que recebe uma chave e retorna `VALID` ou `INVALID`.

### C. Segurança e Controle
*   **Webhooks de Pagamento**: Integra com gateways (Stripe, AAS, etc.) para ativar/desativar licenças automaticamente mediante pagamento.
*   **Kill Switch**: Capacidade de revogar remotamente uma licença em caso de abuso ou falta de pagamento.

---

## 2. Watink (A Instância)

O **Watink** é o executor. Cada instância possui um serviço dedicado chamado **Plugin Manager** (`/plugin-manager`), responsável por:

### A. Gatekeeper Local (Feature Flags)
*   **Consulta de Catálogo**: Conecta-se periodicamente ao Watink Manager para baixar a lista atualizada de plugins disponíveis.
*   **Cache Local**: Armazena os dados do catálogo no banco de dados local (`Plugins` table) para garantir funcionamento offline (Modo Fallback).

### B. Ativação e Ciclo de Vida
*   **Ativação (Activate)**:
    1.  Recebe o comando do usuário (botão "Ativar").
    2.  Verifica se o plugin é "Premium". Se sim, solicita/valida a chave de licença junto ao Watink Manager.
    3.  Se validado, marca o plugin como `active` na tabela local `PluginInstallations`.
    4.  Desbloqueia a funcionalidade no Frontend (Sidebar) e Backend (Rotas) instantaneamente.
*   **Phone Home (Revalidação)**:
    *   Executa rotinas periódicas (Cron Jobs) para verificar se as licenças ativas continuam válidas no Watink Manager.
    *   Se o Manager informar renovação falhada, o Plugin Manager local desativa o plugin automaticamente.

### C. Execução de Código
*   **Código Embutido**: Em ambientes Docker Swarm, o código dos plugins oficiais ("Clientes", "Helpdesk") já reside nas imagens Docker do Watink (`frontend` e `backend`).
*   **Liberação**: A "instalação" não baixa código novo; ela apenas **habilita** o acesso a esse código pré-existente via banco de dados.

---

## Fluxo de Segurança: Prevenção de Fraudes

Para mitigar a ativação indevida (ex: alteração manual no banco de dados local):

1.  **Validação na Origem**: O Endpoint de Ativação no Watink exige resposta positiva do Watink Manager.
2.  **Plugins Híbridos (Recomendado para High-Value)**: Para plugins críticos (ex: IA, Transcrição), parte da lógica de negócio deve rodar na nuvem do Watink Manager (API). Assim, mesmo que o usuário force a ativação local, o plugin não funcionará sem uma chave válida autenticada na API da nuvem.

---

## Resumo das Responsabilidades

| Funcionalidade | Responsável | Ação |
| :--- | :--- | :--- |
| **Criar Plugin (Upload)** | Watink Manager | Admin faz upload do .zip e define preço/metadados. |
| **Vender Plugin** | Watink Manager | Processa pagamento e gera License Key. |
| **Listar Plugins** | Watink (Plugin Manager) | Consome API do Manager e exibe no Admin do Tenant. |
| **Validar Licença** | Watink Manager | Responde se a chave é válida para aquele Tenant. |
| **Executar Plugin** | Watink | Roda o código (Frontend/Backend) se status local = active. |
| **Revogar Acesso** | Watink + Manager | Manager invalida chave -> Watink (job) consulta e desativa. |
