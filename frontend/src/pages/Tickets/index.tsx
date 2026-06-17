import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { i18n } from "../../translate/i18n";

import TicketsManager from "@/components/TicketsManager/";
import Ticket from "@/components/Ticket/";

const Tickets: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [hasOpenTicket, setHasOpenTicket] = useState(!!ticketId);

  useEffect(() => {
    setHasOpenTicket(!!ticketId);
  }, [ticketId]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Coluna 1: Lista de Tickets (TicketsManager) */}
      <div className={cn(
        "flex-col border-r border-border md:flex md:w-[290px] shrink-0",
        hasOpenTicket ? "hidden md:flex" : "flex w-full"
      )}>
        <TicketsManager />
      </div>

      {/* Coluna 2: Chat / Ticket (Conteúdo Principal) */}
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

      {/* Coluna 3: Detalhes do Contato (WIP) */}
      <div className="hidden w-[320px] border-l border-border lg:flex">
        <div className="flex w-full items-center justify-center text-muted-foreground p-4">
          Detalhes do contato (WIP)
        </div>
      </div>
    </div>
  );
};

export default Tickets;
