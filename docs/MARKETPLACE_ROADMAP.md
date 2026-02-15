# Roadmap Marketplace Watink

Este documento detalha o planejamento comercial e técnico para a implementação do Marketplace do Watink, integrado ao Mercado Pago.

## 1. Modelo Comercial (Billing)

O marketplace operará sob um modelo de assinaturas e pacotes, processados via **Mercado Pago**.

| Pacote | Limite de Plugins | Preço (Mensal) | Observações |
| :--- | :--- | :--- | :--- |
| **Start** | Até 4 plugins | R$ 49,99 | Seleção flexível |
| **Pro** | Até 6 plugins | R$ 99,99 | Seleção flexível |
| **SaaS** | Avulso | R$ 199,99 | Plugin de gestão SaaS (em criação) |

---

## 2. Diagnóstico Técnico Atual (Auditoria Fev/2026)

Baseado na análise dos especialistas:

### Gaps Críticos (P0)
- **Plugin Manager:** Atualmente opera em modo *mock* (memória). Precisa de persistência real no DB e endpoints de ciclo de vida (`install`, `activate`, `deactivate`) integrados ao licenciamento por Tenant.
- **Webchat:** Quase funcional, mas as rotas não estão montadas no backend principal e falta autenticação por token de sessão/ticket.
- **WhatsMeow:** Atualmente é apenas metadado no catálogo; não existe engine Go operacional implementada.
- **Security:** O controle de "plugin ativo" é feito majoritariamente no frontend. O backend precisa de guards que bloqueiem rotas/serviços se o plugin não estiver licenciado para o Tenant.

### Maturidade dos Plugins
- **Helpdesk (Suporte):** Alta maturidade funcional, mas precisa de hardening em uploads e RBAC mais rigoroso.
- **Clientes:** Funcional, porém requer transações de banco em operações complexas.
- **SMTP:** Baixa maturidade; precisa implementar o consumer real da fila e lógica de envio com retry/DLQ.
- **Papi:** Lacuna de implementação identificada (drift entre src/dist).

---

## 3. Planejamento de Execução

### Fase 1: Infraestrutura de Billing & Segurança (7-10 dias)
- Implementar tabelas `Subscriptions` e `Licenses` vinculadas ao `Tenant`.
- Criar Webhook para integração com **Mercado Pago**.
- Transformar Plugin Manager de *mock* para *serviço real* com persistência.
- Registrar rotas do Webchat e aplicar hardening de segurança.

### Fase 2: Enforcement & Marketplace UI (15-20 dias)
- Implementar Middleware de licenciamento no Backend (bloqueia rotas de plugins inativos).
- Criar tela de checkout e vitrine de planos no Frontend.
- Resolver duplicações de código entre `core` e `dist_plugins`.

### Fase 3: Novos Módulos & WhatsMeow (30+ dias)
- Desenvolvimento do **Plugin SaaS** (R$ 199,99).
- Implementação do MVP do motor **WhatsMeow** (Go engine).
- Observabilidade completa (métricas de uso por plugin/tenant).
