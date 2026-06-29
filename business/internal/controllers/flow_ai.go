package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/flow"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/aiclient"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/gin-gonic/gin"
)

// flowAISystemPrompt ensina a LLM a atuar como ASSISTENTE de construção de fluxos
// (entender + dar dicas) e, quando o pedido estiver claro, propor um RASCUNHO de
// grafo no contrato FlowGraph. Mantém um subconjunto prático de nós para confiabilidade.
const flowAISystemPrompt = `Você é o assistente do FlowBuilder do Watink — plataforma de atendimento e automação no WhatsApp. Sua função é AJUDAR o usuário a CONSTRUIR fluxos: entenda o objetivo, dê dicas claras de como estruturar, explique quais nós usar e, quando o pedido estiver claro o suficiente, proponha um RASCUNHO do fluxo (grafo) que ele vai refinar no canvas.

NÓS DISPONÍVEIS (use o campo "type" exatamente assim):
- start: início do fluxo (todo fluxo começa aqui). data: {"label":"Início"}
- trigger: gatilho de entrada. data: {"label":"...","triggerType":"keyword"|"firstContact"|"any"}
- message: envia uma mensagem ao contato. data: {"label":"...","content":"texto da mensagem"}
- menu: oferece opções numeradas; cada opção é uma saída. data: {"label":"...","menuTitle":"...","options":[{"id":"1","label":"Opção 1"},{"id":"2","label":"Opção 2"}]}
- switch: decisão por condição (ramifica). data: {"label":"..."}
- knowledge: responde usando uma Base de Conhecimento (RAG). data: {"label":"...","knowledgeBaseId":""}
- agent: agente de IA autônomo multi-turno. data: {"label":"...","knowledgeBaseId":"","persona":"...","maxTurns":5}
- ticket: cria/encaminha/encerra atendimento humano. data: {"label":"...","ticketAction":"transfer"}
- end: fim do fluxo. data: {"label":"Fim"}

EDGES conectam nós: {"id":"e1","source":"<id origem>","target":"<id destino>","sourceHandle":""}.
- Para o nó "menu", cada opção tem uma saída identificada por sourceHandle "opt-1","opt-2",... (1-based, na ordem das options).
- Os demais nós têm saída única (sourceHandle vazio "").

REGRAS:
- Todo fluxo começa com UM nó "start".
- IDs de nó são strings curtas e únicas (ex.: "n1","n2","n3").
- NÃO invente tipos de nó fora da lista.
- Se o pedido for vago, NÃO gere grafo: faça perguntas e dê dicas no "message", com "nodes":[] e "edges":[].
- Dê dicas práticas no "message" mesmo quando gerar o grafo (o que ajustar, o que conectar).

RESPONDA SEMPRE em JSON válido, sem nenhum texto fora do JSON, no formato:
{"message":"explicação/dicas/perguntas em português","nodes":[...],"edges":[...]}`

// aiFlowNode é a forma mínima que a LLM devolve por nó (sem position — injetada no Go).
type aiFlowNode struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// aiFlowResult é o JSON que a LLM deve produzir.
type aiFlowResult struct {
	Message string       `json:"message"`
	Nodes   []aiFlowNode `json:"nodes"`
	Edges   []flow.Edge  `json:"edges"`
}

// respFlowNode é a forma React Flow devolvida ao frontend (com position injetada).
type respFlowNode struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Position map[string]int  `json:"position"`
	Data     json.RawMessage `json:"data"`
}

// AISuggest handles POST /flows/ai — assistente de conversa de construção de
// fluxos. Entende o objetivo do usuário, dá dicas e (quando o pedido está claro)
// propõe um rascunho de grafo (nós + edges) que o frontend aplica no canvas.
// Gerado via LLM (settings do tenant, padrão PipelineController.AISuggest); o grafo
// é validado contra o contrato FlowGraph e, se inválido, cai para resposta só-texto.
//
// @Summary      Assistente de IA do FlowBuilder (dicas + rascunho de fluxo)
// @Tags         flows
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "{messages:[{role,content}]} ou {prompt}"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /flows/ai [post]
func (fc *FlowController) AISuggest(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}

	var req struct {
		Prompt   string `json:"prompt"`
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Settings de IA do tenant (mesmo padrão do PipelineController.AISuggest).
	var settings []models.Setting
	db.Where(`"tenantId" = ? AND key IN ?`, tenantID,
		[]string{"aiEnabled", "aiFlowBuilderEnabled", "aiProvider", "aiModel", "aiApiKey", "aiCustomBaseURL"},
	).Find(&settings)
	sm := make(map[string]string, len(settings))
	for _, s := range settings {
		sm[s.Key] = s.Value
	}
	if sm["aiEnabled"] != "true" || sm["aiFlowBuilderEnabled"] != "true" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ERR_AI_DISABLED"})
		return
	}
	if strings.TrimSpace(sm["aiApiKey"]) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ERR_NO_AI_API_KEY"})
		return
	}
	provider := sm["aiProvider"]
	if provider == "" {
		provider = "openai"
	}

	// Monta as mensagens: histórico (preferido) ou um único prompt.
	msgs := make([]aiclient.Message, 0, len(req.Messages)+2)
	if provider != "anthropic" {
		msgs = append(msgs, aiclient.Message{Role: "system", Content: flowAISystemPrompt})
	}
	if len(req.Messages) > 0 {
		for _, m := range req.Messages {
			role := m.Role
			if role == "ai" {
				role = "assistant"
			}
			msgs = append(msgs, aiclient.Message{Role: role, Content: m.Content})
		}
	} else {
		msgs = append(msgs, aiclient.Message{Role: "user", Content: req.Prompt})
	}

	result, err := aiclient.Complete(aiclient.Config{
		Provider: provider,
		Model:    sm["aiModel"],
		APIKey:   sm["aiApiKey"],
		BaseURL:  sm["aiCustomBaseURL"],
		System:   flowAISystemPrompt,
	}, msgs)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "ERR_AI_SERVICE_FAILED: " + err.Error()})
		return
	}

	parsed, parseOK := parseFlowAIResult(result.Content)
	if !parseOK {
		// Fallback advisor: devolve o texto cru como mensagem, sem grafo.
		c.JSON(http.StatusOK, gin.H{"message": strings.TrimSpace(result.Content), "nodes": []any{}, "edges": []any{}})
		return
	}

	nodes, edges, graphOK := validateAndLayout(parsed)
	if !graphOK {
		// Grafo inválido/ausente → só as dicas (assistente de conversa).
		c.JSON(http.StatusOK, gin.H{"message": parsed.Message, "nodes": []any{}, "edges": []any{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": parsed.Message, "nodes": nodes, "edges": edges})
}

// parseFlowAIResult extrai o JSON {message,nodes,edges} da resposta da LLM,
// tolerando cercas markdown (```json ... ```).
func parseFlowAIResult(raw string) (aiFlowResult, bool) {
	s := strings.TrimSpace(raw)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)
	var out aiFlowResult
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return aiFlowResult{}, false
	}
	return out, true
}

// validateAndLayout valida o rascunho contra o contrato FlowGraph e injeta posições
// (layout vertical). Retorna (nodes, edges, ok). ok=false quando não há grafo válido
// — nesse caso o handler responde só com a mensagem (modo advisor).
func validateAndLayout(r aiFlowResult) ([]respFlowNode, []flow.Edge, bool) {
	if len(r.Nodes) == 0 {
		return nil, nil, false
	}
	ids := make(map[string]bool, len(r.Nodes))
	hasStart := false
	out := make([]respFlowNode, 0, len(r.Nodes))
	for i, n := range r.Nodes {
		if n.ID == "" || !flow.IsValidNodeType(n.Type) {
			return nil, nil, false
		}
		if ids[n.ID] {
			return nil, nil, false // id duplicado
		}
		ids[n.ID] = true
		if n.Type == "start" || n.Type == "trigger" || n.Type == "input" {
			hasStart = true
		}
		data := n.Data
		if len(strings.TrimSpace(string(data))) == 0 {
			data = json.RawMessage(`{}`)
		}
		out = append(out, respFlowNode{
			ID:       n.ID,
			Type:     n.Type,
			Position: map[string]int{"x": 320, "y": 60 + i*130},
			Data:     data,
		})
	}
	if !hasStart {
		return nil, nil, false
	}
	// Edges devem referenciar nós existentes.
	for _, e := range r.Edges {
		if !ids[e.Source] || !ids[e.Target] {
			return nil, nil, false
		}
	}
	return out, r.Edges, true
}
