export interface Group {
  id: number;
  name: string;
}

export type GroupsAction =
  | { type: "LOAD_GROUPS"; payload: Group[] }
  | { type: "UPDATE_GROUPS"; payload: Group }
  | { type: "DELETE_GROUP"; payload: number }
  | { type: "RESET" };

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface GroupFormValues {
  name: string;
}

export const CATEGORY_MAP: Record<string, string> = {
  contacts: "Contatos",
  tickets: "Tickets",
  users: "Usuários",
  groups: "Grupos",
  quick_answers: "Respostas Rápidas",
  flows: "Flow Builder",
  knowledge_bases: "Base de Conhecimento",
  connections: "Conexões",
  queues: "Filas",
  settings: "Configurações",
  dashboard: "Dashboard",
  pipelines: "Pipelines",
  swagger: "Desenvolvedor",
  clients: "Clientes",
  helpdesk: "Helpdesk",
  marketplace: "Marketplace",
};

export const categoryOf = (name: string): string => {
  for (const [key, label] of Object.entries(CATEGORY_MAP)) {
    if (name.includes(key)) return label;
  }
  return "Outros";
};

export const groupPermissions = (
  perms: Permission[]
): Record<string, Permission[]> => {
  const grouped: Record<string, Permission[]> = {};
  perms.forEach((p) => {
    const cat = categoryOf(p.name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });
  return grouped;
};
