/* @jsxImportSource react */
import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

let socket;

function connectToSocket() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const parsedToken = JSON.parse(token);

  // Reuse a single socket instance app-wide to avoid connection storms.
  if (!socket) {
    socket = openSocket(getBackendUrl(), {
      transports: ["websocket"],
      query: {
        token: parsedToken,
      },
    });

    return socket;
  }

  // Keep token in sync when reusing the same instance.
  if (socket?.io?.opts?.query) {
    socket.io.opts.query.token = parsedToken;
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export default connectToSocket;