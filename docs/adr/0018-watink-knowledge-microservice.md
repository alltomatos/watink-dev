# ADR 0018 — Microsserviço `watink-knowledge` (RAG) e fronteira de confiança interna

**Status:** Accepted  
**Data:** 2026-06-28

## Contexto
A Base de Conhecimento evoluiu de um nó RAG simples para um sistema de ingestão + retrieval robusto: múltiplos tipos de fonte (texto, arquivo, URL/site, git), scraping web, parsing de PDF/docx, chunking, embedding e um Agent Runtime (loop LLM com guardrails). Esse trabalho é IO/CPU-pesado, bursty, com dependências (parsers, scrapers, ML) estranhas ao `business` (Go/Gin). Colocá-lo dentro do `business` acoplaria a API a um workload pesado e a um ecossistema (parsing/RAG) onde Go é fraco — extração de texto de PDF em Go é incompleta e o ecossistema de agente (`langchaingo`) é imaturo.

O Watink já é uma arquitetura de microsserviços (business, engine-go, plugin-manager, marketplace-hub) com RabbitMQ + PostgreSQL RLS, e o devops do time tem um catálogo maduro de serviços-como-stack Swarm/Traefik/Redis (incl. Firecrawl, browserless, e plataformas Python como Dify/Flowise).

## Decisão
Extrair a Base de Conhecimento para um **microsserviço dedicado `watink-knowledge` (Python/FastAPI)**, no mesmo molde Swarm/Traefik/Redis dos demais serviços.

- **Boundary:** `watink-knowledge` é dono de ingestão, KBChunks, retrieval e Agent Runtime. O `business` mantém o CRUD leve de bases/fontes + UI + orquestração de FlowRun.
- **Stateless por chamada:** o estado (FlowRun, turn-taking, suspend/resume) **fica no `business`**. O serviço Python responde "dada query/histórico → chunks/ação", sem manter sessão. Aproveita a força de cada stack (Go = orquestração stateful; Python = parsing/RAG).
- **Comunicação:** AMQP para ingestão assíncrona (`knowledge.<tenant>.ingest`) + eventos de status; HTTP interno para retrieval/agent (caminho síncrono da conversa).
- **Mesmo PostgreSQL:** os KBChunks ficam no banco Watink (co-localizados com dados do tenant), não num banco separado.
- **Trust boundary:** o `business` é o **único gateway**. O `watink-knowledge` só existe na rede interna do Swarm, autenticado por **segredo interno compartilhado** (`X-Internal-Token`); o frontend nunca o alcança. RLS é **inerte** no serviço → todo acesso carrega `WHERE "tenantId" = ?` manual + escopo `knowledgeBaseId`.

## Alternativas consideradas
- **Construir tudo dentro do `business` (Go):** zero polyglot, mas parsing de PDF/docx em Go é fraco (shell-out inevitável) e o ecossistema de agente/RAG é imaturo. Acopla API leve a workload pesado.
- **Embrulhar plataforma RAG existente (AnythingLLM/Dify/Flowise):** RAG rápido, mas briga com a multitenancy por-tenant via RLS e com o contrato dos nós; vira refém do modelo da plataforma.
- **Banco de vetores separado para o serviço:** rompe a co-localização com dados do tenant e o RLS; sincronização extra. pgvector no mesmo Postgres basta.
- **Expor o serviço Python com auth de tenant (JWT) próprio:** duplica a lógica de auth do `business`. Mantido como endurecimento opcional de Fase 2 (defesa em profundidade), não no MVP.

## Consequências
- **Stacks alinhadas à força:** Go orquestra estado; Python faz parsing/embedding/agente com ecossistema maduro. O custo de polyglot já é realidade (Dify/Flowise são Python no devops).
- **Escala independente:** ingestão pesada não afeta a latência da API.
- **Fronteira a respeitar:** scraping (Firecrawl/browserless) e parsing/embedding ficam no `watink-knowledge`; o `business`/engine-go não os hospedam. O frontend fala só com o `business`.
- **Isolamento é responsabilidade do serviço:** `WHERE tenantId` manual é item obrigatório de review/teste (RLS não cobre o serviço).
- **Networking:** o serviço precisa alcançar omniroute, Firecrawl, S3 e o Postgres por nomes internos do Swarm (não `localhost`).
