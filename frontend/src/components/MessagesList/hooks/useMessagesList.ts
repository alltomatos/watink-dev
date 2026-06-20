import { useReducer, useRef, useState, useEffect } from "react";
import openSocket from "../../../services/socket-io";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { Message, MessagesAction } from "../types";
import { toast } from "react-toastify";

const sortByDate = (arr: Message[]) =>
  [...arr].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

const reducer = (state: Message[], action: MessagesAction): Message[] => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload || [];
    const merged = [...state];
    messages.forEach((message) => {
      const idx = merged.findIndex((m) => m.id === message.id);
      if (idx !== -1) merged[idx] = message;
      else merged.push(message);
    });
    return sortByDate(merged);
  }
  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const idx = state.findIndex((m) => m.id === newMessage.id);
    const updated = [...state];
    if (idx !== -1) updated[idx] = newMessage;
    else updated.push(newMessage);
    return sortByDate(updated);
  }
  if (action.type === "UPDATE_MESSAGE") {
    const idx = state.findIndex((m) => m.id === action.payload.id);
    if (idx === -1) return state;
    const updated = [...state];
    updated[idx] = action.payload;
    return sortByDate(updated);
  }
  if (action.type === "RESET") return [];
  return state;
};

export interface UseMessagesListReturn {
  messagesList: Message[];
  pageNumber: number;
  hasMore: boolean;
  loading: boolean;
  lastMessageRef: React.RefObject<HTMLDivElement>;
  messagesListRef: React.RefObject<HTMLDivElement>;
  selectedMessage: Message;
  anchorEl: HTMLElement | null;
  messageOptionsMenuOpen: boolean;
  participants: Array<{ number: string; name?: string }>;
  groupColorCacheRef: React.RefObject<Map<string, string>>;
  historyModalOpen: boolean;
  historyFromDate: string;
  historyLoading: boolean;
  setHistoryModalOpen: (v: boolean) => void;
  setHistoryFromDate: (v: string) => void;
  loadMore: () => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handleOpenMessageOptionsMenu: (
    e: React.MouseEvent<HTMLButtonElement>,
    message: Message
  ) => void;
  handleCloseMessageOptionsMenu: () => void;
  handleSyncHistory: () => Promise<void>;
}

export function useMessagesList(
  ticketId: string | number,
  isGroup?: boolean
): UseMessagesListReturn {
  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const [selectedMessage, setSelectedMessage] = useState<Message>({} as Message);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const currentTicketId = useRef(ticketId);
  const shouldScrollRef = useRef<"smooth" | "auto" | null>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const [participants, setParticipants] = useState<
    Array<{ number: string; name?: string }>
  >([]);
  const groupColorCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    currentTicketId.current = ticketId;
  }, [ticketId]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      const behavior = shouldScrollRef.current === "smooth" ? "smooth" : "auto";
      if (pageNumber <= 1) {
        setTimeout(() => {
          lastMessageRef.current?.scrollIntoView({ behavior });
        }, 100);
      }
      shouldScrollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesList]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/messages/${ticketId}`, {
          params: { pageNumber },
        });
        if (currentTicketId.current === ticketId) {
          dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
          setHasMore(data.hasMore);
          setLoading(false);
        }
        if (pageNumber === 1 && data.messages.length > 0) {
          shouldScrollRef.current = "auto";
        }
      } catch (err) {
        setLoading(false);
        toastError(err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pageNumber, ticketId]);

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
  }, [ticketId]);

  useEffect(() => {
    if (!isGroup) return;
    const fetchParticipants = async () => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}/participants`);
        setParticipants(data);
      } catch {
        // silent
      }
    };
    fetchParticipants();
  }, [ticketId, isGroup]);

  const loadMore = () => setPageNumber((prev) => prev + 1);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && messagesListRef.current) {
      messagesListRef.current.scrollTop = 1;
    }
    if (loading) return;
    if (scrollTop < 50) loadMore();
  };

  const handleOpenMessageOptionsMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    message: Message
  ) => {
    setAnchorEl(e.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageOptionsMenu = () => setAnchorEl(null);

  const handleSyncHistory = async () => {
    if (!historyFromDate) {
      toast.error("Selecione uma data de início");
      return;
    }
    setHistoryLoading(true);
    try {
      await api.post(`/tickets/${ticketId}/history`, {
        fromDate: historyFromDate,
      });
      toast.success("Buscando histórico de mensagens...");
      setHistoryModalOpen(false);
      setHistoryFromDate("");
    } catch (err) {
      toastError(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return {
    messagesList,
    pageNumber,
    hasMore,
    loading,
    lastMessageRef,
    messagesListRef,
    selectedMessage,
    anchorEl,
    messageOptionsMenuOpen,
    participants,
    groupColorCacheRef,
    historyModalOpen,
    historyFromDate,
    historyLoading,
    setHistoryModalOpen,
    setHistoryFromDate,
    loadMore,
    handleScroll,
    handleOpenMessageOptionsMenu,
    handleCloseMessageOptionsMenu,
    handleSyncHistory,
  };
}
