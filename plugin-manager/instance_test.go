package main

import (
	"os"
	"path/filepath"
	"regexp"
	"testing"
)

// withTempInstanceFile roda fn com InstanceFile apontando para um arquivo
// temporário isolado, restaurando o valor original ao final.
func withTempInstanceFile(t *testing.T, fn func(path string)) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, ".instance_id")

	orig := InstanceFile
	InstanceFile = path
	t.Cleanup(func() { InstanceFile = orig })

	fn(path)
}

var instanceIDPattern = regexp.MustCompile(`^INST-\d+-[0-9a-f]{12}$`)

func TestGetInstanceID_FirstCallGeneratesAndPersists(t *testing.T) {
	withTempInstanceFile(t, func(path string) {
		if _, err := os.Stat(path); err == nil {
			t.Fatalf("expected instance file to not exist yet")
		}

		id, err := getInstanceID()
		if err != nil {
			t.Fatalf("getInstanceID returned error: %v", err)
		}

		if !instanceIDPattern.MatchString(id) {
			t.Fatalf("instanceId %q does not match expected format INST-{ts}-{hash}", id)
		}

		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("expected instance file to be persisted: %v", err)
		}
		if string(data) != id {
			t.Fatalf("persisted content %q does not match returned id %q", string(data), id)
		}
	})
}

func TestGetInstanceID_SecondCallReturnsSameID(t *testing.T) {
	withTempInstanceFile(t, func(path string) {
		firstID, err := getInstanceID()
		if err != nil {
			t.Fatalf("first getInstanceID returned error: %v", err)
		}

		secondID, err := getInstanceID()
		if err != nil {
			t.Fatalf("second getInstanceID returned error: %v", err)
		}

		if firstID != secondID {
			t.Fatalf("expected idempotent instanceId, got %q then %q", firstID, secondID)
		}
	})
}

func TestGenerateInstanceID_FormatAndUniqueness(t *testing.T) {
	id1, err := generateInstanceID()
	if err != nil {
		t.Fatalf("generateInstanceID returned error: %v", err)
	}
	id2, err := generateInstanceID()
	if err != nil {
		t.Fatalf("generateInstanceID returned error: %v", err)
	}

	if !instanceIDPattern.MatchString(id1) {
		t.Fatalf("instanceId %q does not match expected format", id1)
	}
	if id1 == id2 {
		t.Fatalf("expected two independently generated instanceIds to differ, got %q twice", id1)
	}
}
