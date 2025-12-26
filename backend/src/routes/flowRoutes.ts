import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as FlowController from "../controllers/FlowController";

const flowRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Flows
 *   description: Gerenciamento de Fluxos de Automação (Flow Builder)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Flow:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do fluxo
 *         name:
 *           type: string
 *           description: Nome do fluxo
 *         description:
 *           type: string
 *           description: Descrição do fluxo
 *         isActive:
 *           type: boolean
 *           description: Se o fluxo está ativo
 *         nodes:
 *           type: array
 *           description: Nós do fluxo (React Flow format)
 *         edges:
 *           type: array
 *           description: Conexões entre nós
 *         whatsappId:
 *           type: integer
 *           description: ID da conexão WhatsApp associada
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
 * /flows:
 *   get:
 *     summary: Lista todos os fluxos
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de fluxos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Flow'
 */
flowRoutes.get("/flows", isAuth, FlowController.index);

/**
 * @swagger
 * /flows/{flowId}:
 *   get:
 *     summary: Busca um fluxo por ID
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flowId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fluxo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Flow'
 *       404:
 *         description: Fluxo não encontrado
 */
flowRoutes.get("/flows/:flowId", isAuth, FlowController.show);

/**
 * @swagger
 * /flows:
 *   post:
 *     summary: Cria um novo fluxo
 *     tags: [Flows]
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
 *               description:
 *                 type: string
 *               nodes:
 *                 type: array
 *                 description: Nós do fluxo (React Flow format)
 *               edges:
 *                 type: array
 *                 description: Conexões entre nós
 *               whatsappId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Fluxo criado com sucesso
 */
flowRoutes.post("/flows", isAuth, FlowController.store);

/**
 * @swagger
 * /flows/{flowId}:
 *   put:
 *     summary: Atualiza um fluxo existente
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flowId
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
 *               description:
 *                 type: string
 *               nodes:
 *                 type: array
 *               edges:
 *                 type: array
 *               whatsappId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Fluxo atualizado com sucesso
 */
flowRoutes.put("/flows/:flowId", isAuth, FlowController.update);

/**
 * @swagger
 * /flows/{flowId}/toggle:
 *   post:
 *     summary: Ativa ou desativa um fluxo
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flowId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Status do fluxo alterado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isActive:
 *                   type: boolean
 */
flowRoutes.post("/flows/:flowId/toggle", isAuth, FlowController.toggle);

/**
 * @swagger
 * /flows/{flowId}/simulate:
 *   post:
 *     summary: Simula a execução de um fluxo
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flowId
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
 *               message:
 *                 type: string
 *                 description: Mensagem de entrada para simulação
 *     responses:
 *       200:
 *         description: Resultado da simulação
 */
flowRoutes.post("/flows/:flowId/simulate", isAuth, FlowController.simulate);

/**
 * @swagger
 * /flows/ai:
 *   post:
 *     summary: Gera um fluxo usando IA
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Descrição do fluxo desejado em linguagem natural
 *     responses:
 *       200:
 *         description: Fluxo gerado pela IA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                 edges:
 *                   type: array
 */
flowRoutes.post("/flows/ai", isAuth, FlowController.generateFlowAI);

export default flowRoutes;
