/**
 * Types for the Connections list page (index.tsx and sub-components).
 * Connection-config-specific types live in connectionConfigTypes.ts.
 */

export interface ConnectionQueue {
  name: string;
}

export interface ConnectionSession {
  id: number;
  name: string;
  number?: string;
  status: "CONNECTED" | "DISCONNECTED" | "QRCODE" | "PAIRING" | "OPENING" | "TIMEOUT" | string;
  profilePicUrl?: string;
  type?: string;
  updatedAt?: string;
  queue?: ConnectionQueue;
}

export const STATUS_LABELS: Record<string, string> = {
  CONNECTED: "Conectado",
  DISCONNECTED: "Desconectado",
  QRCODE: "Escanear QR Code",
  PAIRING: "Pareando",
  OPENING: "Iniciando...",
  TIMEOUT: "Tempo Esgotado",
  BANNED: "Banido",
};
