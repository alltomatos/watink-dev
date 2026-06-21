import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Permission } from "../groupsTypes";

interface GroupPermissionItemProps {
  permission: Permission;
  checked: boolean;
  onToggle: (id: string) => void;
}

const GroupPermissionItem: React.FC<GroupPermissionItemProps> = ({
  permission,
  checked,
  onToggle,
}) => (
  <label
    className="flex items-start gap-2.5 rounded-md border border-border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors"
  >
    <Checkbox
      id={`perm-${permission.id}`}
      checked={checked}
      onCheckedChange={() => onToggle(permission.id)}
    />
    <span className="text-sm leading-tight pt-0.5">
      {permission.description || permission.name}
    </span>
  </label>
);

export default GroupPermissionItem;
