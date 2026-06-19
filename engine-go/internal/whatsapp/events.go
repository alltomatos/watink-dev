package whatsapp

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/proto/waHistorySync"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// handleEvent dispatches whatsmeow events to the appropriate handler.
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
		s.emitConnected(client, id, tenantID)
	case *events.Disconnected:
		s.emitStatus(id, tenantID, "DISCONNECTED")
	case *events.LoggedOut:
		log.Printf("Session %d logged out (reason: %v)", id, v.Reason)
		s.emitStatus(id, tenantID, "DISCONNECTED")
	case *events.Contact:
		s.handleContactEvent(id, tenantID, v)
	case *events.PushName:
		s.handlePushNameEvent(id, tenantID, v)
	case *events.HistorySync:
		log.Printf("History sync (type %s) for session %d", v.Data.SyncType.String(), id)
		if v.Data.GetSyncType() == waHistorySync.HistorySync_ON_DEMAND {
			s.handleOnDemandHistory(id, tenantID, v.Data)
			return
		}
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

	if reactionMsg := v.Message.GetReactionMessage(); reactionMsg != nil && reactionMsg.GetKey() != nil {
		s.publishEvent(tenantID, id, "message.reaction", map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", id),
			"messageId": reactionMsg.GetKey().GetID(),
			"jid":       v.Info.Sender.String(),
			"reaction":  reactionMsg.GetText(),
			"fromMe":    v.Info.IsFromMe,
		})
		return
	}

	body, msgType, mediaData, mimeType := extractMessageContent(client, v.Message)
	// Skip system / unsupported / empty messages (no text and no media) so they
	// don't show up in the chat as blank bubbles rendering the raw number.
	if msgType == "chat" && body == "" && mediaData == "" {
		return
	}

	isGroup := v.Info.IsGroup || v.Info.Chat.Server == types.GroupServer
	chatJID := v.Info.Chat.String()
	// Strip the device suffix (sender:NN) from the participant.
	senderJID := v.Info.Sender.ToNonAD().String()
	if chatJID == "" {
		chatJID = senderJID
	}

	// Resolve LID → phone number (also device-stripped).
	resolvedSender := senderJID
	if v.Info.Sender.Server == types.HiddenUserServer {
		if pn, err := client.Store.LIDs.GetPNForLID(context.Background(), v.Info.Sender); err == nil && !pn.IsEmpty() {
			resolvedSender = pn.ToNonAD().String()
		}
	}

	// Group subject becomes the contact name (cached); avoids groups looking like
	// individuals named after whoever messaged.
	groupName := ""
	if isGroup {
		groupName = s.groupSubject(client, v.Info.Chat)
	}

	// Profile picture only for real phone-number senders (LID/group participants
	// reject the query with 400 bad-request).
	profilePic := ""
	if !v.Info.IsFromMe && v.Info.Sender.Server == types.DefaultUserServer {
		if info, err := client.GetProfilePictureInfo(context.Background(), v.Info.Sender.ToNonAD(), &whatsmeow.GetProfilePictureParams{}); err == nil && info != nil {
			profilePic = info.URL
		}
	}

	s.publishEvent(tenantID, id, "message.received", map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"message": map[string]interface{}{
			"id":            v.Info.ID,
			"from":          chatJID,
			"body":          body,
			"type":          msgType,
			"fromMe":        v.Info.IsFromMe,
			"timestamp":     v.Info.Timestamp.Unix(),
			"pushName":      v.Info.PushName,
			"groupName":     groupName,
			"profilePicUrl": profilePic,
			"isLid":         v.Info.Sender.Server == types.HiddenUserServer,
			"participant":   resolvedSender,
			"isGroup":       isGroup,
			"mimetype":      mimeType,
			"mediaData":     mediaData,
		},
	})
}

// groupSubject returns the group's display name, cached per group JID to avoid
// a GetGroupInfo round-trip on every message.
func (s *WhatsAppService) groupSubject(client *whatsmeow.Client, jid types.JID) string {
	key := jid.String()
	s.groupNameMu.Lock()
	if n, ok := s.groupNames[key]; ok {
		s.groupNameMu.Unlock()
		return n
	}
	s.groupNameMu.Unlock()

	name := ""
	if info, err := client.GetGroupInfo(context.Background(), jid); err == nil && info != nil {
		name = info.GroupName.Name
	}
	if name != "" {
		s.groupNameMu.Lock()
		s.groupNames[key] = name
		s.groupNameMu.Unlock()
	}
	return name
}

// emitConnected publishes the CONNECTED status enriched with the account's own
// number and profile picture, plus the jid_registered event. This is what lets
// the frontend connection card show the real number and avatar instead of placeholders.
func (s *WhatsAppService) emitConnected(client *whatsmeow.Client, id int, tenantID string) {
	number := ""
	var ownJID types.JID
	if client.Store.ID != nil {
		ownJID = *client.Store.ID
		number = ownJID.User
	}

	profilePic := ""
	if !ownJID.IsEmpty() {
		if info, err := client.GetProfilePictureInfo(context.Background(), ownJID.ToNonAD(), &whatsmeow.GetProfilePictureParams{}); err == nil && info != nil {
			profilePic = info.URL
		}
	}

	s.publishEvent(tenantID, id, "session.status", map[string]interface{}{
		"sessionId":     fmt.Sprintf("%d", id),
		"status":        "CONNECTED",
		"number":        number,
		"profilePicUrl": profilePic,
	})

	if client.Store.ID != nil {
		s.publishEvent(tenantID, id, "session.jid_registered", map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", id),
			"jid":       client.Store.ID.String(),
		})
	}
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

// handleContactEvent emits contact.update when whatsmeow reports a contact change.
func (s *WhatsAppService) handleContactEvent(id int, tenantID string, v *events.Contact) {
	pushName := ""
	if v.Action != nil {
		pushName = v.Action.GetFullName()
	}
	payload := map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"contact": map[string]interface{}{
			"jid":      v.JID.String(),
			"pushName": pushName,
		},
	}
	s.publishEvent(tenantID, id, "contact.update", payload)
}

// handlePushNameEvent emits contact.update when a push name (contact display name) changes.
func (s *WhatsAppService) handlePushNameEvent(id int, tenantID string, v *events.PushName) {
	payload := map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"contact": map[string]interface{}{
			"jid":      v.JID.String(),
			"pushName": v.NewPushName,
		},
	}
	s.publishEvent(tenantID, id, "contact.update", payload)
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

func extractMessageContent(client *whatsmeow.Client, msg *waProto.Message) (body, msgType, mediaData, mimeType string) {
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
