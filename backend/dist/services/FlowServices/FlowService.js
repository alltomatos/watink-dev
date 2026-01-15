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
exports.ToggleFlowService = exports.ShowFlowService = exports.UpdateFlowService = exports.ListFlowsService = exports.CreateFlowService = void 0;
const Flow_1 = __importDefault(require("../../models/Flow"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const FlowTrigger_1 = __importDefault(require("../../models/FlowTrigger"));
const sequelize_1 = require("sequelize");
const CreateFlowService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ name, nodes, edges, tenantId, userId, whatsappId }) {
    // Check if whatsappId is already in use
    if (whatsappId) {
        const flowExists = yield Flow_1.default.findOne({
            where: {
                whatsappId,
                tenantId,
                isActive: true
            }
        });
        if (flowExists) {
            throw new AppError_1.default("This connection is already bound to another flow.", 409);
        }
    }
    const flow = yield Flow_1.default.create({
        name,
        nodes,
        edges,
        tenantId,
        userId,
        whatsappId
    });
    return flow;
});
exports.CreateFlowService = CreateFlowService;
const ListFlowsService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ tenantId }) {
    const flows = yield Flow_1.default.findAll({
        where: { tenantId },
        order: [["updatedAt", "DESC"]],
        include: ["whatsapp"] // Eager load connection info
    });
    return flows;
});
exports.ListFlowsService = ListFlowsService;
const UpdateFlowService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ id, flowData, tenantId }) {
    const flow = yield Flow_1.default.findOne({
        where: { id, tenantId }
    });
    if (!flow) {
        throw new AppError_1.default("Flow not found", 404);
    }
    // Check if whatsappId is already in use (excluding current flow)
    if (flowData.whatsappId) {
        const flowExists = yield Flow_1.default.findOne({
            where: {
                whatsappId: flowData.whatsappId,
                tenantId,
                isActive: true,
                id: { [sequelize_1.Op.ne]: id }
            }
        });
        if (flowExists) {
            throw new AppError_1.default("This connection is already bound to another flow.", 409);
        }
    }
    yield flow.update(flowData);
    // Sync Triggers based on Start Node
    if (flowData.nodes) {
        const startNode = flowData.nodes.find((n) => n.type === "input");
        if (startNode && startNode.data && startNode.data.trigger) {
            const { type, condition } = startNode.data.trigger;
            // Upsert Trigger
            const existingTrigger = yield FlowTrigger_1.default.findOne({ where: { flowId: id } });
            if (existingTrigger) {
                yield existingTrigger.update({ type, condition, isActive: true });
            }
            else {
                yield FlowTrigger_1.default.create({
                    flowId: id,
                    type,
                    condition,
                    tenantId,
                    isActive: true
                });
            }
        }
    }
    return flow;
});
exports.UpdateFlowService = UpdateFlowService;
const ShowFlowService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ id, tenantId }) {
    const flow = yield Flow_1.default.findOne({
        where: { id, tenantId },
        include: ["whatsapp"]
    });
    if (!flow) {
        throw new AppError_1.default("Flow not found", 404);
    }
    return flow;
});
exports.ShowFlowService = ShowFlowService;
const ToggleFlowService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ id, tenantId }) {
    const flow = yield Flow_1.default.findOne({
        where: { id, tenantId }
    });
    if (!flow) {
        throw new AppError_1.default("Flow not found", 404);
    }
    // Toggle isActive
    const newStatus = !flow.isActive;
    // Se ativando, verificar se whatsappId já está em uso por outro fluxo ativo
    if (newStatus && flow.whatsappId) {
        const conflictFlow = yield Flow_1.default.findOne({
            where: {
                whatsappId: flow.whatsappId,
                tenantId,
                isActive: true,
                id: { [sequelize_1.Op.ne]: id }
            }
        });
        if (conflictFlow) {
            throw new AppError_1.default(`Esta conexão já está vinculada ao fluxo "${conflictFlow.name}". Desative-o primeiro.`, 409);
        }
    }
    yield flow.update({ isActive: newStatus });
    return flow;
});
exports.ToggleFlowService = ToggleFlowService;
