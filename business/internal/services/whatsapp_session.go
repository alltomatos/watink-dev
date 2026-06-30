package services

import (
	"fmt"
	"net"
	"net/url"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WhatsAppSessionService struct {
	db        *gorm.DB
	publisher domain.CommandPublisher
	redisSvc  domain.RedisService
	broadcast domain.Broadcaster
}

func NewWhatsAppSessionService(db *gorm.DB, pub domain.CommandPublisher, redisSvc domain.RedisService, broadcast domain.Broadcaster) *WhatsAppSessionService {
	return &WhatsAppSessionService{db: db, publisher: pub, redisSvc: redisSvc, broadcast: broadcast}
}

func (wss *WhatsAppSessionService) StartWhatsAppSession(whatsapp models.Whatsapp, usePairingCode bool, phoneNumber string, force bool) error {
	// Resolve the proxy URL first. Fail-closed: if a proxy IS configured but can't
	// be composed (missing key, inactive, decrypt error), refuse to start rather
	// than connect on the bare server IP — that would leak the real egress IP.
	proxyURL, err := wss.composeProxyURL(whatsapp)
	if err != nil {
		return fmt.Errorf("proxy configuration error: %w", err)
	}

	lockKey := fmt.Sprintf("session:start:%d", whatsapp.ID)
	lockValue := uuid.New().String()

	acquired, err := wss.redisSvc.SetLock(lockKey, lockValue, 10*time.Second)
	if err != nil {
		return err
	}
	if !acquired {
		return fmt.Errorf("ERR_SESSION_STARTING_ALREADY")
	}

	// Update Status — CRITICAL: tenant-scoped
	if err := wss.db.Model(&whatsapp).Where("id = ? AND \"tenantId\" = ?", whatsapp.ID, whatsapp.TenantID).Update("status", "OPENING").Error; err != nil {
		return err
	}

	// Emit via Socket (via injected broadcast)
	wss.broadcast.EmitToTenantRoom(whatsapp.TenantID.String(), "whatsappSession", map[string]interface{}{
		"action":  "update",
		"session": whatsapp,
	})

	// RabbitMQ Command
	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  whatsapp.TenantID,
		"type":      "session.start",
		"payload": map[string]interface{}{
			"sessionId":      whatsapp.ID,
			"usePairingCode": usePairingCode,
			"phoneNumber":    phoneNumber,
			"name":           whatsapp.Name,
			"syncHistory":    whatsapp.SyncHistory,
			"syncPeriod":     whatsapp.SyncPeriod,
			"keepAlive":      whatsapp.KeepAlive,
			"force":          force,
			"wid":            whatsapp.Wid,
			// proxyUrl carrega scheme://user:pass@host:port (credencial em claro).
			// NUNCA logar este payload — o engine o consome via env.Payload.proxyUrl.
			"proxyUrl": proxyURL,
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.session.start", whatsapp.TenantID, whatsapp.ID)
	return wss.publisher.PublishCommand(routingKey, command)
}

// composeProxyURL builds the proxy URL for the connection from its assigned
// Proxy record, decrypting the password. Returns "" when no proxy is assigned.
// Returns an error (fail-closed) when a proxy IS assigned but unusable.
func (wss *WhatsAppSessionService) composeProxyURL(whatsapp models.Whatsapp) (string, error) {
	if whatsapp.ProxyMode != "single" || whatsapp.ProxyID == nil {
		return "", nil
	}
	var p models.Proxy
	if err := wss.db.Where(`id = ? AND "tenantId" = ?`, *whatsapp.ProxyID, whatsapp.TenantID).First(&p).Error; err != nil {
		return "", fmt.Errorf("proxy %d não encontrado para a conexão %d: %w", *whatsapp.ProxyID, whatsapp.ID, err)
	}
	if p.Status != "active" {
		return "", fmt.Errorf("proxy %d não está ativo (status=%s)", p.ID, p.Status)
	}
	pass, err := cryptobox.Decrypt(p.PasswordEnc)
	if err != nil {
		return "", fmt.Errorf("falha ao descriptografar senha do proxy %d: %w", p.ID, err)
	}
	scheme := p.Scheme
	if scheme == "" {
		scheme = "http"
	}
	// net.JoinHostPort coloca colchetes em hosts IPv6 (ex: [::1]:1080).
	u := url.URL{Scheme: scheme, Host: net.JoinHostPort(p.Host, strconv.Itoa(p.Port))}
	if p.Username != "" || pass != "" {
		u.User = url.UserPassword(p.Username, pass)
	}
	return u.String(), nil
}

func (wss *WhatsAppSessionService) StopWhatsAppSession(whatsapp models.Whatsapp) error {
	routingKey, command := wss.buildSessionCommand(whatsapp, "session.stop")
	return wss.publishWhatsAppSessionCommand(routingKey, command)
}

func (wss *WhatsAppSessionService) DeleteWhatsAppSession(whatsapp models.Whatsapp) error {
	routingKey, command := wss.buildDeleteSessionCommand(whatsapp)
	return wss.publishWhatsAppSessionCommand(routingKey, command)
}

func (wss *WhatsAppSessionService) buildDeleteSessionCommand(whatsapp models.Whatsapp) (string, map[string]interface{}) {
	return wss.buildSessionCommand(whatsapp, "session.delete")
}

func (wss *WhatsAppSessionService) buildSessionCommand(whatsapp models.Whatsapp, commandType string) (string, map[string]interface{}) {
	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  whatsapp.TenantID,
		"type":      commandType,
		"payload": map[string]interface{}{
			"sessionId": whatsapp.ID,
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.%s", whatsapp.TenantID, whatsapp.ID, commandType)
	return routingKey, command
}

func (wss *WhatsAppSessionService) publishWhatsAppSessionCommand(routingKey string, command map[string]interface{}) error {
	return wss.publisher.PublishCommand(routingKey, command)
}

// Legacy global functions — deprecated. Use NewWhatsAppSessionService instead.
// Kept for compilation and to fail-closed.
func StartWhatsAppSession(whatsapp models.Whatsapp, usePairingCode bool, phoneNumber string, force bool) error {
	return fmt.Errorf("legacy global functions disabled — use NewWhatsAppSessionService(db, pub, redisSvc, broadcast)")
}

func StopWhatsAppSession(whatsapp models.Whatsapp) error {
	return fmt.Errorf("legacy global functions disabled — use NewWhatsAppSessionService(db, pub, redisSvc, broadcast)")
}

func DeleteWhatsAppSession(whatsapp models.Whatsapp) error {
	return fmt.Errorf("legacy global functions disabled — use NewWhatsAppSessionService(db, pub, redisSvc, broadcast)")
}
