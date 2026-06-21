import React from "react";
import { Permission } from "../groupsTypes";
import GroupPermissionItem from "./GroupPermissionItem";

interface GroupPermissionCategoryProps {
  category: string;
  permissions: Permission[];
  selectedPermissions: string[];
  onToggle: (id: string) => void;
}

const GroupPermissionCategory: React.FC<GroupPermissionCategoryProps> = ({
  category,
  permissions,
  selectedPermissions,
  onToggle,
}) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
      {category}
    </h3>
    <div className="grid grid-cols-2 gap-2">
      {permissions.map((permission) => (
        <GroupPermissionItem
          key={permission.id}
          permission={permission}
          checked={selectedPermissions.includes(permission.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  </div>
);

export default GroupPermissionCategory;
