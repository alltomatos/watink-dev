package services

import (
	"fmt"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
)

func StartWhatsAppSession(whatsapp models.Whatsapp, usePairingCode bool, phoneNumber string, force bool) error {
	lockKey := fmt.Sprintf("session:start:%d", whatsapp.ID)
	lockValue := uuid.New().String()

	acquired, err := SetLock(lockKey, lockValue, 10*time.Second)
	if err != nil {
		return err
	}
	if !acquired {
		return fmt.Errorf("ERR_SESSION_STARTING_ALREADY")
	}

	// Update Status
	database.DB.Model(&whatsapp).Update("status", "OPENING")

	// Emit via Socket
	EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action":  "update",
		"session": whatsapp,
	})

	// RabbitMQ Command
	rabbit := NewRabbitMQService()
	if err := rabbit.Connect(); err != nil {
		return err
	}

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
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.session.start", whatsapp.TenantID, whatsapp.ID)
	return rabbit.PublishCommand(routingKey, command)
}

func StopWhatsAppSession(whatsapp models.Whatsapp) error {
	routingKey, command := buildSessionCommand(whatsapp, "session.stop")
	return publishWhatsAppSessionCommand(routingKey, command)
}

func DeleteWhatsAppSession(whatsapp models.Whatsapp) error {
	routingKey, command := buildDeleteSessionCommand(whatsapp)
	return publishWhatsAppSessionCommand(routingKey, command)
}

func buildDeleteSessionCommand(whatsapp models.Whatsapp) (string, map[string]interface{}) {
	return buildSessionCommand(whatsapp, "session.delete")
}

func buildSessionCommand(whatsapp models.Whatsapp, commandType string) (string, map[string]interface{}) {
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

func publishWhatsAppSessionCommand(routingKey string, command map[string]interface{}) error {
	rabbit := NewRabbitMQService()
	if err := rabbit.Connect(); err != nil {
		return err
	}
	return rabbit.PublishCommand(routingKey, command)
}
