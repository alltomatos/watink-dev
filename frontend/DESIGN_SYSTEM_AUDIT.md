# Relatório de Auditoria de Dívida Visual (Watink Frontend)

Este relatório compila a auditoria de hardcoded hex colors no projeto `watinkdev/frontend` (React 17 + MUI v4), identificando pontos críticos de inconsistência visual e propondo um plano de migração.

## 1. Mapa de Calor de Débito (Arquivos com maior incidência)

| Arquivo | Contagem | Prioridade (Migração) |
| :--- | :---: | :---: |
| `src/components/ColorPicker/index.js` | 49 | Baixa (Exceção: ColorPicker) |
| `src/theme/tokens/semantic.js` | 22 | N/A (Token definition) |
| `src/pages/FlowBuilder/FlowSimulatorModal.js` | 22 | Crítica (Layout Complexo) |
| `src/helpers/tagColors.js` | 18 | Média (Refatoração de helpers) |
| `src/pages/FlowBuilder/NodesSidebar.js` | 17 | Alta (Padronização Nodes) |
| `src/pages/FlowBuilder/CustomNodes/BaseNode.js` | 16 | Alta (Padronização Nodes) |
| `src/pages/FlowBuilder/ContentModal.js` | 10 | Alta (Modais) |
| `src/pages/FlowBuilder/CustomNodes/SwitchNode.js` | 8 | Média |
| `src/layout/MainListItems.js` | 8 | Média |
| `src/pages/FlowBuilder/index.js` | 6 | Baixa |

## 2. Inconsistências Visuais Mapeadas

*   **Cards:** Falta de uniformidade em `borderRadius` e `boxShadow`. Páginas como `FlowSimulatorModal` e `ContentModal` usam estilos inline para borders (`1px solid #e0e0e0`) em vez de tokens de sistema.
*   **Botões:** Ações de exclusão/danger variam entre a cor hex direta `#f44336` (ex: `StartNodeModal.js`, `NodeEditorSidebar.js`) e botões de UI padrão.
*   **Listas/Navegação:** `MainListItems` define cores próprias para ícones de status, duplicando semântica já presente em `theme/tokens/semantic.js`.
*   **Status/Erros:** Uso inconsistente de `#f44336` para erro (hardcoded) vs. `message-error-text` (semantic).

## 3. Plano de Migração Priorizado

### Fase 1: Padronização de Layout (Short-term)
*   Criar `StyledCard` e `StyledModal` baseados em MUI v4 com `borderRadius` e `shadow` centralizados.
*   Migrar borders inline de `FlowSimulatorModal` e `ContentModal` para as classes de tema.

### Fase 2: Componentes Base (Mid-term)
*   **Nodes:** Refatorar `NodesSidebar.js` e `CustomNodes/*.js` para utilizar um mapeamento de cores de node centralizado na `semantic.js` ou em um helper exclusivo de tokens de nó.
*   **Botões:** Normalizar variantes de `Button` (ex: Danger) usando o `theme` do MUI v4 em vez de `style={{ backgroundColor: '#f44336' }}`.

### Fase 3: Limpeza de Helpers (Long-term)
*   Migrar `tagColors.js` para usar alias da `semantic.js`.
*   Refatorar `MainListItems` para consumir paleta definida globalmente.

## 4. Novos Component Tokens Necessários

A base atual carece de tokens granulares:
*   `radius.card`: Padronização de 4px ou 8px.
*   `spacing.modal`: Margens e paddings consistentes.
*   `palette.status.danger`: Mapear `#f44336` centralmente.
*   `palette.palette.brand`: Padronizar cores de cada tipo de node do FlowBuilder.
