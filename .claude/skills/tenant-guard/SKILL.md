---
name: tenant-guard
description: Audit Watink backend Go code for multitenancy leaks, missing tenantId filters, unsafe destructive operations, and RLS defense-in-depth gaps. Use before changing controllers/services that touch tenant-owned data.
---

# Watink Tenant Guard

Read-only multitenancy audit for Watink backend code.

## When to use

Use this skill before or during changes to:

- `business/internal/controllers/**/*.go`
- `business/internal/services/**/*.go`
- GORM queries touching tenant-owned tables
- destructive operations (`Delete`, `Update`, raw `Exec`, association cleanup)
- RabbitMQ handlers/events that update tenant-scoped records

## Core rule

RLS is the last barrier, not the only barrier. Application code should still filter tenant-owned data by `tenantId` wherever the tenant is known.

## Audit command

```bash
node .claude/skills/tenant-guard/tenant-guard.mjs
```

Optional path scope:

```bash
node .claude/skills/tenant-guard/tenant-guard.mjs business/internal/controllers/whatsapp.go
node .claude/skills/tenant-guard/tenant-guard.mjs business/internal/controllers business/internal/services
```

## What it flags

- GORM `Where(...)` clauses in controllers/services that reference tenant-owned models but do not include `tenantId`.
- Raw SQL `Exec(...)` calls that mutate tenant-owned association tables without tenant scoping or a documented safe reason.
- Destructive operations (`Delete`, bulk `Update`) without visible tenant filter in nearby query chain.
- Code paths that read tenant from context but do not apply it to DB access.

## Output severity

- `HIGH`: delete/update/read of tenant-owned data likely missing tenant filter.
- `MEDIUM`: raw SQL or indirect association cleanup that needs manual review.
- `LOW`: tenant context present but not obviously propagated.

## Manual review checklist

1. Identify the model/table.
2. Confirm whether it is tenant-owned.
3. Confirm `tenantId` is filtered explicitly when possible.
4. Confirm DB RLS policy still protects the table.
5. Confirm indexes support the tenant-filtered query shape.
