export interface ProtocolListItem {
  id: number;
  protocolNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  contact?: { name: string; client?: { socialName?: string | null } | null };
}

export interface HelpdeskFiltersState {
  searchParam: string;
  statusFilter: string;
  priorityFilter: string;
}

export const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  pending: "Pendente",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const getStatusBadgeClass = (status: string): string => {
  const map: Record<string, string> = {
    open: "bg-info hover:bg-info/80 text-info-foreground",
    in_progress: "bg-warning hover:bg-warning/80 text-warning-foreground",
    pending: "bg-slate-500 hover:bg-slate-600 text-white",
    resolved: "bg-success hover:bg-success/80 text-success-foreground",
    closed: "bg-slate-700 hover:bg-slate-800 text-white",
  };
  return map[status] ?? map.open;
};

export const getPriorityBadgeClass = (priority: string): string => {
  const map: Record<string, string> = {
    low: "bg-slate-400 hover:bg-slate-500 text-white",
    medium: "bg-info hover:bg-info/80 text-info-foreground",
    high: "bg-warning hover:bg-warning/80 text-warning-foreground",
    urgent: "bg-destructive hover:bg-destructive/80 text-destructive-foreground",
  };
  return map[priority] ?? map.medium;
};
