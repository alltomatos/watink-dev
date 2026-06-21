import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import TicketsInfo from "../../../components/Dashboard/Widgets/TicketsInfo";
import PerformanceMetrics from "../../../components/Dashboard/Widgets/PerformanceMetrics";
import type { WidgetConfig } from "../dashboardTypes";

interface DashboardWidgetsProps {
  sortedWidgets: WidgetConfig[];
  userQueueIds: number[];
}

const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  sortedWidgets,
  userQueueIds,
}) => {
  return (
    <>
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
            // Já renderizado na linha principal — ocultar aqui
            return null;
          default:
            return null;
        }
      })}
    </>
  );
};

export default DashboardWidgets;
