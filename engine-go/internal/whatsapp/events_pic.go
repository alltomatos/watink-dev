package whatsapp

import (
	"context"
	"fmt"
	"log"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// getCachedPic returns the profile picture URL for the given JID, using an
// in-memory cache to avoid a WhatsApp CDN round-trip on every message.
func (s *WhatsAppService) getCachedPic(client *whatsmeow.Client, jid types.JID) string {
	key := jid.String()
	s.picMu.Lock()
	if url, ok := s.picCache[key]; ok {
		s.picMu.Unlock()
		return url
	}
	s.picMu.Unlock()

	url := ""
	if info, err := client.GetProfilePictureInfo(context.Background(), jid, &whatsmeow.GetProfilePictureParams{}); err == nil && info != nil {
		url = info.URL
	}
	if url != "" {
		s.picMu.Lock()
		s.picCache[key] = url
		s.picMu.Unlock()
	}
	return url
}

// handlePictureEvent fires when a contact or group changes its profile picture.
// It invalidates the local cache and publishes a contact.update event so the
// backend can persist the new URL immediately — without waiting for the next message.
func (s *WhatsAppService) handlePictureEvent(client *whatsmeow.Client, id int, tenantID string, v *events.Picture) {
	key := v.JID.String()

	// Invalidate cache entry so getCachedPic fetches fresh on next use.
	s.picMu.Lock()
	delete(s.picCache, key)
	s.picMu.Unlock()

	newURL := ""
	if !v.Remove {
		if info, err := client.GetProfilePictureInfo(context.Background(), v.JID.ToNonAD(), &whatsmeow.GetProfilePictureParams{}); err == nil && info != nil {
			newURL = info.URL
			s.picMu.Lock()
			s.picCache[key] = newURL
			s.picMu.Unlock()
		}
	}

	s.publishEvent(tenantID, id, "contact.update", map[string]interface{}{
		"sessionId": fmt.Sprintf("%d", id),
		"contact": map[string]interface{}{
			"jid":           v.JID.String(),
			"profilePicUrl": newURL,
		},
	})
	log.Printf("[Picture] %s photo updated (remove=%v)", key, v.Remove)
}
