/* @jsxImportSource react */
import React from "react";
import {
  ClipboardList,
  Hourglass,
  CheckCircle2
} from "lucide-react";

import MetricCard from "../../../components/ui/metric-card";
import { i18n } from "../../../translate/i18n";
import { useDashboardStats } from "../../../hooks/useDashboardStats";

const TicketsInfo = ({ userQueueIds }) => {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full col-span-12">
      <MetricCard
        label={i18n.t("dashboard.messages.inAttendance.title")}
        value={stats?.openTickets ?? 0}
        icon={<ClipboardList className="h-5 w-5" />}
        color="primary"
      />
      <MetricCard
        label={i18n.t("dashboard.messages.waiting.title")}
        value={stats?.pendingTickets ?? 0}
        icon={<Hourglass className="h-5 w-5" />}
        color="warning"
      />
      <MetricCard
        label={i18n.t("dashboard.messages.closed.title")}
        value={stats?.closedTickets ?? 0}
        icon={<CheckCircle2 className="h-5 w-5" />}
        color="success"
      />
    </div>
  );
};

export default TicketsInfo;
