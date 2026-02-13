import { Request, Response } from "express";
import FlowAIService from "../services/FlowServices/FlowAIService";
import { CreateFlowService, ListFlowsService, UpdateFlowService, ShowFlowService, ToggleFlowService } from "../services/FlowServices/FlowService";
import FlowExecutorService from "../services/FlowServices/FlowExecutorService";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import ShowTicketService from "../services/TicketServices/ShowTicketService";

export const generateFlowAI = async (req: Request, res: Response): Promise<Response> => {
    const { prompt } = req.body;

    if (!prompt) {
        throw new AppError("Prompt is required", 400);
    }

    const { tenantId } = req.user;
    logger.info(`FlowController.generateFlowAI: Gerando fluxo para tenant ${tenantId} com prompt: ${prompt.substring(0, 50)}...`);
    const flowData = await FlowAIService.generateFlowFromPrompt(prompt, tenantId);

    return res.json(flowData);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { name, nodes, edges, whatsappId } = req.body;
    const { tenantId, id: userId } = req.user;

    const flow = await CreateFlowService({
        name,
        nodes,
        edges,
        tenantId,
        userId: Number(userId),
        whatsappId
    });

    return res.status(201).json(flow);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const flows = await ListFlowsService({ tenantId });
    return res.json(flows);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { flowId } = req.params;
    const { tenantId } = req.user;

    const flow = await ShowFlowService({
        id: Number(flowId),
        tenantId
    });

    return res.json(flow);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { flowId } = req.params;
    const flowData = req.body;
    const { tenantId } = req.user;

    const flow = await UpdateFlowService({
        id: Number(flowId),
        flowData,
        tenantId
    });

    return res.json(flow);
};

// Toggle ativar/desativar fluxo
export const toggle = async (req: Request, res: Response): Promise<Response> => {
    const { flowId } = req.params;
    const { tenantId } = req.user;

    const flow = await ToggleFlowService({
        id: Number(flowId),
        tenantId
    });

    return res.json({
        id: flow.id,
        name: flow.name,
        isActive: flow.isActive,
        message: flow.isActive ? "Fluxo ativado com sucesso" : "Fluxo desativado com sucesso"
    });
};

// Simular execução do fluxo
export const simulate = async (req: Request, res: Response): Promise<Response> => {
    const { flowId } = req.params;
    const { tenantId } = req.user;
    const { message } = req.body;

    const flow = await ShowFlowService({
        id: Number(flowId),
        tenantId
    });

    if (!flow) {
        throw new AppError("Fluxo não encontrado", 404);
    }

    // Executar simulação
    const result = await FlowExecutorService.simulateFlow(flow, message || "Olá, teste de simulação");

    return res.json(result);
};

export const startForTicket = async (req: Request, res: Response): Promise<Response> => {
    const { flowId, ticketId } = req.params;
    const { tenantId } = req.user;

    const flow = await ShowFlowService({
        id: Number(flowId),
        tenantId
    });

    if (!flow.isActive) {
        throw new AppError("Fluxo inativo", 400);
    }

    const ticket = await ShowTicketService(ticketId, tenantId);

    if (flow.whatsappId && ticket.whatsappId && Number(flow.whatsappId) !== Number(ticket.whatsappId)) {
        throw new AppError("Fluxo não está vinculado à conexão do ticket", 400);
    }

    const session = await FlowExecutorService.start(
        Number(flowId),
        {
            ticketId: ticket.id,
            contactId: ticket.contactId,
            tenantId
        },
        tenantId
    );

    logger.info(`[FlowController] Manual flow start flowId=${flow.id} ticketId=${ticket.id} sessionId=${session.id}`);

    return res.status(200).json({
        ok: true,
        flowId: flow.id,
        ticketId: ticket.id,
        sessionId: session.id
    });
};
