import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Users, User, Phone, Mail, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { i18n } from "../../translate/i18n";
import { getBackendUrl } from "../../helpers/urlUtils";
import api from "../../services/api";

import TicketsManager from "@/components/TicketsManager/";
import Ticket from "@/components/Ticket/";

interface ContactInfo {
  id?: number;
  name: string;
  number?: string;
  email?: string;
  lid?: string;
  profilePicUrl?: string | null;
  isGroup?: boolean;
}

interface TicketInfo {
  id?: number;
  status?: string;
  isGroup?: boolean;
  contact?: ContactInfo;
  user?: { name: string } | null;
  whatsapp?: { name: string };
}

/* ─── Contact Details Panel ──────────────────────────────────────────── */
const ContactDetailsPanel: React.FC<{ ticket: TicketInfo | null; loading: boolean }> = ({
  ticket,
  loading,
}) => {
  const contact = ticket?.contact;

  if (loading) {
    return (
      <div className="flex flex-col w-full p-4 gap-3 animate-pulse">
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-20 h-20 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Selecione um ticket para ver os detalhes
      </div>
    );
  }

  const isGroup = contact.isGroup || ticket?.isGroup;

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      {/* Header with avatar + name */}
      <div className="flex flex-col items-center gap-2 px-4 py-6 border-b border-border">
        <Avatar
          src={contact.profilePicUrl ? getBackendUrl(contact.profilePicUrl) : null}
          name={contact.name || "?"}
          className="w-20 h-20"
        />
        <p className="font-semibold text-sm text-center leading-tight">{contact.name}</p>
        {isGroup ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <Users className="w-3 h-3" />
            Grupo do WhatsApp
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <User className="w-3 h-3" />
            Contato
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 px-4 py-4">
        {/* Ticket info */}
        {ticket?.id && (
          <div className="flex flex-col gap-2 mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ticket
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Número</span>
              <span className="font-medium">#{ticket.id}</span>
            </div>
            {ticket.user && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agente</span>
                <span className="font-medium">{ticket.user.name}</span>
              </div>
            )}
            {ticket.whatsapp?.name && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Conexão</span>
                <span className="font-medium truncate max-w-[140px]">{ticket.whatsapp.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact / Group info */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isGroup ? "Grupo" : "Contato"}
          </p>

          {contact.number && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a
                href={`tel:${contact.number}`}
                className="text-primary hover:underline truncate"
              >
                {contact.number}
              </a>
            </div>
          )}

          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${contact.email}`}
                className="text-primary hover:underline truncate"
              >
                {contact.email}
              </a>
            </div>
          )}

          {contact.lid && !contact.number && (
            <div className="flex items-center gap-2 text-sm">
              <AtSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{contact.lid}</span>
            </div>
          )}

          {isGroup && !contact.number && !contact.email && (
            <p className="text-xs text-muted-foreground">
              Informações do grupo serão exibidas após receber mensagens.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Tickets Page ───────────────────────────────────────────────────── */
const Tickets: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [hasOpenTicket, setHasOpenTicket] = useState(!!ticketId);
  const [detailTicket, setDetailTicket] = useState<TicketInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setHasOpenTicket(!!ticketId);
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) {
      setDetailTicket(null);
      return;
    }
    setDetailLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}`);
        setDetailTicket(data);
      } catch {
        setDetailTicket(null);
      } finally {
        setDetailLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [ticketId]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Coluna 1: Lista de Tickets */}
      <div className={cn(
        "flex-col border-r border-border md:flex md:w-[290px] shrink-0",
        hasOpenTicket ? "hidden md:flex" : "flex w-full"
      )}>
        <TicketsManager />
      </div>

      {/* Coluna 2: Chat */}
      <div className={cn(
        "flex-col bg-background",
        hasOpenTicket ? "flex flex-1" : "hidden md:flex md:flex-1"
      )}>
        {ticketId ? (
          <Ticket />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {i18n.t("chat.noTicketMessage")}
          </div>
        )}
      </div>

      {/* Coluna 3: Detalhes do Contato / Grupo */}
      <div className="hidden w-[280px] border-l border-border lg:flex flex-col">
        <div className="flex items-center px-4 h-[57px] border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground">
            {detailTicket?.contact?.isGroup || detailTicket?.isGroup
              ? "Detalhes do Grupo"
              : "Detalhes do Contato"}
          </span>
        </div>
        <ContactDetailsPanel ticket={detailTicket} loading={detailLoading && !!ticketId} />
      </div>
    </div>
  );
};

export default Tickets;
