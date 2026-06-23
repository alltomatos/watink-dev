# ADR 0009 — On-Demand Media Download

**Status:** Accepted  
**Date:** 2026-06-23  
**Authors:** Ronaldo Davi  

---

## Context

WhatsApp media messages (image, video, audio, document) carry a short-lived download URL inside a serialized protobuf. Previously the engine downloaded every media attachment synchronously inside the whatsmeow event handler, which caused two problems:

1. **Event-loop blocking** — whatsmeow's handler goroutine is serial; a `client.Download()` call (network I/O, up to several seconds) stalled all subsequent events for the same session.
2. **Status@broadcast thrashing** — Story videos were also downloaded, stalling the loop for 1–2 minutes per burst.

Additionally, the browser was receiving raw binary `mediaData` in the AMQP payload, making the payload unnecessarily large for every message regardless of whether the user would ever open it.

## Decision

**Defer all media downloads to an explicit user action.**

### Engine side

- `extractMessageContent` no longer calls `client.Download()`. It only extracts:
  - `thumbnail` — the `JpegThumbnail` bytes (already in the proto, zero network I/O), base64-encoded.
  - `mediaProto` — the full serialized `proto.Marshal` of the media message, base64-encoded. This is the token needed to download later.
- A new `message_content.go` module encapsulates this extraction (no network I/O).
- A new `download.go` module handles the `media.download` RabbitMQ command: deserializes `mediaProto`, calls `client.Download()`, emits a `message.media` event with the result.
- `status@broadcast` messages are filtered at the top of the event handler (early return) to prevent Story video downloads from blocking the loop.
- Profile picture lookups are moved to a background goroutine with a 6-hour TTL cache, eliminating another blocking network call per message.

### Business side

- `ReceiveMessageInput` gains `Thumbnail` and `MediaProto` fields.
- On receive: if the message has a downloadable media type and no `mediaURL`, `mediaStatus` is set to `"pending"` in `dataJson`. The `mediaProto` is stored in `dataJson` for later retrieval.
- A new `POST /media/:messageId/download` endpoint reads `mediaProto` from `dataJson`, publishes a `wbot.<tenantId>.<sessionId>.media.download` command to RabbitMQ, and returns `202 Accepted`.
- On `message.media` event: `handleMediaDownloaded` saves the received bytes via `mediastore.SaveMediaBase64`, sets `mediaUrl`, flips `mediaStatus` to `"downloaded"`, deletes `mediaProto` from `dataJson`, and emits an `appMessage update` socket event.

### Frontend side

- `MessageMedia` detects `!message.mediaUrl && DOWNLOADABLE_TYPES.includes(message.mediaType)` and renders `<OnDemandMediaPreview>` instead.
- `OnDemandMediaPreview` shows a blurred thumbnail (if available) with a download button. On click it POSTs to `/media/:id/download`. When the socket delivers the `appMessage update` with the new `mediaUrl`, the parent re-renders with the real media.

## Consequences

**Positive:**
- Eliminates event-loop blocking; messages now arrive in near-real-time.
- AMQP payloads no longer carry raw media bytes (can be tens of MB for video).
- Users only pay download bandwidth for media they actually open.
- `status@broadcast` no longer stalls the engine.

**Negative / Trade-offs:**
- Media messages require an explicit user action before the content is visible.
- `mediaProto` validity is time-limited by WhatsApp (~a few days); messages older than this cannot be downloaded on-demand. These are marked `mediaStatus: "unavailable"` at receive time.
- A pending message stores the serialized proto in `dataJson` (typically 200–600 bytes). This is acceptable.

## Bugs Fixed During Implementation

Three integration bugs were discovered during end-to-end validation and fixed as part of this feature:

1. **GORM condition accumulation (404 on DownloadMedia)** — Two `First()` calls on the same `*gorm.DB` accumulate `WHERE` clauses. Fixed by using `db.Preload("Ticket").Where(...).First(&msg)` (single query).
2. **Missing RabbitMQ binding (media stuck pending)** — The `"wbot.*.*.message.media"` routing key was absent from `StartEventListener`'s binding list. Fixed by adding it; regression covered by `TestEventListenerRoutingKeys_ContainsRequiredKeys`.
3. **CORS invalid ACAO header (XHR broken after img load)** — Middleware set `Access-Control-Allow-Origin: ""` when no `Origin` header was present (e.g., `<img>` loads), and this empty-ACAO response was cached (no `Vary: Origin`). Subsequent credentialed XHRs failed. Fixed by: always emitting `Vary: Origin`; only setting `ACAO` + `Allow-Credentials` when `origin != ""`.
