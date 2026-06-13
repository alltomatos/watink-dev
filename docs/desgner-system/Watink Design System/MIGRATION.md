# Migração: MUI v4 → shadcn/ui + Tailwind CSS

## Status da Migração

Este sistema de design foi originalmente construído com **Material-UI v4** e está agora em transição para **shadcn/ui + Tailwind CSS** (branch `tinker/ui-and-di-refactor`).

### Stack Anterior (main)
- React 17 + Material-UI v4
- MakeStyles para CSS-in-JS
- Temas MUI Bridge customizados
- 308 CSS tokens em variáveis

### Stack Novo (tinker/ui-and-di-refactor)
- React 18.3.1
- **Tailwind CSS v4.3.0** (PostCSS)
- **shadcn/ui** (componentes acessíveis, unstyled)
- **Radix UI** (primitivos: Dialog, Popover, Select, Tooltip, Label)
- **Lucide React** (ícones em SVG, substitui Material Icons)
- Vite (bundler, replaces webpack)

### Benefícios da Migração

✅ **Melhor Performance**
- Tailwind CSS gera CSS mínimo (~30KB gzipped vs ~80KB MUI)
- Vite oferece reload instantâneo em dev (Hot Module Replacement)
- Componentes shadcn/ui são zero-dependency

✅ **Maior Controle**
- Propriedade do código dos componentes (copiar e customizar via `npx shadcn-ui@latest add`)
- Sem dependência em atualizações MUI que quebram compatibilidade
- Fácil audit de estilos (tudo em CSS/Tailwind)

✅ **Acessibilidade**
- Radix UI fornece primitivos WAI-ARIA out-of-the-box
- Melhor suporte a teclado, leitores de tela, e contraste

✅ **DX (Desenvolvedor Experience)**
- Utility-first CSS é mais rápido para prototipar
- Sem CSS-in-JS runtime overhead
- Componentes shadcn/ui são copy-paste (não npm packages)

---

## Configuração Tailwind

### Arquivo `tailwind.config.js`
Define cores via **CSS custom properties (HSL)** que mapeiam para as variáveis em `index.css`:

```js
colors: {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  destructive: "hsl(var(--destructive))",
  border: "hsl(var(--border))",
  // ... etc
}
```

### Arquivo `src/index.css`
Define os valores das variáveis no `:root`:

```css
:root {
  --background: 0 0% 100%;      /* branco */
  --foreground: 0 0% 3.9%;      /* quase preto */
  --primary: 0 0% 9%;           /* cinza escuro */
  --destructive: 0 84.2% 60.2%; /* vermelho */
  --radius: 0.5rem;             /* border-radius padrão */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    /* ... dark mode values */
  }
}
```

### Como Customizar Cores

1. **Editar `src/index.css`** — mude os valores HSL das variáveis CSS
2. **Adicionar novos tokens** — defina uma variável nova e referencie em `tailwind.config.js`
3. **Usar em componentes** — `className="text-primary bg-secondary border border-border"`

---

## Componentes shadcn/ui Atualizados

| Componente | Arquivo | Primitivo | Notas |
|---|---|---|---|
| `Button` | `ui/button.jsx` | — | Variantes: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` |
| `Card` | `ui/card.jsx` | — | Wrapper com `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` |
| `Dialog` | `ui/dialog.jsx` | Radix Dialog | Modal com trigger, content, footer, overlay |
| `Input` | `ui/input.jsx` | — | Input HTML com estilos Tailwind |
| `Label` | `ui/label.jsx` | Radix Label | Label com suporte a acessibilidade |
| `Skeleton` | `ui/skeleton.jsx` | — | Loading placeholder animado |

### Como Adicionar Componentes

```bash
# No diretório frontend/
npx shadcn-ui@latest add [component-name]
```

Exemplo:
```bash
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
```

---

## Ícones: Lucide React

O novo stack usa **Lucide React** em vez de Material Icons:

```jsx
import { CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

<CheckCircle className="w-5 h-5 text-green-600" />
<AlertCircle className="w-4 h-4 text-red-500" />
<ChevronRight className="w-6 h-6" />
```

**Vantagens:**
- Biblioteca de ícones moderna e completa
- Exportados como componentes React (não fonte de ícone)
- Fácil customizar cor/tamanho via props

**Documentação:** https://lucide.dev

---

## Próximas Prioridades

### 1. ⚠️ Substituir Componentes Legados
- [ ] `BaseCard` → shadcn `Card` + Tailwind
- [ ] `MetricCard` → Card + Grid de Tailwind
- [ ] `StatusChip` → Badge customizado + Tailwind
- [ ] `MessageInput` → Formulário com shadcn components
- [ ] Sidebar + AppBar → Tailwind layout

### 2. 📦 Consolidar Sistema de Design
- [ ] Criar `ui/badge.jsx` para status badges
- [ ] Criar `ui/avatar.jsx` para perfis de usuário
- [ ] Criar `ui/sheet.jsx` para drawers (baseado em Radix)
- [ ] Documentar padrões de composição Tailwind

### 3. 🎨 Temas
- [ ] Implementar tema escuro via `dark:` classes
- [ ] Suportar `data-theme="dark"` no HTML root
- [ ] CSS variables fallback para navegadores antigos

### 4. ♿ Acessibilidade
- [ ] Audit de WCAG 2.1 AA
- [ ] Testar navegação por teclado (Tab, Enter, Esc)
- [ ] Verificar contraste de cores
- [ ] Adicionar ARIA labels em componentes interativos

---

## Referências

- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Radix UI:** https://radix-ui.com
- **Lucide Icons:** https://lucide.dev
