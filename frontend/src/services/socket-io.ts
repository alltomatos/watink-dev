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

export default connectToSocket;
