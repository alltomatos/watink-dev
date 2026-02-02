import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ActivityTemplate from "../../models/ActivityTemplate";
import ActivityTemplateItem from "../../models/ActivityTemplateItem";
import ProtocolHistory from "../../models/ProtocolHistory";
import AppError from "../../errors/AppError";

interface ItemData {
    label: string;
    inputType: "checkbox" | "text" | "photo" | "number";
    isRequired?: boolean;
    order?: number;
}

interface CreateActivityData {
    tenantId: string;
    protocolId: number;
    templateId?: number;
    title: string;
    description?: string;
    userId?: number;
    items?: ItemData[];
}

const CreateActivityService = async (
    data: CreateActivityData
): Promise<Activity> => {
    const { tenantId, protocolId, templateId, title, description, userId, items } = data;

    if (!title || title.trim() === "") {
        throw new AppError("ERR_ACTIVITY_TITLE_REQUIRED", 400);
    }

    // Criar atividade
    const activity = await Activity.create({
        tenantId,
        protocolId,
        templateId: templateId || null,
        title: title.trim(),
        description: description?.trim() || null,
        userId: userId || null,
        status: "pending"
    });

    // Se template foi especificado, copiar itens do template
    if (templateId) {
        const template = await ActivityTemplate.findByPk(templateId, {
            include: [{ model: ActivityTemplateItem, as: "items" }]
        });

        if (template && template.items) {
            const activityItems = template.items.map((templateItem: ActivityTemplateItem) => ({
                activityId: activity.id,
                label: templateItem.label,
                inputType: templateItem.inputType,
                isRequired: templateItem.isRequired,
                order: templateItem.order,
                isDone: false,
                value: null
            }));

            await ActivityItem.bulkCreate(activityItems);
        }
    } else if (items && items.length > 0) {
        // Criar itens customizados
        const activityItems = items.map((item, index) => ({
            activityId: activity.id,
            label: item.label,
            inputType: item.inputType || "checkbox",
            isRequired: item.isRequired || false,
            order: item.order ?? index,
            isDone: false,
            value: null
        }));

        await ActivityItem.bulkCreate(activityItems);
    }

    // Registrar no ProtocolHistory
    await ProtocolHistory.create({
        protocolId,
        userId: userId || null,
        action: "activity_created",
        newValue: title,
        comment: `Atividade "${title}" criada`
    });

    // Retornar atividade completa
    return await Activity.findByPk(activity.id, {
        include: [
            { model: ActivityItem, as: "items" },
            { model: ActivityTemplate, as: "template" }
        ]
    }) as Activity;
};

export default CreateActivityService;
