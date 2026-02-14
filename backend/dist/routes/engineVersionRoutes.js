"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const engineRoutes = (0, express_1.Router)();
/**
 * @openapi
 * /engine/version:
 *   get:
 *     summary: Retorna a versão do serviço Whaileys Engine
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do Engine
 */
engineRoutes.get("/engine/version", async (req, res) => {
    try {
        const engineUrl = process.env.ENGINE_STANDARD_URL || "http://whaileys-engine:3334";
        const { data } = await axios_1.default.get(`${engineUrl}/version`, {
            headers: { "Cache-Control": "no-store" },
            timeout: 1500,
        });
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json(data);
    }
    catch (e) {
        res.status(502).json({ error: "Engine Unavailable" });
    }
});
/**
 * @openapi
 * /webchat/version:
 *   get:
 *     summary: Retorna a versão do serviço Webchat Engine
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do Webchat Engine
 */
engineRoutes.get("/webchat/version", async (req, res) => {
    try {
        const { data } = await axios_1.default.get("http://engine-webchat:3335/version", {
            headers: { "Cache-Control": "no-store" },
            timeout: 1500,
        });
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json(data);
    }
    catch (e) {
        res.status(502).json({ error: "Webchat Engine Unavailable" });
    }
});
exports.default = engineRoutes;
