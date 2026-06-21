/**
 * Formats a raw phone number string into a human-readable Brazilian format.
 * E.g. "558598490991" → "+55 85 98490-0991".
 * Falls back to "+<digits>" for unexpected formats.
 */
export const formatPhone = (raw?: string): string => {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const cc = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const end = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `+${cc} ${ddd} ${mid}-${end}`;
  }
  return `+${digits}`;
};

/**
 * Renders the elapsed time since a given ISO timestamp as "2h 14min".
 */
export const formatUptime = (since?: string | null): string => {
  if (!since) return "";
  const start = new Date(since).getTime();
  if (Number.isNaN(start)) return "";
  let secs = Math.floor((Date.now() - start) / 1000);
  if (secs < 0) secs = 0;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};
