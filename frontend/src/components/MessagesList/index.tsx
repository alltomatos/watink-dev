/* @jsxImportSource react */
import React, { useState, useEffect, useReducer, useRef } from "react";
import { isSameDay, parseISO, format } from "date-fns";
import openSocket from "../../services/socket-io";
import clsx from "clsx";
import { Clock, Ban, Check, CheckCheck, AlertCircle, ChevronDown, History } from "lucide-react";

import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import FilePreview from "../FilePreview";
import whatsBackground from "../../assets/wa-background.png";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { useThemeContext } from "../../context/DarkMode";
import Audio from "../Audio";
import { getBackendUrl } from "../../helpers/urlUtils";
import { toast } from "react-toastify";

import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

import { Reaction } from "../../types/Message";

interface Contact {
  name?: string;
  number?: string;
  isGroup?: boolean;
}

interface QuotedMsg {
  id: number | string;
  fromMe?: boolean;
  body?: string;
  mediaType?: string;
  participant?: string;
  dataJson?: string | Record<string, unknown>;
  contact?: Contact;
}

interface Message {
  id: number | string;
  body: string;
  fromMe: boolean;
  mediaUrl?: string;
  mediaType?: string;
  isDeleted?: boolean;
  ack?: number;
  createdAt: string;
  quotedMsg?: QuotedMsg;
  participant?: string;
  dataJson?: string | Record<string, unknown>;
  contact?: Contact;
  reactions?: Reaction[] | string;
  /**
   * Index signature required so this type is structurally assignable to the
   * `Message` declared in MessageOptionsMenu (which uses `[key: string]: unknown`).
   * Without it, passing `selectedMessage` to `<MessageOptionsMenu message={…} />`
   * raises TS2719 ("Two different types with this name exist").
   */
  [key: string]: unknown;
}

interface MessagesListProps {
  ticketId: string | number;
  isGroup?: boolean;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type MessagesAction =
  | { type: "LOAD_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: Message }
  | { type: "RESET" };

const reducer = (state: Message[], action: MessagesAction): Message[] => {
  const sortByDate = (arr: Message[]) =>
    [...arr].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseData = (raw: string | Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
};

const isDateValid = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const date = parseISO(dateStr);
  return !isNaN(date.getTime()) && date.getFullYear() > 2000;
};

const PARTICIPANT_COLORS = [
  "var(--status-warning)",
  "var(--status-error)",
  "var(--text-muted)",
  "var(--action-primary)",
  "var(--status-success)",
  "var(--status-info)",
];

// ─── Component ────────────────────────────────────────────────────────────────

const MessagesList: React.FC<MessagesListProps> = ({ ticketId, isGroup }) => {
  const { appTheme } = useThemeContext();

  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const [selectedMessage, setSelectedMessage] = useState<Message>({} as Message);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const currentTicketId = useRef(ticketId);
  const shouldScrollRef = useRef<"smooth" | "auto" | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const [participants, setParticipants] = useState<Array<{ number: string; name?: string }>>([]);
  const groupColorCacheRef = useRef(new Map<string, string>());

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    currentTicketId.current = ticketId;
  }, [ticketId]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      scrollToBottom(shouldScrollRef.current === "smooth" ? "smooth" : "auto");
      shouldScrollRef.current = null;
    }
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
    socket.on("appMessage", (data: { action: string; message: Message }) => {
      if (data.action === "create") {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        shouldScrollRef.current = "smooth";
      }
      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }
    });
    return () => { socket.disconnect(); };
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  const loadMore = () => setPageNumber((prev) => prev + 1);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (pageNumber > 1) return;
    setTimeout(() => {
      lastMessageRef.current?.scrollIntoView({ behavior });
    }, 100);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && messagesListRef.current) {
      messagesListRef.current.scrollTop = 1;
    }
    if (loading) return;
    if (scrollTop < 50) loadMore();
  };

  const handleOpenMessageOptionsMenu = (e: React.MouseEvent<HTMLButtonElement>, message: Message) => {
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
      await api.post(`/tickets/${ticketId}/history`, { fromDate: historyFromDate });
      toast.success("Buscando histórico de mensagens...");
      setHistoryModalOpen(false);
      setHistoryFromDate("");
    } catch (err) {
      toastError(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getParticipantColor = (message: Message): string => {
    const participantId =
      (message.participant as string) ||
      (parseData(message.dataJson).participant as string) ||
      "unknown";
    if (!groupColorCacheRef.current.has(participantId)) {
      const color = PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
      groupColorCacheRef.current.set(participantId, color);
    }
    return groupColorCacheRef.current.get(participantId)!;
  };

  const getSenderKey = (m: Message | undefined): string => {
    if (!m) return "unknown";
    if (m.fromMe) return "me";
    if (isGroup) {
      const d = parseData(m.dataJson);
      return (
        (m.participant as string) ||
        (d.participant as string) ||
        (d.senderLid as string) ||
        (d.pushName as string) ||
        "unknown"
      );
    }
    return "other";
  };

  const getMessageBody = (message: Message | QuotedMsg): string => {
    if (message.mediaType === "location") return "Localização";
    if (message.mediaType === "vcard") return "Contato";
    if (message.mediaType === "carousel") return "Carrossel";
    return message.body ?? "";
  };

  const getFileNameFromUrl = (url?: string): string => {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf("/") + 1);
    } catch {
      return url;
    }
  };

  // ── Renders ───────────────────────────────────────────────────────────────

  const mentionsMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    messagesList.forEach((msg) => {
      let number: string | null = null;
      let pushName: string | null = null;
      if (msg.participant) {
        number = (msg.participant as string).replace(/\D/g, "");
        try {
          const data = parseData(msg.dataJson);
          pushName = data.pushName as string | null;
        } catch { /* invalid dataJson */ }
      }
      if (msg.contact) {
        if (!number) number = msg.contact.number ?? null;
        if (!pushName) pushName = msg.contact.name ?? null;
      }
      if (number && pushName) map[number] = pushName;
    });
    participants.forEach((p) => {
      if (p.number && p.name) {
        const number = p.number.replace(/\D/g, "");
        if (!map[number]) map[number] = p.name;
      }
    });
    return map;
  }, [messagesList, participants]);

  const checkMessageMedia = (message: Message) => {
    if (message.mediaType === "location" && message.body.split("|").length >= 2) {
      const [imageLocation, linkLocation, descriptionLocation] = message.body.split("|");
      return (
        <LocationPreview
          image={imageLocation}
          link={linkLocation}
          description={descriptionLocation ?? null}
        />
      );
    }
    if (message.mediaType === "vcard") {
      const array = message.body.split("\n");
      const obj: { number: string }[] = [];
      let contact = "";
      for (let i = 0; i < array.length; i++) {
        const values = array[i].split(":");
        for (let j = 0; j < values.length; j++) {
          if (values[j].indexOf("+") !== -1) obj.push({ number: values[j] });
          if (values[j].indexOf("FN") !== -1) contact = values[j + 1];
        }
      }
      return <VcardPreview contact={contact} numbers={obj[0]?.number} />;
    }
    if (message.mediaType === "image" || message.mediaType === "sticker") {
      return <ModalImageCors imageUrl={getBackendUrl(message.mediaUrl)} />;
    }
    if (message.mediaType === "audio") {
      return <Audio url={getBackendUrl(message.mediaUrl)} />;
    }
    if (message.mediaType === "video") {
      return (
        <div className="relative w-full max-w-[300px] rounded-lg overflow-hidden">
          <video
            src={getBackendUrl(message.mediaUrl)}
            controls
            className="w-full h-auto max-h-[300px] object-contain bg-[var(--bg-surface)]"
          />
        </div>
      );
    }
    if (message.mediaType === "carousel") {
      const data = parseData(message.dataJson);
      if (data?.cards && Array.isArray(data.cards)) {
        return (
          <div className="flex overflow-x-auto max-w-[350px] gap-2.5 pb-2.5 pt-1.5">
            {(data.cards as Array<{
              headerUrl?: string;
              title?: string;
              body?: string;
              buttons?: Array<{ text?: string; url?: string }>;
            }>).map((card, idx) => (
              <div
                key={idx}
                className="min-w-[220px] bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden shadow-sm"
              >
                {card.headerUrl && (
                  <img src={card.headerUrl} className="w-full h-[120px] object-cover" alt={card.title} />
                )}
                <div className="p-2">
                  <div className="font-bold text-[13px] mb-1">{card.title}</div>
                  <div className="text-xs text-[var(--message-quote-text)] whitespace-pre-wrap">{card.body}</div>
                </div>
                {card.buttons && card.buttons.length > 0 && (
                  <div className="border-t border-[var(--border-default)] p-1.5">
                    {card.buttons.map((btn, bIdx) => (
                      <div
                        key={bIdx}
                        className="text-xs text-center text-[var(--action-primary)] py-1 cursor-pointer"
                        onClick={() => btn.url && window.open(btn.url, "_blank")}
                      >
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      return null;
    }
    return <FilePreview mediaUrl={getBackendUrl(message.mediaUrl)} filename={message.body} />;
  };

  const renderMessageAck = (message: Message) => {
    if (isGroup) return null;
    if (message.ack === 0) return <Clock className="inline h-[18px] w-[18px] align-middle ml-1" />;
    if (message.ack === 1) return <Check className="inline h-[18px] w-[18px] align-middle ml-1" />;
    if (message.ack === 2) return <CheckCheck className="inline h-[18px] w-[18px] align-middle ml-1" />;
    if (message.ack === 3 || message.ack === 4)
      return <CheckCheck className="inline h-[18px] w-[18px] align-middle ml-1 text-[var(--action-primary)]" />;
    if (message.ack === 5)
      return <AlertCircle className="inline h-[18px] w-[18px] align-middle ml-1 text-[var(--message-error-text)]" />;
    return null;
  };

  const renderDailyTimestamps = (message: Message, index: number) => {
    if (!isDateValid(message.createdAt)) return null;
    const showTimestamp =
      index === 0 ||
      !isDateValid(messagesList[index - 1]?.createdAt) ||
      !isSameDay(parseISO(messagesList[index].createdAt), parseISO(messagesList[index - 1].createdAt));

    if (!showTimestamp) return null;

    return (
      <span
        key={`timestamp-${message.id}`}
        className="self-center w-[110px] text-center bg-[var(--message-daily-bg)] mx-2.5 my-2.5 rounded-[10px] shadow-sm"
      >
        <div className="text-[var(--message-daily-text)] p-2 self-center ml-0">
          {format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
        </div>
      </span>
    );
  };

  const renderMessageTimestamp = (message: Message) => {
    if (!isDateValid(message.createdAt)) return null;
    return (
      <span className="text-[11px] absolute bottom-0 right-1.5 text-[var(--message-timestamp-text)]">
        {format(parseISO(message.createdAt), "HH:mm")}
        {renderMessageAck(message)}
      </span>
    );
  };

  const renderSenderName = (message: Message) => {
    if (!isGroup || message.fromMe) return null;
    const data = parseData(message.dataJson);
    const pushName = data.pushName as string | undefined;
    const participantNumber = message.participant
      ? (message.participant as string).replace(/\D/g, "")
      : undefined;
    const displayName = pushName || participantNumber || "Unknown";
    const color = getParticipantColor(message);
    return (
      <span className="flex font-medium" style={{ color }}>
        {displayName}
      </span>
    );
  };

  const renderQuotedMessage = (message: Message) => {
    if (!message.quotedMsg) return null;
    const quoted = message.quotedMsg;

    const getQuotedSenderName = (): string | undefined => {
      const contact = quoted.contact;
      if (isGroup && contact?.isGroup && quoted.participant) {
        const d = parseData(quoted.dataJson);
        if (d?.pushName) return d.pushName as string;
        return (quoted.participant as string).replace("@s.whatsapp.net", "");
      }
      return contact?.name;
    };

    let pushName: string | null = null;
    let participantNumber: string | null = null;
    if (quoted.dataJson) {
      try {
        const data = parseData(quoted.dataJson);
        pushName = data.pushName as string | null;
      } catch { /* invalid dataJson */ }
    }
    if (quoted.participant) {
      participantNumber = (quoted.participant as string).replace(/\D/g, "");
    }
    const quotedSender = pushName
      ? `~${pushName}`
      : participantNumber
      ? `~${participantNumber}`
      : getQuotedSenderName();

    return (
      <div
        className={clsx(
          "-mt-0.5 -mr-20 mb-1.5 -ml-1.5 overflow-hidden bg-[var(--message-quote-bg)] rounded-[7.5px] flex relative",
          { "-mr-20": !message.fromMe, "overflow-y-hidden": message.fromMe }
        )}
      >
        <span
          className={clsx("flex-none w-1", {
            "bg-[var(--message-quote-side-left)]": !quoted.fromMe,
            "bg-[var(--message-quote-side-right)]": quoted.fromMe,
          })}
        />
        <div className="p-2.5 max-w-[300px] h-auto whitespace-pre-wrap">
          {!quoted.fromMe && (
            <span className="flex text-[var(--message-quote-side-left)] font-medium">
              {quotedSender}
            </span>
          )}
          {getMessageBody(quoted)}
        </div>
      </div>
    );
  };

  const renderMessageReactions = (message: Message) => {
    let reactions = message.reactions;
    if (typeof reactions === "string") {
      try { reactions = JSON.parse(reactions); } catch { reactions = []; }
    }
    if (!Array.isArray(reactions) || reactions.length === 0) return null;

    const aggregated = reactions.reduce<Array<{ emoji: string; count: number }>>((acc, curr) => {
      const emoji = curr.text || curr.emoji;
      if (!emoji) return acc;
      const existing = acc.find((r) => r.emoji === emoji);
      if (existing) existing.count++;
      else acc.push({ emoji, count: 1 });
      return acc;
    }, []);

    return (
      <div className="absolute -bottom-2.5 left-2.5 bg-[var(--message-reaction-bg)] rounded-xl px-1.5 py-0.5 shadow-md text-xs flex items-center z-20 cursor-pointer border border-[var(--message-reaction-border)]">
        {aggregated.map((reaction, index) => (
          <span key={index} className="mr-1">
            {reaction.emoji} {reaction.count > 1 ? reaction.count : ""}
          </span>
        ))}
      </div>
    );
  };

  const renderUrlPreview = (message: Message) => {
    const data = parseData(message.dataJson);
    if (!data?.preview) return null;
    const preview = data.preview as {
      url?: string;
      image?: string;
      title?: string;
      description?: string;
    };
    return (
      <div
        className="mt-1.5 mb-1.5 bg-[var(--bg-surface-alt)] rounded-lg overflow-hidden max-w-[300px] border border-[var(--border-default)] cursor-pointer"
        onClick={() => preview.url && window.open(preview.url, "_blank")}
      >
        {preview.image && (
          <img src={preview.image} alt={preview.title} className="w-full h-[150px] object-cover" />
        )}
        <div className="p-2.5">
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold no-underline text-inherit block mb-1 text-sm"
          >
            {preview.title}
          </a>
          <p className="text-xs text-[var(--message-quote-text)] m-0 line-clamp-3">
            {preview.description}
          </p>
        </div>
      </div>
    );
  };

  const renderDeletedMessage = (message: Message) => {
    if (!message.isDeleted) return null;
    const data = parseData(message.dataJson);
    const deletedBy = data?.deletedBy as string | undefined;
    return (
      <div className="text-[13px] text-[var(--text-muted)] italic mb-1.5">
        <Ban className="inline h-4 w-4 mr-1.5 align-bottom" />
        {deletedBy ? `Mensagem apagada por: ${deletedBy}` : "Mensagem apagada"}
      </div>
    );
  };

  const renderMessages = () => {
    if (messagesList.length === 0) {
      return <div>Say hello to your new contact!</div>;
    }

    return messagesList.map((message, index) => {
      const currentSenderKey = getSenderKey(message);
      const previousSenderKey = index > 0 ? getSenderKey(messagesList[index - 1]) : null;
      const isSameSender = currentSenderKey === previousSenderKey;
      const isSameDayMsg =
        index > 0 &&
        isDateValid(message.createdAt) &&
        isDateValid(messagesList[index - 1]?.createdAt) &&
        isSameDay(parseISO(message.createdAt), parseISO(messagesList[index - 1].createdAt));
      const showGroupInfo = !isSameSender || !isSameDayMsg;

      const marginTop = showGroupInfo ? 10 : 2;
      const isMedia =
        message.mediaUrl ||
        message.mediaType === "image" ||
        message.mediaType === "video" ||
        message.mediaType === "location";
      const maxW = isMedia ? 332 : 600;

      // Sender divider spacer
      const senderDivider =
        index > 0 && currentSenderKey !== previousSenderKey ? (
          <span key={`divider-${message.id}`} className="block h-7 clear-both" />
        ) : null;

      if (!message.fromMe) {
        return (
          <React.Fragment key={message.id}>
            {renderDailyTimestamps(message, index)}
            {senderDivider}
            <div className={isGroup ? "flex items-start gap-2" : undefined}>
              {isGroup &&
                (showGroupInfo ? (
                  <Avatar
                    className="w-8 h-8 mt-0.5 shrink-0"
                    src={getBackendUrl(
                      (parseData(message.dataJson).profilePicUrl as string) || ""
                    )}
                    name={message.contact?.name}
                  />
                ) : (
                  <div className="w-8 h-8 shrink-0" />
                ))}
              <div
                className={clsx(
                  "mt-0.5 mb-3.5 min-w-[100px] h-auto flex flex-col w-fit relative",
                  "whitespace-pre-wrap self-start",
                  "pl-1.5 pr-1.5 pt-1.5 pb-0",
                  appTheme === "saas"
                    ? "bg-[var(--message-saas-bg-alt)] text-[var(--message-left-text)] rounded-tl-xl rounded-tr-xl rounded-bl-none rounded-br-xl border border-[var(--border-default)]"
                    : "bg-[var(--message-left-bg)] text-[var(--message-left-text)] rounded-tl-none rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm",
                  "group"
                )}
                style={{ marginTop, maxWidth: maxW }}
              >
                <button
                  type="button"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className="hidden group-hover:flex absolute top-0 right-0 p-0.5 rounded opacity-90 bg-inherit text-[var(--message-ack-text)] z-10 hover:bg-black/10 transition-colors"
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                  aria-label="Opções da mensagem"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showGroupInfo && renderSenderName(message)}
                {(message.mediaUrl ||
                  message.mediaType === "location" ||
                  message.mediaType === "vcard") &&
                  checkMessageMedia(message)}
                <div
                  className={clsx(
                    "overflow-wrap-break-word pt-0.5 pb-1.5 pl-1.5",
                    message.isDeleted
                      ? "italic text-[var(--text-muted)] pr-20"
                      : "pr-20"
                  )}
                >
                  {renderDeletedMessage(message)}
                  {message.quotedMsg && renderQuotedMessage(message)}
                  {renderUrlPreview(message)}
                  {!(message.mediaUrl && getFileNameFromUrl(message.mediaUrl) === message.body) && (
                    <MarkdownWrapper mentionsMap={mentionsMap}>{getMessageBody(message)}</MarkdownWrapper>
                  )}
                  {renderMessageTimestamp(message)}
                </div>
                {renderMessageReactions(message)}
              </div>
            </div>
          </React.Fragment>
        );
      } else {
        return (
          <React.Fragment key={message.id}>
            {renderDailyTimestamps(message, index)}
            {senderDivider}
            <div
              className={clsx(
                "ml-auto mt-1.5 mb-3.5 min-w-[100px] h-auto flex flex-col w-fit relative",
                "whitespace-pre-wrap self-end",
                "pl-1.5 pr-1.5 pt-1.5 pb-0",
                appTheme === "saas"
                  ? "bg-[var(--message-saas-bg)] text-[var(--message-saas-text)] rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-none"
                  : "bg-[var(--message-right-bg)] text-[var(--message-right-text)] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none shadow-sm",
                "group"
              )}
              style={{ marginTop, maxWidth: maxW }}
            >
              <button
                type="button"
                id="messageActionsButton"
                disabled={message.isDeleted}
                className="hidden group-hover:flex absolute top-0 right-0 p-0.5 rounded opacity-90 bg-inherit text-[var(--message-ack-text)] z-10 hover:bg-black/10 transition-colors"
                onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                aria-label="Opções da mensagem"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {(message.mediaUrl ||
                message.mediaType === "location" ||
                message.mediaType === "vcard" ||
                message.mediaType === "carousel") &&
                checkMessageMedia(message)}
              <div
                className={clsx(
                  "overflow-wrap-break-word pt-0.5 pb-1.5 pl-1.5",
                  message.isDeleted ? "italic text-[var(--text-muted)] pr-20" : "pr-20"
                )}
              >
                {renderDeletedMessage(message)}
                {message.quotedMsg && renderQuotedMessage(message)}
                {renderUrlPreview(message)}
                {!(message.mediaUrl && getFileNameFromUrl(message.mediaUrl) === message.body) && (
                  <MarkdownWrapper mentionsMap={mentionsMap}>{getMessageBody(message)}</MarkdownWrapper>
                )}
                {renderMessageTimestamp(message)}
              </div>
              {renderMessageReactions(message)}
            </div>
          </React.Fragment>
        );
      }
    });
  };

  return (
    <div className="overflow-hidden relative flex flex-col flex-grow">
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />

      {/* History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Buscar Histórico de Mensagens</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="history-date">Data de início</Label>
            <Input
              id="history-date"
              type="date"
              value={historyFromDate}
              onChange={(e) => setHistoryFromDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Selecione a data a partir da qual deseja buscar as mensagens
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSyncHistory}
              disabled={historyLoading || !historyFromDate}
            >
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Buscar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating history button */}
      <button
        type="button"
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--bg-surface-alt)] transition-colors"
        onClick={() => setHistoryModalOpen(true)}
        title="Buscar histórico"
        aria-label="Buscar histórico"
      >
        <History className="h-4 w-4 text-[var(--text-muted)]" />
      </button>

      <div
        id="messagesList"
        className="flex flex-col flex-grow p-5 overflow-y-scroll sm:pb-5 pb-[90px]"
        style={{ backgroundImage: `url(${whatsBackground})` }}
        onScroll={handleScroll}
        ref={messagesListRef}
      >
        {messagesList.length > 0 ? renderMessages() : []}
        <div ref={lastMessageRef} />
      </div>

      {loading && (
        <div>
          <Loader2 className="absolute top-3 left-1/2 -ml-3 h-6 w-6 animate-spin text-[var(--status-success)] opacity-70" />
        </div>
      )}
    </div>
  );
};

export default MessagesList;
