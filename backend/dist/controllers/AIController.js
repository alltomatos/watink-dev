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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EmbeddingService_1 = __importDefault(require("../services/AIServices/EmbeddingService"));
const Setting_1 = __importDefault(require("../models/Setting"));
const logger_1 = require("../utils/logger");
class AIController {
    /**
     * Semantic search across conversation history
     * POST /ai/search
     */
    search(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tenantId } = req.user;
            const { query, limit = 5, contactId } = req.body;
            if (!query) {
                return res.status(400).json({ error: "Query is required" });
            }
            // Check if AI is enabled
            const aiEnabled = yield Setting_1.default.findOne({
                where: { key: "aiEnabled", tenantId }
            });
            if ((aiEnabled === null || aiEnabled === void 0 ? void 0 : aiEnabled.value) !== "true") {
                return res.status(403).json({ error: "AI is not enabled for this tenant" });
            }
            try {
                const results = yield EmbeddingService_1.default.searchSimilar(query, tenantId, limit, contactId);
                return res.json({ results });
            }
            catch (error) {
                logger_1.logger.error("AI Search error", error);
                return res.status(500).json({ error: "Failed to perform search" });
            }
        });
    }
    /**
     * Get AI insights for a specific contact
     * GET /ai/contact/:id/insights
     */
    getContactInsights(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tenantId } = req.user;
            const { id } = req.params;
            // Check if AI Assistant is enabled
            const [aiEnabled, aiAssistantEnabled] = yield Promise.all([
                Setting_1.default.findOne({ where: { key: "aiEnabled", tenantId } }),
                Setting_1.default.findOne({ where: { key: "aiAssistantEnabled", tenantId } })
            ]);
            if ((aiEnabled === null || aiEnabled === void 0 ? void 0 : aiEnabled.value) !== "true" || (aiAssistantEnabled === null || aiAssistantEnabled === void 0 ? void 0 : aiAssistantEnabled.value) !== "true") {
                return res.status(403).json({ error: "AI Assistant is not enabled" });
            }
            try {
                const insights = yield EmbeddingService_1.default.getContactInsights(parseInt(id, 10), tenantId);
                if (!insights) {
                    return res.json({
                        message: "No conversation history available for analysis",
                        insights: null
                    });
                }
                return res.json({ insights });
            }
            catch (error) {
                logger_1.logger.error("Get contact insights error", error);
                return res.status(500).json({ error: "Failed to get insights" });
            }
        });
    }
    /**
     * Manually trigger processing for a ticket
     * POST /ai/process/ticket/:id
     */
    processTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tenantId } = req.user;
            const { id } = req.params;
            // Check if AI is enabled
            const aiEnabled = yield Setting_1.default.findOne({
                where: { key: "aiEnabled", tenantId }
            });
            if ((aiEnabled === null || aiEnabled === void 0 ? void 0 : aiEnabled.value) !== "true") {
                return res.status(403).json({ error: "AI is not enabled for this tenant" });
            }
            try {
                const embedding = yield EmbeddingService_1.default.processTicket(parseInt(id, 10), tenantId);
                if (!embedding) {
                    return res.status(400).json({
                        error: "Could not process ticket - it may be a group or have no messages"
                    });
                }
                return res.json({
                    message: "Ticket processed successfully",
                    embedding: {
                        id: embedding.id,
                        summary: embedding.summary,
                        topics: embedding.topics,
                        sentiment: embedding.sentiment
                    }
                });
            }
            catch (error) {
                logger_1.logger.error("Process ticket error", error);
                return res.status(500).json({ error: "Failed to process ticket" });
            }
        });
    }
    /**
     * Ask AI a question about conversation history (RAG)
     * POST /ai/ask
     */
    ask(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tenantId } = req.user;
            const { question, contactId } = req.body;
            if (!question) {
                return res.status(400).json({ error: "Question is required" });
            }
            // Check if AI Assistant is enabled
            const [aiEnabled, aiAssistantEnabled] = yield Promise.all([
                Setting_1.default.findOne({ where: { key: "aiEnabled", tenantId } }),
                Setting_1.default.findOne({ where: { key: "aiAssistantEnabled", tenantId } })
            ]);
            if ((aiEnabled === null || aiEnabled === void 0 ? void 0 : aiEnabled.value) !== "true" || (aiAssistantEnabled === null || aiAssistantEnabled === void 0 ? void 0 : aiAssistantEnabled.value) !== "true") {
                return res.status(403).json({ error: "AI Assistant is not enabled" });
            }
            try {
                // Get relevant conversations
                const relevantConversations = yield EmbeddingService_1.default.searchSimilar(question, tenantId, 3, contactId);
                // Build context from relevant conversations
                const context = relevantConversations
                    .map(c => `Conversa (Ticket #${c.ticketId}): ${c.summary}`)
                    .join("\n\n");
                // Call AI for answer
                const config = yield EmbeddingService_1.default.getConfig(tenantId);
                const { OpenAI } = yield Promise.resolve().then(() => __importStar(require("openai")));
                const client = new OpenAI({
                    apiKey: config.apiKey,
                    baseURL: config.provider === "grok" ? "https://api.x.ai/v1" : undefined
                });
                const response = yield client.chat.completions.create({
                    model: config.model,
                    messages: [
                        {
                            role: "system",
                            content: `Você é um assistente de IA que responde perguntas sobre o histórico de conversas.
Use APENAS o contexto fornecido para responder. Se não encontrar informação relevante, diga claramente.

Contexto das conversas anteriores:
${context || "Nenhum histórico disponível."}`
                        },
                        { role: "user", content: question }
                    ],
                    temperature: 0.5
                });
                const answer = response.choices[0].message.content || "Não foi possível gerar resposta.";
                return res.json({
                    answer,
                    sources: relevantConversations.map(c => ({
                        ticketId: c.ticketId,
                        summary: c.summary
                    }))
                });
            }
            catch (error) {
                logger_1.logger.error("AI Ask error", error);
                return res.status(500).json({ error: "Failed to process question" });
            }
        });
    }
}
exports.default = new AIController();
