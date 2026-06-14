---
name: adr-006-tickets-architecture
description: Define a nova arquitetura para a gestão de tickets, integrando persistência RLS e mensageria async.
---

# ADR-006: Arquitetura do Sistema de Tickets

## Contexto
O sistema de tickets do Watink precisa evoluir para suportar escalabilidade, multitenancy rigoroso (PostgreSQL RLS) e comunicação assíncrona robusta com o Engine (RabbitMQ). O modelo legado sofria de alto acoplamento e dependência de estados de socket locais e instáveis.

## Decisões
1. **Source of Truth via TanStack Query**: O frontend utilizará `TanStack Query` para cache de estado de tickets, garantindo que o estado de "aberto/pendente/resolvido" seja sempre sincronizado com o servidor.
2. **Eventos via Sockets (Event-Driven)**: Eventos de socket serão usados estritamente como *invalidadores de cache* (invalidação de query key `tickets`), não como fonte de dados completa.
3. **Multitenancy**: Todas as chamadas de tickets devem injetar o `tenantId` via contexto da API (`axios` interceptor), garantindo que a política RLS do PostgreSQL processe corretamente a isolação.
4. **Encapsulamento de Mensageria**: A lógica de `wbot` (inbound/outbound) será tratada via RabbitMQ, com o Backend (Go) atuando como orquestrador e o Frontend consumindo via API REST ou Socket.

## Consequências
- Redução de colisões de estado de UI.
- Garantia de isolamento de dados por Tenant.
- Maior resiliência contra reconexões de socket, pois o estado é recuperável via Query Cache.

**Por que:** Para garantir escalabilidade em ambiente SaaS multitenant.
**Como aplicar:** Utilizar `useTicketsQuery` para listas e `api.get/put` para mutações, seguindo o padrão de cache do TanStack Query.
