package services

import (
	"context"
	"encoding/json"
	"log"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

// handleContactUpdate persists a WhatsApp-pushed contact change (display name /
// profile picture) when it arrives without a message. It only updates an existing
// contact and never overwrites a name the user has personalized — the push name is
// applied only when the stored name is empty or still equals the raw number.
func handleContactUpdate(ctx context.Context, contacts domain.ContactRepository, b domain.Broadcaster, payload json.RawMessage, tenantID uuid.UUID) error {
	broadcast := domain.BroadcastOrNop(b)
	var p ContactUpdatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	number := jidToNumber(p.Contact.JID)
	if number == "" {
		number = p.Contact.Number
	}
	if number == "" {
		return nil
	}

	contact, err := contacts.FindByNumber(ctx, tenantID, number, false)
	if err != nil {
		return err
	}
	if contact == nil {
		return nil
	}

	fields := map[string]interface{}{}
	if p.Contact.PushName != "" && (contact.Name == "" || contact.Name == number) {
		fields["name"] = p.Contact.PushName
	}
	if p.Contact.ProfilePicUrl != "" {
		fields["profilePicUrl"] = p.Contact.ProfilePicUrl
	}
	if len(fields) == 0 {
		return nil
	}

	if err := contacts.Update(ctx, contact, fields); err != nil {
		return err
	}

	if updated, err := contacts.FindByID(ctx, contact.ID, tenantID); err == nil && updated != nil {
		contact = updated
	}
	broadcast.EmitToTenantRoom(tenantID.String(), "contact", map[string]interface{}{"action": "update", "contact": contact})
	return nil
}

// jidToNumber extracts the bare number from a WhatsApp JID (user part before @/:).
func jidToNumber(jid string) string {
	if jid == "" {
		return ""
	}
	base := strings.Split(jid, "@")[0]
	return strings.Split(base, ":")[0]
}

// syncConnectionProfilePic reuses the SAME contact-enrichment event (engine's
// handlePictureEvent fires "contact.update" on ANY profile picture change,
// own account included) to also refresh a CONNECTION's avatar, not just a
// contact's. Without this, a connection's photo is only captured once — at
// the very first login (engine emitConnected) — and never updates again, even
// when the WhatsApp account changes its photo or the first capture failed
// (e.g. "item-not-found" right after a reconnect, before the server's cache
// is warm).
func syncConnectionProfilePic(ctx context.Context, sessions domain.ChannelSessionRepository, b domain.Broadcaster, payload json.RawMessage, tenantID uuid.UUID) error {
	var p ContactUpdatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	if p.Contact.ProfilePicUrl == "" {
		return nil
	}
	number := jidToNumber(p.Contact.JID)
	if number == "" {
		number = p.Contact.Number
	}
	if number == "" {
		return nil
	}

	all, err := sessions.FindAll(ctx, tenantID)
	if err != nil {
		return err
	}
	for i := range all {
		if all[i].Number != number {
			continue
		}
		session := all[i]
		if err := sessions.Update(ctx, &session, map[string]interface{}{"profilePicUrl": p.Contact.ProfilePicUrl}); err != nil {
			return err
		}
		domain.BroadcastOrNop(b).EmitToTenantRoom(tenantID.String(), "whatsappSession", map[string]interface{}{
			"action":  "update",
			"session": map[string]interface{}{"id": session.ID, "profilePicUrl": p.Contact.ProfilePicUrl},
		})
		return nil
	}
	return nil
}

// handleContactImport persists a batch of contacts pulled from the WhatsApp
// address book. Each contact is upserted via FindOrCreate, so re-running the
// import is idempotent and never duplicates existing contacts.
func handleContactImport(ctx context.Context, contacts domain.ContactRepository, payload json.RawMessage, tenantID uuid.UUID) error {
	var p ContactImportPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	imported := 0
	for _, c := range p.Contacts {
		if c.Number == "" {
			continue
		}
		name := c.Name
		if name == "" {
			name = c.PushName
		}
		if _, err := contacts.FindOrCreate(ctx, tenantID, c.Number, name, "", false, false, ""); err != nil {
			log.Printf("[ContactImport] failed to upsert contact %s: %v", c.Number, err)
			continue
		}
		imported++
	}

	log.Printf("[ContactImport] session %s: %d/%d contacts imported (tenant %s)", p.SessionID, imported, len(p.Contacts), tenantID)
	return nil
}

func handleJIDRegistered(ctx context.Context, sessions domain.ChannelSessionRepository, payload json.RawMessage, tenantID uuid.UUID) error {
	var p struct {
		SessionID string `json:"sessionId"`
		JID       string `json:"jid"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	sessionID := getSessionID(p.SessionID)
	if p.JID == "" || sessionID == 0 {
		return nil
	}
	return sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, map[string]interface{}{"wid": p.JID})
}
