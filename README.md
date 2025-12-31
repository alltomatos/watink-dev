# 🚀 Watink

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**A Plataforma Definitiva de Atendimento WhatsApp**  
*Automação Visual, CRM Kanban e Inteligência Artificial em uma única solução.*

---

## ⚡ Principais Funcionalidades

O **Watink** transforma a maneira como sua empresa se comunica, centralizando atendimento, vendas e engajamento.

### 🔄 Automação Visual (Flow Builder)
Crie fluxos de conversa complexos **sem escrever código**. Arraste e solte para construir:
- **Menus Interativos**: Listas, Botões e Carrosséis.
- **Roteamento Inteligente**: Direcione clientes baseados em respostas ou horários.
- **Integrações**: Webhooks para conectar com seu ERP ou CRM externo.
- **Ações Automáticas**: Adicione etiquetas, mova leads no Kanban ou atribua a departamentos.

### 🧠 Inteligência Artificial (RAG)
Transforme seus documentos em atendimento automático:
- **Treinamento Simples**: Upload de PDFs, textos ou sites.
- **Respostas Humanizadas**: A IA responde dúvidas baseada no seu conteúdo.
- **Modos Flexíveis**: Automação total ou sugestão de resposta para o atendente.

### 📊 CRM & Kanban de Vendas
Visualize e gerencie suas oportunidades em tempo real:
- **Pipeline Personalizável**: Crie etapas que refletem seu processo de vendas.
- **Movimentação Automática**: O Flow Builder pode avançar leads no funil automaticamente.
- **Cartões Ricos**: Veja valor, responsável e histórico em um relance.

### 🏢 Gestão Multi-Departamento
Organize sua operação de atendimento:
- **Filas e Setores**: Separe Suporte, Vendas e Financeiro.
- **Multi-Atendentes**: Vários usuários no mesmo número de WhatsApp.
- **Permissões Granulares**: Controle total sobre o que cada usuário pode ver ou fazer.

### 📈 Campanhas em Massa
Engaje sua base de clientes com segurança:
- **Disparos Agendados**: Programe mensagens para o momento ideal.
- **Segmentação Precisa**: Envie apenas para contatos com Tags específicas.
- **Relatórios Detalhados**: Acompanhe a entrega e leitura em tempo real.

---

## 🏗️ Arquitetura Moderna

Projetado para **escalabilidade e performance**:

- **Frontend**: React (Vite) + Material UI - *Rápido e Responsivo*.
- **Backend**: Node.js + TypeScript - *Seguro e Tipado*.
- **Database**: PostgreSQL + pgvector - *Busca vetorial integrada*.
- **Engine**: Whaileys (Baileys) - *Conexão estável e Multi-Device*.
- **Filas**: RabbitMQ - *Processamento assíncrono robusto*.

---

## 📂 Estrutura do Repositório

```
watink/
├── backend/                 # API REST & WebSocket
├── frontend/                # Interface SPA
├── engine-standard/         # Motor de Conexão WhatsApp
├── docker-stack.yml         # Deploy via Docker Swarm
└── docs/                    # Documentação Completa
```

---

## 🚀 Começando

Consulte nossa documentação técnica para iniciar:

- [Guia de Desenvolvimento](rule/dev.md)
- [Arquitetura de Microsserviços](rule/dev_micro.md)

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais informações.

---

**Watink** - *Potencializando conversas, automatizando resultados.*
