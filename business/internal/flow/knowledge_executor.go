package flow

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/aiclient"
)

// defaultKnowledgeMinScore is the relevance floor for RAG retrieval. Chunks
// scoring below it (cosine similarity, [0,1]) are dropped, so an off-topic
// question retrieves nothing and the guardrail ("não sei"/handoff) fires
// instead of grounding the answer on irrelevant chunks. Was hardcoded 0.0
// (guardrail inert). Override per-tenant via the aiKnowledgeMinScore setting.
const defaultKnowledgeMinScore = 0.2

// knowledgeMinScore returns the tenant's configured minScore (aiKnowledgeMinScore,
// clamped to [0,1]) or defaultKnowledgeMinScore when unset/invalid.
func knowledgeMinScore(st *ExecState) float64 {
	if st.DB == nil {
		return defaultKnowledgeMinScore
	}
	var setting models.Setting
	if err := st.DB.Where(`"tenantId" = ? AND key = ?`, st.TenantID, "aiKnowledgeMinScore").
		First(&setting).Error; err == nil {
		if v, perr := strconv.ParseFloat(strings.TrimSpace(setting.Value), 64); perr == nil && v >= 0 && v <= 1 {
			return v
		}
	}
	return defaultKnowledgeMinScore
}

// knowledgeData is the "knowledge" node envelope (KnowledgeForm.tsx):
// knowledgeBaseId selects the base to query; responseMode is reserved for
// future answer-shaping (unused in FASE 1).
type knowledgeData struct {
	KnowledgeBaseID int    `json:"knowledgeBaseId"`
	ResponseMode    string `json:"responseMode"`
}

// knowledgeExecutor answers the inbound question from a tenant's knowledge base
// (RAG). It retrieves the top chunks via the Retriever, then asks the tenant's
// configured LLM to answer using ONLY that context (guardrails: cite the source,
// say "I don't know" when the context does not cover it). On any retrieval/LLM
// failure it degrades gracefully — it never aborts the run.
//
// Reads the tenant AI settings from st.DB with a manual WHERE "tenantId" (RLS is
// inert in the worker path).
type knowledgeExecutor struct{}

func (knowledgeExecutor) Type() string { return string(NodeKnowledge) }

func (knowledgeExecutor) Execute(ctx context.Context, st *ExecState, node Node) (Outcome, error) {
	var d knowledgeData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	if d.KnowledgeBaseID == 0 || st.Retriever == nil {
		return Outcome{Kind: OutcomeAdvance, Detail: "knowledge: sem base/retriever"}, nil
	}

	query := strings.TrimSpace(st.Inbound)
	if query == "" {
		return Outcome{Kind: OutcomeAdvance, Detail: "knowledge: sem pergunta"}, nil
	}

	chunks, err := st.Retriever.Retrieve(ctx, st.TenantID, d.KnowledgeBaseID, 6, knowledgeMinScore(st), query)
	if err != nil {
		return Outcome{Kind: OutcomeAdvance, Detail: "knowledge: erro retrieve"}, nil
	}

	if len(chunks) == 0 {
		_ = sendWhatsApp(ctx, st, node.ID, "Não encontrei essa informação na base de conhecimento.", nil)
		return Outcome{Kind: OutcomeAdvance, Detail: "knowledge: vazio"}, nil
	}

	answer := knowledgeAnswer(st, query, chunks)
	_ = sendWhatsApp(ctx, st, node.ID, answer, nil)
	return Outcome{Kind: OutcomeAdvance, Detail: "knowledge: respondido"}, nil
}

// knowledgeAnswer builds the guardrailed prompt, calls the tenant LLM and
// returns the answer. On any LLM error or empty reply it falls back to the text
// of the first retrieved chunk, so the contact always gets a grounded response.
func knowledgeAnswer(st *ExecState, query string, chunks []RetrievedChunk) string {
	fallback := chunks[0].Text

	cfg, ok := knowledgeAIConfig(st)
	if !ok {
		return fallback
	}

	var contextBuilder strings.Builder
	for i := range chunks {
		if i > 0 {
			contextBuilder.WriteString("\n\n---\n\n")
		}
		contextBuilder.WriteString(chunks[i].Text)
		if chunks[i].Citation != "" {
			contextBuilder.WriteString("\n[Fonte: ")
			contextBuilder.WriteString(chunks[i].Citation)
			contextBuilder.WriteString("]")
		}
	}

	system := "Você é um assistente de atendimento. Responda à pergunta do usuário " +
		"usando SOMENTE as informações do CONTEXTO fornecido. Cite a fonte do trecho " +
		"que embasou a resposta. Se o contexto não cobrir a pergunta, diga claramente " +
		"que não tem essa informação na base de conhecimento — nunca invente."
	cfg.System = system

	userMsg := "Pergunta:\n" + query + "\n\nCONTEXTO:\n" + contextBuilder.String()

	msgs := []aiclient.Message{}
	if cfg.Provider != "anthropic" {
		msgs = append(msgs, aiclient.Message{Role: "system", Content: system})
	}
	msgs = append(msgs, aiclient.Message{Role: "user", Content: userMsg})

	resp, err := aiclient.Complete(cfg, msgs)
	if err != nil || resp == nil || strings.TrimSpace(resp.Content) == "" {
		return fallback
	}
	answer := strings.TrimSpace(resp.Content)
	// Citação obrigatória: se o modelo respondeu sem citar a fonte, anexa a do
	// trecho mais relevante para manter a resposta rastreável (invariante RAG).
	if !strings.Contains(strings.ToLower(answer), "[fonte:") && chunks[0].Citation != "" {
		answer += "\n[Fonte: " + chunks[0].Citation + "]"
	}
	return answer
}

// knowledgeAIConfig loads the tenant's AI settings (provider/model/key/baseURL)
// from st.DB with a manual WHERE "tenantId". Returns ok=false when no API key is
// configured (caller falls back to the raw chunk).
func knowledgeAIConfig(st *ExecState) (aiclient.Config, bool) {
	if st.DB == nil {
		return aiclient.Config{}, false
	}

	var settings []models.Setting
	st.DB.Where(`"tenantId" = ? AND key IN ?`, st.TenantID,
		[]string{"aiProvider", "aiModel", "aiApiKey", "aiCustomBaseURL"},
	).Find(&settings)

	settingMap := make(map[string]string, len(settings))
	for _, s := range settings {
		settingMap[s.Key] = s.Value
	}

	apiKey := strings.TrimSpace(settingMap["aiApiKey"])
	if apiKey == "" {
		return aiclient.Config{}, false
	}

	provider := settingMap["aiProvider"]
	if provider == "" {
		provider = "openai"
	}
	if provider == "custom" && strings.TrimSpace(settingMap["aiCustomBaseURL"]) == "" {
		return aiclient.Config{}, false
	}

	return aiclient.Config{
		Provider: provider,
		Model:    settingMap["aiModel"],
		APIKey:   apiKey,
		BaseURL:  settingMap["aiCustomBaseURL"],
	}, true
}
