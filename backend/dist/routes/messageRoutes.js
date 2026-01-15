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
const multer_1 = __importDefault(require("multer"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const isAuditor_1 = __importDefault(require("../middleware/isAuditor"));
const upload_1 = __importDefault(require("../config/upload"));
const MessageController = __importStar(require("../controllers/MessageController"));
const messageRoutes = (0, express_1.Router)();
const upload = (0, multer_1.default)(upload_1.default);
/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Gerenciamento de Mensagens (via Engine)
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único da mensagem
 *         body:
 *           type: string
 *           description: Conteúdo da mensagem
 *         ack:
 *           type: integer
 *           enum: [0, 1, 2, 3]
 *           description: Status de leitura (0=pendente, 1=enviado, 2=entregue, 3=lido)
 *         fromMe:
 *           type: boolean
 *           description: Se foi enviada pelo atendente
 *         mediaUrl:
 *           type: string
 *           description: URL da mídia (se houver)
 *         mediaType:
 *           type: string
 *           enum: [image, audio, video, document]
 *         ticketId:
 *           type: integer
 *         contactId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /messages/{ticketId}:
 *   get:
 *     summary: Lista mensagens de um ticket
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *         description: Número da página para paginação
 *     responses:
 *       200:
 *         description: Lista de mensagens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 ticket:
 *                   type: object
 *                 count:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 */
messageRoutes.get("/messages/:ticketId", isAuth_1.default, MessageController.index);
/**
 * @swagger
 * /messages/{ticketId}:
 *   post:
 *     summary: Envia uma mensagem via Engine
 *     description: |
 *       Envia uma mensagem de texto ou mídia via WhatsApp.
 *       O Backend publica comando na fila `wbot.commands` e o Engine processa.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *                 description: Texto da mensagem
 *               medias:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Arquivos de mídia (imagens, áudios, documentos)
 *     responses:
 *       200:
 *         description: Mensagem enviada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
messageRoutes.post("/messages/:ticketId", isAuth_1.default, isAuditor_1.default, upload.array("medias"), MessageController.store);
/**
 * @swagger
 * /messages/{messageId}:
 *   delete:
 *     summary: Remove uma mensagem
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mensagem removida
 */
messageRoutes.delete("/messages/:messageId", isAuth_1.default, MessageController.remove);
exports.default = messageRoutes;
