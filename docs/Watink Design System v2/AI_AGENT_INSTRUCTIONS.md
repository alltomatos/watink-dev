# AI Agent Instructions — Watink Frontend Development

**Destinado para**: Claude Code, Cursor, ou qualquer agente de IA  
**Propósito**: Regras precisas e automáticas para desenvolvimento de frontend  
**Versão**: 2.0  
**Data**: 15 de junho de 2026 (Revisão 2)

---

## 🎯 Missão

Desenvolver componentes frontend **shadcn/ui + Tailwind CSS + React 18** que:
- ✅ Nunca usam hardcoded colors (sempre `var(--...)` ou Tailwind semantics)
- ✅ Seguem padrão TypeScript com interfaces explícitas
- ✅ Reutilizam `cn()` helper para classes condicionais
- ✅ Passam em testes de acessibilidade (WCAG AA)
- ✅ Funcionam em light + dark mode automaticamente
- ✅ São agnósticos ao tema (Google, WhatsApp, Default)

---

## 📋 Pré-requisitos (Antes de começar qualquer tarefa)

### 1. Ler Documentação (Obrigatório)
```bash
1. FRONTEND_ARCHITECTURE.md     # Arquitetura geral
2. DESIGN_SYSTEM_GUIDE.md       # Tokens, componentes, padrões
3. CLAUDE.md                     # Regras gerais do projeto
```

### 2. Estrutura Conhecida
- Frontend stack: **React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui**
- Tokens definidos em: `frontend/src/theme/tokens/*.css`
- Componentes shadcn em: `frontend/src/components/ui/`
- Componentes de negócio: `frontend/src/components/composite/`
- Sem MUI v4 em features novas ❌

### 3. Ferramentas Disponíveis
```bash
npm run lint              # Validar ESLint (deve passar)
npm run dev              # Vite dev server (localhost:3000)
npm run build            # Build para produção
npm run test             # Vitest
```

---

## 🔧 Workflow (Passo-a-Passo)

### Fase 1: Entender a Tarefa

```
Input: "Crie um CardComponet com suporte a badge e ações"

1. Clarificar requisitos:
   - Qual é a aparência esperada? (sketch, screenshot, descrição)
   - Props necessárias? (título, descrição, badge, callbacks)
   - Estados? (hover, disabled, loading, error)
   - Dark mode? (sim, obrigatório)
   - Acessibilidade? (sim, obrigatória)
   - Testes? (snapshot, interaction tests)

2. Definir interface TypeScript:
   interface CardComponentProps {
     title: string
     description?: string
     badge?: { text: string; variant?: "default" | "secondary" }
     actions?: Array<{ label: string; onClick: () => void }>
     onClose?: () => void
     disabled?: boolean
     className?: string
   }

3. Esboçar estrutura:
   <Card>
     <div className="flex justify-between items-start">
       <div>
         <h3>{title}</h3>
         <p>{description}</p>
       </div>
       {badge && <Badge>{badge.text}</Badge>}
     </div>
     <div className="flex gap-2">
       {actions?.map(action => ...)}
     </div>
   </Card>
```

### Fase 2: Implementar

**Arquivo**: `src/components/composite/CardComponent.tsx`

```typescript
import React from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 1. INTERFACE CLARA
interface BadgeConfig {
  text: string
  variant?: "default" | "secondary" | "destructive"
}

interface CardAction {
  label: string
  onClick: () => void
  variant?: "default" | "outline" | "ghost"
}

interface CardComponentProps {
  title: string
  description?: string
  badge?: BadgeConfig
  actions?: CardAction[]
  onClose?: () => void
  disabled?: boolean
  className?: string
}

// 2. COMPONENTE FUNCIONAL
export function CardComponent({
  title,
  description,
  badge,
  actions,
  onClose,
  disabled = false,
  className,
}: CardComponentProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="article"
      aria-disabled={disabled}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {badge && (
            <Badge variant={badge.variant}>
              {badge.text}
            </Badge>
          )}
        </div>
      </CardHeader>

      {(actions || onClose) && (
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {actions?.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant || "outline"}
                onClick={action.onClick}
                disabled={disabled}
              >
                {action.label}
              </Button>
            ))}
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                disabled={disabled}
              >
                ✕
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
```

### Fase 3: Validar

```bash
# 1. Lint (sem erros)
npm run lint

# 2. TypeScript (sem erros)
npx tsc --noEmit

# 3. Build (sem warnings)
npm run build

# 4. Visual (screenshot light + dark)
npm run dev
# Abrir http://localhost:3000, print screen

# 5. Acessibilidade (DevTools Lighthouse)
# F12 > Lighthouse > Accessibility score >= 90
```

### Fase 4: Testar (Exemplo)

**Arquivo**: `src/components/composite/__tests__/CardComponent.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react"
import { CardComponent } from "../CardComponent"

describe("CardComponent", () => {
  it("renders with title and description", () => {
    render(
      <CardComponent
        title="Test Card"
        description="Test description"
      />
    )
    expect(screen.getByText("Test Card")).toBeInTheDocument()
    expect(screen.getByText("Test description")).toBeInTheDocument()
  })

  it("renders badge when provided", () => {
    render(
      <CardComponent
        title="Test"
        badge={{ text: "New", variant: "secondary" }}
      />
    )
    expect(screen.getByText("New")).toBeInTheDocument()
  })

  it("calls action onClick when clicked", () => {
    const handleClick = vi.fn()
    render(
      <CardComponent
        title="Test"
        actions={[{ label: "Click", onClick: handleClick }]}
      />
    )
    fireEvent.click(screen.getByText("Click"))
    expect(handleClick).toHaveBeenCalled()
  })

  it("disables actions when disabled prop is true", () => {
    render(
      <CardComponent
        title="Test"
        disabled
        actions={[{ label: "Click", onClick: vi.fn() }]}
      />
    )
    expect(screen.getByText("Click")).toBeDisabled()
  })
})
```

### Fase 5: Documentar (README/Storybook)

```markdown
## CardComponent

Um card versátil para exibir conteúdo com badge e ações.

### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `title` | string | Título principal (obrigatório) |
| `description` | string | Descrição opcional |
| `badge` | BadgeConfig | Badge com texto e variante |
| `actions` | CardAction[] | Array de ações com label e callback |
| `onClose` | () => void | Callback para fechar |
| `disabled` | boolean | Desabilita interação |
| `className` | string | Classes Tailwind adicionais |

### Uso

```tsx
<CardComponent
  title="Novo Ticket"
  description="Suporte técnico"
  badge={{ text: "Urgente", variant: "destructive" }}
  actions={[
    { label: "Atender", onClick: () => handleAttend() },
    { label: "Transferir", onClick: () => handleTransfer() }
  ]}
  onClose={() => handleClose()}
/>
```

### Dark Mode

Funciona automaticamente via CSS Custom Properties. Nenhuma ação necessária.

### Acessibilidade

- ✅ Semantic HTML (`<article>`)
- ✅ ARIA attributes (`aria-disabled`)
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Contraste WCAG AA
```

---

## ⚠️ Regras Estritas (Engenharia)

### Código

| ✅ FAÇA | ❌ NÃO FAÇA |
|---------|-----------|
| `className={cn("base", condition && "mod")}` | `className={"base " + (condition ? "mod" : "")}` |
| `<div style={{ color: "var(--text-primary)" }}>` | `<div style={{ color: "#0F172A" }}>` |
| `import { Button } from "@/components/ui/button"` | `import { Button } from "@material-ui/core"` |
| `export interface Props { ... }` | `const Component = ({ a, b, ...props }) =>` |
| Tailwind utilities: `p-4 gap-2 rounded-lg` | Inline styles ou CSS files |
| TypeScript `.tsx` files | JavaScript `.jsx` files (novos) |
| `const { data } = await api.get(...)` | `const { data } = useQuery(...)` dentro de SSR |
| Props com defaults: `disabled = false` | Props sempre undefined |
| `aria-label`, `aria-describedby`, etc. | Sem atributos ARIA |

### Arquivos

| ✅ FAÇA | ❌ NÃO FAÇA |
|---------|-----------|
| Novo arquivo = `src/components/ui/Button.tsx` | Novo arquivo = `src/Button.js` |
| Componentes compostos = `src/components/composite/` | Compostos em `src/components/` |
| Testes junto = `__tests__/Component.test.tsx` | Testes em pasta separada |
| Exports nomeados: `export function Button()` | Default exports: `export default Button` |
| Arquivo `.d.ts` para tipos complexos | Types inline no componente |

### Cores & Estilos

| ✅ FAÇA | ❌ NÃO FAÇA |
|---------|-----------|
| `bg-primary text-primary-foreground` | `style={{ backgroundColor: "#1A73E8" }}` |
| `var(--action-danger)` em CSS | Hardcoded `#f44336` |
| Tailwind `hover:bg-accent` | `.card:hover { background: ... }` |
| `dark:bg-slate-900` para dark mode | Detectar `prefers-color-scheme` em JS |
| `rounded-lg` (Tailwind) | `borderRadius: "16px"` (inline) |
| Componentes shadcn | Criar novos com Material-UI |

### TypeScript

| ✅ FAÇA | ❌ NÃO FAÇA |
|---------|-----------|
| `Props extends React.HTMLAttributes<HTMLDivElement>` | Props without extending HTML attrs |
| `React.forwardRef<HTMLDivElement, Props>` | Sem forward refs |
| Interfaces explícitas para cada prop | Types genéricos `any` |
| `const [state, setState] = useState<string>("")` | `const [state, setState] = useState("")` |
| Type guards: `if (typeof x === "string")` | Sem validação |

---

## 🚦 Checklist Final (Antes de Commitar)

```
CÓDIGO:
  [ ] Sem hardcoded hex colors
  [ ] Sem imports de @material-ui
  [ ] Sem inline styles (exceto CSS vars)
  [ ] TypeScript com interfaces explícitas
  [ ] Usa cn() para classes condicionais
  [ ] Sem console.log/console.error em produção

COMPONENTE:
  [ ] Renderiza sem erros (npm run dev)
  [ ] Dark mode funciona (toggle em DevTools)
  [ ] Teclado navigation funciona (Tab, Enter, Esc)
  [ ] Props documentadas em comentário JSDoc
  [ ] Export nomeado (não default)

TESTES:
  [ ] Testes unitários passam (npm run test)
  [ ] ESLint passa (npm run lint)
  [ ] TypeScript passa (npx tsc --noEmit)
  [ ] Build passa (npm run build)

COMMIT:
  [ ] Mensagem clara: "feat: novo CardComponent com Tailwind"
  [ ] Branch nomenclatura: robot/card-component
  [ ] PR com descrição técnica
  [ ] Screenshot em light + dark mode
```

---

## 📞 Troubleshooting

### Problema: "npm run lint" falha com "hardcoded colors"
**Solução**: Usar `var(--text-primary)` em vez de `#0F172A`
```tsx
// ❌ Errado
const BadComponent = () => <div style={{ color: "#0F172A" }}>
// ✅ Certo
const GoodComponent = () => <div style={{ color: "var(--text-primary)" }}>
```

### Problema: Classes Tailwind não funcionam
**Solução**: Verificar se arquivo é `.tsx` e está em `src/` (conteúdo do Vite)
```bash
# ✅ Certo
frontend/src/components/ui/Button.tsx

# ❌ Errado
frontend/components/ui/Button.tsx
```

### Problema: Dark mode não funciona
**Solução**: Garantir que CSS Custom Properties estão definidas em `theme/tokens/`
```css
/* Sempre definir para light + dark */
:root {
  --text-primary: #0F172A;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #F9FAFB;
  }
}
```

### Problema: TypeScript error "Props type is implicit"
**Solução**: Exportar interface junto ao componente
```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
}

export function Button({ variant = "default", ...props }: ButtonProps) {
  // ...
}
```

---

## 🎓 Exemplos Completos

### Form Component
```typescript
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className={cn(required && "after:content-['*'] after:ml-1 after:text-red-500")}>
        {label}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
```

### Custom Hook (useTheme)
```typescript
import { useEffect, useState } from "react"

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setTheme(isDark ? "dark" : "light")
  }, [])

  return { theme, isDark: theme === "dark" }
}
```

---

## 📚 Referências Rápidas

- **Tailwind Color Classes**: https://tailwindcss.com/docs/customizing-colors
- **shadcn/ui Components**: https://ui.shadcn.com/docs/components/
- **Radix UI Primitives**: https://www.radix-ui.com/docs/
- **React TypeScript**: https://react-typescript-cheatsheet.netlify.app/
- **Watink Docs**: `/docs/`

---

**Mantido por**: Equipe Watink  
**Última revisão**: 13 de junho de 2026  
**Status**: Produção (v2.0-beta)

**IMPORTANTE**: Estas são as ÚNICAS regras válidas para agentes de IA no projeto Watink. Qualquer desvio deve ser escalado para revisão humana.
