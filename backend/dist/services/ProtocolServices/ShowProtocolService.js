"use strict";
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
const ShowProtocolService = async (protocolId, tenantId) => {
    const protocol = await Protocol_1.default.findOne({
        where: { id: protocolId, tenantId },
        include: [
            { model: Contact_1.default, as: "contact" },
            { model: User_1.default, as: "user" },
            { model: Ticket_1.default, as: "ticket" },
            {
                model: ProtocolHistory_1.default,
                as: "history",
                include: [{ model: User_1.default, as: "user" }],
                order: [["createdAt", "DESC"]]
            }
        ]
    });
    if (!protocol) {
        throw new AppError_1.default("ERR_PROTOCOL_NOT_FOUND", 404);
    }
    return protocol;
};
exports.default = ShowProtocolService;
