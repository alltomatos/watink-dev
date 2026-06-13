# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator. Atualizado a cada transição de fase ou conclusão de tarefa.  
> **Última atualização**: 2026-06-12  
> **Branch**: `tinker/ui-and-di-refactor`  
> **Sessão**: Design System Gap Closure

---

## Contexto da Sessão

Análise completa do design system em `docs/desgner-system/` identificou gaps entre a especificação visual e a implementação real no frontend. Esta sessão fecha esses gaps de forma ordenada por risco.

---

## Fase Atual: 4 — Fragmentação e Delegação Estruturada

---

## DAG de Tarefas

### Legenda
- `done` ✅ — concluído
- `in_progress` 🔄 — em andamento
- `pending` ⏳ — aguardando
- `blocked` 🚫 — depende de outra tarefa

---

### Ações Imediatas (T1 — Auto-Aplicáveis, sem aprovação)

| ID | Tarefa | Status | Tier | Depende de |
|----|--------|--------|------|------------|
| T1-01 | Remover `/pages/MuralTvMode/` (diretório vazio) — Tarefa removida da sessão | ✅ done | T1 | — |
| T1-02 | Criar `ESTADO_ORQUESTRATOR.md` (este arquivo) | ✅ done | T1 | — |
| T1-03 | Criar ADR-002 frontend: Eliminação da duplicação MetricCard | ✅ done | T1 | — |
| T1-04 | Criar ADR-003 frontend: Dashboard migration strategy | ✅ done | T1 | — |
| T1-05 | Atualizar `ORCHESTRATOR-ROADMAP.md` com Epic 3 | ✅ done | T1 | — |
| T1-06 | Atualizar `CLAUDE.md` — seção Frontend Migration com novos itens | ✅ done | T1 | — |

# Estado do Orquestrador - Watink

## Épico Atual: Epic 3 - Migração Total Frontend

| Tarefa | Descrição | Status | Epic | Dependência |
|:---|:---|:---:|:---:|:---|
| T2-01 | Corrigir shadow token no `tailwind.config.js` | ✅ done | T2 | — |
| T2-02 | Adicionar shadcn/ui: `Select`, `Textarea`, `Badge`, `Tooltip` | ✅ done | T2 | — |
| T2-03 | Remover `/components/MetricCard/index.tsx` (diretório removido) | ✅ done | T2 | T2-04 |
| T2-04 | Redirecionar imports de MetricCard nas 3 páginas consumidoras | ✅ done | T2 | — |
| T2-05 | Migrar `pages/Dashboard/index.js` → Tailwind + shadcn/ui | ✅ done | T2 | T2-02 |
| T2-06 | Migrar `pages/Tickets/index.js` → layout 3 colunas | ✅ done | T2 | T2-02 |
| T2-07 | Migrar test do MetricCard para apontar para `ui/metric-card.tsx` | ✅ done | T2 | T2-03 |
| T2-08 | Migrar `TicketHistory` para Tailwind + shadcn/ui | ✅ done | T2 | — |
| T2-09 | Criar `PageLayout` primitivo (PageContainer, Header, Content) | ✅ done | T2 | — |
| T2-10 | Migrar `pages/Users/index.js` para usar `PageLayout` e `Table` shadcn | ✅ done | T2 | T2-09 |
| T3-01 | Migrar `MainLayout.js` e `MainListItems.js` (Sidebar/Nav) | ✅ done | T3 | T2-10 |
| T3-02 | Migrar `Login` e `Signup` para Tailwind/shadcn | ✅ done | T3 | — |
| T3-03 | Migrar `Contacts` para usar `PageLayout` e `Table` | ✅ done | T3 | T2-09 |
| T3-04 | Migrar `QuickAnswers` e `TagManager` | ✅ done | T3 | T2-09 |
| T3-05 | Migrar `Roles` e `Groups` | ✅ done | T3 | T2-09 |
| T3-06 | Migrar `Settings` e `UserProfile` | ✅ done | T3 | — |
| T3-07 | Migrar `Queues` e `Marketplace` | ✅ done | T3 | — |
| T3-08 | Migrar `Connections` e `Dashboard` (Cards) | ✅ done | T3 | — |
| T3-09 | Migrar `FlowBuilder` e `FlowManager` (Canvas/Layout) | ✅ done | T3 | — |
| T3-10 | Auditoria de Build e Correções Finais de Tipagem | ✅ done | T3 | — |
---

## Checkpoints de Sanidade

- [x] **CP-1**: Após T2-01 e T2-02 — build do frontend compila sem erro?
- [x] **CP-2**: Após T2-04 e T2-03 — nenhum import quebrado de MetricCard?
- [x] **CP-3**: Após T2-05 e T2-06 — layout visual confere com `2.png` e `3.png`?
- [x] **CP-4**: Final T2 — `npm run build` limpo, testes passando?
- [x] **CP-5**: T3 Structural — Sidebar e Login funcionam sem MUI?

- [x] **CP-1**: Após T2-01 e T2-02 — build do frontend compila sem erro?
- [x] **CP-2**: Após T2-04 e T2-03 — nenhum import quebrado de MetricCard?
- [x] **CP-3**: Após T2-05 e T2-06 — layout visual confere com `2.png` e `3.png`?
- [x] **CP-4**: Final — `npm run build` limpo, testes passando?

---

## Histórico de Ações

| Data | Ação | Tier | Resultado |
|------|------|------|-----------|
| 2026-06-13 | Realizada Auditoria e fix de imports globais de PaperCard no FlowBuilder | T1 | ✅ Sucesso |
| 2026-06-13 | Executada bateria de testes unitários do vitest e build com sucesso | T1 | ✅ Sucesso |
| 2026-06-12 | Removido `/pages/MuralTvMode/` (diretório vazio) — Tarefa removida da sessão | T1 | ✅ Sucesso |
| 2026-06-12 | Criado `ESTADO_ORQUESTRATOR.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Criado `docs/adr/frontend/002-metric-card-deduplication.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Criado `docs/adr/frontend/003-dashboard-migration-tailwind.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Atualizado `ORCHESTRATOR-ROADMAP.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Atualizado `CLAUDE.md` — seção Frontend Migration | T1 | ✅ Sucesso |
### Status da Sessão de Migração
- Épica 1: Dashboard e Tickets migradas com sucesso.
- Pendências: Refatorar componentes MUI restantes (MainLayout, TicketHistory) em próxima Epic.
