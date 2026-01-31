
import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import isAuth from "../middleware/isAuth";
import * as WhatsAppController from "../controllers/WhatsAppController";
import checkPermission from "../middleware/checkPermission";
import Plugin from "../models/Plugin";
import PluginInstallation from "../models/PluginInstallation";

const pluginRoutes = Router();

import express from "express";

pluginRoutes.post("/plugins/papi/test", express.json(), isAuth, WhatsAppController.testPapiConnection);

pluginRoutes.get("/plugins/api/v1/plugins/installed", isAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        console.log(`[PluginRoutes] Fetching installed plugins for tenant: ${tenantId}`);

        const installations = await PluginInstallation.findAll({
            where: {
                tenantId,
                status: "active"
            },
            include: [
                {
                    model: Plugin,
                    attributes: ["slug"]
                }
            ]
        });

        console.log(`[PluginRoutes] Found ${installations.length} active installations`);
        installations.forEach(inst => {
            console.log(`[PluginRoutes] - Plugin: ${inst.plugin?.slug}, Status: ${inst.status}`);
        });

        const activeSlugs = installations.map(inst => inst.plugin?.slug).filter(Boolean);
        console.log(`[PluginRoutes] Returning active slugs: ${JSON.stringify(activeSlugs)}`);

        // Also check if engine-papi is active via legacy check or other means if needed
        // For now, trust the DB.

        return res.json({ active: activeSlugs });
    } catch (err) {
        console.error("Failed to fetch installed plugins locally:", err);
        return res.status(500).json({ error: "Failed to fetch plugins" });
    }
});

pluginRoutes.use(
    "/plugins",
    isAuth,
    checkPermission("marketplace:read"),
    createProxyMiddleware({
        // The target is the internal docker service name of the go plugin manager
        target: process.env.PLUGIN_MANAGER_URL || "http://plugin-manager:3005",
        changeOrigin: true,
        pathRewrite: {
            "^/plugins": "", // remove /plugins prefix when forwarding
        },
        onProxyReq: (proxyReq: any, req: any) => {
            try {
                const tenantId = req.user?.tenantId;
                const profile = req.user?.profile;
                if (tenantId) {
                    proxyReq.setHeader("x-tenant-id", tenantId.toString());
                }
                if (profile) {
                    proxyReq.setHeader("x-user-profile", profile.toString());
                }
            } catch (err) {
                console.error("Error in onProxyReq:", err);
            }
        },
        onError: (err: any, req: any, res: any) => {
            console.error("[PluginProxy] Proxy Error:", err);
            res.status(502).json({ error: "Plugin Manager Unavailable" });
        }
    } as any)
);

export default pluginRoutes;
