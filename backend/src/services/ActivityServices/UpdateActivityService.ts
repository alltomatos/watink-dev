import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ProtocolHistory from "../../models/ProtocolHistory";
import AppError from "../../errors/AppError";

interface UpdateActivityData {
    id: number;
    tenantId: string;
    userId?: number;
    title?: string;
    description?: string;
    status?: "pending" | "in_progress" | "done" | "cancelled";
    assignedUserId?: number;
}

const UpdateActivityService = async (
    data: UpdateActivityData
): Promise<Activity> => {
    const { id, tenantId, userId, title, description, status, assignedUserId } = data;

    const activity = await Activity.findOne({
        where: { id, tenantId },
        include: [{ model: ActivityItem, as: "items" }]
    });

    if (!activity) {
        throw new AppError("ERR_ACTIVITY_NOT_FOUND", 404);
    }

    const previousStatus = activity.status;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (assignedUserId !== undefined) updateData.userId = assignedUserId;

    // Atualizar status com lógica especial
    if (status !== undefined && status !== previousStatus) {
        updateData.status = status;

        // Marcar timestamps baseado no status
        if (status === "in_progress" && !activity.startedAt) {
            updateData.startedAt = new Date();
        } else if (status === "done" || status === "cancelled") {
            updateData.finishedAt = new Date();
        }

        // Registrar mudança de status no ProtocolHistory
        await ProtocolHistory.create({
            protocolId: activity.protocolId,
            userId: userId || null,
            action: "activity_status_changed",
            previousValue: previousStatus,
            newValue: status,
            comment: `Atividade "${activity.title}" alterada de ${previousStatus} para ${status}`
        });
    }

    await activity.update(updateData);

    // Retornar atividade atualizada
    return await Activity.findByPk(id, {
        include: [
            { model: ActivityItem, as: "items" }
        ]
    }) as Activity;
};

export default UpdateActivityService;
