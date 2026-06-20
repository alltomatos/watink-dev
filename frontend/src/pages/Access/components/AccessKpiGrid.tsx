import React from "react";
import MetricCard from "../../../components/ui/metric-card";
import { i18n } from "../../../translate/i18n";
import type { KpiDef, AccessStats } from "../accessTypes";

interface AccessKpiGridProps {
  kpis: KpiDef[];
  stats: AccessStats;
}

const AccessKpiGrid: React.FC<AccessKpiGridProps> = ({ kpis, stats }) => (
  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
    {kpis.map((kpi) => (
      <MetricCard
        key={kpi.key}
        label={i18n.t(kpi.labelKey)}
        value={kpi.getValue(stats)}
        icon={kpi.icon}
        color={kpi.color}
      />
    ))}
  </div>
);

export default AccessKpiGrid;
