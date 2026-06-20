import { parseISO } from "date-fns";
import { Message, QuotedMsg } from "../types";

export const PARTICIPANT_COLORS = [
  "var(--status-warning)",
  "var(--status-error)",
  "var(--text-muted)",
  "var(--action-primary)",
  "var(--status-success)",
  "var(--status-info)",
];

export const parseData = (
  raw: string | Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
};

export const isDateValid = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const date = parseISO(dateStr);
  return !isNaN(date.getTime()) && date.getFullYear() > 2000;
};

export const getSenderKey = (
  m: Message | undefined,
  isGroup?: boolean
): string => {
  if (!m) return "unknown";
  if (m.fromMe) return "me";
  if (isGroup) {
    const d = parseData(m.dataJson);
    return (
      (m.participant as string) ||
      (d.participant as string) ||
      (d.senderLid as string) ||
      (d.pushName as string) ||
      "unknown"
    );
  }
  return "other";
};

export const getMessageBody = (message: Message | QuotedMsg): string => {
  if (message.mediaType === "location") return "Localização";
  if (message.mediaType === "vcard") return "Contato";
  if (message.mediaType === "carousel") return "Carrossel";
  return message.body ?? "";
};

export const getFileNameFromUrl = (url?: string): string => {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf("/") + 1);
  } catch {
    return url;
  }
};
