import { useState, useEffect } from "react";
import api from "../../../services/api";
import { TicketInfo } from "../ticketsTypes";

interface UseTicketsReturn {
  hasOpenTicket: boolean;
  detailTicket: TicketInfo | null;
  detailLoading: boolean;
  showDetails: boolean;
  setShowDetails: (v: boolean) => void;
}

export function useTickets(ticketId: string | undefined): UseTicketsReturn {
  const [hasOpenTicket, setHasOpenTicket] = useState(!!ticketId);
  const [detailTicket, setDetailTicket] = useState<TicketInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
        if (data?.unreadMessages > 0) {
          await api.put(`/tickets/${ticketId}`, { unreadMessages: 0 }).catch(() => null);
        }
      } catch {
        setDetailTicket(null);
      } finally {
        setDetailLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [ticketId]);

  return {
    hasOpenTicket,
    detailTicket,
    detailLoading,
    showDetails,
    setShowDetails,
  };
}
