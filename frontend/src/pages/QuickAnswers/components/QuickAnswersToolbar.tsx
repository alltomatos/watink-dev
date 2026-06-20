import React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { i18n } from "../../../translate/i18n";

interface QuickAnswersToolbarProps {
  searchParam: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdd: () => void;
}

export const QuickAnswersToolbar = ({
  searchParam,
  onSearch,
  onAdd,
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
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        {i18n.t("quickAnswers.buttons.add")}
      </Button>
    </div>
  );
};
