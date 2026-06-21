// ---------------------------------------------------------------------------
// Helpers de álgebra de conjuntos — PermissionTransferList
// ---------------------------------------------------------------------------

import type { Permission } from "./permissionTypes";

export function not<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.indexOf(value) === -1);
}

export function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function union<T>(a: T[], b: T[]): T[] {
  return [...a, ...not(b, a)];
}

export function filterPermissions(list: Permission[], search: string): Permission[] {
  if (!search) return list;
  const q = search.toLowerCase();
  return list.filter(
    (item) =>
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.resource && item.resource.toLowerCase().includes(q)) ||
      (item.action && item.action.toLowerCase().includes(q))
  );
}
