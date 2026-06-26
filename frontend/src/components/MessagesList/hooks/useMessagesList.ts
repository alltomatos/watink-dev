import React, { useReducer, useRef, useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { toast } from "react-toastify";
import { Message } from "../types";
import { parseData } from "../utils/messageHelpers";
import { messagesReducer } from "./messagesReducer";
import { useMessagesSocket } from "./useMessagesSSE";
import { useMessagesScroll } from "./useMessagesScroll";

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
  mentionsMap: Record<string, string>;
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
  const [messagesList, dispatch] = useReducer(messagesReducer, []);
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

  useMessagesSocket(ticketId, dispatch, shouldScrollRef);

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

  const { handleScroll } = useMessagesScroll(
    messagesList,
    pageNumber,
    lastMessageRef,
    messagesListRef,
    shouldScrollRef,
    hasMore,
    loading,
    loadMore
  );

  const handleOpenMessageOptionsMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    message: Message
  ) => {
    setAnchorEl(e.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageOptionsMenu = () => setAnchorEl(null);

  const mentionsMap = useMemo(() => {
    const map: Record<string, string> = {};
    messagesList.forEach((msg) => {
      let number: string | null = null;
      let pushName: string | null = null;
      if (msg.participant) {
        number = (msg.participant as string).replace(/\D/g, "");
        try {
          const data = parseData(msg.dataJson);
          pushName = data.pushName as string | null;
        } catch {
          /* invalid dataJson */
        }
      }
      if (msg.contact) {
        if (!number) number = msg.contact.number ?? null;
        if (!pushName) pushName = msg.contact.name ?? null;
      }
      if (number && pushName) map[number] = pushName;
    });
    participants.forEach((p) => {
      if (p.number && p.name) {
        const num = p.number.replace(/\D/g, "");
        if (!map[num]) map[num] = p.name;
      }
    });
    return map;
  }, [messagesList, participants]);

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
    mentionsMap,
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
