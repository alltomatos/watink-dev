import type React from "react";

export interface Stats {
  messagesToday: number;
  tickets: number;
  latencyMs: number;
}

export interface WhatsApp {
  id: number;
  name: string;
  number?: string;
  status: string;
  qrcode?: string;
  pairingCode?: string;
  profilePicUrl?: string;
  keepAlive?: boolean;
  isDefault?: boolean;
  lastConnectedAt?: string | null;
  firstConnection?: string | null;
  createdAt?: string;
}

export type ConfirmationAction = "disconnect" | "delete" | null;

export interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  tone: "default" | "destructive";
  disabled?: boolean;
  onClick: () => void;
}

export interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}
