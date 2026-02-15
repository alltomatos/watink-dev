export interface PluginManifest {
  slug: string;
  name: string;
  version: string;
  description: string;
  type: "free" | "premium";
  category: string;
  icon?: string;
  
  // Requisitos do plugin
  dependencies?: Record<string, string>;
  
  // Definições de Frontend
  frontend?: {
    menuItems?: MenuItem[];
    routes?: RouteDefinition[];
    settingsTab?: boolean;
  };
  
  // Definições de Backend
  backend?: {
    permissions?: PermissionDefinition[];
    hooks?: string[]; // Lista de eventos que o plugin escuta
    migrationsPath?: string;
  };
}

export interface MenuItem {
  name: string;
  icon: string;
  path: string;
  permission?: string;
}

export interface RouteDefinition {
  path: string;
  component: string;
  exact?: boolean;
}

export interface PermissionDefinition {
  name: string;
  description: string;
}
