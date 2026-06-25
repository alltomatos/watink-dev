# Pipelines (CRM) — Visão Geral

Módulo de gestão de oportunidades (CRM). Organiza negócios (`Deal`) em estágios sequenciais com visualizações Kanban, Funil e Gantt.

## Rota

`/pipelines` — listagem e board dos pipelines do tenant.

## Tipos de Pipeline (`pipeline.type`)

| Valor | Comportamento |
|---|---|
| `kanban` | Board em colunas com drag-and-drop. Padrão. |
| `funnel` | Visualização de funil com conversão por estágio. Sempre marcado como enterprise. |

O `type` vem do backend e é persistido no banco. O frontend usa `pipeline.type` para decidir a view — não deriva o tipo localmente.

## Fluxo de Criação / Edição

- **`PipelineCreator`** — página única para criar e editar pipelines. Abre via `/pipelines/new` ou `/pipelines/:id/edit`.
- **Sidebar de IA** — exibida condicionalmente se `aiPipelineEnabled = "true"` nas Settings do tenant. Chama `POST /pipelines/ai-suggest` para sugerir estágios com base em contexto de atendimento.
- **`PipelineWizard` foi removido** (PR #224). Fluxo único é o `PipelineCreator`.

## Confirmação ao remover estágios

Ao editar um pipeline existente, se o usuário remover estágios, um Dialog de confirmação é exibido antes de salvar. O backend migra os Deals das stages removidas para `stages[0]` antes de deletar.

## Componentes Principais

- `PipelineCreator.tsx` — formulário principal (nome, descrição, tipo, estágios)
- `PipelineBoard.tsx` — seletor de view e listagem dos boards
- `PipelineKanban.tsx` — view Kanban com drag-and-drop
- `PipelineFunnelView.tsx` — view de conversão por estágio
- `PipelineGantt.tsx` — view cronológica
- `hooks/usePipelineCreator.ts` — estado do formulário, lógica de upsert por nome, controle do Dialog de confirmação

## Integração API

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/pipelines` | Lista pipelines do tenant com stages |
| `POST` | `/pipelines` | Cria pipeline (name, description, type, stages[]) |
| `PUT` | `/pipelines/:id` | Atualiza — upsert de stages por nome |
| `DELETE` | `/pipelines/:id` | Remove pipeline |
| `GET` | `/pipelines/export/:id` | Exporta JSON do pipeline |
| `POST` | `/pipelines/import` | Importa pipeline via JSON |
| `POST` | `/pipelines/ai-suggest` | Sugestão de stages via LLM do tenant |
| `GET` | `/deals` | Lista deals do tenant |
| `PUT` | `/deals/:id` | Atualiza deal (stageId, etc.) |

## Referências

- [Componentes detalhados](./COMPONENTS.md)
- [ADR 0009 — Stage Upsert por Nome](../../adr/0009-pipeline-stage-upsert.md)
- [Agent context](../../agents/pipeline.md)
