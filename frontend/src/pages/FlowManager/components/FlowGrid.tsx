import React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Flow } from "../flowManagerTypes";
import FlowCard from "./FlowCard";

interface FlowGridProps {
  loading: boolean;
  filteredFlows: Flow[];
  onCreateNew: () => void;
  onEdit: (flow: Flow) => void;
  onDelete: (flow: Flow) => void;
}

const FlowGrid: React.FC<FlowGridProps> = ({
  loading,
  filteredFlows,
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <Card
        className="border-dashed border-2 hover:bg-muted/50 cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[180px] group"
        onClick={onCreateNew}
      >
        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
          <Plus size={24} />
        </div>
        <span className="mt-3 font-medium text-muted-foreground">
          Criar Automação
        </span>
      </Card>

      {filteredFlows.map((flow) => (
        <FlowCard
          key={flow.id}
          flow={flow}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default FlowGrid;
