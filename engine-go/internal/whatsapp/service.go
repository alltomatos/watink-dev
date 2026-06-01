package whatsapp

import (
	"context"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/alltomatos/watinkdev/engine-go/internal/rabbitmq"
	_ "github.com/lib/pq"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

type WhatsAppService struct {
	container *sqlstore.Container
	clients   map[int]*whatsmeow.Client
	mu        sync.RWMutex
	rabbit    *rabbitmq.RabbitMQService
	dsn       string
}

type autoRestartSession struct {
	ID          int
	TenantID    string
	Name        string
	SyncHistory bool
	SyncPeriod  sql.NullString
	KeepAlive   bool
}

type MediaCommandPayload struct {
	SessionID int    `json:"sessionId"`
	MessageID string `json:"messageId"`
	To        string `json:"to"`
	Body      string `json:"body"`
	MediaURL  string `json:"mediaUrl"`
	MediaType string `json:"mediaType"`
	MimeType  string `json:"mimeType"`
	FileName  string `json:"fileName"`
	MediaData string `json:"mediaData"`
}

type TextCommandPayload struct {
	SessionID int    `json:"sessionId"`
	MessageID string `json:"messageId"`
	To        string `json:"to"`
	Body      string `json:"body"`
}

type MarkReadCommandPayload struct {
	ChatJID    string   `json:"chatJid"`
	SenderJID  string   `json:"senderJid"`
	MessageIDs []string `json:"messageIds"`
}

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

func buildPostgresDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)
}

func (s *WhatsAppService) AutoRestartSessions() {
	db, err := sql.Open("postgres", s.dsn)
	if err != nil {
		log.Printf("Failed to open database for auto-restart: %v", err)
		return
	}
	defer db.Close()

	rows, err := db.Query(`SELECT id, "tenantId"::text, name, COALESCE("syncHistory", false), "syncPeriod", COALESCE("keepAlive", false) FROM "Whatsapps" WHERE COALESCE("engineType", 'whatsmeow') = 'whatsmeow' AND status IN ('CONNECTED', 'OPENING', 'QRCODE')`)
	if err != nil {
		log.Printf("Failed to query sessions for auto-restart: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var session autoRestartSession
		if err := rows.Scan(&session.ID, &session.TenantID, &session.Name, &session.SyncHistory, &session.SyncPeriod, &session.KeepAlive); err != nil {
			log.Printf("Failed to scan auto-restart session: %v", err)
			continue
		}

		log.Printf("Auto-restarting WhatsMeow session %d tenant %s", session.ID, session.TenantID)
		if err := s.StartClient(session.ID, session.TenantID, session.Name, time.Now().UnixMilli(), "", false, ""); err != nil {
			log.Printf("Failed to auto-restart session %d: %v", session.ID, err)
			s.emitStatus(session.ID, session.TenantID, "DISCONNECTED")
		}
	}
}

func (s *WhatsAppService) StartClient(id int, tenantID, name string, timestamp int64, proxyURL string, usePairingCode bool, phoneNumber string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if client, ok := s.clients[id]; ok && client.IsConnected() {
		if client.IsLoggedIn() {
			s.emitStatus(id, tenantID, "CONNECTED")
			return nil
		}
	}

	deviceStore, err := s.resolveDeviceStore(id)
	if err != nil {
		return err
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
					log.Printf("Pairing code error for %d: %v", id, pairErr)
					return
				}
				s.publishEvent(tenantID, id, "session.pairing_code", map[string]interface{}{
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
			log.Printf("Session %d has ID but is not logged in. Requesting QR.", id)
			qrChan, err = client.GetQRChannel(context.Background())
			if err == nil {
				go s.consumeQR(id, tenantID, qrChan)
			}
		}
	}

	return nil
}

func (s *WhatsAppService) resolveDeviceStore(id int) (*store.Device, error) {
	devices, err := s.container.GetAllDevices(context.Background())
	if err != nil {
		return nil, err
	}
	if len(devices) == 0 {
		return nil, nil
	}
	if len(devices) == 1 {
		return devices[0], nil
	}
	return nil, fmt.Errorf("multiple WhatsMeow devices found without session mapping for session %d", id)
}

func (s *WhatsAppService) consumeQR(id int, tenantID string, qrChan <-chan whatsmeow.QRChannelItem) {
	for evt := range qrChan {
		if evt.Event == "code" {
			log.Printf("QR Code for %d: %s", id, evt.Code)
			s.publishEvent(tenantID, id, "session.qrcode", map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"qrcode":    evt.Code,
			})
		}
	}
}

func (s *WhatsAppService) emitStatus(id int, tenantID string, status string) {
	s.publishEvent(tenantID, id, "session.status", map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"status":    status,
	})
}

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

func eventPayloadWithTenant(tenantID string, payload map[string]interface{}) map[string]interface{} {
	payloadWithTenant := make(map[string]interface{}, len(payload)+1)
	for key, value := range payload {
		payloadWithTenant[key] = value
	}
	payloadWithTenant["tenantId"] = tenantID
	return payloadWithTenant
}

func (s *WhatsAppService) handleEvent(id int, tenantID string, evt interface{}) {
	client, ok := s.clients[id]
	if !ok {
		return
	}

	switch v := evt.(type) {
	case *events.Message:
		s.handleMessageEvent(client, id, tenantID, v)
	case *events.Receipt:
		s.handleReceiptEvent(id, tenantID, v)
	case *events.Connected:
		s.emitStatus(id, tenantID, "CONNECTED")
	case *events.Disconnected:
		s.emitStatus(id, tenantID, "DISCONNECTED")
	case *events.HistorySync:
		log.Printf("Received history sync (type %s) for session %d", v.Data.SyncType.String(), id)
		s.publishEvent(tenantID, id, "session.history_sync", map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", id),
			"type":      v.Data.SyncType.String(),
			"progress":  v.Data.GetProgress(),
		})
	}
}

func (s *WhatsAppService) handleMessageEvent(client *whatsmeow.Client, id int, tenantID string, v *events.Message) {
	if v.Message == nil {
		return
	}

	if protocolMsg := v.Message.GetProtocolMessage(); protocolMsg != nil {
		if protocolMsg.GetType() == waProto.ProtocolMessage_REVOKE && protocolMsg.GetKey() != nil {
			s.publishEvent(tenantID, id, "message.revoke", map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"messageId": protocolMsg.GetKey().GetID(),
				"fromJid":   v.Info.Sender.String(),
				"fromMe":    v.Info.IsFromMe,
			})
		}
		return
	}

	if reactionMsg := v.Message.GetReactionMessage(); reactionMsg != nil {
		if reactionMsg.GetKey() != nil {
			s.publishEvent(tenantID, id, "message.reaction", map[string]interface{}{
				"sessionId": fmt.Sprintf("%d", id),
				"messageId": reactionMsg.GetKey().GetID(),
				"jid":       v.Info.Sender.String(),
				"reaction":  reactionMsg.GetText(),
				"fromMe":    v.Info.IsFromMe,
			})
		}
		return
	}

	body, msgType, mediaData, mimeType := s.extractMessageContent(client, v.Message)
	chatJID := v.Info.Chat.String()
	senderJID := v.Info.Sender.String()
	if chatJID == "" {
		chatJID = senderJID
	}

	profilePic := ""
	if !v.Info.IsFromMe && !v.Info.Sender.IsEmpty() {
		if info, err := client.GetProfilePictureInfo(context.Background(), v.Info.Sender, &whatsmeow.GetProfilePictureParams{}); err == nil {
			profilePic = info.URL
		}
	}

	payload := map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"message": map[string]interface{}{
			"id":            v.Info.ID,
			"from":          chatJID,
			"body":          body,
			"type":          msgType,
			"fromMe":        v.Info.IsFromMe,
			"timestamp":     v.Info.Timestamp.Unix(),
			"pushName":      v.Info.PushName,
			"profilePicUrl": profilePic,
			"isLid":         v.Info.Sender.Server == "lid",
			"participant":   senderJID,
			"isGroup":       v.Info.IsGroup || v.Info.Chat.Server == "g.us",
			"mimetype":      mimeType,
			"mediaData":     mediaData,
		},
	}
	s.publishEvent(tenantID, id, "message.received", payload)
}

func (s *WhatsAppService) extractMessageContent(client *whatsmeow.Client, msg *waProto.Message) (body string, msgType string, mediaData string, mimeType string) {
	msgType = "chat"
	body = msg.GetConversation()
	if ext := msg.GetExtendedTextMessage(); ext != nil {
		body = ext.GetText()
	}
	if img := msg.GetImageMessage(); img != nil {
		return downloadMedia(client, img, img.GetCaption(), "image", img.GetMimetype())
	}
	if video := msg.GetVideoMessage(); video != nil {
		return downloadMedia(client, video, video.GetCaption(), "video", video.GetMimetype())
	}
	if audio := msg.GetAudioMessage(); audio != nil {
		return downloadMedia(client, audio, "", "audio", audio.GetMimetype())
	}
	if doc := msg.GetDocumentMessage(); doc != nil {
		caption := doc.GetCaption()
		if caption == "" {
			caption = doc.GetTitle()
		}
		return downloadMedia(client, doc, caption, "document", doc.GetMimetype())
	}
	if sticker := msg.GetStickerMessage(); sticker != nil {
		return downloadMedia(client, sticker, "", "sticker", sticker.GetMimetype())
	}
	return body, msgType, "", ""
}

func downloadMedia(client *whatsmeow.Client, msg whatsmeow.DownloadableMessage, caption, msgType, mimeType string) (string, string, string, string) {
	data, err := client.Download(context.Background(), msg)
	if err != nil {
		log.Printf("Failed to download media: %v", err)
		return caption, msgType, "", mimeType
	}
	return caption, msgType, base64.StdEncoding.EncodeToString(data), mimeType
}

func (s *WhatsAppService) handleReceiptEvent(id int, tenantID string, v *events.Receipt) {
	ack := receiptAck(v.Type)
	for _, messageID := range v.MessageIDs {
		s.publishEvent(tenantID, id, "message.ack", map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", id),
			"messageId": string(messageID),
			"jid":       v.Chat.String(),
			"ack":       ack,
		})
	}
}

func receiptAck(receiptType types.ReceiptType) int {
	switch receiptType {
	case types.ReceiptTypeDelivered:
		return 2
	case types.ReceiptTypeRead:
		return 3
	case types.ReceiptTypePlayed:
		return 4
	default:
		return 1
	}
}

func (s *WhatsAppService) SendText(sessionID int, tenantID string, payload TextCommandPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	to, err := types.ParseJID(payload.To)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	_, err = client.SendMessage(context.Background(), to, &waProto.Message{Conversation: proto.String(payload.Body)}, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

func (s *WhatsAppService) SendMedia(sessionID int, tenantID string, payload MediaCommandPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	to, err := types.ParseJID(payload.To)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	data, err := resolveMediaBytes(payload)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	mediaType := normalizeMediaType(payload.MediaType)
	uploaded, err := client.Upload(context.Background(), data, mediaType)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	message := buildMediaMessage(payload, uploaded)
	_, err = client.SendMessage(context.Background(), to, message, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

func (s *WhatsAppService) MarkRead(sessionID int, payload MarkReadCommandPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		return err
	}
	chat, err := types.ParseJID(payload.ChatJID)
	if err != nil {
		return err
	}
	sender := chat
	if payload.SenderJID != "" {
		if parsed, parseErr := types.ParseJID(payload.SenderJID); parseErr == nil {
			sender = parsed
		}
	}
	ids := make([]types.MessageID, 0, len(payload.MessageIDs))
	for _, id := range payload.MessageIDs {
		ids = append(ids, types.MessageID(id))
	}
	return client.MarkRead(context.Background(), ids, time.Now(), chat, sender)
}

func (s *WhatsAppService) getConnectedClient(sessionID int) (*whatsmeow.Client, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	client, ok := s.clients[sessionID]
	if !ok || !client.IsConnected() || !client.IsLoggedIn() {
		return nil, fmt.Errorf("session %d is not connected", sessionID)
	}
	return client, nil
}

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

func resolveMediaBytes(payload MediaCommandPayload) ([]byte, error) {
	if payload.MediaData != "" {
		return base64.StdEncoding.DecodeString(payload.MediaData)
	}
	if payload.MediaURL == "" {
		return nil, fmt.Errorf("mediaUrl or mediaData is required")
	}
	paths := []string{payload.MediaURL}
	if !filepath.IsAbs(payload.MediaURL) {
		paths = append(paths, filepath.Join("public", payload.MediaURL))
		paths = append(paths, filepath.Join("..", "business", "public", payload.MediaURL))
	}
	var lastErr error
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err == nil {
			return data, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

func normalizeMediaType(mediaType string) whatsmeow.MediaType {
	switch strings.ToLower(mediaType) {
	case "image":
		return whatsmeow.MediaImage
	case "video":
		return whatsmeow.MediaVideo
	case "audio":
		return whatsmeow.MediaAudio
	case "sticker":
		return whatsmeow.MediaImage
	default:
		return whatsmeow.MediaDocument
	}
}

func buildMediaMessage(payload MediaCommandPayload, uploaded whatsmeow.UploadResponse) *waProto.Message {
	mimeType := payload.MimeType
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	switch strings.ToLower(payload.MediaType) {
	case "image":
		return &waProto.Message{ImageMessage: &waProto.ImageMessage{Caption: proto.String(payload.Body), Mimetype: proto.String(mimeType), URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath), MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256, FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength)}}
	case "video":
		return &waProto.Message{VideoMessage: &waProto.VideoMessage{Caption: proto.String(payload.Body), Mimetype: proto.String(mimeType), URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath), MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256, FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength)}}
	case "audio":
		return &waProto.Message{AudioMessage: &waProto.AudioMessage{Mimetype: proto.String(mimeType), URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath), MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256, FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength)}}
	default:
		fileName := payload.FileName
		if fileName == "" {
			fileName = filepath.Base(payload.MediaURL)
		}
		return &waProto.Message{DocumentMessage: &waProto.DocumentMessage{Caption: proto.String(payload.Body), Title: proto.String(fileName), FileName: proto.String(fileName), Mimetype: proto.String(mimeType), URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath), MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256, FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength)}}
	}
}

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

func (s *WhatsAppService) ForceLogout(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	client, ok := s.clients[id]
	if ok {
		client.Logout(context.Background())
		delete(s.clients, id)
		return nil
	}
	return nil
}
