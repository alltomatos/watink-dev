# Plan: Watink Design System Documentation Improvement

**Atualizado**: 2026-06-13 (Epic 4C concluída)

## Goal
Transform `docs/desgner-system/` into a "living" technical specification aligned with React 18, TSX, Tailwind v4, and shadcn/ui.

## Phase 1: Foundation & Governance
- [x] **Task 1.1**: `docs/adr/frontend/005-design-system-governance.md` — expandido com tokens CSS, temas, proibições e estrutura de diretórios (2026-06-13)
- [x] **Task 1.2**: `CONTEXT.md` atualizado — DS v2 como fonte canônica, tokens CSS, 22 componentes ui/ (2026-06-13)
- [x] **Task 1.3**: `docs/desgner-system/Watink Design System/readme.md` — stack atual, tokens CSS, referências DS v2 (2026-06-13)

## Phase 2: Token Synchronization
- [x] **Task 2.1**: `docs/desgner-system/Watink Design System/tokens/colors.css` — já estava sincronizado (HSL)
- [x] **Task 2.2**: `docs/desgner-system/Watink Design System/tokens/themes.md` — criado (4 famílias × 2 modos, brand overrides) (2026-06-13)
- [x] **Task 2.3**: `spacing.css` e `typography.css` já alinhados com Tailwind v4 (Epic 4A)

## Phase 3: Component Specification Evolution
- [x] **Task 3.1**: `.tsx` já existiam em ambas as pastas (Button.tsx, Card.tsx, Avatar.tsx, MetricCard.tsx, StatusChip.tsx)
- [x] **Task 3.2**: `Button.prompt.md` e `Avatar.prompt.md` atualizados com regras shadcn/ui e imports `.tsx` (2026-06-13)
- [x] **Task 3.3**: `MetricCard.tsx` e `StatusChip.tsx` já presentes nos core specs; `PageLayout` no DS v2

## Phase 4: A11y & Motion
- [x] **Task 4.1**: `docs/Watink Design System v2/guidelines/accessibility.md` — criado (WCAG AA, Radix, focus ring, ARIA, tabela de contraste) (2026-06-13)
- [x] **Task 4.2**: `tokens/motion.css` sincronizado — origins em `primitives.js` agora em `frontend/src/theme/tokens/motion.css` (Epic 4A)

## Phase 5: Verification
- [x] **Task 5.1**: `_ds_manifest.json` atualizado — `.jsx` → `.tsx`, StatusChip.tsx adicionado, `_meta` com timestamp (2026-06-13)
- [x] **Task 5.2**: Validação estrutural: `npm run build` limpo (10.894 módulos, 0 erros)

## Status: CONCLUÍDO ✅ (2026-06-13)
