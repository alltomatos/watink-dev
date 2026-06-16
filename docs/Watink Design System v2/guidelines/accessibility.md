# Watink Design System — Diretrizes de Acessibilidade

**Padrão**: WCAG 2.1 AA  
**Base**: Radix UI primitives (acessibilidade nativa) + Tailwind  
**Data**: 2026-06-13

---

## Princípios

Todo componente do DS deve satisfazer:

1. **Contraste mínimo 4.5:1** — texto normal sobre fundo (WCAG AA)
2. **Contraste mínimo 3:1** — texto grande (≥18px regular ou ≥14px bold)
3. **Focus ring visível** — 3px ring com offset, usando `ring-2 ring-ring ring-offset-2`
4. **Navegação por teclado** — Tab, Enter, Esc, Arrow keys em todos os componentes interativos
5. **ARIA correto** — `role`, `aria-label`, `aria-describedby`, `aria-expanded` conforme o padrão

---

## Checklist por Componente

### Botões
```tsx
<Button
  aria-label="Fechar modal"   // quando texto não é suficiente
  aria-busy={isLoading}       // quando em estado de carregamento
  disabled={isDisabled}       // não usar apenas opacity
/>
```

### Modais / Dialogs
- Usar `<Dialog>` do Radix — foca automaticamente no primeiro elemento interativo
- `aria-labelledby` apontando para o título do modal
- `aria-describedby` apontando para descrição opcional
- Fechar com Esc nativo (Radix gerencia)
- Foco preso dentro do modal enquanto aberto (focus trap)

```tsx
<Dialog>
  <DialogContent aria-describedby="modal-desc">
    <DialogTitle>Confirmar exclusão</DialogTitle>
    <DialogDescription id="modal-desc">
      Esta ação não pode ser desfeita.
    </DialogDescription>
  </DialogContent>
</Dialog>
```

### Formulários
```tsx
<div role="group" aria-labelledby="group-label">
  <Label id="group-label" htmlFor="input-id">Nome</Label>
  <Input
    id="input-id"
    aria-required="true"
    aria-invalid={!!error}
    aria-describedby={error ? "input-error" : undefined}
  />
  {error && (
    <span id="input-error" role="alert" className="text-destructive text-xs">
      {error}
    </span>
  )}
</div>
```

### Tabelas
```tsx
<Table role="table" aria-label="Lista de tickets">
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Status</TableHead>
      <TableHead scope="col">Contato</TableHead>
    </TableRow>
  </TableHeader>
</Table>
```

### Status Chips / Badges
```tsx
// Sempre incluir texto visível — não depender apenas de cor
<StatusChip status="success">
  <span aria-hidden>●</span> Online
</StatusChip>

// Ou usar aria-label quando ícone isolado
<span role="status" aria-label="Ticket aberto" className="...">
  <TicketIcon aria-hidden />
</span>
```

### Avatares
```tsx
<Avatar
  src={user.photo}
  name={user.name}
  // O componente usa name como alt automaticamente
  // Para avatar decorativo:
  aria-hidden={isDecorative}
/>
```

---

## Focus Ring — Padrão

```css
/* Sempre usar o ring do Tailwind — nunca outline: none sem substituto */
:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--ring));
  ring-offset: 2px;
}
```

Em Tailwind: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

---

## Contraste de Cores (Tokens Aprovados)

| Combinação | Ratio | Status |
|-----------|-------|--------|
| `text-primary` sobre `bg-surface` (light) | ~15:1 | ✅ AAA |
| `text-secondary` sobre `bg-surface` (light) | ~4.8:1 | ✅ AA |
| `status-success-text` sobre `status-success-bg` | ~5.2:1 | ✅ AA |
| `status-error-text` sobre `status-error-bg` | ~5.8:1 | ✅ AA |
| `status-warning-text` sobre `status-warning-bg` | ~4.6:1 | ✅ AA |
| `action-primary` sobre `bg-surface` | ~4.7:1 | ✅ AA |

> Sempre verificar no [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) ao criar novos pares de cores.

---

## Navegação por Teclado

| Componente | Tab | Enter/Space | Esc | Arrows |
|-----------|-----|-------------|-----|--------|
| Button | ✅ foca | ✅ ativa | — | — |
| Dialog | ✅ foco preso | ✅ confirma | ✅ fecha | — |
| Select | ✅ foca | ✅ abre | ✅ fecha | ✅ navega |
| Dropdown | ✅ foca | ✅ abre | ✅ fecha | ✅ navega |
| Tabs | ✅ foca tab list | ✅ seleciona | — | ✅ navega tabs |
| Checkbox | ✅ foca | ✅ toggle | — | — |
| Table | ✅ foca célula | — | — | ✅ navega (se implementado) |

Todos os componentes Radix implementam as interações acima nativamente.

---

## Screen Reader

- Usar `aria-live="polite"` para notificações não urgentes (ex: toast de sucesso)
- Usar `aria-live="assertive"` para erros críticos
- Usar `role="status"` para mensagens de loading
- `aria-hidden="true"` em ícones decorativos (Lucide dentro de botões com texto)

```tsx
// Toast de sucesso — não interrompe leitura
<div aria-live="polite" aria-atomic="true">
  {toast && <span>{toast.message}</span>}
</div>

// Erro de formulário — interrompe leitura imediatamente
<div role="alert" aria-live="assertive">
  {criticalError}
</div>
```

---

## Ferramentas de Teste

| Ferramenta | Uso |
|-----------|-----|
| [axe DevTools](https://www.deque.com/axe/devtools/) | Auditoria automática no browser |
| [WAVE](https://wave.webaim.org/) | Análise visual de acessibilidade |
| Lighthouse (DevTools) | Score de acessibilidade ≥90 |
| NVDA (Windows) | Screen reader teste manual |
| VoiceOver (Mac/iOS) | Screen reader teste manual |

---

## Referências

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Accessibility](https://www.radix-ui.com/docs/primitives/overview/accessibility)
- [shadcn/ui Accessibility](https://ui.shadcn.com/docs/accessibility)
