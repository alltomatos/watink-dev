"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.index = void 0;
const Protocol_1 = __importDefault(require("../models/Protocol"));
const Contact_1 = __importDefault(require("../models/Contact"));
const COLUMNS_CONFIG = [
    { status: "open", label: "Aberto", color: "#2196F3", bgColor: "#E3F2FD" },
    { status: "in_progress", label: "Em Andamento", color: "#FF9800", bgColor: "#FFF3E0" },
    { status: "pending", label: "Pendente", color: "#9E9E9E", bgColor: "#F5F5F5" },
    { status: "resolved", label: "Resolvido", color: "#4CAF50", bgColor: "#E8F5E9" },
    { status: "closed", label: "Fechado", color: "#616161", bgColor: "#EEEEEE" }
];
const index = async (req, res) => {
    const { tenantId } = req.user;
    const protocols = await Protocol_1.default.findAll({
        where: { tenantId },
        include: [
            {
                model: Contact_1.default,
                as: "contact",
                attributes: ["id", "name", "number", "profilePicUrl"]
            }
        ],
        order: [["createdAt", "DESC"]]
    });
    const columns = COLUMNS_CONFIG.map(col => ({
        ...col,
        protocols: protocols.filter(p => p.status === col.status)
    }));
    return res.json({ columns });
};
exports.index = index;
