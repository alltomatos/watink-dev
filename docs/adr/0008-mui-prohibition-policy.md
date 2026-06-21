# ADR 0008 — Proibição Definitiva de MUI v4 e Padronização em shadcn/ui + Tailwind

**Status:** Ativo  
**Data:** 2026-06-20  
**Autor:** Watink Engineering

---

## Contexto

O Watink completou em jun/2026 a migração total do frontend de MUI v4 para o stack canônico: **React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui**. Isso incluiu:

- 163 arquivos JS/JSX → TSX
- 46 componentes compartilhados migrados (Epic 4B)
- 66 páginas/modais migrados (Epic 4D)
- `npm uninstall @material-ui/*` — zero dependências MUI instaladas (Epic 4F)
- ESLint rule `no-makeStyles` ativa bloqueando JSS em build

A migração foi um esforço enorme de várias semanas. Este ADR formaliza a proibição permanente para garantir que nenhum código novo reintroduza MUI, por acidente ou por referências a documentação antiga.

---

## Problema

Documentação legada (ADRs de migração, READMEs, planos de sprint) ainda menciona MUI em contexto histórico ou de instrução. Isso cria ambiguidade:

- Desenvolvedores novos podem interpretar referências MUI como "ainda válidas"
- Agentes de IA (Claude Code, Copilot) treinados no repo podem sugerir MUI ao ler docs antigas
- A linha `@material-ui imports proibidos em .tsx — legado READ-ONLY` implica que `.js` legado ainda existe e é tolerado

**Realidade em jun/2026:** não existe nem um arquivo `.js` legado no `src/` com import de `@material-ui`. O pacote não está em `package.json`.

---

## Decisão

### 1. Proibição total e permanente de MUI

`@material-ui/*` e `@mui/*` são **proibidos** no projeto Watink. Não existe exceção.

| Proibido | Alternativa obrigatória |
|---|---|
| `import { Button } from '@material-ui/core'` | `import { Button } from '../ui/button'` |
| `import { makeStyles } from '@material-ui/core'` | Classes Tailwind + `cn()` |
| `import { styled } from '@material-ui/core'` | `cn()` + variantes CVA ou Tailwind inline |
| `import PeopleIcon from '@material-ui/icons/People'` | `import { Users } from 'lucide-react'` |
| `createMuiTheme`, `ThemeProvider` do MUI | Tokens CSS em `theme/tokens/` + `loader.js` |
| Qualquer JSS / `${ ... }` em CSS-in-JS | CSS Custom Properties `var(--token)` |

### 2. Stack canônico obrigatório para código novo

Todo código novo no frontend **deve** seguir:

```
Componentes UI  →  src/components/ui/  (shadcn/ui + Radix UI)
Ícones          →  lucide-react
Estilização     →  Tailwind CSS v4 (classes utilitárias) + CSS Custom Properties
Variantes       →  CVA (class-variance-authority) via cn()
Tokens          →  var(--token-semântico) conforme src/theme/tokens/*.css
Tipagem         →  TypeScript (.tsx), nunca .jsx ou .js
```

### 3. Regras de revisão de código

Qualquer PR que contenha:
- Import de `@material-ui/*` ou `@mui/*` → **rejeitado imediatamente**
- `makeStyles`, `withStyles`, `createStyles` → **rejeitado**
- `sx={{...}}` (prop de estilo do MUI v5) → **rejeitado**
- Componente shadcn duplicado do zero sem usar `src/components/ui/` → **rejeitado**

### 4. ESLint como guarda de automação

A rule `no-makeStyles` (ESLint custom, `frontend/scripts/eslint-rules/`) já bloqueia JSS.  
Complementar com: `@typescript-eslint/no-restricted-imports` apontando para `@material-ui` e `@mui` — isso transforma violação em **erro de build**, eliminando dependência de revisão manual.

---

## Stack de Referência Rápida para Desenvolvedores

```tsx
// ✅ CORRETO — shadcn/ui + Tailwind + tokens
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

<Button variant="default" className="text-[hsl(var(--action-primary))]">
  Enviar
</Button>

// ❌ ERRADO — MUI (causa erro de build)
import Button from "@material-ui/core/Button";
import PeopleIcon from "@material-ui/icons/People";
```

---

## Consequências

**Positivas:**
- Zero ambiguidade para desenvolvedores novos e agentes de IA
- Bundle sem JSS runtime (~50KB a menos no carregamento inicial)
- Tokens CSS reativos ao tema sem Provider MUI
- Cobertura de testes mais simples (sem Provider de tema nos renders)

**Negativas:**
- Curva de aprendizado para devs com background MUI — mitigada por referência rápida acima e Design System docs em `docs/frontend/design-system.md`

---

## Referências

- [ADR 001](001-mui-v4-to-shadcn-ui.md) — Decisão original de migração MUI → shadcn
- [ADR 005](frontend/005-design-system-governance.md) — Governança do Design System v2
- [ADR 007](0007-frontend-component-decomposition.md) — Política de decomposição de componentes
- [`docs/frontend/design-system.md`](../../docs/frontend/design-system.md) — Guia completo do DS
- [`src/components/ui/`](../../frontend/src/components/ui/) — Catálogo de componentes disponíveis
