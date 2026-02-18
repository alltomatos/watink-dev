"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ListWhatsAppsService = async (tenantId) => {
    const whereCondition = {};
    if (tenantId) {
        whereCondition.tenantId = tenantId;
    }
    const whatsapps = await Whatsapp_1.default.findAll({
        where: whereCondition,
        include: [
            {
                model: Queue_1.default,
                as: "queues",
                attributes: ["id", "name", "color", "greetingMessage"]
            }
        ]
    });
    return whatsapps;
};
exports.default = ListWhatsAppsService;
