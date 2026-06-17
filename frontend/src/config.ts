declare global {
  interface Window {
    ENV?: Record<string, string>;
  }
}

function getConfig(name: string, defaultValue: string | null = null): string | null {
  if (typeof window !== "undefined") {
    const runtimeEnv = window.ENV;
    if (runtimeEnv && runtimeEnv[name] !== undefined) {
      return runtimeEnv[name];
    }
  }
  const value = (import.meta.env as Record<string, string>)[name];
  return value !== undefined ? value : defaultValue;
}

export function getBackendUrl(): string {
  // MODO BUSINESS: Se o backendUrl não estiver definido,
  // assume que a API está no mesmo domínio (Caminho Relativo)
  const configUrl = getConfig("VITE_BACKEND_URL");
  if (!configUrl) {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  return configUrl;
}

export function getHoursCloseTicketsAuto(): string | null {
  return getConfig("VITE_HOURS_CLOSE_TICKETS_AUTO");
}

export function getPluginManagerUrl(): string {
  return getConfig("VITE_PLUGIN_MANAGER_URL") || getBackendUrl();
}

export function getSwaggerUrl(): string {
  const backendUrl = getBackendUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const base = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;

  // Watink Business (binário único): prioriza docs no backend sob /api/v1/docs
  if (typeof window !== "undefined" && base === window.location.origin) {
    return `${base}/api/v1/docs`;
  }

  // Cenário backend separado
  return `${base}/docs`;
}
