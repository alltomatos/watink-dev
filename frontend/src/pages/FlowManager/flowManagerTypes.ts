export interface FlowWhatsapp {
  id: number;
  name: string;
}

/**
 * Raw flow payload as returned by the backend (`GET /flows`).
 * The backend serializes the `active` field; the UI maps it to `isActive`.
 */
export interface FlowApi {
  id: number;
  name: string;
  active: boolean;
  updatedAt: string;
  whatsappId: number | null;
  whatsapp?: FlowWhatsapp;
}

export interface Flow {
  id: number;
  name: string;
  /** UI-facing alias of the backend `active` field. */
  isActive: boolean;
  updatedAt: string;
  whatsappId: number | null;
  whatsapp?: FlowWhatsapp;
}

export interface Whatsapp {
  id: number;
  name: string;
}

export type ViewMode = "grid" | "list";
