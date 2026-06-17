# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator. Atualizado a cada transição de fase ou conclusão de tarefa.  
> **Última atualização**: 2026-06-13  
> **Branch**: `tinker/ui-and-di-refactor`  
> **Sessão**: Epic 3 — DS v2 Workflow Planning

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
| 2026-06-13 | Análise completa DS v2: 7 docs, 22 componentes ui/, 163 JS legados mapeados | T1 | ✅ Sucesso |
| 2026-06-13 | Criado `.claude/plans/frontend-ds-v2-workflow.md` (plano mestre Epic 3) | T1 | ✅ Sucesso |
| 2026-06-13 | Atualizado `ORCHESTRATOR-ROADMAP.md` com Epic 3 + M5–M10 | T1 | ✅ Sucesso |
| 2026-06-13 | Criados `.claude/config.json` e `.claude/context7.json` (Fase 0) | T1 | ✅ Sucesso |
| 2026-06-13 | Consolidado build frontend: resolvidos erros de RLS no backend, limpo duplicatas .js, corrigido index.html e PageLayout exports | T1 | ✅ Sucesso |
| 2026-06-13 | Realizada Auditoria e fix de imports globais de PaperCard no FlowBuilder | T1 | ✅ Sucesso |
| 2026-06-13 | Executada bateria de testes unitários do vitest e build com sucesso | T1 | ✅ Sucesso |
| 2026-06-12 | Removido `/pages/MuralTvMode/` (diretório vazio) | T1 | ✅ Sucesso |
| 2026-06-12 | Criado `ESTADO_ORQUESTRATOR.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Criado `docs/adr/frontend/002-metric-card-deduplication.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Criado `docs/adr/frontend/003-dashboard-migration-tailwind.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Atualizado `ORCHESTRATOR-ROADMAP.md` | T1 | ✅ Sucesso |
| 2026-06-12 | Atualizado `CLAUDE.md` — seção Frontend Migration | T1 | ✅ Sucesso |

---

## Epic 3 — Próximas Tarefas (DAG Ativo)

### Epic 4A — Token Format (CONCLUÍDA ✅)
- [x] 4A-01 | `tokens/colors.css` — primitivas + fallbacks semânticos apple-light (HSL raw) | ✅
- [x] 4A-02 | `tokens/typography.css` — font families, sizes, weights, line-heights | ✅
- [x] 4A-03 | `tokens/spacing.css` — spacing, radius, estrutura de componentes | ✅
- [x] 4A-04 | `tokens/motion.css` — durations, easings, transition shorthands | ✅
- [x] 4A-05 | `index.css` — duplicações removidas, Google Fonts movido para 1º @import | ✅
- [x] 4A-06 | `TicketsList.tsx` — import path corrigido (preexistente, detectado no build) | ✅
- [x] Build `npm run build` — ✓ 10894 modules, 0 errors, 20.61s | ✅

### Epic 4C — Doc Sync DS v2 (CONCLUÍDA ✅)
- [x] 4C-01 | ds-improvement-plan.md: todas as 10 tasks concluídas | ✅
- [x] 4C-02 | ADR-005 expandido (tokens, temas, proibições, estrutura) | ✅
- [x] 4C-03 | CONTEXT.md + readme.md do desgner-system atualizados | ✅
- [x] 4C-04 | `.tsx` já presentes; Button.prompt.md + Avatar.prompt.md atualizados | ✅
- [x] 4C-05 | `_ds_manifest.json` → `.tsx`, StatusChip adicionado | ✅
- [x] 4C-06 | `tokens/themes.md` criado (4 famílias × 2 modos) | ✅ (novo)
- [x] 4C-07 | `guidelines/accessibility.md` criado (WCAG AA + Radix) | ✅ (novo)

### Epic 4B — Componentes (APÓS 4A)
- [x] 4B-G1 | Atoms (6 componentes) — ✅ 2026-06-13 | build ✓ 18.17s, 0 MUI imports
  - ButtonWithSpinner, Title, SplashScreen, TableRowSkeleton, TicketsListSkeleton, NavButton
- [x] 4B-G2 | Modais/Overlays (10 componentes) — ✅ 2026-06-13 | 0 MUI imports
- [x] 4B-G3 | Selects/Filtros (4 componentes) — ✅ 2026-06-13 | 0 MUI imports
- [x] 4B-G4 | Ticket Ecosystem (8 componentes) — ✅ 2026-06-13 | 0 MUI imports, worktree isolado
- [x] 4B-G5 | Chat/Mensagens (7 componentes) — ✅ 2026-06-13 | 0 MUI imports
- [x] 4B-G6 | Contacts/Layout (9 componentes) — ✅ 2026-06-13 | 0 MUI imports
### Epic 4D — Páginas e Modais de Negócio (AGUARDANDO G4)

> Estratégia: O componente principal de cada página deve usar `PageLayout`. Tabs viram `@/components/ui/tabs`. Formulários usam componentes da pasta `ui/` migrados na Epic 4B.

- [x] **4D-P1 | FlowBuilder (22 arquivos)** — ✅ `CustomNodes/*`, `components/*`, sidebars e modais
- [x] **4D-P2 | Helpdesk (7 arquivos)** — ✅ Kanban, Reports, TvMode, Protocol details/drawer/modal
- [x] **4D-P3 | Pipelines (8 arquivos)** — ✅ Board, Kanban, Gantt, KPIs, Funnel, Wizard
- [ ] **4D-P4 | KnowledgeBase & MyActivities (6 arquivos)** — KB configs, Activities execution/signature
- [x] **4D-P5-PARTIAL | Clients, Groups, Billing, MonitorQueues (6 arquivos)** — ✅ 2026-06-14 | build ✓ 24.23s, GroupModal.js MUI deletado, GroupModal.tsx bug fix (edit preenche nome + Field conectado ao Formik)
- [x] **4D-P5-REMAINING | Roles, Tenants, Users, Connections, SaaS (5 arquivos)** — ✅ 2026-06-14 | build ✓ 21.24s, 0 MUI imports; Tenants.js→tsx reescrito, Users.jsx→tsx limpo (makeStyles/MUI removidos), SaaS wrapped em PageLayout
- [x] **4D-P6 | Marketplace & Auth (Settings, PublicProtocol, Swagger, ResetPassword, MonitorQueues)** — ✅ todos já em TSX; páginas migradas
- [x] **4D-P7 | MUI Residual — 10 arquivos migrados** — ✅ 2026-06-15 | build ✓ 11.13s, material-ui chunk ELIMINADO do bundle (-189 kB gzip -56 kB)
- [x] **4D-P8 | JS→TSX Residual** — ✅ 2026-06-16 | build ✓ 10.83s
  - config.js → config.ts (tipagem Window.ENV + retornos string|null)
  - theme/tokens/\*.js → .ts (primitives, semantic, components, typography)
  - theme/index.js → index.ts
  - translate/i18n.js + languages/\*.js → .ts (jsxImportSource removido)
  - Dashboard/Widgets/\*.js/jsx → .tsx (AttendanceChart, PerformanceMetrics, TicketsInfo)
  - setupTests.js → setupTests.ts
  - Residual intencional: bridge.js + loader.js (removidos na Epic 4F)

### Epic 4E — Qualidade/Lint (2026-06-16)
- [x] **E1** | ESLint expandido para `.ts`/`.tsx` — 200+ arquivos agora fiscalizados
- [x] **E2** | `typescript@5.9.3` + `@typescript-eslint` instalados como devDeps — `npm run typecheck` habilitado
- [x] **E3/E4** | Overrides ESLint: bridge.js + loader.js + DarkMode isentos de `no-restricted-imports`
- [x] **4D-P8 → lint** | 149 → 30 `no-unused-vars` (imports mortos removidos nos 40 arquivos)
- [x] **Triviais** | 4 `no-empty-object-type` (interface→type), `ban-ts-comment` (@ts-ignore→@ts-expect-error), rule fantasma `@next/next` suprimida
- [x] **E5** | 30 `no-unused-vars` → 0 — prefixo `_`, bare catch, remoção de declarações mortas | ✅
- [x] **E7** | 66 `no-hardcoded-colors` → 0 — hex/hsl substituídos por `var(--token)`, bridge vars adicionadas em index.css | ✅
- [ ] **E6** | 70 `no-explicit-any` — domain types em `src/types/` | **PENDENTE (sessão dedicada)**
- Baseline: 298 erros → **70 erros** (-77%) | Apenas `any` residuais | Build ✓ 14.71s

### Epic 4F — Remoção Final MUI v4 ✅ (2026-06-16)
- [x] `DarkMode/index.tsx` — removidos `MUIThemeProvider`, `createMuiThemeBridge`, `locale` state, `setLocaleByKey`; provider simplificado para CSS vars puro
- [x] `theme/bridge.js` — arquivo deletado
- [x] `theme/index.ts` — re-export de `createMuiThemeBridge` removido
- [x] `npm uninstall @material-ui/core @material-ui/icons @material-ui/lab` — 0 pacotes MUI em deps
- [x] ESLint override de isenção do bridge removido
- [x] Zero imports `@material-ui/*` em `src/` | Build ✓ 14.84s | Lint: 70 erros (apenas `no-explicit-any`)

### T1s Executados (2026-06-16)
- [x] **T-A1** | `Audio/index.jsx` → `.tsx` — Button MUI substituído por shadcn Button | ✅ build ✓ 14.04s
- [x] **T-A3** | `AdminDashboard/index.js` → `.tsx` — migrado para PageLayout | ✅
- [x] **T-A4** | `PaperCard/index.js` → `.tsx` — tipagem de props adicionada | ✅
- MUI restante: apenas `bridge.js` + `DarkMode/index.tsx` (intencionais — removidos na Epic 4F)
