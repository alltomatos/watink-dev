# ADR-001: Migracao MUI v4 -> shadcn/ui (Radix + Tailwind)

**Status:** Aceito
**Data:** 2025-06-05
**Contexto:** Frontend usa MUI v4 (JSS runtime) + React 17. MUI v4 e legado, sem suporte, com vulnerabilidades e incompatibilidade com React 18+.

## Decisao

Adotar **shadcn/ui** como sistema de componentes, construido sobre:
- **Radix UI** (headless, acessibilidade nativa WAI-ARIA)
- **Tailwind CSS v4** (utility-first, zero-runtime)
- **TypeScript** (type-safety incremental com `allowJs: true`)

Nao migrar para MUI v5/v6. O custo de migrar dentro do ecossistema MUI (JSS -> Emotion -> Pigment) e superior ao custo de adotar shadcn/ui, que e headless por design.

## Motivacao

1. **Seguranca**: MUI v4 sem suporte = CVE sem patch
2. **Performance**: JSS injeta estilos em runtime. Tailwind gera CSS em build-time (zero-runtime)
3. **Acessibilidade**: Radix UI oferece A11y nativa (keyboard nav, screen readers, focus trap)
4. **Developer Experience**: shadcn/ui copia componentes para o projeto (codigo proprietario, nao dependencia). Total controle.
5. **Token System**: O sistema 3-camadas existente (primitives/semantic/components) mapeia diretamente para CSS vars do Tailwind `@theme`

## Estrategia de Migracao

Pattern Shim: coexistencia MUI v4 + shadcn/ui com regras estritas.
- Novos componentes: obrigatorio shadcn/ui + Tailwind
- Componentes legados: READ-ONLY (bug/security fixes apenas)
- ESLint `no-makeStyles` bloqueia novas adicoes de JSS

## Consequencias

- **Positivas**: Bundle menor (sem JSS runtime), A11y nativa, type-safety, customizacao total
- **Negativas**: React 17->18 upgrade bloqueante, Router v5->v6 breaking, periodo de coexistencia com 2 UI stacks
- **Riscos**: Migrajcao de router pode quebrar rotas existentes. Mitigacao: testes E2E antes da Fase 0.
