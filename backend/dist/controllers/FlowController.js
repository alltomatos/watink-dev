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
exports.simulate = exports.toggle = exports.update = exports.show = exports.index = exports.store = exports.generateFlowAI = void 0;
const FlowAIService_1 = __importDefault(require("../services/FlowServices/FlowAIService"));
const FlowService_1 = require("../services/FlowServices/FlowService");
const FlowExecutorService_1 = __importDefault(require("../services/FlowServices/FlowExecutorService"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const logger_1 = require("../utils/logger");
const generateFlowAI = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt } = req.body;
    if (!prompt) {
        throw new AppError_1.default("Prompt is required", 400);
    }
    const { tenantId } = req.user;
    logger_1.logger.info(`FlowController.generateFlowAI: Gerando fluxo para tenant ${tenantId} com prompt: ${prompt.substring(0, 50)}...`);
    const flowData = yield FlowAIService_1.default.generateFlowFromPrompt(prompt, tenantId);
    return res.json(flowData);
});
exports.generateFlowAI = generateFlowAI;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, nodes, edges, whatsappId } = req.body;
    const { tenantId, id: userId } = req.user;
    const flow = yield (0, FlowService_1.CreateFlowService)({
        name,
        nodes,
        edges,
        tenantId,
        userId: Number(userId),
        whatsappId
    });
    return res.status(201).json(flow);
});
exports.store = store;
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const flows = yield (0, FlowService_1.ListFlowsService)({ tenantId });
    return res.json(flows);
});
exports.index = index;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { flowId } = req.params;
    const { tenantId } = req.user;
    const flow = yield (0, FlowService_1.ShowFlowService)({
        id: Number(flowId),
        tenantId
    });
    return res.json(flow);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { flowId } = req.params;
    const flowData = req.body;
    const { tenantId } = req.user;
    const flow = yield (0, FlowService_1.UpdateFlowService)({
        id: Number(flowId),
        flowData,
        tenantId
    });
    return res.json(flow);
});
exports.update = update;
// Toggle ativar/desativar fluxo
const toggle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { flowId } = req.params;
    const { tenantId } = req.user;
    const flow = yield (0, FlowService_1.ToggleFlowService)({
        id: Number(flowId),
        tenantId
    });
    return res.json({
        id: flow.id,
        name: flow.name,
        isActive: flow.isActive,
        message: flow.isActive ? "Fluxo ativado com sucesso" : "Fluxo desativado com sucesso"
    });
});
exports.toggle = toggle;
// Simular execução do fluxo
const simulate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { flowId } = req.params;
    const { tenantId } = req.user;
    const { message } = req.body;
    const flow = yield (0, FlowService_1.ShowFlowService)({
        id: Number(flowId),
        tenantId
    });
    if (!flow) {
        throw new AppError_1.default("Fluxo não encontrado", 404);
    }
    // Executar simulação
    const result = yield FlowExecutorService_1.default.simulateFlow(flow, message || "Olá, teste de simulação");
    return res.json(result);
});
exports.simulate = simulate;
