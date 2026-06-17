import React, { useState, useEffect, ChangeEvent } from "react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { i18n } from "@/translate/i18n";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Permission {
  id: string | number;
  name?: string;
  description?: string;
  resource?: string;
  action?: string;
}

export interface PermissionTransferListProps {
  allPermissions?: Permission[];
  selectedPermissions?: Array<string | number>;
  onChange: (selectedIds: Array<string | number>) => void;
}

// ---------------------------------------------------------------------------
// Pure set-algebra helpers (identical to the original JS implementation)
// ---------------------------------------------------------------------------

function not<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.indexOf(value) !== -1);
}

function union<T>(a: T[], b: T[]): T[] {
  return [...a, ...not(b, a)];
}

// ---------------------------------------------------------------------------
// Sub-component: one panel of the transfer list
// ---------------------------------------------------------------------------

interface PanelProps {
  title: string;
  items: Permission[];
  checked: Permission[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (item: Permission) => void;
  onToggleAll: () => void;
}

function TransferPanel({
  title,
  items,
  checked,
  search,
  onSearch,
  onToggle,
  onToggleAll,
}: PanelProps) {
  const checkedCount = intersection(checked, items).length;
  const allSelected = checkedCount === items.length && items.length > 0;
  const someSelected = checkedCount > 0 && checkedCount < items.length;

  return (
    <Card className="flex flex-col h-[500px] w-full overflow-hidden border">
      {/* Header: select-all checkbox + title + counter */}
      <CardHeader className="flex flex-row items-center gap-3 px-4 py-3 bg-muted/40 border-b shrink-0">
        <Checkbox
          id={`toggle-all-${title}`}
          checked={allSelected}
          // shadcn Checkbox does not expose indeterminate via prop directly;
          // we apply the data attribute so the CSS pseudo-element renders it.
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

      {/* Search bar */}
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

      {/* Scrollable list */}
      <CardContent className="flex-1 overflow-y-auto p-0">
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6 px-4">
            {i18n.t("role.permissions.noPermissions") || "Nenhuma permissão encontrada"}
          </p>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {items.map((item) => {
              const isChecked = checked.indexOf(item) !== -1;
              const labelId = `transfer-list-item-${item.id}-label`;
              const displayText =
                item.name ||
                item.description ||
                (item.resource ? `${item.resource}:${item.action}` : `ID: ${item.id}`);
              const secondaryText =
                item.name && item.description
                  ? item.description
                  : item.resource
                  ? `${item.resource}:${item.action}`
                  : null;

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
                    <span
                      id={labelId}
                      className="text-sm font-medium leading-tight truncate"
                    >
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PermissionTransferList({
  allPermissions = [],
  selectedPermissions = [],
  onChange,
}: PermissionTransferListProps) {
  const [checked, setChecked] = useState<Permission[]>([]);
  const [left, setLeft] = useState<Permission[]>([]);
  const [right, setRight] = useState<Permission[]>([]);
  const [searchLeft, setSearchLeft] = useState("");
  const [searchRight, setSearchRight] = useState("");

  useEffect(() => {
    const assignedIds = new Set(selectedPermissions);
    setLeft(allPermissions.filter((p) => !assignedIds.has(p.id)));
    setRight(allPermissions.filter((p) => assignedIds.has(p.id)));
  }, [allPermissions, selectedPermissions]);

  const leftChecked = intersection(checked, left);
  const rightChecked = intersection(checked, right);

  const handleToggle = (value: Permission) => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];
    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setChecked(newChecked);
  };

  const handleToggleAll = (items: Permission[]) => () => {
    const checkedCount = intersection(checked, items).length;
    if (checkedCount === items.length) {
      setChecked(not(checked, items));
    } else {
      setChecked(union(checked, items));
    }
  };

  const handleCheckedRight = () => {
    const newRight = right.concat(leftChecked);
    const newLeft = not(left, leftChecked);
    setRight(newRight);
    setLeft(newLeft);
    setChecked(not(checked, leftChecked));
    onChange(newRight.map((p) => p.id));
  };

  const handleCheckedLeft = () => {
    const newLeft = left.concat(rightChecked);
    const newRight = not(right, rightChecked);
    setLeft(newLeft);
    setRight(newRight);
    setChecked(not(checked, rightChecked));
    onChange(newRight.map((p) => p.id));
  };

  const getFilteredList = (list: Permission[], search: string): Permission[] => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.resource && item.resource.toLowerCase().includes(q)) ||
        (item.action && item.action.toLowerCase().includes(q))
    );
  };

  const filteredLeft = getFilteredList(left, searchLeft);
  const filteredRight = getFilteredList(right, searchRight);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-3 w-full">
      {/* Left panel — available permissions */}
      <div className="w-full md:flex-1">
        <TransferPanel
          title={i18n.t("role.permissions.available") || "Disponíveis"}
          items={filteredLeft}
          checked={checked}
          search={searchLeft}
          onSearch={setSearchLeft}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll(filteredLeft)}
        />
      </div>

      {/* Action buttons column */}
      <div className="flex flex-row md:flex-col items-center gap-2 shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={handleCheckedRight}
          disabled={leftChecked.length === 0}
          aria-label="Mover selecionados para a direita"
          className="w-9 h-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleCheckedLeft}
          disabled={rightChecked.length === 0}
          aria-label="Mover selecionados para a esquerda"
          className="w-9 h-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Right panel — assigned permissions */}
      <div className="w-full md:flex-1">
        <TransferPanel
          title={i18n.t("role.permissions.assigned") || "Atribuídas"}
          items={filteredRight}
          checked={checked}
          search={searchRight}
          onSearch={setSearchRight}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll(filteredRight)}
        />
      </div>
    </div>
  );
}
