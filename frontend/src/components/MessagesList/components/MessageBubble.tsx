import React, { useCallback } from "react";
import { isSameDay, parseISO } from "date-fns";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import api from "../../../services/api";

import MarkdownWrapper from "../../MarkdownWrapper";
import { Avatar } from "../../ui/avatar";
import { getBackendUrl } from "../../../helpers/urlUtils";

import {
  getSenderKey,
  getMessageBody,
  getFileNameFromUrl,
  isDateValid,
  parseData,
} from "../utils/messageHelpers";
import { Message } from "../types";
import { getContactDisplayName } from "../../../utils/clientDisplayName";
import MessageMedia from "./MessageMedia";
import QuotedMessage from "./QuotedMessage";

// Renders a media bubble when the message has stored media OR is a media type
// that renders without a URL: location/vcard/carousel (body-driven) and the
// downloadable types whose blurred placeholder shows before download.
const MEDIA_BUBBLE_TYPES = [
  "image",
  "video",
  "audio",
  "document",
  "sticker",
  "location",
  "vcard",
  "carousel",
];
const hasMediaBubble = (m: Message): boolean =>
  !!m.mediaUrl || MEDIA_BUBBLE_TYPES.includes(m.mediaType ?? "");
import MessageReactions from "./MessageReactions";
import MessageInteractive from "./MessageInteractive";
import MessageMetadata from "./MessageMetadata";
import LinkPreview from "./LinkPreview";
import DailyTimestamp from "./DailyTimestamp";
import SenderName from "./SenderName";
import DeletedMessage from "./DeletedMessage";

interface MessageBubbleProps {
  message: Message;
  index: number;
  messagesList: Message[];
  isGroup?: boolean;
  appTheme: string;
  mentionsMap: Record<string, string>;
  colorCache: Map<string, string>;
  onOpenOptions: (
    e: React.MouseEvent<HTMLButtonElement>,
    message: Message
  ) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  index,
  messagesList,
  isGroup,
  appTheme,
  mentionsMap,
  colorCache,
  onOpenOptions,
}) => {
  const handleRetry = useCallback(async () => {
    const ticketId = (message as Record<string, unknown>).ticketId;
    if (!ticketId) return;
    try {
      await api.post(`/messages/${ticketId}`, { body: message.body, fromMe: true });
    } catch {
      // silent — ack will update via SSE
    }
  }, [message]);

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
      <span className="block h-7 clear-both" />
    ) : null;

  const actionsButton = (
    <button
      type="button"
      id="messageActionsButton"
      disabled={message.isDeleted}
      className="hidden group-hover:flex absolute top-0 right-0 p-0.5 rounded opacity-90 bg-inherit text-[hsl(var(--message-ack-text))] z-10 hover:bg-black/10 transition-colors"
      onClick={(e) => onOpenOptions(e, message)}
      aria-label="Opções da mensagem"
    >
      <ChevronDown className="h-4 w-4" />
    </button>
  );

  const bodyContent = (
    <div
      className={clsx(
        "overflow-wrap-break-word pt-0.5 pb-1.5 pl-1.5",
        message.isDeleted ? "italic text-[var(--text-muted)] pr-20" : "pr-20"
      )}
    >
      <DeletedMessage message={message} />
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
      <MessageMetadata message={message} isGroup={isGroup} onRetry={message.ack === 5 ? handleRetry : undefined} />
    </div>
  );

  if (!message.fromMe) {
    return (
      <React.Fragment>
        <DailyTimestamp
          message={message}
          index={index}
          messagesList={messagesList}
        />
        {senderDivider}
        <div className={isGroup ? "flex items-start gap-2" : undefined}>
          {isGroup &&
            (showGroupInfo ? (
              <Avatar
                className="w-8 h-8 mt-0.5 shrink-0"
                src={getBackendUrl(
                  (parseData(message.dataJson).senderPicUrl as string) || ""
                )}
                name={
                  getContactDisplayName(message.contact) ||
                  (parseData(message.dataJson).pushName as string) ||
                  message.participant?.replace(/\D/g, "") ||
                  undefined
                }
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
            {actionsButton}
            {showGroupInfo && (
              <SenderName
                message={message}
                isGroup={isGroup}
                colorCache={colorCache}
              />
            )}
            {hasMediaBubble(message) && <MessageMedia message={message} />}
            {bodyContent}
            <MessageInteractive message={message} />
            <MessageReactions message={message} />
          </div>
        </div>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <DailyTimestamp
        message={message}
        index={index}
        messagesList={messagesList}
      />
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
        {actionsButton}
        {hasMediaBubble(message) && <MessageMedia message={message} />}
        {bodyContent}
        <MessageInteractive message={message} />
        <MessageReactions message={message} />
      </div>
    </React.Fragment>
  );
};

export default MessageBubble;
