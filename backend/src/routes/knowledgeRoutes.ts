import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as KnowledgeController from "../controllers/KnowledgeController";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const knowledgeRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: KnowledgeBases
 *   description: Gerenciamento de Bases de Conhecimento (RAG)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     KnowledgeBase:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único da base
 *         name:
 *           type: string
 *           description: Nome da base de conhecimento
 *         description:
 *           type: string
 *           description: Descrição da base
 *         tenantId:
 *           type: integer
 *           description: ID do tenant
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     KnowledgeSource:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *           description: Nome/URL da fonte
 *         type:
 *           type: string
 *           enum: [url, pdf, text]
 *           description: Tipo da fonte
 *         status:
 *           type: string
 *           enum: [pending, processing, indexed, error]
 *           description: Status do processamento
 *         baseId:
 *           type: integer
 *           description: ID da base de conhecimento
 */

/**
 * @swagger
 * /knowledge-bases:
 *   get:
 *     summary: Lista todas as bases de conhecimento
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bases de conhecimento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KnowledgeBase'
 */
knowledgeRoutes.get("/knowledge-bases", isAuth, KnowledgeController.index);

/**
 * @swagger
 * /knowledge-bases/{knowledgeBaseId}:
 *   get:
 *     summary: Busca uma base de conhecimento por ID
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: knowledgeBaseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da base de conhecimento
 *     responses:
 *       200:
 *         description: Base de conhecimento encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeBase'
 *       404:
 *         description: Base não encontrada
 */
knowledgeRoutes.get("/knowledge-bases/:knowledgeBaseId", isAuth, KnowledgeController.show);

/**
 * @swagger
 * /knowledge-bases:
 *   post:
 *     summary: Cria uma nova base de conhecimento
 *     tags: [KnowledgeBases]
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
 *                 description: Nome da base
 *               description:
 *                 type: string
 *                 description: Descrição da base
 *     responses:
 *       200:
 *         description: Base criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeBase'
 */
knowledgeRoutes.post("/knowledge-bases", isAuth, KnowledgeController.store);

/**
 * @swagger
 * /knowledge-bases/{knowledgeBaseId}:
 *   put:
 *     summary: Atualiza uma base de conhecimento
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: knowledgeBaseId
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
 *     responses:
 *       200:
 *         description: Base atualizada com sucesso
 */
knowledgeRoutes.put("/knowledge-bases/:knowledgeBaseId", isAuth, KnowledgeController.update);

/**
 * @swagger
 * /knowledge-bases/{knowledgeBaseId}:
 *   delete:
 *     summary: Remove uma base de conhecimento
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: knowledgeBaseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Base removida com sucesso
 */
knowledgeRoutes.delete("/knowledge-bases/:knowledgeBaseId", isAuth, KnowledgeController.remove);

/**
 * @swagger
 * /knowledge-bases/{knowledgeBaseId}/sources:
 *   get:
 *     summary: Lista fontes de uma base de conhecimento
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: knowledgeBaseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de fontes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KnowledgeSource'
 */
knowledgeRoutes.get("/knowledge-bases/:knowledgeBaseId/sources", isAuth, KnowledgeController.listSources);

/**
 * @swagger
 * /knowledge-bases/{knowledgeBaseId}/sources:
 *   post:
 *     summary: Adiciona uma fonte à base de conhecimento
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: knowledgeBaseId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da fonte
 *               type:
 *                 type: string
 *                 enum: [url, pdf, text]
 *               url:
 *                 type: string
 *                 description: URL para scraping (se type=url)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo PDF (se type=pdf)
 *     responses:
 *       200:
 *         description: Fonte adicionada com sucesso
 */
knowledgeRoutes.post("/knowledge-bases/:knowledgeBaseId/sources", isAuth, upload.single("file"), KnowledgeController.createSource);

/**
 * @swagger
 * /knowledge-bases/sources/{sourceId}:
 *   delete:
 *     summary: Remove uma fonte
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fonte removida com sucesso
 */
knowledgeRoutes.delete("/knowledge-bases/sources/:sourceId", isAuth, KnowledgeController.removeSource);

/**
 * @swagger
 * /knowledge-bases/sources/{sourceId}/retry:
 *   post:
 *     summary: Reprocessa uma fonte com erro
 *     tags: [KnowledgeBases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reprocessamento iniciado
 */
knowledgeRoutes.post("/knowledge-bases/sources/:sourceId/retry", isAuth, KnowledgeController.retrySource);

export default knowledgeRoutes;
