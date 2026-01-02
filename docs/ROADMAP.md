# Roadmap do Projeto Watink

Este documento rastreia as fases planejadas e pendentes para a evolução da arquitetura do projeto.

## Status Atual: Fases 1, 2 e 3 Concluídas.
As implementações de SaaS (DB), Microserviços (Engine) e Frontend (Admin) foram finalizadas.

## Fases Pendentes

### Fase 4: DevOps, Infraestrutura e Deploy
- [ ] **[OPS-003] Pipelines de CI/CD**: Automatizar testes e build no GitHub Actions/GitLab CI.
- [ ] **[OPS-004] Procedimentos de Rollback e Monitoramento**: Painel Grafana/Prometheus e scripts de reversão rápida.

### Fase 5: Flow Engine Scalability (Novo)
Objetivo: Desacoplar a execução de fluxos do Backend principal.
- [ ] **[FLOW-001] Event-Driven Architecture**: Refatorar `wbotMessageListener` para publicar eventos de fluxo no RabbitMQ ao invés de executar síncrono.
- [ ] **[FLOW-002] Flow Worker Service**: Criar microserviço dedicado (`flow-engine-worker`) para processar a fila de fluxos.
- [ ] **[FLOW-003] Redis State Cache**: Implementar cache de sessões ativas no Redis para reduzir load no Postgres.
