import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Ticket } from "../types/Ticket";

export const useTicket = (ticketId: string | number | undefined) => {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data } = await api.get<Ticket>(`/tickets/${ticketId}`);
      return data;
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60, // 1 minute
  });
};
