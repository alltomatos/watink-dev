package whatsapp

import (
	"errors"
	"testing"
)

// mockSessionLoader is a test double for SessionLoader.
type mockSessionLoader struct {
	sessions []ActiveSession
	err      error
}

func (m *mockSessionLoader) LoadActiveSessions() ([]ActiveSession, error) {
	return m.sessions, m.err
}

func TestActiveSession_Fields(t *testing.T) {
	s := ActiveSession{
		ID:          42,
		TenantID:    "tenant-uuid",
		Name:        "MySession",
		SyncHistory: true,
		SyncPeriod:  "7d",
		KeepAlive:   false,
		Wid:         "5511999999999@s.whatsapp.net",
	}
	if s.ID != 42 {
		t.Errorf("want ID 42, got %d", s.ID)
	}
	if s.TenantID != "tenant-uuid" {
		t.Errorf("want tenant-uuid, got %s", s.TenantID)
	}
	if !s.SyncHistory {
		t.Error("want SyncHistory true")
	}
}

func TestMockSessionLoader_ReturnsConfiguredSessions(t *testing.T) {
	loader := &mockSessionLoader{
		sessions: []ActiveSession{
			{ID: 1, TenantID: "t1", Name: "s1"},
			{ID: 2, TenantID: "t2", Name: "s2"},
		},
	}
	sessions, err := loader.LoadActiveSessions()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sessions) != 2 {
		t.Errorf("want 2 sessions, got %d", len(sessions))
	}
	if sessions[0].ID != 1 || sessions[1].ID != 2 {
		t.Errorf("unexpected session IDs: %v", sessions)
	}
}

func TestMockSessionLoader_PropagatesError(t *testing.T) {
	sentinel := errors.New("db unavailable")
	loader := &mockSessionLoader{err: sentinel}
	_, err := loader.LoadActiveSessions()
	if !errors.Is(err, sentinel) {
		t.Errorf("want sentinel error, got %v", err)
	}
}

func TestMockSessionLoader_EmptyList(t *testing.T) {
	loader := &mockSessionLoader{sessions: []ActiveSession{}}
	sessions, err := loader.LoadActiveSessions()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sessions) != 0 {
		t.Errorf("want 0 sessions, got %d", len(sessions))
	}
}
