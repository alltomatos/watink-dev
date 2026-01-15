"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const pluginRoutes = (0, express_1.Router)();
pluginRoutes.use("/plugins", isAuth_1.default, (0, http_proxy_middleware_1.createProxyMiddleware)({
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
        catch (_) {
            // no-op
        }
    },
    onError: (err, req, res) => {
        console.error("Proxy Error:", err);
        res.status(502).json({ error: "Plugin Manager Unavailable" });
    }
}));
exports.default = pluginRoutes;
