"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.show = void 0;
const Protocol_1 = __importDefault(require("../models/Protocol"));
const ProtocolHistory_1 = __importDefault(require("../models/ProtocolHistory"));
const ProtocolAttachment_1 = __importDefault(require("../models/ProtocolAttachment"));
const User_1 = __importDefault(require("../models/User"));
const Tenant_1 = __importDefault(require("../models/Tenant"));
const Setting_1 = __importDefault(require("../models/Setting"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const show = async (req, res) => {
    const { token } = req.params;
    const protocol = await Protocol_1.default.findOne({
        where: { token },
        include: [
            {
                model: Tenant_1.default,
                as: "tenant",
                attributes: ["name"]
            },
            {
                model: ProtocolAttachment_1.default,
                as: "attachments",
                attributes: ["id", "fileName", "originalName", "fileType", "fileSize", "filePath", "createdAt"]
            },
            {
                model: ProtocolHistory_1.default,
                as: "history",
                include: [
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["name"]
                    }
                ],
                order: [["createdAt", "DESC"]]
            }
        ],
        attributes: [
            "id",
            "protocolNumber",
            "subject",
            "description",
            "status",
            "priority",
            "createdAt",
            "resolvedAt",
            "closedAt",
            "tenantId"
        ]
    });
    if (!protocol) {
        throw new AppError_1.default("Protocol not found", 404);
    }
    const systemTitle = await Setting_1.default.findOne({
        where: { key: "systemTitle", tenantId: protocol.tenantId }
    });
    const systemLogo = await Setting_1.default.findOne({
        where: { key: "systemLogo", tenantId: protocol.tenantId }
    });
    const response = {
        ...protocol.toJSON(),
        tenantConfig: {
            systemTitle: systemTitle?.value,
            systemLogo: systemLogo?.value
        }
    };
    return res.json(response);
};
exports.show = show;
