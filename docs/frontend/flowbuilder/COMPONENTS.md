# Componentes do Flow Builder

## Principal
- `index.js`: Gerencia estado (`nodes`, `edges`), inicializa `ReactFlowProvider` e toolbar.

## Sidebars
- `NodesSidebar`: Painel esquerdo com a paleta de nós. Usa `onDragStart` para iniciar o evento de drag.
- `NodeEditorSidebar`: Painel direito contextual. Renderiza o formulário de edição baseado no `selectedNode.type`.

## Modais
- `ContentModal`: Modal genérico para edição de conteúdo rico (texto, mídia).
- `FlowSimulatorModal`: Interface de chat simulada para testar o fluxo sem deploy.
- `StartNodeModal`: Configurações do gatilho inicial.

## Custom Nodes (`/CustomNodes`)
Renderizam a aparência do nó no canvas.
- Todos seguem o padrão de receber `data` e renderizar inputs/outputs (`Handle`).
- Ex: `MessageNode` exibe o preview da mensagem.
