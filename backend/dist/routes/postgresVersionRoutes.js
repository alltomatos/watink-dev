"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const postgresRoutes = (0, express_1.Router)();
/**
 * @openapi
 * /postgres/version:
 *   get:
 *     summary: Retorna a versão do serviço pgvectorgis (PostgreSQL)
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do PostgreSQL
 */
postgresRoutes.get("/postgres/version", async (req, res) => {
    try {
        const [rows] = await database_1.default.query("SELECT version()");
        const versionStr = rows?.[0]?.version || "unknown";
        const lastUpdated = process.env.BUILD_TIMESTAMP ||
            new Date(Number(process.env.BUILD_UNIX_TS || Date.now())).toISOString();
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({
            service: "pgvectorgis",
            version: versionStr,
            lastUpdated,
        });
    }
    catch (e) {
        res.status(502).json({ error: "Database Unavailable" });
    }
});
exports.default = postgresRoutes;
