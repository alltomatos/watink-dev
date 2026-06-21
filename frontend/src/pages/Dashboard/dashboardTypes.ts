import type { ReactElement } from "react";

export interface WidgetConfig {
  id: string;
  visible: boolean;
  width: number;
  order: number;
}

export type MetricColor = "primary" | "warning" | "success" | "info";

export interface StatItem {
  title: string;
  value: string;
  icon: ReactElement;
  color: MetricColor;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "performance_metrics", visible: true, width: 12, order: 1 },
  { id: "tickets_info", visible: true, width: 12, order: 2 },
  { id: "attendance_chart", visible: true, width: 12, order: 3 },
];

export const WIDGET_LABELS: Record<string, string> = {
  performance_metrics: "Métricas de Performance (TMR/TME)",
  tickets_info: "Resumo de Tickets",
  attendance_chart: "Gráfico de Atendimentos",
};

export const formatTime = (minutes: number): string => {
  if (!minutes) return "0m";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }
  return `${Math.round(minutes)}m`;
};
