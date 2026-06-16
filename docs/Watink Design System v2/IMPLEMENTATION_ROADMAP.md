# Roadmap de Implementação — Watink Design System v2.0

**Status**: Ativo em progresso  
**Versão**: 2.0-beta  
**Data**: 15 de junho de 2026 (Revisão 2)  
**Responsável**: Equipe Frontend + Agentes de IA  
**Fase Atual**: 1 (Fundação) - 70% completa

---

## 1. Estado Atual vs. Target

### Estado Atual (Junho 2026)
- ✅ React 18 + Vite + Tailwind v4
- ✅ shadcn/ui parcialmente implementado
- ✅ Arquitetura modular (ui/, composite/, patterns/)
- ⚠️ MUI v4 ainda em uso em componentes legacy
- ⚠️ Hardcoded colors em ~40% dos componentes
- ⚠️ TypeScript parcial (allowJs: true em tsconfig)
- ⚠️ Dark mode via CSS vars (funcional mas não 100% testado)

### Target (Q3 2026)
- ✅ 100% shadcn/ui + Tailwind (zero MUI v4 em code novo)
- ✅ 0% hardcoded colors
- ✅ 100% TypeScript (.tsx obrigatório)
- ✅ Dark mode tested e produção
- ✅ Acessibilidade WCAG AA em 95%+ componentes
- ✅ Design tokens governados centralmente
- ✅ Documentação completa para agentes de IA

---

## 2. Gaps Identificados (Análise DESIGN_SYSTEM_AUDIT.md)

### Críticos (Bloqueia desenvolvimento)

| Gap | Local | Impacto | Solução |
|-----|-------|--------|---------|
| **Paleta Google inconsistente** | `FlowBuilder/*` | Nós de flow usam cores hardcoded | Centralizar em `tokens/components.css` |
| **Borders inline** | `FlowSimulatorModal`, `ContentModal` | Inconsistência visual | Criar `.tsx` com Tailwind, remover inline `style` |
| **Button danger sem padrão** | `StartNodeModal`, `NodeEditorSidebar` | `#f44336` hardcoded | Usar `<Button variant="destructive">` |
| **Shadows variados** | `CardComponent`, `Modals` | Hierarquia visual confusa | Usar `shadow-md`, `shadow-lg` Tailwind |

### Altos (Recomendado antes de Q3)

| Gap | Local | Impacto | Solução |
|-----|-------|--------|---------|
| **ColorPicker** | `src/components/ColorPicker/` | 49 hardcoded colors (exceção aceita) | Documentar como exceção, manter isolado |
| **tagColors helper** | `src/helpers/tagColors.js` | 18 hardcoded colors | Migrar para `tokens/components.css` |
| **NavItems colors** | `MainListItems.js` | Duplicação de semântica | Consumir `theme/tokens/semantic.css` |
| **TypeScript incremental** | Múltiplos `.js` | DX pobre, erros em runtime | Converter `.js` → `.tsx` (boy scout rule) |

### Médios (Nice-to-have, Q3+)

| Gap | Local | Impacto | Solução |
|-----|-------|--------|---------|
| **Storybook** | N/A | Sem documentação visual | Criar stories para todos os componentes |
| **Chromatic (CI/CD)** | N/A | Sem visual regression testing | Integrar no GitHub Actions |
| **Form builder genérico** | `src/pages/` | Muita duplicação de forms | Criar padrão genérico em `patterns/Forms/` |

---

## 3. Plano de Implementação (Por Fase)

### Fase 1: Fundação (Semanas 1-2)

**Objetivo**: Garantir que novos componentes seguem padrão.

```
[ ] 1.1 Publicar documentação (DONE)
    ├── FRONTEND_ARCHITECTURE.md
    ├── DESIGN_SYSTEM_GUIDE.md
    ├── AI_AGENT_INSTRUCTIONS.md
    └── Este arquivo (ROADMAP.md)

[ ] 1.2 Validar tokens em `theme/tokens/`
    ├── primitives.css (valores brutos) ✅
    ├── semantic.css (aliasing)         ⚠️ (review)
    ├── typography.css                  ✅
    └── components.css (novos)          ❌ (criar)

[ ] 1.3 Atualizar ESLint para bloquear hardcoded colors
    ├── Plugin: eslint-plugin-watink-design-system
    ├── Regra: no-hardcoded-colors
    └── Exceções: ColorPicker, assets

[ ] 1.4 Template para novos componentes
    ├── Scaffold: `plop` generator
    ├── Outputs: Button.tsx, Button.test.tsx, stories
    └── Publish em `scripts/generators/`
```

**Deliverables**:
- ✅ Documentação completa (este projeto)
- ✅ ESLint configurado
- ✅ Template de componente

### Fase 2: Refatoração de Componentes Base (Semanas 3-4)

**Objetivo**: Migrar componentes mais utilizados para Tailwind.

```
PRIORIDADE 1 (Impacto alto, esforço baixo):
[ ] Button.tsx
    ├── Remover makeStyles
    ├── Adicionar variantes: primary, outline, ghost, destructive
    └── Testes (unit + visual)

[ ] Card.tsx
    ├── Centralizar borderRadius, shadow
    ├── Suporte a variants (elevated, outlined, flat)
    └── Dark mode testes

[ ] Input.tsx & Textarea.tsx
    ├── Tailwind styling
    ├── Focus ring customizado
    └── Error state visual

[ ] Dialog/Modal.tsx
    ├── Radix Dialog base
    ├── Tailwind + overlay backdrop
    └── Animation (fade in/out)

PRIORIDADE 2 (Impacto médio, esforço médio):
[ ] Form components
    ├── FormField pattern
    ├── Label, FormDescription, FormError
    └── Integração com Formik/React Hook Form

[ ] StatusChip/Badge
    ├── Variantes: success, error, warning, info
    ├── Tamanhos: sm, md, lg
    └── Paleta Google (tema-agnostic)

[ ] Avatar.tsx
    ├── Image + Fallback
    ├── Tamanhos: xs, sm, md, lg
    └── Status indicator (online, offline)
```

**Effort**: ~40 dev-hours  
**Deliverables**: 10+ componentes base em produção

### Fase 3: Refatoração de Componentes Complexos (Semanas 5-8)

**Objetivo**: Migrar componentes de negócio (ChatWindow, FlowBuilder, etc.)

```
[ ] ChatWindow / MessageBubble
    ├── Remover MUI + hardcoded colors
    ├── Implementar com Tailwind
    ├── Suporte a avatares, timestamps, reactions
    └── Accessibility: ARIA landmarks

[ ] FlowBuilder ecosystem
    ├── NodeEditorSidebar.tsx (remover hardcoded)
    ├── CustomNodes/* (padrão de cores)
    ├── FlowSimulatorModal.tsx (refactor)
    └── ContentModal.tsx (refactor)

[ ] TicketCard / Kanban
    ├── Padrão para cards compostos
    ├── Drag-and-drop (react-beautiful-dnd)
    ├── Status indicators via tokens
    └── Responsive layout

[ ] DataTable / ListItems
    ├── Padrão genérico para tabelas
    ├── Sorting, filtering, pagination
    ├── Row selection + bulk actions
    └── Dark mode + print styles

[ ] Forms (página completa)
    ├── FormSection pattern
    ├── Validation visual
    ├── Submit handlers
    └── Loading/error states
```

**Effort**: ~80 dev-hours  
**Deliverables**: Ecosystem completo pronto para produção

### Fase 4: Testes & Polimento (Semanas 9-10)

**Objetivo**: Garantir qualidade, acessibilidade, performance.

```
[ ] Visual Regression Testing
    ├── Chromatic CI/CD integration
    ├── Screenshot baseline (light + dark)
    └── Approval workflow no PR

[ ] Accessibility Audit
    ├── WAVE scan de cada página
    ├── Keyboard navigation (Tab, Enter, Esc, Arrow keys)
    ├── Screen reader testing (NVDA, JAWS)
    └── Color contrast (WCAG AA min 4.5:1)

[ ] Performance Profiling
    ├── Lighthouse scores >= 90
    ├── Bundle size analysis
    ├── Component lazy loading
    └── Image optimization

[ ] Documentation
    ├── Storybook stories (todos os componentes)
    ├── Usage examples
    ├── Accessibility notes
    └── Migration guides (MUI → shadcn)

[ ] Deploy Checklist
    ├── Semântica HTML correta
    ├── Meta tags (OG, Twitter)
    ├── 404 page
    ├── Error boundaries
    └── Analytics
```

**Effort**: ~40 dev-hours  
**Deliverables**: Produção polida com 95%+ Lighthouse

---

## 4. Cronograma Estimado

```
JUNHO 2026:
  Jun 13-14:  Documentação + ESLint (Fase 1)        ✅ HOJE
  Jun 15-28:  Componentes base (Fase 2)             📅 PRÓX

JULHO 2026:
  Jul 1-14:   Componentes complexos (Fase 3)        📅
  Jul 15-21:  Testes + polimento (Fase 4)           📅
  Jul 22-31:  Deploy + validação                    📅

AGOSTO 2026 (Q3):
  Feedback loop + iterações
  Manutenção + novos componentes
```

---

## 5. Métricas de Sucesso

### Código
- [ ] 0% hardcoded hex colors (ESLint + manual audit)
- [ ] 100% TypeScript em features novas (.tsx obrigatório)
- [ ] 95%+ test coverage (unit + integration)
- [ ] 0 MUI v4 imports em código novo

### Visual
- [ ] Lighthouse >= 90 (performance, accessibility, best practices)
- [ ] Contraste WCAG AA em 100% dos componentes
- [ ] Dark mode funcional em 100% dos componentes

### UX
- [ ] Keyboard navigation em 100% dos componentes interativos
- [ ] Focus indicators visíveis (3px ring)
- [ ] Testes de acessibilidade passando

### Documentação
- [ ] Storybook com stories para todos os componentes
- [ ] AI_AGENT_INSTRUCTIONS.md completo + atualizado
- [ ] Migration guides (MUI → shadcn) publicados

---

## 6. Dependências & Bloqueadores

### Pré-requisitos
- ✅ React 18 (já implementado)
- ✅ TypeScript + Vite (já implementado)
- ✅ Tailwind v4 (já implementado)
- ✅ shadcn/ui base components (parcialmente pronto)

### Potenciais Bloqueadores
| Bloqueador | Risco | Mitigação |
|-----------|-------|-----------|
| MUI v4 tightly coupled em componentes antigos | MÉDIO | Wrapper components (bridge pattern) |
| Falta de Storybook | BAIXO | Criar durante Fase 4 |
| ColorPicker com 49 hardcoded colors | BAIXO | Documentar como exceção autorizada |
| Dark mode CSS vars não 100% testadas | MÉDIO | Adicionar testes em Fase 4 |

---

## 7. Tarefas Imediatas para Agentes de IA

### Semana 1 (Começar AGORA)

```markdown
## Task 1: Button.tsx Refactor
[ ] File: src/components/ui/button.tsx
[ ] Remove makeStyles
[ ] Adicionar variantes: primary, outline, ghost, destructive, secondary
[ ] Suportar sizes: sm, md (default), lg
[ ] Dark mode: testado
[ ] Testes: unit + visual snapshot
[ ] Documentação: JSDoc + Storybook story

## Task 2: Card.tsx Refactor
[ ] File: src/components/ui/card.tsx
[ ] Centralizar borderRadius (12px), shadow (shadow-md)
[ ] Variantes: elevated (shadow-lg), outlined (border), flat
[ ] Dark mode: bg-surface / border-border
[ ] Testes: unit + visual
[ ] Storybook story

## Task 3: Input.tsx + Textarea.tsx
[ ] Files: src/components/ui/input.tsx, textarea.tsx
[ ] Tailwind styling (border-border, focus:ring)
[ ] Error state: red ring + error text
[ ] Disabled state: opacity-50, cursor-not-allowed
[ ] Dark mode
[ ] Testes unitários

## Task 4: Validar tokens/components.css
[ ] Criar src/theme/tokens/components.css
[ ] Definir:
    - Button tokens (primary-bg, primary-text, etc.)
    - Card tokens (bg, border, shadow, radius)
    - Input tokens (border, focus, error)
    - Modal tokens (bg, overlay, radius)
[ ] Verificar reference em tailwind.config.js

## Task 5: ESLint no-hardcoded-colors Rule
[ ] Atualizar eslint-plugin-watink-design-system
[ ] Detectar hex colors em style={{ color: "#..." }}
[ ] Detectar hex colors em require() dinamicamente
[ ] Exceções: ColorPicker, assets/
[ ] Mensagem clara: "Use var(--text-primary) instead"
```

### Semana 2

```markdown
## Task 6: Dialog/Modal + Tabs
[ ] src/components/ui/dialog.tsx (Radix base)
[ ] src/components/ui/tabs.tsx (Radix base)
[ ] Tailwind overlay, animations
[ ] Dark mode
[ ] Testes

## Task 7: Badge/StatusChip
[ ] src/components/ui/badge.tsx
[ ] Variantes: default, secondary, destructive
[ ] Paleta Google para tema="google"
[ ] Dark mode
[ ] Storybook

## Task 8: FormField Pattern
[ ] src/components/patterns/Forms/FormField.tsx
[ ] Uso: <FormField label="..." error="..."><Input /></FormField>
[ ] Suportar required indicator
[ ] Testes

## Task 9: Refactor FlowBuilder Hardcoded Colors
[ ] Audit: FlowBuilder/NodesSidebar.js
[ ] Audit: FlowBuilder/CustomNodes/BaseNode.js
[ ] Migrar cores para tokens/components.css
[ ] Converter .js → .tsx
[ ] Testes
```

---

## 8. Exemplo: Task Completa (Para Agentes)

### Input
```
"Crie um novo componente StatusBadge que suporte 
variantes: success, error, warning, info. Deve ser tema-agnóstico,
suportar dark mode, e ter testes."
```

### Workflow (Agente)

**1. Ler docs**
```
1. FRONTEND_ARCHITECTURE.md → Entender estrutura
2. DESIGN_SYSTEM_GUIDE.md → Tokens, componentes
3. AI_AGENT_INSTRUCTIONS.md → Regras estritas
```

**2. Criar arquivo**
```typescript
// src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold",
  {
    variants: {
      variant: {
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
        error: "bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200",
        warning: "bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
        info: "bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ variant, className, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, className }))} {...props} />
  )
}
```

**3. Testes**
```typescript
// src/components/ui/__tests__/badge.test.tsx
import { render, screen } from "@testing-library/react"
import { Badge } from "../badge"

describe("Badge", () => {
  it("renders with success variant", () => {
    render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText("Success")).toHaveClass("bg-emerald-50")
  })

  it("applies custom className", () => {
    const { container } = render(<Badge className="custom">Test</Badge>)
    expect(container.firstChild).toHaveClass("custom")
  })
})
```

**4. Validar**
```bash
npm run lint         # ✅ Passou
npm run test         # ✅ Passou
npm run build        # ✅ Passou
npm run dev          # Visual: light + dark mode OK
```

**5. Commit**
```
feat: novo StatusBadge com variantes (success, error, warning, info)

- Implementado com Tailwind + CVA
- Suporte completo a dark mode
- Testes unitários
- Tema-agnóstico (sem hardcoded colors)
```

---

## 9. Referências & Links

| Recurso | URL | Notas |
|---------|-----|-------|
| shadcn/ui | https://ui.shadcn.com/ | Componentes base |
| Tailwind CSS | https://tailwindcss.com/ | Utilities |
| Radix UI | https://www.radix-ui.com/ | Primitivos headless |
| CVA | https://cva.style/ | Variantes de componentes |
| WCAG 2.1 | https://www.w3.org/WAI/WCAG21/quickref/ | Acessibilidade |
| React TypeScript | https://react-typescript-cheatsheet.netlify.app/ | Padrões TS |

---

## 10. FAQ para Agentes

**P: Posso usar MUI v4 em novos componentes?**  
R: ❌ Não. Sempre use shadcn/ui + Tailwind. MUI é read-only.

**P: E se ColorPicker tiver hardcoded colors?**  
R: ✅ Exceção autorizada. ColorPicker é componente especializado. Manter isolado.

**P: Como adiciono uma nova cor que não está em tokens/?**  
R: 1. Verificar `semantic.css` — a cor pode já existir com outro nome.  
   2. Se realmente nova, propor em discussão e adicionar em `primitives.css`.  
   3. Nunca hardcoded no componente.

**P: E se o Tailwind não tiver utility para X?**  
R: Use `@apply` em CSS ou crie CSS Custom Property em `tokens/`.

**P: Como testo dark mode?**  
R: `npm run dev` → F12 → Elements → html → add `class="dark"` e toggle.

**P: Preciso de snapshot tests?**  
R: Recomendado para componentes visuais. Use Vitest + @vitest/ui.

---

**Documento criado**: 13 de junho de 2026  
**Responsável**: Equipe Watink + Agentes de IA  
**Status**: Pronto para implementação

**Próximo passo**: Começar Fase 1 (Fundação) conforme cronograma.
