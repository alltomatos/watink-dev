/* @jsxImportSource react */
import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

let socket;
let lastConnectAttemptAt = 0;

const CONNECT_COOLDOWN_MS = 1500;

function parseToken(rawToken) {
  try {
    return JSON.parse(rawToken);
  } catch {
    return rawToken;
  }
}

function connectToSocket() {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return;

  const parsedToken = parseToken(rawToken);

  // Reuse a single socket instance app-wide to avoid connection storms.
  if (!socket) {
    socket = openSocket(getBackendUrl(), {
      transports: ["websocket"],
      query: {
        token: parsedToken,
      },
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

  // Keep token in sync when reusing the same instance.
  if (socket?.io?.opts?.query) {
    socket.io.opts.query.token = parsedToken;
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
