import React, { useState, useEffect } from "react";
import PaperCard from "../../components/PaperCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../../services/api";
import { toast } from "react-toastify";

const COLORS = [
  "var(--status-info)",
  "var(--status-success)",
  "var(--status-warning)",
  "var(--status-error)",
  "var(--status-default-text)",
  "var(--status-success-bg)",
];

interface StatusCount {
  status: string;
  count: number;
}

interface PriorityCount {
  priority: string;
  count: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface DashboardData {
  statusCounts: StatusCount[];
  priorityCounts: PriorityCount[];
  categoryCounts: CategoryCount[];
  slaStatus: { onTime: number; overdue: number };
}

const HelpdeskReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    statusCounts: [],
    priorityCounts: [],
    categoryCounts: [],
    slaStatus: { onTime: 0, overdue: 0 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: responseData } = await api.get("/protocols/dashboard");
        setData(responseData);
      } catch {
        toast.error("Erro ao carregar relatórios");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const slaData = [
    { name: "No Prazo", value: data.slaStatus.onTime },
    { name: "Atrasado", value: data.slaStatus.overdue },
  ];

  const translateStatus = (status: string): string => {
    const map: Record<string, string> = {
      open: "Aberto",
      in_progress: "Em Andamento",
      resolved: "Resolvido",
      closed: "Fechado",
    };
    return map[status] || status;
  };

  const translatePriority = (priority: string): string => {
    const map: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    };
    return map[priority] || priority;
  };

  const formattedStatusData = data.statusCounts.map((item) => ({
    ...item,
    status: translateStatus(item.status),
  }));

  const formattedPriorityData = data.priorityCounts.map((item) => ({
    ...item,
    priority: translatePriority(item.priority),
  }));

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Status Chart */}
        <PaperCard>
          <h3 className="mb-4 text-lg font-semibold">Protocolos por Status</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="var(--status-default-text)"
                  name="Quantidade"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PaperCard>

        {/* Priority Chart */}
        <PaperCard>
          <h3 className="mb-4 text-lg font-semibold">
            Protocolos por Prioridade
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedPriorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="var(--status-default-text)"
                  dataKey="count"
                  nameKey="priority"
                  label
                >
                  {formattedPriorityData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </PaperCard>

        {/* SLA Chart */}
        <PaperCard>
          <h3 className="mb-4 text-lg font-semibold">
            Conformidade de SLA (Abertos/Em Andamento)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slaData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label
                >
                  <Cell fill="var(--status-success)" /> {/* No Prazo */}
                  <Cell fill="var(--status-error)" /> {/* Atrasado */}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </PaperCard>

        {/* Categories Chart */}
        <PaperCard>
          <h3 className="mb-4 text-lg font-semibold">Top 10 Categorias</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryCounts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="var(--status-warning)"
                  name="Quantidade"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PaperCard>
      </div>
    </div>
  );
};

export default HelpdeskReports;
