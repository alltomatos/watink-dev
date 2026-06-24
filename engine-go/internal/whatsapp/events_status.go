package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
)

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
