export interface FlowWhatsapp {
  id: number;
  name: string;
}

export interface Flow {
  id: number;
  name: string;
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
