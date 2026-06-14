---
name: adr-005-design-system-governance
description: Define a governança para o Design System, migração de componentes e padrões de estilo.
---

# ADR-005: Governança do Design System Watink

## Contexto
O projeto está em transição do Material UI v4 para um Design System baseado em Tailwind CSS v4 + Shadcn/UI + Radix UI. Para evitar a recaída em dívida técnica (componentes dispersos, estilos hardcoded), definimos regras estritas de governança.

## Decisões
1. **Shadcn/UI como base**: Novos componentes devem ser instanciados via shadcn na pasta `src/components/ui/`.
2. **Proibição de `makeStyles`**: Regra estrita no ESLint (`no-makeStyles`). Estilos novos apenas via Tailwind CSS.
3. **Consistência de Tokens**: Utilização estrita dos tokens definidos em `frontend/src/theme/tokens/`.
4. **Arquitetura de Transição**: Componentes legacy (MUI v4) são `READ-ONLY`. Correções de segurança/bugs permitidas; novas features estritamente proibidas neles.
5. **Injeção de Dependência**: Reforço da política de DI pura e proibição de bibliotecas de estilizacao baseadas em componentes (como o próprio MUI `styled`).

## Consequências
- Aceleração da UI, redução do bundle size e eliminação de alertas de depreciação do React 17/18.
- Curva de aprendizado para a equipe ajustar-se ao padrão Shadcn/Radix.

**Por que:** Para manter a escalabilidade do frontend.
**Como aplicar:** Utilizar o scaffolding (`/scaffold-mvp`) para novos componentes e sempre rodar `npm run lint` antes de commits.
