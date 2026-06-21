// ---------------------------------------------------------------------------
// Domain types for RolePermissionTransferList
// ---------------------------------------------------------------------------

export interface Permission {
  id: string | number;
  name?: string;
  description?: string;
}

export interface RolePermissionTransferListProps {
  allPermissions?: Permission[];
  selectedPermissions?: Array<string | number>;
  onChange: (selectedIds: Array<string | number>) => void;
}
