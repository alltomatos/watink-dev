# ABAC via RolePermission with JSONB Scope

> **Superseded by [ADR 0022](0022-acessos-cargo-setor-alcance.md).** Auditoria de
> jun/2026 confirmou que a avaliação de `Scope`/`Conditions` descrita abaixo
> **nunca foi implementada** — `RolePermission` existia no schema (com o índice
> GIN nunca criado) mas nenhum código lia esses campos em runtime. O ADR 0022
> resolve o caso de uso original ("gerente apenas do setor X") com a dimensão
> **Alcance**, sem JSONB nem avaliação condicional. Mantido abaixo como registro
> histórico da decisão original.

Controle de acesso baseado em atributos (ABAC) implementado via tabela `RolePermissions` com colunas `Scope` e `Conditions` do tipo JSONB, permitindo regras contextuais por Tenant. Alternativa considerada: RBAC puro sem escopo (rejeitado por impossibilidade de modelar permissões como "gerente apenas da fila X"). Consequência: avaliação de permissão requer desserialização JSONB; índice GIN necessário em `Scope`/`Conditions` para performance; migração de roles existentes requer script de conversão.

Status: superseded
