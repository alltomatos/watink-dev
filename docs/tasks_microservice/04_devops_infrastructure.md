# Fase 4: DevOps, Infraestrutura e Deploy

Garantir que o sistema distribuído possa ser implantado, escalado e revertido com segurança.

---

## Tasks

### [OPS-001] Containerização e Orquestração (Docker Swarm/K8s)
**Objetivo:** Criar arquivos de definição para orquestração.
**Requisitos:**
- Criar `docker-compose.prod.yaml` separado por serviços.
- Configurar limites de recursos (CPU/Memory limits) para evitar que um Engine derrube o nó.
- Configurar Healthchecks reais (não apenas "processo rodando", mas "conectado no Rabbit").
**Critérios de Aceite:**
- Comando único (`docker stack deploy`) sobe todo o ecossistema.
- Se matar o container do Engine, o orquestrador sobe outro automaticamente.
**Estimativa:** 12 horas

### [OPS-002] Configuração do API Gateway (Traefik/Nginx)
**Objetivo:** Ponto único de entrada e roteamento.
**Requisitos:**
- Configurar Roteamento Baseado em Host (para subdomínios `*.meusaas.com`).
- Configurar terminação SSL (Let's Encrypt automático).
- Configurar Rate Limiting por IP e por Tenant.
**Critérios de Aceite:**
- Acesso a `api.meusaas.com` vai para o Core.
- Acesso a `ws.meusaas.com` vai para o Notification Service.
- Bloqueio automático de IP após 100 requests/segundo.
**Estimativa:** 8 horas

### [OPS-003] Pipelines de CI/CD (GitHub Actions/GitLab CI)
**Objetivo:** Automação de testes e deploy.
**Requisitos:**
- Pipeline de Build: Construir imagens Docker de cada serviço.
- Pipeline de Teste: Rodar testes unitários e de integração (com banco temporário).
- Pipeline de Deploy: Push para Registry e update no Cluster.
**Critérios de Aceite:**
- Commit na `main` gera nova imagem com tag `sha-xyz`.
- Deploy manual acionado via botão atualiza o ambiente de staging.
**Estimativa:** 16 horas

### [OPS-004] Procedimentos de Rollback e Monitoramento
**Objetivo:** Garantir observabilidade e recuperação rápida.
**Requisitos:**
- Configurar Prometheus + Grafana para métricas (RabbitMQ, Node, Postgres).
- Centralizar logs (ELK Stack ou Loki).
- Documentar comando para reverter versão (`docker service update --rollback`).
**Critérios de Aceite:**
- Dashboard do Grafana mostra gráfico de "Mensagens por Segundo".
- Simulação de deploy falho aciona rollback automático (se configurado) ou manual documentado.
**Estimativa:** 12 horas
