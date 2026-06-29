package controllers

import (
	"net/http"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/flow"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// KnowledgeInspectController expõe inspeção READ-ONLY do conhecimento vetorizado:
// (A) listar os chunks de uma fonte e (B) um playground de recuperação (query →
// top-k + score). Tudo tenant-scoped e via o gateway business — o frontend nunca
// fala direto com o watink-knowledge.
type KnowledgeInspectController struct {
	retriever flow.Retriever
}

func NewKnowledgeInspectController(retriever flow.Retriever) *KnowledgeInspectController {
	return &KnowledgeInspectController{retriever: retriever}
}

// chunkRow lê as colunas READ-ONLY do KBChunk. KBChunk é tabela do serviço Python
// (não é modelo GORM gerenciado) — por isso usamos raw SQL e NÃO o registramos no
// AutoMigrate. A coluna embedding (halfvec 2048) é omitida de propósito: não é
// legível por humano nem necessária aqui.
type chunkRow struct {
	Ordinal     int    `gorm:"column:ordinal"`
	Content     string `gorm:"column:content"`
	Model       string `gorm:"column:model"`
	Dim         int    `gorm:"column:dim"`
	ContentHash string `gorm:"column:contentHash"`
}

type chunkView struct {
	Ordinal     int    `json:"ordinal"`
	Content     string `json:"content"`
	CharCount   int    `json:"charCount"`
	Model       string `json:"model"`
	Dim         int    `json:"dim"`
	ContentHash string `json:"contentHash"`
}

// Chunks lista os chunks armazenados de uma fonte, para um humano inspecionar como
// o conteúdo foi dividido e embedado. Read-only.
//
// @Summary      Listar chunks de uma fonte
// @Tags         knowledge-base
// @Produce      json
// @Param        knowledgeBaseId  path      int  true  "ID da base"
// @Param        sourceId         path      int  true  "ID da fonte"
// @Success      200              {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId}/sources/{sourceId}/chunks [get]
func (kic *KnowledgeInspectController) Chunks(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	kbID := c.Param("knowledgeBaseId")
	sourceID := c.Param("sourceId")

	// A fonte tem de pertencer a este tenant+base (404 caso contrário) antes de ler chunks.
	var src models.KnowledgeBaseSource
	if err := db.Where("id = ? AND \"knowledgeBaseId\" = ? AND \"tenantId\" = ?", sourceID, kbID, tenantID).
		First(&src).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source not found"})
		return
	}

	// RLS é inerte → WHERE tenantId manual e obrigatório.
	var rows []chunkRow
	if err := db.Raw(
		`SELECT ordinal, content, model, dim, "contentHash"
		 FROM "KBChunk"
		 WHERE "tenantId" = ? AND "knowledgeBaseId" = ? AND "sourceId" = ?
		 ORDER BY ordinal`,
		tenantID, kbID, sourceID,
	).Scan(&rows).Error; err != nil {
		utils.RespondWithInternalError(c, err, "Failed to read chunks")
		return
	}

	views := make([]chunkView, 0, len(rows))
	for _, r := range rows {
		views = append(views, chunkView{
			Ordinal:     r.Ordinal,
			Content:     r.Content,
			CharCount:   len([]rune(r.Content)),
			Model:       r.Model,
			Dim:         r.Dim,
			ContentHash: r.ContentHash,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"sourceId":   src.ID,
		"type":       src.Type,
		"status":     src.Status,
		"chunkCount": len(views),
		"chunks":     views,
	})
}

// queryRequest é o corpo do playground de recuperação.
type queryRequest struct {
	Query    string  `json:"query"`
	TopK     int     `json:"topK"`
	MinScore float64 `json:"minScore"`
}

// queryHit é um resultado do playground com tags json em minúsculo (flow.RetrievedChunk
// não tem tags json).
type queryHit struct {
	Text     string  `json:"text"`
	SourceID int     `json:"sourceId"`
	Score    float64 `json:"score"`
	Citation string  `json:"citation"`
}

// Query roda uma recuperação na base para o humano AVALIAR a vetorização: devolve
// os top-k chunks mais próximos da pergunta, com score de similaridade e a fonte.
//
// @Summary      Playground de recuperação (query → top-k + score)
// @Tags         knowledge-base
// @Accept       json
// @Produce      json
// @Param        knowledgeBaseId  path      int  true  "ID da base"
// @Success      200              {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId}/query [post]
func (kic *KnowledgeInspectController) Query(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	if kic.retriever == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "serviço de recuperação indisponível"})
		return
	}
	kbIDParam := c.Param("knowledgeBaseId")

	// A base tem de pertencer a este tenant (404) antes de consultar.
	var kb models.KnowledgeBase
	if err := db.Where("id = ? AND \"tenantId\" = ?", kbIDParam, tenantID).First(&kb).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	var req queryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	if _, err := utils.ValidateStringField(req.Query, "query", 2000); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.TrimSpace(req.Query) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query é obrigatória"})
		return
	}
	topK := req.TopK
	if topK <= 0 || topK > 20 {
		topK = 6
	}
	// Clamp minScore ao range válido de similaridade cosseno [0,1]; um valor
	// negativo/absurdo do cliente desativaria o guardrail de baixa confiança.
	if req.MinScore < 0 || req.MinScore > 1 {
		req.MinScore = 0
	}

	chunks, err := kic.retriever.Retrieve(c.Request.Context(), tenantID, kb.ID, topK, req.MinScore, req.Query)
	if err != nil {
		utils.RespondWithInternalError(c, err, "knowledge query")
		return
	}

	hits := make([]queryHit, 0, len(chunks))
	for _, ch := range chunks {
		hits = append(hits, queryHit{
			Text:     ch.Text,
			SourceID: ch.SourceID,
			Score:    ch.Score,
			Citation: ch.Citation,
		})
	}

	c.JSON(http.StatusOK, gin.H{"query": req.Query, "topK": topK, "chunks": hits})
}
