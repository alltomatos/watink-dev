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

	// 2. Load all devices to find the one matching our session ID
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		return err
	}

	var deviceStore *store.Device
	for _, dev := range devices {
		if dev.ID != nil && dev.ID.User == fmt.Sprintf("session-%d", id) {
			deviceStore = dev
			break
		}
	}

	if deviceStore == nil {
		deviceStore = s.container.NewDevice()
		log.Printf("Created new device store for session %d", id)
	}

	clientLog := waLog.Stdout(fmt.Sprintf("Client-%d", id), "DEBUG", true)
	
	client := whatsmeow.NewClient(deviceStore, clientLog)
	
	// Configuração de Proxy (http/https/socks5 conforme URL)
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
				code, pairErr := client.PairPhone(context.Background(), cleanPhone, true, whatsmeow.PairClientChrome, "Watink")
				if pairErr != nil {
					log.Printf("Pairing code error for %d: %v", id, pairErr)
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
	}

	return nil
}

func (s *WhatsAppService) handleEvent(id int, tenantID string, evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		log.Printf("Message from %s: %s", v.Info.Sender, v.Message.GetConversation())
		payload := map[string]interface{}{
			"type": "message.received",
			"tenantId": tenantID,
			"payload": map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"message": map[string]interface{}{
					"id":        v.Info.ID,
					"from":      v.Info.Sender.String(),
					"body":      v.Message.GetConversation(),
					"timestamp": v.Info.Timestamp.Unix(),
				},
			},
		}
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.message.received", tenantID, id), payload)

	case *events.Connected:
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.status", tenantID, id), map[string]interface{}{
			"type": "session.status",
			"payload": map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"status":    "CONNECTED",
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
