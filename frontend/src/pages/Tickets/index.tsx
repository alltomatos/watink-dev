import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Users, User, Phone, Mail, AtSign, X, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { i18n } from "../../translate/i18n";
import { getBackendUrl } from "../../helpers/urlUtils";
import api from "../../services/api";

import TicketsManager from "@/components/TicketsManager/";
import Ticket from "@/components/Ticket/";
import TicketHistory from "@/components/TicketHistory";

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

/* ─── Dados tab ──────────────────────────────────────────────────────── */
const DadosTab: React.FC<{ ticket: TicketInfo | null; loading: boolean }> = ({ ticket, loading }) => {
  const [syncing, setSyncing] = useState(false);
  const contact = ticket?.contact;
  const isGroup = contact?.isGroup || ticket?.isGroup;

  const handleSyncContact = async () => {
    if (!contact?.id) return;
    setSyncing(true);
    try {
      await api.post(`/contacts/${contact.id}/sync`);
      toast.success("Sincronização solicitada ao WhatsApp!");
    } catch {
      toast.error("Erro ao solicitar atualização.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col p-4 gap-3 animate-pulse">
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

  return (
    <div className="flex flex-col">
      {/* Avatar + name */}
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
        <Button
          variant="outline"
          size="sm"
          className="mt-1 h-7 gap-1.5 text-xs"
          disabled={syncing || !contact.id}
          onClick={handleSyncContact}
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
          Atualizar contato
        </Button>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-3 px-4 py-4">
        {ticket?.id && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket</p>
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

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isGroup ? "Grupo" : "Contato"}
          </p>
          {contact.number && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${contact.number}`} className="text-primary hover:underline truncate">
                {contact.number}
              </a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
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
              Avatar e detalhes aparecem após receber mensagens do grupo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Details Panel (com abas) ───────────────────────────────────────── */
const DetailsPanel: React.FC<{
  ticket: TicketInfo | null;
  loading: boolean;
  onClose: () => void;
}> = ({ ticket, loading, onClose }) => {
  const isGroup = ticket?.contact?.isGroup || ticket?.isGroup;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[57px] border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          {isGroup ? "Detalhes do Grupo" : "Detalhes do Contato"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Abas */}
      <Tabs defaultValue="dados" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="w-full rounded-none h-9 gap-0 shrink-0 border-b border-border bg-muted/40">
          <TabsTrigger value="dados" className="flex-1 rounded-none text-xs h-full">
            Dados
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex-1 rounded-none text-xs h-full">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="flex-1 min-h-0 overflow-y-auto mt-0">
          <DadosTab ticket={ticket} loading={loading} />
        </TabsContent>

        <TabsContent value="historico" className="flex-1 min-h-0 overflow-y-auto mt-0">
          {ticket?.id ? (
            <TicketHistory ticketId={ticket.id} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-4 text-center">
              Selecione um ticket para ver o histórico
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Tickets Page ───────────────────────────────────────────────────── */
const Tickets: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [hasOpenTicket, setHasOpenTicket] = useState(!!ticketId);
  const [detailTicket, setDetailTicket] = useState<TicketInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    setHasOpenTicket(!!ticketId);
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) {
      setDetailTicket(null);
      setDetailLoading(false);
      return;
    }
    setDetailTicket(null);
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
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Coluna 1: Lista de Tickets */}
      <div className={cn(
        "flex-col border-r border-border md:flex md:w-[290px] shrink-0",
        hasOpenTicket ? "hidden md:flex" : "flex w-full"
      )}>
        <TicketsManager />
      </div>

      {/* Coluna 2: Chat */}
      <div className={cn(
        "flex-col bg-background min-w-0 min-h-0 overflow-hidden",
        hasOpenTicket ? "flex flex-1" : "hidden md:flex md:flex-1"
      )}>
        {ticketId ? (
          <Ticket
            onToggleDetails={() => setShowDetails((v) => !v)}
            showDetails={showDetails}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {i18n.t("chat.noTicketMessage")}
          </div>
        )}
      </div>

      {/* Coluna 3: Detalhes */}
      {showDetails && (
        <div className="hidden w-[280px] shrink-0 border-l border-border lg:flex flex-col">
          <DetailsPanel
            ticket={detailTicket}
            loading={detailLoading && !!ticketId}
            onClose={() => setShowDetails(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Tickets;
