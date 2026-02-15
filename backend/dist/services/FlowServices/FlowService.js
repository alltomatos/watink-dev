"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleFlowService = exports.ShowFlowService = exports.UpdateFlowService = exports.ListFlowsService = exports.CreateFlowService = void 0;
const Flow_1 = __importDefault(require("../../models/Flow"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const FlowTrigger_1 = __importDefault(require("../../models/FlowTrigger"));
const sequelize_1 = require("sequelize");
const CreateFlowService = async ({ name, nodes, edges, tenantId, userId, whatsappId }) => {
    // Check if whatsappId is already in use
    if (whatsappId) {
        const flowExists = await Flow_1.default.findOne({
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
    const flow = await Flow_1.default.create({
        name,
        nodes,
        edges,
        tenantId,
        userId,
        whatsappId
    });
    return flow;
};
exports.CreateFlowService = CreateFlowService;
const ListFlowsService = async ({ tenantId }) => {
    const flows = await Flow_1.default.findAll({
        where: { tenantId },
        order: [["updatedAt", "DESC"]],
        include: ["whatsapp"] // Eager load connection info
    });
    return flows;
};
exports.ListFlowsService = ListFlowsService;
const UpdateFlowService = async ({ id, flowData, tenantId }) => {
    const flow = await Flow_1.default.findOne({
        where: { id, tenantId }
    });
    if (!flow) {
        throw new AppError_1.default("Flow not found", 404);
    }
    // Check if whatsappId is already in use (excluding current flow)
    if (flowData.whatsappId) {
        const flowExists = await Flow_1.default.findOne({
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
    await flow.update(flowData);
    // Sync Triggers based on Start Node
    if (flowData.nodes) {
        const startNode = flowData.nodes.find((n) => n.type === "input");
        if (startNode && startNode.data && startNode.data.trigger) {
            const { type, condition } = startNode.data.trigger;
            // Upsert Trigger
            const existingTrigger = await FlowTrigger_1.default.findOne({ where: { flowId: id } });
            if (existingTrigger) {
                await existingTrigger.update({ type, condition, isActive: true });
            }
            else {
                await FlowTrigger_1.default.create({
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
};
exports.UpdateFlowService = UpdateFlowService;
const ShowFlowService = async ({ id, tenantId }) => {
    const flow = await Flow_1.default.findOne({
        where: { id, tenantId },
        include: ["whatsapp"]
    });
    if (!flow) {
        throw new AppError_1.default("Flow not found", 404);
    }
    return flow;
};
exports.ShowFlowService = ShowFlowService;
const ToggleFlowService = async ({ id, tenantId }) => {
    const flow = await Flow_1.default.findOne({
        where: { id, tenantId }
    });
    if (!flow) {
        throw new AppError_1.default("Flow not found", 404);
    }
    // Toggle isActive
    const newStatus = !flow.isActive;
    // Se ativando, verificar se whatsappId já está em uso por outro fluxo ativo
    if (newStatus && flow.whatsappId) {
        const conflictFlow = await Flow_1.default.findOne({
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
    await flow.update({ isActive: newStatus });
    return flow;
};
exports.ToggleFlowService = ToggleFlowService;
