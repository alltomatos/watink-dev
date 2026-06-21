// ---------------------------------------------------------------------------
// Pure set-algebra helpers for transfer list logic
// ---------------------------------------------------------------------------

export function not<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.indexOf(value) === -1);
}

export function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function union<T>(a: T[], b: T[]): T[] {
  return [...a, ...not(b, a)];
}

import type { Permission } from "./types";

export function filterPermissions(list: Permission[], search: string): Permission[] {
  if (!search) return list;
  const q = search.toLowerCase();
  return list.filter(
    (item) =>
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
  );
}
