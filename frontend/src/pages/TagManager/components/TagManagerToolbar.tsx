import React from "react";
import { Search, Archive, Plus } from "lucide-react";

import { i18n } from "../../../translate/i18n";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface TagManagerToolbarProps {
  searchParam: string;
  showArchived: boolean;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleArchived: () => void;
  onAdd: () => void;
}

export const TagManagerToolbar = ({
  searchParam,
  showArchived,
  onSearch,
  onToggleArchived,
  onAdd,
}: TagManagerToolbarProps) => (
  <div className="flex items-center gap-2">
    <div className="relative w-full max-w-sm hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={i18n.t("tags.searchPlaceholder") as string}
        value={searchParam}
        onChange={onSearch}
        className="pl-9 h-10"
      />
    </div>
    <Button
      variant={showArchived ? "secondary" : "ghost"}
      onClick={onToggleArchived}
    >
      <Archive className="mr-2 h-4 w-4" />
      {showArchived ? "Ocultar arquivadas" : "Ver arquivadas"}
    </Button>
    <Button onClick={onAdd}>
      <Plus className="mr-2 h-4 w-4" />
      {i18n.t("tags.buttons.add")}
    </Button>
  </div>
);
