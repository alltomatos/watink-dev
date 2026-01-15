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
const openai_1 = require("@langchain/openai");
const textsplitters_1 = require("@langchain/textsplitters");
const KnowledgeVector_1 = __importDefault(require("../models/KnowledgeVector"));
const KnowledgeSource_1 = __importDefault(require("../models/KnowledgeSource"));
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../database"));
const Setting_1 = __importDefault(require("../models/Setting"));
class VectorService {
    getEmbeddingInstance(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKeySetting = yield Setting_1.default.findOne({
                where: { key: "aiApiKey", tenantId }
            });
            const apiKey = (apiKeySetting === null || apiKeySetting === void 0 ? void 0 : apiKeySetting.value) || process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error("OpenAI API Key not found for this tenant.");
            }
            return new openai_1.OpenAIEmbeddings({
                openAIApiKey: apiKey,
                modelName: "text-embedding-3-small"
            });
        });
    }
    // Split text into chunks
    splitText(text) {
        return __awaiter(this, void 0, void 0, function* () {
            const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            return yield splitter.splitText(text);
        });
    }
    // Generate embedding for a single text
    generateEmbedding(text, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const embeddings = yield this.getEmbeddingInstance(tenantId);
            return yield embeddings.embedQuery(text);
        });
    }
    // Process a source: Chunk it, embed chunks, save to DB
    processSource(sourceId, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = yield KnowledgeSource_1.default.findByPk(sourceId);
            if (!source || !source.content) {
                throw new Error("Source not found or empty content");
            }
            // Update status to processing
            yield source.update({ status: "processing" });
            try {
                // 1. Delete existing vectors for this source (re-indexing)
                yield KnowledgeVector_1.default.destroy({ where: { sourceId, tenantId } });
                // 2. Chunk text
                const chunks = yield this.splitText(source.content);
                // 3. Embed and Save matches
                // Note: For large documents, we might want to batch this.
                for (const chunk of chunks) {
                    const vector = yield this.generateEmbedding(chunk, tenantId);
                    yield KnowledgeVector_1.default.create({
                        sourceId,
                        tenantId,
                        content: chunk,
                        vector: vector,
                        // metadata could be added here
                    });
                }
                yield source.update({ status: "indexed" });
            }
            catch (error) {
                console.error("Error processing source:", error);
                yield source.update({ status: "error" });
                throw error;
            }
        });
    }
    // Search for similar vectors
    similaritySearch(query_1, tenantId_1) {
        return __awaiter(this, arguments, void 0, function* (query, tenantId, limit = 5) {
            const queryVector = yield this.generateEmbedding(query, tenantId);
            const vectorString = `[${queryVector.join(",")}]`;
            // Perform cosine distance search using pgvector
            // Needs raw query for efficiency
            const results = yield database_1.default.query(`
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
        });
    }
}
exports.default = new VectorService();
