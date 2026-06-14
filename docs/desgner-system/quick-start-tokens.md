# Documentação de Design System: Tokens HSL e Tailwind CSS v4

## Visão Geral
O Watink Design System utiliza tokens HSL semânticos centralizados em `src/theme/tokens/` e injetados via `src/index.css`. O Tailwind CSS v4 consome esses tokens nativamente através da camada `@theme` e CSS variables.

## Estrutura de Tokens
Os tokens são organizados em:
- `primitives.js`: Valores base (cores, espaçamentos, motion).
- `semantic.js`: Mapeamento de intenção (ex: `action-primary`, `status-success`).
- `components.js`: Aplicação direta em componentes.

## Como Usar

### No CSS / Tailwind
Sempre utilize as variáveis CSS com `hsl(var(--...))`. 
Exemplo:
```css
/* No index.css (em @layer base) */
--primary: hsl(var(--action-primary));
```

### Nos Componentes
Use as utility classes do Tailwind:
```tsx
<div className="bg-background text-foreground border-border">
  <Button className="bg-primary text-primary-foreground">Ação</Button>
</div>
```

## Sincronização
Toda nova cor adicionada em `semantic.js` deve ser mapeada em `index.css` dentro do bloco `:root` para garantir compatibilidade com componentes Shadcn.
