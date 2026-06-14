Botão de ação principal da UI Watink — baseado em shadcn/ui (Radix Slot + Tailwind CSS).

### Exemplo de Uso (TypeScript)

```tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// CTA principal (padrão)
<Button variant="default" size="default">Entrar</Button>

// Secundário outlined
<Button variant="outline">Cancelar</Button>

// Com ícone (usando composição flex)
<Button variant="default">
  <Plus className="mr-2 h-4 w-4" /> Nova Conversa
</Button>

// Ação destrutiva
<Button variant="destructive" size="sm">Excluir</Button>

// Composição polimórfica (asChild) - transforma o Button no link mantendo estilos
<Button asChild variant="link">
  <a href="/login">Já tenho conta</a>
</Button>
```

### Definições de Props (TypeScript)

O componente estende `React.ButtonHTMLAttributes<HTMLButtonElement>` e as variantes do `class-variance-authority`.

| Prop | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `variant` | `default` \| `destructive` \| `outline` \| `secondary` \| `ghost` \| `link` | `default` | Estilo visual do botão. |
| `size` | `default` \| `sm` \| `lg` \| `icon` | `default` | Dimensões do botão. `icon` é quadrado (1:1). |
| `asChild` | `boolean` | `false` | Se verdadeiro, o botão renderiza o filho direto (via Radix UI Slot). Útil para `Link` do Next/Router. |
| `className` | `string` | - | Classes Tailwind adicionais para customização atômica. |

### Padrões de Composição shadcn/ui

1. **Sem Props de Ícone:** Diferente da versão legada, não usamos props `icon` ou `trailingIcon`. Use a composição natural do React: `<Button><Icon /> Texto</Button>`.
2. **Polimorfismo:** Utilize a prop `asChild` quando precisar integrar com componentes de navegação ou wraps sem adicionar tags `button` extras no DOM.
3. **Tokens HSL:** As cores são consumidas via `hsl(var(--primary))`, permitindo suporte nativo a Dark Mode e temas sem alteração de classes.
