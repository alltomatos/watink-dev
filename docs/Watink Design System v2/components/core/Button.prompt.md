Botão de ação do Watink Design System — baseado no shadcn/ui `Button` com variantes Tailwind via CVA.

```tsx
import { Button } from "@/components/ui/button";

// Variantes disponíveis
<Button variant="default">Entrar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Navegar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="secondary">Secundário</Button>
<Button variant="link">Link</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="default">Médio</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><PlusIcon className="h-4 w-4" /></Button>

// Com ícone (padrão Lucide)
<Button>
  <PlusIcon className="mr-2 h-4 w-4" />
  Nova Conversa
</Button>

// Estado desabilitado
<Button disabled>Ação Desabilitada</Button>

// Loading state (padrão)
<Button disabled aria-busy>
  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
  Aguarde...
</Button>
```

**Regras de uso (DS v2):**
- NUNCA usar `@material-ui/core/Button`
- NUNCA hardcoded hex color via `style={{}}`
- Usar `variant="destructive"` para ações de exclusão (não `variant="danger"`)
- Acessibilidade: `aria-label` quando o botão só tem ícone
- Arquivo: `frontend/src/components/ui/button.tsx`
- Referência completa: `docs/Watink Design System v2/AI_AGENT_INSTRUCTIONS.md`
