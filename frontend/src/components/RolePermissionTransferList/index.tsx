import React from "react";
import { i18n } from "@/translate/i18n";
import type { RolePermissionTransferListProps } from "./types";
import { useTransferListState } from "./useTransferListState";
import { TransferPanel } from "./TransferPanel";
import { TransferControls } from "./TransferControls";

export type { Permission, RolePermissionTransferListProps } from "./types";

export default function RolePermissionTransferList({
  allPermissions = [],
  selectedPermissions = [],
  onChange,
}: RolePermissionTransferListProps) {
  const {
    checked,
    filteredLeft,
    filteredRight,
    leftChecked,
    rightChecked,
    searchLeft,
    searchRight,
    handleToggle,
    handleToggleAll,
    handleCheckedRight,
    handleCheckedLeft,
    setSearchLeft,
    setSearchRight,
  } = useTransferListState(allPermissions, selectedPermissions, onChange);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full">
      <TransferPanel
        title={i18n.t("role.permissions.available") || "Disponíveis"}
        items={filteredLeft}
        checked={checked}
        search={searchLeft}
        onSearch={setSearchLeft}
        onToggle={handleToggle}
        onToggleAll={handleToggleAll(filteredLeft)}
      />

      <TransferControls
        onMoveRight={handleCheckedRight}
        onMoveLeft={handleCheckedLeft}
        disableMoveRight={leftChecked.length === 0}
        disableMoveLeft={rightChecked.length === 0}
      />

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
  );
}
