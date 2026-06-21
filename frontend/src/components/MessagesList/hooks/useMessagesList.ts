import React, {
  useState,
  useEffect,
  useReducer,
  useRef,
  useCallback,
} from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { messagesReducer, Message } from "./messagesReducer";
import { useMessagesSocket } from "./useMessagesSocket";
import { useMessagesScroll } from "./useMessagesScroll";

export interface UseMessagesListReturn {
  messagesList: Message[];
  loading: boolean;
  hasMore: boolean;
  pageNumber: number;
  participants: Array<{ number: string; name?: string }>;
  messagesListRef: React.RefObject<HTMLDivElement | null>;
  lastMessageRef: React.RefObject<HTMLDivElement | null>;
  selectedMessage: Message;
  anchorEl: HTMLElement | null;
  messageOptionsMenuOpen: boolean;
  historyModalOpen: boolean;
  historyFromDate: string;
  historyLoading: boolean;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handleOpenMessageOptionsMenu: (
    e: React.MouseEvent<HTMLButtonElement>,
    message: Message
  ) => void;
  handleCloseMessageOptionsMenu: () => void;
  handleSyncHistory: () => Promise<void>;
  setHistoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHistoryFromDate: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Orchestrates all state and side-effects for the MessagesList component.
 * Delegates socket subscription to useMessagesSocket and scroll logic to
 * useMessagesScroll; owns pagination, history sync, and option-menu state.
 */
export const useMessagesList = (
  ticketId: string | number,
  isGroup?: boolean
): UseMessagesListReturn => {
  const [messagesList, dispatch] = useReducer(messagesReducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState<Message>({} as Message);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const [participants, setParticipants] = useState<Array<{ number: string; name?: string }>>([]);

  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollRef = useRef<"smooth" | "auto" | null>(null);
  const currentTicketId = useRef(ticketId);

  // ── Reset on ticket change ────────────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    currentTicketId.current = ticketId;
  }, [ticketId]);

  // ── Fetch messages page ───────────────────────────────────────────────────
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

  // ── Scroll after messages update ──────────────────────────────────────────
  const scrollToBottomRef = useRef<((behavior?: ScrollBehavior) => void) | null>(null);

  useEffect(() => {
    if (shouldScrollRef.current && scrollToBottomRef.current) {
      scrollToBottomRef.current(
        shouldScrollRef.current === "smooth" ? "smooth" : "auto"
      );
      shouldScrollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesList]);

  // ── Fetch group participants ───────────────────────────────────────────────
  useEffect(() => {
    if (!isGroup) return;
    const fetchParticipants = async () => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}/participants`);
        setParticipants(data);
      } catch {
        // silent — participants are cosmetic (color assignment)
      }
    };
    fetchParticipants();
  }, [ticketId, isGroup]);

  // ── Socket subscription ───────────────────────────────────────────────────
  const onNewMessage = useCallback(() => {
    shouldScrollRef.current = "smooth";
  }, []);

  useMessagesSocket({ ticketId, dispatch, onNewMessage });

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const loadMore = useCallback(() => setPageNumber((prev) => prev + 1), []);

  const { scrollToBottom, handleScroll } = useMessagesScroll({
    pageNumber,
    hasMore,
    loading,
    lastMessageRef,
    messagesListRef,
    onLoadMore: loadMore,
  });

  // Store scrollToBottom in ref so the messagesList effect can call it
  scrollToBottomRef.current = scrollToBottom;

  // ── Message options menu ──────────────────────────────────────────────────
  const handleOpenMessageOptionsMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, message: Message) => {
      setAnchorEl(e.currentTarget);
      setSelectedMessage(message);
    },
    []
  );

  const handleCloseMessageOptionsMenu = useCallback(() => setAnchorEl(null), []);

  // ── History sync ──────────────────────────────────────────────────────────
  const handleSyncHistory = useCallback(async () => {
    if (!historyFromDate) {
      toast.error("Selecione uma data de início");
      return;
    }
    setHistoryLoading(true);
    try {
      await api.post(`/tickets/${ticketId}/history`, { fromDate: historyFromDate });
      toast.success("Buscando histórico de mensagens...");
      setHistoryModalOpen(false);
      setHistoryFromDate("");
    } catch (err) {
      toastError(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFromDate, ticketId]);

  return {
    messagesList,
    loading,
    hasMore,
    pageNumber,
    participants,
    messagesListRef,
    lastMessageRef,
    selectedMessage,
    anchorEl,
    messageOptionsMenuOpen,
    historyModalOpen,
    historyFromDate,
    historyLoading,
    handleScroll,
    handleOpenMessageOptionsMenu,
    handleCloseMessageOptionsMenu,
    handleSyncHistory,
    setHistoryModalOpen,
    setHistoryFromDate,
  };
};
