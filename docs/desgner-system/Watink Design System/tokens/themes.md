# Watink Design System — Variações de Tema

**Versão**: 2.0  
**Atualizado**: 2026-06-13  
**Implementação**: `frontend/src/theme/loader.js`

---

## Arquitetura de Temas

O Watink suporta **4 famílias visuais × 2 modos** = 8 variantes totais.

```
apple     × light / dark   → iOS-inspired, blue-centric
google    × light / dark   → Material Design, colorful nav icons
whatsapp  × light / dark   → Classic WhatsApp Web palette
saas      × light / dark   → Enterprise SaaS, dark sidebar
```

Os temas são injetados em runtime via `applyThemeTokens({ appTheme, mode })` no `loader.js`, sobrescrevendo CSS Custom Properties em `:root`.

---

## Como Aplicar

```js
import { applyThemeTokens } from '@/theme/loader';

// Mudar para WhatsApp dark
applyThemeTokens({ appTheme: 'whatsapp', mode: 'dark' });

// Com brand overrides (white-label)
applyThemeTokens({
  appTheme: 'saas',
  mode: 'light',
  brand: {
    primary: '#FF6B00',        // Cor principal da marca cliente
    primaryHover: '#E55A00',
    sidebarBg: '#1A0A2E',
  },
});
```

---

## Família Apple (padrão)

| Token | Light | Dark |
|-------|-------|------|
| `--bg-default` | `240 24% 96%` | `0 0% 0%` |
| `--bg-surface` | `0 0% 100%` | `240 3% 11%` |
| `--action-primary` | `211 100% 50%` | `210 100% 52%` |
| `--bg-sidebar` | `240 11% 96%` | `240 3% 11%` |

**Identidade**: Limpo, minimalista. Inspirado no iOS System UI. Sidebar clara no light, preta no dark.

---

## Família WhatsApp

| Token | Light | Dark |
|-------|-------|------|
| `--bg-default` | `32 28% 90%` | `204 41% 7%` |
| `--bg-surface` | `0 0% 100%` | `203 25% 16%` |
| `--action-primary` | `142 70% 49%` | `142 70% 49%` |
| `--bg-appbar` | `173 86% 20%` | `203 25% 16%` |
| `--message-right-bg` | `94 78% 87%` | `169 100% 18%` |

**Identidade**: Fundo bege característico, teal do WhatsApp como cor primária, bolhas verdes.

---

## Família Google

| Token | Light | Dark |
|-------|-------|------|
| `--bg-default` | `210 17% 98%` | `225 6% 13%` |
| `--bg-surface` | `0 0% 100%` | `220 3% 18%` |
| `--action-primary` | `214 82% 51%` | `217 89% 76%` |
| `--nav-icon-blue` | `214 82% 51%` | `217 89% 76%` |
| `--nav-icon-purple` | `256 100% 65%` | `262 100% 77%` |

**Identidade**: Ícones coloridos na sidebar (azul, roxo, verde, laranja, vermelho). Superfícies neutras.

---

## Família SaaS

| Token | Light | Dark |
|-------|-------|------|
| `--bg-default` | `210 40% 96%` | `222 47% 11%` |
| `--bg-sidebar` | `222 47% 11%` | `222 47% 11%` | ← sidebar sempre escura
| `--action-primary` | `221 83% 53%` | `213 94% 68%` |
| `--text-sidebar` | `213 27% 84%` | `213 27% 84%` |

**Identidade**: Enterprise. Sidebar escura em ambos os modos (padrão de dashboards B2B). Azul corporativo.

---

## Tokens Universais (todos os temas)

Alguns tokens não variam por tema — são definidos na camada `base` do `semantic.js`:

| Token | Valor |
|-------|-------|
| `--status-success` | Emerald 500 |
| `--status-error` | Red 500 |
| `--status-warning` | Amber 500 |
| `--status-info` | Blue 500 |
| `--whatsapp-brand` | `142 70% 49%` |
| `--ease-out` | `cubic-bezier(0.0, 0, 0.2, 1)` |
| `--duration-normal` | `200ms` |

---

## Brand Overrides (White-label)

Para clientes com identidade própria, 3 tokens podem ser sobrescritos em runtime:

| Prop | Mapeia para |
|------|-------------|
| `brand.primary` | `--action-primary` |
| `brand.primaryHover` | `--action-primary-hover` |
| `brand.sidebarBg` | `--bg-sidebar` |

Os valores podem ser hex (convertidos para HSL internamente) ou HSL string.

---

## Adicionando um Novo Tema

1. Criar objeto no `semantic.js`: `export const newThemeLight = { ...base, ... }`
2. Registrar em `presets` no `loader.js`
3. Adicionar tokens ao `colors.css` do DS v2 se necessário
4. Atualizar este documento
