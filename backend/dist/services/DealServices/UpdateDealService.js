"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Deal_1 = __importDefault(require("../../models/Deal"));
const UpdateDealService = async ({ dealData, dealId, tenantId }) => {
    const deal = await Deal_1.default.findOne({
        where: { id: dealId, tenantId },
        include: ["contact", "ticket"]
    });
    if (!deal) {
        throw new AppError_1.default("ERR_NO_DEAL_FOUND", 404);
    }
    const { title, value, priority, contactId, ticketId, pipelineId, stageId } = dealData;
    await deal.update({
        title,
        value,
        priority,
        contactId,
        ticketId,
        pipelineId,
        stageId
    });
    await deal.reload();
    return deal;
};
exports.default = UpdateDealService;
