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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ProtocolAttachment_1 = __importDefault(require("../../models/ProtocolAttachment"));
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const ProtocolHistory_1 = __importDefault(require("../../models/ProtocolHistory"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CreateProtocolAttachmentService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ protocolId, tenantId, userId, files }) {
    if (!files || files.length === 0) {
        throw new AppError_1.default("Nenhum arquivo enviado", 400);
    }
    // Verify protocol exists and belongs to tenant
    const protocol = yield Protocol_1.default.findOne({
        where: { id: protocolId, tenantId }
    });
    if (!protocol) {
        throw new AppError_1.default("Protocolo não encontrado", 404);
    }
    // Create directory for protocol attachments
    const protocolDir = path_1.default.resolve(process.cwd(), "public", "protocols", String(protocolId));
    if (!fs_1.default.existsSync(protocolDir)) {
        fs_1.default.mkdirSync(protocolDir, { recursive: true });
    }
    const savedAttachments = [];
    for (const file of files) {
        // Move file to protocol directory
        const newFileName = `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
        const newFilePath = path_1.default.join(protocolDir, newFileName);
        // If multer saved to disk, move file. If in memory, write buffer
        if (file.path) {
            fs_1.default.renameSync(file.path, newFilePath);
        }
        else if (file.buffer) {
            fs_1.default.writeFileSync(newFilePath, file.buffer);
        }
        const attachment = yield ProtocolAttachment_1.default.create({
            protocolId,
            tenantId,
            fileName: newFileName,
            originalName: file.originalname,
            filePath: `/protocols/${protocolId}/${newFileName}`,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: userId
        });
        savedAttachments.push(attachment);
    }
    // Add history entry for attachments
    const fileNames = savedAttachments.map(a => a.originalName).join(", ");
    yield ProtocolHistory_1.default.create({
        protocolId,
        userId,
        action: "attachment",
        description: `Anexo(s) adicionado(s): ${fileNames}`,
        changes: JSON.stringify({
            files: savedAttachments.map(a => ({
                id: a.id,
                originalName: a.originalName,
                fileType: a.fileType,
                size: a.fileSize,
                filePath: a.filePath
            }))
        })
    });
    return savedAttachments;
});
exports.default = CreateProtocolAttachmentService;
