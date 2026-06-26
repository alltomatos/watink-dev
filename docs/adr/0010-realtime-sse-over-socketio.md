# ADR 0010 — Real-Time via SSE (substituindo Socket.IO)

**Status:** Accepted
**Data:** 2026-06-25

## Contexto
A camada de tempo real Business→Frontend usava Socket.IO (`go-socket.io v1.7.0` no
servidor, `socket.io-client v4.7.5` no cliente). As duas pontas falam protocolos
incompatíveis: o `go-socket.io v1.7.0` implementa Socket.IO ~v1.4 / Engine.IO v3
(namespace implícito), enquanto o `socket.io-client v4.x` fala Socket.IO v5 / EIO=4,
que exige um pacote `CONNECT` de ack de namespace que o servidor Go nunca emite.
Resultado: o `OnConnect` do servidor dispara (Engine.IO conecta), mas o evento
`connect` do cliente nunca dispara (a camada Socket.IO nunca completa). Como os
`joinTenant`/`joinChat`/`joinNotification` vivem dentro de `socket.on("connect")`,
nenhuma sala é ingressada e **nenhum evento chega ao frontend** — mensagens só
apareciam após refresh manual. Agravante: `googollee/go-socket.io` está arquivado
desde set/2024, sem caminho de evolução para o protocolo v5.

## Decisão
Migrar o transporte real-time para **SSE (Server-Sent Events)** com `EventSource`
nativo no cliente. O real-time do Watink é 100% server-push — o cliente nunca envia
dados reais pelo socket (mensagens vão por `POST /messages/:ticketId`); o socket só
carregava pedidos de inscrição em sala, que no SSE viram query params do `GET`.

- **Backbone Redis preservado:** o fan-out cross-node (`Publish`/`Start` + guard
  `SourceID==NodeID`) não muda; só o sink local troca de `server.BroadcastToRoom`
  para `hub.deliver`.
- **Interface `Broadcaster`:** os pontos de emissão passam a depender de uma
  interface (`EmitToRoom`/`EmitToTenantRoom`/`EmitToNamespace`); `RedisBroadcast`
  e `SSEBroadcast` são implementações intercambiáveis por feature-flag.
- **Endpoint:** `GET /api/v1/events?token=<jwt>&rooms=...` → `text/event-stream`.
- **Auth (híbrida):** token na query com TTL curto e rota fora do access-log no curto
  prazo; cookie `HttpOnly` como alvo de produção same-origin.
- **Entrega (híbrida por evento):** `appMessage` usa `Last-Event-ID` + replay via cache
  Redis (`wbot:msg:{jid}:{id}`, TTL 24h); demais eventos são best-effort + refetch REST.
- **Isolamento:** os 3 broadcasts hoje globais (`settings`, `ticket`, `whatsapp`) passam
  a ser tenant-scoped (corrige leak pré-existente — ver ADR 0001/RLS).
- **Frontend:** assinatura `subscribeToSocket(handlers, onJoin)` preservada; só o
  interior de `socket-io.ts` é reescrito (EventSource singleton + roomRegistry + shim).

## Alternativas consideradas
- **WebSocket nativo (coder/websocket):** mais idiomático e isento do limite de 6
  conexões HTTP/1.1, mas paga bidirecionalidade que o Watink não usa e exige
  reimplementar reconexão/heartbeat/replay que o `EventSource` dá de graça. Plano B
  caso surja requisito real de canal cliente→servidor.
- **Trocar a lib de servidor por uma EIO=4** (njones/socketio, tomruk/socket.io-go):
  troca uma dependência arquivada por outra imatura, com retrabalho equivalente ao de
  migrar e sem simplificar o stack.
- **Centrifugo (serviço dedicado):** mais escalável, mas introduz novo serviço para
  operar e desacopla do Redis que já funciona — over-engineering para o volume atual.
- **Travar `socket.io-client` em v2 / status quo:** adia o problema sobre uma lib
  arquivada, sem caminho de evolução.

## Consequências
- Resolve a causa raiz pela estrutura: SSE não tem handshake de namespace; auth +
  inscrição em sala acontecem atomicamente no mesmo `GET`, fechando a janela
  "conectado-sem-sala".
- Alta reversibilidade: SSE e Socket.IO coexistem por feature-flag até paridade.
- **Escopo:** a migração replica os **6 eventos com emissor Go** (`appMessage`,
  `ticket`, `contact`, `whatsappSession`, `whatsapp`, `settings`). Os 5 eventos
  escutados-mas-nunca-emitidos (`user`, `queue`, `tag`, `quickAnswer`, `protocol`)
  permanecem refetch-only como hoje — registrados como débito para implementação
  posterior dos emissores Go.
- **Risco de infra é o caminho crítico:** reverse proxy bufferiza `text/event-stream`
  por padrão (reproduz o sintoma "só aparece após refresh"). Exige `proxy_buffering off`
  + `X-Accel-Buffering: no` + `Flush()` por evento, validado em staging com o proxy real.
- Limite de ~6 conexões por origem em HTTP/1.1 exige **HTTP/2** no listener que serve
  o SSE para não estrangular o `POST /messages` em cenário multi-aba.
- Heartbeat `: ping` (~20s) obrigatório para atravessar idle timeouts de proxy/LB.
- Ao concluir: remover `go-socket.io` (`go.mod`), `socket.io-client` (`package.json`),
  `socket.go`/`StartSocket` e as rotas `/socket.io/*any`.
