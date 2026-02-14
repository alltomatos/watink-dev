"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const ListWhatsAppsService = async (tenantId) => {
    const ctx = require("../../libs/context").default.getStore();
    const effectiveTenantId = tenantId || ctx?.tenantId;
    const whereCondition = {};
    if (effectiveTenantId) {
        whereCondition.tenantId = effectiveTenantId;
    }
    const whatsapps = await Whatsapp_1.default.findAll({
        where: whereCondition,
        include: [
            {
                model: Queue_1.default,
                as: "queues",
                attributes: ["id", "name", "color", "greetingMessage"]
            },
            {
                model: Tag_1.default,
                as: "tags",
                attributes: ["id", "name", "color"]
            }
        ]
    });
    return whatsapps;
};
exports.default = ListWhatsAppsService;
