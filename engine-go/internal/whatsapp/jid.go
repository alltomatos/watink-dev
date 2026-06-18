package whatsapp

import (
	"strings"

	"go.mau.fi/whatsmeow/types"
)

// ensureJID normalizes raw input (bare number or full JID string) to types.JID.
// Bare numbers like "5511999999999" get "@s.whatsapp.net" appended before parsing.
func ensureJID(raw string) (types.JID, error) {
	raw = strings.TrimSpace(raw)
	if !strings.Contains(raw, "@") {
		raw = raw + "@" + types.DefaultUserServer
	}
	return types.ParseJID(raw)
}
