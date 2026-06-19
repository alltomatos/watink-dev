package command

import "testing"

func TestParseRoutingKey_ValidCommands(t *testing.T) {
	cases := []struct {
		key      string
		tenant   string
		session  string
		cmd      string
	}{
		{"wbot.tenant-1.42.session.start", "tenant-1", "42", "session.start"},
		{"wbot.tenant-1.42.session.stop", "tenant-1", "42", "session.stop"},
		{"wbot.tenant-1.42.session.delete", "tenant-1", "42", "session.delete"},
		{"wbot.tenant-1.42.message.send.text", "tenant-1", "42", "message.send.text"},
		{"wbot.tenant-1.42.message.send.media", "tenant-1", "42", "message.send.media"},
		{"wbot.tenant-1.42.message.send.buttons", "tenant-1", "42", "message.send.buttons"},
		{"wbot.tenant-1.42.message.send.list", "tenant-1", "42", "message.send.list"},
		{"wbot.tenant-1.42.message.send.poll", "tenant-1", "42", "message.send.poll"},
		{"wbot.tenant-1.42.message.send.interactive", "tenant-1", "42", "message.send.interactive"},
		{"wbot.tenant-1.42.message.markAsRead", "tenant-1", "42", "message.markAsRead"},
		{"wbot.tenant-1.42.contact.sync", "tenant-1", "42", "contact.sync"},
		{"wbot.tenant-1.42.contact.import", "tenant-1", "42", "contact.import"},
		{"wbot.tenant-1.42.history.sync", "tenant-1", "42", "history.sync"},
	}

	for _, tc := range cases {
		t.Run(tc.key, func(t *testing.T) {
			tenant, session, cmd, err := ParseRoutingKey(tc.key)
			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.key, err)
			}
			if tenant != tc.tenant {
				t.Errorf("tenant: want %q, got %q", tc.tenant, tenant)
			}
			if session != tc.session {
				t.Errorf("session: want %q, got %q", tc.session, session)
			}
			if cmd != tc.cmd {
				t.Errorf("cmd: want %q, got %q", tc.cmd, cmd)
			}
		})
	}
}

func TestParseRoutingKey_TooFewSegments(t *testing.T) {
	for _, key := range []string{"", "wbot", "wbot.t1", "wbot.t1.42"} {
		_, _, _, err := ParseRoutingKey(key)
		if err == nil {
			t.Errorf("expected error for key %q, got nil", key)
		}
	}
}

func TestParseRoutingKey_UnknownCommand(t *testing.T) {
	_, _, _, err := ParseRoutingKey("wbot.t1.42.unknown.command")
	if err == nil {
		t.Fatal("expected error for unknown command, got nil")
	}
}

func TestParseRoutingKey_ExtractsMultiTenantID(t *testing.T) {
	tenant, session, cmd, err := ParseRoutingKey("wbot.uuid-abc-123.7.session.start")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tenant != "uuid-abc-123" {
		t.Errorf("expected tenant uuid-abc-123, got %q", tenant)
	}
	if session != "7" {
		t.Errorf("expected session 7, got %q", session)
	}
	if cmd != "session.start" {
		t.Errorf("expected session.start, got %q", cmd)
	}
}
