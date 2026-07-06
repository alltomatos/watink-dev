import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHelpdeskKanban } from "./hooks/useHelpdeskKanban";
import KanbanHeader from "./components/KanbanHeader";
import KanbanColumnCard from "./components/KanbanColumnCard";

interface HelpdeskKanbanProps {
  tvMode?: boolean;
}

const HelpdeskKanban: React.FC<HelpdeskKanbanProps> = ({ tvMode = false }) => {
  const {
    columns,
    loading,
    recentlyAdded,
    loadKanbanData,
    handleCardClick,
    handleTvMode,
  } = useHelpdeskKanban({ tvMode });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-[hsl(var(--bg-surface-alt))] p-4">
        <KanbanHeader
          tvMode={tvMode}
          onRefresh={loadKanbanData}
          onTvMode={handleTvMode}
        />
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <KanbanColumnCard
              key={col.status}
              column={col}
              recentlyAdded={recentlyAdded}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default HelpdeskKanban;
