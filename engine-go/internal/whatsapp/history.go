package whatsapp

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mau.fi/whatsmeow/proto/waHistorySync"
	"go.mau.fi/whatsmeow/types"
)

// onDemandHistoryCount is the number of messages requested per on-demand history
// sync. WhatsApp recommends 50 per request.
const onDemandHistoryCount = 50

// HistoryRecoverPayload is the command sent by the backend to recover prior
// conversation history into a specific ticket.
type HistoryRecoverPayload struct {
	ChatJID            string `json:"chatJid"`
	TicketID           int    `json:"ticketId"`
	OldestMsgID        string `json:"oldestMsgId"`
	OldestMsgFromMe    bool   `json:"oldestMsgFromMe"`
	OldestMsgTimestamp int64  `json:"oldestMsgTimestamp"`
	Count              int    `json:"count"`
	CutoffTimestamp    int64  `json:"cutoffTimestamp"`
}

// pendingHistory tracks an in-flight on-demand history request so the asynchronous
// ON_DEMAND HistorySync response can be correlated back to the originating ticket.
type pendingHistory struct {
	ticketID int
	cutoff   int64
}

func historyKey(sessionID int, chatJID string) string {
	return fmt.Sprintf("%d:%s", sessionID, chatJID)
}

// RecoverHistory requests prior messages for a conversation from the user's phone.
// The response arrives asynchronously as an ON_DEMAND HistorySync event, which is
// matched back to the ticket via the pending request map.
func (s *WhatsAppService) RecoverHistory(sessionID int, tenantID string, p HistoryRecoverPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		return err
	}

	chat, err := ensureJID(p.ChatJID)
	if err != nil {
		return fmt.Errorf("invalid chat JID %q: %w", p.ChatJID, err)
	}

	count := p.Count
	if count <= 0 {
		count = onDemandHistoryCount
	}

	anchorTS := p.OldestMsgTimestamp
	if anchorTS <= 0 {
		anchorTS = time.Now().Unix()
	}

	anchor := &types.MessageInfo{
		MessageSource: types.MessageSource{
			Chat:     chat,
			IsFromMe: p.OldestMsgFromMe,
		},
		ID:        p.OldestMsgID,
		Timestamp: time.Unix(anchorTS, 0),
	}

	s.historyMu.Lock()
	s.historyRequests[historyKey(sessionID, chat.String())] = &pendingHistory{
		ticketID: p.TicketID,
		cutoff:   p.CutoffTimestamp,
	}
	s.historyMu.Unlock()

	req := client.BuildHistorySyncRequest(anchor, count)
	if _, err := client.SendPeerMessage(context.Background(), req); err != nil {
		s.historyMu.Lock()
		delete(s.historyRequests, historyKey(sessionID, chat.String()))
		s.historyMu.Unlock()
		return fmt.Errorf("send history sync request: %w", err)
	}

	log.Printf("Requested on-demand history for session %d chat %s (ticket %d, cutoff %d)", sessionID, chat.String(), p.TicketID, p.CutoffTimestamp)
	return nil
}

// handleOnDemandHistory processes an ON_DEMAND HistorySync response, matching each
// conversation against a pending recovery request and emitting the recovered
// messages to the backend tagged with the originating ticket.
func (s *WhatsAppService) handleOnDemandHistory(sessionID int, tenantID string, data *waHistorySync.HistorySync) {
	client, ok := s.clients[sessionID]
	if !ok {
		return
	}

	for _, conv := range data.GetConversations() {
		chatJID := conv.GetID()

		s.historyMu.Lock()
		pending, found := s.historyRequests[historyKey(sessionID, chatJID)]
		if found {
			delete(s.historyRequests, historyKey(sessionID, chatJID))
		}
		s.historyMu.Unlock()
		if !found {
			continue
		}

		messages := make([]map[string]interface{}, 0, len(conv.GetMessages()))
		for _, hsm := range conv.GetMessages() {
			wmi := hsm.GetMessage()
			if wmi == nil || wmi.GetMessage() == nil {
				continue
			}
			ts := int64(wmi.GetMessageTimestamp())
			if pending.cutoff > 0 && ts < pending.cutoff {
				continue
			}
			key := wmi.GetKey()
			if key == nil {
				continue
			}
			body, msgType, mediaData, mimeType := extractMessageContent(client, wmi.GetMessage())
			messages = append(messages, map[string]interface{}{
				"id":        key.GetID(),
				"from":      chatJID,
				"body":      body,
				"type":      msgType,
				"fromMe":    key.GetFromMe(),
				"timestamp": ts,
				"pushName":  wmi.GetPushName(),
				"mimetype":  mimeType,
				"mediaData": mediaData,
			})
		}

		log.Printf("On-demand history for session %d chat %s: %d messages for ticket %d", sessionID, chatJID, len(messages), pending.ticketID)
		s.publishEvent(tenantID, sessionID, "session.history_sync", map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", sessionID),
			"type":      "ON_DEMAND",
			"ticketId":  pending.ticketID,
			"messages":  messages,
		})
	}
}
