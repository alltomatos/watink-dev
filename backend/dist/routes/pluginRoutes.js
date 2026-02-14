"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const WhatsAppController = __importStar(require("../controllers/WhatsAppController"));
const checkPermission_1 = __importDefault(require("../middleware/checkPermission"));
const Plugin_1 = __importDefault(require("../models/Plugin"));
const PluginInstallation_1 = __importDefault(require("../models/PluginInstallation"));
const pluginRoutes = (0, express_1.Router)();
const express_2 = __importDefault(require("express"));
pluginRoutes.post("/plugins/papi/test", express_2.default.json(), isAuth_1.default, WhatsAppController.testPapiConnection);
pluginRoutes.get("/plugins/api/v1/plugins/installed", isAuth_1.default, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        console.log(`[PluginRoutes] Fetching installed plugins for tenant: ${tenantId}`);
        const installations = await PluginInstallation_1.default.findAll({
            where: {
                tenantId,
                status: "active"
            },
            include: [
                {
                    model: Plugin_1.default,
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
    }
    catch (err) {
        console.error("Failed to fetch installed plugins locally:", err);
        return res.status(500).json({ error: "Failed to fetch plugins" });
    }
});
pluginRoutes.use("/plugins", isAuth_1.default, (0, checkPermission_1.default)("marketplace:read"), (0, http_proxy_middleware_1.createProxyMiddleware)({
    // The target is the internal docker service name of the go plugin manager
    target: process.env.PLUGIN_MANAGER_URL || "http://plugin-manager:8081",
    changeOrigin: true,
    pathRewrite: {
        "^/plugins": "", // remove /plugins prefix when forwarding
    },
    onProxyReq: (proxyReq, req) => {
        try {
            const tenantId = req.user?.tenantId;
            const profile = req.user?.profile;
            if (tenantId) {
                proxyReq.setHeader("x-tenant-id", tenantId.toString());
            }
            if (profile) {
                proxyReq.setHeader("x-user-profile", profile.toString());
            }
        }
        catch (err) {
            console.error("Error in onProxyReq:", err);
        }
    },
    onError: (err, req, res) => {
        console.error("[PluginProxy] Proxy Error:", err);
        res.status(502).json({ error: "Plugin Manager Unavailable" });
    }
}));
exports.default = pluginRoutes;
