import express from "express";
import isAuth from "../middleware/isAuth";

import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";

const contactRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contacts
 *   description: Gerenciamento de Contatos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do contato
 *         name:
 *           type: string
 *           description: Nome do contato
 *         number:
 *           type: string
 *           description: Número WhatsApp
 *         email:
 *           type: string
 *         profilePicUrl:
 *           type: string
 *           description: URL da foto de perfil
 *         isGroup:
 *           type: boolean
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
 * /contacts/import:
 *   post:
 *     summary: Importa contatos do dispositivo
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     number:
 *                       type: string
 *     responses:
 *       200:
 *         description: Contatos importados
 */
contactRoutes.post(
  "/contacts/import",
  isAuth,
  ImportPhoneContactsController.store
);

/**
 * @swagger
 * /contacts:
 *   get:
 *     summary: Lista contatos
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema:
 *           type: string
 *         description: Termo de busca (nome ou número)
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de contatos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 count:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 */
contactRoutes.get("/contacts", isAuth, ContactController.index);

/**
 * @swagger
 * /contacts/{contactId}:
 *   get:
 *     summary: Busca um contato por ID
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contato encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 */
contactRoutes.get("/contacts/:contactId", isAuth, ContactController.show);

/**
 * @swagger
 * /contacts:
 *   post:
 *     summary: Cria um novo contato
 *     tags: [Contacts]
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
 *               - number
 *             properties:
 *               name:
 *                 type: string
 *               number:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contato criado
 */
contactRoutes.post("/contacts", isAuth, ContactController.store);

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Busca ou cria um contato pelo número
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *             properties:
 *               name:
 *                 type: string
 *               number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contato encontrado ou criado
 */
contactRoutes.post("/contact", isAuth, ContactController.getContact);

/**
 * @swagger
 * /contacts/{contactId}:
 *   put:
 *     summary: Atualiza um contato
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
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
 *               number:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contato atualizado
 */
contactRoutes.put("/contacts/:contactId", isAuth, ContactController.update);

/**
 * @swagger
 * /contacts/{contactId}:
 *   delete:
 *     summary: Remove um contato
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contato removido
 */
contactRoutes.delete("/contacts/:contactId", isAuth, ContactController.remove);

/**
 * @swagger
 * /contacts/{contactId}/sync:
 *   post:
 *     summary: Sincroniza foto de perfil do contato
 *     description: |
 *       Solicita ao Engine a foto de perfil atualizada do contato via WhatsApp.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sincronização iniciada
 */
contactRoutes.post("/contacts/:contactId/sync", isAuth, ContactController.sync);

export default contactRoutes;
