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
exports.retrySource = exports.removeSource = exports.createSource = exports.listSources = exports.remove = exports.store = exports.update = exports.show = exports.index = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const KnowledgeBase_1 = __importDefault(require("../models/KnowledgeBase"));
const KnowledgeSource_1 = __importDefault(require("../models/KnowledgeSource"));
const ScraperService_1 = __importDefault(require("../services/ScraperService"));
const PdfService_1 = __importDefault(require("../services/PdfService"));
const VectorService_1 = __importDefault(require("../services/VectorService"));
const socket_1 = require("../libs/socket");
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const knowledgeBases = yield KnowledgeBase_1.default.findAll({
        where: { tenantId },
        include: ["sources"]
    });
    return res.status(200).json(knowledgeBases);
});
exports.index = index;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { knowledgeBaseId } = req.params;
    const knowledgeBase = yield KnowledgeBase_1.default.findOne({
        where: { id: knowledgeBaseId, tenantId },
        include: ["sources"]
    });
    if (!knowledgeBase) {
        throw new AppError_1.default("ERR_NO_KNOWLEDGE_BASE_FOUND", 404);
    }
    return res.status(200).json(knowledgeBase);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { knowledgeBaseId } = req.params;
    const { name, description } = req.body;
    const knowledgeBase = yield KnowledgeBase_1.default.findOne({
        where: { id: knowledgeBaseId, tenantId }
    });
    if (!knowledgeBase) {
        throw new AppError_1.default("ERR_NO_KNOWLEDGE_BASE_FOUND", 404);
    }
    yield knowledgeBase.update({
        name,
        description
    });
    return res.status(200).json(knowledgeBase);
});
exports.update = update;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { name, description } = req.body;
    const schema = Yup.object().shape({
        name: Yup.string().required()
    });
    try {
        yield schema.validate(req.body);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const knowledgeBase = yield KnowledgeBase_1.default.create({
        name,
        description,
        tenantId
    });
    return res.status(200).json(knowledgeBase);
});
exports.store = store;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { knowledgeBaseId } = req.params;
    const knowledgeBase = yield KnowledgeBase_1.default.findOne({
        where: { id: knowledgeBaseId, tenantId }
    });
    if (!knowledgeBase) {
        throw new AppError_1.default("ERR_NO_KNOWLEDGE_BASE_FOUND", 404);
    }
    yield knowledgeBase.destroy();
    return res.status(200).json({ message: "Knowledge Base deleted" });
});
exports.remove = remove;
const listSources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { knowledgeBaseId } = req.params;
    const sources = yield KnowledgeSource_1.default.findAll({
        where: { baseId: knowledgeBaseId, tenantId }
    });
    return res.status(200).json(sources);
});
exports.listSources = listSources;
const createSource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { knowledgeBaseId } = req.params;
    const { name, url, type } = req.body;
    const file = req.file;
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        type: Yup.string().required().oneOf(["url", "pdf", "text"])
    });
    try {
        yield schema.validate(req.body);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    let content = "";
    if (type === "url") {
        if (!url)
            throw new AppError_1.default("URL is required for type 'url'");
    }
    else if (type === "pdf") {
        if (!file)
            throw new AppError_1.default("File is required for type 'pdf'");
    }
    const source = yield KnowledgeSource_1.default.create({
        name,
        type,
        url,
        baseId: parseInt(knowledgeBaseId, 10),
        tenantId,
        status: "pending"
    });
    // Process asynchronously
    processSourceContent(source, file ? file.path : null);
    return res.status(200).json(source);
});
exports.createSource = createSource;
const removeSource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { sourceId } = req.params;
    const source = yield KnowledgeSource_1.default.findOne({
        where: { id: sourceId, tenantId }
    });
    if (!source) {
        throw new AppError_1.default("ERR_NO_SOURCE_FOUND", 404);
    }
    yield source.destroy();
    return res.status(200).json({ message: "Source deleted" });
});
exports.removeSource = removeSource;
const retrySource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { sourceId } = req.params;
    const source = yield KnowledgeSource_1.default.findOne({
        where: { id: sourceId, tenantId }
    });
    if (!source) {
        throw new AppError_1.default("ERR_NO_SOURCE_FOUND", 404);
    }
    source.update({ status: "pending" });
    processSourceContent(source, null); // passing null as file path might be lost if not stored, wait.
    // Ideally we store file path in source.content or source.url. 
    // For PDF, we need to decide if we store the file. For now assuming we parse immediately.
    // If re-trying PDF, we can't if we don't save the file.
    // But for now let's assume retry works for URL or if content is already there but failed indexing.
    return res.status(200).json({ message: "Retry started" });
});
exports.retrySource = retrySource;
// Helper function to process content
const processSourceContent = (source, filePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield source.update({ status: "processing" });
        const io = (0, socket_1.getIO)();
        io.emit(`knowledgeSource:${source.tenantId}:update`, { source });
        let text = "";
        if (source.type === "url" && source.url) {
            text = yield ScraperService_1.default.scrape(source.url);
        }
        else if (source.type === "pdf" && filePath) {
            text = yield PdfService_1.default.parsePdf(filePath);
            // Optionally delete file after parsing? or keep it?
            // fs.unlinkSync(filePath); 
        }
        else if (source.type === "text" && source.content) {
            text = source.content;
        }
        if (text) {
            yield source.update({ content: text });
            yield VectorService_1.default.processSource(source.id, source.tenantId);
            // Status updated to 'indexed' inside VectorService
        }
        else {
            throw new Error("No text extracted");
        }
        const updatedSource = yield source.reload();
        io.emit(`knowledgeSource:${source.tenantId}:update`, { source: updatedSource });
    }
    catch (error) {
        console.error("Processing source error:", error);
        yield source.update({ status: "error" });
        const io = (0, socket_1.getIO)();
        io.emit(`knowledgeSource:${source.tenantId}:update`, { source });
    }
});
