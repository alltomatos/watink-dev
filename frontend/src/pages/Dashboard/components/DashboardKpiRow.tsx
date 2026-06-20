import React from "react";
import { MetricCard } from "../../../components/ui/metric-card";
import type { StatItem } from "../dashboardTypes";

interface DashboardKpiRowProps {
  stats: StatItem[];
}

const DashboardKpiRow: React.FC<DashboardKpiRowProps> = ({ stats }) => {
  return (
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
  );
};

export default DashboardKpiRow;
