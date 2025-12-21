# Análise Técnica do Projeto Whaticket Community

## 1. Visão Geral do Projeto
O **Whaticket Community** é um sistema de gerenciamento de tickets focado na integração com o WhatsApp. Ele permite que múltiplos usuários (agentes) gerenciem atendimentos ao cliente a partir de uma plataforma unificada. O projeto é estruturado como um **monorepo**, contendo tanto o backend quanto o frontend no mesmo repositório.

## 2. Arquitetura e Stack Tecnológica

### Backend (`/backend`)
O backend é responsável pela lógica de negócios, conexão com o banco de dados e integração com o WhatsApp.

*   **Runtime:** Node.js com **TypeScript**.
*   **Framework:** **Express.js** para a API REST.
*   **Banco de Dados:**
    *   **ORM:** **Sequelize** (versão com suporte a TypeScript).
    *   **Motor:** Suporte padrão para MySQL/MariaDB, com possibilidade de uso com PostgreSQL.
    *   **Estrutura:** Utiliza migrações (`/src/database/migrations`) e seeds para versionamento e população inicial do banco.
*   **Integração WhatsApp:** Biblioteca **`whatsapp-web.js`**, que executa uma instância "headless" do Chrome (via Puppeteer) para simular o cliente web do WhatsApp.
*   **Autenticação:** JWT (JSON Web Tokens) com `bcryptjs` para hash de senhas.
*   **Tempo Real:** **Socket.IO** para enviar atualizações (novas mensagens, QR codes, mudança de status de tickets) para o frontend.
*   **Filas/Departamentos:** Implementação lógica própria modelada em `Queue.ts` para organizar tickets por departamento (não utiliza Redis/Bull para processamento de filas de tarefas em background, apenas categorização).
*   **Testes:** **Jest** para testes unitários e de integração.

### Frontend (`/frontend`)
O frontend é a interface do usuário para os agentes e administradores.

*   **Framework:** **React.js** (versão 16.x).
*   **Ferramenta de Build:** **Vite** (Migrado do Create React App, oferecendo builds mais rápidos).
*   **Biblioteca de UI:** **Material-UI v4** (atualmente considerada legada, versão atual é v5).
*   **Gerenciamento de Estado:** React **Context API** (`AuthContext`, `WhatsAppsContext`).
*   **Roteamento:** `react-router-dom` v5.
*   **Cliente HTTP:** **Axios** configurado com suporte a credenciais (cookies).
*   **Internacionalização:** `i18next` com suporte para Inglês, Espanhol e Português (pt-BR).

### Infraestrutura
*   **Docker:** Suporte completo à containerização (`docker-compose.yaml`).
    *   **Serviços:** `backend`, `frontend` (servido via Nginx), `mysql`.
    *   **Volumes:** Persistência de dados do banco e tokens de autenticação da sessão do WhatsApp (`.wwebjs_auth`).
*   **Configuração:** Variáveis de ambiente (`.env`) injetadas em tempo de execução.

## 3. Módulos e Funcionalidades Chave

| Módulo | Descrição |
| :--- | :--- |
| **Tickets** | Entidade central que vincula um Contato a um Usuário (agente). Rastreia status (aberto/pendente/fechado) e mensagens não lidas. |
| **Sessão WhatsApp** | Gerencia a conexão com o WhatsApp Web. Utiliza `LocalAuth` para persistir sessões em disco, evitando a necessidade de re-escanear o QR Code frequentemente. |
| **Contatos** | Gerenciamento da agenda de contatos. Possui funcionalidade de importação de contatos do celular. |
| **Filas (Queues)** | Departamentos/Categorias para roteamento de tickets (ex: Vendas, Suporte). |
| **Respostas Rápidas** | Respostas pré-definidas para agilizar o atendimento (atalho `/`). |
| **Serviços Wbot** | Coleção de serviços (`/src/services/WbotServices`) que lidam com a lógica específica do WhatsApp, como envio de mídia, escuta de mensagens e monitoramento da conexão. |

## 4. Fluxo de Dados Resumido
1.  **Login do Usuário:** Frontend envia credenciais -> Backend valida e emite JWT (provavelmente em cookie HttpOnly).
2.  **Conexão WhatsApp:** Usuário solicita QR Code -> Backend inicializa Puppeteer -> QR Code enviado via Socket.IO -> Frontend exibe.
3.  **Mensagem Recebida:** WhatsApp Web (Puppeteer) recebe mensagem -> Backend salva no DB -> Emite evento Socket.IO -> Frontend atualiza interface de chat.

## 5. Pontos de Atenção e Melhorias Sugeridas

### 5.1. Inconsistência de Variáveis de Ambiente
Existe um conflito potencial na configuração das variáveis de ambiente entre o Docker e o código do frontend:
*   O código (`config.js`) busca por `VITE_BACKEND_URL`.
*   O script de injeção do Docker (`add-env-vars.sh`) injeta variáveis começando com `REACT_APP_`.
*   O `docker-compose.yaml` define `REACT_APP_BACKEND_URL`.
**Risco:** Em ambiente Docker, o frontend pode falhar ao conectar com o backend.
**Recomendação:** Padronizar todas as variáveis para o prefixo `VITE_` (padrão do Vite) ou ajustar o script de injeção.

### 5.2. Dependências Legadas
*   **React v16:** O projeto usa uma versão antiga. Atualizar para v18+ traria melhorias de performance e novas features.
*   **Material-UI v4:** A versão atual é a v5. Manter a v4 pode dificultar a manutenção e compatibilidade com novas bibliotecas.

### 5.3. Estabilidade da Integração WhatsApp
O projeto depende da `whatsapp-web.js`. Embora excelente, esta biblioteca depende da estrutura interna do DOM do WhatsApp Web. Atualizações do WhatsApp podem quebrar a integração temporariamente até que a biblioteca seja atualizada.

### 5.4. Sistema de Filas
O conceito de "Queue" no banco de dados é organizacional (departamentos). Não há um sistema de fila de processamento de tarefas em background (como Redis/Bull) implementado para envios em massa ou tarefas pesadas, o que pode impactar a performance em alto volume.
