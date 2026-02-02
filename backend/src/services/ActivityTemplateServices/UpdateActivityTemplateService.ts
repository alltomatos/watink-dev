import ActivityTemplate from "../../models/ActivityTemplate";
import ActivityTemplateItem from "../../models/ActivityTemplateItem";
import AppError from "../../errors/AppError";

interface ItemData {
    id?: number;
    label: string;
    inputType: "checkbox" | "text" | "photo" | "number";
    isRequired?: boolean;
    order?: number;
}

interface UpdateTemplateData {
    id: number;
    tenantId: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    items?: ItemData[];
}

const UpdateActivityTemplateService = async (
    data: UpdateTemplateData
): Promise<ActivityTemplate> => {
    const { id, tenantId, name, description, isActive, items } = data;

    const template = await ActivityTemplate.findOne({ where: { id, tenantId } });

    if (!template) {
        throw new AppError("ERR_TEMPLATE_NOT_FOUND", 404);
    }

    // Atualizar dados do template
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    await template.update(updateData);

    // Atualizar itens se fornecidos
    if (items !== undefined) {
        // Remover itens antigos
        await ActivityTemplateItem.destroy({ where: { templateId: id } });

        // Criar novos itens
        if (items.length > 0) {
            const templateItems = items.map((item, index) => ({
                templateId: id,
                label: item.label,
                inputType: item.inputType || "checkbox",
                isRequired: item.isRequired || false,
                order: item.order ?? index
            }));

            await ActivityTemplateItem.bulkCreate(templateItems);
        }
    }

    // Retornar template atualizado com itens
    const fullTemplate = await ActivityTemplate.findByPk(id, {
        include: [
            {
                model: ActivityTemplateItem,
                as: "items",
                separate: true,
                order: [["order", "ASC"]]
            }
        ]
    });

    return fullTemplate!;
};

export default UpdateActivityTemplateService;
