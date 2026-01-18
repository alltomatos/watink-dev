import { Router } from "express";
import cors from "cors";
import * as WebchatController from "../controllers/WebchatController";

const webchatRoutes = Router();

// CORS permissivo para o webchat - permite requisições de qualquer origem
// Necessário porque o widget será embarcado em sites de terceiros
const webchatCors = cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
});

// Aplica CORS permissivo a todas as rotas do webchat
webchatRoutes.use(webchatCors);

webchatRoutes.get("/webchat/:whatsappId", WebchatController.getConfig);
webchatRoutes.post("/webchat/:whatsappId/tickets", WebchatController.createTicket);
webchatRoutes.post("/webchat/:ticketId/messages", WebchatController.saveMessage);
webchatRoutes.get("/webchat/:ticketId/messages", WebchatController.listMessages);

export default webchatRoutes;
