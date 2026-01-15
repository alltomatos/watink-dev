"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const PipelineStage_1 = __importDefault(require("../../models/PipelineStage"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ListPipelineService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ tenantId }) {
    console.log("DEBUG: ListPipelineService called with tenantId:", tenantId);
    if (!tenantId) {
        throw new AppError_1.default("Err: Tenant ID missing in request. Please login again.", 403);
    }
    try {
        const pipelines = yield Pipeline_1.default.findAll({
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
});
exports.default = ListPipelineService;
