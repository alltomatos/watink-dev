import { useQuery, UseQueryOptions } from "@tanstack/react-query";

interface DashboardStats {
  ticketsCount: number;
  openTickets: number;
  pendingTickets: number;
  closedTickets: number;
  ticketsByHour: Record<string, number>;
  metrics: {
    avgResponseTime: number;
    avgWaitTime: number;
  };
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch("/api/dashboard/stats"); // Ajuste o endpoint conforme necessário
  if (!response.ok) {
    throw new Error("Falha ao buscar estatísticas do dashboard");
  }
  return response.json();
};

export const useDashboardStats = (options?: UseQueryOptions<DashboardStats, Error>) => {
  return useQuery<DashboardStats, Error>({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    ...options,
  });
};
