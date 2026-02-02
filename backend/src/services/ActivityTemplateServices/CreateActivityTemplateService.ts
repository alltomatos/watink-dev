import ActivityTemplate from "../../models/ActivityTemplate";
import ActivityTemplateItem from "../../models/ActivityTemplateItem";
import AppError from "../../errors/AppError";

interface ItemData {
    label: string;
    inputType: "checkbox" | "text" | "photo" | "number";
    isRequired?: boolean;
    order?: number;
}

interface CreateTemplateData {
    tenantId: string;
    name: string;
    description?: string;
    items?: ItemData[];
}

const CreateActivityTemplateService = async (
    data: CreateTemplateData
): Promise<ActivityTemplate> => {
    const { tenantId, name, description, items } = data;

    if (!name || name.trim() === "") {
        throw new AppError("ERR_TEMPLATE_NAME_REQUIRED", 400);
    }

    // Criar template
    const template = await ActivityTemplate.create({
        tenantId,
        name: name.trim(),
        description: description?.trim() || null,
        isActive: true
    });

    // Criar itens do template
    if (items && items.length > 0) {
        const templateItems = items.map((item, index) => ({
            templateId: template.id,
            label: item.label,
            inputType: item.inputType || "checkbox",
            isRequired: item.isRequired || false,
            order: item.order ?? index
        }));

        await ActivityTemplateItem.bulkCreate(templateItems);
    }

    // Retornar com itens
    const fullTemplate = await ActivityTemplate.findByPk(template.id, {
        include: [{ model: ActivityTemplateItem, as: "items" }]
    });

    return fullTemplate!;
};

export default CreateActivityTemplateService;
