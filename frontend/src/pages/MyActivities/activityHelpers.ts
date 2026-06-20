export const timeToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  if (!/^\d+:[0-5]\d$/.test(timeStr)) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToTime = (mins: number | null | undefined): string => {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
