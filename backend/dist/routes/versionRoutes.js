"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const versionRoutes = (0, express_1.Router)();
/**
 * @openapi
 * /version:
 *   get:
 *     summary: Retorna a versão atual do serviço Backend
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão atual do serviço e timestamp de build
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: backend
 *                 version:
 *                   type: string
 *                   example: 1.3.121
 *                 lastUpdated:
 *                   type: string
 *                   example: 2026-01-03T14:00:00.000Z
 */
versionRoutes.get("/", (req, res) => {
    let version = "0.0.0";
    try {
        const pkgPath = path_1.default.join(process.cwd(), "package.json");
        if (fs_1.default.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, "utf-8"));
            version = pkg.version;
        }
    }
    catch (e) { }
    const lastUpdated = process.env.BUILD_TIMESTAMP ||
        new Date(Number(process.env.BUILD_UNIX_TS || Date.now())).toISOString();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
        service: "backend",
        version,
        lastUpdated,
    });
});
exports.default = versionRoutes;
