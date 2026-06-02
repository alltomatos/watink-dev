# Watink Design System Governance

## Princípios
1. **Token First**: Proibido uso de cores hardcoded (`#HEX`, `rgba()`).
2. **Semantic Meaning**: Cores devem refletir o propósito (ex: `--status-warning-bg`), não a aparência.
3. **No Direct Mutation**: Componentes não devem injetar estilos que contornem o `ThemeProvider`.

## Fluxo de Contribuição
- **Novo Componente**: Deve ser registrado no `frontend/src/theme/tokens`.
- **Linter**: `npm run lint:ds` falhará se detectar `hex`.
- **Revisão**: Todo PR deve passar pelo `lint:ds`.

## Exceções
- Apenas o plugin `ColorPicker` (data format) e `FlowBuilder` (fase de transição) estão isentos no `.eslintrc.js`.
