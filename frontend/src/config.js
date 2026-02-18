/* @jsxImportSource react */
function getConfig(name, defaultValue = null) {
  if (typeof window !== "undefined") {
    const runtimeEnv = window.ENV;
    if (runtimeEnv && runtimeEnv[name] !== undefined) {
      return runtimeEnv[name];
    }
  }
  const value = import.meta.env[name];
  return value !== undefined ? value : defaultValue;
}

export function getBackendUrl() {
  // MODO INDUSTRIAL: Se o backendUrl não estiver definido, 
  // assume que a API está no mesmo domínio (Caminho Relativo)
  const configUrl = getConfig("VITE_BACKEND_URL");
  if (!configUrl) {
    // Retorna a URL base do navegador removendo a barra final se houver
    return window.location.origin;
  }
  return configUrl;
}

export function getHoursCloseTicketsAuto() {
  return getConfig("VITE_HOURS_CLOSE_TICKETS_AUTO");
}

export function getPluginManagerUrl() {
  return getConfig("VITE_PLUGIN_MANAGER_URL") || getBackendUrl();
}

export function getSwaggerUrl() {
  const explicitSwaggerUrl = getConfig("VITE_SWAGGER_URL");
  if (explicitSwaggerUrl) return explicitSwaggerUrl;

  const backendUrl = getBackendUrl() || "";
  const base = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;

  // Se backend aponta para o mesmo host do frontend, evitar /docs (SPA) e tentar /api/docs
  if (typeof window !== "undefined" && base === window.location.origin) {
    return `${base}/api/docs`;
  }

  return `${base}/docs`;
}
