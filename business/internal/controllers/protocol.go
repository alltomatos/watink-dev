package controllers

import (
	crand "crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProtocolController serve o módulo Helpdesk (protocolos de atendimento).
// Depende de rabbit (envio da mensagem interativa de confirmação ao contato),
// broadcast (SSE do Kanban/chat) e db (root, usado na rota pública por token).
type ProtocolController struct {
	rabbit    domain.CommandPublisher
	broadcast domain.Broadcaster
	db        *gorm.DB
}

func NewProtocolController(r domain.CommandPublisher, b domain.Broadcaster, db *gorm.DB) *ProtocolController {
	return &ProtocolController{rabbit: r, broadcast: domain.BroadcastOrNop(b), db: db}
}

// protocolPriorityLabel mapeia a prioridade interna para o rótulo exibido ao
// contato na mensagem WhatsApp. medium → "Normal" (não "Média"), igual ao legado.
func protocolPriorityLabel(priority string) string {
	switch priority {
	case "low":
		return "Baixa"
	case "high":
		return "Alta"
	case "urgent":
		return "Urgente"
	default:
		return "Normal"
	}
}

// generateProtocolNumber gera "yyyyMMdd-####" (aleatório de 4 dígitos). NÃO é
// único (sem retry/constraint) — é um identificador legível, não uma PK.
func generateProtocolNumber() string {
	var r int64
	if n, err := crand.Int(crand.Reader, big.NewInt(10000)); err == nil {
		r = n.Int64()
	}
	return fmt.Sprintf("%s-%04d", time.Now().Format("20060102"), r)
}

// protocolPublicBaseURL resolve a origem pública para montar o link do protocolo.
// Prefere FRONTEND_URL; senão deriva do request (X-Forwarded-Proto/Host atrás de
// proxy, ou Host direto) — espelha o window.location.origin do frontend.
func protocolPublicBaseURL(c *gin.Context) string {
	if v := strings.TrimSpace(os.Getenv("FRONTEND_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	scheme := "http"
	if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	} else if c.Request.TLS != nil {
		scheme = "https"
	}
	host := c.GetHeader("X-Forwarded-Host")
	if host == "" {
		host = c.Request.Host
	}
	return scheme + "://" + host
}

// computeDueDate calcula o prazo de SLA (best-effort). Só aplica se o tenant
// habilitou o SLA (`helpdesk_sla_enabled`, seção Configurações > Helpdesk) e tem
// `helpdesk_sla_config` (JSON priority→MINUTOS — mesma unidade da UI "Tempos de
// Resolução do SLA (em minutos)"). Falha nunca bloqueia a criação — retorna nil.
func computeDueDate(db *gorm.DB, tenantID uuid.UUID, priority string) *time.Time {
	var enabled models.Setting
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where("key = ? AND \"tenantId\" = ?", "helpdesk_sla_enabled", tenantID).
		First(&enabled).Error; err != nil || enabled.Value != "true" {
		return nil
	}
	var cfg models.Setting
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where("key = ? AND \"tenantId\" = ?", "helpdesk_sla_config", tenantID).
		First(&cfg).Error; err != nil {
		return nil
	}
	var minutesByPriority map[string]int
	if err := json.Unmarshal([]byte(cfg.Value), &minutesByPriority); err != nil {
		return nil
	}
	m, ok := minutesByPriority[priority]
	if !ok || m <= 0 {
		return nil
	}
	due := time.Now().Add(time.Duration(m) * time.Minute)
	return &due
}

// addProtocolHistory insere uma linha de histórico (append-only). `changes` vazio
// vira "{}" para não quebrar a coluna jsonb.
func addProtocolHistory(db *gorm.DB, tenantID uuid.UUID, protocolID int, userID *int, action, prev, next, comment, changes string) {
	if changes == "" {
		changes = "{}"
	}
	h := models.ProtocolHistory{
		ProtocolID:    protocolID,
		UserID:        userID,
		Action:        action,
		PreviousValue: prev,
		NewValue:      next,
		Comment:       comment,
		Changes:       changes,
		TenantID:      tenantID,
		CreatedAt:     time.Now(),
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Create(&h).Error; err != nil {
		log.Printf("[Protocol] add history failed (protocol %d, action %s): %v", protocolID, action, err)
	}
}

type protocolCreateInput struct {
	Subject     string `json:"subject"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	Category    string `json:"category"`
	ContactID   *int   `json:"contactId"`
	TicketID    *int   `json:"ticketId"`
}

// createProtocol persiste o protocolo + a linha de histórico "created". O envio
// da mensagem ao contato é responsabilidade do chamador (só CreateFromContact).
func (pc *ProtocolController) createProtocol(c *gin.Context, db *gorm.DB, tenantID uuid.UUID, in protocolCreateInput) (*models.Protocol, error) {
	status := in.Status
	if status == "" {
		status = "open"
	}
	priority := in.Priority
	if priority == "" {
		priority = "medium"
	}
	var userIDPtr *int
	if uid, ok := currentUserID(c); ok {
		userIDPtr = &uid
	}

	p := models.Protocol{
		ProtocolNumber: generateProtocolNumber(),
		Token:          uuid.NewString(),
		Subject:        in.Subject,
		Description:    in.Description,
		Status:         status,
		Priority:       priority,
		Category:       in.Category,
		ContactID:      in.ContactID,
		TicketID:       in.TicketID,
		UserID:         userIDPtr,
		DueDate:        computeDueDate(db, tenantID, priority),
		TenantID:       tenantID,
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Create(&p).Error; err != nil {
		return nil, err
	}
	addProtocolHistory(db, tenantID, p.ID, userIDPtr, "created", "", status,
		fmt.Sprintf("Protocolo %s criado", p.ProtocolNumber), "")

	pc.broadcastProtocolEvent(tenantID, "create", &p, "", "")
	return &p, nil
}

// Create — POST /protocols (fluxo da tela Helpdesk: contactId no corpo, sem
// ticket, portanto sem mensagem ao contato).
func (pc *ProtocolController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	var in protocolCreateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if strings.TrimSpace(in.Subject) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject is required"})
		return
	}
	p, err := pc.createProtocol(c, db, tenantID, in)
	if err != nil {
		utils.RespondWithInternalError(c, err, "CreateProtocol")
		return
	}
	c.JSON(http.StatusCreated, p)
}

// CreateFromContact — POST /contacts/:contactId/protocols (fluxo do chat). Cria
// o protocolo vinculado ao contato/ticket e, havendo ticket com sessão, envia a
// mensagem interativa "Ver Protocolo" ao contato.
func (pc *ProtocolController) CreateFromContact(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	contactID, err := strconv.Atoi(c.Param("contactId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contactId"})
		return
	}
	var body struct {
		Subject     string `json:"subject"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		TicketID    *int   `json:"ticketId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	subject := strings.TrimSpace(body.Subject)
	if subject == "" {
		subject = "Novo Protocolo de Atendimento"
	}
	in := protocolCreateInput{
		Subject:     subject,
		Description: body.Description,
		Priority:    body.Priority,
		ContactID:   &contactID,
		TicketID:    body.TicketID,
	}
	p, err := pc.createProtocol(c, db, tenantID, in)
	if err != nil {
		utils.RespondWithInternalError(c, err, "CreateProtocolFromContact")
		return
	}

	if body.TicketID != nil {
		var ticket models.Ticket
		if err := db.Session(&gorm.Session{NewDB: true}).Preload("Contact").
			Where("id = ? AND \"tenantId\" = ?", *body.TicketID, tenantID).First(&ticket).Error; err == nil {
			pc.sendProtocolMessage(c, tenantID, p, ticket)
		} else {
			log.Printf("[Protocol] ticket %d not found for protocol %d — skipping notify", *body.TicketID, p.ID)
		}
	}

	c.JSON(http.StatusCreated, p)
}

// sendProtocolMessage publica a confirmação ao contato via engine e persiste a
// bolha no chat do ticket. Usa TEXTO SIMPLES com o link cru (WhatsApp autolinka
// URLs em texto puro em qualquer plataforma — Web/Desktop/mobile). Botão nativo
// (cta_url/NativeFlow e HydratedFourRowTemplate) foram tentados antes, mas na
// prática não renderizaram de forma confiável — voltamos ao link em texto, que
// é a mesma solução adotada no legado (commit b1a87eb63) para esse problema.
func (pc *ProtocolController) sendProtocolMessage(c *gin.Context, tenantID uuid.UUID, protocol *models.Protocol, ticket models.Ticket) {
	if ticket.WhatsappID == 0 {
		return
	}
	protocolURL := fmt.Sprintf("%s/public/protocols/%s", protocolPublicBaseURL(c), protocol.Token)
	body := fmt.Sprintf(
		"*Olá! Seu protocolo de atendimento foi criado com sucesso.*\n\n*Protocolo:* #%s\n*Assunto:* %s\n*Prioridade:* %s\n\n🔗 Acompanhe seu protocolo clicando aqui:\n%s",
		protocol.ProtocolNumber, protocol.Subject, protocolPriorityLabel(protocol.Priority), protocolURL,
	)

	to := contactJID(ticket.Contact)
	msgID := newWAMessageID()
	sessionID := ticket.WhatsappID

	commandType := "message.send.text"
	payload := map[string]interface{}{
		"sessionId": sessionID,
		"messageId": msgID,
		"to":        to,
		"body":      body,
	}
	command := map[string]interface{}{"type": commandType, "payload": payload}
	routingKey := fmt.Sprintf("wbot.%s.%d.%s", tenantID.String(), sessionID, commandType)
	if err := pc.rabbit.PublishCommand(routingKey, command); err != nil {
		log.Printf("[Protocol] publish text failed (protocol %d): %v", protocol.ID, err)
		return
	}

	// Persiste a bolha de saída para aparecer no chat — texto simples, sem
	// estrutura interativa (DataJson vazio).
	writeDB := pc.db.Session(&gorm.Session{NewDB: true})
	now := time.Now()
	contactID := ticket.ContactID
	outgoing := models.Message{
		ID: msgID, Body: body, Ack: 0, TicketID: ticket.ID, FromMe: true,
		ContactID: &contactID, TenantID: tenantID, Reactions: "[]",
		DataJson:  "{}",
		CreatedAt: now, UpdatedAt: now,
	}
	if err := writeDB.Create(&outgoing).Error; err != nil {
		log.Printf("[Protocol] persist outgoing message failed (protocol %d): %v", protocol.ID, err)
	}
	writeDB.Model(&models.Ticket{}).Where("id = ? AND \"tenantId\" = ?", ticket.ID, tenantID).
		Updates(map[string]interface{}{"lastMessage": body, "updatedAt": now})

	msgPayload := map[string]interface{}{"action": "create", "message": outgoing}
	pc.broadcast.EmitToRoom("/", "chat:"+strconv.Itoa(ticket.ID), "appMessage", msgPayload)
	pc.broadcast.EmitToTenantRoom(tenantID.String(), "appMessage", msgPayload)
}

// broadcastProtocolEvent emite o evento SSE "protocol" (tenant-scoped) que o
// Kanban do Helpdesk consome para atualização em tempo real.
func (pc *ProtocolController) broadcastProtocolEvent(tenantID uuid.UUID, action string, p *models.Protocol, prevStatus, newStatus string) {
	payload := map[string]interface{}{"action": action, "protocol": p}
	if action == "update" {
		payload["previousStatus"] = prevStatus
		payload["newStatus"] = newStatus
	}
	pc.broadcast.EmitToTenantRoom(tenantID.String(), "protocol", payload)
}
