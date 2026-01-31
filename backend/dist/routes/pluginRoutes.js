"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const checkPermission_1 = __importDefault(require("../middleware/checkPermission"));
const Plugin_1 = __importDefault(require("../models/Plugin"));
const PluginInstallation_1 = __importDefault(require("../models/PluginInstallation"));
const pluginRoutes = (0, express_1.Router)();
pluginRoutes.get("/plugins/api/v1/plugins/installed", isAuth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tenantId = req.user.tenantId;
        console.log(`[PluginRoutes] Fetching installed plugins for tenant: ${tenantId}`);
        const installations = yield PluginInstallation_1.default.findAll({
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
            var _a;
            console.log(`[PluginRoutes] - Plugin: ${(_a = inst.plugin) === null || _a === void 0 ? void 0 : _a.slug}, Status: ${inst.status}`);
        });
        const activeSlugs = installations.map(inst => { var _a; return (_a = inst.plugin) === null || _a === void 0 ? void 0 : _a.slug; }).filter(Boolean);
        console.log(`[PluginRoutes] Returning active slugs: ${JSON.stringify(activeSlugs)}`);
        // Also check if engine-papi is active via legacy check or other means if needed
        // For now, trust the DB.
        return res.json({ active: activeSlugs });
    }
    catch (err) {
        console.error("Failed to fetch installed plugins locally:", err);
        return res.status(500).json({ error: "Failed to fetch plugins" });
    }
}));
pluginRoutes.use("/plugins", isAuth_1.default, (0, checkPermission_1.default)("marketplace:read"), (0, http_proxy_middleware_1.createProxyMiddleware)({
    // The target is the internal docker service name of the go plugin manager
    target: process.env.PLUGIN_MANAGER_URL || "http://plugin-manager:3005",
    changeOrigin: true,
    pathRewrite: {
        "^/plugins": "", // remove /plugins prefix when forwarding
    },
    onProxyReq: (proxyReq, req) => {
        var _a, _b;
        try {
            const tenantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId;
            const profile = (_b = req.user) === null || _b === void 0 ? void 0 : _b.profile;
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
