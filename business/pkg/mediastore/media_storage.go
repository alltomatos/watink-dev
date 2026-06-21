package mediastore

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"strings"
)

var mediaPublicDir = "public/media"

// SaveMediaBase64 decodes a base64 media payload, persists it under
// <workdir>/public/media/<sha256>.<ext>, and returns the relative URL
// "/public/media/<sha256>.<ext>".
//
// Returns ("", nil) when mediaData is empty so callers can skip without error.
func SaveMediaBase64(mediaData string, mimeType string) (string, error) {
	if mediaData == "" {
		return "", nil
	}

	raw, err := base64.StdEncoding.DecodeString(mediaData)
	if err != nil {
		return "", fmt.Errorf("media_storage: base64 decode: %w", err)
	}

	ext := extensionForMime(mimeType)
	hash := fmt.Sprintf("%x", sha256.Sum256(raw))
	filename := hash + ext

	dir := mediaPublicDir
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("media_storage: mkdir %s: %w", dir, err)
	}

	dest := filepath.Join(dir, filename)
	if _, err := os.Stat(dest); os.IsNotExist(err) {
		if err := os.WriteFile(dest, raw, 0o644); err != nil {
			return "", fmt.Errorf("media_storage: write %s: %w", dest, err)
		}
	}

	return "/public/media/" + filename, nil
}

// extensionForMime returns a file extension (with leading dot) for the given
// MIME type. Falls back to ".bin" for unknown types.
func extensionForMime(mimeType string) string {
	if mimeType == "" {
		return ".bin"
	}
	// Strip parameters (e.g. "audio/ogg; codecs=opus" → "audio/ogg")
	base := strings.SplitN(mimeType, ";", 2)[0]
	base = strings.TrimSpace(base)

	// mime.ExtensionsByType returns canonical + aliases; prefer known short ones.
	exts, err := mime.ExtensionsByType(base)
	if err == nil && len(exts) > 0 {
		// Prefer common short extensions for known types.
		preferred := map[string]string{
			"image/jpeg":      ".jpg",
			"image/png":       ".png",
			"image/webp":      ".webp",
			"image/gif":       ".gif",
			"video/mp4":       ".mp4",
			"video/webm":      ".webm",
			"audio/ogg":       ".ogg",
			"audio/mpeg":      ".mp3",
			"audio/mp4":       ".m4a",
			"application/pdf": ".pdf",
		}
		if p, ok := preferred[base]; ok {
			return p
		}
		return exts[0]
	}

	// Fallback: derive from subtype
	parts := strings.SplitN(base, "/", 2)
	if len(parts) == 2 {
		return "." + parts[1]
	}
	return ".bin"
}
