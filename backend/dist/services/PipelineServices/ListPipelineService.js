"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const PipelineStage_1 = __importDefault(require("../../models/PipelineStage"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ListPipelineService = async ({ tenantId }) => {
    console.log("DEBUG: ListPipelineService called with tenantId:", tenantId);
    if (!tenantId) {
        throw new AppError_1.default("Err: Tenant ID missing in request. Please login again.", 403);
    }
    try {
        const pipelines = await Pipeline_1.default.findAll({
            where: { tenantId },
            include: [
                {
                    model: PipelineStage_1.default,
                    as: "stages",
                    attributes: ["id", "name", "order", "color"]
                }
            ],
            order: [["createdAt", "DESC"]]
        });
        console.log("DEBUG: ListPipelineService found pipelines:", pipelines.length);
        return pipelines;
    }
    catch (err) {
        console.error("DEBUG: ListPipelineService ERROR:", err);
        throw err;
    }
};
exports.default = ListPipelineService;
