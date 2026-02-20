package services

import (
	"fmt"
	"time"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
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
	// RabbitMQ Command
	rabbit := NewRabbitMQService()
	if err := rabbit.Connect(); err != nil {
		return err
	}

	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  whatsapp.TenantID,
		"type":      "session.stop",
		"payload": map[string]interface{}{
			"sessionId": whatsapp.ID,
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.session.stop", whatsapp.TenantID, whatsapp.ID)
	return rabbit.PublishCommand(routingKey, command)
}
