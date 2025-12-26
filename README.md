# 🚀 Watic Premium

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Plataforma empresarial de gestão de atendimento WhatsApp** com automação visual, CRM integrado e inteligência artificial.

---

## 🎯 Visão Geral

O **Watic Premium** é uma solução completa para empresas que precisam escalar operações de atendimento, vendas e engajamento via WhatsApp. Combina automação visual, CRM Kanban e recursos de IA em uma arquitetura de microsserviços escalável.

---

## ⚡ Funcionalidades

### 🔄 Flow Builder Visual (Drag & Drop)
Sistema de automação visual para criar fluxos de conversação sem código.

| Recurso | Descrição |
|---------|-----------|
| **Nós de Mensagem** | Texto, áudio, imagens, vídeos e documentos |
| **Menu Interativo** | List Messages e botões de resposta rápida |
| **Lógica Condicional** | Switch nodes com múltiplas condições |
| **Integração Webhook** | Envio de dados para sistemas externos |
| **Integração API** | Chamadas HTTP configuráveis (GET/POST/PUT/DELETE) |
| **Ações de Ticket** | Transferir para fila, atribuir atendente, alterar status |
| **Ações de Pipeline** | Mover contato entre etapas do CRM |
| **Gatilhos** | Palavra-chave, horário, evento de sistema |

### 🧠 Base de Conhecimento (RAG)
Sistema de inteligência artificial para respostas automáticas baseadas em documentos.

| Recurso | Descrição |
|---------|-----------|
| **Ingestão de Conteúdo** | Upload de PDFs, URLs e texto manual |
| **Processamento Vetorial** | Chunking automático + embeddings OpenAI |
| **Busca Semântica** | Similaridade via pgvector no PostgreSQL |
| **Modos de Resposta** | Automático (IA), Sugestão para atendente, Apenas busca |

### 📊 CRM & Pipeline (Kanban)
Funil de vendas visual integrado ao atendimento.

| Recurso | Descrição |
|---------|-----------|
| **Pipelines Personalizáveis** | Múltiplos funis com etapas customizadas |
| **Cartões de Deal** | Visualização rápida de valor, contato e status |
| **Automação de Movimentação** | Gatilhos do FlowBuilder movem leads automaticamente |
| **Campos Customizados** | Dados adicionais por negociação |

### 💬 Mensagens Interativas
Recursos avançados do WhatsApp Business API.

| Tipo | Descrição |
|------|-----------|
| **List Messages** | Menus com até 10 opções para seleção |
| **Button Messages** | Botões de resposta rápida (até 3) |
| **Call-to-Action** | Botões de ligação e URL |
| **Carrossel** | Cards horizontais com imagem, título e botões |
| **Catálogos** | Exibição de produtos do catálogo |

### 🏢 Multi-Atendimento & Multi-Departamento
Gestão completa de equipes e atendimentos.

| Recurso | Descrição |
|---------|-----------|
| **Múltiplas Conexões** | Vários números WhatsApp simultâneos |
| **Filas e Departamentos** | Distribuição automática de tickets |
| **Atendentes por Fila** | Permissões granulares |
| **Transferência** | Entre atendentes e departamentos |
| **Chat Interno** | Comunicação privada entre a equipe |

### 📈 Campanhas e Disparos
Comunicação em massa com segmentação.

| Recurso | Descrição |
|---------|-----------|
| **Campanhas** | Disparos agendados ou imediatos |
| **Segmentação** | Por tags, filas ou listas |
| **Templates** | Mensagens pré-aprovadas |
| **Relatórios** | Taxa de entrega, leitura e resposta |

### 👥 Gestão de Contatos
Centralização e enriquecimento de dados.

| Recurso | Descrição |
|---------|-----------|
| **Importação** | CSV, Excel ou manual |
| **Sincronização** | Foto de perfil automática |
| **Tags** | Etiquetas para segmentação |
| **Histórico** | Todas as conversas do contato |
| **Campos Extras** | CPF, CNPJ, dados customizados |

### ⚙️ Configurações e Personalização
Adaptação completa ao seu negócio.

| Recurso | Descrição |
|---------|-----------|
| **Multi-Tenant** | Isolamento de dados por empresa |
| **Temas** | Cores e logo personalizáveis |
| **Respostas Rápidas** | Atalhos de texto frequentes |
| **Horário de Atendimento** | Mensagens automáticas fora do expediente |
| **Integrações IA** | Configuração de API OpenAI/Anthropic |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│  • Material UI v4  • React Flow  • Socket.IO Client             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                      BACKEND (Node.js + Express)                 │
│  • TypeScript  • Sequelize ORM  • Swagger Docs                  │
└──────────┬───────────────────┬───────────────────┬──────────────┘
           │                   │                   │
    ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼──────┐
    │  PostgreSQL  │    │   RabbitMQ    │   │   Redis     │
    │  + pgvector  │    │   (Filas)     │   │  (Cache)    │
    └─────────────┘    └───────┬───────┘   └─────────────┘
                               │
           ┌───────────────────▼───────────────────┐
           │        ENGINE WHATSAPP (Whaileys)      │
           │   • Baileys Core  • Multi-Device       │
           │   • QR Code  • Reconexão Automática    │
           └────────────────────────────────────────┘
```

### Componentes Principais

| Componente | Tecnologia | Função |
|------------|------------|--------|
| **Frontend** | React 17, Vite, Material UI | Interface SPA responsiva |
| **Backend** | Node.js 20, TypeScript, Express | API REST + Orchestrator |
| **Engine** | Whaileys (Baileys wrapper) | Conexão WhatsApp |
| **Database** | PostgreSQL + pgvector + PostGIS | Dados + Busca vetorial + Geo |
| **Queue** | RabbitMQ | Mensageria assíncrona |
| **Cache** | Redis | Sessões e cache |

---

## 📂 Estrutura do Projeto

```
watic-premium/
├── backend/                 # API Node.js/TypeScript
│   ├── src/
│   │   ├── controllers/     # Endpoints da API
│   │   ├── models/          # Modelos Sequelize
│   │   ├── services/        # Lógica de negócio
│   │   │   └── FlowServices/  # Motor de execução de fluxos
│   │   └── routes/          # Definição de rotas
│   └── Dockerfile
├── frontend/                # SPA React + Vite
│   ├── src/
│   │   ├── pages/           # Páginas da aplicação
│   │   │   ├── FlowBuilder/   # Editor visual de fluxos
│   │   │   ├── Pipelines/     # CRM Kanban
│   │   │   ├── KnowledgeBase/ # Gestão de bases de conhecimento
│   │   │   └── ...
│   │   └── components/      # Componentes reutilizáveis
│   └── Dockerfile
├── engine-standard/         # Engine WhatsApp (Node.js)
├── engine-go/               # Engine WhatsApp (Go) - Experimental
├── docs/                    # Documentação técnica
└── docker-stack.yml         # Orquestração Docker Swarm
```

---

## 📚 Documentação Técnica

| Documento | Descrição |
|-----------|-----------|
| [Guia de Desenvolvimento](rule/dev.md) | Padrões e fluxo de trabalho |
| [Arquitetura de Microsserviços](rule/dev_micro.md) | Comunicação entre serviços |
| [Flow Engine](docs/engine_whaileys/FLOW_ENGINE.md) | Motor de execução de fluxos |
| [Escalabilidade](docs/architecture/SCALABILITY_FLOW_ENGINE.md) | Estratégias de scaling |
| [Guia de Temas](docs/guia_criacao_temas.md) | Personalização visual |

---

## 🔒 Segurança

- **Autenticação JWT** com refresh tokens
- **RBAC** (Role-Based Access Control)
- **Multi-Tenant** com isolamento de dados
- **Logs de auditoria** para ações críticas
- **Criptografia** de credenciais sensíveis

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais informações.

---

## ⚠️ Disclaimer

Este software é fornecido para fins educacionais e de gestão privada. O uso de automações no WhatsApp pode estar sujeito às políticas da Meta/Facebook. Utilize com responsabilidade.
