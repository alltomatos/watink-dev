import React, { ChangeEvent } from "react";
import { Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { i18n } from "@/translate/i18n";
import { intersection } from "./permissionHelpers";
import type { Permission } from "./types";

interface TransferPanelProps {
  title: string;
  items: Permission[];
  checked: Permission[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (item: Permission) => void;
  onToggleAll: () => void;
}

export function TransferPanel({
  title,
  items,
  checked,
  search,
  onSearch,
  onToggle,
  onToggleAll,
}: TransferPanelProps) {
  const checkedCount = intersection(checked, items).length;
  const allSelected = checkedCount === items.length && items.length > 0;
  const someSelected = checkedCount > 0 && checkedCount < items.length;

  return (
    <Card className="flex flex-col h-[500px] w-[350px] overflow-hidden border">
      <CardHeader className="flex flex-row items-center gap-3 px-4 py-3 bg-muted/40 border-b shrink-0">
        <Checkbox
          id={`toggle-all-${title}`}
          checked={allSelected}
          data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
          onCheckedChange={onToggleAll}
          disabled={items.length === 0}
          aria-label="Selecionar todos"
        />
        <div className="flex flex-col min-w-0">
          <CardTitle className="text-sm font-semibold leading-none">{title}</CardTitle>
          <span className="text-xs text-muted-foreground mt-0.5">
            {checkedCount}/{items.length}{" "}
            {i18n.t("transferList.selected") || "selecionados"}
          </span>
        </div>
      </CardHeader>

      <div className="px-3 py-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder={i18n.t("quickAnswers.searchPlaceholder") || "Pesquisar..."}
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <CardContent className="flex-1 overflow-y-auto p-0">
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6 px-4">
            {i18n.t("role.permissions.noPermissions") || "Nenhuma permissão encontrada"}
          </p>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {items.map((item) => {
              const isChecked = checked.indexOf(item) !== -1;
              const labelId = `transfer-list-role-item-${item.id}-label`;
              const displayText = item.description || item.name;
              const secondaryText = item.description ? item.name : null;

              return (
                <li
                  key={item.id}
                  role="listitem"
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => onToggle(item)}
                >
                  <Checkbox
                    id={labelId}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(item)}
                    tabIndex={-1}
                    aria-labelledby={labelId}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex flex-col min-w-0">
                    <span id={labelId} className="text-sm font-medium leading-tight truncate">
                      {displayText}
                    </span>
                    {secondaryText && (
                      <span className="text-xs text-muted-foreground truncate">
                        {secondaryText}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
