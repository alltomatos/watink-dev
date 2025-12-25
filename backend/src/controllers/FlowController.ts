import { Request, Response } from "express";
import FlowAIService from "../services/FlowServices/FlowAIService";
import { CreateFlowService, ListFlowsService, UpdateFlowService, ShowFlowService } from "../services/FlowServices/FlowService";
import AppError from "../errors/AppError";

export const generateFlowAI = async (req: Request, res: Response): Promise<Response> => {
    const { prompt } = req.body;

    if (!prompt) {
        throw new AppError("Prompt is required", 400);
    }

    const { tenantId } = req.user;
    const flowData = await FlowAIService.generateFlowFromPrompt(prompt, tenantId);

    return res.json(flowData);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { name, nodes, edges } = req.body;
    const { tenantId, id: userId } = req.user;

    const flow = await CreateFlowService({
        name,
        nodes,
        edges,
        tenantId,
        userId: Number(userId)
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
