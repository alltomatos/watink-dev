"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const PipelineStage_1 = __importDefault(require("../../models/PipelineStage"));
const CreatePipelineService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ name, type, description, stages, tenantId }) {
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        type: Yup.string().required().oneOf(["kanban", "funnel"]),
        stages: Yup.array().of(Yup.object().shape({
            name: Yup.string().required()
        })).required().min(1)
    });
    try {
        yield schema.validate({ name, type, stages });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    // Criar Pipeline
    const pipeline = yield Pipeline_1.default.create({
        name,
        type,
        description,
        tenantId,
        color: '#3B82F6' // Cor default
    });
    // Criar Stages
    if (stages && stages.length > 0) {
        const stagesToCreate = stages.map((stage, index) => ({
            name: stage.name,
            color: stage.color || '#E2E8F0',
            order: index,
            pipelineId: pipeline.id
        }));
        yield PipelineStage_1.default.bulkCreate(stagesToCreate);
    }
    // Recarregar com stages
    yield pipeline.reload({
        include: [
            { model: PipelineStage_1.default, as: "stages" }
        ]
    });
    return pipeline;
});
exports.default = CreatePipelineService;
