package whatsapp

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
)

type autoRestartSession struct {
	ID          int
	TenantID    string
	Name        string
	SyncHistory bool
	SyncPeriod  sql.NullString
	KeepAlive   bool
	Wid         string
}

// AutoRestartSessions queries DB for sessions that should be reconnected and starts them.
func (s *WhatsAppService) AutoRestartSessions() {
	db, err := sql.Open("postgres", s.dsn)
	if err != nil {
		log.Printf("Failed to open database for auto-restart: %v", err)
		return
	}
	defer db.Close()

	rows, err := db.Query(`SELECT id, "tenantId"::text, name, COALESCE("syncHistory", false), "syncPeriod", COALESCE("keepAlive", false), COALESCE(wid, '') FROM "Whatsapps" WHERE COALESCE("engineType", 'whatsmeow') = 'whatsmeow' AND status IN ('CONNECTED', 'OPENING', 'QRCODE')`)
	if err != nil {
		log.Printf("Failed to query sessions for auto-restart: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var sess autoRestartSession
		if err := rows.Scan(&sess.ID, &sess.TenantID, &sess.Name, &sess.SyncHistory, &sess.SyncPeriod, &sess.KeepAlive, &sess.Wid); err != nil {
			log.Printf("Failed to scan auto-restart session: %v", err)
			continue
		}
		log.Printf("Auto-restarting WhatsMeow session %d tenant %s", sess.ID, sess.TenantID)
		if err := s.StartClient(sess.ID, sess.TenantID, sess.Name, time.Now().UnixMilli(), "", false, "", sess.Wid); err != nil {
			log.Printf("Failed to auto-restart session %d: %v", sess.ID, err)
			s.emitStatus(sess.ID, sess.TenantID, "DISCONNECTED")
		}
	}
}

// StartClient creates or reconnects a whatsmeow client for the given session.
// Supports proxy, QR code and pairing code (usePairingCode=true).
func (s *WhatsAppService) StartClient(id int, tenantID, name string, timestamp int64, proxyURL string, usePairingCode bool, phoneNumber string, jid string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if client, ok := s.clients[id]; ok && client.IsConnected() && client.IsLoggedIn() {
		s.emitStatus(id, tenantID, "CONNECTED")
		return nil
	}

	deviceStore, err := s.resolveDeviceStore(id, jid)
	if err != nil {
		return err
	}
	if deviceStore == nil {
		deviceStore = s.container.NewDevice()
		log.Printf("Created new device store for session %d", id)
	}

	clientLog := waLog.Stdout(fmt.Sprintf("Session-%d", id), "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	if proxyURL != "" {
		if u, parseErr := url.Parse(proxyURL); parseErr == nil {
			client.SetProxy(func(_ *http.Request) (*url.URL, error) { return u, nil })
			log.Printf("Proxy configured for session %d: %s", id, proxyURL)
		}
	}

	s.clients[id] = client
	client.AddEventHandler(func(evt interface{}) {
		s.handleEvent(id, tenantID, evt)
	})

	var qrChan <-chan whatsmeow.QRChannelItem
	if client.Store.ID == nil {
		qrChan, err = client.GetQRChannel(context.Background())
		if err != nil {
			delete(s.clients, id)
			return err
		}
	}

	if err := client.Connect(); err != nil {
		delete(s.clients, id)
		return err
	}

	if client.Store.ID == nil {
		cleanPhone := strings.TrimSpace(phoneNumber)
		if usePairingCode && cleanPhone != "" {
			go func() {
				s.emitStatus(id, tenantID, "QRCODE")
				code, pairErr := client.PairPhone(context.Background(), cleanPhone, true, whatsmeow.PairClientChrome, "Watink")
				if pairErr != nil {
					log.Printf("Pairing code error for session %d: %v", id, pairErr)
					return
				}
				// "session.pairingcode" matches the routing key the backend event_listener expects.
				s.publishEvent(tenantID, id, "session.pairingcode", map[string]interface{}{
					"sessionId":   fmt.Sprintf("%d", id),
					"pairingCode": code,
					"status":      "QRCODE",
				})
			}()
		}
		go s.consumeQR(id, tenantID, qrChan)
	} else {
		log.Printf("Reconnected session %d", id)
		if client.IsLoggedIn() {
			s.emitStatus(id, tenantID, "CONNECTED")
		} else {
			log.Printf("Session %d has device ID but is not logged in — requesting QR", id)
			qrChan, err = client.GetQRChannel(context.Background())
			if err == nil {
				go s.consumeQR(id, tenantID, qrChan)
			}
		}
	}

	return nil
}

// StopClient disconnects a session and removes it from the active map.
func (s *WhatsAppService) StopClient(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	client, ok := s.clients[id]
	if !ok {
		return fmt.Errorf("client %d not found", id)
	}
	client.Disconnect()
	delete(s.clients, id)
	return nil
}

// ForceLogout logs out a session from WhatsApp (revokes credentials) and removes it.
func (s *WhatsAppService) ForceLogout(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if client, ok := s.clients[id]; ok {
		_ = client.Logout(context.Background())
		delete(s.clients, id)
	}
	return nil
}

func (s *WhatsAppService) resolveDeviceStore(id int, jid string) (*store.Device, error) {
	if jid != "" {
		parsed, err := types.ParseJID(jid)
		if err == nil && !parsed.IsEmpty() {
			device, err := s.container.GetDevice(context.Background(), parsed)
			if err != nil {
				return nil, fmt.Errorf("GetDevice by JID %s: %w", jid, err)
			}
			if device != nil {
				log.Printf("Resolved device for session %d via JID %s", id, jid)
				return device, nil
			}
		}
	}
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		return nil, err
	}
	switch len(devices) {
	case 0:
		return nil, nil
	case 1:
		return devices[0], nil
	default:
		return nil, fmt.Errorf("multiple WhatsMeow devices found without JID mapping for session %d", id)
	}
}

func (s *WhatsAppService) consumeQR(id int, tenantID string, qrChan <-chan whatsmeow.QRChannelItem) {
	for evt := range qrChan {
		if evt.Event == "code" {
			log.Printf("QR code ready for session %d", id)
			s.publishEvent(tenantID, id, "session.qrcode", map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"qrcode":    evt.Code,
			})
		}
	}
}
