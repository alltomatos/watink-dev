# Roadmap do Projeto

## Epics (Visão Estratégica)
- [x] Epic 1: Transição do Sistema de Design (MUI v4 -> Tailwind + shadcn/ui) | Status: Concluída
- [ ] Epic 2: Refatoração da Injeção de Dependências e Organização de Pastas | Status: Pendente
- [ ] Epic 3: Migração Total Frontend (DS v2 — 163 arquivos JS → TSX, remoção MUI) | Status: Em Andamento
  - Workflow: `.claude/plans/frontend-ds-v2-workflow.md`
  - Sub-épicas: 4A (tokens) → 4B (componentes) → 4C (docs) → 4D (páginas) → 4E (qualidade) → 4F (remoção MUI)

## Milestones (Entregas Técnicas)
- [x] M1: Análise e Auditoria de docs/desgner-system e PDF do Guia | Epic: [1] | Status: Concluído
- [x] M2: Alinhamento de Terminologia (CONTEXT.md) e Regras de Componentes | Epic: [1] | Status: Concluído
- [x] M3: Substituição de Componentes Customizados Legados (BaseCard, MetricCard, StatusChip, PageLayout) | Epic: [1] | Status: Concluído
- [x] M4: Migração Estrutural (MainLayout, Dashboard, Tickets, Contacts, Users, FlowBuilder canvas) | Epic: [3] | Status: Concluído
- [ ] M5: Token Format Migration (JS → CSS Custom Properties) | Epic: [3] | Status: Pendente
- [x] M6: Migração 46 Componentes Compartilhados MUI → shadcn+TSX | Epic: [3] | Status: Concluído
- [ ] M7: Sync Documentação Design System v2 | Epic: [3] | Status: Pendente
- [ ] M8: Migração 66 Páginas/Modais MUI → shadcn+TSX | Epic: [3] | Status: Pendente
- [ ] M9: Storybook + A11y + Visual Regression CI | Epic: [3] | Status: Pendente
- [x] M10: Remoção Final MUI v4 (npm uninstall + zero imports) | Epic: [3] | Status: Concluído 2026-06-16

## Histórico de Decisões
- 2026-06-12 - Inicialização: Análise detalhada das diretrizes visuais e infraestrutura de componentes sob docs/desgner-system na branch tinker/ui-and-di-refactor.
- 2026-06-13 - Epic 3 aberta: 163 arquivos JS legados identificados, 46 componentes + 66 páginas com MUI. Workflow documentado em `.claude/plans/frontend-ds-v2-workflow.md`.
- 2026-06-13 - DS v2 analisado: `docs/Watink Design System v2/` contém 7 documentos ativos (AI_AGENT_INSTRUCTIONS, FRONTEND_ARCHITECTURE, DESIGN_SYSTEM_GUIDE, IMPLEMENTATION_ROADMAP, DOCUMENTATION_INDEX, SUMARIO_ENTREGA, ATUALIZACAO_16JUN_2026). Tokens em `.js` precisam migrar para `.css`.
