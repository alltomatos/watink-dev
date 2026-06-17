# Roadmap do Projeto

## Epics (Visão Estratégica)

- [x] **Epic 1**: Transição do Sistema de Design (MUI v4 → Tailwind + shadcn/ui) | ✅ Concluída
- [x] **Epic 3**: Migração Total Frontend (163 JS/JSX → TSX, remoção MUI, design tokens, lint) | ✅ Concluída jun/2026
- [ ] **Epic 2**: Refatoração DI & organização de pacotes (Backend Go) | 🔜 Próximo
- [ ] **Epic 4**: Qualidade residual — 70 `no-explicit-any` no frontend | Pendente

## Milestones

| ID | Descrição | Status |
|---|---|---|
| M1 | Auditoria do Design System | ✅ |
| M2 | Alinhamento de terminologia (CONTEXT.md) | ✅ |
| M3 | Substituição de componentes legados (BaseCard, MetricCard, StatusChip, PageLayout) | ✅ |
| M4 | Migração estrutural (MainLayout, Dashboard, Tickets, Contacts, FlowBuilder) | ✅ |
| M5 | Token Format Migration (JS → CSS Custom Properties + HSL cru) | ✅ |
| M6 | Migração 46 componentes compartilhados MUI → shadcn+TSX | ✅ |
| M7 | Sync Documentação Design System | ✅ |
| M8 | Migração 66+ páginas/modais MUI → shadcn+TSX | ✅ |
| M9 | Storybook + A11y + Visual Regression CI | ⏳ Pendente |
| M10 | Remoção final MUI v4 (npm uninstall + zero imports) | ✅ jun/2026 |
| M11 | ESLint governance — 298 → 70 erros (-77%) | ✅ jun/2026 |
| M12 | Docs cleanup — CLAUDE.md, docs/dev/, docs/ legado | ✅ jun/2026 |

## Próximo Epic — Backend Go DI & Packages

**Branch**: `refactor/backend-di-packages`

Objetivos:
- Garantir DI pura em todos os controllers e services (`business/`)
- Separar camadas: `domain/`, `application/`, `infrastructure/`
- Definir interfaces explícitas entre `business/` e `engine-go/`
- Cobrir endpoints críticos com testes de integração (`httptest`)

## Histórico de Decisões

| Data | Decisão |
|---|---|
| jun/2026 | Nova nomenclatura de branches baseada em Conventional Commits (feat/, fix/, refactor/, chore/, docs/, hotfix/) |
| jun/2026 | docs/dev/ recriado — removido conteúdo Docker Swarm legacy e referências a agentes obsoletos |
| jun/2026 | Epic 3 concluída: MUI v4 removido, 163 arquivos migrados para TSX, design token system 3 camadas |
| jun/2026 | CLAUDE.md reduzido com ponteiros para docs/ especializados |
| 2026-06-16 | Epic 4F: npm uninstall @material-ui/* — zero imports MUI em src/ |
| 2026-06-16 | Epic 4E: ESLint expandido, typescript@5.9.3, 298 → 70 erros |
| 2026-06-14 | Epic 4D: todas as páginas e modais migrados para shadcn/ui + TSX |
| 2026-06-13 | Epic 4B: 46 componentes compartilhados migrados |
| 2026-06-13 | Epic 4A: tokens migrados para CSS Custom Properties em HSL cru |
