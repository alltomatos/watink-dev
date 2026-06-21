import { useEffect } from "react";
import openSocket from "../../../services/socket-io";
import { Message, MessagesAction } from "./messagesReducer";

interface UseMessagesSocketProps {
  ticketId: string | number;
  dispatch: React.Dispatch<MessagesAction>;
  onNewMessage: () => void;
}

/**
 * Manages the Socket.IO subscription for real-time message updates.
 * Joins the ticket room on connect, handles appMessage create/update events,
 * and disconnects on cleanup.
 */
export const useMessagesSocket = ({
  ticketId,
  dispatch,
  onNewMessage,
}: UseMessagesSocketProps): void => {
  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("connect", () => socket.emit("joinChatBox", ticketId));

    socket.on("appMessage", (data: { action: string; message: Message }) => {
      if (data.action === "create") {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        onNewMessage();
      }
      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticketId, dispatch, onNewMessage]);
};
