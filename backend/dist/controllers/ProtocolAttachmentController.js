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
exports.publicIndex = exports.destroy = exports.store = exports.index = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ProtocolAttachment_1 = __importDefault(require("../models/ProtocolAttachment"));
const Protocol_1 = __importDefault(require("../models/Protocol"));
const CreateProtocolAttachmentService_1 = __importDefault(require("../services/ProtocolServices/CreateProtocolAttachmentService"));
const AppError_1 = __importDefault(require("../errors/AppError"));
// GET /protocols/:protocolId/attachments
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { protocolId } = req.params;
    const { tenantId } = req.user;
    const attachments = yield ProtocolAttachment_1.default.findAll({
        where: { protocolId, tenantId },
        order: [["createdAt", "DESC"]]
    });
    return res.json(attachments);
});
exports.index = index;
// POST /protocols/:protocolId/attachments
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { protocolId } = req.params;
    const { tenantId, id: userId } = req.user;
    const files = req.files;
    const savedAttachments = yield (0, CreateProtocolAttachmentService_1.default)({
        protocolId: Number(protocolId),
        tenantId,
        userId: Number(userId),
        files
    });
    return res.status(201).json(savedAttachments);
});
exports.store = store;
// DELETE /protocols/:protocolId/attachments/:attachmentId
const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { protocolId, attachmentId } = req.params;
    const { tenantId } = req.user;
    const attachment = yield ProtocolAttachment_1.default.findOne({
        where: { id: attachmentId, protocolId, tenantId }
    });
    if (!attachment) {
        throw new AppError_1.default("Anexo não encontrado", 404);
    }
    // Delete file from disk
    const filePath = path_1.default.resolve(process.cwd(), "public", attachment.filePath.replace(/^\//, ""));
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
    yield attachment.destroy();
    return res.json({ message: "Anexo removido com sucesso" });
});
exports.destroy = destroy;
// GET Public attachments (by protocol token)
const publicIndex = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const protocol = yield Protocol_1.default.findOne({
        where: { token },
        include: [{ model: ProtocolAttachment_1.default, as: "attachments" }]
    });
    if (!protocol) {
        throw new AppError_1.default("Protocolo não encontrado", 404);
    }
    return res.json(protocol.attachments || []);
});
exports.publicIndex = publicIndex;
