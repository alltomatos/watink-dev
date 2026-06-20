import React from "react";
import { Plus, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ViewMode } from "../flowManagerTypes";

interface FlowToolbarProps {
  searchParam: string;
  onSearchChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onCreateNew: () => void;
}

const FlowToolbar: React.FC<FlowToolbarProps> = ({
  searchParam,
  onSearchChange,
  view,
  onViewChange,
  onCreateNew,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-sm hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar fluxos..."
          value={searchParam}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      <div className="flex items-center border rounded-md p-1 bg-muted/50">
        <Button
          variant={view === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 rounded-sm"
          onClick={() => onViewChange("list")}
        >
          <ListIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={view === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 rounded-sm"
          onClick={() => onViewChange("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      <Button onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Fluxo
      </Button>
    </div>
  );
};

export default FlowToolbar;
