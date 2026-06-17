# Workflow de Migração — Design System v2

**Data**: 2026-06-13  
**Branch**: `tinker/ui-and-di-refactor`  
**Status**: ATIVO  
**Plano detalhado**: `.claude/plans/frontend-ds-v2-workflow.md`  
**Referência DS**: `docs/Watink Design System v2/`

---

## Por que este documento existe

O Design System v2 foi documentado em `docs/Watink Design System v2/` com 7 documentos completos (AI_AGENT_INSTRUCTIONS, FRONTEND_ARCHITECTURE, DESIGN_SYSTEM_GUIDE, IMPLEMENTATION_ROADMAP, etc.). A documentação está madura. O código ainda não alcançou a mesma maturidade.

Este workflow conecta a especificação do DS v2 com a execução real no código, definindo a ordem de operações, critérios de saída e como agentes devem navegar o trabalho restante.

---

## Diagnóstico de Gap (2026-06-13)

| Área | Especificado no DS v2 | Implementado no código |
|------|-----------------------|------------------------|
| Tokens format | CSS Custom Properties | `.js` (precisa migrar) |
| Componentes `ui/` | 30+ shadcn | 22 ✅ |
| Componentes legados | 0 MUI | 46 com MUI 🔴 |
| Páginas legadas | 0 MUI | 66 com MUI 🔴 |
| Storybook | Recomendado | Ausente 🔴 |
| A11y WCAG AA | Obrigatório | Parcial ⚠️ |
| Hardcoded colors | 0 | 0 em `ui/` ✅, presentes em legados |

---

## Ordem de Execução (Regra de Ouro)

```
1. TOKENS CSS      ← desbloqueio estrutural (4A)
       ↓
2. ATOMS           ← base de todos os outros (4B-G1)
       ↓
3. MODAIS + SELECTS (paralelo) ← 4B-G2 + 4B-G3
       ↓
4. TICKETS ECOSYSTEM ← 4B-G4 (maior complexidade)
       ↓
5. CHAT + CONTACTS (paralelo) ← 4B-G5 + 4B-G6
       ↓
6. FLOWBUILDER ← 4D-P1 (máxima complexidade)
       ↓
7. HELPDESK + PIPELINES (paralelo) ← 4D-P2
       ↓
8. MÓDULOS NEGÓCIO ← 4D-P3 + 4D-P4
       ↓
9. QUALIDADE       ← Storybook + A11y + Lighthouse (4E)
       ↓
10. REMOÇÃO MUI    ← npm uninstall (4F) — T3 BLOQUEANTE
```

**Paralelo desde o início**: Epic 4C (doc sync DS v2) pode rodar junto com 4A e 4B.

---

## Regras de Migração por Componente

Ao migrar qualquer componente de MUI v4 para shadcn+TSX, seguir:

### 1. Checklist pré-migração
- [ ] Ler `docs/Watink Design System v2/AI_AGENT_INSTRUCTIONS.md` §2 (Implement)
- [ ] Verificar se componente shadcn base já existe em `frontend/src/components/ui/`
- [ ] Mapear todas as props existentes no `.js` legado
- [ ] Identificar hardcoded colors e substituir por tokens

### 2. Estrutura do arquivo TSX
```tsx
// src/components/[Nome]/index.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
// importar componentes shadcn necessários

export interface [Nome]Props {
  // props explícitas — nunca any
}

export function [Nome]({ ...props }: [Nome]Props) {
  return (
    // JSX com Tailwind classes — cn() para condicionais
  )
}
```

### 3. Checklist pós-migração
- [ ] `npm run lint` — 0 erros
- [ ] `npm run test` — testes passando
- [ ] `npm run build` — sem warnings MUI
- [ ] Visual check `npm run dev` (light + dark)
- [ ] Nenhum import `@material-ui` remanescente no arquivo

---

## Grupos de Trabalho por Complexidade

### Baixa (1–2h por componente)
Atoms: ButtonWithSpinner, Title, TableRowSkeleton, TicketsListSkeleton, NavButton, SplashScreen

### Média (2–4h por componente)
Modais simples: ConfirmationModal, QrcodeModal, PairingCodeModal  
Selects: TicketsQueueSelect, TicketsTagFilter, TagPicker, TagChip

### Alta (4–8h por componente)
Ticket ecosystem: TicketListItem, TicketsList, TicketHeader, TicketInfo, TicketActionButtons  
Chat: MessagesList, MessageInput, ContactDrawer  
Layout: MainContainer, MainHeader, NotificationsPopOver

### Muito Alta (8–20h por módulo)
FlowBuilder: 10+ nós customizados + sidebar + modais  
Helpdesk: 7 arquivos interdependentes  
Pipelines: 8 arquivos com charts e kanban

---

## Critérios de Qualidade (DS v2)

Conforme `docs/Watink Design System v2/IMPLEMENTATION_ROADMAP.md §5`:

```
CÓDIGO:
  ✅ 0 hardcoded hex colors
  ✅ 0 imports @material-ui
  ✅ TypeScript com interfaces explícitas
  ✅ cn() para classes condicionais

VISUAL:
  ✅ Lighthouse ≥90
  ✅ Contraste WCAG AA 4.5:1 mínimo
  ✅ Dark mode funcional

TESTES:
  ✅ npm run lint — 0 erros
  ✅ npm run test — ≥80% coverage
  ✅ npm run build — limpo
```

---

## Próxima Ação Imediata

**Tarefa 4A-01**: Converter `frontend/src/theme/tokens/primitives.js` → `primitives.css`

```bash
# Verificar formato atual
cat frontend/src/theme/tokens/primitives.js | head -30

# Após conversão, verificar import no index.css
grep -n "primitives" frontend/src/index.css
```

---

## Links Rápidos

| Recurso | Caminho |
|---------|---------|
| Plano detalhado | `.claude/plans/frontend-ds-v2-workflow.md` |
| Estado DAG | `ESTADO_ORQUESTRATOR.md` §Epic 3 |
| Roadmap global | `ORCHESTRATOR-ROADMAP.md` |
| Instruções agente | `docs/Watink Design System v2/AI_AGENT_INSTRUCTIONS.md` |
| Guia arquitetura | `docs/Watink Design System v2/FRONTEND_ARCHITECTURE.md` |
| ADR Governança DS | `docs/adr/frontend/005-design-system-governance.md` |
