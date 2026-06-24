# Pipeline — Contexto para Agentes

## Responsabilidade
Módulo de funis de vendas com estágios sequenciais, visualizações múltiplas e assistente de IA para criação de stages.

## Contratos de entrada/saída

### Backend Go (`business/internal/controllers/`)
| Endpoint | Input | Output |
|---|---|---|
| `GET /pipelines` | — | `[]Pipeline` tenant-scoped |
| `POST /pipelines` | `{name, description, type, stages[]}` | `Pipeline` com stages |
| `PUT /pipelines/:id` | `{name, description, type, stages[]}` | `Pipeline` atualizado |
| `GET /pipelines/export/:id` | — | JSON do pipeline |
| `POST /pipelines/import` | mesmo payload de Create | `Pipeline` criado |
| `POST /pipelines/ai-suggest` | `{messages[]}` | `{message, stages[]}` |

### Model Go (`business/internal/models/pipeline.go`)
```go
Pipeline { ID, Name, Description, Type, TenantID, Stages[] }
PipelineStage { ID, Name, PipelineID, Order }
```

### Settings utilizadas
| Key | Tipo | Descrição |
|---|---|---|
| `aiEnabled` | bool string | IA global ligada |
| `aiPipelineEnabled` | bool string | Chat IA no PipelineCreator |
| `aiProvider` | string | "openai" \| "anthropic" \| "grok" \| "custom" |
| `aiModel` | string | ID do modelo (ex: "claude-sonnet-4-6") |
| `aiApiKey` | string | Chave da API do provedor |
| `aiCustomBaseURL` | string | URL base para provedor custom (OpenAI-compatível) |
| `aiGuidePrompt` | string | System prompt enviado ao LLM |

## Invariants (nunca violar)
- Toda query de Pipeline/Deal usa `auth.GetScoped(c, "Pipelines")` — nunca acesso cross-tenant
- Create/Update de Pipeline são transacionais (GORM `Transaction()`)
- Stage upsert por nome: ao atualizar stages, preservar IDs de stages existentes pelo nome; Deals de stages removidas migram para a primeira stage disponível
- `pipeline.type` determina qual view o board renderiza: `"funnel"` → PipelineFunnelView (4 tabs + features enterprise); `"kanban"` → PipelineKanban simples
- Frontend exibe modal de confirmação antes de salvar edições de stages

## Edge cases críticos
- **API key ausente**: `AISuggest` deve retornar erro claro (`ERR_NO_AI_API_KEY`) quando `aiApiKey` não está configurada — não silenciar
- **Provedor custom sem URL**: se `aiProvider = "custom"` e `aiCustomBaseURL` vazio, retornar erro antes de tentar chamada HTTP
- **Stage removida com deals**: mover deals para `stages[0]` antes de deletar a stage; se não houver nenhuma stage restante, bloquear a operação
- **Update sem mudança de stages**: se o payload de stages for idêntico ao atual (mesmo nome e ordem), não deletar e recriar — comparar antes de agir
- **`pipeline.type` zero-value**: pipelines criados antes da migração terão `type = ""` — tratar como `"kanban"` no frontend e backend

## Dependências internas
- **Deal**: `stageId` FK para PipelineStage — nunca deletar stage sem migrar deals
- **Contact / ContactDrawer**: `PipelinesSection` exibe deals vinculados ao contact; `NewDealDialog` carrega pipelines disponíveis
- **FlowBuilder**: `PipelineNode` permite criar/mover deals dentro de automações via `kanbanAction`
- **Settings**: `AISuggest` lê provider/model/apiKey do banco por tenant
- **Helpdesk Plugin** (futuro): threshold de estagnação (hoje hardcoded 7 dias) virá das configs do plugin SLA

## O que NÃO fazer
- Não usar `c.Get("tenantId")` bruto — sempre `auth.GetScoped()`
- Não deletar stages sem verificar deals vinculados
- Não retornar stages fixas no `AISuggest` — chamar o LLM configurado
- Não mostrar o chat IA no PipelineCreator sem verificar `aiPipelineEnabled`
- Não usar `PipelineWizard` (modal) — foi removido; fluxo único é o `PipelineCreator`

## Critério de sucesso
1. Criar pipeline tipo "funnel" → recarregar página → board abre direto em PipelineFunnelView
2. Chat de IA com "quero pipeline para vender imóveis" → backend chama LLM configurado → retorna stages contextuais
3. Provedor "custom" com URL local → `AISuggest` usa essa URL
4. Editar pipeline renomeando stage → deals preservados na stage renomeada
5. `aiPipelineEnabled = false` → sidebar de chat não aparece no PipelineCreator
