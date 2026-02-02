import { Request, Response } from "express";
import CreateActivityTemplateService from "../services/ActivityTemplateServices/CreateActivityTemplateService";
import ListActivityTemplatesService from "../services/ActivityTemplateServices/ListActivityTemplatesService";
import ShowActivityTemplateService from "../services/ActivityTemplateServices/ShowActivityTemplateService";
import UpdateActivityTemplateService from "../services/ActivityTemplateServices/UpdateActivityTemplateService";
import DeleteActivityTemplateService from "../services/ActivityTemplateServices/DeleteActivityTemplateService";

/**
 * Lista templates de atividade
 * GET /activity-templates
 */
export const index = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { searchParam, pageNumber, showInactive } = req.query;

    const { templates, count, hasMore } = await ListActivityTemplatesService({
        tenantId,
        searchParam: searchParam as string,
        pageNumber: pageNumber as string,
        showInactive: showInactive === "true"
    });

    return res.json({ templates, count, hasMore });
};

/**
 * Exibe um template específico
 * GET /activity-templates/:id
 */
export const show = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { id } = req.params;

    const template = await ShowActivityTemplateService(parseInt(id, 10), tenantId);

    return res.json(template);
};

/**
 * Cria um novo template
 * POST /activity-templates
 */
export const store = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { name, description, items } = req.body;

    const template = await CreateActivityTemplateService({
        tenantId,
        name,
        description,
        items
    });

    return res.status(201).json(template);
};

/**
 * Atualiza um template existente
 * PUT /activity-templates/:id
 */
export const update = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { name, description, isActive, items } = req.body;

    const template = await UpdateActivityTemplateService({
        id: parseInt(id, 10),
        tenantId,
        name,
        description,
        isActive,
        items
    });

    return res.json(template);
};

/**
 * Remove um template
 * DELETE /activity-templates/:id
 */
export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { id } = req.params;

    await DeleteActivityTemplateService(parseInt(id, 10), tenantId);

    return res.status(204).send();
};
