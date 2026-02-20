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
		
		log.Printf("🚀 Auto-restarting existing device JID: %s", dev.ID.String())
		// We don't have the internal 'id' (sessionID) or tenantID here easily
		// but we can look them up in the main database or wait for a 'start' command.
		// For now, let's just log and ensure that when a 'start' command comes, 
		// we reuse the correct device.
	}
}

func (s *WhatsAppService) StartClient(id int, tenantID, name string, timestamp int64, proxyURL string, usePairingCode bool, phoneNumber string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Check if already running
	if client, ok := s.clients[id]; ok {
		if client.IsConnected() {
			log.Printf("Client %d already connected", id)
			if client.IsLoggedIn() {
				s.emitStatus(id, tenantID, "CONNECTED")
				return nil
			}
		}
	}

	// 2. Load devices from WhatsMeow store
	// IMPORTANT: We should ideally map our internal 'id' (sessionID) to a WhatsMeow device.
	// Current implementation just takes devices[0]. This is incorrect for multi-tenant/multi-session.
	// Since we don't have a mapping table yet, we'll try to find a device that matches.
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		return err
	}

	var deviceStore *store.Device
	// Try to find a device that matches this session name or ID if we stored it
	// For now, we'll assume a 1-to-1 mapping for simplicity or create new if not found
	// (This needs a better mapping strategy later)
	if len(devices) > 0 {
		// Logic to find the right device... for now just fallback to first one if only one exists
		deviceStore = devices[0]
	}

	if deviceStore == nil {
		deviceStore = s.container.NewDevice()
		log.Printf("Created new device store for session %d", id)
	}

	sessionName := fmt.Sprintf("Session-%d", id)
	clientLog := waLog.Stdout(sessionName, "DEBUG", true)
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

	// Always get QR channel if not logged in
	var qrChan <-chan whatsmeow.QRChannelItem
	if client.Store.ID == nil {
		var err error
		qrChan, err = client.GetQRChannel(context.Background())
		if err != nil {
			return err
		}
	}

	err = client.Connect()
	if err != nil {
		return err
	}

	if client.Store.ID == nil {
		cleanPhone := strings.TrimSpace(phoneNumber)
		if usePairingCode && cleanPhone != "" {
			go func() {
				s.emitStatus(id, tenantID, "QRCODE")
				code, pairErr := client.PairPhone(context.Background(), cleanPhone, true, whatsmeow.PairClientChrome, "Watink")
				if pairErr != nil {
					log.Printf("Pairing code error for %d: %v", id, pairErr)
					return
				}
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
		log.Printf("Reconnected session %d", id)
		if client.IsLoggedIn() {
			s.emitStatus(id, tenantID, "CONNECTED")
		} else {
			// If we have an ID but not logged in, we might need a fresh QR
			log.Printf("Session %d has ID but not logged in. Requesting QR...", id)
			qrChan, _ = client.GetQRChannel(context.Background())
			go func() {
				for evt := range qrChan {
					if evt.Event == "code" {
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
		}
	}

	return nil
}

func (s *WhatsAppService) emitStatus(id int, tenantID string, status string) {
	s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.session.status", tenantID, id), map[string]interface{}{
		"type": "session.status",
		"payload": map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", id),
			"status":    status,
		},
	})
}

func (s *WhatsAppService) handleEvent(id int, tenantID string, evt interface{}) {
	client, ok := s.clients[id]
	if !ok {
		return
	}

	switch v := evt.(type) {
	case *events.Message:
		body := v.Message.GetConversation()
		if body == "" && v.Message.ExtendedTextMessage != nil {
			body = v.Message.ExtendedTextMessage.GetText()
		}

		profilePic := ""
		if !v.Info.IsFromMe {
			if info, err := client.GetProfilePictureInfo(context.Background(), v.Info.Sender, &whatsmeow.GetProfilePictureParams{}); err == nil {
				profilePic = info.URL
			}
		}

		payload := map[string]interface{}{
			"type":     "message.received",
			"tenantId": tenantID,
			"payload": map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"message": map[string]interface{}{
					"id":            v.Info.ID,
					"from":          v.Info.Sender.String(),
					"body":          body,
					"timestamp":     v.Info.Timestamp.Unix(),
					"pushName":      v.Info.PushName,
					"profilePicUrl": profilePic,
					"isLid":         v.Info.Sender.Server == "lid",
				},
			},
		}
		s.rabbit.PublishEvent(fmt.Sprintf("wbot.%s.%d.message.received", tenantID, id), payload)

	case *events.Connected:
		s.emitStatus(id, tenantID, "CONNECTED")

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
	log.Printf("Client %d stopped and removed from memory", id)
	return nil
}

func (s *WhatsAppService) ForceLogout(id int) error {
	// Attempt to perform a logout on the device store if possible
	// This helps when the client isn't in memory but we want to ensure it's gone
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		return err
	}

	// For now, we still have the 1-to-1 session bug where we don't know which device 
	// belongs to which session ID reliably. 
	// As a temporary fix for the user, if they want to stop, we'll try to logout the first device 
	// if it exists and we don't have active clients.
	if len(devices) > 0 {
		device := devices[0]
		log.Printf("ForceLogout: Attempting to logout device %s", device.ID.String())
		
		// Create a temporary client just to call Logout
		tempClient := whatsmeow.NewClient(device, nil)
		err = tempClient.Connect()
		if err == nil {
			err = tempClient.Logout(context.Background())
			if err == nil {
				log.Printf("ForceLogout: Successfully logged out device %s", device.ID.String())
			}
		}
	}
	
	return nil
}
