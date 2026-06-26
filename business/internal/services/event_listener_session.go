package services

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

func (el *EventListener) handleQrCode(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	sessions := el.sessions
	var p QrCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	if err := sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, map[string]interface{}{
		"qrcode": p.QrCode,
		"status": "QRCODE",
	}); err != nil {
		log.Printf("Error updating qrcode/status for session %d: %v", sessionID, err)
		return err
	}

	el.bcast().EmitToTenantRoom(tenantID.String(), "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "qrcode": p.QrCode, "status": "QRCODE"}})
	return nil
}

func (el *EventListener) handlePairingCode(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	sessions := el.sessions
	var p PairingCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	status := p.Status
	if status == "" {
		status = "QRCODE"
	}

	if err := sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, map[string]interface{}{"status": status}); err != nil {
		return err
	}

	el.bcast().EmitToTenantRoom(tenantID.String(), "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "status": status, "pairingCode": p.PairingCode}})
	return nil
}

func (el *EventListener) handleSessionStatus(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	sessions := el.sessions
	var p SessionStatusPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	updates := map[string]interface{}{"status": p.Status, "qrcode": ""}
	if p.Number != "" {
		updates["number"] = p.Number
	}
	if p.ProfilePicUrl != "" {
		updates["profilePicUrl"] = p.ProfilePicUrl
	}
	if p.FirstConnection {
		now := time.Now()
		updates["firstConnection"] = &now
	}
	if p.Status == "CONNECTED" {
		now := time.Now()
		updates["lastConnectedAt"] = &now
	}

	if err := sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, updates); err != nil {
		return err
	}

	el.bcast().EmitToTenantRoom(tenantID.String(), "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "status": p.Status, "number": p.Number, "profilePicUrl": p.ProfilePicUrl, "firstConnection": updates["firstConnection"]}})
	return nil
}

// handleHistorySync inserts recovered conversation history into a ticket.
//
// On-demand recovery (ticketId > 0) inserts each message into the given ticket
// WITHOUT reopening it, changing its status, bumping unread counters or firing
// new-message notifications — it only backfills the timeline. Bootstrap syncs
// (no ticketId / no messages) are ignored.
func (el *EventListener) handleHistorySync(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	var p HistorySyncPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	if p.TicketID == 0 || len(p.Messages) == 0 {
		log.Printf("[EventListener] History sync for session %s type %s ignored (ticketId=%d, %d messages)", p.SessionID, p.Type, p.TicketID, len(p.Messages))
		return nil
	}

	ticket, err := el.tickets.FindByID(ctx, p.TicketID, tenantID)
	if err != nil {
		return err
	}
	if ticket == nil {
		log.Printf("[EventListener] History sync target ticket %d not found (tenant %s)", p.TicketID, tenantID)
		return nil
	}
	contactID := ticket.ContactID

	inserted := 0
	for _, m := range p.Messages {
		dataJSON, _ := json.Marshal(map[string]interface{}{
			"jid":         m.From,
			"participant": m.Participant,
			"pushName":    m.PushName,
			"isGroup":     m.IsGroup,
			"isLid":       m.IsLid,
			"mimetype":    m.Mimetype,
			"mediaData":   m.MediaData,
			"history":     true,
		})

		mediaType := m.Type
		if mediaType == "" {
			mediaType = "chat"
		}
		createdAt := time.Unix(m.Timestamp, 0)
		if m.Timestamp == 0 {
			createdAt = time.Now()
		}

		msg := &domain.Message{
			ID:          m.ID,
			Body:        m.Body,
			TicketID:    ticket.ID,
			ContactID:   &contactID,
			FromMe:      m.FromMe,
			TenantID:    tenantID,
			MediaType:   mediaType,
			MediaUrl:    m.MediaUrl,
			Participant: m.Participant,
			DataJson:    string(dataJSON),
			CreatedAt:   createdAt,
			UpdatedAt:   time.Now(),
		}
		if err := el.messages.CreateIfNotExists(ctx, msg); err != nil {
			log.Printf("[EventListener] history message %s insert failed: %v", m.ID, err)
			continue
		}
		inserted++
		el.bcast().EmitToRoom("/", "chat:"+strconv.Itoa(ticket.ID), "appMessage", map[string]interface{}{"action": "create", "message": msg, "history": true})
	}

	log.Printf("[EventListener] History sync ticket %d: %d/%d messages backfilled", ticket.ID, inserted, len(p.Messages))
	return nil
}
