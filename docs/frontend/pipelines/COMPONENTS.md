# Componentes de Pipelines

Stack: React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui + Lucide React.

## Estrutura de Arquivos

```
src/pages/Pipelines/
├── index.tsx                        # Entry point — lista pipelines, navega para PipelineCreator
├── PipelineBoard.tsx                # Seletor de view (kanban/funnel/gantt) e board ativo
├── PipelineCreator.tsx              # Formulário criar/editar pipeline + Dialog de confirmação
├── PipelineKanban.tsx               # View Kanban (drag-and-drop de Deals entre stages)
├── PipelineFunnelView.tsx           # View funil com conversão por stage
├── PipelineGantt.tsx                # View Gantt (cronológica)
└── hooks/
    └── usePipelineCreator.ts        # Estado do formulário, upsert de stages, controle do Dialog
```

## PipelineCreator

Página única para criação e edição de pipelines. Substitui o `PipelineWizard` (removido no PR #224).

**Props**: `pipelineId?: number` (presente → modo edição)

**Campos do formulário**:
- `name` — nome do pipeline (obrigatório)
- `description` — descrição livre
- `type` — `kanban` | `funnel` (select; persiste no banco via backend)
- `stages[]` — lista de nomes de estágios (mínimo 1 não-vazio)

**Comportamento ao salvar com stages removidas**:
1. `usePipelineCreator` detecta stages presentes no original que não estão no payload atual (`removedStages`)
2. Se `removedStages.length > 0` e `pendingSave === false` → abre Dialog de confirmação
3. Usuário confirma → `handleSave()` prossegue com `PUT /pipelines/:id`
4. Backend migra Deals das stages removidas para `stages[0]` antes de deletar

**Sidebar de IA**: renderizada condicionalmente via `aiPipelineEnabled` das Settings do tenant. Chama `POST /pipelines/ai-suggest` com histórico de mensagens e sugere estágios.

## usePipelineCreator

Hook central do formulário. Gerencia:
- `data` — estado do formulário (name, description, type, stages)
- `originalStages` — nomes das stages ao carregar um pipeline existente (usado para calcular `removedStages`)
- `removedStages` — computed: stages do original que não estão em `data.stages`
- `pendingSave` / `setPendingSave` — controla abertura do Dialog de confirmação
- `handleSave()` — submete `POST /pipelines` ou `PUT /pipelines/:id`

## PipelineKanban

View principal. Drag-and-drop de cards (Deals) entre colunas (PipelineStages).

**Modo Enterprise** (quando `pipeline.type === "funnel"`):
- Badge de valor total por coluna
- Alerta de estagnação: borda vermelha em cards sem atualização há mais de 7 dias

## Views adicionais

- **PipelineFunnelView** — funil de conversão; percentual de deals por stage
- **PipelineGantt** — linha do tempo; data de criação e última atualização dos deals

## AISettings (relacionado)

`src/pages/Settings/components/AISettings.tsx` — configuração do provider de IA usado pelo `AISuggest`:
- Providers: `openai`, `anthropic`, `grok`, `custom` (OpenAI-compatível)
- Campo `aiCustomBaseURL` exibido apenas quando `provider === "custom"`
- Campo `model`: select com modelos pré-definidos (por provider) ou input livre (custom)
- Toggle `aiPipelineEnabled` — habilita sidebar de IA no `PipelineCreator`
