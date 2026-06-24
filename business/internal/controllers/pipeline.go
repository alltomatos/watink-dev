package controllers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/aiclient"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// PipelineController encapsulates pipeline operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetScoped.
type PipelineController struct{}

func NewPipelineController() *PipelineController {
	return &PipelineController{}
}

// @Summary      Listar pipelines
// @Tags         pipelines
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines [get]
func (pc *PipelineController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Pipelines")
	if !ok {
		return
	}

	var pipelines []models.Pipeline
	if err := db.Where("\"tenantId\" = ?", tenantID).Preload("Stages").Find(&pipelines).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListPipelines")
		return
	}

	c.JSON(200, pipelines)
}

// @Summary      Importar pipeline
// @Tags         pipelines
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do pipeline"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/import [post]
func (pc *PipelineController) Import(c *gin.Context) {
	pc.Create(c)
}

// @Summary      Exportar pipeline
// @Tags         pipelines
// @Produce      json
// @Param        pipelineId  path      int  true  "ID do pipeline"
// @Success      200         {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/export/{pipelineId} [get]
func (pc *PipelineController) Export(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Pipelines")
	if !ok {
		return
	}
	id := c.Param("pipelineId")

	var pipeline models.Pipeline
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Stages").First(&pipeline).Error; err != nil {
		c.JSON(404, gin.H{"error": "Pipeline not found"})
		return
	}

	c.JSON(200, pipeline)
}

// @Summary      Sugestão IA de pipeline
// @Description  Gera sugestão de pipeline com IA baseada em contexto de atendimento
// @Tags         pipelines
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Mensagens de contexto"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/ai-suggest [post]
func (pc *PipelineController) AISuggest(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Settings")
	if !ok {
		return
	}

	var req struct {
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	// Load AI settings for this tenant
	var settings []models.Setting
	db.Where("\"tenantId\" = ? AND key IN ?", tenantID,
		[]string{"aiEnabled", "aiPipelineEnabled", "aiProvider", "aiModel", "aiApiKey", "aiCustomBaseURL", "aiGuidePrompt"},
	).Find(&settings)

	settingMap := make(map[string]string, len(settings))
	for _, s := range settings {
		settingMap[s.Key] = s.Value
	}

	if settingMap["aiEnabled"] != "true" || settingMap["aiPipelineEnabled"] != "true" {
		c.JSON(400, gin.H{"error": "ERR_AI_DISABLED"})
		return
	}

	apiKey := settingMap["aiApiKey"]
	if strings.TrimSpace(apiKey) == "" {
		c.JSON(400, gin.H{"error": "ERR_NO_AI_API_KEY"})
		return
	}

	provider := settingMap["aiProvider"]
	if provider == "" {
		provider = "openai"
	}
	if provider == "custom" && strings.TrimSpace(settingMap["aiCustomBaseURL"]) == "" {
		c.JSON(400, gin.H{"error": "ERR_NO_AI_BASE_URL"})
		return
	}

	// Build system prompt
	systemPrompt := settingMap["aiGuidePrompt"]
	if systemPrompt == "" {
		systemPrompt = "Você é um assistente especializado em processos de negócio. " +
			"Quando o usuário descrever um processo ou contexto, sugira etapas de pipeline adequadas. " +
			"Responda SEMPRE em JSON válido no formato: {\"message\": \"texto explicativo\", \"stages\": [\"Etapa 1\", \"Etapa 2\", ...]}. " +
			"Sugira entre 3 e 7 etapas relevantes ao contexto descrito. Não inclua nenhum texto fora do JSON."
	} else {
		systemPrompt += "\n\nResponda SEMPRE em JSON válido no formato: {\"message\": \"texto explicativo\", \"stages\": [\"Etapa 1\", \"Etapa 2\", ...]}."
	}

	// Convert messages
	var msgs []aiclient.Message
	if provider != "anthropic" {
		msgs = append(msgs, aiclient.Message{Role: "system", Content: systemPrompt})
	}
	for _, m := range req.Messages {
		role := m.Role
		if role == "ai" {
			role = "assistant"
		}
		msgs = append(msgs, aiclient.Message{Role: role, Content: m.Content})
	}

	cfg := aiclient.Config{
		Provider: provider,
		Model:    settingMap["aiModel"],
		APIKey:   apiKey,
		BaseURL:  settingMap["aiCustomBaseURL"],
		System:   systemPrompt,
	}

	result, err := aiclient.Complete(cfg, msgs)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "ERR_NO_AI_API_KEY") {
			c.JSON(400, gin.H{"error": "ERR_NO_AI_API_KEY"})
		} else {
			c.JSON(502, gin.H{"error": fmt.Sprintf("ERR_AI_SERVICE_FAILED: %s", errMsg)})
		}
		return
	}

	// Parse JSON response from LLM
	var parsed struct {
		Message string   `json:"message"`
		Stages  []string `json:"stages"`
	}
	content := strings.TrimSpace(result.Content)
	// Strip markdown code fences if present
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	if err := json.Unmarshal([]byte(content), &parsed); err != nil || len(parsed.Stages) == 0 {
		// Fallback: return raw content as message, no stages
		c.JSON(200, gin.H{
			"message": result.Content,
			"stages":  []string{},
		})
		return
	}

	c.JSON(200, gin.H{
		"message": parsed.Message,
		"stages":  parsed.Stages,
	})
}

type createPipelineInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Stages      []struct {
		Name string `json:"name"`
	} `json:"stages"`
}

type updatePipelineInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Stages      []struct {
		Name string `json:"name"`
	} `json:"stages"`
}
