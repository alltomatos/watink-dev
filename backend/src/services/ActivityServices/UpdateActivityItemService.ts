import ActivityItem from "../../models/ActivityItem";
import Activity from "../../models/Activity";
import ProtocolHistory from "../../models/ProtocolHistory";
import AppError from "../../errors/AppError";

interface UpdateItemData {
    itemId: number;
    tenantId: string;
    userId?: number;
    value?: string;
    isDone?: boolean;
}

const UpdateActivityItemService = async (
    data: UpdateItemData
): Promise<ActivityItem> => {
    const { itemId, tenantId, userId, value, isDone } = data;

    const item = await ActivityItem.findByPk(itemId, {
        include: [{ model: Activity, as: "activity" }]
    });

    if (!item) {
        throw new AppError("ERR_ACTIVITY_ITEM_NOT_FOUND", 404);
    }

    // Verificar se o item pertence ao tenant
    if (item.activity.tenantId !== tenantId) {
        throw new AppError("ERR_ACTIVITY_ITEM_NOT_FOUND", 404);
    }

    // Verificar se a atividade ainda pode ser editada
    if (item.activity.status === "done" || item.activity.status === "cancelled") {
        throw new AppError("ERR_ACTIVITY_ALREADY_FINISHED", 400);
    }

    const previousValue = item.value;
    const previousIsDone = item.isDone;
    const updateData: any = {};

    if (value !== undefined) updateData.value = value;
    if (isDone !== undefined) updateData.isDone = isDone;

    await item.update(updateData);

    // Registrar mudança no ProtocolHistory (apenas para itens marcados como done)
    if (isDone !== undefined && isDone !== previousIsDone && isDone) {
        await ProtocolHistory.create({
            protocolId: item.activity.protocolId,
            userId: userId || null,
            action: "activity_item_completed",
            newValue: item.label,
            comment: `Item "${item.label}" marcado como concluído na atividade "${item.activity.title}"`
        });
    }

    // Se item do tipo photo e valor for URL
    if (item.inputType === "photo" && value && value !== previousValue) {
        await ProtocolHistory.create({
            protocolId: item.activity.protocolId,
            userId: userId || null,
            action: "activity_photo_added",
            newValue: value,
            comment: `Foto adicionada ao item "${item.label}" na atividade "${item.activity.title}"`
        });
    }

    return item;
};

export default UpdateActivityItemService;
