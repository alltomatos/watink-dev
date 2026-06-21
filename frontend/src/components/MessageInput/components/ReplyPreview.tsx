import React from "react";
import clsx from "clsx";
import { X } from "lucide-react";

interface ReplyPreviewProps {
  message: Record<string, unknown>;
  loading: boolean;
  ticketStatus: string;
  onCancel: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ message, loading, ticketStatus, onCancel }) => {
  const fromMe = message.fromMe as boolean;
  const body = message.body as string;
  const dataJson = message.dataJson as string | object | undefined;
  const participant = message.participant as string | undefined;
  const contact = message.contact as { name?: string } | undefined;

  let pushName: string | null = null;
  let participantNumber: string | null = null;

  if (dataJson) {
    try {
      const data = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
      pushName = (data as Record<string, unknown>).pushName as string | null;
    } catch {
      /* invalid dataJson */
    }
  }

  if (participant) {
    participantNumber = (participant as string).replace(/\D/g, "");
  }

  const senderName = pushName
    ? `~${pushName}`
    : participantNumber
    ? `~${participantNumber}`
    : contact?.name;

  return (
    <div className="flex w-full items-center justify-center pt-2 pl-[73px] pr-[7px]">
      <div className="flex-1 mr-1.5 overflow-y-hidden bg-[var(--border-subtle)] rounded-[7.5px] flex relative">
        <span
          className={clsx("flex-none w-1", {
            "bg-[var(--message-quote-side-left)]": !fromMe,
            "bg-[var(--message-quote-side-right)]": fromMe,
          })}
        />
        <div className="p-2.5 h-auto block whitespace-pre-wrap overflow-hidden">
          {!fromMe && (
            <span className="flex text-[var(--message-quote-side-right)] font-medium">
              {senderName}
            </span>
          )}
          {body}
        </div>
      </div>
      <button
        type="button"
        className="p-1 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
        disabled={loading || ticketStatus !== "open"}
        onClick={onCancel}
        aria-label="Cancelar resposta"
      >
        <X className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  );
};

export default ReplyPreview;
