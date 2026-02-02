import ActivityMaterial from "../../models/ActivityMaterial";
import Activity from "../../models/Activity";
import ProtocolHistory from "../../models/ProtocolHistory";
import AppError from "../../errors/AppError";

interface AddMaterialData {
    activityId: number;
    tenantId: string;
    userId?: number;
    materialName: string;
    quantity?: number;
    unit?: string;
    notes?: string;
}

const AddActivityMaterialService = async (
    data: AddMaterialData
): Promise<ActivityMaterial> => {
    const { activityId, tenantId, userId, materialName, quantity, unit, notes } = data;

    if (!materialName || materialName.trim() === "") {
        throw new AppError("ERR_MATERIAL_NAME_REQUIRED", 400);
    }

    const activity = await Activity.findOne({ where: { id: activityId, tenantId } });

    if (!activity) {
        throw new AppError("ERR_ACTIVITY_NOT_FOUND", 404);
    }

    // Verificar se a atividade ainda pode ser editada
    if (activity.status === "done" || activity.status === "cancelled") {
        throw new AppError("ERR_ACTIVITY_ALREADY_FINISHED", 400);
    }

    const material = await ActivityMaterial.create({
        activityId,
        materialName: materialName.trim(),
        quantity: quantity || 1,
        unit: unit?.trim() || null,
        notes: notes?.trim() || null
    });

    // Registrar no ProtocolHistory
    await ProtocolHistory.create({
        protocolId: activity.protocolId,
        userId: userId || null,
        action: "activity_material_added",
        newValue: `${quantity || 1}x ${materialName}`,
        comment: `Material "${materialName}" adicionado à atividade "${activity.title}"`
    });

    return material;
};

export default AddActivityMaterialService;
