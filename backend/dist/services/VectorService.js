"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@langchain/openai");
const textsplitters_1 = require("@langchain/textsplitters");
const KnowledgeVector_1 = __importDefault(require("../models/KnowledgeVector"));
const KnowledgeSource_1 = __importDefault(require("../models/KnowledgeSource"));
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../database"));
const Setting_1 = __importDefault(require("../models/Setting"));
class VectorService {
    async getEmbeddingInstance(tenantId) {
        const apiKeySetting = await Setting_1.default.findOne({
            where: { key: "aiApiKey", tenantId }
        });
        const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OpenAI API Key not found for this tenant.");
        }
        return new openai_1.OpenAIEmbeddings({
            openAIApiKey: apiKey,
            modelName: "text-embedding-3-small"
        });
    }
    // Split text into chunks
    async splitText(text) {
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        return await splitter.splitText(text);
    }
    // Generate embedding for a single text
    async generateEmbedding(text, tenantId) {
        const embeddings = await this.getEmbeddingInstance(tenantId);
        return await embeddings.embedQuery(text);
    }
    // Process a source: Chunk it, embed chunks, save to DB
    async processSource(sourceId, tenantId) {
        const source = await KnowledgeSource_1.default.findByPk(sourceId);
        if (!source || !source.content) {
            throw new Error("Source not found or empty content");
        }
        // Update status to processing
        await source.update({ status: "processing" });
        try {
            // 1. Delete existing vectors for this source (re-indexing)
            await KnowledgeVector_1.default.destroy({ where: { sourceId, tenantId } });
            // 2. Chunk text
            const chunks = await this.splitText(source.content);
            // 3. Embed and Save matches
            // Note: For large documents, we might want to batch this.
            for (const chunk of chunks) {
                const vector = await this.generateEmbedding(chunk, tenantId);
                await KnowledgeVector_1.default.create({
                    sourceId,
                    tenantId,
                    content: chunk,
                    vector: vector,
                    // metadata could be added here
                });
            }
            await source.update({ status: "indexed" });
        }
        catch (error) {
            console.error("Error processing source:", error);
            await source.update({ status: "error" });
            throw error;
        }
    }
    // Search for similar vectors
    async similaritySearch(query, tenantId, limit = 5) {
        const queryVector = await this.generateEmbedding(query, tenantId);
        const vectorString = `[${queryVector.join(",")}]`;
        // Perform cosine distance search using pgvector
        // Needs raw query for efficiency
        const results = await database_1.default.query(`
      SELECT "id", "content", "sourceId", "tenantId", "createdAt", "updatedAt", 
      (vector <=> :vector) as distance
      FROM "KnowledgeVectors"
      WHERE "tenantId" = :tenantId
      ORDER BY distance ASC
      LIMIT :limit;
    `, {
            replacements: { vector: vectorString, tenantId, limit },
            type: sequelize_1.QueryTypes.SELECT,
            model: KnowledgeVector_1.default,
            mapToModel: true
        });
        return results;
    }
}
exports.default = new VectorService();
