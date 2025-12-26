# Watic Premium - Plataforma de Gestão de Atendimento WhatsApp

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)

**Watic Premium** é uma solução completa de nível empresarial para gestão de atendimento via WhatsApp, projetada para escalar operações de suporte, vendas e engajamento. Agora com **Flow Builder Visual**, **CRM Kanban** e arquitetura de microsserviços via Docker Swarm.

---

## 🚀 Funcionalidades Principais

### 🎨 Flow Builder Visual (Drag & Drop)
Crie fluxos de conversação complexos e autômatos de atendimento sem escrever código.
- **Nós de Interação**: Texto, Áudio, Imagens, Vídeos.
- **Lógica Condicional**: Desvios baseados em respostas ou palavras-chave.
- **Integrações**: Webhooks para sistemas externos.
- **Visualização**: Interface intuitiva baseada em `React Flow`.

### 📊 CRM & Pipeline (Kanban)
Organize seus leads e atendimentos em um funil de vendas visual.
- **Etapas Personalizáveis**: Configure seu próprio fluxo de vendas.
- **Cartões de Interação**: Visualize rapidamente o status de cada contato.
- **Automação de Movimentação**: Mova leads automaticamente baseando-se em gatilhos do fluxo.

### 💬 Mensagens Interativas
Vá além do texto simples com recursos avançados do WhatsApp Business API (via Engine proprietária).
- **List Messages**: Menus de opções para facilitar a escolha do usuário.
- **Button Messages**: Botões de resposta rápida e Call-to-Action.
- **Carrosséis**: Exiba produtos ou serviços em cartões deslizantes.

### 🏢 Multi-Atendimento & Multi-Departamento
- **Múltiplos Usuários**: Agentes simultâneos em um mesmo número.
- **Filas e Departamentos**: Distribuição automática de tickets.
- **Chat Interno**: Comunicação privada entre a equipe.

### 📈 Campanhas e Disparos
- **Gestão de Campanhas**: Disparos em massa com agendamento.
- **Tagging**: Segmentação de contatos por etiquetas.

---

## 🛠️ Stack Tecnológica

O projeto utiliza uma arquitetura moderna e escalável:

- **Frontend**: 
  - React 17
  - Material UI (v4)
  - Vite (Build ultra-rápido)
  - React Flow (Builder)
- **Backend**: 
  - Node.js (v20+)
  - TypeScript
  - Express
  - Sequelize ORM
- **Engine WhatsApp**: 
  - Whaileys Engine (Baseada em Baileys/Go)
  - Suporte a QR Code e Multi-Device
- **Infraestrutura & Dados**:
  - **Banco de Dados**: PostgreSQL (com extensão `pgvector` para recursos de IA)
  - **Filas**: RabbitMQ (Gerenciamento de alta carga de mensagens)
  - **Cache/Sessão**: Redis (Opcional/Integrado)
  - **Orquestração**: Docker Swarm

---

## 📋 Pré-requisitos

Para rodar este projeto, você precisará de:

- **Node.js** (v20 Recomendado)
- **Docker** & **Docker Compose**
- **Git**

---

## 🚀 Instalação e Deploy (Docker Swarm)

A forma recomendada de executar o Watic Premium em produção é utilizando Docker Swarm.

### 1. Preparação do Ambiente

Clone o repositório e acesse a pasta:

```bash
git clone https://github.com/seu-repo/watic-premium.git
cd watic-premium
```

### 2. Configuração

Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas configurações de banco de dados, senhas e URLs.

### 3. Deploy da Stack

O projeto inclui um arquivo `docker-stack.yml` configurado para orquestração. Para iniciar:

```bash
# Inicialize o Swarm (se ainda não estiver ativo)
docker swarm init

# Crie a rede overlay (se necessário, ou deixe o stack criar)
docker network create --driver overlay watic-premium_public
docker network create --driver overlay watic-premium_private

# Realize o deploy
docker stack deploy -c docker-stack.yml watic
```

### 4. Gestão

Para verificar o status dos serviços:
```bash
docker service ls
```

---

## 💻 Desenvolvimento Local

Para contribuir ou customizar o código:

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

O Frontend rodará via Vite, proporcionando Hot Module Replacement (HMR) instantâneo.

---

## ⚠️ Disclaimer

Este software é uma solução de "Código Aberto" para fins educacionais e de gestão privada. O uso de automações no WhatsApp pode estar sujeito às políticas da Meta/Facebook. Utilize com responsabilidade para evitar banimentos de números.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
