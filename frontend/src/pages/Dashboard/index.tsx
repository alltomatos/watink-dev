/* @jsxImportSource react */
import React, { useState, useEffect, useContext } from "react";
import {
  Settings,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "react-toastify";

import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { useTickets } from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";

import {
  PageContainer,
  PageHeader,
  PageContent,
} from "../../components/ui/page-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { MetricCard } from "../../components/ui/metric-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";

// Widgets (Ainda em processo de refatoração interna, mas envelopados em PageContent)
import TicketsInfo from "../../components/Dashboard/Widgets/TicketsInfo";
import AttendanceChart from "../../components/Dashboard/Widgets/AttendanceChart";
import PerformanceMetrics from "../../components/Dashboard/Widgets/PerformanceMetrics";

interface WidgetConfig {
  id: string;
  visible: boolean;
  width: number;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "performance_metrics", visible: true, width: 12, order: 1 },
  { id: "tickets_info", visible: true, width: 12, order: 2 },
  { id: "attendance_chart", visible: true, width: 12, order: 3 },
];

const WIDGET_LABELS: Record<string, string> = {
  performance_metrics: "Métricas de Performance (TMR/TME)",
  tickets_info: "Resumo de Tickets",
  attendance_chart: "Gráfico de Atendimentos",
};

const formatTime = (minutes: number): string => {
  if (!minutes) return "0m";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }
  return `${Math.round(minutes)}m`;
};

const Dashboard: React.FC = () => {
  const { user, setUser } = useContext(AuthContext);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  const userQueueIds: number[] = user?.queues?.map((q: any) => q.id) || [];
  const queueIdsParam = JSON.stringify(userQueueIds);

  // Contagens reais de tickets por status (mesma fonte do legado MUI)
  const { count: openCount } = useTickets({
    status: "open",
    showAll: "true",
    withUnreadMessages: "false",
    queueIds: queueIdsParam,
  });
  const { count: pendingCount } = useTickets({
    status: "pending",
    showAll: "true",
    withUnreadMessages: "false",
    queueIds: queueIdsParam,
  });
  const { count: closedCount } = useTickets({
    status: "closed",
    showAll: "true",
    withUnreadMessages: "false",
    queueIds: queueIdsParam,
  });

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
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };
    fetchDashboard();
  }, []);

  const handleSaveConfigs = async () => {
    try {
      const newConfigs = {
        ...user.configs,
        dashboard: {
          widgets: widgets,
        },
      };

      await api.put(`/users/${user.id}/configs`, { configs: newConfigs });

      // Update local user context
      setUser({ ...user, configs: newConfigs });

      toast.success("Dashboard preferences saved!");
      setModalOpen(false);
    } catch (err) {
      toast.error("Error saving preferences");
    }
  };

  const toggleWidget = (id: string) => {
    setWidgets(
      widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const moveWidget = (index: number, direction: number) => {
    const newWidgets = [...widgets].sort((a, b) => a.order - b.order);
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newWidgets.length) return;

    // Swap orders
    const tempOrder = newWidgets[index].order;
    newWidgets[index].order = newWidgets[targetIndex].order;
    newWidgets[targetIndex].order = tempOrder;

    setWidgets(newWidgets);
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const isVisible = (id: string) =>
    sortedWidgets.find((w) => w.id === id)?.visible !== false;

  const stats = [
    {
      title: i18n.t("dashboard.messages.inAttendance.title"),
      value: String(openCount ?? 0),
      icon: <MessageSquare className="h-4 w-4" />,
      color: "primary" as const,
    },
    {
      title: i18n.t("dashboard.messages.waiting.title"),
      value: String(pendingCount ?? 0),
      icon: <Users className="h-4 w-4" />,
      color: "warning" as const,
    },
    {
      title: i18n.t("dashboard.messages.closed.title"),
      value: String(closedCount ?? 0),
      icon: <CheckCircle className="h-4 w-4" />,
      color: "success" as const,
    },
    {
      title: "TMR (Tempo Médio)",
      value: formatTime(avgResponseTime),
      icon: <Clock className="h-4 w-4" />,
      color: "info" as const,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo de volta, ${user?.name}. Aqui está o resumo das suas operações.`}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Personalizar
          </Button>
        </div>
      </PageHeader>

      <PageContent className="space-y-6 pb-20">
        {/* KPI Row — dados reais via useTickets + /dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <MetricCard
              key={idx}
              label={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>

        {/* Widgets configuráveis, em ordem definida pelo usuário */}
        {sortedWidgets.map((widget) => {
          if (!widget.visible) return null;

          switch (widget.id) {
            case "performance_metrics":
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <CardTitle>Performance por Equipe</CardTitle>
                    <CardDescription>
                      Métricas individuais de atendentes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformanceMetrics />
                  </CardContent>
                </Card>
              );
            case "tickets_info":
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <CardTitle>Resumo de Tickets</CardTitle>
                    <CardDescription>
                      Distribuição de estados e filas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TicketsInfo userQueueIds={userQueueIds} />
                  </CardContent>
                </Card>
              );
            case "attendance_chart":
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <CardTitle>Fluxo de Atendimento</CardTitle>
                    <CardDescription>
                      Volume de mensagens e tickets ao longo do dia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AttendanceChart />
                  </CardContent>
                </Card>
              );
            default:
              return null;
          }
        })}
      </PageContent>

      {/* Modal de personalização (portado do legado MUI → Dialog shadcn) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Configurações do Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {sortedWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4"
              >
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <Checkbox
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  {WIDGET_LABELS[widget.id] || widget.id}
                </label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveWidget(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveWidget(index, 1)}
                    disabled={index === sortedWidgets.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleSaveConfigs}>
              Salvar Preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default Dashboard;
