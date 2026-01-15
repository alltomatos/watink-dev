# Pipelines (CRM)

Módulo de gestão de oportunidades (CRM) visualizado em Kanban, Gantt ou Funil.

## Arquitetura
- **Rota**: `/pipelines`
- **Múltiplas Views**:
  - **Kanban**: Visualização clássica de colunas e cartões (Drag & Drop).
  - **Gantt**: Visualização cronológica.
  - **Funil**: Visualização de conversão por etapa.
- **Wizard**: Criação guiada de pipelines (`PipelineWizard`, `PipelineCreator`).

## Componentes Principais
- `PipelineKanban.js`: Core da visualização Kanban. Utiliza `react-beautiful-dnd` (provável) ou similar para arrastar cards.
- `PipelineBoard.js`: Container que gerencia a troca de visualizações.

## Integração API
- **Listar Pipelines**: `GET /pipelines`
- **Listar Negócios (Deals)**: `GET /deals`
- **Atualizar Estágio**: Pelo movimento do card no Kanban (`PUT /deals/:id` ou `/pipelines/:id/deals`).

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below in the Backend section to understand how the API processes Deal movements. Then return here. -->
[Backend API: Pipelines](../../backend/feature/PIPELINES.md)
*Nota: Documentação de backend para pipelines ainda será criada.*
