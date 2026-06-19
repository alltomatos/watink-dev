package whatsapp

import (
	"strings"
	"testing"

	"go.mau.fi/whatsmeow/types"
)

func TestEnsureJID_BareNumber_AppendsSuffix(t *testing.T) {
	jid, err := ensureJID("5511999999999")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if jid.Server != types.DefaultUserServer {
		t.Fatalf("expected server %q, got %q", types.DefaultUserServer, jid.Server)
	}
	if jid.User != "5511999999999" {
		t.Fatalf("expected user 5511999999999, got %q", jid.User)
	}
}

func TestEnsureJID_FullJID_ParsesDirectly(t *testing.T) {
	full := "5511999999999@s.whatsapp.net"
	jid, err := ensureJID(full)
	if err != nil {
		t.Fatalf("unexpected error for full JID: %v", err)
	}
	if jid.User != "5511999999999" {
		t.Fatalf("expected user 5511999999999, got %q", jid.User)
	}
}

func TestEnsureJID_TrimsWhitespace(t *testing.T) {
	jid, err := ensureJID("  5511999999999  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if jid.User != "5511999999999" {
		t.Fatalf("expected trimmed user, got %q", jid.User)
	}
}

func TestEnsureJID_GroupJID_Parsed(t *testing.T) {
	group := "120363000000000000@g.us"
	jid, err := ensureJID(group)
	if err != nil {
		t.Fatalf("unexpected error for group JID: %v", err)
	}
	if !strings.HasSuffix(jid.Server, "g.us") {
		t.Fatalf("expected group server, got %q", jid.Server)
	}
}
