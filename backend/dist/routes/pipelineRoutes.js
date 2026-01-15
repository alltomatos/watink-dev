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
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const PipelineController = __importStar(require("../controllers/PipelineController"));
const pipelineRoutes = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Pipelines
 *   description: Gerenciamento de Pipelines CRM (Kanban)
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Pipeline:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do pipeline
 *         name:
 *           type: string
 *           description: Nome do pipeline
 *         stages:
 *           type: array
 *           description: Etapas do pipeline
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               order:
 *                 type: integer
 *               color:
 *                 type: string
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
 * /pipelines:
 *   get:
 *     summary: Lista todos os pipelines
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pipelines
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pipeline'
 */
pipelineRoutes.get("/pipelines", isAuth_1.default, PipelineController.index);
/**
 * @swagger
 * /pipelines:
 *   post:
 *     summary: Cria um novo pipeline
 *     tags: [Pipelines]
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
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     order:
 *                       type: integer
 *                     color:
 *                       type: string
 *     responses:
 *       200:
 *         description: Pipeline criado com sucesso
 */
pipelineRoutes.post("/pipelines", isAuth_1.default, PipelineController.store);
/**
 * @swagger
 * /pipelines/{pipelineId}:
 *   put:
 *     summary: Atualiza um pipeline
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
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
 *               stages:
 *                 type: array
 *     responses:
 *       200:
 *         description: Pipeline atualizado com sucesso
 */
pipelineRoutes.put("/pipelines/:pipelineId", isAuth_1.default, PipelineController.update);
/**
 * @swagger
 * /pipelines/{pipelineId}:
 *   delete:
 *     summary: Remove um pipeline
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pipeline removido com sucesso
 */
pipelineRoutes.delete("/pipelines/:pipelineId", isAuth_1.default, PipelineController.remove);
/**
 * @swagger
 * /pipelines/ai-suggest:
 *   post:
 *     summary: Sugere etapas de pipeline usando IA
 *     tags: [Pipelines]
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
 *                 description: Descrição do negócio para sugestão de etapas
 *     responses:
 *       200:
 *         description: Sugestões de etapas geradas pela IA
 */
pipelineRoutes.post("/pipelines/ai-suggest", isAuth_1.default, PipelineController.aiSuggest);
/**
 * @swagger
 * /pipelines/export/{pipelineId}:
 *   get:
 *     summary: Exporta um pipeline em formato JSON
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pipeline exportado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pipeline'
 */
pipelineRoutes.get("/pipelines/export/:pipelineId", isAuth_1.default, PipelineController.exportPipeline);
/**
 * @swagger
 * /pipelines/import:
 *   post:
 *     summary: Importa um pipeline de JSON
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pipeline'
 *     responses:
 *       200:
 *         description: Pipeline importado com sucesso
 */
pipelineRoutes.post("/pipelines/import", isAuth_1.default, PipelineController.importPipeline);
exports.default = pipelineRoutes;
