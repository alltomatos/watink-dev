import { Op } from "sequelize";
import ActivityTemplate from "../../models/ActivityTemplate";
import ActivityTemplateItem from "../../models/ActivityTemplateItem";

interface ListTemplatesParams {
    tenantId: string;
    searchParam?: string;
    pageNumber?: string;
    showInactive?: boolean;
}

interface ListTemplatesResult {
    templates: ActivityTemplate[];
    count: number;
    hasMore: boolean;
}

const ListActivityTemplatesService = async (
    params: ListTemplatesParams
): Promise<ListTemplatesResult> => {
    const { tenantId, searchParam, pageNumber = "1", showInactive = false } = params;
    const limit = 20;
    const offset = (parseInt(pageNumber, 10) - 1) * limit;

    const whereCondition: any = { tenantId };

    if (!showInactive) {
        whereCondition.isActive = true;
    }

    if (searchParam && searchParam.trim() !== "") {
        whereCondition[Op.or] = [
            { name: { [Op.iLike]: `%${searchParam}%` } },
            { description: { [Op.iLike]: `%${searchParam}%` } }
        ];
    }

    const { count, rows: templates } = await ActivityTemplate.findAndCountAll({
        where: whereCondition,
        include: [
            {
                model: ActivityTemplateItem,
                as: "items",
                separate: true,
                order: [["order", "ASC"]]
            }
        ],
        order: [["name", "ASC"]],
        limit,
        offset
    });

    const hasMore = count > offset + templates.length;

    return { templates, count, hasMore };
};

export default ListActivityTemplatesService;
