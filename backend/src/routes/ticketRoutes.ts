import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Gerenciamento de Tickets (Atendimentos)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do ticket
 *         status:
 *           type: string
 *           enum: [open, pending, closed]
 *           description: Status do atendimento
 *         lastMessage:
 *           type: string
 *           description: Última mensagem
 *         isGroup:
 *           type: boolean
 *           description: Se é um grupo
 *         unreadMessages:
 *           type: integer
 *           description: Mensagens não lidas
 *         contactId:
 *           type: integer
 *         whatsappId:
 *           type: integer
 *         userId:
 *           type: integer
 *           description: Atendente atribuído
 *         queueId:
 *           type: integer
 *           description: Fila atribuída
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
 * /tickets:
 *   get:
 *     summary: Lista tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, pending, closed]
 *       - in: query
 *         name: showAll
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: withUnreadMessages
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: queueIds
 *         schema:
 *           type: string
 *         description: IDs de filas separados por vírgula
 *     responses:
 *       200:
 *         description: Lista de tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tickets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *                 count:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 */
ticketRoutes.get("/tickets", isAuth, TicketController.index);

/**
 * @swagger
 * /tickets/{ticketId}:
 *   get:
 *     summary: Busca um ticket por ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       404:
 *         description: Ticket não encontrado
 */
ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Cria um novo ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactId
 *             properties:
 *               contactId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               queueId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [open, pending]
 *     responses:
 *       200:
 *         description: Ticket criado
 */
ticketRoutes.post("/tickets", isAuth, TicketController.store);

/**
 * @swagger
 * /tickets/{ticketId}:
 *   put:
 *     summary: Atualiza um ticket
 *     tags: [Tickets]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, pending, closed]
 *               userId:
 *                 type: integer
 *               queueId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ticket atualizado
 */
ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

/**
 * @swagger
 * /tickets/{ticketId}:
 *   delete:
 *     summary: Remove um ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket removido
 */
ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

export default ticketRoutes;
