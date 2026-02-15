"use strict";
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
const index = async (req, res) => {
    const { protocolId } = req.params;
    const { tenantId } = req.user;
    const attachments = await ProtocolAttachment_1.default.findAll({
        where: { protocolId, tenantId },
        order: [["createdAt", "DESC"]]
    });
    return res.json(attachments);
};
exports.index = index;
// POST /protocols/:protocolId/attachments
const store = async (req, res) => {
    const { protocolId } = req.params;
    const { tenantId, id: userId } = req.user;
    const files = req.files;
    const savedAttachments = await (0, CreateProtocolAttachmentService_1.default)({
        protocolId: Number(protocolId),
        tenantId,
        userId: Number(userId),
        files
    });
    return res.status(201).json(savedAttachments);
};
exports.store = store;
// DELETE /protocols/:protocolId/attachments/:attachmentId
const destroy = async (req, res) => {
    const { protocolId, attachmentId } = req.params;
    const { tenantId } = req.user;
    const attachment = await ProtocolAttachment_1.default.findOne({
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
    await attachment.destroy();
    return res.json({ message: "Anexo removido com sucesso" });
};
exports.destroy = destroy;
// GET Public attachments (by protocol token)
const publicIndex = async (req, res) => {
    const { token } = req.params;
    const protocol = await Protocol_1.default.findOne({
        where: { token },
        include: [{ model: ProtocolAttachment_1.default, as: "attachments" }]
    });
    if (!protocol) {
        throw new AppError_1.default("Protocolo não encontrado", 404);
    }
    return res.json(protocol.attachments || []);
};
exports.publicIndex = publicIndex;
