import ActivityTemplate from "../../models/ActivityTemplate";
import ActivityTemplateItem from "../../models/ActivityTemplateItem";
import AppError from "../../errors/AppError";

const ShowActivityTemplateService = async (
    id: number,
    tenantId: string
): Promise<ActivityTemplate> => {
    const template = await ActivityTemplate.findOne({
        where: { id, tenantId },
        include: [
            {
                model: ActivityTemplateItem,
                as: "items",
                separate: true,
                order: [["order", "ASC"]]
            }
        ]
    });

    if (!template) {
        throw new AppError("ERR_TEMPLATE_NOT_FOUND", 404);
    }

    return template;
};

export default ShowActivityTemplateService;
