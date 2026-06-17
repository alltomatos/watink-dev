# Frontend Design System

## Stack (jun/2026)

**React 18 + TypeScript + Tailwind v4 + shadcn/ui + Vite**. MUI v4 removido. Novos componentes exclusivamente em `.tsx` + shadcn/ui.

## Estrutura de Diretórios

```
frontend/src/
  components/
    ui/              → componentes shadcn/ui (.tsx)
  lib/
    utils.ts         → cn() helper (clsx + tailwind-merge)
  theme/
    tokens/
      primitives.ts  → paleta base em hex (NUNCA usada direto em componentes)
      semantic.ts    → tokens com significado, exportados para o loader
      components.ts  → tokens de componentes (radius, spacing, card…)
    bridge.css       → mapeia tokens semânticos → vars shadcn/ui (--primary, --border…)
    loader.js        → injeta tokens semânticos como CSS vars em HSL cru no :root em runtime
    tokens/colors.css → fallback estático dos tokens semânticos em HSL cru
  index.css
    @theme inline    → registra --color-* para Tailwind gerar bg-*, text-*, border-* utilities
    @layer base      → --radius, --color-* (hsl resolvido para uso em style={{}})
```

## Arquitetura de Tokens (3 camadas)

```
primitives.ts   →  valores brutos (hex, px, ms)
    ↓
semantic.ts     →  tokens com significado (action-primary, bg-surface, border-default…)
    ↓ loader.js injeta como CSS vars em HSL cru (ex: "211 100% 50%")
colors.css      →  fallback estático dos mesmos tokens em HSL cru no :root
    ↓
bridge.css      →  mapeia tokens semânticos → variáveis shadcn/ui
                   (--primary, --border, --muted, --card…)
    ↓
index.css @theme →  Tailwind v4 gera utilitários (bg-primary, border-border…)
                    adicionando hsl() sobre os tokens HSL cru
```

## REGRA CRÍTICA — Variáveis CSS + Tailwind v4

Os tokens semânticos armazenam **canais HSL crus** (ex: `211 100% 50%`), sem `hsl()`.
O Tailwind v4 adiciona `hsl()` via `@theme inline` em `index.css`.

```css
/* ❌ ERRADO — resulta em hsl(hsl(...)) = CSS inválido */
--primary: hsl(var(--action-primary));

/* ✅ CORRETO */
--primary: var(--action-primary);

/* ❌ ERRADO — hex não é válido como canal HSL */
--primary: var(--blue-500);

/* ✅ CORRETO — usa token semântico HSL cru */
--primary: var(--action-primary);
```

Para adicionar novas cores ao Tailwind, declare em `index.css` no bloco `@theme inline`:
```css
@theme inline {
  --color-minha-cor: hsl(var(--meu-token-semantico));
}
```

Para usar cores em `style={{}}` inline, use as vars `--color-*` (já têm `hsl()` resolvido):
```tsx
style={{ color: 'var(--color-primary)' }}   // ✅
style={{ color: 'var(--primary)' }}          // ❌ — HSL cru, não é cor CSS válida
```

## Design Language

**Superfícies e cards — sombra, não borda:**
```tsx
// ✅ Cards/superfícies de conteúdo
"rounded-2xl bg-card shadow-[0px_4px_20px_rgba(0,0,0,0.08)]"

// ✅ Overlays flutuantes (dropdown, popover, dialog)
"rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.12)]"

// ❌ PROIBIDO — borda visível não faz parte do visual Watink
"border bg-card shadow-sm"
```

**Border-radius padrão:**
| Elemento | Classe | Valor |
|---|---|---|
| Cards e painéis | `rounded-2xl` | 16px |
| Overlays (dropdown, popover, select) | `rounded-xl` | 12px |
| Botões e inputs | `rounded-md` | 8px |
| Badges/pills | `rounded-full` | — |

**Separadores:** `border-b border-border`. Nunca usar `border-slate-700` fora do sidebar.

## Sidebar

| Propriedade | Valor |
|---|---|
| Largura expandida | `w-[200px]` |
| Largura colapsada | `w-[70px]` |
| Fundo | `bg-[var(--slate-800)]` (`#1E293B`) |
| Borda direita | `border-[var(--slate-700)]` |
| Toggle | Header, lado direito |
| Persistência | `localStorage` key `wt:sidebar:collapsed` |
| Mobile | Sempre fechado (< 1024px), sem persistir |

**PROIBIDO** usar `border-border` dentro do sidebar — use `border-[var(--slate-700)]`.

## Regras de Componentes

1. **PROIBIDO** novo `makeStyles` — estilização nova obrigatoriamente em Tailwind.
2. **PROIBIDO** novo import de `@material-ui/core` em qualquer arquivo.
3. **TypeScript obrigatório** — todos os arquivos novos em `.tsx`.
4. **React 18 obrigatório** — shadcn/ui exige React 18+.
