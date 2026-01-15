"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const WhatsAppSessionController_1 = __importDefault(require("../controllers/WhatsAppSessionController"));
const whatsappSessionRoutes = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: WhatsAppSession
 *   description: Gerenciamento de Sessões WhatsApp (Engine)
 */
/**
 * @swagger
 * /whatsappsession/{whatsappId}:
 *   post:
 *     summary: Inicia uma sessão WhatsApp
 *     description: |
 *       Envia comando para o Engine (whaileys-engine) via RabbitMQ para iniciar
 *       uma nova sessão. O Engine retornará eventos de QR Code via WebSocket.
 *
 *       **Fluxo:**
 *       1. Backend publica `session.start` na fila `wbot.commands`
 *       2. Engine consome e inicia conexão WhatsApp
 *       3. Engine publica `session.qrcode` na fila `wbot.events`
 *       4. Backend emite QR Code via Socket.IO
 *     tags: [WhatsAppSession]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da conexão WhatsApp a ser iniciada
 *     responses:
 *       200:
 *         description: Comando de início enviado ao Engine
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session start command sent
 */
whatsappSessionRoutes.post("/whatsappsession/all", isAuth_1.default, WhatsAppSessionController_1.default.restartAll);
whatsappSessionRoutes.post("/whatsappsession/:whatsappId", isAuth_1.default, WhatsAppSessionController_1.default.store);
whatsappSessionRoutes.put("/whatsappsession/:whatsappId", isAuth_1.default, WhatsAppSessionController_1.default.update);
whatsappSessionRoutes.delete("/whatsappsession/:whatsappId", isAuth_1.default, WhatsAppSessionController_1.default.remove);
exports.default = whatsappSessionRoutes;
