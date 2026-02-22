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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const ProtocolHistory_1 = __importDefault(require("../../models/ProtocolHistory"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const User_1 = __importDefault(require("../../models/User"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CreateProtocolAttachmentService_1 = __importDefault(require("./CreateProtocolAttachmentService"));
const UpdateProtocolService = async (data, updatedByUserId) => {
    const { id, tenantId, comment, files, ...updateData } = data;
    const protocol = await Protocol_1.default.findOne({ where: { id, tenantId } });
    if (!protocol) {
        throw new AppError_1.default("ERR_PROTOCOL_NOT_FOUND", 404);
    }
    const previousStatus = protocol.status;
    const previousPriority = protocol.priority;
    // Handle status changes
    if (updateData.status && updateData.status !== previousStatus) {
        if (updateData.status === "resolved") {
            updateData["resolvedAt"] = new Date();
        }
        if (updateData.status === "closed") {
            updateData["closedAt"] = new Date();
        }
    }
    await protocol.update(updateData);
    // Create history entries for changes
    if (updateData.status && updateData.status !== previousStatus) {
        await ProtocolHistory_1.default.create({
            protocolId: id,
            userId: updatedByUserId,
            action: "status_changed",
            previousValue: previousStatus,
            newValue: updateData.status,
            comment: comment || `Status alterado de ${previousStatus} para ${updateData.status}`
        });
    }
    if (updateData.priority && updateData.priority !== previousPriority) {
        await ProtocolHistory_1.default.create({
            protocolId: id,
            userId: updatedByUserId,
            action: "priority_changed",
            previousValue: previousPriority,
            newValue: updateData.priority
        });
    }
    if (comment && !updateData.status) {
        await ProtocolHistory_1.default.create({
            protocolId: id,
            userId: updatedByUserId,
            action: "commented",
            comment
        });
    }
    // Handle file attachments if present
    if (files && files.length > 0) {
        await (0, CreateProtocolAttachmentService_1.default)({
            protocolId: id,
            tenantId,
            userId: updatedByUserId,
            files
        });
    }
    const fullProtocol = await Protocol_1.default.findByPk(id, {
        include: [
            { model: Contact_1.default, as: "contact" },
            { model: User_1.default, as: "user" },
            { model: Ticket_1.default, as: "ticket" },
            { model: ProtocolHistory_1.default, as: "history", include: [{ model: User_1.default, as: "user" }] }
        ]
    });
    // Emit socket event for real-time Kanban updates
    try {
        const { getIO } = await Promise.resolve().then(() => __importStar(require("../../libs/socket")));
        const io = getIO();
        io.to("helpdesk-kanban").emit("protocol", {
            action: "update",
            protocol: fullProtocol,
            previousStatus,
            newStatus: updateData.status || previousStatus
        });
    }
    catch (err) {
        console.error("Error emitting protocol socket event:", err);
    }
    return fullProtocol;
};
exports.default = UpdateProtocolService;
