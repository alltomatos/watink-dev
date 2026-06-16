import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import { getBackendUrl } from "../../helpers/urlUtils";

interface Queue {
  color?: string;
}

interface WhatsApp {
  name?: string;
  status?: string;
}

interface Contact {
  id?: number;
  name: string;
  profilePicUrl?: string | null;
  isGroup?: boolean;
  number?: string;
}

interface Ticket {
  id: number;
  status: "open" | "closed" | "pending";
  updatedAt: string;
  lastMessage?: string;
  unreadMessages: number;
  isGroup?: boolean;
  whatsappId?: number;
  contact: Contact;
  queue?: Queue;
  whatsapp?: WhatsApp;
}

interface TicketListItemProps {
  ticket: Ticket;
}

const TicketListItem: React.FC<TicketListItemProps> = ({ ticket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { ticketId } = useParams<{ ticketId: string }>();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAcceptTicket = async (id: number) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    navigate(`/tickets/${id}`);
  };

  const handleSelectTicket = (id: number) => {
    navigate(`/tickets/${id}`);
  };

  const isSelected = ticketId !== undefined && +ticketId === ticket.id;
  const isPending =
    ticket.status === "pending" &&
    !ticket.isGroup &&
    !ticket.contact?.isGroup;

  const updatedAt = parseISO(ticket.updatedAt);
  const timeLabel = isSameDay(updatedAt, new Date())
    ? format(updatedAt, "HH:mm")
    : format(updatedAt, "dd/MM");

  return (
    <div
      onClick={() => {
        if (isPending) return;
        handleSelectTicket(ticket.id);
      }}
      className={cn(
        "relative mx-3 mb-2 flex cursor-pointer gap-3 rounded-xl",
        "border border-[var(--border-subtle)] bg-[var(--bg-surface)]",
        "px-4 py-3",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "hover:-translate-y-px hover:border-[var(--border-default)]",
        "hover:shadow-[0_4px_6px_-1px_var(--border-subtle),0_2px_4px_-1px_var(--border-weak)]",
        isSelected && [
          "border-[var(--action-primary)]",
          "bg-[var(--action-primary-bg)]",
          "shadow-[0_0_0_1px_var(--action-primary)]",
          "hover:border-[var(--action-primary)]",
          "hover:shadow-[0_0_0_1px_var(--action-primary)]",
        ]
      )}
    >
      {/* Queue colour indicator */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-sm"
        style={{
          backgroundColor: ticket.queue?.color ?? "var(--border-default)",
        }}
      />

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar
          src={
            ticket.contact?.profilePicUrl
              ? getBackendUrl(ticket.contact.profilePicUrl)
              : null
          }
          name={ticket.contact.name}
          size="md"
          className="rounded-[10px]"
          aria-label={ticket.contact.name}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {/* Row 1 — name + time */}
        <div className="flex items-baseline justify-between">
          <span className="truncate text-[0.9375rem] font-semibold leading-tight text-[var(--text-primary)]">
            {ticket.contact.name}
          </span>

          {(ticket.lastMessage || ticket.isGroup || ticket.contact?.isGroup) && (
            <span className="ml-2 shrink-0 text-xs font-medium text-[var(--text-muted)]">
              {timeLabel}
            </span>
          )}
        </div>

        {/* Row 2 — last message + unread badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[0.8125rem] leading-5 text-[var(--text-secondary)]">
            {ticket.lastMessage ? (
              <MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
            ) : (
              <span>Sem mensagens</span>
            )}
          </span>

          {ticket.unreadMessages > 0 && (
            <Badge
              className={cn(
                "ml-auto min-w-[18px] shrink-0 justify-center",
                "rounded-md px-1.5 py-0.5 text-[0.7rem] font-bold",
                "border-transparent bg-[var(--action-primary)] text-[var(--bg-surface)]",
                "hover:bg-[var(--action-primary)]"
              )}
            >
              {ticket.unreadMessages}
            </Badge>
          )}
        </div>

        {/* Row 3 — connection tag */}
        {ticket.whatsappId && (
          <span
            className={cn(
              "mt-1 self-start rounded px-1.5 py-px",
              "text-[0.6875rem] font-semibold",
              "bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]"
            )}
          >
            {ticket.whatsapp?.name}
          </span>
        )}

        {/* Accept button — pending non-group tickets only */}
        {isPending && (
          <div className="mt-2">
            <ButtonWithSpinner
              size="small"
              loading={loading}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold normal-case",
                "bg-[var(--text-primary)] text-[var(--bg-surface)]",
                "hover:bg-[var(--text-secondary)]"
              )}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleAcceptTicket(ticket.id);
              }}
            >
              {i18n.t("ticketsList.buttons.accept")}
            </ButtonWithSpinner>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketListItem;
