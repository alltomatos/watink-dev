import React from "react";
import { Shield } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import PermissionTransferList from "../../../components/PermissionTransferList";
import type { Permission } from "../groupEditTypes";

interface GroupPermissionsCardProps {
  allPermissions: Permission[];
  selectedPermissions: string[];
  onChange: (ids: string[]) => void;
}

const GroupPermissionsCard: React.FC<GroupPermissionsCardProps> = ({
  allPermissions,
  selectedPermissions,
  onChange,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:col-span-2">
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/20 text-warning">
          <Shield className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold">Permissões</span>
        <Badge variant="outline" className="ml-auto">
          {selectedPermissions.length}/{allPermissions.length}
        </Badge>
      </div>
      <PermissionTransferList
        allPermissions={allPermissions}
        selectedPermissions={selectedPermissions}
        onChange={(ids) => onChange(ids as string[])}
      />
    </div>
  );
};

export default GroupPermissionsCard;
