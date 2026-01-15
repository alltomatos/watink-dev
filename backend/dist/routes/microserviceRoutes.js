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
const MicroserviceController = __importStar(require("../controllers/MicroserviceController"));
const microserviceRoutes = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Engine Standard
 *   description: WhatsApp Engine (Whaileys) interactive messaging and session management.
 */
/**
 * @swagger
 * /microservice/sendButtons:
 *   post:
 *     summary: Send interactive buttons
 *     tags: [Engine Standard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: integer
 *               text:
 *                 type: string
 *               footer:
 *                 type: string
 *               buttons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     buttonId:
 *                       type: string
 *                     buttonText:
 *                       type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Command sent to queue
 */
microserviceRoutes.post("/microservice/sendButtons", isAuth_1.default, MicroserviceController.sendButtons);
/**
 * @swagger
 * /microservice/sendList:
 *   post:
 *     summary: Send interactive list
 *     tags: [Engine Standard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: integer
 *               text:
 *                 type: string
 *               footer:
 *                 type: string
 *               buttonText:
 *                 type: string
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     rows:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rowId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *     responses:
 *       200:
 *         description: Command sent to queue
 */
microserviceRoutes.post("/microservice/sendList", isAuth_1.default, MicroserviceController.sendList);
/**
 * @swagger
 * /microservice/sendPoll:
 *   post:
 *     summary: Send interactive poll
 *     tags: [Engine Standard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: integer
 *               name:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               selectableCount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Command sent to queue
 */
microserviceRoutes.post("/microservice/sendPoll", isAuth_1.default, MicroserviceController.sendPoll);
/**
 * @swagger
 * /microservice/sendCarousel:
 *   post:
 *     summary: Send interactive carousel
 *     tags: [Engine Standard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: integer
 *               text:
 *                 type: string
 *               footer:
 *                 type: string
 *               cards:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     headerUrl:
 *                       type: string
 *                     title:
 *                       type: string
 *                     body:
 *                       type: string
 *                     footer:
 *                       type: string
 *                     buttons:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [url, reply]
 *                           text:
 *                             type: string
 *                           url:
 *                             type: string
 *                           buttonId:
 *                             type: string
 *     responses:
 *       200:
 *         description: Command sent to queue
 */
microserviceRoutes.post("/microservice/sendCarousel", isAuth_1.default, MicroserviceController.sendCarousel);
exports.default = microserviceRoutes;
