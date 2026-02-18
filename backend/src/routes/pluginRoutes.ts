
import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import isAuth from "../middleware/isAuth";
import TenantSubscription from "../models/TenantSubscription";

const pluginRoutes = Router();

pluginRoutes.use(
    "/plugins",
    isAuth,
    createProxyMiddleware({
        // The target is the internal docker service name of the go plugin manager
        target: process.env.PLUGIN_MANAGER_URL || "http://plugin-manager:3005",
        changeOrigin: true,
        pathRewrite: {
            "^/plugins": "", // remove /plugins prefix when forwarding
        },
        onProxyReq: async (proxyReq: any, req: any) => {
            try {
                const tenantId = req.user?.tenantId;
                const profile = req.user?.profile;
                const email = req.user?.email;
                const name = req.user?.name;

                if (tenantId) {
                    proxyReq.setHeader("x-tenant-id", tenantId.toString());
                    
                    // Buscar quota real do tenant no banco local
                    const sub = await TenantSubscription.findOne({ where: { tenantId } });
                    if (sub) {
                        proxyReq.setHeader("x-tenant-quota", sub.pluginQuota.toString());
                        proxyReq.setHeader("x-tenant-status", sub.status);
                    }
                }
                
                if (profile) {
                    proxyReq.setHeader("x-user-profile", profile.toString());
                }
                if (email) {
                    proxyReq.setHeader("x-user-email", email.toString());
                }
                if (name) {
                    proxyReq.setHeader("x-user-name", name.toString());
                }
            } catch (err) {
                console.error("Error setting proxy headers:", err);
            }
        },
        onError: (err: any, req: any, res: any) => {
            console.error("Proxy Error:", err);
            res.status(502).json({ error: "Plugin Manager Unavailable" });
        }
    } as any)
);

export default pluginRoutes;
