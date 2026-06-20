import React from "react";
import { SystemStats } from "../types";
import { formatBytes } from "../utils";

interface ProcessCardProps {
  stats: SystemStats | null;
}

const ProcessCard: React.FC<ProcessCardProps> = ({ stats }) => {
  const items = [
    {
      label: "Uso de CPU (Proc)",
      value: `${stats?.process?.cpuUsage?.toFixed(2)}%`,
    },
    {
      label: "Memória (Heap)",
      value: formatBytes(stats?.process?.memoryUsed || 0),
    },
    {
      label: "Goroutines",
      value: String(stats?.process?.numGoroutine ?? "-"),
    },
    { label: "Threads do SO", value: "-" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 font-semibold">Processo Backend (Go)</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-base font-bold">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessCard;
