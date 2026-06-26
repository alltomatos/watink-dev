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
const roomRegistry = new Set<string>();

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
  const base = `${getBackendUrl()}/api/v1/events`;
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

  // Close existing connection before reopening with updated rooms.
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const url = buildSSEUrl();
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

  es.onerror = () => {
    // EventSource reconnects automatically; nothing to do here.
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
          room = "notification";
          break;
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

      if (room && !roomRegistry.has(room)) {
        roomRegistry.add(room);
        connectToSSE();
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
  // Ensure connection exists.
  connectToSSE();

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

  // Execute onJoin shim — collects rooms and triggers reconnect if needed.
  if (onJoin) {
    const shimSocket = createShimSocket();

    // Intercept rooms added during this onJoin call so we can clean them up.
    const roomsBefore = new Set(roomRegistry);
    onJoin(shimSocket);
    for (const r of roomRegistry) {
      if (!roomsBefore.has(r)) addedRooms.push(r);
    }
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

    // Remove rooms added by this subscription and reconnect if changed.
    let roomsChanged = false;
    for (const room of addedRooms) {
      if (roomRegistry.has(room)) {
        roomRegistry.delete(room);
        roomsChanged = true;
      }
    }
    if (roomsChanged) {
      connectToSSE();
    }
  };
}

export default connectToSocket;
