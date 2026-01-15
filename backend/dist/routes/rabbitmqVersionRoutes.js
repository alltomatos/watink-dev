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
const axios_1 = __importDefault(require("axios"));
const rabbitRoutes = (0, express_1.Router)();
/**
 * @openapi
 * /rabbitmq/version:
 *   get:
 *     summary: Retorna a versão do serviço RabbitMQ
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do RabbitMQ
 */
rabbitRoutes.get("/rabbitmq/version", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const amqp = process.env.AMQP_URL || "amqp://guest:guest@rabbitmq:5672";
        const m = amqp.match(/amqp:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?/);
        const user = (m === null || m === void 0 ? void 0 : m[1]) || "guest";
        const pass = (m === null || m === void 0 ? void 0 : m[2]) || "guest";
        const host = (m === null || m === void 0 ? void 0 : m[3]) || "rabbitmq";
        const mgmt = `http://${host}:15672/api/overview`;
        const { data } = yield axios_1.default.get(mgmt, {
            auth: { username: user, password: pass },
            headers: { "Cache-Control": "no-store" },
            timeout: 1500,
        });
        const versionStr = (data === null || data === void 0 ? void 0 : data.rabbitmq_version) || "unknown";
        const lastUpdated = process.env.BUILD_TIMESTAMP ||
            new Date(Number(process.env.BUILD_UNIX_TS || Date.now())).toISOString();
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({
            service: "rabbitmq",
            version: versionStr,
            lastUpdated,
        });
    }
    catch (e) {
        res.status(502).json({ error: "RabbitMQ Unavailable" });
    }
}));
exports.default = rabbitRoutes;
