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
    main?: string; // Caminho para o arquivo principal de entrada do backend
  };
}

export abstract class WatinkPlugin {
  abstract manifest: PluginManifest;

  // Ciclo de vida
  abstract onInstall(): Promise<void>;
  abstract onActivate(): Promise<void>;
  abstract onDeactivate(): Promise<void>;
  abstract onUninstall(): Promise<void>;

  // Acesso ao Core (será injetado pelo host)
  protected core: any;

  setCore(core: any) {
    this.core = core;
  }
}
