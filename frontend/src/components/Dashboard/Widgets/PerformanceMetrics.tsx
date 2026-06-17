import React from "react";
import { Gauge, Clock } from "lucide-react";
import { useDashboardStats } from "../../../hooks/useDashboardStats";
import MetricCard from "../../../components/ui/metric-card";

const PerformanceMetrics: React.FC = () => {
  const { data, isLoading, error } = useDashboardStats();

  const formatTime = (minutes?: number): string => {
    if (!minutes) return "0m";
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes > 60) {
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      return `${h}h ${m}m`;
    }
    return `${Math.round(minutes)}m`;
  };

  // Fallback para zero enquanto API de stats não está disponível
  const avgResponse = data?.metrics?.avgResponseTime ?? 0;
  const avgWait = data?.metrics?.avgWaitTime ?? 0;

  return (
    <div className="col-span-12 sm:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <MetricCard
        label="TMR (Tempo Médio de Resposta)"
        value={isLoading ? "—" : formatTime(avgResponse)}
        icon={<Gauge className="h-5 w-5" />}
        color="info"
      />
      <MetricCard
        label="TME (Tempo Médio de Espera)"
        value={isLoading ? "—" : formatTime(avgWait)}
        icon={<Clock className="h-5 w-5" />}
        color="warning"
      />
    </div>
  );
};

export default PerformanceMetrics;
