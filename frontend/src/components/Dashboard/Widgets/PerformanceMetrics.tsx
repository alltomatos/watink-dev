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

  if (isLoading) return <div>Carregando...</div>;
  if (error || !data) return <div>Erro ao carregar métricas</div>;

  return (
    <div className="col-span-12 sm:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <MetricCard
        label="TMR (Tempo Médio de Resposta)"
        value={formatTime(data.metrics?.avgResponseTime)}
        icon={<Gauge className="h-5 w-5" />}
        color="info"
      />
      <MetricCard
        label="TME (Tempo Médio de Espera)"
        value={formatTime(data.metrics?.avgWaitTime)}
        icon={<Clock className="h-5 w-5" />}
        color="secondary"
      />
    </div>
  );
};

export default PerformanceMetrics;
