package services

import (
	"fmt"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
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
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.session.start", whatsapp.TenantID, whatsapp.ID)
	return wss.publisher.PublishCommand(routingKey, command)
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
