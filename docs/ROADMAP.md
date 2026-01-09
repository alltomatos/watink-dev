# Roadmap do Projeto Watink

Este documento rastreia as fases planejadas e pendentes para a evolução da arquitetura do projeto.

## Status Atual: Fases 1, 2 e 3 Concluídas.
As implementações de SaaS (DB), Microserviços (Engine) e Frontend (Admin) foram finalizadas.

## Fases Pendentes

### Fase 4: DevOps, Infraestrutura e Deploy
- [ ] **[OPS-003] Pipelines de CI/CD**: Automatizar testes e build no GitHub Actions/GitLab CI.
- [ ] **[OPS-004] Procedimentos de Rollback e Monitoramento**: Painel Grafana/Prometheus e scripts de reversão rápida.

### Fase 5: Flow Engine Scalability (Novo)
Objetivo: Desacoplar a execução de fluxos do Backend principal e garantir performance.
- [x] **[FLOW-001] Event-Driven Architecture**: Refatorado `wbotMessageListener` para publicar eventos de fluxo no RabbitMQ.
- [x] **[FLOW-002] Flow Worker Service**: Microserviço dedicado (`flow-engine-worker`) operacional.
- [x] **[FLOW-003] Redis Transient Store & Cache**: Implementado Redis para armazenamento de retentativas (Transient Store) e infraestrutura para cache de sessões.
