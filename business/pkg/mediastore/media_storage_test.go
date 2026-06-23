package mediastore

import (
	"bytes"
	"encoding/base64"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSaveMediaBase64_Empty(t *testing.T) {
	url, err := SaveMediaBase64("", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url != "" {
		t.Errorf("expected empty url, got %q", url)
	}
}

func TestSaveMediaBase64_InvalidBase64(t *testing.T) {
	_, err := SaveMediaBase64("not-valid-base64!!!", "image/jpeg")
	if err == nil {
		t.Error("expected error for invalid base64, got nil")
	}
}

func TestSaveMediaBase64_SavesFile(t *testing.T) {
	tmp := t.TempDir()
	origDir := mediaPublicDir
	// Override the dir to a temp path for the test
	mediaPublicDir = filepath.Join(tmp, "public", "media")
	defer func() { mediaPublicDir = origDir }()

	payload := base64.StdEncoding.EncodeToString([]byte("fake-image-data"))
	url, err := SaveMediaBase64(payload, "image/png")
	if err != nil {
		t.Fatalf("SaveMediaBase64() error: %v", err)
	}
	if !strings.HasPrefix(url, "/public/media/") {
		t.Errorf("expected URL starting with /public/media/, got %q", url)
	}
	if !strings.HasSuffix(url, ".png") {
		t.Errorf("expected .png extension in URL, got %q", url)
	}
}

func TestSaveMediaBase64_Idempotent(t *testing.T) {
	tmp := t.TempDir()
	origDir := mediaPublicDir
	mediaPublicDir = filepath.Join(tmp, "public", "media")
	defer func() { mediaPublicDir = origDir }()

	payload := base64.StdEncoding.EncodeToString([]byte("same-data"))
	url1, _ := SaveMediaBase64(payload, "image/jpeg")
	url2, _ := SaveMediaBase64(payload, "image/jpeg")
	if url1 != url2 {
		t.Errorf("expected same URL on repeat call: %q vs %q", url1, url2)
	}
	// Ensure only one file exists
	entries, _ := os.ReadDir(mediaPublicDir)
	if len(entries) != 1 {
		t.Errorf("expected 1 file, got %d", len(entries))
	}
}

func TestSaveMediaReader_Empty(t *testing.T) {
	url, err := SaveMediaReader(bytes.NewReader([]byte{}), "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url != "" {
		t.Errorf("expected empty url for empty reader, got %q", url)
	}
}

func TestSaveMediaReader_SavesFile(t *testing.T) {
	tmp := t.TempDir()
	origDir := mediaPublicDir
	mediaPublicDir = filepath.Join(tmp, "public", "media")
	defer func() { mediaPublicDir = origDir }()

	url, err := SaveMediaReader(bytes.NewReader([]byte("fake-mp3-data")), "audio/mpeg")
	if err != nil {
		t.Fatalf("SaveMediaReader() error: %v", err)
	}
	if !strings.HasPrefix(url, "/public/media/") {
		t.Errorf("expected URL starting with /public/media/, got %q", url)
	}
	if !strings.HasSuffix(url, ".mp3") {
		t.Errorf("expected .mp3 extension, got %q", url)
	}
}

func TestSaveMediaReader_Idempotent(t *testing.T) {
	tmp := t.TempDir()
	origDir := mediaPublicDir
	mediaPublicDir = filepath.Join(tmp, "public", "media")
	defer func() { mediaPublicDir = origDir }()

	data := []byte("idempotent-data")
	url1, _ := SaveMediaReader(bytes.NewReader(data), "image/png")
	url2, _ := SaveMediaReader(bytes.NewReader(data), "image/png")
	if url1 != url2 {
		t.Errorf("expected same URL on repeat call: %q vs %q", url1, url2)
	}
	entries, _ := os.ReadDir(mediaPublicDir)
	if len(entries) != 1 {
		t.Errorf("expected 1 file, got %d", len(entries))
	}
}

func TestSaveMediaReader_ReadError(t *testing.T) {
	origDir := mediaPublicDir
	mediaPublicDir = t.TempDir()
	defer func() { mediaPublicDir = origDir }()

	errReader := &errorReader{}
	_, err := SaveMediaReader(errReader, "image/jpeg")
	if err == nil {
		t.Error("expected error from failing reader, got nil")
	}
}

type errorReader struct{}

func (e *errorReader) Read(_ []byte) (int, error) {
	return 0, io.ErrUnexpectedEOF
}

func TestExtensionForMime(t *testing.T) {
	cases := map[string]string{
		"image/jpeg":      ".jpg",
		"image/png":       ".png",
		"audio/ogg":       ".ogg",
		"video/mp4":       ".mp4",
		"application/pdf": ".pdf",
		"":                ".bin",
	}
	for mimeType, want := range cases {
		got := extensionForMime(mimeType)
		if got != want {
			t.Errorf("extensionForMime(%q) = %q, want %q", mimeType, got, want)
		}
	}
}
