/* @jsxImportSource react */
import React from "react";
import { isSameDay, parseISO, format } from "date-fns";
import clsx from "clsx";
import { ChevronDown, History, Ban, Loader2 } from "lucide-react";

import MarkdownWrapper from "../MarkdownWrapper";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";

import { useThemeContext } from "../../context/DarkMode";
import { getBackendUrl } from "../../helpers/urlUtils";
import { Avatar } from "../ui/avatar";

import { useMessagesList } from "./hooks/useMessagesList";
import {
  parseData,
  isDateValid,
  getSenderKey,
  getMessageBody,
  getFileNameFromUrl,
  PARTICIPANT_COLORS,
} from "./utils/messageHelpers";
import MessageMedia from "./components/MessageMedia";
import QuotedMessage from "./components/QuotedMessage";
import MessageReactions from "./components/MessageReactions";
import MessageMetadata from "./components/MessageMetadata";
import LinkPreview from "./components/LinkPreview";
import HistorySyncModal from "./components/HistorySyncModal";
import { Message } from "./types";

interface MessagesListProps {
  ticketId: string | number;
  isGroup?: boolean;
}

const MessagesList: React.FC<MessagesListProps> = ({ ticketId, isGroup }) => {
  const { appTheme } = useThemeContext();

  const {
    messagesList,
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
    handleScroll,
    handleOpenMessageOptionsMenu,
    handleCloseMessageOptionsMenu,
    handleSyncHistory,
  } = useMessagesList(ticketId, isGroup);

  // ── Derived ──────────────────────────────────────────────────────────────

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
        const number = p.number.replace(/\D/g, "");
        if (!map[number]) map[number] = p.name;
      }
    });
    return map;
  }, [messagesList, participants]);

  const getParticipantColor = (message: Message): string => {
    const cache = groupColorCacheRef.current;
    if (!cache) return PARTICIPANT_COLORS[0];
    const participantId =
      (message.participant as string) ||
      (parseData(message.dataJson).participant as string) ||
      "unknown";
    if (!cache.has(participantId)) {
      const color =
        PARTICIPANT_COLORS[
          Math.floor(Math.random() * PARTICIPANT_COLORS.length)
        ];
      cache.set(participantId, color);
    }
    return cache.get(participantId)!;
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderDailyTimestamps = (message: Message, index: number) => {
    if (!isDateValid(message.createdAt)) return null;
    const showTimestamp =
      index === 0 ||
      !isDateValid(messagesList[index - 1]?.createdAt) ||
      !isSameDay(
        parseISO(messagesList[index].createdAt),
        parseISO(messagesList[index - 1].createdAt)
      );
    if (!showTimestamp) return null;
    return (
      <span
        key={`timestamp-${message.id}`}
        className="self-center w-[110px] text-center bg-[hsl(var(--message-daily-bg))] mx-2.5 my-2.5 rounded-[10px] shadow-sm"
      >
        <div className="text-[hsl(var(--message-daily-text))] p-2 self-center ml-0">
          {format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
        </div>
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

  const renderDeletedMessage = (message: Message) => {
    if (!message.isDeleted) return null;
    const data = parseData(message.dataJson);
    const deletedBy = data?.deletedBy as string | undefined;
    return (
      <div className="text-[13px] text-[var(--text-muted)] italic mb-1.5">
        <Ban className="inline h-4 w-4 mr-1.5 align-bottom" />
        {deletedBy
          ? `Mensagem apagada por: ${deletedBy}`
          : "Mensagem apagada"}
      </div>
    );
  };

  const renderMessages = () => {
    if (messagesList.length === 0) {
      return <div>Say hello to your new contact!</div>;
    }

    return messagesList.map((message, index) => {
      const currentSenderKey = getSenderKey(message, isGroup);
      const previousSenderKey =
        index > 0 ? getSenderKey(messagesList[index - 1], isGroup) : null;
      const isSameSender = currentSenderKey === previousSenderKey;
      const isSameDayMsg =
        index > 0 &&
        isDateValid(message.createdAt) &&
        isDateValid(messagesList[index - 1]?.createdAt) &&
        isSameDay(
          parseISO(message.createdAt),
          parseISO(messagesList[index - 1].createdAt)
        );
      const showGroupInfo = !isSameSender || !isSameDayMsg;
      const marginTop = showGroupInfo ? 10 : 2;
      const isMedia =
        message.mediaUrl ||
        message.mediaType === "image" ||
        message.mediaType === "video" ||
        message.mediaType === "location";
      const maxW = isMedia ? 332 : 600;
      const senderDivider =
        index > 0 && currentSenderKey !== previousSenderKey ? (
          <span
            key={`divider-${message.id}`}
            className="block h-7 clear-both"
          />
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
                      (parseData(message.dataJson).profilePicUrl as string) ||
                        ""
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
                    ? "bg-[hsl(var(--message-saas-bg-alt))] text-[hsl(var(--message-left-text))] rounded-tl-xl rounded-tr-xl rounded-bl-none rounded-br-xl border border-[var(--border-default)]"
                    : "bg-[hsl(var(--message-left-bg))] text-[hsl(var(--message-left-text))] rounded-tl-none rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm",
                  "group"
                )}
                style={{ marginTop, maxWidth: maxW }}
              >
                <button
                  type="button"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className="hidden group-hover:flex absolute top-0 right-0 p-0.5 rounded opacity-90 bg-inherit text-[hsl(var(--message-ack-text))] z-10 hover:bg-black/10 transition-colors"
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                  aria-label="Opções da mensagem"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showGroupInfo && renderSenderName(message)}
                {(message.mediaUrl ||
                  message.mediaType === "location" ||
                  message.mediaType === "vcard") && (
                  <MessageMedia message={message} />
                )}
                <div
                  className={clsx(
                    "overflow-wrap-break-word pt-0.5 pb-1.5 pl-1.5",
                    message.isDeleted
                      ? "italic text-[var(--text-muted)] pr-20"
                      : "pr-20"
                  )}
                >
                  {renderDeletedMessage(message)}
                  {message.quotedMsg && (
                    <QuotedMessage message={message} isGroup={isGroup} />
                  )}
                  <LinkPreview message={message} />
                  {!(
                    message.mediaUrl &&
                    getFileNameFromUrl(message.mediaUrl) === message.body
                  ) && (
                    <MarkdownWrapper mentionsMap={mentionsMap}>
                      {getMessageBody(message)}
                    </MarkdownWrapper>
                  )}
                  <MessageMetadata message={message} isGroup={isGroup} />
                </div>
                <MessageReactions message={message} />
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
                  ? "bg-[hsl(var(--message-saas-bg))] text-[hsl(var(--message-saas-text))] rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-none"
                  : "bg-[hsl(var(--message-right-bg))] text-[hsl(var(--message-right-text))] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none shadow-sm",
                "group"
              )}
              style={{ marginTop, maxWidth: maxW }}
            >
              <button
                type="button"
                id="messageActionsButton"
                disabled={message.isDeleted}
                className="hidden group-hover:flex absolute top-0 right-0 p-0.5 rounded opacity-90 bg-inherit text-[hsl(var(--message-ack-text))] z-10 hover:bg-black/10 transition-colors"
                onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                aria-label="Opções da mensagem"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {(message.mediaUrl ||
                message.mediaType === "location" ||
                message.mediaType === "vcard" ||
                message.mediaType === "carousel") && (
                <MessageMedia message={message} />
              )}
              <div
                className={clsx(
                  "overflow-wrap-break-word pt-0.5 pb-1.5 pl-1.5",
                  message.isDeleted
                    ? "italic text-[var(--text-muted)] pr-20"
                    : "pr-20"
                )}
              >
                {renderDeletedMessage(message)}
                {message.quotedMsg && (
                  <QuotedMessage message={message} isGroup={isGroup} />
                )}
                <LinkPreview message={message} />
                {!(
                  message.mediaUrl &&
                  getFileNameFromUrl(message.mediaUrl) === message.body
                ) && (
                  <MarkdownWrapper mentionsMap={mentionsMap}>
                    {getMessageBody(message)}
                  </MarkdownWrapper>
                )}
                <MessageMetadata message={message} isGroup={isGroup} />
              </div>
              <MessageReactions message={message} />
            </div>
          </React.Fragment>
        );
      }
    });
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />

      <HistorySyncModal
        open={historyModalOpen}
        fromDate={historyFromDate}
        loading={historyLoading}
        onOpenChange={setHistoryModalOpen}
        onFromDateChange={setHistoryFromDate}
        onSync={handleSyncHistory}
      />

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
        className="flex flex-col flex-1 min-h-0 p-5 overflow-y-auto sm:pb-5 pb-[90px]"
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
