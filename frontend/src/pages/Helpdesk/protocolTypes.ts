export interface HistoryItem {
  action: string;
  previousValue?: string;
  newValue?: string;
  comment?: string;
  createdAt: string;
  user?: { name: string };
}

export interface Protocol {
  id: number;
  protocolNumber: string;
  subject: string;
  description: string;
  category?: string;
  status: string;
  priority: string;
  token: string;
  contact?: { name: string; client?: { socialName?: string | null } | null };
  history?: HistoryItem[];
}

export interface Attachment {
  id: number;
  [key: string]: unknown;
}

export interface UpdateFormData {
  status: string;
  priority: string;
  comment: string;
}
