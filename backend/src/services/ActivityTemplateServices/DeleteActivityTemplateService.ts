import Activity from "../../models/Activity";
import ActivityTemplate from "../../models/ActivityTemplate";
import ActivityTemplateItem from "../../models/ActivityTemplateItem";
import AppError from "../../errors/AppError";

const DeleteActivityTemplateService = async (
    id: number,
    tenantId: string
): Promise<void> => {
    const template = await ActivityTemplate.findOne({ where: { id, tenantId } });

    if (!template) {
        throw new AppError("ERR_TEMPLATE_NOT_FOUND", 404);
    }

    // Verificar se há atividades usando este template
    const activitiesCount = await Activity.count({ where: { templateId: id } });

    if (activitiesCount > 0) {
        // Se houver atividades, apenas desativar (soft delete)
        await template.update({ isActive: false });
        return;
    }

    // Deletar itens primeiro (CASCADE deve cuidar disso, mas por segurança)
    await ActivityTemplateItem.destroy({ where: { templateId: id } });

    // Deletar template
    await template.destroy();
};

export default DeleteActivityTemplateService;
