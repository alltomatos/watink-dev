import React from "react";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "@/lib/utils";
import { i18n } from "../../../translate/i18n";

export type ViewMode = "grid" | "table";

interface QuickAnswersToolbarProps {
  searchParam: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdd: () => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}

export const QuickAnswersToolbar = ({
  searchParam,
  onSearch,
  onAdd,
  view,
  onViewChange,
}: QuickAnswersToolbarProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-sm hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={i18n.t("quickAnswers.searchPlaceholder") as string}
          value={searchParam}
          onChange={onSearch}
          className="pl-9 h-10"
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-md border bg-background p-0.5 gap-0.5">
        <button
          onClick={() => onViewChange("grid")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            view === "grid"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Visualização em cards"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onViewChange("table")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            view === "table"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Visualização em tabela"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>

      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        {i18n.t("quickAnswers.buttons.add")}
      </Button>
    </div>
  );
};
