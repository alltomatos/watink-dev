# Componentes de Pipelines

## Wrapper
- `index.js`: Gerencia o estado selecionado (qual Pipeline, qual View).
- `PipelineBoard.js`: Container intermediário.

## Views
### `PipelineKanban.js`
Visualização principal em colunas.
- **Lib**: `react-beautiful-dnd`
- **Features**:
  - Drag & Drop de cards entre estágios.
  - **Modo Enterprise**:
    - Estilo diferenciado (fundo cinza/branco).
    - Badge de valor total por coluna.
    - **Alerta de Estagnação**: Borda vermelha se o card não for atualizado há mais de 7 dias.
  - Cálculo automático do total monetário da coluna.

### Outras Views
- `PipelineGantt.js`: Visualização temporal.
- `PipelineFunnelView.js`: Visualização de conversão.

## Criação
- `PipelineWizard.js` / `PipelineCreator.js`: Passo-a-passo para criar novo funil.
