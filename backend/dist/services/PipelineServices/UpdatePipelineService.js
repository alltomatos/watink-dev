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
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const UpdatePipelineService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ id, name, description, color, tenantId }) {
    const pipeline = yield Pipeline_1.default.findOne({
        where: { id, tenantId }
    });
    if (!pipeline) {
        throw new AppError_1.default("ERR_NO_PIPELINE_FOUND", 404);
    }
    yield pipeline.update({
        name,
        description,
        color
    });
    return pipeline;
});
exports.default = UpdatePipelineService;
