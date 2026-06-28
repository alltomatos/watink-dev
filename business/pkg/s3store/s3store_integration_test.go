//go:build integration

package s3store

import (
	"bytes"
	"context"
	"io"
	"os"
	"testing"
)

// TestStore_UploadDownload round-trips an object through a live S3-compatible
// store (MinIO in dev). Skips when S3 is not configured so CI without MinIO
// stays green.
func TestStore_UploadDownload(t *testing.T) {
	if os.Getenv("S3_ENDPOINT") == "" {
		t.Skip("S3_ENDPOINT not set — skipping S3 integration test")
	}

	cfg, ok := ConfigFromEnv()
	if !ok {
		t.Fatal("ConfigFromEnv returned ok=false")
	}
	store, err := New(cfg)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	ctx := context.Background()
	key := "test/integration/hello.txt"
	content := []byte("olá mundo s3")

	if err := store.Upload(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain"); err != nil {
		t.Fatalf("Upload: %v", err)
	}

	r, err := store.Download(ctx, key)
	if err != nil {
		t.Fatalf("Download: %v", err)
	}
	defer func() { _ = r.Close() }()

	got, err := io.ReadAll(r)
	if err != nil {
		t.Fatalf("ReadAll: %v", err)
	}
	if string(got) != string(content) {
		t.Fatalf("round-trip mismatch: got %q want %q", got, content)
	}
}
