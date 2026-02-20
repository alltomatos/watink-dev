package whatsapp

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"

	"github.com/alltomatos/watinkdev/engine-go/internal/rabbitmq"
	_ "github.com/lib/pq"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"net/http"
	"net/url"
)

type WhatsAppService struct {
	container *sqlstore.Container
	clients   map[int]*whatsmeow.Client
	mu        sync.RWMutex
	rabbit    *rabbitmq.RabbitMQService
}

func NewWhatsAppService(rabbit *rabbitmq.RabbitMQService) *WhatsAppService {
	dbLog := waLog.Stdout("Database", "DEBUG", true)

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	container, err := sqlstore.New(context.Background(), "postgres", dsn, dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to Postgres for WhatsMeow store: %v", err)
	}

	return &WhatsAppService{
		container: container,
		clients:   make(map[int]*whatsmeow.Client),
		rabbit:    rabbit,
	}
}

func (s *WhatsAppService) AutoRestartSessions() {
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		log.Printf("Failed to get devices for auto-restart: %v", err)
		return
	}

	for _, dev := range devices {
		if dev.ID == nil {
			continue
		}
		
		log.Printf("🚀 Found existing device JID: %s", dev.ID.String())
		// In development, assume session ID 3 for existing connections
		go s.StartClient(3, "964fe69c-2237-4374-9fd1-bbb36adb86ff", "", false, "")
	}
}

func (s *WhatsAppService) StartClient(id int, tenantID string, proxyURL string, usePairingCode bool, phoneNumber string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Check if already running
	if client, ok := s.clients[id]; ok {
		if client.IsConnected() {
			log.Printf("Client %d already connected", id)
			return nil
		}
	}

	// 2. Load devices
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		return err
	}

	var deviceStore *store.Device
	if len(devices) > 0 {
		deviceStore = devices[0]
	}

	if deviceStore == nil {
		deviceStore = s.container.NewDevice()
		log.Printf("Created new device store for session %d", id)
	}

	clientLog := waLog.Stdout(fmt.Sprintf("Client-%d", id), "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	
	if proxyURL != "" {
		u, err := url.Parse(proxyURL)
		if err == nil {
			client.SetProxy(func(_ *http.Request) (*url.URL, error) {
				return u, nil
			})
			log.Printf("🛡️ Proxy configured for session %d: %s", id, proxyURL)
		}
	}
	
	s.clients[id] = client

	client.AddEventHandler(func(evt interface{}) {
		s.handleEvent(id, tenantID, evt)
	})

	if client.Store.ID == nil {
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			return err
		}

		cleanPhone := strings.TrimSpace(phoneNumber)
		if usePairingCode && cleanPhone != "" {
			go func() {
				// Status QRCODE
				s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.status", tenantID, id), map[string]interface{}{
					"type": "session.status",
					"payload": map[string]interface{}{
						"sessionId": fmt.Sprintf("%d", id),
						"status":    "QRCODE",
					},
				})

				code, pairErr := client.PairPhone(context.Background(), cleanPhone, true, whatsmeow.PairClientChrome, "Watink")
				if pairErr != nil {
					log.Printf("Pairing code error for %d: %v", id, pairErr)
					// Fallback to QR if pairing fails? Or just log.
					return
				}
				log.Printf("Pairing code for %d: %s", id, code)
				s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.pairing_code", tenantID, id), map[string]interface{}{
					"type": "session.pairing_code",
					"payload": map[string]interface{}{
						"sessionId":   fmt.Sprintf("%d", id),
						"pairingCode": code,
						"status":      "QRCODE",
					},
				})
			}()
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					log.Printf("QR Code for %d: %s", id, evt.Code)
					s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.qrcode", tenantID, id), map[string]interface{}{
						"type": "session.qrcode",
						"payload": map[string]interface{}{
							"sessionId": fmt.Sprintf("%d", id),
							"qrcode":    evt.Code,
						},
					})
				}
			}
		}()
	} else {
		err = client.Connect()
		if err != nil {
			return err
		}
		log.Printf("Reconnected session %d (Proxy: %v)", id, proxyURL != "")
		
		// MANDATORY: Emit status immediately if we didn't go through QR flow
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.status", tenantID, id), map[string]interface{}{
			"type": "session.status",
			"payload": map[string]interface{}{
				"sessionId":       fmt.Sprintf("%d", id),
				"status":          "CONNECTED",
				"firstConnection": false,
			},
		})
	}

	return nil
}

func (s *WhatsAppService) handleEvent(id int, tenantID string, evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		body := v.Message.GetConversation()
		if body == "" && v.Message.ExtendedTextMessage != nil {
			body = v.Message.ExtendedTextMessage.GetText()
		}
		
		payload := map[string]interface{}{
			"type": "message.received",
			"tenantId": tenantID,
			"payload": map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"message": map[string]interface{}{
					"id":        v.Info.ID,
					"from":      v.Info.Sender.String(),
					"body":      body,
					"timestamp": v.Info.Timestamp.Unix(),
					"pushName":  v.Info.PushName,
				},
			},
		}
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.message.received", tenantID, id), payload)

	case *events.Connected:
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.status", tenantID, id), map[string]interface{}{
			"type": "session.status",
			"payload": map[string]interface{}{
				"sessionId":       fmt.Sprintf("%d", id),
				"status":          "CONNECTED",
				"firstConnection": false,
			},
		})

	case *events.HistorySync:
		log.Printf("Received history sync (type %s) for session %d", v.Data.SyncType.String(), id)
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.history_sync", tenantID, id), map[string]interface{}{
			"type": "session.history_sync",
			"payload": map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"type":      v.Data.SyncType.String(),
				"progress":  v.Data.GetProgress(),
			},
		})
	}
}

func (s *WhatsAppService) StopClient(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	client, ok := s.clients[id]
	if !ok {
		return nil
	}

	client.Disconnect()
	delete(s.clients, id)
	log.Printf("Client %d stopped and removed", id)
	return nil
}
