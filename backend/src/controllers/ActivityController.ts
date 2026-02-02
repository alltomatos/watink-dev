import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import CreateActivityService from "../services/ActivityServices/CreateActivityService";
import ListActivitiesService from "../services/ActivityServices/ListActivitiesService";
import ShowActivityService from "../services/ActivityServices/ShowActivityService";
import UpdateActivityService from "../services/ActivityServices/UpdateActivityService";
import UpdateActivityItemService from "../services/ActivityServices/UpdateActivityItemService";
import AddActivityMaterialService from "../services/ActivityServices/AddActivityMaterialService";
import FinalizeActivityService from "../services/ActivityServices/FinalizeActivityService";
import DeleteActivityService from "../services/ActivityServices/DeleteActivityService";
import GenerateActivityPdfService from "../services/ActivityServices/GenerateActivityPdfService";
import Activity from "../models/Activity";
import ActivityItem from "../models/ActivityItem";
import ProtocolHistory from "../models/ProtocolHistory";
import AppError from "../errors/AppError";

/**
 * Lista atividades
 * GET /activities
 */
export const index = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { protocolId, userId, status, pageNumber } = req.query;

    const { activities, count, hasMore } = await ListActivitiesService({
        tenantId,
        protocolId: protocolId ? parseInt(protocolId as string, 10) : undefined,
        userId: userId ? parseInt(userId as string, 10) : undefined,
        status: status as string,
        pageNumber: pageNumber as string
    });

    return res.json({ activities, count, hasMore });
};

/**
 * Exibe uma atividade específica
 * GET /activities/:id
 */
export const show = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;
    const { id } = req.params;

    const activity = await ShowActivityService(parseInt(id, 10), tenantId);

    return res.json(activity);
};

/**
 * Cria uma nova atividade
 * POST /activities
 */
export const store = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { protocolId, templateId, title, description, assignedUserId, items } = req.body;

    const activity = await CreateActivityService({
        tenantId,
        protocolId,
        templateId,
        title,
        description,
        userId: assignedUserId || parseInt(currentUserId as string, 10),
        items
    });

    return res.status(201).json(activity);
};

/**
 * Atualiza uma atividade
 * PUT /activities/:id
 */
export const update = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { id } = req.params;
    const { title, description, status, assignedUserId } = req.body;

    const activity = await UpdateActivityService({
        id: parseInt(id, 10),
        tenantId,
        userId: parseInt(currentUserId as string, 10),
        title,
        description,
        status,
        assignedUserId
    });

    return res.json(activity);
};

/**
 * Atualiza um item do checklist
 * PUT /activities/:activityId/items/:itemId
 */
export const updateItem = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { itemId } = req.params;
    const { value, isDone } = req.body;

    const item = await UpdateActivityItemService({
        itemId: parseInt(itemId, 10),
        tenantId,
        userId: parseInt(currentUserId as string, 10),
        value,
        isDone
    });

    return res.json(item);
};

/**
 * Adiciona um material à atividade
 * POST /activities/:id/materials
 */
export const addMaterial = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { id } = req.params;
    const { materialName, quantity, unit, notes } = req.body;

    const material = await AddActivityMaterialService({
        activityId: parseInt(id, 10),
        tenantId,
        userId: parseInt(currentUserId as string, 10),
        materialName,
        quantity,
        unit,
        notes
    });

    return res.status(201).json(material);
};

/**
 * Finaliza uma atividade
 * POST /activities/:id/finalize
 */
export const finalize = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { id } = req.params;
    const { clientSignature, technicianSignature } = req.body;

    const activity = await FinalizeActivityService({
        id: parseInt(id, 10),
        tenantId,
        userId: parseInt(currentUserId as string, 10),
        clientSignature,
        technicianSignature
    });

    return res.json(activity);
};

/**
 * Remove uma atividade
 * DELETE /activities/:id
 */
export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { id } = req.params;

    await DeleteActivityService(parseInt(id, 10), tenantId, parseInt(currentUserId as string, 10));

    return res.status(204).send();
};

/**
 * Minhas atividades (atividades atribuídas ao usuário atual)
 * GET /my-activities
 */
export const myActivities = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { status, pageNumber } = req.query;

    const { activities, count, hasMore } = await ListActivitiesService({
        tenantId,
        userId: parseInt(currentUserId as string, 10),
        status: status as string,
        pageNumber: pageNumber as string
    });

    return res.json({ activities, count, hasMore });
};

/**
 * Gerar PDF do RAT
 * GET /activities/:id/pdf
 */
export const generatePdf = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = req.user;
    const { id } = req.params;

    const pdfBuffer = await GenerateActivityPdfService({
        activityId: parseInt(id, 10),
        tenantId
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=RAT-${id}.pdf`);
    res.send(pdfBuffer);
};

/**
 * Upload de foto para item da atividade
 * POST /activities/:activityId/items/:itemId/photo
 */
export const uploadItemPhoto = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId, id: currentUserId } = req.user;
    const { activityId, itemId } = req.params;

    // Verificar se é um item do tipo photo
    const item = await ActivityItem.findByPk(parseInt(itemId, 10), {
        include: [{ model: Activity, as: "activity" }]
    });

    if (!item) {
        throw new AppError("ERR_ACTIVITY_ITEM_NOT_FOUND", 404);
    }

    if (item.activity.tenantId !== tenantId) {
        throw new AppError("ERR_ACTIVITY_ITEM_NOT_FOUND", 404);
    }

    if (item.inputType !== "photo") {
        throw new AppError("ERR_ITEM_NOT_PHOTO_TYPE", 400);
    }

    if (item.activity.status === "done" || item.activity.status === "cancelled") {
        throw new AppError("ERR_ACTIVITY_ALREADY_FINISHED", 400);
    }

    // A foto já foi processada pelo multer
    if (!req.file) {
        throw new AppError("ERR_NO_FILE_UPLOADED", 400);
    }

    const baseUrl = process.env.BACKEND_URL || "";
    const photoUrl = `${baseUrl}/public/${req.file.filename}`;

    // Atualizar item com a URL da foto
    await item.update({
        value: photoUrl,
        isDone: true
    });

    // Registrar no ProtocolHistory
    await ProtocolHistory.create({
        protocolId: item.activity.protocolId,
        userId: parseInt(currentUserId as string, 10),
        action: "activity_photo_added",
        newValue: photoUrl,
        comment: `Foto adicionada ao item "${item.label}" na atividade "${item.activity.title}"`
    });

    return res.json({
        message: "Foto enviada com sucesso",
        photoUrl,
        item
    });
};
