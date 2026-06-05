# Multitenancy via PostgreSQL RLS + JWT

Isolamento de dados entre Tenants implementado por Row-Level Security policies no PostgreSQL, ativadas por `SET app.current_tenant = ?` injetado per-request via JWT `tenantId`. Alternativa considerada: schema-per-tenant (rejeitada por overhead de migration e connection pooling). Consequência: toda query deve incluir `tenantId`; migrations devem chamar `applyRLS()` para novas tabelas; RLS bypass em superuser requer atenção em scripts administrativos.

Status: accepted
