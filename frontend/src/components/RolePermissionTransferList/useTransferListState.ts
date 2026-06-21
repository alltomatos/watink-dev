import { useState, useEffect } from "react";
import type { Permission } from "./types";
import { not, intersection, union, filterPermissions } from "./permissionHelpers";

export interface TransferListState {
  checked: Permission[];
  left: Permission[];
  right: Permission[];
  searchLeft: string;
  searchRight: string;
  filteredLeft: Permission[];
  filteredRight: Permission[];
  leftChecked: Permission[];
  rightChecked: Permission[];
  handleToggle: (item: Permission) => void;
  handleToggleAll: (items: Permission[]) => () => void;
  handleCheckedRight: () => void;
  handleCheckedLeft: () => void;
  setSearchLeft: (v: string) => void;
  setSearchRight: (v: string) => void;
}

export function useTransferListState(
  allPermissions: Permission[],
  selectedPermissions: Array<string | number>,
  onChange: (ids: Array<string | number>) => void
): TransferListState {
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

  const filteredLeft = filterPermissions(left, searchLeft);
  const filteredRight = filterPermissions(right, searchRight);

  return {
    checked,
    left,
    right,
    searchLeft,
    searchRight,
    filteredLeft,
    filteredRight,
    leftChecked,
    rightChecked,
    handleToggle,
    handleToggleAll,
    handleCheckedRight,
    handleCheckedLeft,
    setSearchLeft,
    setSearchRight,
  };
}
