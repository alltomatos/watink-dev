---
name: watink-design
description: Use este skill para gerar interfaces e assets bem alinhados à marca Watink — plataforma open-source brasileira de atendimento multiagente no WhatsApp. Contém diretrizes de design, tokens de cor (Tailwind HSL), tipografia, biblioteca de componentes (shadcn/ui), e UI kit para prototipagem ou código de produção. Stack: React 18 + Tailwind CSS v4.3.0 + shadcn/ui (em migração do MUI v4). Ícones via Lucide React.
user-invocable: true
---

Leia os arquivos nesta ordem:
1. `readme.md` — visão geral, fundamentos de conteúdo e design
2. `MIGRATION.md` — detalhes da migração MUI v4 → shadcn/ui + Tailwind
3. `SKILL.md` — referência rápida de componentes

Se estiver criando artefatos visuais (slides, mocks, protótipos descartáveis, etc.), copie os assets e crie arquivos HTML estáticos para o usuário visualizar. Se estiver trabalhando em código de produção no novo stack, use os componentes shadcn/ui e as classes Tailwind — veja `MIGRATION.md` para como adicionar novos componentes.

**Sempre use Português do Brasil (pt-BR)** em todos os textos, documentação e conteúdo de UI gerados.

## Regras-chave de design (Tailwind + shadcn/ui)

1. **Cores via Tailwind classes** — nunca use hex direto. Use `bg-primary`, `text-destructive`, `border-border`, etc.
2. **Customização via CSS variables (HSL)** — edite `src/index.css` para ajustar cores em toda a app
3. **Idioma** — todo copy de UI em Português do Brasil (pt-BR), primeira letra maiúscula, voz imperativa
4. **Ícones** — use Lucide React (`import { CheckCircle } from 'lucide-react'`) em vez de Material Icons
5. **Componentes** — use shadcn/ui (Button, Card, Dialog, Input, Label, Skeleton, etc.) e estenda via Tailwind
6. **Layout** — prefira Tailwind grid/flex com gaps em vez de MUI Box + sx
7. **Modo escuro** — suportado automaticamente via `dark:` classes + `prefers-color-scheme` media query
8. **Acessibilidade** — Radix UI fornece WAI-ARIA out-of-the-box em componentes shadcn/ui
9. **Sem emoji no chrome da UI** — emoji apenas em conteúdo de mensagens

## Referência Rápida de Componentes shadcn/ui

| Componente | Import | Uso |
|---|---|---|
| `Button` | `@/components/ui/button` | Botões de ação, variantes `default`, `destructive`, `outline`, `ghost` |
| `Card` | `@/components/ui/card` | Containers: `Card`, `CardHeader`, `CardTitle`, `CardContent` |
| `Dialog` | `@/components/ui/dialog` | Modais: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader` |
| `Input` | `@/components/ui/input` | Campos de texto |
| `Label` | `@/components/ui/label` | Labels com acessibilidade (Radix) |
| `Skeleton` | `@/components/ui/skeleton` | Placeholder de carregamento animado |

## Como Adicionar Componentes shadcn/ui

```bash
cd frontend/
npx shadcn-ui@latest add [component-name]
```

Exemplos: `checkbox`, `dropdown-menu`, `tabs`, `tooltip`, `avatar`, `badge`.

## Repositórios

- **Main (MUI v4):** https://github.com/alltomatos/watinkdev/tree/main
- **Tinker (shadcn/ui + Tailwind):** https://github.com/alltomatos/watinkdev/tree/tinker/ui-and-di-refactor

