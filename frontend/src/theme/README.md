# Sistema de Tokens — Watink Design System v2

Tokens CSS Custom Properties em 3 camadas. Fonte canônica: `docs/frontend/design-system.md`.

## Estrutura de Arquivos

```
theme/
  tokens/
    colors.css      → Tokens primitivos + semânticos de cor (HSL raw)
    typography.css  → Font families, sizes, weights, line-heights
    spacing.css     → Espaçamento, radius, tokens de componentes (button, input, nav, message)
    motion.css      → Durations, easings, transitions
  bridge.css        → Mapeia tokens Watink para variáveis CSS esperadas pelo shadcn/ui
  loader.js         → Injeta variações de tema em runtime (8 variantes)
  index.ts          → Re-exporta TOKEN_MAP e useThemeTokens
```

## As 3 Camadas

| Camada | Onde | Exemplo |
|---|---|---|
| **Primitivos** | `tokens/colors.css` (topo) | `--watink-blue-500: 211 100% 50%` |
| **Semânticos** | `tokens/colors.css` (por tema) | `--action-primary: var(--watink-blue-500)` |
| **Componente** | `tokens/spacing.css` | `--button-primary-bg: hsl(var(--action-primary))` |

## Como Usar nos Componentes

```tsx
// ✅ Token semântico via Tailwind arbitrary value
<div className="bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]" />

// ✅ Token de componente via CSS var
<button className="bg-[var(--button-primary-bg)]" />

// ✅ Hook para acesso programático
import { useThemeTokens } from "@/hooks/useThemeTokens";
const { colors, button } = useThemeTokens();

// ❌ PROIBIDO — hex hardcoded
<div style={{ color: "#007AFF" }} />

// ❌ PROIBIDO — @material-ui (removido do projeto)
// import { makeStyles } from "@material-ui/core";
```

## Temas Dinâmicos

`loader.js` injeta 8 variantes em runtime via `document.documentElement.style.setProperty`:

| Variante | Base |
|---|---|
| apple-light / apple-dark | Estilo iOS clean |
| google-light / google-dark | Material Design adaptado |
| whatsapp-light / whatsapp-dark | Paleta WhatsApp |
| saas-light / saas-dark | Corporate SaaS |

O tema atual é controlado por `useThemeContext()` e persistido em `localStorage`.

## bridge.css

Mapeia os tokens semânticos do Watink para as variáveis CSS esperadas pelo shadcn/ui (`--background`, `--primary`, `--card`, etc.). **Não é um bridge MUI** — MUI foi removido do projeto em jun/2026 (ADR 0008).

## Adicionando Tokens

1. Adicione o valor primitivo (se necessário) no topo de `tokens/colors.css`
2. Mapeie o token semântico para todos os 8 temas no mesmo arquivo
3. Se for token de componente, adicione em `tokens/spacing.css`
4. Atualize `TOKEN_MAP` em `hooks/useThemeTokens.ts`
5. Use `hsl(var(--novo-token))` em classes Tailwind arbitrary ou `var(--novo-token)` em CSS vars diretas
