export interface ContactInfo {
  id?: number;
  name: string;
  number?: string;
  email?: string;
  lid?: string;
  profilePicUrl?: string | null;
  isGroup?: boolean;
  client?: { id: number; socialName?: string | null } | null;
}

export interface TicketInfo {
  id?: number;
  status?: string;
  isGroup?: boolean;
  contact?: ContactInfo;
  user?: { name: string } | null;
  whatsapp?: { name: string };
}
