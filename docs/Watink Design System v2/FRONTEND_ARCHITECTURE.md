# Arquitetura Frontend — Watink Design System v2

**Status**: ✅ shadcn/ui + Tailwind CSS + React 18 em produção
**Última atualização**: 15 de junho de 2026
**Versão**: 2.0-beta (Revisão 2)

---

## 1. Overview Arquitetural

### Stack Atual
```
React 18 + TypeScript
    ↓
Vite (build tool)
    ↓
Tailwind CSS v4 + shadcn/ui (Radix headless)
    ↓
CSS Custom Properties (tokens)
    ↓
@index.css (Tailwind directives)
```

### Estrutura de Diretórios
```
frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui + custom Tailwind (NOVO)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   └── ... (todos os componentes Radix)
│   ├── legacy/                # MUI v4 components (READ-ONLY)
│   │   └── ... (manter para compatibilidade)
│   ├── composite/             # Componentes de negócio compostos
│   │   ├── ChatWindow.tsx
│   │   ├── TicketCard.tsx
│   │   ├── FlowBuilder/
│   │   └── ...
│   └── patterns/              # Padrões reutilizáveis
│       ├── Forms/
│       ├── Tables/
│       └── Modals/
├── hooks/                     # Custom React hooks
├── lib/
│   ├── utils.ts              # cn() helper + utilitários
│   ├── constants.ts          # Constantes da aplicação
│   └── validators.ts         # Validações
├── theme/
│   ├── tokens/               # Fonte de verdade para design
│   │   ├── primitives.css    # Valores brutos (hard-coded uma vez)
│   │   ├── semantic.css      # Aliasing semântico
│   │   ├── typography.css    # Font sizes, weights, families
│   │   └── components.css    # Tokens específicos de componentes
│   ├── light.css             # Modo claro (variáveis CSS)
│   └── dark.css              # Modo escuro (variáveis CSS)
├── pages/                    # Rotas principais
├── context/                  # React Context (auth, tema, etc.)
├── services/                 # API calls, business logic
├── helpers/                  # Utility functions (formatters, converters)
├── types/                    # TypeScript interfaces/types
├── utils/                    # Utilidades (formatação, validação)
└── index.css                 # Entry point Tailwind + tema

```

---

## 2. Design Tokens (Single Source of Truth)

### Hierarquia 3-Camadas

#### Camada 1: Primitivos (hardcoded)
**Arquivo:** `src/theme/tokens/primitives.css`

Valores brutos, nunca usados diretamente em componentes. Exemplo:
```css
:root {
  /* Azul (Primária) */
  --color-blue-50: #E3F2FD;
  --color-blue-100: #BBDEFB;
  --color-blue-500: #1A73E8;
  --color-blue-600: #0063E6;
  --color-blue-900: #0A246A;
  
  /* Neutro (Cinza) */
  --color-slate-50: #F8FAFC;
  --color-slate-500: #64748B;
  --color-slate-900: #0F172A;
  
  /* Status */
  --color-emerald-500: #10B981;
  --color-red-500: #EF4444;
  --color-amber-500: #F59E0B;
}

/* Modo Escuro */
@media (prefers-color-scheme: dark) {
  :root {
    --color-blue-50: #0D1F3C;
    --color-slate-900: #F9FAFB;
  }
}
```

#### Camada 2: Semântico (aliasing)
**Arquivo:** `src/theme/tokens/semantic.css`

Nomes significativos para contexto:
```css
:root {
  /* Backgrounds */
  --bg-default: var(--color-slate-50);
  --bg-surface: white;
  --bg-surface-alt: var(--color-slate-100);
  --bg-muted: var(--color-slate-200);
  
  /* Text */
  --text-primary: var(--color-slate-900);
  --text-secondary: var(--color-slate-600);
  --text-muted: var(--color-slate-500);
  
  /* Actions */
  --action-primary: var(--color-blue-500);
  --action-primary-hover: var(--color-blue-600);
  --action-danger: var(--color-red-500);
  --action-success: var(--color-emerald-500);
  
  /* Status */
  --status-success: var(--color-emerald-500);
  --status-error: var(--color-red-500);
  --status-warning: var(--color-amber-500);
  --status-info: var(--color-blue-500);
  
  /* Borders */
  --border-default: var(--color-slate-200);
  --border-strong: var(--color-slate-300);
  --border-subtle: var(--color-slate-100);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-default: var(--color-slate-950);
    --bg-surface: var(--color-slate-800);
    --text-primary: var(--color-slate-100);
    --text-secondary: var(--color-slate-400);
  }
}
```

#### Camada 3: Componentes (específicos)
**Arquivo:** `src/theme/tokens/components.css`

Tokens para componentes específicos:
```css
/* Button Component */
:root {
  --button-primary-bg: var(--action-primary);
  --button-primary-text: white;
  --button-primary-hover: var(--action-primary-hover);
  
  --button-secondary-bg: var(--bg-surface-alt);
  --button-secondary-text: var(--text-primary);
  
  --button-danger-bg: var(--action-danger);
  --button-danger-text: white;
}

/* Card Component */
:root {
  --card-bg: var(--bg-surface);
  --card-border: var(--border-default);
  --card-shadow: var(--shadow-md);
  --card-radius: 12px;
}

/* Input Component */
:root {
  --input-bg: var(--bg-surface);
  --input-border: var(--border-default);
  --input-border-focus: var(--action-primary);
  --input-radius: 8px;
}

/* Modal Component */
:root {
  --modal-bg: var(--bg-surface);
  --modal-overlay: rgba(0, 0, 0, 0.5);
  --modal-radius: 16px;
}
```

#### Tipografia
**Arquivo:** `src/theme/tokens/typography.css`

```css
:root {
  /* Font Families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  
  /* Font Sizes */
  --text-xs: 0.6875rem;    /* 11px */
  --text-sm: 0.75rem;      /* 12px */
  --text-body-sm: 0.8125rem; /* 13px */
  --text-body: 0.9375rem;  /* 15px */
  --text-lg: 1rem;         /* 16px */
  --text-xl: 1.125rem;     /* 18px */
  --text-2xl: 1.25rem;     /* 20px */
  --text-3xl: 1.5rem;      /* 24px */
  --text-4xl: 1.75rem;     /* 28px */
  
  /* Font Weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-extrabold: 800;
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}
```

### Importação no Tailwind
**Arquivo:** `tailwind.config.js`

```javascript
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        /* ... demais cores do Tailwind ... */
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## 3. Padrões de Componentes shadcn/ui

### Anatomia Base (Button)
**Arquivo:** `src/components/ui/button.tsx`

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Helper `cn()` — clsx + tailwind-merge
**Arquivo:** `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 4. Padrões de Composição (Composite Components)

### Exemplo: ChatWindow
**Arquivo:** `src/components/composite/ChatWindow.tsx`

```typescript
import React, { useCallback, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

interface ChatWindowProps {
  messages: Message[]
  onSendMessage: (text: string) => Promise<void>
  className?: string
}

export function ChatWindow({ messages, onSendMessage, className }: ChatWindowProps) {
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async () => {
    if (!input.trim()) return

    setIsLoading(true)
    try {
      await onSendMessage(input)
      setInput("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2",
              msg.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-xs px-4 py-2 rounded-lg",
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 flex gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading} size="icon">
          {isLoading ? "..." : "→"}
        </Button>
      </div>
    </Card>
  )
}
```

---

## 5. Padrões de Formulário

### Form Component Pattern
**Arquivo:** `src/components/patterns/Forms/FormField.tsx`

```typescript
import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label className={required ? "after:content-['*'] after:ml-1 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      {children}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}
```

---

## 6. Dark Mode

### Implementação CSS Custom Properties

**Arquivo:** `src/index.css`

```css
@import url("./theme/tokens/primitives.css");
@import url("./theme/tokens/semantic.css");
@import url("./theme/tokens/typography.css");
@import url("./theme/tokens/components.css");

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Light Mode (padrão) */
:root {
  color-scheme: light;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
  }
}

/* Class-based Dark Mode (para toggle) */
[data-theme="dark"] {
  color-scheme: dark;
}

html {
  @apply font-sans;
}

body {
  @apply bg-background text-foreground;
  transition: background-color 0.3s, color 0.3s;
}
```

---

## 7. Regras Estritas para Agentes de IA

### ✅ FAÇA

1. **Use Tailwind utilities** — `className="flex gap-4 p-2 rounded-lg bg-primary"`
2. **Use `cn()` helper** — `className={cn("base-class", condition && "conditional-class")}`
3. **Use shadcn/ui componentes** — `<Button variant="outline">Clique aqui</Button>`
4. **Use CSS Custom Properties** — `style={{ color: "var(--text-primary)" }}`
5. **Use tipos TypeScript** — Todos os componentes `.tsx` com interfaces explícitas
6. **Componentes são diretos** — Sem wrapper desnecessários
7. **Reutilize padrões** — Forms, Tables, Modals já têm padrão em `src/components/patterns/`

### ❌ NÃO FAÇA

1. **Não use hardcoded hex colors** — `#1A73E8` ❌ | `var(--action-primary)` ✅
2. **Não use `makeStyles()` do MUI** — Tailwind utilities apenas
3. **Não importe de `@material-ui/core`** — Componentes novos usam shadcn/ui
4. **Não crie variáveis CSS novas** — Use tokens existentes em `theme/tokens/`
5. **Não use inline styles** — Tailwind classes + `cn()` helper
6. **Não crie componentes sem interface TypeScript**
7. **Não omita tratamento de erros** — sempre use `try/catch` em async

---

## 8. Checklist de Migração (MUI v4 → shadcn/ui)

**Ao criar novo componente ou editar existente:**

- [ ] Arquivo é `.tsx` (TypeScript)?
- [ ] Importa de `src/components/ui/` (shadcn)?
- [ ] Exporta interface TypeScript para props?
- [ ] Usa `cn()` helper para classes condicionais?
- [ ] Usa CSS Custom Properties para cores (`var(--...)`)?
- [ ] Validado contra ESLint (no hardcoded colors)?
- [ ] Tem exemplo de uso em comentários ou stories?
- [ ] Testes existem ou foram criados?

---

## 9. Estrutura de Exemplo: Página Completa

**Arquivo:** `src/pages/Dashboard/index.tsx`

```typescript
import React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatWindow } from "@/components/composite/ChatWindow"
import { FormField } from "@/components/patterns/Forms/FormField"
import { cn } from "@/lib/utils"
import { getTickets } from "@/services/api"

export function DashboardPage() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-extrabold text-foreground">Dashboard</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Filtros</h2>
              <FormField label="Pesquisar">
                <Input placeholder="Digite..." />
              </FormField>
              <Button className="w-full mt-4">Aplicar</Button>
            </Card>
          </aside>

          {/* Content */}
          <section className="md:col-span-2 space-y-4">
            {isLoading ? (
              <Card className="p-4 text-center text-muted-foreground">
                Carregando...
              </Card>
            ) : tickets?.length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground">
                Nenhum ticket encontrado
              </Card>
            ) : (
              tickets?.map((ticket) => (
                <Card key={ticket.id} className="p-4">
                  <h3 className="font-semibold">{ticket.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {ticket.description}
                  </p>
                </Card>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
```

---

## 10. Recursos & Referências

- **shadcn/ui Docs**: https://ui.shadcn.com/
- **Radix UI**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Class Variance Authority**: https://cva.style/
- **Watink CLAUDE.md**: Regras de engenharia e arquitetura do projeto

---

**Última revisão**: 13 de junho de 2026  
**Mantido por**: Equipe Watink
