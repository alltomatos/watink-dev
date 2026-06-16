import { getBackendUrl as getBackendUrlFromConfig } from "../config";

export const getBackendUrl = (url?: string): string | undefined => {
  if (!url) return url;

  const backendUrl = getBackendUrlFromConfig() || "/";

  if (url.includes("/public/")) {
    const parts = url.split("/public/");
    const relativePath = `public/${parts[1]}`;
    const safeBackendUrl = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
    return `${safeBackendUrl}${relativePath}`;
  }

  if (url.startsWith("/") && !url.startsWith("http")) {
    const safeBackendUrl = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
    const cleanUrl = url.substring(1);
    return `${safeBackendUrl}${cleanUrl}`;
  }

  return url;
};
