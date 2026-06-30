import React from "react";
import { Trash2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

import { FlowRun } from "../contactDrawerTypes";

const STATUS_LABEL: Record<string, string> = {
  running: "Executando",
  waiting_message: "Aguardando resposta",
  waiting_until: "Aguardando tempo",
  waiting_event: "Aguardando evento",
  completed: "Concluído",
  aborted: "Abortado",
  expired: "Expirado",
};

const STATUS_COLOR: Record<string, string> = {
  running: "var(--status-success)",
  waiting_message: "var(--status-info)",
  waiting_until: "var(--status-warning)",
  waiting_event: "var(--status-warning)",
  completed: "var(--status-default-text)",
  aborted: "var(--status-error)",
  expired: "var(--status-error)",
};

interface FlowsSectionProps {
  flowRuns: FlowRun[];
  onAddFlowRun: () => void;
  onAbortFlowRun: (flowRunId: string) => void;
}

const FlowsSection = ({ flowRuns, onAddFlowRun, onAbortFlowRun }: FlowsSectionProps) => {
  return (
    <div className="border border-[var(--border-divider)] rounded p-3 bg-[var(--bg-surface)]">
      <p className="text-sm font-medium mb-2">Fluxos</p>
      {flowRuns.map((run) => {
        const color = STATUS_COLOR[run.status] ?? "var(--status-default-text)";
        const label = STATUS_LABEL[run.status] ?? run.status;
        const isActive = ["running", "waiting_message", "waiting_until", "waiting_event"].includes(run.status);
        return (
          <div
            key={run.id}
            className="relative mt-2 p-2 rounded border border-[var(--border-divider)] bg-[var(--bg-surface)]"
            style={{ borderLeft: `4px solid ${color}` }}
          >
            <p className="text-xs font-bold">{run.flow?.name ?? `Fluxo #${run.flowId}`}</p>
            <div className="flex items-center justify-between mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {label}
              </span>
              {isActive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Abortar fluxo"
                  onClick={() => onAbortFlowRun(run.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="w-full mt-2" onClick={onAddFlowRun}>
        <Play className="w-3.5 h-3.5 mr-1" />
        Iniciar Fluxo
      </Button>
    </div>
  );
};

export default FlowsSection;
