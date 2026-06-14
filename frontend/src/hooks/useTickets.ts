import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Ticket } from "../types/Ticket";

interface FetchTicketsParams {
  searchParam?: string;
  pageNumber?: string | number;
  status?: string;
  date?: string;
  showAll?: string | boolean;
  queueIds?: number[] | string;
  withUnreadMessages?: string | boolean;
  isGroup?: string | boolean;
}

interface FetchTicketsResponse {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

export const useTickets = (params: FetchTicketsParams) => {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: async () => {
      const { data } = await api.get<FetchTicketsResponse>("/tickets", {
        params,
      });
      return data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60, // 1 minute
  });
};
