/* @jsxImportSource react */
import React from "react";
import {
  ClipboardList,
  Hourglass,
  CheckCircle2
} from "lucide-react";

import MetricCard from "../../../components/ui/metric-card";
import { i18n } from "../../../translate/i18n";
import useTickets from "../../../hooks/useTickets";

const TicketsInfo = ({ userQueueIds }) => {

  const GetTickets = (status, showAll, withUnreadMessages) => {
    const { count } = useTickets({
      status: status,
      showAll: showAll,
      withUnreadMessages: withUnreadMessages,
      queueIds: JSON.stringify(userQueueIds),
    });
    return count;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full col-span-12">
      <MetricCard
        label={i18n.t("dashboard.messages.inAttendance.title")}
        value={GetTickets("open", "true", "false")}
        icon={<ClipboardList className="h-5 w-5" />}
        color="primary"
      />
      <MetricCard
        label={i18n.t("dashboard.messages.waiting.title")}
        value={GetTickets("pending", "true", "false")}
        icon={<Hourglass className="h-5 w-5" />}
        color="warning"
      />
      <MetricCard
        label={i18n.t("dashboard.messages.closed.title")}
        value={GetTickets("closed", "true", "false")}
        icon={<CheckCircle2 className="h-5 w-5" />}
        color="success"
      />
    </div>
  );
};

export default TicketsInfo;
