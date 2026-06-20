import { QueueItem, QueueAlert } from "./types";

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

export const normalizeVersion = (v: string): string =>
  String(v || "")
    .replace(/^v/i, "")
    .trim();

export const compareVersions = (a: string, b: string): number => {
  const aa = normalizeVersion(a)
    .split(".")
    .map((n) => parseInt(n || "0", 10));
  const bb = normalizeVersion(b)
    .split(".")
    .map((n) => parseInt(n || "0", 10));
  const len = Math.max(aa.length, bb.length, 3);
  for (let i = 0; i < len; i++) {
    const av = Number.isFinite(aa[i]) ? aa[i] : 0;
    const bv = Number.isFinite(bb[i]) ? bb[i] : 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
};

export const queueAlert = (queue: QueueItem, prevMessages: number): QueueAlert => {
  if (queue?.error) return { level: "error", label: "Erro" };
  if ((queue?.consumers || 0) === 0 && (queue?.messages || 0) > 0)
    return { level: "error", label: "Sem consumidor" };
  if ((queue?.messages || 0) >= 50) return { level: "error", label: "Fila alta" };
  if ((queue?.messages || 0) >= 20) return { level: "warning", label: "Atenção" };
  if (
    (queue?.messages || 0) > (prevMessages || 0) &&
    (queue?.messages || 0) >= 10
  )
    return { level: "warning", label: "Subindo" };
  return { level: "ok", label: "OK" };
};
