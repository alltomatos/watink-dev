"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const AIController_1 = __importDefault(require("../controllers/AIController"));
const aiRoutes = (0, express_1.Router)();
// Semantic search across conversations
aiRoutes.post("/ai/search", isAuth_1.default, AIController_1.default.search);
// Ask AI a question (RAG)
aiRoutes.post("/ai/ask", isAuth_1.default, AIController_1.default.ask);
// Get AI insights for a contact
aiRoutes.get("/ai/contact/:id/insights", isAuth_1.default, AIController_1.default.getContactInsights);
// Manually process a ticket for embeddings
aiRoutes.post("/ai/process/ticket/:id", isAuth_1.default, AIController_1.default.processTicket);
exports.default = aiRoutes;
