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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importPipeline = exports.exportPipeline = exports.aiSuggest = exports.remove = exports.update = exports.store = exports.index = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CreatePipelineService_1 = __importDefault(require("../services/PipelineServices/CreatePipelineService"));
const ListPipelineService_1 = __importDefault(require("../services/PipelineServices/ListPipelineService"));
const UpdatePipelineService_1 = __importDefault(require("../services/PipelineServices/UpdatePipelineService"));
const DeletePipelineService_1 = __importDefault(require("../services/PipelineServices/DeletePipelineService"));
const AIService_1 = __importDefault(require("../services/PipelineServices/AIService"));
const index = async (req, res) => {
    const { tenantId } = req.user;
    const pipelines = await (0, ListPipelineService_1.default)({ tenantId });
    return res.status(200).json(pipelines);
};
exports.index = index;
const store = async (req, res) => {
    const { tenantId } = req.user;
    const { name, type, description, stages } = req.body;
    const pipeline = await (0, CreatePipelineService_1.default)({
        name,
        type,
        description,
        stages,
        tenantId
    });
    return res.status(201).json(pipeline);
};
exports.store = store;
const update = async (req, res) => {
    const { tenantId } = req.user;
    const { pipelineId } = req.params;
    const { name, description, color } = req.body;
    const pipeline = await (0, UpdatePipelineService_1.default)({
        id: pipelineId,
        name,
        description,
        color,
        tenantId
    });
    return res.status(200).json(pipeline);
};
exports.update = update;
const remove = async (req, res) => {
    const { tenantId } = req.user;
    const { pipelineId } = req.params;
    await (0, DeletePipelineService_1.default)(pipelineId, tenantId);
    return res.status(200).json({ message: "Pipeline deleted" });
};
exports.remove = remove;
const aiSuggest = async (req, res) => {
    const { tenantId } = req.user;
    const { messages } = req.body;
    const suggestion = await (0, AIService_1.default)(messages, tenantId);
    return res.json(suggestion);
};
exports.aiSuggest = aiSuggest;
const exportPipeline = async (req, res) => {
    const { tenantId } = req.user;
    const { pipelineId } = req.params;
    const pipeline = await (0, ListPipelineService_1.default)({ tenantId });
    const selectedPipeline = pipeline.find(p => p.id === Number(pipelineId));
    if (!selectedPipeline) {
        throw new AppError_1.default("Pipeline not found", 404);
    }
    const exportData = {
        name: selectedPipeline.name,
        description: selectedPipeline.description,
        type: selectedPipeline.type,
        stages: selectedPipeline.stages.map(stage => ({ name: stage.name }))
    };
    return res.json(exportData);
};
exports.exportPipeline = exportPipeline;
const importPipeline = async (req, res) => {
    const { tenantId } = req.user;
    const { name, type, description, stages } = req.body;
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        stages: Yup.array().of(Yup.object().shape({
            name: Yup.string().required()
        })).required()
    });
    try {
        await schema.validate({ name, stages });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const pipeline = await (0, CreatePipelineService_1.default)({
        name,
        type: type || "kanban",
        description,
        stages,
        tenantId
    });
    return res.status(201).json(pipeline);
};
exports.importPipeline = importPipeline;
