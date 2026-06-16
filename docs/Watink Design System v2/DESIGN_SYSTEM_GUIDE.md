# Guia de Design System — Watink v2.0

**Para: Agentes de IA (Claude Code, Cursor, etc.)**  
**Status**: Ativo em produção  
**Versão**: 2.0-beta  
**Data**: 15 de junho de 2026 (Revisão 2)

---

## 1. Paleta de Cores (Single Source of Truth)

### Primitivos (Nunca usar diretamente)
```
AZUL (Primária):
  --color-blue-50:   #E3F2FD
  --color-blue-100:  #BBDEFB
  --color-blue-200:  #90CAF9
  --color-blue-300:  #64B5F6
  --color-blue-400:  #42A5F5
  --color-blue-500:  #1A73E8  ← Brand primary
  --color-blue-600:  #0063E6
  --color-blue-700:  #1565C0
  --color-blue-800:  #0D47A1
  --color-blue-900:  #0A246A

NEUTRO (Cinza):
  --color-slate-50:   #F8FAFC
  --color-slate-100:  #F1F5F9
  --color-slate-200:  #E2E8F0
  --color-slate-300:  #CBD5E1
  --color-slate-400:  #94A3B8
  --color-slate-500:  #64748B
  --color-slate-600:  #475569
  --color-slate-700:  #334155
  --color-slate-800:  #1E293B
  --color-slate-900:  #0F172A
  --color-slate-950:  #020617

STATUS:
  --color-emerald-500:  #10B981 (Sucesso ✓)
  --color-red-500:      #EF4444 (Erro ✕)
  --color-amber-500:    #F59E0B (Aviso ⚠)
```

### Semântico (Usar SEMPRE estes)
```
BACKGROUNDS:
  --bg-default:       Fundo de página         (slate-50 light / slate-950 dark)
  --bg-surface:       Cards, modais           (white / slate-800)
  --bg-surface-alt:   Listas, linhas          (slate-100 / slate-900)
  --bg-muted:         Backgrounds desativados (slate-200 / slate-700)

TEXT:
  --text-primary:     Corpo principal         (slate-900 / slate-100)
  --text-secondary:   Subtítulos, meta        (slate-600 / slate-400)
  --text-muted:       Desativado, faded       (slate-500 / slate-500)

ACTIONS:
  --action-primary:   Botões, links ativos   (blue-500)
  --action-primary-hover: Hover estado       (blue-600)
  --action-danger:    Delete, critical       (red-500)
  --action-success:   Confirmar, OK          (emerald-500)

BORDERS:
  --border-default:   Padrão para inputs     (slate-200 / slate-700)
  --border-strong:    Dividers, separadores  (slate-300 / slate-600)
  --border-subtle:    Fundo baixo contraste  (slate-100 / slate-800)

SHADOWS:
  --shadow-sm:    0 1px 2px 0 rgba(0,0,0,0.05)
  --shadow-md:    0 4px 6px -1px rgba(0,0,0,0.1)
  --shadow-lg:    0 10px 15px -3px rgba(0,0,0,0.1)
  --shadow-xl:    0 20px 25px -5px rgba(0,0,0,0.1)
```

---

## 2. Componentes Base (shadcn/ui)

Todos em `src/components/ui/*.tsx` com Tailwind + Radix.

### Button
```tsx
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Danger</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Desativado</Button>
```

### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Subtítulo</CardDescription>
  </CardHeader>
  <CardContent>Conteúdo</CardContent>
  <CardFooter>Rodapé</CardFooter>
</Card>
```

### Input, Select, Textarea
```tsx
<Input placeholder="Texto..." type="email" />
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Escolha..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Opção 1</SelectItem>
  </SelectContent>
</Select>
<Textarea placeholder="Digite..." />
```

### Dialog (Modal)
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título Modal</DialogTitle>
    </DialogHeader>
    Conteúdo aqui
    <DialogFooter>
      <Button>Fechar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Tabs
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Aba 1</TabsTrigger>
    <TabsTrigger value="tab2">Aba 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Conteúdo 1</TabsContent>
  <TabsContent value="tab2">Conteúdo 2</TabsContent>
</Tabs>
```

### Badge/Status Indicator
```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Danger</Badge>
<Badge variant="outline">Outline</Badge>
```

---

## 3. Padrões Tailwind CSS

### Layout Flexbox
```tsx
// Horizontal
<div className="flex gap-4 items-center">
  <Item />
  <Item />
</div>

// Vertical
<div className="flex flex-col gap-4">
  <Item />
  <Item />
</div>

// Justify
<div className="flex justify-between items-center">
</div>
```

### Grid
```tsx
<div className="grid grid-cols-3 gap-4">
  <Item />
  <Item />
  <Item />
</div>

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Spacing (Padding/Margin)
```
p-2  = padding 8px
p-4  = padding 16px
p-6  = padding 24px
p-8  = padding 32px

mx-auto = margin horizontal auto
mt-4 = margin-top 16px
gap-4 = gap 16px (flex/grid)
```

### Tamanhos
```
w-full      = width 100%
h-screen    = height 100vh
max-w-2xl   = max-width 672px
min-h-screen = min-height 100vh
```

### Cores
```tsx
// Backgrounds
bg-background
bg-primary
bg-secondary
bg-muted
bg-destructive

// Text
text-foreground
text-primary
text-secondary
text-muted-foreground

// Borders
border-default
border-primary
border-destructive
```

### Efeitos
```tsx
// Shadows
shadow-sm
shadow-md
shadow-lg
shadow-xl

// Opacity
opacity-50
opacity-75

// Rounded
rounded-lg
rounded-md
rounded-sm

// Transitions
transition-colors
transition-transform
hover:bg-accent
focus:outline-none focus:ring-2 focus:ring-ring
```

---

## 4. Checklist para Novos Componentes

**Antes de commitar:**

```
ESTRUTURA:
  [ ] Arquivo é .tsx (TypeScript)
  [ ] Localizado em src/components/ui/ ou src/components/composite/
  [ ] Exporta interface explícita para Props
  [ ] Usa React.forwardRef para componentes HTML

STYLING:
  [ ] Apenas Tailwind classes (sem inline styles, sem makeStyles)
  [ ] Usa cn() helper para classes condicionais
  [ ] Nenhum hardcoded hex color (#1A73E8 ❌)
  [ ] Nenhum import de @material-ui ❌
  [ ] Nenhum novo arquivo de CSS ou SCSS ❌

COMPONENTES:
  [ ] Reutiliza shadcn/ui bases quando possível
  [ ] Composição clara (children, slots)
  [ ] Props bem nomeadas e documentadas
  [ ] Suporta dark mode (inherit CSS Custom Properties)

ACESSIBILIDADE:
  [ ] aria-labels quando apropriado
  [ ] focus-visible para keyboard nav
  [ ] Contraste de cores >= 4.5:1 (WCAG AA)
  [ ] Nenhuma cor isolada como único indicador

TESTES:
  [ ] Componente renderiza sem erros
  [ ] Props variantes funcionam
  [ ] Keyboard navigation funciona (se interativo)
  [ ] Dark mode funciona
```

---

## 5. Exemplos Práticos

### ✅ Bom

```typescript
// src/components/composite/TicketCard.tsx
import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TicketCardProps {
  id: string
  title: string
  status: "open" | "closed" | "pending"
  priority: "low" | "medium" | "high"
  onClose?: () => void
  className?: string
}

export function TicketCard({
  id,
  title,
  status,
  priority,
  onClose,
  className,
}: TicketCardProps) {
  const statusColors = {
    open: "bg-emerald-50 text-emerald-800",
    closed: "bg-slate-50 text-slate-800",
    pending: "bg-amber-50 text-amber-800",
  }

  const priorityColors = {
    low: "border-blue-300",
    medium: "border-amber-300",
    high: "border-red-300",
  }

  return (
    <Card
      className={cn(
        "border-l-4",
        priorityColors[priority],
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge className={statusColors[status]}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### ❌ Ruim

```typescript
// ❌ Hardcoded colors
const TicketCard = ({ title, status }) => (
  <div style={{
    backgroundColor: "#ffffff",
    padding: "16px",
    border: "1px solid #e0e0e0",
    borderLeft: status === "open" ? "#10B981" : "#f44336",
    borderRadius: "8px"
  }}>
    <h3 style={{ color: "#0F172A", fontWeight: 700 }}>
      {title}
    </h3>
    <span style={{
      backgroundColor: status === "open" ? "#e8f5e9" : "#ffebee",
      padding: "4px 8px"
    }}>
      {status}
    </span>
  </div>
)

// ❌ Usando makeStyles (MUI v4)
const useStyles = makeStyles({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
  }
})

// ❌ Sem TypeScript
const TicketCard = ({ title, status, ...props }) => ...
```

---

## 6. Temas Google & WhatsApp (Opcional)

### Tema Google (Ícones de Navegação)
```css
/* Cores exclusivas para ícones de nav no tema Google */
--google-blue:   #1A73E8   /* Dashboard */
--google-green:  #1E8E3E   /* Tickets */
--google-orange: #E8710A   /* Contatos */
--google-yellow: #F9AB00   /* Filas */
--google-red:    #D93025   /* Config */
--google-purple: #7C4DFF   /* Flows */
--google-teal:   #00897B   /* WhatsApp */
```

**Uso**: Apenas para ícones de navegação em modo tema "google"
```tsx
const iconColor = appTheme === "google" ? {
  dashboard: "var(--google-blue)",
  tickets: "var(--google-green)",
  // ...
} : { ... }
```

### Tema WhatsApp (Bolhas)
```
--message-right-bg: #D1FAE5  /* Mensagens enviadas (verde) */
--message-left-bg:  #FFFFFF  /* Mensagens recebidas */
```

---

## 7. Regras de Ouro para Agentes

### ANTES de criar/editar arquivo:

1. **Ler FRONTEND_ARCHITECTURE.md** — contexto completo
2. **Ler o arquivo original** — se existir, entender padrão vigente
3. **Usar `cn()` para classes condicionais** — nunca concatenação string
4. **Nunca inventar variáveis CSS** — sempre usar tokens em `theme/tokens/`
5. **TypeScript obrigatório** — interfaces explícitas em Props
6. **Sem console.log em produção** — apenas em desenvolvimento

### DURANTE edição:

1. **Edições cirúrgicas** — `str_replace_edit` com blocos pequenos
2. **Nunca pseudocódigo** — código real e funcional
3. **Sempre testes antes de commitar** — renderização, dark mode, a11y
4. **Validar ESLint** — `npm run lint` deve passar

### DEPOIS de terminar:

1. **Screenshot em light + dark mode** — verificar visual
2. **Testar navegação** — teclado, mouse, touch
3. **Abrir DevTools** — verificar console (sem erros)
4. **Commit message clara** — `feat: novo TicketCard com Tailwind`

---

## 8. Estrutura de Pastas (Referência)

```
frontend/src/
├── components/
│   ├── ui/                          # shadcn/ui (Radix + Tailwind)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   ├── composite/                   # Componentes de negócio
│   │   ├── ChatWindow.tsx
│   │   ├── TicketCard.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── FlowBuilder/
│   │   │   ├── Canvas.tsx
│   │   │   ├── NodeEditor.tsx
│   │   │   └── ...
│   │   └── ...
│   ├── patterns/                    # Padrões reutilizáveis
│   │   ├── Forms/
│   │   │   ├── FormField.tsx
│   │   │   ├── FormSection.tsx
│   │   │   └── ...
│   │   ├── Tables/
│   │   │   └── DataTable.tsx
│   │   ├── Modals/
│   │   │   └── ConfirmDialog.tsx
│   │   └── ...
│   └── legacy/                      # MUI v4 (READ-ONLY)
│       └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useTheme.ts
│   └── ...
├── lib/
│   ├── utils.ts                     # cn() helper + utilitários
│   └── constants.ts
├── theme/
│   ├── tokens/
│   │   ├── primitives.css
│   │   ├── semantic.css
│   │   ├── typography.css
│   │   └── components.css
│   ├── light.css
│   └── dark.css
├── pages/
│   ├── Dashboard/
│   ├── Tickets/
│   ├── FlowBuilder/
│   └── ...
├── services/
│   ├── api.ts
│   ├── auth.ts
│   └── ...
├── types/
│   ├── index.ts
│   └── ...
└── index.css                        # Tailwind entry point
```

---

## 9. Links Rápidos

| Recurso | URL |
|---------|-----|
| shadcn/ui | https://ui.shadcn.com/ |
| Radix UI | https://www.radix-ui.com/ |
| Tailwind CSS | https://tailwindcss.com/ |
| Class Variance Authority | https://cva.style/ |
| Lucide Icons | https://lucide.dev/ |
| React Query | https://tanstack.com/query/latest |
| TypeScript Handbook | https://www.typescriptlang.org/docs/ |

---

**Mantido por**: Equipe Watink  
**Última atualização**: 13 de junho de 2026  
**Status de Migração**: shadcn/ui + Tailwind CSS em produção
