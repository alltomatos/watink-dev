import { Request, Response, NextFunction } from "express";
import axios from "axios";
import AppError from "../errors/AppError";

const PLUGIN_MANAGER_URL = process.env.PLUGIN_MANAGER_URL || "http://plugin-manager:8081";

// Cache simples em memória (TTL de 5 minutos para não bater no manager toda hora)
const licenseCache: { [key: string]: { plugins: string[], timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const ensurePluginLicense = (pluginSlug: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
            throw new AppError("ERR_TENANT_NOT_FOUND", 403);
        }

        try {
            const now = Date.now();
            const cacheKey = `tenant-${tenantId}`;

            // 1. Verificar Cache
            if (licenseCache[cacheKey] && (now - licenseCache[cacheKey].timestamp < CACHE_TTL)) {
                if (licenseCache[cacheKey].plugins.includes(pluginSlug)) {
                    return next();
                }
                throw new AppError(`Plugin '${pluginSlug}' not licensed for this tenant.`, 402);
            }

            // 2. Consultar Plugin Manager
            // O manager já sabe lidar com o InstanceID localmente.
            const response = await axios.get(`${PLUGIN_MANAGER_URL}/api/v1/plugins/installed`, {
                headers: { 'x-tenant-id': tenantId.toString() }
            });

            const activePlugins = response.data.active || [];

            // 3. Atualizar Cache
            licenseCache[cacheKey] = {
                plugins: activePlugins,
                timestamp: now
            };

            // 4. Validar
            if (activePlugins.includes(pluginSlug)) {
                return next();
            }

            throw new AppError(`Plugin '${pluginSlug}' not licensed for this tenant.`, 402);

        } catch (error) {
            if (error instanceof AppError) throw error;
            
            console.error("License Check Error:", error.message);
            // Em caso de erro no Manager, bloqueamos por segurança ou liberamos (conforme política)
            // Aqui estamos bloqueando para garantir a monetização.
            throw new AppError("License validation service unavailable.", 503);
        }
    };
};

export default ensurePluginLicense;
