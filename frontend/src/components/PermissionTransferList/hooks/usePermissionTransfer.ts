// ---------------------------------------------------------------------------
// Hook — lógica de estado do PermissionTransferList
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import type { Permission } from "../permissionTypes";
import { not, intersection, union, filterPermissions } from "../permissionHelpers";

interface UsePermissionTransferOptions {
  allPermissions: Permission[];
  selectedPermissions: Array<string | number>;
  onChange: (selectedIds: Array<string | number>) => void;
}

export interface UsePermissionTransferReturn {
  checked: Permission[];
  left: Permission[];
  right: Permission[];
  filteredLeft: Permission[];
  filteredRight: Permission[];
  leftChecked: Permission[];
  rightChecked: Permission[];
  searchLeft: string;
  searchRight: string;
  setSearchLeft: (v: string) => void;
  setSearchRight: (v: string) => void;
  handleToggle: (item: Permission) => void;
  handleToggleAll: (items: Permission[]) => () => void;
  handleCheckedRight: () => void;
  handleCheckedLeft: () => void;
}

export function usePermissionTransfer({
  allPermissions,
  selectedPermissions,
  onChange,
}: UsePermissionTransferOptions): UsePermissionTransferReturn {
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

  const filteredLeft = filterPermissions(left, searchLeft);
  const filteredRight = filterPermissions(right, searchRight);

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

  return {
    checked,
    left,
    right,
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
  };
}
