"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Deal_1 = __importDefault(require("../../models/Deal"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const PipelineStage_1 = __importDefault(require("../../models/PipelineStage"));
const ListDealsService = async ({ tenantId, searchParam = "", pageNumber = "1", pipelineId, stageId, ticketId }) => {
    const whereCondition = {
        tenantId
    };
    if (ticketId) {
        whereCondition.ticketId = ticketId;
    }
    if (searchParam) {
        const titleFilter = {};
        // @ts-ignore
        titleFilter[sequelize_1.Op.iLike] = `%${searchParam}%`;
        whereCondition[sequelize_1.Op.or] = [
            { title: titleFilter }
        ];
    }
    if (pipelineId) {
        whereCondition.pipelineId = pipelineId;
    }
    if (stageId) {
        whereCondition.stageId = stageId;
    }
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: deals } = await Deal_1.default.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        include: [
            { model: Contact_1.default, as: "contact", attributes: ["id", "name", "number", "profilePicUrl"] },
            { model: Ticket_1.default, as: "ticket", attributes: ["id", "status"] },
            { model: Pipeline_1.default, as: "pipeline", attributes: ["id", "name", "color"] },
            { model: PipelineStage_1.default, as: "stage", attributes: ["id", "name"] }
        ],
        order: [["updatedAt", "DESC"]]
    });
    const hasMore = count > offset + deals.length;
    return {
        deals,
        count,
        hasMore
    };
};
exports.default = ListDealsService;
