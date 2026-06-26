import { getBackendUrl } from "../config";

// ---------------------------------------------------------------------------
// SSEClient — singleton that replaces the former Socket.IO client.
// Public API is preserved: connectToSocket() and subscribeToSocket().
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketHandler = (...args: any[]) => void;

/** Shim socket passed to onJoin callbacks — translates emit() calls to rooms. */
interface ShimSocket {
  emit(event: string, arg?: unknown): void;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let eventSource: EventSource | null = null;

// Reference-counted room registry. Multiple subscriptions may request the same
// room (e.g. Ticket and useMessagesSSE both emit joinChat for the same ticketId).
// A room stays in the active set until ALL subscribers have cleaned up.
const roomRefCounts = new Map<string, number>();
// Derived set used only for URL building — kept in sync with roomRefCounts.
const roomRegistry = new Set<string>();

// Debounce timer for room-change reconnects. Prevents rapid open/close cycles
// caused by React StrictMode (cleanup removes a room → immediate re-mount adds
// it back). All room mutations within RECONNECT_DEBOUNCE_MS are batched into a
// single reconnect, so no event is missed in the gap.
const RECONNECT_DEBOUNCE_MS = 120;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// Exponential backoff for error-triggered reconnects (prevents tight loops when
// the server rejects the connection, e.g. token expired).
let errorBackoffMs = 1_000;
const MAX_ERROR_BACKOFF_MS = 30_000;

function scheduleReconnect(fromError = false): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = fromError ? errorBackoffMs : RECONNECT_DEBOUNCE_MS;
  if (fromError) {
    errorBackoffMs = Math.min(errorBackoffMs * 2, MAX_ERROR_BACKOFF_MS);
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToSSE();
  }, delay);
}

function resetErrorBackoff(): void {
  errorBackoffMs = 1_000;
}

// Map from event name → set of handlers registered across all subscriptions.
const eventListeners = new Map<string, Set<SocketHandler>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string {
  const raw = localStorage.getItem("token");
  if (!raw) return "";
  try {
    return JSON.parse(raw) as string;
  } catch {
    return raw;
  }
}

function buildSSEUrl(): string {
  const token = getToken();
  const rooms = Array.from(roomRegistry).join(",");
  // SSE uses JWT auth in the URL (no cookie needed), so it can bypass the Vite
  // proxy and connect directly to the backend. VITE_SSE_URL is set in dev only;
  // in production this falls back to the regular backend URL.
  const sseBase =
    (import.meta.env.VITE_SSE_URL as string | undefined) || getBackendUrl();
  const base = `${sseBase}/api/v1/events`;
  const params = new URLSearchParams({ token });
  if (rooms) params.set("rooms", rooms);
  return `${base}?${params.toString()}`;
}

function dispatch(eventName: string, payload: unknown): void {
  const handlers = eventListeners.get(eventName);
  if (!handlers) return;
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[SSE] handler error for event "${eventName}":`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Core: connect / reconnect
// ---------------------------------------------------------------------------

function connectToSSE(): void {
  const token = getToken();
  if (!token) return;

  const url = buildSSEUrl();

  // No-op if already connected with the exact same URL (same token + rooms).
  // This prevents endless reconnect loops when connectToSocket() is called on
  // every component render.
  if (
    eventSource &&
    eventSource.readyState !== EventSource.CLOSED &&
    eventSource.url === url
  ) {
    return;
  }

  // Close existing connection before reopening with updated rooms.
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  const es = new EventSource(url);

  es.onmessage = (ev: MessageEvent<string>) => {
    // Generic message frames (no named event) — try to parse as JSON.
    try {
      const parsed = JSON.parse(ev.data) as { type?: string; [k: string]: unknown };
      if (parsed.type) {
        dispatch(parsed.type, parsed);
      }
    } catch {
      // Non-JSON generic frame — ignore.
    }
  };

  es.addEventListener("open", () => {
    // Successful connection — reset error backoff so the next error starts fresh.
    resetErrorBackoff();
  });

  es.onerror = () => {
    // When the server closes the stream or a network error occurs, the browser
    // puts the EventSource in CLOSED or CONNECTING state. In either case we take
    // control: close the stale instance and reconnect with the current token from
    // storage, using exponential backoff to avoid hammering a down server.
    if (eventSource === es) {
      eventSource.close();
      eventSource = null;
      scheduleReconnect(true /* fromError */);
    }
  };

  // Named-event listener: the backend sends `event: <name>\ndata: <json>\n\n`
  // We attach a wildcard listener via a proxy approach. Because EventSource
  // only supports named addEventListener, we re-attach for every known event
  // name whenever we rebuild the connection.
  for (const [eventName] of eventListeners) {
    attachNamedListener(es, eventName);
  }

  eventSource = es;
}

function attachNamedListener(es: EventSource, eventName: string): void {
  es.addEventListener(eventName, (ev: Event) => {
    const msgEv = ev as MessageEvent<string>;
    // Ignore SSE comments/heartbeats (data is empty or ping).
    if (!msgEv.data || msgEv.data.trim() === "ping") return;
    try {
      const payload = JSON.parse(msgEv.data) as unknown;
      dispatch(eventName, payload);
    } catch {
      dispatch(eventName, msgEv.data);
    }
  });
}

// ---------------------------------------------------------------------------
// onJoin shim
// ---------------------------------------------------------------------------

function createShimSocket(): ShimSocket {
  return {
    emit(event: string, arg?: unknown): void {
      let room: string | null = null;

      switch (event) {
        case "joinChat":
          room = `chat:${String(arg)}`;
          break;
        case "joinTickets":
          room = `tickets:${String(arg)}`;
          break;
        case "joinNotification":
          // Backend auto-subscribes every connection to the "notification" room
          // (like it does for the tenant room) — no need to send it explicitly.
          return;
        case "joinHelpdeskKanban":
          room = "helpdesk-kanban";
          break;
        case "joinTenant":
          // Backend auto-subscribes tenant room via JWT — no need to send it.
          return;
        default:
          console.warn(`[SSE shim] unknown emit event: "${event}"`);
          return;
      }

      if (room) {
        const prev = roomRefCounts.get(room) ?? 0;
        roomRefCounts.set(room, prev + 1);
        if (prev === 0) {
          roomRegistry.add(room);
          scheduleReconnect();
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialises (or reuses) the SSE singleton connection.
 * Returns the shim socket so legacy call-sites that use the return value
 * can continue calling `.emit()` on it.
 */
function connectToSocket(): ShimSocket {
  connectToSSE();
  return createShimSocket();
}

/**
 * Subscribes to SSE events using the same signature as the former Socket.IO
 * helper. Handlers are registered globally and dispatched on matching events.
 * `onJoin` receives a shim socket whose `.emit()` translates to room joins.
 *
 * Returns a cleanup function suitable for `useEffect` return values.
 */
export function subscribeToSocket(
  handlers: Record<string, SocketHandler>,
  onJoin?: (socket: ShimSocket) => void
): () => void {
  // Do NOT eagerly call connectToSSE() here — doing so opens a connection
  // BEFORE onJoin has had a chance to add rooms, causing spurious rooms=(none)
  // connections during React commit phases when cleanups run before re-effects.
  // Connections are created/updated exclusively by the debounce timer inside
  // scheduleReconnect(), which fires only after rooms actually change.
  // The health-check interval handles startup when no rooms have been added yet.

  // Register handlers.
  const entries = Object.entries(handlers);
  const addedRooms: string[] = [];

  entries.forEach(([eventName, handler]) => {
    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set());
      // Attach named listener on the live EventSource if it exists.
      if (eventSource) {
        attachNamedListener(eventSource, eventName);
      }
    }
    eventListeners.get(eventName)!.add(handler);
  });

  // Execute onJoin shim — collects rooms with ref counting for cleanup.
  if (onJoin) {
    const trackingShim: ShimSocket = {
      emit(event: string, arg?: unknown): void {
        let room: string | null = null;
        switch (event) {
          case "joinChat": room = `chat:${String(arg)}`; break;
          case "joinTickets": room = `tickets:${String(arg)}`; break;
          case "joinHelpdeskKanban": room = "helpdesk-kanban"; break;
          case "joinNotification":
          case "joinTenant":
            return; // backend handles these automatically
          default:
            console.warn(`[SSE shim] unknown emit event: "${event}"`);
            return;
        }
        if (room) {
          const prev = roomRefCounts.get(room) ?? 0;
          roomRefCounts.set(room, prev + 1);
          if (prev === 0) {
            roomRegistry.add(room);
            scheduleReconnect();
          }
          addedRooms.push(room);
        }
      },
    };
    onJoin(trackingShim);
  }

  return () => {
    // Remove handlers.
    entries.forEach(([eventName, handler]) => {
      const set = eventListeners.get(eventName);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        eventListeners.delete(eventName);
      }
    });

    // Decrement ref counts for rooms this subscription claimed. Only remove
    // from roomRegistry when the last subscriber releases it.
    let roomsChanged = false;
    for (const room of addedRooms) {
      const count = roomRefCounts.get(room) ?? 0;
      if (count <= 1) {
        roomRefCounts.delete(room);
        if (roomRegistry.has(room)) {
          roomRegistry.delete(room);
          roomsChanged = true;
        }
      } else {
        roomRefCounts.set(room, count - 1);
      }
    }
    if (roomsChanged) {
      scheduleReconnect();
    }
  };
}

// ---------------------------------------------------------------------------
// Health-check: reconnect if the EventSource died silently (no onerror fired).
// Runs every 8s. Noop when idle (no rooms + no handlers).
// ---------------------------------------------------------------------------
const HEALTH_CHECK_MS = 8_000;
setInterval(() => {
  const hasWork = roomRegistry.size > 0 || eventListeners.size > 0;
  if (!hasWork) return;
  const dead =
    !eventSource || eventSource.readyState === EventSource.CLOSED;
  if (dead) {
    connectToSSE();
  }
}, HEALTH_CHECK_MS);

export default connectToSocket;
