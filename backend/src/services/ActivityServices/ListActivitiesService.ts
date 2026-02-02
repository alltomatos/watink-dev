import { Op } from "sequelize";
import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ActivityMaterial from "../../models/ActivityMaterial";
import ActivityTemplate from "../../models/ActivityTemplate";
import User from "../../models/User";
import Protocol from "../../models/Protocol";

interface ListActivitiesParams {
    tenantId: string;
    protocolId?: number;
    userId?: number;
    status?: string;
    pageNumber?: string;
}

interface ListActivitiesResult {
    activities: Activity[];
    count: number;
    hasMore: boolean;
}

const ListActivitiesService = async (
    params: ListActivitiesParams
): Promise<ListActivitiesResult> => {
    const { tenantId, protocolId, userId, status, pageNumber = "1" } = params;
    const limit = 20;
    const offset = (parseInt(pageNumber, 10) - 1) * limit;

    const whereCondition: any = { tenantId };

    if (protocolId) {
        whereCondition.protocolId = protocolId;
    }

    if (userId) {
        whereCondition.userId = userId;
    }

    if (status) {
        if (status.includes(",")) {
            whereCondition.status = { [Op.in]: status.split(",") };
        } else {
            whereCondition.status = status;
        }
    }

    const { count, rows: activities } = await Activity.findAndCountAll({
        where: whereCondition,
        include: [
            {
                model: ActivityItem,
                as: "items",
                separate: true,
                order: [["order", "ASC"]]
            },
            {
                model: ActivityMaterial,
                as: "materials"
            },
            {
                model: ActivityTemplate,
                as: "template",
                attributes: ["id", "name"]
            },
            {
                model: User,
                as: "user",
                attributes: ["id", "name"]
            },
            {
                model: Protocol,
                as: "protocol",
                attributes: ["id", "protocolNumber", "subject"]
            }
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset
    });

    const hasMore = count > offset + activities.length;

    return { activities, count, hasMore };
};

export default ListActivitiesService;
