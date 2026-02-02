import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ActivityMaterial from "../../models/ActivityMaterial";
import ProtocolHistory from "../../models/ProtocolHistory";
import AppError from "../../errors/AppError";

interface FinalizeActivityData {
    id: number;
    tenantId: string;
    userId?: number;
    clientSignature?: string;
    technicianSignature?: string;
}

const FinalizeActivityService = async (
    data: FinalizeActivityData
): Promise<Activity> => {
    const { id, tenantId, userId, clientSignature, technicianSignature } = data;

    const activity = await Activity.findOne({
        where: { id, tenantId },
        include: [
            { model: ActivityItem, as: "items" },
            { model: ActivityMaterial, as: "materials" }
        ]
    });

    if (!activity) {
        throw new AppError("ERR_ACTIVITY_NOT_FOUND", 404);
    }

    // Verificar se já está finalizada
    if (activity.status === "done" || activity.status === "cancelled") {
        throw new AppError("ERR_ACTIVITY_ALREADY_FINISHED", 400);
    }

    // Verificar se todos os itens obrigatórios estão completos
    const requiredItems = activity.items.filter(item => item.isRequired);
    const incompleteRequired = requiredItems.filter(item => !item.isDone);

    if (incompleteRequired.length > 0) {
        const itemLabels = incompleteRequired.map(item => item.label).join(", ");
        throw new AppError(`ERR_REQUIRED_ITEMS_INCOMPLETE: ${itemLabels}`, 400);
    }

    // Atualizar atividade com assinaturas e status
    await activity.update({
        status: "done",
        finishedAt: new Date(),
        clientSignature: clientSignature || activity.clientSignature,
        technicianSignature: technicianSignature || activity.technicianSignature
    });

    // Registrar no ProtocolHistory
    await ProtocolHistory.create({
        protocolId: activity.protocolId,
        userId: userId || null,
        action: "activity_finalized",
        previousValue: activity.status,
        newValue: "done",
        comment: `Atividade "${activity.title}" finalizada com sucesso`
    });

    // Retornar atividade atualizada
    return await Activity.findByPk(id, {
        include: [
            { model: ActivityItem, as: "items" },
            { model: ActivityMaterial, as: "materials" }
        ]
    }) as Activity;
};

export default FinalizeActivityService;
