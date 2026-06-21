export interface HistoryEntry {
  id: string;
  action: string;
  comment?: string;
  changes?: string;
  createdAt: string;
  user?: { name: string };
}

export interface Protocol {
  protocolNumber: string;
  status: string;
  priority: string;
  subject: string;
  description?: string;
  category?: string;
  createdAt: string;
  tenant?: { name: string };
  history: HistoryEntry[];
}
