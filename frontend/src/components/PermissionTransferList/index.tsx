// ---------------------------------------------------------------------------
// PermissionTransferList — orquestrador (GAP-S19)
// Decomposição: 297L → 5 módulos
// ---------------------------------------------------------------------------

import React from "react";
import { i18n } from "@/translate/i18n";
import type { PermissionTransferListProps } from "./permissionTypes";
import { usePermissionTransfer } from "./hooks/usePermissionTransfer";
import { TransferPanel } from "./components/TransferPanel";
import { TransferControls } from "./components/TransferControls";

export type { Permission, PermissionTransferListProps } from "./permissionTypes";

export default function PermissionTransferList({
  allPermissions = [],
  selectedPermissions = [],
  onChange,
}: PermissionTransferListProps) {
  const {
    checked,
    filteredLeft,
    filteredRight,
    leftChecked,
    rightChecked,
    searchLeft,
    searchRight,
    setSearchLeft,
    setSearchRight,
    handleToggle,
    handleToggleAll,
    handleCheckedRight,
    handleCheckedLeft,
  } = usePermissionTransfer({ allPermissions, selectedPermissions, onChange });

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-3 w-full">
      {/* Painel esquerdo — permissões disponíveis */}
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

      {/* Botões de transferência */}
      <TransferControls
        onMoveRight={handleCheckedRight}
        onMoveLeft={handleCheckedLeft}
        disableMoveRight={leftChecked.length === 0}
        disableMoveLeft={rightChecked.length === 0}
      />

      {/* Painel direito — permissões atribuídas */}
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
