import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import { Users, Building2, Radio } from "lucide-react";

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
  isCommunity?: boolean;
  isSubGroup?: boolean;
  isNewsletter?: boolean;
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

  const handlePeekTicket = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    navigate(`/tickets/${id}`);
  };

  const isSelected = ticketId !== undefined && +ticketId === ticket.id;
  const isPending =
    ticket.status === "pending" &&
    !ticket.isGroup &&
    !ticket.contact?.isGroup;

  // Tipo de conversa para badge no avatar
  const ticketType: "community" | "group" | "newsletter" | "individual" =
    ticket.isCommunity || ticket.isSubGroup
      ? "community"
      : ticket.isNewsletter
      ? "newsletter"
      : ticket.isGroup || ticket.contact?.isGroup
      ? "group"
      : "individual";

  const updatedAt = parseISO(ticket.updatedAt);
  const timeLabel = isSameDay(updatedAt, new Date())
    ? format(updatedAt, "HH:mm")
    : format(updatedAt, "dd/MM");

  return (
    <div
      onClick={() => handleSelectTicket(ticket.id)}
      className={cn(
        "relative flex cursor-pointer gap-3 px-4 py-2.5",
        "border-b border-black/[0.04]",
        "transition-colors duration-150",
        isSelected
          ? "bg-primary/[0.08]"
          : "bg-transparent hover:bg-muted/40"
      )}
    >
      {/* Indicador de fila — borda esquerda colorida */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{
          backgroundColor: isSelected
            ? "var(--color-info)"
            : ticket.queue?.color ?? "transparent",
        }}
      />

      {/* Avatar circular + badge de tipo */}
      <div className="relative shrink-0">
        <Avatar
          src={
            ticket.contact?.profilePicUrl
              ? getBackendUrl(ticket.contact.profilePicUrl)
              : null
          }
          name={ticket.contact.name}
          size="md"
          aria-label={ticket.contact.name}
        />
        {ticketType !== "individual" && (
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background",
            ticketType === "community" && "bg-violet-500",
            ticketType === "newsletter" && "bg-sky-500",
            ticketType === "group" && "bg-emerald-500",
          )}>
            {ticketType === "community" && <Building2 className="h-2.5 w-2.5 text-white" />}
            {ticketType === "newsletter" && <Radio className="h-2.5 w-2.5 text-white" />}
            {ticketType === "group" && <Users className="h-2.5 w-2.5 text-white" />}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {/* Linha 1 — nome + horário */}
        <div className="flex items-baseline justify-between">
          <span className="truncate text-[0.8125rem] font-semibold leading-tight text-foreground">
            {ticket.contact.name}
          </span>
          <span className="ml-2 shrink-0 text-[0.6875rem] text-muted-foreground">
            {timeLabel}
          </span>
        </div>

        {/* Linha 2 — prévia + badge não lidas */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[0.75rem] leading-4 text-muted-foreground pointer-events-none select-none">
            {ticket.lastMessage ? (
              <MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
            ) : (
              "Sem mensagens"
            )}
          </span>

          {ticket.unreadMessages > 0 && (
            <Badge
              className={cn(
                "ml-auto min-w-[18px] shrink-0 justify-center",
                "rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold",
                "border-transparent bg-primary text-primary-foreground",
                "hover:bg-primary"
              )}
            >
              {ticket.unreadMessages}
            </Badge>
          )}
        </div>

        {/* Linha 3 — badge da fila */}
        {ticket.whatsapp?.name && (
          <span className="mt-0.5 self-start rounded px-1.5 py-px text-[0.625rem] font-semibold bg-muted text-muted-foreground">
            {ticket.whatsapp.name}
          </span>
        )}

        {/* Botões aceitar / espiar — tickets pendentes individuais */}
        {isPending && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <ButtonWithSpinner
              size="sm"
              loading={loading}
              className="rounded-md px-3 py-1 text-xs font-semibold normal-case bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleAcceptTicket(ticket.id);
              }}
            >
              {i18n.t("ticketsList.buttons.accept")}
            </ButtonWithSpinner>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/60 transition-colors"
              onClick={(e) => handlePeekTicket(e, ticket.id)}
            >
              Espiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketListItem;
