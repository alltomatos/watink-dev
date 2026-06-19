package whatsapp

import (
	"context"
	"fmt"

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
