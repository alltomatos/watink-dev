# Flow Builder

Construtor visual de fluxos de conversa (Chatbots) utilizando nós conectáveis.

## Arquitetura
- **Lib Principal**: `reactflow` (v11+)
- **Estrutura**:
  - **Canvas**: Área de desenho (`ReactFlow`).
  - **Sidebar de Nós** (`NodesSidebar`): Lista de nós arrastáveis para o canvas.
  - **Editor de Propriedades** (`NodeEditorSidebar`): Configurações específicas de cada nó selecionado.
  - **Chat IA** (`FlowChat`): Assistente para gerar fluxos automaticamente.

## Tipos de Nós (`CustomNodes`)
- **Start**: Gatilho inicial.
- **Message**: Envia texto/mídia.
- **Menu**: Menu de opções interativo.
- **Switch**: Condicional lógico.
- **Database**: Consulta/Atualização de dados.
- **API**: Requisição HTTP externa.
- **Ticket**: Transbordo para atendimento humano.
- **Knowledge**: Consulta à Base de Conhecimento (IA).

## Fluxo de Dados
1. **Load**: `GET /flows/:id` -> Hidrata `nodes` e `edges` no ReactFlow.
2. **Save**: `PUT /flows/:id` -> Salva o JSON do fluxo.
3. **Execution**: O Engine interpreta esse JSON salvo no banco para executar o fluxo.

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below in the Engine/Backend section to understand how flows are responsible for execution. Then return here. -->
*Nota: A documentação do Executor de Fluxos no Backend/Engine ainda será detalhada.*
