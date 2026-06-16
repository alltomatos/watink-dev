---
name: adr-005-design-system-governance
description: Define a governança do Design System v2 — tokens CSS, temas dinâmicos, migração MUI→shadcn, regras de componentes.
---

# ADR-005: Governança do Design System Watink v2

**Data**: 2026-06-13  
**Status**: Ativo  
**Atualizado**: 2026-06-13 (Epic 4A/4C concluídas)

## Contexto

O projeto migrou de MUI v4 para React 18 + TypeScript + Tailwind v4 + shadcn/ui (branch `tinker/ui-and-di-refactor`). A documentação vive em `docs/Watink Design System v2/`. Para evitar regressão em dívida técnica, este ADR formaliza as regras de governança.

## Decisões

### 1. Tokens — CSS Custom Properties (formato canônico)
- **Fonte de verdade**: `frontend/src/theme/tokens/*.css` — 4 arquivos CSS (colors, typography, spacing, motion)
- **Formato**: raw HSL sem wrapper, ex: `--bg-default: 240 24% 96%;` — porque o `index.css` usa `hsl(var(--token))`
- **Temas dinâmicos**: `theme/loader.js` injeta 8 variantes (apple/google/whatsapp/saas × light/dark) em runtime via `document.documentElement.style.setProperty`
- **Fallback CSS**: `colors.css` define o tema `apple-light` como padrão para SSR/no-JS
- **Proibido**: tokens em `.js` (foram o problema; eliminados na Epic 4A)

### 2. Shadcn/UI como base inegociável
- Novos componentes instanciados via shadcn em `src/components/ui/`
- Composição via Radix UI primitives + Tailwind + `cn()` helper
- CVA (class-variance-authority) para variantes de componentes

### 3. Proibições estritas
- **`makeStyles`**: proibido — ESLint `no-makeStyles` falha o build
- **`@material-ui` imports**: proibido em código novo — legado é READ-ONLY
- **Hardcoded hex colors**: proibido em componentes — usar `var(--token)` ou Tailwind semantic
- **Inline `style={{ color: "#..." }}`**: proibido — usar Tailwind ou CSS vars
- **Default exports** em componentes novos: preferir named exports

### 4. Arquivos novos obrigatoriamente `.tsx`
- Boy scout rule: arquivos `.js` tocados são convertidos para `.tsx`
- Interfaces TypeScript explícitas — nunca `any`
- `React.forwardRef` para componentes que expõem DOM refs

### 5. Componentes legacy (MUI v4) — READ-ONLY
- 163 arquivos `.js` legados: correções de bug/segurança permitidas
- Novas funcionalidades: estritamente proibidas
- Migração: Epic 4B (componentes) → Epic 4D (páginas)

### 6. Documentação viva
- **DS v2**: `docs/Watink Design System v2/` — fonte canônica de design
- **desgner-system**: `docs/desgner-system/` — mirror sincronizado (ver 4C)
- Exemplos de componentes: `.tsx` (nunca `.jsx`)
- `_ds_manifest.json` atualizado a cada novo componente

## Estrutura de Diretórios (canonical)

```
frontend/src/
  components/
    ui/          → shadcn/ui + custom (NOVO, .tsx) — 22 componentes
    legacy/      → MUI v4 (READ-ONLY)
    composite/   → Componentes de negócio compostos
    patterns/    → Padrões reutilizáveis (Forms, Tables, Modals)
  theme/
    tokens/
      colors.css      → primitivas + fallback apple-light (HSL raw)
      typography.css  → font families, sizes, weights
      spacing.css     → espaçamento, radius, tokens de componentes
      motion.css      → durations, easings, transitions
    loader.js    → injeção de tema em runtime (8 variantes)
    bridge.css   → compat MUI bridge (remover na Epic 4F)
```

## Consequências

- Build sem erros MUI: ✅ (após Epic 4A — 10.894 módulos)
- Hardcoded colors em `ui/`: 0 ✅
- Tokens em formato CSS nativo: ✅ (Epic 4A concluída 2026-06-13)
- Componentes legados restantes: 46 (Epic 4B) + 66 páginas (Epic 4D)

## Referências

- Workflow de migração: `.claude/plans/frontend-ds-v2-workflow.md`
- Estado DAG: `ESTADO_ORQUESTRATOR.md`
- Instruções para agentes: `docs/Watink Design System v2/AI_AGENT_INSTRUCTIONS.md`
- Arquitetura frontend: `docs/Watink Design System v2/FRONTEND_ARCHITECTURE.md`
