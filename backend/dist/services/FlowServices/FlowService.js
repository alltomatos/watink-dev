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
const MESSAGE_NODE_TYPES = new Set(["message", "menu", "default", "textupdater"]);
const hasOutboundMessageNodes = (nodes = []) => {
    return nodes.some((node) => MESSAGE_NODE_TYPES.has(String(node?.type || "").toLowerCase()));
};
const buildTriggerFromNodes = (nodes = []) => {
    const triggerNode = nodes.find((n) => ["trigger", "input", "start"].includes(String(n?.type || "").toLowerCase()));
    const data = triggerNode?.data || {};
    // Novo formato (UI atual)
    if (data.triggerType === "keyword") {
        const keyword = data.conditions?.[0]?.value || data.keyword || "";
        return { type: "whatsapp_message", condition: keyword ? { body: keyword } : {} };
    }
    if (data.triggerType === "any" || data.triggerType === "firstContact" || data.triggerType === "message") {
        return { type: "whatsapp_message", condition: {} };
    }
    if (data.triggerType === "tagAdded") {
        const tagId = Number(data.tagId);
        return { type: "tagAdded", condition: Number.isFinite(tagId) ? { tagId } : {} };
    }
    // Formato legado
    if (data.trigger?.type) {
        return {
            type: data.trigger.type,
            condition: data.trigger.condition || {}
        };
    }
    return null;
};
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
    const nextNodes = Array.isArray(flowData.nodes) ? flowData.nodes : (Array.isArray(flow.nodes) ? flow.nodes : []);
    const nextWhatsappId = flowData.whatsappId !== undefined ? flowData.whatsappId : flow.whatsappId;
    // Backend guard: fluxo ativo com nós de envio exige conexão vinculada mesmo em updates diretos via API
    if (flow.isActive && hasOutboundMessageNodes(nextNodes) && !nextWhatsappId) {
        throw new AppError_1.default("Este fluxo possui nós de envio de mensagem. Vincule uma conexão WhatsApp antes de salvar.", 400);
    }
    // Check if whatsappId is already in use (excluding current flow)
    if (nextWhatsappId) {
        const flowExists = await Flow_1.default.findOne({
            where: {
                whatsappId: nextWhatsappId,
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
    // Sync trigger based on flow nodes (current + legacy formats)
    if (flowData.nodes) {
        const triggerConfig = buildTriggerFromNodes(flowData.nodes);
        const existingTrigger = await FlowTrigger_1.default.findOne({ where: { flowId: id } });
        if (triggerConfig) {
            if (existingTrigger) {
                await existingTrigger.update({
                    type: triggerConfig.type,
                    condition: triggerConfig.condition,
                    isActive: true
                });
            }
            else {
                await FlowTrigger_1.default.create({
                    flowId: id,
                    type: triggerConfig.type,
                    condition: triggerConfig.condition,
                    tenantId,
                    isActive: true
                });
            }
        }
        else if (existingTrigger) {
            // Se removeu gatilho, desativa o registro para evitar disparos inesperados
            await existingTrigger.update({ isActive: false, condition: {} });
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
    // Se ativando e o fluxo tiver nós de envio, conexão WhatsApp é obrigatória
    if (newStatus) {
        const flowNodes = Array.isArray(flow.nodes) ? flow.nodes : [];
        const requiresConnection = hasOutboundMessageNodes(flowNodes);
        if (requiresConnection && !flow.whatsappId) {
            throw new AppError_1.default("Este fluxo possui nós de envio de mensagem. Vincule uma conexão WhatsApp antes de ativar.", 400);
        }
    }
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
