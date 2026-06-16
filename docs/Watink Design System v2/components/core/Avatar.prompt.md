Avatar circular de usuário — foto com fallback de iniciais coloridas e ponto opcional de status online/offline. Use em itens da lista de tickets, cabeçalhos de mensagem, menus de usuário, drawers de contato e listas de atendentes.

```tsx
import { Avatar } from "@/components/ui/avatar";

// Com foto
<Avatar src="/perfil.jpg" name="Ana Lima" size="md" />

// Fallback de iniciais (cor determinística por nome)
<Avatar name="Carlos Mendes" size="lg" />

// Com status de presença
<Avatar name="Beatriz" size="md" online={true}  />
<Avatar name="Rafael"  size="md" online={false} />

// Tamanhos
<Avatar name="A" size="xs" />  {/* h-6 w-6 — 24px */}
<Avatar name="A" size="sm" />  {/* h-8 w-8 — 32px */}
<Avatar name="A" size="md" />  {/* h-10 w-10 — 40px — padrão */}
<Avatar name="A" size="lg" />  {/* h-12 w-12 — 48px */}
<Avatar name="A" size="xl" />  {/* h-16 w-16 — 64px */}
```

**Comportamento notável:**
- `src` + `name`: exibe imagem, cai para iniciais se a imagem falhar ao carregar
- Iniciais são as primeiras letras das duas primeiras palavras, em maiúsculas (ex: "Carlos Mendes" → "CM")
- Cores de fallback: 5 paletas (blue, emerald, amber, violet, red) — determinísticas por hash do nome
- Ponto `online` usa `var(--status-success)` — adapta ao dark mode automaticamente
- Ponto posicionado no canto inferior direito com `border-2 border-[var(--bg-surface)]` para sobreposição limpa

**Arquivo**: `frontend/src/components/ui/avatar.tsx`  
**Regra**: NUNCA importar de `@material-ui/core`. Sempre usar este Avatar do DS v2.
