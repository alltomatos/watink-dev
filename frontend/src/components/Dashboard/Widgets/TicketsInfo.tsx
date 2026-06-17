import React from "react";
import { ClipboardList, Hourglass, CheckCircle2 } from "lucide-react";
import MetricCard from "../../../components/ui/metric-card";
import { i18n } from "../../../translate/i18n";
import { useDashboardStats } from "../../../hooks/useDashboardStats";

interface TicketsInfoProps {
  userQueueIds?: number[];
}

const TicketsInfo: React.FC<TicketsInfoProps> = () => {
  const { data: stats, isLoading } = useDashboardStats();

  // Fallback para zero enquanto API de stats não está disponível

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full col-span-12">
      <MetricCard
        label={i18n.t("dashboard.messages.inAttendance.title")}
        value={isLoading ? "—" : (stats?.openTickets ?? 0)}
        icon={<ClipboardList className="h-5 w-5" />}
        color="primary"
      />
      <MetricCard
        label={i18n.t("dashboard.messages.waiting.title")}
        value={isLoading ? "—" : (stats?.pendingTickets ?? 0)}
        icon={<Hourglass className="h-5 w-5" />}
        color="warning"
      />
      <MetricCard
        label={i18n.t("dashboard.messages.closed.title")}
        value={isLoading ? "—" : (stats?.closedTickets ?? 0)}
        icon={<CheckCircle2 className="h-5 w-5" />}
        color="success"
      />
    </div>
  );
};

export default TicketsInfo;
