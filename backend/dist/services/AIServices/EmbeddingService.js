"use strict";
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
const openai_1 = require("openai");
const Setting_1 = __importDefault(require("../../models/Setting"));
const ConversationEmbedding_1 = __importDefault(require("../../models/ConversationEmbedding"));
const Message_1 = __importDefault(require("../../models/Message"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const logger_1 = require("../../utils/logger");
const database_1 = __importDefault(require("../../database"));
const sequelize_1 = require("sequelize");
class EmbeddingService {
    /**
     * Get OpenAI/Grok configuration from Settings
     */
    getConfig(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [apiKeySetting, providerSetting, modelSetting] = yield Promise.all([
                Setting_1.default.findOne({ where: { key: "aiApiKey", tenantId } }),
                Setting_1.default.findOne({ where: { key: "aiProvider", tenantId } }),
                Setting_1.default.findOne({ where: { key: "aiModel", tenantId } })
            ]);
            const apiKey = (apiKeySetting === null || apiKeySetting === void 0 ? void 0 : apiKeySetting.value) || process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error("AI API Key not configured for tenant");
            }
            return {
                apiKey,
                provider: (providerSetting === null || providerSetting === void 0 ? void 0 : providerSetting.value) || "openai",
                model: (modelSetting === null || modelSetting === void 0 ? void 0 : modelSetting.value) || "gpt-4o-mini"
            };
        });
    }
    /**
     * Generate embedding vector for text
     */
    generateEmbedding(text, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig(tenantId);
            const client = new openai_1.OpenAI({
                apiKey: config.apiKey,
                baseURL: config.provider === "grok" ? "https://api.x.ai/v1" : undefined
            });
            const response = yield client.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
                dimensions: 1536
            });
            return response.data[0].embedding;
        });
    }
    /**
     * Analyze conversation and generate summary, topics and sentiment
     */
    analyzeConversation(messages, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig(tenantId);
            const client = new openai_1.OpenAI({
                apiKey: config.apiKey,
                baseURL: config.provider === "grok" ? "https://api.x.ai/v1" : undefined
            });
            // Format messages for analysis
            const conversationText = messages
                .map(m => `${m.fromMe ? "Atendente" : "Cliente"}: ${m.body}`)
                .join("\n");
            const prompt = `Analise a conversa abaixo e retorne um JSON com:
- summary: resumo conciso da conversa (máximo 200 palavras)
- topics: array com até 5 tópicos/tags principais
- sentiment: número de -1 (muito negativo) a 1 (muito positivo)

Conversa:
${conversationText}

Retorne APENAS o JSON, sem markdown:`;
            const response = yield client.chat.completions.create({
                model: config.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                response_format: config.provider === "openai" ? { type: "json_object" } : undefined
            });
            const content = response.choices[0].message.content || "{}";
            try {
                // Clean potential markdown
                const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
                return JSON.parse(cleaned);
            }
            catch (e) {
                logger_1.logger.error("Error parsing AI analysis response", { content, error: e });
                return {
                    summary: "Análise não disponível",
                    topics: [],
                    sentiment: 0
                };
            }
        });
    }
    /**
     * Process a closed ticket - generate embeddings and analysis
     * Only processes individual chats (not groups)
     */
    processTicket(ticketId, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const ticket = yield Ticket_1.default.findByPk(ticketId, {
                include: [{ model: Contact_1.default }]
            });
            if (!ticket) {
                logger_1.logger.warn(`Ticket ${ticketId} not found for embedding processing`);
                return null;
            }
            // RULE: Skip group conversations
            if (ticket.isGroup) {
                logger_1.logger.info(`Skipping group ticket ${ticketId} for embedding processing`);
                return null;
            }
            // Get all messages for this ticket
            const messages = yield Message_1.default.findAll({
                where: { ticketId },
                order: [["createdAt", "ASC"]]
            });
            if (messages.length === 0) {
                logger_1.logger.info(`Ticket ${ticketId} has no messages, skipping`);
                return null;
            }
            // Check if already processed
            const existing = yield ConversationEmbedding_1.default.findOne({
                where: { ticketId, tenantId }
            });
            if (existing) {
                logger_1.logger.info(`Ticket ${ticketId} already has embedding, updating...`);
            }
            try {
                // Analyze conversation
                const analysis = yield this.analyzeConversation(messages, tenantId);
                // Generate embedding from summary
                const embedding = yield this.generateEmbedding(`${analysis.summary} Tópicos: ${analysis.topics.join(", ")}`, tenantId);
                // Calculate metadata
                const metadata = {
                    firstMessageAt: messages[0].createdAt,
                    lastMessageAt: messages[messages.length - 1].createdAt,
                    agentMessages: messages.filter(m => m.fromMe).length,
                    customerMessages: messages.filter(m => !m.fromMe).length
                };
                // Create or update embedding
                if (existing) {
                    yield existing.update({
                        summary: analysis.summary,
                        topics: analysis.topics,
                        sentiment: analysis.sentiment,
                        messageCount: messages.length,
                        embedding,
                        metadata,
                        processedAt: new Date()
                    });
                    return existing;
                }
                else {
                    return yield ConversationEmbedding_1.default.create({
                        ticketId,
                        contactId: ticket.contactId,
                        tenantId,
                        summary: analysis.summary,
                        topics: analysis.topics,
                        sentiment: analysis.sentiment,
                        messageCount: messages.length,
                        embedding,
                        metadata,
                        processedAt: new Date()
                    });
                }
            }
            catch (error) {
                logger_1.logger.error(`Error processing ticket ${ticketId} for embeddings`, error);
                throw error;
            }
        });
    }
    /**
     * Semantic search across conversation embeddings
     */
    searchSimilar(query_1, tenantId_1) {
        return __awaiter(this, arguments, void 0, function* (query, tenantId, limit = 5, contactId) {
            const queryVector = yield this.generateEmbedding(query, tenantId);
            const vectorString = `[${queryVector.join(",")}]`;
            let whereClause = `"tenantId" = :tenantId`;
            const replacements = { vector: vectorString, tenantId, limit };
            if (contactId) {
                whereClause += ` AND "contactId" = :contactId`;
                replacements.contactId = contactId;
            }
            const results = yield database_1.default.query(`
            SELECT "id", "ticketId", "contactId", "summary", "topics", "sentiment", 
                   "messageCount", "metadata", "processedAt", "tenantId",
                   (embedding <=> :vector) as distance
            FROM "ConversationEmbeddings"
            WHERE ${whereClause}
            ORDER BY distance ASC
            LIMIT :limit;
        `, {
                replacements,
                type: sequelize_1.QueryTypes.SELECT,
                model: ConversationEmbedding_1.default,
                mapToModel: true
            });
            return results;
        });
    }
    /**
     * Get insights for a specific contact
     */
    getContactInsights(contactId, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const embeddings = yield ConversationEmbedding_1.default.findAll({
                where: { contactId, tenantId },
                order: [["processedAt", "DESC"]],
                limit: 10
            });
            if (embeddings.length === 0) {
                return null;
            }
            // Calculate aggregated insights
            const totalMessages = embeddings.reduce((sum, e) => sum + e.messageCount, 0);
            const avgSentiment = embeddings.reduce((sum, e) => sum + (e.sentiment || 0), 0) / embeddings.length;
            // Gather all topics
            const allTopics = {};
            embeddings.forEach(e => {
                (e.topics || []).forEach((topic) => {
                    allTopics[topic] = (allTopics[topic] || 0) + 1;
                });
            });
            // Sort topics by frequency
            const topTopics = Object.entries(allTopics)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([topic]) => topic);
            return {
                conversationCount: embeddings.length,
                totalMessages,
                averageSentiment: Math.round(avgSentiment * 100) / 100,
                topTopics,
                recentSummaries: embeddings.slice(0, 3).map(e => ({
                    ticketId: e.ticketId,
                    summary: e.summary,
                    sentiment: e.sentiment,
                    processedAt: e.processedAt
                }))
            };
        });
    }
}
exports.default = new EmbeddingService();
