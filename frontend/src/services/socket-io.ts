import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

let socket: ReturnType<typeof openSocket> | null = null;
let lastConnectAttemptAt = 0;

const CONNECT_COOLDOWN_MS = 1500;

function parseToken(rawToken: string): string {
  try {
    return JSON.parse(rawToken);
  } catch {
    return rawToken;
  }
}

function getTenantId(): string {
  const raw = localStorage.getItem("user");
  if (!raw) return "";
  try {
    const user = JSON.parse(raw);
    return typeof user?.tenantId === "string" ? user.tenantId : "";
  } catch {
    return "";
  }
}

function connectToSocket(): ReturnType<typeof openSocket> | undefined {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return undefined;

  const parsedToken = parseToken(rawToken);

  if (!socket) {
    socket = openSocket(getBackendUrl(), {
      transports: ["websocket"],
      query: { token: parsedToken },
      autoConnect: false,
      forceNew: false,
      multiplex: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    // On every (re)connect: join tenant room for isolated global broadcasts.
    socket.on("connect", () => {
      const tenantId = getTenantId();
      if (tenantId) {
        socket?.emit("joinTenant", tenantId);
        socket?.emit("joinNotification", "");
      }
    });
  }

  // Keep token in sync when reusing the same instance
  const opts = (socket as unknown as { io?: { opts?: { query?: Record<string, string> } } }).io?.opts;
  if (opts?.query) {
    opts.query.token = parsedToken;
  }

  const now = Date.now();
  const canTryConnect = now - lastConnectAttemptAt >= CONNECT_COOLDOWN_MS;

  if (!socket.connected && canTryConnect) {
    lastConnectAttemptAt = now;
    socket.connect();
  }

  return socket;
}

type SocketInstance = NonNullable<ReturnType<typeof connectToSocket>>;
// Handlers carregam tipos de payload específicos em cada call site; o helper só
// precisa repassá-los a on/off, então aceitamos qualquer assinatura aqui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketHandler = (...args: any[]) => void;

/**
 * Assina eventos no socket compartilhado de forma segura.
 *
 * - Registra cada handler com `socket.on` e os remove (apenas eles) no cleanup
 *   via `socket.off` — NUNCA chama `socket.disconnect()`, que derrubaria a
 *   conexão singleton para todos os outros componentes.
 * - Executa `onJoin` imediatamente caso o socket já esteja conectado e também
 *   no evento `connect` (cobrindo reconexões). Como o socket é reutilizado,
 *   o `connect` muitas vezes não dispara de novo, então o join imediato é o
 *   que garante a entrada nas rooms (joinNotification/joinTickets/joinChatBox).
 *
 * Retorna a função de cleanup pronta para uso direto em `useEffect`.
 */
export function subscribeToSocket(
  handlers: Record<string, SocketHandler>,
  onJoin?: (socket: SocketInstance) => void
): () => void {
  const socket = connectToSocket();
  if (!socket) return () => {};

  const join = onJoin ? () => onJoin(socket) : undefined;
  if (join) {
    socket.on("connect", join);
    if (socket.connected) join();
  }

  const entries = Object.entries(handlers);
  entries.forEach(([event, handler]) => socket.on(event, handler));

  return () => {
    if (join) socket.off("connect", join);
    entries.forEach(([event, handler]) => socket.off(event, handler));
  };
}

export default connectToSocket;
