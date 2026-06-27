package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var validQuickAnswerTypes = map[string]bool{
	"text": true, "interactive_buttons": true, "list": true,
	"media": true, "poll": true, "carousel": true,
}

func validateQuickAnswerType(t string) error {
	if t == "" || t == "text" {
		return nil
	}
	if !validQuickAnswerTypes[t] {
		return fmt.Errorf("invalid type %q: must be one of text, interactive_buttons, list, media, poll, carousel", t)
	}
	return nil
}

func validateQuickAnswerContent(content string) error {
	if content == "" || content == "null" {
		return nil
	}
	var js json.RawMessage
	if err := json.Unmarshal([]byte(content), &js); err != nil {
		return fmt.Errorf("content must be valid JSON: %w", err)
	}
	return nil
}

func isUniqueViolation(err error, indexName string) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, indexName) || (strings.Contains(msg, "unique") && strings.Contains(msg, "shortcut"))
}

// QuickAnswerController encapsulates quick answer operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetDB(c).
type QuickAnswerController struct {
	rabbit    domain.CommandPublisher
	broadcast domain.Broadcaster
	db        *gorm.DB
}

func NewQuickAnswerController(r domain.CommandPublisher, b domain.Broadcaster, db *gorm.DB) *QuickAnswerController {
	return &QuickAnswerController{rabbit: r, broadcast: domain.BroadcastOrNop(b), db: db}
}

func interpolateVariables(text string, vars map[string]string) string {
	for k, v := range vars {
		text = strings.ReplaceAll(text, "{{"+k+"}}", v)
	}
	return text
}

// @Summary      Listar respostas rápidas
// @Tags         quick-answers
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers [get]
func (qac *QuickAnswerController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}

	var quickAnswers []models.QuickAnswer
	if err := db.Where("\"tenantId\" = ?", tenantID).Order("shortcut ASC").Find(&quickAnswers).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListQuickAnswers")
		return
	}

	c.JSON(http.StatusOK, quickAnswers)
}

// @Summary      Detalhar resposta rápida
// @Tags         quick-answers
// @Produce      json
// @Param        quickAnswerId  path      int  true  "ID da resposta rápida"
// @Success      200            {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId} [get]
func (qac *QuickAnswerController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	id := c.Param("quickAnswerId")

	var quickAnswer models.QuickAnswer
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&quickAnswer).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ShowQuickAnswer")
		return
	}

	c.JSON(http.StatusOK, quickAnswer)
}

type updateQuickAnswerInput struct {
	Shortcut  string `json:"shortcut"`
	Message   string `json:"message"`
	MediaType string `json:"mediaType"`
	DataJson  string `json:"dataJson"`
	Type      string `json:"type"`
	Content   string `json:"content"`
}

// maxQuickAnswerMessageLen is the maximum allowed length for a quick answer message body.
const maxQuickAnswerMessageLen = 65535

// @Summary      Criar resposta rápida
// @Tags         quick-answers
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados da resposta"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers [post]
func (qac *QuickAnswerController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}

	var qa models.QuickAnswer
	if err := c.ShouldBindJSON(&qa); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if _, err := utils.ValidateStringField(qa.Shortcut, "shortcut", 100); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(qa.Message, "message", maxQuickAnswerMessageLen); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(qa.MediaType, "mediaType", 50); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateQuickAnswerType(qa.Type); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateQuickAnswerContent(qa.Content); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	qa.TenantID = tenantID
	if qa.Type == "" {
		qa.Type = "text"
	}
	if err := db.Create(&qa).Error; err != nil {
		if isUniqueViolation(err, "idx_quick_answers_tenant_shortcut") {
			c.JSON(http.StatusConflict, gin.H{"error": "shortcut already exists for this tenant"})
			return
		}
		utils.RespondWithInternalError(c, err, "CreateQuickAnswer")
		return
	}

	c.JSON(http.StatusOK, qa)
}

// @Summary      Atualizar resposta rápida
// @Tags         quick-answers
// @Accept       json
// @Produce      json
// @Param        quickAnswerId  path      int                     true  "ID da resposta"
// @Param        body           body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200            {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId} [put]
func (qac *QuickAnswerController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	id := c.Param("quickAnswerId")

	var qa models.QuickAnswer
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&qa).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateQuickAnswer-Fetch")
		return
	}

	var input updateQuickAnswerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	shortcut, err := utils.ValidateStringField(input.Shortcut, "shortcut", 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	message, err := utils.ValidateStringField(input.Message, "message", maxQuickAnswerMessageLen)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	mediaType, err := utils.ValidateStringField(input.MediaType, "mediaType", 50)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateQuickAnswerType(input.Type); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateQuickAnswerContent(input.Content); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	qa.Shortcut = shortcut
	qa.Message = message
	qa.MediaType = mediaType
	if input.DataJson != "" {
		qa.DataJson = input.DataJson
	}
	if input.Type != "" {
		qa.Type = input.Type
	}
	if input.Content != "" {
		qa.Content = input.Content
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Save(&qa).Error; err != nil {
		if isUniqueViolation(err, "idx_quick_answers_tenant_shortcut") {
			c.JSON(http.StatusConflict, gin.H{"error": "shortcut already exists for this tenant"})
			return
		}
		utils.RespondWithInternalError(c, err, "UpdateQuickAnswer-Save")
		return
	}

	c.JSON(http.StatusOK, qa)
}

// @Summary      Disparar resposta rápida
// @Tags         quick-answers
// @Accept       json
// @Produce      json
// @Param        quickAnswerId  path      int                     true  "ID da resposta"
// @Param        body           body      map[string]interface{}  true  "ticketId e variables opcionais"
// @Success      200            {object}  map[string]string
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId}/send [post]
func (qac *QuickAnswerController) Send(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	qaID := c.Param("quickAnswerId")

	var input struct {
		TicketID  int               `json:"ticketId"`
		Variables map[string]string `json:"variables"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if input.TicketID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ticketId is required"})
		return
	}

	var qa models.QuickAnswer
	if err := db.Where("id = ? AND \"tenantId\" = ?", qaID, tenantID).First(&qa).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "quick answer not found"})
		return
	}

	var ticket models.Ticket
	if err := db.Session(&gorm.Session{NewDB: true}).Preload("Contact").Where("id = ? AND \"tenantId\" = ?", input.TicketID, tenantID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
		return
	}

	autoVars := map[string]string{
		"contact_name": ticket.Contact.Name,
		"ticket_id":    strconv.Itoa(ticket.ID),
		"agent_name":   tenantID.String(),
		"company_name": tenantID.String(),
	}
	for k, v := range input.Variables {
		autoVars[k] = v
	}

	content := interpolateVariables(qa.Content, autoVars)
	message := interpolateVariables(qa.Message, autoVars)

	qaType := qa.Type
	if qaType == "" {
		qaType = "text"
	}

	commandType := "message.send.text"
	switch qaType {
	case "interactive_buttons":
		commandType = "message.send.interactive"
	case "list":
		commandType = "message.send.list"
	case "media":
		commandType = "message.send.media"
	case "poll":
		commandType = "message.send.poll"
	}

	to := contactJID(ticket.Contact)

	msgID := newWAMessageID()
	sessionID := ticket.WhatsappID

	var contentMap map[string]interface{}
	if content != "" {
		_ = json.Unmarshal([]byte(content), &contentMap)
	}

	var payload map[string]interface{}
	switch qaType {
	case "media":
		mediaURL, _ := contentMap["url"].(string)
		caption, _ := contentMap["caption"].(string)
		mediaType, _ := contentMap["mediaType"].(string)
		if caption == "" {
			caption = message
		}
		mimeType := "image/jpeg"
		if mediaType == "video" {
			mimeType = "video/mp4"
		} else if mediaType == "audio" {
			mimeType = "audio/ogg"
		}
		payload = map[string]interface{}{
			"sessionId": sessionID,
			"messageId": msgID,
			"to":        to,
			"body":      caption,
			"mediaUrl":  mediaURL,
			"mediaType": mediaType,
			"mimeType":  mimeType,
		}
	case "interactive_buttons":
		// NativeFlow InteractiveMessage. Confirmed (whatsmeow #1144/#1145, mai/2026)
		// que apenas os names quick_reply e cta_url renderizam em contas PESSOAIS
		// (Android/iOS/Web). cta_call é mapeado por completude, mas pode degradar.
		// O engine adiciona MessageVersion=3 — sem ele a bolha vira texto puro.
		bodyText, _ := contentMap["body"].(string)
		footerText, _ := contentMap["footer"].(string)
		if bodyText == "" {
			bodyText = message
		}
		var buttons []map[string]interface{}
		if rawBtns, ok := contentMap["buttons"].([]interface{}); ok {
			for i, rb := range rawBtns {
				bm, ok := rb.(map[string]interface{})
				if !ok {
					continue
				}
				id, _ := bm["id"].(string)
				label, _ := bm["label"].(string)
				if id == "" {
					id = fmt.Sprintf("btn_%d", i)
				}
				btnType, _ := bm["type"].(string)
				var name string
				var params map[string]string
				switch btnType {
				case "url":
					url, _ := bm["url"].(string)
					name = "cta_url"
					params = map[string]string{"display_text": label, "url": url, "merchant_url": url}
				case "call":
					phone, _ := bm["phoneNumber"].(string)
					name = "cta_call"
					params = map[string]string{"display_text": label, "phone_number": phone}
				default: // "quickreply" / "quick_reply" / vazio
					name = "quick_reply"
					params = map[string]string{"display_text": label, "id": id}
				}
				paramsJSON, _ := json.Marshal(params)
				buttons = append(buttons, map[string]interface{}{
					"name":   name,
					"params": string(paramsJSON),
				})
			}
		}
		payload = map[string]interface{}{
			"sessionId":  sessionID,
			"messageId":  msgID,
			"to":         to,
			"bodyText":   bodyText,
			"footerText": footerText,
			"buttons":    buttons,
		}
	case "list":
		description, _ := contentMap["body"].(string)
		buttonText, _ := contentMap["button"].(string)
		footerText, _ := contentMap["footer"].(string)
		if description == "" {
			description = message
		}
		payload = map[string]interface{}{
			"sessionId":   sessionID,
			"messageId":   msgID,
			"to":          to,
			"title":       message,
			"buttonText":  buttonText,
			"description": description,
			"footerText":  footerText,
			"sections":    contentMap["sections"],
		}
	case "poll":
		question, _ := contentMap["question"].(string)
		if question == "" {
			question = message
		}
		var options []string
		if rawOpts, ok := contentMap["options"].([]interface{}); ok {
			for _, o := range rawOpts {
				if s, ok := o.(string); ok {
					options = append(options, s)
				}
			}
		}
		selectableCount := 1
		if ms, ok := contentMap["maxSelections"].(float64); ok {
			selectableCount = int(ms)
		}
		payload = map[string]interface{}{
			"sessionId":       sessionID,
			"messageId":       msgID,
			"to":              to,
			"name":            question,
			"options":         options,
			"selectableCount": selectableCount,
		}
	default:
		payload = map[string]interface{}{
			"sessionId": sessionID,
			"messageId": msgID,
			"to":        to,
			"body":      message,
		}
	}

	command := map[string]interface{}{
		"type":    commandType,
		"payload": payload,
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.%s", tenantID.String(), ticket.WhatsappID, commandType)
	if err := qac.rabbit.PublishCommand(routingKey, command); err != nil {
		utils.RespondWithInternalError(c, err, "SendQuickAnswer")
		return
	}

	// Persist outgoing message so it appears in the UI and ack events can find it.
	writeDB := qac.db.Session(&gorm.Session{NewDB: true})
	contactID := ticket.ContactID
	now := time.Now()

	msgBody := message
	msgMediaURL := ""
	msgMediaType := ""
	if qaType == "media" {
		if mu, ok := contentMap["url"].(string); ok {
			msgMediaURL = mu
		}
		if mt, ok := contentMap["mediaType"].(string); ok {
			msgMediaType = mt
		}
		if msgBody == "" {
			if cap, ok := contentMap["caption"].(string); ok {
				msgBody = cap
			}
		}
		if msgBody == "" {
			msgBody = "📎 Mídia"
		}
	}

	outgoing := models.Message{
		ID:        msgID,
		Body:      msgBody,
		Ack:       0,
		MediaType: msgMediaType,
		MediaUrl:  msgMediaURL,
		TicketID:  input.TicketID,
		FromMe:    true,
		ContactID: &contactID,
		TenantID:  tenantID,
		Reactions: "[]",
		DataJson:  "{}",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := writeDB.Create(&outgoing).Error; err != nil {
		log.Printf("[SendQuickAnswer] persist outgoing message failed (ticket %d): %v", input.TicketID, err)
	}

	lastMessage := msgBody
	writeDB.Model(&models.Ticket{}).
		Where("id = ? AND \"tenantId\" = ?", input.TicketID, tenantID).
		Updates(map[string]interface{}{"lastMessage": lastMessage, "updatedAt": now})

	ticketRoom := "chat:" + strconv.Itoa(input.TicketID)
	msgPayload := map[string]interface{}{"action": "create", "message": outgoing}
	qac.broadcast.EmitToRoom("/", ticketRoom, "appMessage", msgPayload)
	qac.broadcast.EmitToTenantRoom(tenantID.String(), "appMessage", msgPayload)
	qac.broadcast.EmitToTenantRoom(tenantID.String(), "ticket", map[string]interface{}{
		"action": "update",
		"ticket": map[string]interface{}{
			"id":          input.TicketID,
			"lastMessage": lastMessage,
			"updatedAt":   now,
		},
	})

	c.JSON(http.StatusOK, gin.H{"message": "sent"})
}

// @Summary      Remover resposta rápida
// @Tags         quick-answers
// @Produce      json
// @Param        quickAnswerId  path      int  true  "ID da resposta"
// @Success      200            {object}  map[string]string
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId} [delete]
func (qac *QuickAnswerController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	id := c.Param("quickAnswerId")

	result := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.QuickAnswer{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteQuickAnswer")
		return
	}
	if result.RowsAffected == 0 {
		utils.RespondWithInternalError(c, gorm.ErrRecordNotFound, "DeleteQuickAnswer-NotFound")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quick answer deleted successfully"})
}
