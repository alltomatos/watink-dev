# Arquitetura do Backend

## Visão Geral
O backend do projeto Watink é construído utilizando **Node.js** com **TypeScript**, seguindo uma arquitetura MVC (Model-View-Controller) adaptada para APIs RESTful. O sistema é projetado para ser escalável e orientado a microsserviços, comunicando-se intensamente com o Engine do WhatsApp e o Frontend.

## Tecnologias Principais
- **Runtime**: Node.js
- **Linguagem**: TypeScript
- **Web Framework**: Express
- **ORM**: Sequelize (PostgreSQL)
- **Filas**: RabbitMQ (amqplib)
- **Real-time**: Socket.io
- **Monitoramento**: Sentry

## Estrutura de Diretórios
- `src/controllers`: Lógica de entrada/saída das requisições HTTP.
- `src/services`: Regras de negócio e acesso ao banco de dados.
- `src/routes`: Definição dos endpoints da API.
- `src/models`: Definição dos esquemas do banco de dados (Sequelize).
- `src/database`: Configuração e migrações do banco.
- `src/queues`: Processamento de tarefas em segundo plano (RabbitMQ).
- `src/helpers`: Funções utilitárias.

## Fluxo de Dados
1. **Requisição HTTP**: Chega via Express App (`app.ts`).
2. **Roteamento**: `routes/index.ts` direciona para o Controller específico.
3. **Controller**: Valida dados e chama o Service.
4. **Service**: Executa a regra de negócio, interage com o Banco de Dados ou Filas.
5. **Resposta**: Retorna JSON para o cliente.

## Integrações Externas
- **Engine WhatsApp**: Comunicação via HTTP e WebSocket para envio/recebimento de mensagens.
- **OpenAI/LangChain**: Integração para recursos de IA e fluxos inteligentes.
