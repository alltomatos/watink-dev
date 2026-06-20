import React from "react";
import { Shield } from "lucide-react";
import RolePermissionTransferList from "../../../components/RolePermissionTransferList";
import { Permission } from "../roleEditTypes";

interface RolePermissionsCardProps {
  allPermissions: Permission[];
  selectedPermissions: string[];
  onChange: (ids: string[]) => void;
}

export const RolePermissionsCard: React.FC<RolePermissionsCardProps> = ({
  allPermissions,
  selectedPermissions,
  onChange,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:col-span-2">
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/20 text-info">
          <Shield className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold">Permissões</span>
      </div>
      <RolePermissionTransferList
        allPermissions={allPermissions}
        selectedPermissions={selectedPermissions}
        onChange={(ids) => onChange(ids as string[])}
      />
    </div>
  );
};
