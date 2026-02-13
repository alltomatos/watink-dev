import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as WhatsAppGroupController from "../controllers/WhatsAppGroupController";

const waGroupRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: WhatsApp Groups
 *   description: Gestão de grupos WhatsApp
 */

/**
 * @swagger
 * /wa-groups:
 *   get:
 *     summary: Lista grupos WhatsApp conectados
 *     tags: [WhatsApp Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de grupos
 *         content:
 *           application/json:
 *             example:
 *               - id: "120363012345678901@g.us"
 *                 subject: "Time Comercial"
 *                 participantsCount: 12
 *                 updatedAt: "2026-02-13T10:00:00.000Z"
 */
waGroupRoutes.get("/wa-groups", isAuth, WhatsAppGroupController.index);

/**
 * @swagger
 * /wa-groups/{groupId}:
 *   get:
 *     summary: Detalhes de um grupo WhatsApp
 *     tags: [WhatsApp Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do grupo
 *       404:
 *         description: Grupo não encontrado
 */
waGroupRoutes.get("/wa-groups/:groupId", isAuth, WhatsAppGroupController.show);

/**
 * @swagger
 * /wa-groups/{groupId}/participants:
 *   get:
 *     summary: Lista participantes do grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Participantes
 *         content:
 *           application/json:
 *             example:
 *               - participantJid: "5511999998888@s.whatsapp.net"
 *                 participantName: "Maria"
 *                 isAdmin: false
 *                 isSuperAdmin: false
 */
waGroupRoutes.get("/wa-groups/:groupId/participants", isAuth, WhatsAppGroupController.participants);

/**
 * @swagger
 * /wa-groups/{groupId}/sync:
 *   post:
 *     summary: Sincroniza metadados do grupo na sessão ativa
 *     tags: [WhatsApp Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Sync disparado
 *       400:
 *         description: Sessão WhatsApp não conectada
 */
waGroupRoutes.post("/wa-groups/:groupId/sync", isAuth, WhatsAppGroupController.sync);

/**
 * @swagger
 * /wa-groups/{groupId}/messages:
 *   get:
 *     summary: Timeline de mensagens do grupo com remetente identificado
 *     tags: [WhatsApp Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mensagens do grupo
 */
waGroupRoutes.get("/wa-groups/:groupId/messages", isAuth, WhatsAppGroupController.messages);

export default waGroupRoutes;
