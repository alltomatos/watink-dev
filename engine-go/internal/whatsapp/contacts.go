package whatsapp

import (
	"context"
	"fmt"
	"log"
	"strings"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
)

// contactImportBatchSize limits how many contacts are sent per RabbitMQ event,
// keeping individual messages small even for accounts with thousands of contacts.
const contactImportBatchSize = 500

// ImportContacts reads all contacts stored by whatsmeow for the given session
// and publishes them to the backend as batched contact.import events.
// Only regular user contacts are imported — groups, broadcast lists and
// LID-only entries are skipped, since those are not address-book contacts.
func (s *WhatsAppService) ImportContacts(sessionID int, tenantID string) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		return err
	}

	all, err := client.Store.Contacts.GetAllContacts(context.Background())
	if err != nil {
		return fmt.Errorf("get all contacts for session %d: %w", sessionID, err)
	}

	batch := make([]map[string]interface{}, 0, contactImportBatchSize)
	flush := func() {
		if len(batch) == 0 {
			return
		}
		s.publishEvent(tenantID, sessionID, "contact.import", map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", sessionID),
			"contacts":  batch,
		})
		batch = make([]map[string]interface{}, 0, contactImportBatchSize)
	}

	for jid, info := range all {
		if jid.Server != types.DefaultUserServer {
			continue
		}
		name := contactDisplayName(info)
		batch = append(batch, map[string]interface{}{
			"jid":      jid.String(),
			"number":   jid.User,
			"name":     name,
			"pushName": info.PushName,
		})
		if len(batch) >= contactImportBatchSize {
			flush()
		}
	}
	flush()

	return nil
}

// SyncContact checks whether a number is on WhatsApp and emits a contact.update event
// with the resolved JID (and LID mapping if applicable).
func (s *WhatsAppService) SyncContact(sessionID int, tenantID string, payload SyncContactPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		return err
	}

	number := strings.TrimSpace(payload.Number)
	if !strings.HasPrefix(number, "+") {
		number = "+" + number
	}

	results, err := client.IsOnWhatsApp(context.Background(), []string{number})
	if err != nil {
		return fmt.Errorf("IsOnWhatsApp failed: %w", err)
	}

	for _, r := range results {
		if !r.IsIn {
			log.Printf("contact.sync: %s is not on WhatsApp", number)
			continue
		}

		contactPayload := map[string]interface{}{
			"jid":    r.JID.String(),
			"isLid":  r.JID.Server == types.HiddenUserServer,
			"number": number,
		}

		// Resolve LID → phone number if the JID came back as LID.
		if r.JID.Server == types.HiddenUserServer {
			if pn, mapErr := client.Store.LIDs.GetPNForLID(context.Background(), r.JID); mapErr == nil && !pn.IsEmpty() {
				contactPayload["phoneJid"] = pn.String()
			}
		}

		profilePic := ""
		if info, picErr := client.GetProfilePictureInfo(context.Background(), r.JID, &whatsmeow.GetProfilePictureParams{}); picErr == nil && info != nil {
			profilePic = info.URL
		}
		contactPayload["profilePicUrl"] = profilePic

		s.publishEvent(tenantID, sessionID, "contact.update", map[string]interface{}{
			"sessionId": payload.SessionID,
			"contact":   contactPayload,
		})
	}
	return nil
}

// contactDisplayName picks the best available human-readable name for a contact.
func contactDisplayName(info types.ContactInfo) string {
	switch {
	case info.FullName != "":
		return info.FullName
	case info.FirstName != "":
		return info.FirstName
	case info.BusinessName != "":
		return info.BusinessName
	default:
		return info.PushName
	}
}
