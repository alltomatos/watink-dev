# ABAC via RolePermission with JSONB Scope

Controle de acesso baseado em atributos (ABAC) implementado via tabela `RolePermissions` com colunas `Scope` e `Conditions` do tipo JSONB, permitindo regras contextuais por Tenant. Alternativa considerada: RBAC puro sem escopo (rejeitado por impossibilidade de modelar permissões como "gerente apenas da fila X"). Consequência: avaliação de permissão requer desserialização JSONB; índice GIN necessário em `Scope`/`Conditions` para performance; migração de roles existentes requer script de conversão.

Status: accepted
