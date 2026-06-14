import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { Ticket } from "../../types/Ticket";

interface FetchTicketsParams {
  searchParam?: string;
  status?: string;
  showAll?: string | boolean;
  queueIds?: number[] | string;
  isGroup?: string | boolean;
}

interface FetchTicketsResponse {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

export const useTicketsQuery = (params: FetchTicketsParams) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["tickets", params],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<FetchTicketsResponse>("/tickets", {
        params: { ...params, pageNumber: pageParam },
      });
      return data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (params.pageNumber || 1) + 1 : undefined),
    initialPageParam: 1,
    staleTime: 5000,
  });
};
