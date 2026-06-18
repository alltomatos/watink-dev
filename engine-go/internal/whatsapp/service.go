package whatsapp

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/alltomatos/watinkdev/engine-go/internal/rabbitmq"
	_ "github.com/lib/pq"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// WhatsAppService manages all active WhatsApp client sessions for a single engine-go instance.
type WhatsAppService struct {
	container *sqlstore.Container
	clients   map[int]*whatsmeow.Client
	mu        sync.RWMutex
	rabbit    *rabbitmq.RabbitMQService
	dsn       string
}

// NewWhatsAppService creates a WhatsAppService connecting whatsmeow to PostgreSQL via sqlstore.
func NewWhatsAppService(rabbit *rabbitmq.RabbitMQService) *WhatsAppService {
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	dsn := buildPostgresDSN()

	container, err := sqlstore.New(context.Background(), "postgres", dsn, dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to Postgres for WhatsMeow store: %v", err)
	}

	return &WhatsAppService{
		container: container,
		clients:   make(map[int]*whatsmeow.Client),
		rabbit:    rabbit,
		dsn:       dsn,
	}
}

// getConnectedClient returns the client for sessionID if it is connected and logged in.
func (s *WhatsAppService) getConnectedClient(sessionID int) (*whatsmeow.Client, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	client, ok := s.clients[sessionID]
	if !ok || !client.IsConnected() || !client.IsLoggedIn() {
		return nil, fmt.Errorf("session %d is not connected", sessionID)
	}
	return client, nil
}

// emitStatus publishes a session.status event to the backend.
func (s *WhatsAppService) emitStatus(id int, tenantID, status string) {
	s.publishEvent(tenantID, id, "session.status", map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"status":    status,
	})
}

// emitAck publishes a message.ack event (ack: 1=sent, 2=delivered, 3=read, 4=played, 5=error).
func (s *WhatsAppService) emitAck(sessionID int, tenantID, messageID string, ack int) {
	if messageID == "" {
		return
	}
	s.publishEvent(tenantID, sessionID, "message.ack", map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", sessionID),
		"messageId": messageID,
		"ack":       ack,
	})
}

// publishEvent wraps payload in an envelope and routes it to wbot.events via RabbitMQ.
func (s *WhatsAppService) publishEvent(tenantID string, sessionID int, eventType string, payload map[string]interface{}) {
	envelope := map[string]interface{}{
		"id":        fmt.Sprintf("%d-%d", time.Now().UnixNano(), sessionID),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  tenantID,
		"type":      eventType,
		"payload":   eventPayloadWithTenant(tenantID, payload),
	}
	if err := s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.%s", tenantID, sessionID, eventType), envelope); err != nil {
		log.Printf("Failed to publish %s for session %d: %v", eventType, sessionID, err)
	}
}

func buildPostgresDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)
}

func eventPayloadWithTenant(tenantID string, payload map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(payload)+1)
	for k, v := range payload {
		out[k] = v
	}
	out["tenantId"] = tenantID
	return out
}
