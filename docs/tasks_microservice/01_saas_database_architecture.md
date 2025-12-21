# Fase 1: Arquitetura de Banco de Dados SaaS

Esta fase foca em preparar a camada de dados para suportar múltiplos clientes (tenants) de forma segura, isolada e escalável.

## Estratégia Adotada: Isolamento Lógico com RLS (Row Level Security)
Para o MVP e migração suave, utilizaremos um banco PostgreSQL único com Row Level Security. Para clientes Enterprise, a arquitetura permitirá "Schema per Tenant" no futuro.

---

## Tasks

### [DB-001] Design da Estrutura Multi-tenant
**Objetivo:** Definir e documentar o modelo de dados para suportar multi-tenancy.
**Requisitos:**
- Adicionar coluna `tenant_id` (UUID) em todas as tabelas principais (`Tickets`, `Contacts`, `Messages`, `Queues`, etc.).
- Garantir que índices incluam `tenant_id` para performance.
- Mapear tabelas globais (ex: `Plans`, `SaaSAdmins`) vs tabelas de tenant.
**Critérios de Aceite:**
- Diagrama ER atualizado.
- Documento listando todas as tabelas que precisam de migração.
**Estimativa:** 4 horas

### [DB-002] Implementação de RLS (Row Level Security) no Postgres
**Objetivo:** Implementar políticas de segurança nativas do banco para impedir vazamento de dados.
**Requisitos:**
- Habilitar RLS nas tabelas sensíveis via migration.
- Criar políticas (`CREATE POLICY`) que validem o `current_setting('app.current_tenant')`.
- Criar usuário de banco de dados com permissões restritas (não superuser) para a aplicação.
**Critérios de Aceite:**
- Script SQL executado com sucesso.
- Teste: Tentar selecionar dados do Tenant A logado como Tenant B deve retornar 0 linhas (nível de banco, não apenas aplicação).
**Estimativa:** 16 horas

### [DB-003] Estratégia de Backup e Recuperação (PITR)
**Objetivo:** Configurar rotinas de backup que respeitem a criticidade do SaaS.
**Requisitos:**
- Configurar WAL Archiving no Postgres para Point-in-Time Recovery.
- Script de automação para dump diário separado por tenant (lógico) para facilitar restore individual.
- Documentar procedimento de "Disaster Recovery".
**Critérios de Aceite:**
- Backup automático rodando no ambiente de homologação.
- Teste de restore de um único tenant executado com sucesso sem afetar outros.
**Estimativa:** 8 horas

### [DB-004] Preparação para Escalabilidade Horizontal (Read Replicas)
**Objetivo:** Configurar a aplicação para separar leituras e escritas.
**Requisitos:**
- Configurar Sequelize/TypeORM para aceitar array de conexões (Master/Replica).
- Identificar queries pesadas (relatórios) e forçar uso da réplica.
**Critérios de Aceite:**
- Aplicação rodando conectada a uma instância Master e uma Read Replica (simulada via Docker).
**Estimativa:** 6 horas
