package session

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"whaticket-engine-go/pkg/rabbitmq"

	_ "github.com/mattn/go-sqlite3"
)

type Manager struct {
	sessions  map[int]*whatsmeow.Client
	mq        *rabbitmq.Client
	container *sqlstore.Container
}

func NewManager(mq *rabbitmq.Client) *Manager {
	// Initialize whatsmeow store
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("sqlite3", "file:wabot.db?_foreign_keys=on", dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	return &Manager{
		sessions:  make(map[int]*whatsmeow.Client),
		mq:        mq,
		container: container,
	}
}

func (m *Manager) HandleCommand(env rabbitmq.Envelope) error {
	log.Printf("Received command: %s", env.Type)

	switch env.Type {
	case "session.start":
		return m.startSession(env)
	case "message.send.text":
		return m.sendText(env)
	default:
		log.Printf("Unknown command: %s", env.Type)
		return nil
	}
}

func (m *Manager) startSession(env rabbitmq.Envelope) error {
	payload, ok := env.Payload.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid payload")
	}

	sessionID := int(payload["sessionId"].(float64))
	tenantID := env.TenantID

	log.Printf("Starting session %d", sessionID)

	deviceStore, err := m.container.GetFirstDevice()
	if err != nil {
		return err
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	m.sessions[sessionID] = client

	// Event Handler
	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			m.handleMessage(sessionID, tenantID, v)
		case *events.Connected:
			m.publishStatus(sessionID, tenantID, "CONNECTED")
		case *events.Disconnected:
			m.publishStatus(sessionID, tenantID, "DISCONNECTED")
		}
	})

	if client.Store.ID == nil {
		// No ID stored, new login
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			return err
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				m.publishQR(sessionID, tenantID, evt.Code)
			} else {
				log.Printf("QR Event: %s", evt.Event)
			}
		}
	} else {
		// Already logged in
		err = client.Connect()
		if err != nil {
			return err
		}
	}

	return nil
}

func (m *Manager) publishQR(sessionID int, tenantID interface{}, code string) {
	routingKey := fmt.Sprintf("wbot.%v.%d.session.qrcode", tenantID, sessionID)
	m.mq.PublishEvent(routingKey, rabbitmq.Envelope{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UnixMilli(),
		TenantID:  tenantID,
		Type:      "session.qrcode",
		Payload: map[string]interface{}{
			"sessionId": sessionID,
			"qrcode":    code,
			"attempt":   1,
		},
	})
}

func (m *Manager) publishStatus(sessionID int, tenantID interface{}, status string) {
	routingKey := fmt.Sprintf("wbot.%v.%d.session.status", tenantID, sessionID)
	m.mq.PublishEvent(routingKey, rabbitmq.Envelope{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UnixMilli(),
		TenantID:  tenantID,
		Type:      "session.status",
		Payload: map[string]interface{}{
			"sessionId": sessionID,
			"status":    status,
		},
	})
}

func (m *Manager) handleMessage(sessionID int, tenantID interface{}, msg *events.Message) {
	routingKey := fmt.Sprintf("wbot.%v.%d.message.received", tenantID, sessionID)
	m.mq.PublishEvent(routingKey, rabbitmq.Envelope{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UnixMilli(),
		TenantID:  tenantID,
		Type:      "message.received",
		Payload: map[string]interface{}{
			"sessionId": sessionID,
			"message": map[string]interface{}{
				"id":        msg.Info.ID,
				"from":      msg.Info.Sender.String(),
				"body":      msg.Message.GetConversation(), // Simplify for now
				"fromMe":    msg.Info.IsFromMe,
				"timestamp": msg.Info.Timestamp.Unix(),
			},
		},
	})
}

func (m *Manager) sendText(env rabbitmq.Envelope) error {
	payload, ok := env.Payload.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid payload")
	}

	sessionID := int(payload["sessionId"].(float64))
	to := payload["to"].(string)
	body := payload["body"].(string)

	client, ok := m.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %d not found", sessionID)
	}

	jid, _ := types.ParseJID(to)
	_, err := client.SendMessage(context.Background(), jid, &whatsmeow.Message{
		Conversation: &body,
	})

	return err
}
