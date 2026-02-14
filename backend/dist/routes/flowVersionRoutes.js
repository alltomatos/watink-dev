"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const flowRoutes = (0, express_1.Router)();
/**
 * @openapi
 * /flow/version:
 *   get:
 *     summary: Retorna a versão do serviço Flow Worker
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do Flow Worker
 */
flowRoutes.get("/flow/version", async (req, res) => {
    try {
        const flowEngineUrl = process.env.FLOW_ENGINE_URL || "http://flow-engine-worker:3336";
        const { data } = await axios_1.default.get(`${flowEngineUrl}/version`, {
            headers: { "Cache-Control": "no-store" },
            timeout: 1500,
        });
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json(data);
    }
    catch (e) {
        res.status(502).json({ error: "Flow Worker Unavailable" });
    }
});
exports.default = flowRoutes;
