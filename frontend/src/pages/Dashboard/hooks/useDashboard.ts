import { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";

import { AuthContext } from "../../../context/Auth/AuthContext";
import { AuthUser } from "../../../hooks/useAuth";
import api from "../../../services/api";
import { useTickets } from "../../../hooks/useTickets";
import { useWhatsAppsQuery } from "../../../hooks/useWhatsAppsQuery";
import { DEFAULT_WIDGETS, formatTime, type WidgetConfig, type StatItem } from "../dashboardTypes";
import { i18n } from "../../../translate/i18n";
import { MessageSquare, Users, CheckCircle, Clock } from "lucide-react";
import React from "react";

interface WhatsApp {
  id: number;
  status: string;
  [key: string]: unknown;
}

interface Queue {
  id: number;
  [key: string]: unknown;
}

export interface UseDashboardReturn {
  user: AuthUser;
  widgets: WidgetConfig[];
  sortedWidgets: WidgetConfig[];
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  stats: StatItem[];
  whatsApps: WhatsApp[];
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
  const { user } = useContext(AuthContext);

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  const { data: whatsAppsRaw = [] } = useWhatsAppsQuery();
  const whatsApps = whatsAppsRaw as WhatsApp[];
  const connectedCount = whatsApps.filter((w) => w.status === "CONNECTED").length;

  const userQueueIds: number[] = ((user as unknown as { queues?: Queue[] })?.queues ?? []).map((q) => q.id);
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
    const userConfigs = (user as unknown as { configs?: { dashboard?: { widgets?: WidgetConfig[] } } })?.configs;
    if (userConfigs?.dashboard?.widgets) {
      setWidgets(userConfigs.dashboard.widgets);
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
      const existingConfigs = (user as unknown as { configs?: Record<string, unknown> })?.configs ?? {};
      const newConfigs = {
        ...existingConfigs,
        dashboard: { widgets },
      };
      await api.put(`/users/${user.id}/configs`, { configs: newConfigs });
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
