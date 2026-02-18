"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const TenantSubscription_1 = __importDefault(require("../models/TenantSubscription"));
const pluginRoutes = (0, express_1.Router)();
pluginRoutes.use("/plugins", isAuth_1.default, (0, http_proxy_middleware_1.createProxyMiddleware)({
    // The target is the internal docker service name of the go plugin manager
    target: process.env.PLUGIN_MANAGER_URL || "http://plugin-manager:3005",
    changeOrigin: true,
    pathRewrite: {
        "^/plugins": "", // remove /plugins prefix when forwarding
    },
    onProxyReq: async (proxyReq, req) => {
        try {
            const tenantId = req.user?.tenantId;
            const profile = req.user?.profile;
            const email = req.user?.email;
            const name = req.user?.name;
            if (tenantId) {
                proxyReq.setHeader("x-tenant-id", tenantId.toString());
                // Buscar quota real do tenant no banco local
                const sub = await TenantSubscription_1.default.findOne({ where: { tenantId } });
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
        }
        catch (err) {
            console.error("Error setting proxy headers:", err);
        }
    },
    onError: (err, req, res) => {
        console.error("Proxy Error:", err);
        res.status(502).json({ error: "Plugin Manager Unavailable" });
    }
}));
exports.default = pluginRoutes;
