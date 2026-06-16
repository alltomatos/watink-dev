# Plano de Workflow: Design System v2 — Migração Frontend Watink

**Criado**: 2026-06-13  
**Atualizado**: 2026-06-13  
**Branch**: `tinker/ui-and-di-refactor`  
**Status**: ATIVO — Em Execução  
**Referência DS**: `docs/Watink Design System v2/`

---

## 1. Contexto e Diagnóstico

### Estado Atual (2026-06-13)

| Métrica | Valor | Meta |
|---------|-------|------|
| Arquivos `.js` legados | **163** | 0 |
| Arquivos `.tsx` modernos | **71** | 234+ |
| Componentes com MUI (components/) | **46** | 0 |
| Páginas com MUI (pages/) | **66** | 0 |
| Componentes ui/ shadcn prontos | **22** | 30+ |
| Hardcoded colors em `ui/` | **0** | 0 ✅ |
| Tokens CSS (format) | **JS** | CSS |

### O Que Foi Feito (Epics 1–3)
- ✅ React 18 + TypeScript + Tailwind v4 + shadcn/ui inicializado
- ✅ Sistema de tokens 3 camadas (primitives, semantic, components)
- ✅ `PageLayout`, `MetricCard`, `StatusChip`, `Avatar`, `Button`, `Card` migrados
- ✅ MainLayout + Sidebar migrados (sem MUI)
- ✅ Dashboard, Tickets, Contacts, Users, FlowBuilder (canvas/layout) migrados
- ✅ Build compila limpo; testes Vitest passando

### O Que Falta (Epic 4 — Este Workflow)
- ❌ 46 componentes compartilhados ainda em MUI v4 + JS
- ❌ 66 arquivos de páginas ainda em MUI v4 + JS
- ❌ Tokens em formato `.js` (devem ser `.css` para Tailwind @theme)
- ❌ Storybook / visual regression ausente
- ❌ `docs/desgner-system/` não sincronizado com `docs/Watink Design System v2/`

---

## 2. Mapa de Trabalho — DAG de Épicas

```
[Epic 4A: Token Format]
        ↓
[Epic 4B: Componentes Compartilhados] ─── paralelo ───  [Epic 4C: Doc Sync DS v2]
        ↓
[Epic 4D: Páginas Complexas]
        ↓
[Epic 4E: Qualidade & Storybook]
        ↓
[Epic 4F: Remoção Final MUI v4]
```

---

## 3. Épicas Detalhadas

### Epic 4A — Token Format CSS (T2, Bloqueante para Tailwind @theme)
**Objetivo**: Converter `theme/tokens/*.js` → `*.css` (CSS Custom Properties)  
**Esforço**: ~4h  
**Tier**: T2 (Batch)

| Tarefa | Arquivo | Ação |
|--------|---------|------|
| 4A-01 | `tokens/primitives.js` → `primitives.css` | Converter para `:root { --x: y; }` |
| 4A-02 | `tokens/semantic.js` → `semantic.css` | Alias CSS vars |
| 4A-03 | `tokens/components.js` → `components.css` | Tokens de componentes |
| 4A-04 | `tokens/typography.js` → `typography.css` | Font tokens |
| 4A-05 | Atualizar `index.css` para importar CSS vars | Remove imports JS de tokens |
| 4A-06 | Atualizar `tailwind.config.js` para usar `@theme` | Consumir CSS vars no Tailwind |

---

### Epic 4B — Componentes Compartilhados MUI (T2, 46 arquivos)
**Objetivo**: Migrar todos os componentes de `src/components/` de MUI+JS para shadcn+TSX  
**Esforço**: ~60h  
**Tier**: T2 (paralelo via worktrees por grupo)

#### Grupo 1 — Atoms (baixo acoplamento)
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| ButtonWithSpinner | `components/ButtonWithSpinner/index.js` | Alta |
| Title | `components/Title/index.js` | Alta |
| TableRowSkeleton | `components/TableRowSkeleton/index.js` | Alta |
| TicketsListSkeleton | `components/TicketsListSkeleton/index.js` | Alta |
| SplashScreen | `components/SplashScreen/index.js` | Média |
| NavButton | `components/NavButton/index.js` | Alta |

#### Grupo 2 — Modais e Overlays
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| ConfirmationModal | `components/ConfirmationModal/index.js` | Alta |
| QrcodeModal | `components/QrcodeModal/index.js` | Alta |
| PairingCodeModal | `components/PairingCodeModal/index.js` | Alta |
| QueueModal | `components/QueueModal/index.js` | Alta |
| QuickAnswersModal | `components/QuickAnswersModal/index.js` | Alta |
| ContactModal | `components/ContactModal/index.js` | Alta |
| WhatsAppModal | `components/WhatsAppModal/index.js` | Alta |
| TransferTicketModal | `components/TransferTicketModal/index.js` | Alta |
| NewTicketModal | `components/NewTicketModal/index.js` | Alta |
| TenantModal | `components/TenantModal/index.js` | Média |

#### Grupo 3 — Selects e Filtros
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| TicketsQueueSelect | `components/TicketsQueueSelect/index.js` | Alta |
| TicketsTagFilter | `components/TicketsTagFilter/index.js` | Alta |
| TagPicker | `components/TagPicker/index.js` | Média |
| TagChip | `components/TagChip/index.js` | Média |

#### Grupo 4 — Ticket Ecosystem
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| TicketListItem | `components/TicketListItem/index.js` | Alta |
| TicketsList | `components/TicketsList/index.js` | Alta |
| TicketHeader | `components/TicketHeader/index.js` | Alta |
| TicketInfo | `components/TicketInfo/index.js` | Alta |
| TicketActionButtons | `components/TicketActionButtons/index.js` | Alta |
| TicketOptionsMenu | `components/TicketOptionsMenu/index.js` | Alta |
| Ticket | `components/Ticket/index.js` | Alta |
| TicketsManager | `components/TicketsManager/index.js` | Alta |

#### Grupo 5 — Chat e Mensagens
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| MessagesList | `components/MessagesList/index.js` | Alta |
| MessageInput | `components/MessageInput/index.js` | Alta |
| MessageOptionsMenu | `components/MessageOptionsMenu/index.js` | Média |
| FileUploader | `components/FileUploader/index.js` | Média |
| FilePreview | `components/FilePreview/index.js` | Média |
| AttachmentsList | `components/AttachmentsList/index.js` | Média |
| VcardPreview | `components/VcardPreview/index.js` | Baixa |

#### Grupo 6 — Contacts e Layout
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| ContactDrawer | `components/ContactDrawer/index.js` | Alta |
| ContactDrawerSkeleton | `components/ContactDrawerSkeleton/index.js` | Média |
| ContactAIInsights | `components/ContactAIInsights/index.js` | Média |
| NotificationsPopOver | `components/NotificationsPopOver/index.js` | Alta |
| MainContainer | `components/MainContainer/index.js` | Alta |
| MainHeader | `components/MainHeader/index.js` | Alta |
| MainHeaderButtonsWrapper | `components/MainHeaderButtonsWrapper/index.js` | Alta |
| InfoCard | `components/InfoCard/index.js` | Baixa |
| ModalImageCors | `components/ModalImageCors/index.js` | Baixa |

#### Grupo 7 — Permissões e Roles
| Componente | Arquivo | Prioridade |
|-----------|---------|-----------|
| PermissionTransferList | `components/PermissionTransferList/index.js` | Alta |
| RolePermissionTransferList | `components/RolePermissionTransferList/index.js` | Alta |

---

### Epic 4C — Sync Documentação DS v2 (T1, paralelo)
**Objetivo**: Sincronizar `docs/Watink Design System v2/` com a implementação real  
**Esforço**: ~8h  
**Tier**: T1 (Fast Path)

| Tarefa | Ação |
|--------|------|
| 4C-01 | Executar plano `.claude/plans/ds-improvement-plan.md` (tasks 1.1–5.2) |
| 4C-02 | Criar `docs/adr/frontend/005-design-system-governance.md` |
| 4C-03 | Sincronizar tokens DS v2 com implementação real |
| 4C-04 | Converter exemplos JSX → TSX em `components/core/` |
| 4C-05 | Atualizar `_ds_manifest.json` com novos componentes |

---

### Epic 4D — Páginas Complexas MUI (T3, 66 arquivos)
**Objetivo**: Migrar páginas de negócio ainda em MUI  
**Esforço**: ~100h  
**Tier**: T3 (Bloqueante — aprovação por grupo)

#### Grupo P1 — FlowBuilder (complexidade máxima)
- `FlowBuilder/CustomNodes/*.js` (11 nós: StartNode, MenuNode, MessageNode, etc.)
- `FlowBuilder/NodeEditorSidebar.js`
- `FlowBuilder/NodesSidebar.js`
- `FlowBuilder/ContentModal.js`
- `FlowBuilder/FlowSimulatorModal.js`
- `FlowBuilder/StartNodeModal.js`
- `FlowBuilder/FlowChat.js`
- `FlowBuilder/components/ConditionBuilder.js`
- `FlowBuilder/components/FilterBuilder.js`
- `FlowBuilder/components/DataBuilder.js`

#### Grupo P2 — Helpdesk e Pipelines
- `Helpdesk/*.js` (7 arquivos: index, ProtocolCard, ProtocolDetails, ProtocolModal, etc.)
- `Pipelines/*.js` (8 arquivos: Board, Kanban, Gantt, KPIs, etc.)

#### Grupo P3 — Módulos de Negócio
- `KnowledgeBase/index.js` + `KnowledgeBaseConfig.js`
- `MyActivities/index.js` + `ActivityExecution.js` + `SignatureModal.js`
- `Clients/index.js` + `ClientModal.js`
- `Groups/GroupModal.js`, `GroupEdit/index.js`
- `MonitorQueues/index.js`
- `Billing/index.js`

#### Grupo P4 — Admin e Configurações
- `UserEdit/index.js`
- `RoleEdit/index.js`
- `Tenants/index.js`
- `SaaS/index.js`
- `VersionDashboard/index.js`
- `Swagger/index.js`
- `ResetPassword/index.js`
- `PublicProtocol/index.js`
- `Marketplace/SmtpSettingsForm.js`
- `Marketplace/PapiSettingsForm.js`
- `Marketplace/PluginDetail.js`
- `Dashboard/Title.js`
- `Dashboard/Chart.js`
- `Connections/ConnectionConfig.js`
- `InitialSetup/index.js`

---

### Epic 4E — Qualidade, A11y e Storybook (T2)
**Objetivo**: Garantir produção-readiness  
**Esforço**: ~40h

| Tarefa | Ação |
|--------|------|
| 4E-01 | Instalar e configurar Storybook 8 + Vite builder |
| 4E-02 | Criar stories para todos os 22 componentes em `ui/` |
| 4E-03 | Integrar Chromatic para visual regression no CI |
| 4E-04 | Rodar WAVE accessibility audit em todas as páginas |
| 4E-05 | Lighthouse ≥90 em todas as páginas principais |
| 4E-06 | `npm run test` cobertura ≥80% |

---

### Epic 4F — Remoção Final MUI v4 (T3, Bloqueante)
**Objetivo**: `npm uninstall @material-ui/core @material-ui/icons @material-ui/lab`  
**Pré-requisito**: Epics 4B e 4D 100% concluídas, CI verde  
**Esforço**: ~4h

| Tarefa | Ação |
|--------|------|
| 4F-01 | Confirmar 0 imports de `@material-ui` via grep |
| 4F-02 | `npm uninstall` MUI packages |
| 4F-03 | Remover `theme/bridge.js` |
| 4F-04 | Build + smoke test final |
| 4F-05 | PR de remoção com evidências |

---

## 4. Cronograma

```
JUNHO 2026 (semanas 3–4):
  Jun 13-15:  Epic 4A (tokens CSS) + Epic 4C (doc sync)    ← AGORA
  Jun 16-20:  Epic 4B Grupos 1–3 (atoms + modais + selects)
  Jun 21-28:  Epic 4B Grupos 4–7 (tickets + chat + layout)

JULHO 2026:
  Jul 1-7:    Epic 4D Grupo P3 e P4 (módulos negócio)
  Jul 8-14:   Epic 4D Grupo P1 FlowBuilder
  Jul 15-21:  Epic 4D Grupo P2 Helpdesk + Pipelines
  Jul 22-28:  Epic 4E Storybook + A11y + Testes
  Jul 29-31:  Epic 4F Remoção MUI (T3 aprovação)

AGOSTO 2026:
  Deploy produção + feedback loop
```

---

## 5. Critérios de Saída (Definition of Done)

- [ ] `grep -r "@material-ui" frontend/src/ --include="*.js" --include="*.ts" --include="*.tsx"` → 0 resultados
- [ ] `npm run build` → sem warnings de MUI
- [ ] `npm run test` → ≥80% coverage
- [ ] `npm run lint` → 0 erros
- [ ] Lighthouse Performance ≥90 nas 3 páginas principais
- [ ] Storybook com stories para todos os componentes em `ui/`
- [ ] `docs/Watink Design System v2/` sincronizado com implementação

---

## 6. Referências

- Design System v2: `docs/Watink Design System v2/`
- Estado atual: `ESTADO_ORQUESTRATOR.md`
- Roadmap global: `ORCHESTRATOR-ROADMAP.md`
- CLAUDE.md regras de migração: seção "Frontend Migration Governance"
- Plano DS Improvement: `.claude/plans/ds-improvement-plan.md`

### Atualização 2026-06-13
- Epic 4A, 4B e 4C 100% concluídas (50 arquivos refatorados).
- DAG da Epic 4D atualizada no ESTADO_ORQUESTRATOR.md com 6 grupos estruturais.
