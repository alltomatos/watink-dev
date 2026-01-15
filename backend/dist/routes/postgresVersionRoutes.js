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
postgresRoutes.get("/postgres/version", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const [rows] = yield database_1.default.query("SELECT version()");
        const versionStr = ((_a = rows === null || rows === void 0 ? void 0 : rows[0]) === null || _a === void 0 ? void 0 : _a.version) || "unknown";
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
}));
exports.default = postgresRoutes;
