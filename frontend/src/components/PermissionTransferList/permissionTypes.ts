// ---------------------------------------------------------------------------
// Tipos de domínio — PermissionTransferList
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

export interface PanelProps {
  title: string;
  items: Permission[];
  checked: Permission[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (item: Permission) => void;
  onToggleAll: () => void;
}
