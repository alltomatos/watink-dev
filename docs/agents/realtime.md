# Real-Time (SSE) — Contexto para Agentes

## Responsabilidade
Camada de push de eventos Business→Frontend em tempo real (mensagens, tickets,
sessões WhatsApp, contatos, settings), via Server-Sent Events, com fan-out
cross-node por Redis Pub/Sub. Substitui o Socket.IO (ver ADR 0010).

## Contratos de entrada/saída

### Endpoint SSE
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/events?token=<jwt>&rooms=<csv>` | Abre stream `text/event-stream` |

- **Auth:** token JWT na query (TTL curto, rota fora do access-log); alvo: cookie `HttpOnly`.
- **Salas:** auto-inscreve em `tenant:{ctx.TenantID}` (do JWT); salas extras via `rooms=` (`chat:{id}`, `notification`, `tickets:{status}`, `helpdesk-kanban`).
- **Headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
- **Wire:** `id: <messageId>` por evento, `event: <nome>`, `data: <json single-line>`, heartbeat `: ping` a cada ~20s.
- **Replay:** honra `Last-Event-ID` para `appMessage` (via cache Redis `wbot:msg:{jid}:{id}`).

### Interface Broadcaster (`business/internal/services/`)
```go
type Broadcaster interface {
    EmitToRoom(nsp, room, event string, payload interface{})
    EmitToTenantRoom(tenantID, event string, payload interface{})
    EmitToNamespace(nsp, event string, payload interface{})
}
```
Implementações: `RedisBroadcast` (Socket.IO, legado) · `SSEBroadcast` (alvo).

### Eventos COM emissor Go (vivos — migrar)
| Evento | Ação | Sala | Origem |
|---|---|---|---|
| `appMessage` | create/update | `chat:{ticketId}` + `tenant:{id}` | message_send, event_listener_msg_* |
| `ticket` | update/delete | `tenant:{id}` | message_send, event_listener, ticket_mutation |
| `contact` | create/update/delete | `tenant:{id}` | contact_mutation, event_listener_contact |
| `whatsappSession` | update | `tenant:{id}` | event_listener_session, whatsapp_session |
| `whatsapp` | update | `tenant:{id}` | whatsapp_status |
| `settings` | update | global ou `tenant:{id}` | setting.go |

### Eventos SEM emissor (escutados no frontend, refetch-only — débito)
Nenhuma origem emite estes hoje (nem Go, nem legado — não há diretório `legacy/`).
As telas funcionam por refetch. **Fora do escopo da migração** (ver ADR 0010); implementar emissores é follow-up.
| Evento | Consumidor frontend |
|---|---|
| `user` | `useUsers`, `useAuth` |
| `queue` | `useQueues` |
| `tag` | `useTagManager` |
| `quickAnswer` | `useQuickAnswers` |
| `protocol` | `useHelpdeskKanban` (sala `helpdesk-kanban`) |

## Migração do frontend (Opção A)
- **18 call-sites** de `subscribeToSocket`; a assinatura `(handlers, onJoin)` é preservada.
- **5 usam `onJoin`** (precisam de adaptação interna no serviço, não no call-site): `useMessagesSocket`, `useNotifications`, `useHelpdeskKanban`, `Ticket`, `TicketsList`.
- **13 não mudam** uma linha.
- Shim de emit traduz: `joinChat`→`chat:{id}`, `joinTickets`→`tickets:{status}`, `joinNotification`→`notification`, `joinHelpdeskKanban`→`helpdesk-kanban`, `joinTenant`→`tenant:{id}`.

## Invariants (nunca violar)
- Server-push puro — cliente nunca envia dados pelo stream.
- Emissão sempre via `Broadcaster`, nunca implementação concreta.
- Dados de tenant via `EmitToTenantRoom` — nunca `EmitToNamespace("/")`.
- `Flush()` por evento + heartbeat `: ping`.
- Backbone Redis preserva o guard `SourceID==NodeID`.
- Frontend: assinatura `subscribeToSocket(handlers, onJoin)` preservada (Opção A).

## Edge cases críticos
- **Buffering de proxy:** reverse proxy bufferiza `text/event-stream` por padrão → reproduz "só aparece após refresh". Exige `proxy_buffering off` + `X-Accel-Buffering: no`; validar em staging com proxy real.
- **Limite de 6 conexões HTTP/1.1:** multi-aba estrangula `POST /messages` → exige HTTP/2 no listener.
- **Idle timeout:** sem heartbeat, conexão cai aos ~30-60s.
- **Troca de ticket:** reabre o EventSource (cleanup + join) → debounce no roomRegistry para reabrir 1 vez com o conjunto final de salas.
- **Reconexão:** EventSource reconecta sozinho; `appMessage` recupera via `Last-Event-ID`; demais eventos via refetch REST.
- **`data:` multilinha:** payload com newline é concatenado pelo browser — manter `json.Marshal` single-line, um `data:` por evento.

## Dependências internas
- **Redis Pub/Sub** (`socketio:broadcast`): fan-out cross-node — reusado as-is.
- **RabbitMQ event_listeners:** origem dos eventos do WhatsApp.
- **Controllers REST:** origem das mutações do usuário (pontos de emissão `EmitTo*`).
- **JWT/Multitenancy** (ADR 0001): `tenantId` do token define a Tenant Room.
- **Cache Redis** (`wbot:msg:{jid}:{id}`, TTL 24h): replay de `appMessage`.

## O que NÃO fazer
- Não voltar a Socket.IO (ADR 0010).
- Não setar header `Authorization` no `EventSource`.
- Não emitir dado de tenant com `EmitToNamespace`.
- Não rodar real-time atrás de proxy sem desabilitar buffering/compressão na rota.
- Não tentar "consertar paridade" de `user`/`queue`/`tag`/`quickAnswer`/`protocol` — não têm emissor; seguem refetch-only.

## Critério de sucesso
1. Mensagem enviada via REST aparece na conversa em <1s, sem refresh.
2. `lastMessage` do ticket na sidebar atualiza em tempo real, sem refresh.
3. Paridade dos **6 eventos com emissor Go**; os 5 sem emissor seguem refetch-only (igual hoje).
4. Evento de um tenant não chega a outro (teste com 2 tenants).
5. Derrubar/reerguer o backend → reconecta sozinho e nenhum `appMessage` se perde.
6. Multi-aba sob HTTP/2 → `POST /messages` não fica pending.
7. Atrás do proxy real (staging) → primeiro evento chega imediatamente.
8. Socket.IO removido de `go.mod` e `package.json` após paridade.
