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
const express_1 = __importDefault(require("express"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const WhatsAppController = __importStar(require("../controllers/WhatsAppController"));
const whatsappRoutes = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: Gerenciamento de Conexões WhatsApp
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     WhatsApp:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único da conexão
 *         name:
 *           type: string
 *           description: Nome da conexão
 *         session:
 *           type: string
 *           description: ID da sessão
 *         qrcode:
 *           type: string
 *           description: QR Code em base64 (quando disponível)
 *         status:
 *           type: string
 *           enum: [DISCONNECTED, OPENING, qrcode, CONNECTED, TIMEOUT]
 *           description: Status da conexão
 *         isDefault:
 *           type: boolean
 *           description: Se é a conexão padrão
 *         retries:
 *           type: integer
 *           description: Número de tentativas de reconexão
 *         greetingMessage:
 *           type: string
 *           description: Mensagem de saudação
 *         farewellMessage:
 *           type: string
 *           description: Mensagem de despedida
 *         tenantId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /whatsapp:
 *   get:
 *     summary: Lista todas as conexões WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de conexões
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WhatsApp'
 */
whatsappRoutes.get("/whatsapp/", isAuth_1.default, WhatsAppController.index);
/**
 * @swagger
 * /whatsapp:
 *   post:
 *     summary: Cria uma nova conexão WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da conexão
 *               isDefault:
 *                 type: boolean
 *                 description: Define como conexão padrão
 *               greetingMessage:
 *                 type: string
 *               farewellMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conexão criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhatsApp'
 */
whatsappRoutes.post("/whatsapp/", isAuth_1.default, WhatsAppController.store);
/**
 * @swagger
 * /whatsapp/{whatsappId}:
 *   get:
 *     summary: Busca uma conexão WhatsApp por ID
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da conexão
 *     responses:
 *       200:
 *         description: Conexão encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhatsApp'
 *       404:
 *         description: Conexão não encontrada
 */
whatsappRoutes.get("/whatsapp/:whatsappId", isAuth_1.default, WhatsAppController.show);
/**
 * @swagger
 * /whatsapp/{whatsappId}:
 *   put:
 *     summary: Atualiza uma conexão WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               greetingMessage:
 *                 type: string
 *               farewellMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conexão atualizada com sucesso
 */
whatsappRoutes.put("/whatsapp/:whatsappId", isAuth_1.default, WhatsAppController.update);
/**
 * @swagger
 * /whatsapp/{whatsappId}:
 *   delete:
 *     summary: Remove uma conexão WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conexão removida com sucesso
 */
whatsappRoutes.delete("/whatsapp/:whatsappId", isAuth_1.default, WhatsAppController.remove);
exports.default = whatsappRoutes;
