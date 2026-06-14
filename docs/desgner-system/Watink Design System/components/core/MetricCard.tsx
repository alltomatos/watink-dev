import React from "react";
import { Users, Timer, MessageSquare, AlertCircle, Info } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";

/**
 * @dsCard group="Components"
 * Card de métrica para dashboard — valor grande em destaque com container de ícone com gradiente e badge opcional de tendência.
 * Use em PerformanceMetrics, TicketsInfo e qualquer seção de resumo de KPIs.
 */
export const MetricCardPreview = () => {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Métrica básica */}
      <MetricCard
        label="Tickets Abertos"
        value="142"
        color="primary"
        icon={<MessageSquare className="h-6 w-6" />}
      />

      {/* Com ícone e tendência positiva */}
      <MetricCard
        label="Atendimentos Hoje"
        value="38"
        color="success"
        icon={<Users className="h-6 w-6" />}
        trend={{ value: "+12%", positive: true }}
      />

      {/* Com tendência negativa */}
      <MetricCard
        label="TMA"
        value="4m 12s"
        color="warning"
        icon={<Timer className="h-6 w-6" />}
        trend={{ value: "+2min", positive: false }}
      />

      {/* Métrica de erro/alerta */}
      <MetricCard
        label="Sem Resposta"
        value="7"
        color="error"
        icon={<AlertCircle className="h-6 w-6" />}
      />

      {/* Métrica de informação */}
      <MetricCard
        label="Sessões Ativas"
        value="12"
        color="info"
        icon={<Info className="h-6 w-6" />}
      />
    </div>
  );
};

export default MetricCardPreview;
