import { useEffect, MutableRefObject } from "react";
import openSocket from "../../../services/socket-io";
import { Message, MessagesAction } from "../types";

export function useMessagesSocket(
  ticketId: string | number,
  dispatch: React.Dispatch<MessagesAction>,
  shouldScrollRef: MutableRefObject<"smooth" | "auto" | null>
): void {
  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;
    socket.on("connect", () => socket.emit("joinChatBox", ticketId));
    socket.on(
      "appMessage",
      (data: { action: string; message: Message }) => {
        if (data.action === "create") {
          dispatch({ type: "ADD_MESSAGE", payload: data.message });
          shouldScrollRef.current = "smooth";
        }
        if (data.action === "update") {
          dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
        }
      }
    );
    return () => {
      socket.disconnect();
    };
  }, [ticketId, dispatch, shouldScrollRef]);
}
