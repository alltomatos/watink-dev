import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ActivityMaterial from "../../models/ActivityMaterial";
import ProtocolHistory from "../../models/ProtocolHistory";
import AppError from "../../errors/AppError";

const DeleteActivityService = async (
    id: number,
    tenantId: string,
    userId?: number
): Promise<void> => {
    const activity = await Activity.findOne({ where: { id, tenantId } });

    if (!activity) {
        throw new AppError("ERR_ACTIVITY_NOT_FOUND", 404);
    }

    // Verificar se a atividade já foi finalizada
    if (activity.status === "done") {
        throw new AppError("ERR_CANNOT_DELETE_FINISHED_ACTIVITY", 400);
    }

    const activityTitle = activity.title;
    const protocolId = activity.protocolId;

    // Deletar materiais
    await ActivityMaterial.destroy({ where: { activityId: id } });

    // Deletar itens
    await ActivityItem.destroy({ where: { activityId: id } });

    // Deletar atividade
    await activity.destroy();

    // Registrar no ProtocolHistory
    await ProtocolHistory.create({
        protocolId,
        userId: userId || null,
        action: "activity_deleted",
        previousValue: activityTitle,
        comment: `Atividade "${activityTitle}" foi excluída`
    });
};

export default DeleteActivityService;
