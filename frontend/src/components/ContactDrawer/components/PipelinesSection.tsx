import React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Deal, getStageColor } from "../contactDrawerTypes";

interface PipelinesSectionProps {
  deals: Deal[];
  onAddDeal: () => void;
  onDeleteDeal: (dealId: number) => void;
}

const PipelinesSection = ({
  deals,
  onAddDeal,
  onDeleteDeal,
}: PipelinesSectionProps) => {
  return (
    <div className="border border-[var(--border-divider)] rounded p-3 bg-[var(--bg-surface)]">
      <p className="text-sm font-medium mb-2">Fluxos (Pipelines)</p>
      {deals.map((deal) => {
        const color = deal.stage
          ? getStageColor(deal.stage.id)
          : { bg: "var(--bg-surface-alt)", header: "var(--border-default)" };
        return (
          <div
            key={deal.id}
            className="relative mt-2 p-2 rounded border border-[var(--border-divider)] bg-[var(--bg-surface)]"
            style={{ borderLeft: `4px solid ${color.header}` }}
          >
            <p className="text-xs font-bold">{deal.pipeline?.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded text-[var(--text-primary)]"
                style={{ backgroundColor: color.bg }}
              >
                {deal.stage?.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onDeleteDeal(deal.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={onAddDeal}
      >
        Adicionar ao Fluxo
      </Button>
    </div>
  );
};

export default PipelinesSection;
