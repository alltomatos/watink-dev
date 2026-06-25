import { useInfiniteQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Ticket } from "../types/Ticket";

interface FetchTicketsParams {
  searchParam?: string;
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

export const useTicketsInfinite = (params: FetchTicketsParams) => {
  return useInfiniteQuery({
    queryKey: ["tickets", params],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<FetchTicketsResponse>("/tickets", {
        params: { ...params, pageNumber: pageParam },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    staleTime: 0,
  });
};
