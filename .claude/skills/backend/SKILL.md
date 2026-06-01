---
name: backend
description: Use when debugging or implementing Watink WhatsMeow engine-go, RabbitMQ command/event flow, backend Go session lifecycle, QR generation, message ingestion, group messages, or multi-tenant WhatsApp issues.
---

# Watink WhatsMeow RabbitMQ Go

## Overview

Use root-cause tracing across `engine-go`, RabbitMQ, and `business/` before editing. Prove where the flow stops: backend command, RabbitMQ route, WhatsMeow event, engine publish, backend consume, DB/Socket.IO update.

## Critical Files

| Area | File | What to inspect |
|---|---|---|
| Command consumer | `engine-go/cmd/engine/main.go` | `wbot.*.*.session.start`, routing key parsing, `StartClient()` calls |
| WhatsMeow lifecycle | `engine-go/internal/whatsapp/service.go` | `StartClient()`, `AutoRestartSessions()`, `handleEvent()` |
| RabbitMQ engine | `engine-go/internal/rabbitmq/rabbitmq.go` | `ConsumeCommands()`, `PublishEvent()` logs |
| Backend event consume | `business/internal/services/event_listener.go` | `EventEnvelope`, `tenantId`, QR/status/message handlers |
| Backend session command | `business/internal/services/whatsapp_session.go` | Publishing `session.start`/`session.stop` commands |

## Diagnostic Commands

Run from repo root.

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

```bash
docker logs watink-engine --tail 100
```

```bash
docker logs watinkdev-watink-1 --tail 100
```

```bash
docker exec watinkdev-rabbitmq-1 rabbitmqctl list_queues name messages consumers durable
```

```bash
docker exec watinkdev-rabbitmq-1 rabbitmqctl list_bindings source_name source_kind destination_name destination_kind routing_key | grep wbot
```

```bash
docker exec watinkdev-postgres-1 psql -U postgres -d watink -c 'SELECT id, name, status, number, "tenantId", "updatedAt" FROM "Whatsapps" ORDER BY id;'
```

## Message/QR Flow Checklist

1. Backend logs command publish to `wbot.commands`.
2. RabbitMQ has `engine.go.commands` with `consumers=1`.
3. Engine logs `Received command: wbot.{tenantId}.{sessionId}.session.start`.
4. `StartClient()` registers `AddEventHandler()` before `client.Connect()`.
5. WhatsMeow event reaches `handleEvent()`.
6. Engine logs `Published event to wbot.{tenantId}.{sessionId}...`.
7. RabbitMQ has `api.events.process.go` with `consumers=1`.
8. Backend logs `[EventListener] Event received: ... (Tenant: ...)`.
9. DB `Whatsapps.status/qrcode` and Socket.IO update match the event.

## Gotchas

- `AutoRestartSessions()` currently only lists devices; after engine rebuild/restart, DB can say `CONNECTED` while no WhatsMeow client/handler exists in memory.
- `StartClient()` selecting `devices[0]` is unsafe for multi-session/multi-tenant; require an explicit `Whatsapp.id` ↔ WhatsMeow device JID mapping.
- Session events must include `tenantId` in JSON, not only in the routing key. Check `session.qrcode`, `session.status`, and `session.pairing_code`.
- If no `Published event to wbot...message.received` appears, investigate engine WhatsMeow client/handler first, not backend consumption.
- Socket.IO reconnect storms in backend logs can mask useful evidence; filter out `connected:`, `closed client namespace`, and `/socket.io` noise.
- Inside backend containers, `localhost:8090` points to the backend container, not the hub service.

## Common Failure Patterns

| Symptom | First place to check |
|---|---|
| QR generated in engine but UI stuck | `tenantId` in event JSON and `event_listener.go` QR handler |
| DB says connected but no message logs | Engine restarted without recreating WhatsMeow client via `StartClient()` |
| Messages reach RabbitMQ but not app | `api.events.process.go` consumer and backend `EventListener` logs |
| Group messages invisible | Confirm `handleEvent()` receives `events.Message`; then inspect `v.Info.Chat`/`Sender` handling |
| Wrong session receives events | `devices[0]` fallback and missing session-device mapping |

## Implementation Rule

No speculative fixes. Capture one failing flow in logs, identify the broken boundary, then change the smallest source file that owns that boundary.
