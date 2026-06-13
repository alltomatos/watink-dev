import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes CSS de forma segura usando clsx + tailwind-merge.
 * Resolve conflitos de classes Tailwind (ex: "p-4 p-2" → "p-2").
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
