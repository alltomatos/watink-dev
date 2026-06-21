import { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";

import { AuthContext } from "../../../context/Auth/AuthContext";
import api from "../../../services/api";
import { useTickets } from "../../../hooks/useTickets";
import { useWhatsAppsQuery } from "../../../hooks/useWhatsAppsQuery";
import { DEFAULT_WIDGETS, formatTime, type WidgetConfig, type StatItem } from "../dashboardTypes";
import { i18n } from "../../../translate/i18n";
import { MessageSquare, Users, CheckCircle, Clock } from "lucide-react";
import React from "react";

export interface UseDashboardReturn {
  user: any;
  widgets: WidgetConfig[];
  sortedWidgets: WidgetConfig[];
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  stats: StatItem[];
  whatsApps: any[];
  connectedCount: number;
  userQueueIds: number[];
  openCount: number;
  pendingCount: number;
  closedCount: number;
  toggleWidget: (id: string) => void;
  moveWidget: (index: number, direction: number) => void;
  handleSaveConfigs: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const { user: _user, setUser } = useContext(AuthContext) as any;
  const user: any = _user;

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  const { data: whatsApps = [] } = useWhatsAppsQuery();
  const connectedCount = whatsApps.filter((w: any) => w.status === "CONNECTED").length;

  const userQueueIds: number[] = user?.queues?.map((q: any) => q.id) || [];
  const queueIdsParam = JSON.stringify(userQueueIds);

  const { data: openData } = useTickets({
    status: "open",
    showAll: "true",
    withUnreadMessages: "false",
    queueIds: queueIdsParam,
  });
  const openCount = openData?.count ?? 0;

  const { data: pendingData } = useTickets({
    status: "pending",
    showAll: "true",
    withUnreadMessages: "false",
    queueIds: queueIdsParam,
  });
  const pendingCount = pendingData?.count ?? 0;

  const { data: closedData } = useTickets({
    status: "closed",
    showAll: "true",
    withUnreadMessages: "false",
    queueIds: queueIdsParam,
  });
  const closedCount = closedData?.count ?? 0;

  useEffect(() => {
    if (user?.configs?.dashboard?.widgets) {
      setWidgets(user.configs.dashboard.widgets);
    } else {
      setWidgets(DEFAULT_WIDGETS);
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get("/dashboard");
        setAvgResponseTime(data?.metrics?.avgResponseTime || 0);
      } catch {
        console.error("Error fetching dashboard data");
      }
    };
    fetchDashboard();
  }, []);

  const handleSaveConfigs = async () => {
    try {
      const newConfigs = {
        ...user.configs,
        dashboard: { widgets },
      };
      await api.put(`/users/${user.id}/configs`, { configs: newConfigs });
      setUser({ ...user, configs: newConfigs });
      toast.success("Dashboard preferences saved!");
      setModalOpen(false);
    } catch {
      toast.error("Error saving preferences");
    }
  };

  const toggleWidget = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const moveWidget = (index: number, direction: number) => {
    const sorted = [...widgets].sort((a, b) => a.order - b.order);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const tempOrder = sorted[index].order;
    sorted[index].order = sorted[targetIndex].order;
    sorted[targetIndex].order = tempOrder;
    setWidgets(sorted);
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  const stats: StatItem[] = [
    {
      title: i18n.t("dashboard.messages.inAttendance.title"),
      value: String(openCount),
      icon: React.createElement(MessageSquare),
      color: "primary",
    },
    {
      title: i18n.t("dashboard.messages.waiting.title"),
      value: String(pendingCount),
      icon: React.createElement(Users),
      color: "warning",
    },
    {
      title: i18n.t("dashboard.messages.closed.title"),
      value: String(closedCount),
      icon: React.createElement(CheckCircle),
      color: "success",
    },
    {
      title: "TMR (Tempo Médio)",
      value: formatTime(avgResponseTime),
      icon: React.createElement(Clock),
      color: "info",
    },
  ];

  return {
    user,
    widgets,
    sortedWidgets,
    modalOpen,
    setModalOpen,
    stats,
    whatsApps,
    connectedCount,
    userQueueIds,
    openCount,
    pendingCount,
    closedCount,
    toggleWidget,
    moveWidget,
    handleSaveConfigs,
  };
}
