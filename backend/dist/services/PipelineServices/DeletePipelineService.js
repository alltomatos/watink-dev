"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const DeletePipelineService = async (id, tenantId) => {
    const pipeline = await Pipeline_1.default.findOne({
        where: { id, tenantId }
    });
    if (!pipeline) {
        throw new AppError_1.default("ERR_NO_PIPELINE_FOUND", 404);
    }
    await pipeline.destroy();
};
exports.default = DeletePipelineService;
